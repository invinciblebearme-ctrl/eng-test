package kr.allforedu.engtest;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

/**
 * 위젯 새로 고침을 '인터넷이 될 때' 안드로이드가 대신 돌려 줌.
 * 앱이 뒤에 있으면(절전·백그라운드 제한) 위젯이 직접 인터넷을 못 쓰는 휴대폰이 있어서,
 * 바로 가져오기가 실패하면 이 작업으로 다시 시도 (실패하면 안드로이드가 간격을 늘려 가며 다시).
 */
public class RefreshJob extends JobService {
    static final int ID = 7101, PERIODIC = 7102;

    /** 30분마다 새로 고침·알림 확인 (위젯이 없어도, 휴대폰을 껐다 켜도 이어짐). 이미 있으면 그대로 */
    static void ensurePeriodic(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(PERIODIC) != null) return;
        try {
            js.schedule(new JobInfo.Builder(PERIODIC, new ComponentName(c, RefreshJob.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPeriodic(30 * 60 * 1000L)
                    .setPersisted(true)
                    .build());
        } catch (RuntimeException ignored) {} // 작업 예약이 막혀도 위젯은 그대로
    }

    static void schedule(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null) return;
        try {
            js.schedule(new JobInfo.Builder(ID, new ComponentName(c, RefreshJob.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .build());
        } catch (RuntimeException ignored) {}
    }

    @Override
    public boolean onStartJob(JobParameters p) {
        final Context app = getApplicationContext();
        new Thread(() -> {
            Object[] r = WaitWidget.fetch(app);
            if ("ok".equals(r[0])) Notify.check(app, (org.json.JSONObject) r[1]);
            WaitWidget.draw(app, r);
            // 한 번짜리(바로 못 가져와서 다시 시도)만 실패 시 다시; 30분마다는 다음 차례에
            jobFinished(p, p.getJobId() == ID && "offline".equals(r[0]));
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters p) { return true; }
}
