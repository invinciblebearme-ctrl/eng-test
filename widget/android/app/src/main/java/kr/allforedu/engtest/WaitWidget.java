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
    static final String SITE = BuildConfig.SITE;
    static final String ACTION_REFRESH = "kr.allforedu.engtest.REFRESH";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("engw", Context.MODE_PRIVATE); }
    static String code(Context c) { return prefs(c).getString("code", ""); }
    static boolean validCode(String s) { return s != null && s.matches("^ew1\\.[A-Za-z0-9_-]{40,}$"); }
    /** 교사 화면 바로 가기 주소: go = wait(채점 대기) | unpub | grades, cls 0 = 전체 반 */
    static String teacherUrl(int grade, int cls, String go) {
        if (grade != 3 && grade != 4) return SITE + "/teacher";
        return SITE + "/teacher?g=" + grade + "&c=" + cls + "&go=" + go;
    }
    static final int[] CLS_IDS = {R.id.cls1, R.id.cls2, R.id.cls3};

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
            try {
                Object[] r = fetch(app);
                if ("ok".equals(r[0])) Notify.check(app, (JSONObject) r[1]);
                RefreshJob.ensurePeriodic(app);
                // 앱이 뒤에 있으면 휴대폰이 인터넷을 막기도 함 → 안드로이드가 인터넷을 열어 주는 작업(JobScheduler)으로 다시 시도
                if ("offline".equals(r[0])) RefreshJob.schedule(app);
                draw(app, r);
            } finally { pr.finish(); }
        }).start();
    }

    /** 결과: [상태, json, 실패 까닭] — 상태 ok / nocode / unauthorized / offline */
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
            if (st != 200) return new Object[]{"offline", cached(c), "서버 " + st};
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            String body = out.toString("UTF-8");
            prefs(c).edit().putString("last", body).apply();
            return new Object[]{"ok", new JSONObject(body)};
        } catch (java.net.SocketTimeoutException e) {
            return new Object[]{"offline", cached(c), "시간 초과"};
        } catch (java.net.UnknownHostException e) {
            return new Object[]{"offline", cached(c), "인터넷 막힘"};
        } catch (Exception e) {
            return new Object[]{"offline", cached(c), e.getClass().getSimpleName()};
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

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        v.setViewVisibility(R.id.classes, View.GONE);
        if (j != null && connected) {
            int wait = 0, ai = 0, unpub = 0, today = 0;
            StringBuilder g = new StringBuilder();
            java.util.List<int[]> top = new java.util.ArrayList<>(); // [학년, 반, 대기]
            JSONArray grades = j.optJSONArray("grades");
            for (int i = 0; grades != null && i < grades.length(); i++) {
                JSONObject gr = grades.optJSONObject(i), t = gr.optJSONObject("total");
                JSONArray cls = gr.optJSONArray("classes");
                for (int k = 0; cls != null && k < cls.length(); k++) {
                    JSONObject cl = cls.optJSONObject(k);
                    if (cl.optInt("wait") > 0) top.add(new int[]{gr.optInt("grade"), cl.optInt("class_no"), cl.optInt("wait")});
                }
                if (t == null) continue;
                wait += t.optInt("wait"); ai += t.optInt("aiSuggest"); unpub += t.optInt("unpub"); today += t.optInt("today");
                if (g.length() > 0) g.append(" · ");
                g.append(gr.optInt("grade")).append("학년 ").append(t.optInt("wait"));
            }
            v.setTextViewText(R.id.wait, String.valueOf(wait));
            // 대기가 많은 반 3개 → 누르면 그 반 채점 대기 화면
            top.sort((a, b) -> b[2] - a[2]);
            for (int i = 0; i < CLS_IDS.length; i++) {
                if (i < top.size()) {
                    int[] cc = top.get(i);
                    v.setViewVisibility(CLS_IDS[i], View.VISIBLE);
                    v.setTextViewText(CLS_IDS[i], cc[0] + "-" + cc[1] + " · " + cc[2]);
                    Intent oc = new Intent(c, LauncherActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(teacherUrl(cc[0], cc[1], "wait"))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    v.setOnClickPendingIntent(CLS_IDS[i], PendingIntent.getActivity(c, 10 + i, oc, flags));
                } else v.setViewVisibility(CLS_IDS[i], View.GONE);
            }
            if (!top.isEmpty()) v.setViewVisibility(R.id.classes, View.VISIBLE);
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
            String why = res.length > 2 && res[2] != null ? "(" + res[2] + ")" : "";
            v.setTextViewText(R.id.updated, ("offline".equals(state) ? "연결 안 됨" + why + " · " : "") + at + " ↻");
        } else {
            v.setTextViewText(R.id.wait, "–");
            v.setTextViewText(R.id.grades, "");
            v.setViewVisibility(R.id.chips, View.GONE);
            v.setViewVisibility(R.id.msg, View.VISIBLE);
            v.setTextViewText(R.id.msg, "unauthorized".equals(state) ? "연결이 끊겼어요. 눌러서 다시 연결해 주세요"
                    : "offline".equals(state) ? "인터넷 연결을 확인해 주세요" : "눌러서 연결 코드를 넣어 주세요");
            v.setTextViewText(R.id.updated, "↻");
        }

        // 위젯 누르기: 연결돼 있으면 교사 화면 앱, 아니면 연결 화면
        Intent open = connected
                ? new Intent(c, LauncherActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(SITE + "/teacher"))
                : new Intent(c, ConnectActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(c, 1, open, flags));
        // 시각 글자 누르기: 바로 새로 고침
        Intent refresh = new Intent(c, WaitWidget.class).setAction(ACTION_REFRESH);
        v.setOnClickPendingIntent(R.id.updated, PendingIntent.getBroadcast(c, 2, refresh, flags));
        // ⚙: 연결 코드·알림 설정
        v.setOnClickPendingIntent(R.id.settings, PendingIntent.getActivity(c, 3, new Intent(c, ConnectActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), flags));

        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        mgr.updateAppWidget(new ComponentName(c, WaitWidget.class), v);
    }
}
