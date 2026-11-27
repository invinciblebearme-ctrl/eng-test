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
    static final int ID = 7101;

    static void schedule(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null) return;
        js.schedule(new JobInfo.Builder(ID, new ComponentName(c, RefreshJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .build());
    }

    @Override
    public boolean onStartJob(JobParameters p) {
        final Context app = getApplicationContext();
        new Thread(() -> {
            Object[] r = WaitWidget.fetch(app);
            WaitWidget.draw(app, r);
            jobFinished(p, "offline".equals(r[0]));
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters p) { return true; }
}
