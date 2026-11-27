package kr.allforedu.engtest;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * 위젯 연결 코드 넣기.
 * - 위젯 화면(사이트)의 '홈 화면 위젯에 연결' 버튼 → engtestw://connect?k=코드 로 열리면 바로 저장
 * - 아니면 붙여 넣고 '연결' (클립보드에 코드가 있으면 미리 채움)
 */
public class ConnectActivity extends Activity {
    private EditText input;
    private TextView status;
    private Button save;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(pad, pad, pad, pad);

        TextView info = new TextView(this);
        info.setText("교사 화면 → '위젯'에서 만든 연결 코드(ew1. 로 시작)를 붙여 넣어 주세요. 위젯은 숫자만 보여 주고, 코드로는 아무것도 바꿀 수 없어요.");
        info.setTextSize(14);
        box.addView(info);

        input = new EditText(this);
        input.setHint("ew1.…");
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        String now = WaitWidget.code(this);
        if (WaitWidget.validCode(now)) input.setText(now);
        else {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData cd = cm == null ? null : cm.getPrimaryClip();
            if (cd != null && cd.getItemCount() > 0) {
                CharSequence t = cd.getItemAt(0).getText();
                if (t != null && WaitWidget.validCode(t.toString().trim())) input.setText(t.toString().trim());
            }
        }
        box.addView(input, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        save = new Button(this);
        save.setText("연결");
        save.setOnClickListener((x) -> connect(input.getText().toString().trim(), false));
        box.addView(save);

        status = new TextView(this);
        status.setTextSize(13);
        box.addView(status);
        setContentView(box);

        Uri u = getIntent() == null ? null : getIntent().getData();
        String k = u == null ? null : u.getQueryParameter("k");
        if (WaitWidget.validCode(k)) { input.setText(k); connect(k, true); }
    }

    private void connect(String k, boolean auto) {
        if (!WaitWidget.validCode(k)) { status.setText("코드 모양이 달라요. ew1. 로 시작하는 코드를 통째로 넣어 주세요."); return; }
        save.setEnabled(false);
        status.setText("확인하는 중…");
        final Context app = getApplicationContext();
        final String old = WaitWidget.code(app);
        WaitWidget.prefs(app).edit().putString("code", k).apply();
        new Thread(() -> {
            Object[] r = WaitWidget.fetch(app);
            new Handler(Looper.getMainLooper()).post(() -> {
                save.setEnabled(true);
                if ("ok".equals(r[0])) {
                    WaitWidget.refreshAll(app);
                    Toast.makeText(app, "위젯에 연결했어요. 홈 화면에 '영어 채점' 위젯을 추가해 주세요.", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    WaitWidget.prefs(app).edit().putString("code", old).apply();
                    status.setText("unauthorized".equals(r[0]) ? "코드가 맞지 않거나 끊겼어요. 교사 화면에서 새로 만들어 주세요." : "인터넷 연결을 확인해 주세요.");
                }
            });
        }).start();
    }
}
