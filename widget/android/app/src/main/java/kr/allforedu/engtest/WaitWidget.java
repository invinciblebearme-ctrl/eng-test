package kr.allforedu.engtest;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * 홈 화면 위젯: 사이트 /api/w/summary 에서 숫자만 받아 보여 줌 (학생 이름 없음, 읽기 전용 연결 코드).
 * 30분마다(안드로이드가 정함) + 시각 글자를 누르면 바로 새로 고침. 위젯을 누르면 교사 화면 앱.
 */
public class WaitWidget extends AppWidgetProvider {
    static final String SITE = "https://eng-test.allforedu.kr";
    static final String ACTION_REFRESH = "kr.allforedu.engtest.REFRESH";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("engw", Context.MODE_PRIVATE); }
    static String code(Context c) { return prefs(c).getString("code", ""); }
    static boolean validCode(String s) { return s != null && s.matches("^ew1\\.[A-Za-z0-9_-]{40,}$"); }

    /** 모든 위젯을 새로 그림 (연결 화면에서도 부름) */
    static void refreshAll(Context c) {
        Intent i = new Intent(c, WaitWidget.class).setAction(ACTION_REFRESH);
        c.sendBroadcast(i);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction()) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) { update(context); return; }
        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) { update(context); }

    private void update(Context context) {
        final PendingResult pr = goAsync();
        final Context app = context.getApplicationContext();
        new Thread(() -> {
            try { draw(app, fetch(app)); } finally { pr.finish(); }
        }).start();
    }

    /** 결과: [상태, json] — 상태 ok / nocode / unauthorized / offline */
    static Object[] fetch(Context c) {
        String code = code(c);
        if (!validCode(code)) return new Object[]{"nocode", null};
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(SITE + "/api/w/summary").openConnection();
            con.setConnectTimeout(10000);
            con.setReadTimeout(15000);
            con.setRequestProperty("Authorization", "Bearer " + code);
            con.setUseCaches(false);
            int st = con.getResponseCode();
            if (st == 401) return new Object[]{"unauthorized", null};
            if (st != 200) return new Object[]{"offline", cached(c)};
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            String body = out.toString("UTF-8");
            prefs(c).edit().putString("last", body).apply();
            return new Object[]{"ok", new JSONObject(body)};
        } catch (Exception e) {
            return new Object[]{"offline", cached(c)};
        } finally { if (con != null) con.disconnect(); }
    }

    static JSONObject cached(Context c) {
        try { String s = prefs(c).getString("last", null); return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    static void draw(Context c, Object[] res) {
        String state = (String) res[0];
        JSONObject j = (JSONObject) res[1];
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_wait);
        boolean connected = !"nocode".equals(state) && !"unauthorized".equals(state);

        if (j != null && connected) {
            int wait = 0, ai = 0, unpub = 0, today = 0;
            StringBuilder g = new StringBuilder();
            JSONArray grades = j.optJSONArray("grades");
            for (int i = 0; grades != null && i < grades.length(); i++) {
                JSONObject gr = grades.optJSONObject(i), t = gr.optJSONObject("total");
                if (t == null) continue;
                wait += t.optInt("wait"); ai += t.optInt("aiSuggest"); unpub += t.optInt("unpub"); today += t.optInt("today");
                if (g.length() > 0) g.append(" · ");
                g.append(gr.optInt("grade")).append("학년 ").append(t.optInt("wait"));
            }
            v.setTextViewText(R.id.wait, String.valueOf(wait));
            v.setTextViewText(R.id.grades, g.toString());
            v.setTextViewText(R.id.ai, "AI 제안 " + ai);
            v.setTextViewText(R.id.unpub, "미공개 " + unpub);
            v.setTextViewText(R.id.today, "오늘 " + today);
            v.setViewVisibility(R.id.chips, View.VISIBLE);
            v.setViewVisibility(R.id.msg, View.GONE);
            String at = "";
            try {
                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
                iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                Date d = iso.parse(j.optString("at").substring(0, 19));
                at = new SimpleDateFormat("HH:mm", Locale.KOREA).format(d);
            } catch (Exception ignored) {}
            v.setTextViewText(R.id.updated, ("offline".equals(state) ? "연결 안 됨 · " : "") + at + " ↻");
        } else {
            v.setTextViewText(R.id.wait, "–");
            v.setTextViewText(R.id.grades, "");
            v.setViewVisibility(R.id.chips, View.GONE);
            v.setViewVisibility(R.id.msg, View.VISIBLE);
            v.setTextViewText(R.id.msg, "unauthorized".equals(state) ? "연결이 끊겼어요. 눌러서 다시 연결해 주세요"
                    : "offline".equals(state) ? "인터넷 연결을 확인해 주세요" : "눌러서 연결 코드를 넣어 주세요");
            v.setTextViewText(R.id.updated, "↻");
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        // 위젯 누르기: 연결돼 있으면 교사 화면 앱, 아니면 연결 화면
        Intent open = connected
                ? new Intent(c, LauncherActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(SITE + "/teacher"))
                : new Intent(c, ConnectActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(c, 1, open, flags));
        // 시각 글자 누르기: 바로 새로 고침
        Intent refresh = new Intent(c, WaitWidget.class).setAction(ACTION_REFRESH);
        v.setOnClickPendingIntent(R.id.updated, PendingIntent.getBroadcast(c, 2, refresh, flags));

        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        mgr.updateAppWidget(new ComponentName(c, WaitWidget.class), v);
    }
}
