package kr.allforedu.engtest;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * 휴대폰 알림 (연결 화면에서 켜야 함):
 * - 채점 대기가 기준(기본 10건) 이상이 되면 한 번, 그 뒤 기준만큼 더 늘 때마다 한 번. 기준 아래로 내려가면 처음부터
 * - 새 오류가 생기면 (교사 화면에서 '확인함' 누른 오류는 서버가 이미 뺌)
 * 알림을 누르면 대기가 가장 많은 반의 채점 대기 화면으로 바로.
 */
final class Notify {
    static final String CH_WAIT = "wait", CH_ERR = "errors";
    static final int ID_WAIT = 1, ID_ERR = 2;

    static boolean on(Context c) { return WaitWidget.prefs(c).getBoolean("notify", false); }
    static int threshold(Context c) { return Math.max(1, WaitWidget.prefs(c).getInt("thr", 10)); }

    /** [대기 합계, 오류 수(-1=모름), 가장 많은 반 학년, 반, 그 반 대기] */
    static int[] totals(JSONObject j) {
        int wait = 0, tg = 0, tc = 0, tw = 0;
        JSONArray grades = j.optJSONArray("grades");
        for (int i = 0; grades != null && i < grades.length(); i++) {
            JSONObject g = grades.optJSONObject(i);
            JSONObject t = g.optJSONObject("total");
            if (t != null) wait += t.optInt("wait");
            JSONArray cls = g.optJSONArray("classes");
            for (int k = 0; cls != null && k < cls.length(); k++) {
                JSONObject c = cls.optJSONObject(k);
                if (c.optInt("wait") > tw) { tw = c.optInt("wait"); tg = g.optInt("grade"); tc = c.optInt("class_no"); }
            }
        }
        int err = j.isNull("errors24h") ? -1 : j.optInt("errors24h", -1);
        return new int[]{wait, err, tg, tc, tw};
    }

    /** 처음 연결·알림을 켤 때: 지금 숫자를 기준으로 삼아 바로 알림이 쏟아지지 않게 */
    static void baseline(Context c, JSONObject j) {
        if (j == null) return;
        int[] t = totals(j);
        WaitWidget.prefs(c).edit().putInt("nWait", t[0] >= threshold(c) ? t[0] : 0).putInt("nErr", t[1]).apply();
    }

    static void check(Context c, JSONObject j) {
        if (j == null) return;
        SharedPreferences p = WaitWidget.prefs(c);
        int[] t = totals(j);
        int thr = threshold(c), nw = p.getInt("nWait", 0), ne = p.getInt("nErr", -1);
        boolean on = on(c);
        SharedPreferences.Editor e = p.edit();
        if (t[0] < thr) e.putInt("nWait", 0);
        else if (nw == 0 || t[0] >= nw + thr) {
            if (on) post(c, CH_WAIT, ID_WAIT, "채점 대기 " + t[0] + "건",
                    t[3] > 0 ? t[2] + "학년 " + t[3] + "반이 " + t[4] + "건으로 가장 많아요. 눌러서 바로 채점해요." : "눌러서 교사 화면을 열어요.",
                    WaitWidget.teacherUrl(t[2], t[3], "wait"));
            e.putInt("nWait", t[0]);
        }
        if (t[1] >= 0) {
            if (on && ne >= 0 && t[1] > ne)
                post(c, CH_ERR, ID_ERR, "새 오류 " + (t[1] - ne) + "건", "최근 24시간 확인하지 않은 오류 " + t[1] + "건 — 교사 화면에서 확인해 주세요.", WaitWidget.SITE + "/teacher");
            e.putInt("nErr", t[1]);
        }
        e.apply();
    }

    static boolean allowed(Context c) {
        return Build.VERSION.SDK_INT < 33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    static void post(Context c, String ch, int id, String title, String text, String url) {
        if (!allowed(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        nm.createNotificationChannel(new NotificationChannel(CH_WAIT, "채점 대기", NotificationManager.IMPORTANCE_DEFAULT));
        nm.createNotificationChannel(new NotificationChannel(CH_ERR, "사이트 오류", NotificationManager.IMPORTANCE_DEFAULT));
        Intent open = new Intent(c, LauncherActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(c, 100 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, ch)
                .setSmallIcon(R.drawable.ic_notify)
                .setColor(c.getColor(R.color.accent))
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(id, n);
    }
}
