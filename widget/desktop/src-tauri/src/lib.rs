// 영어 채점 위젯: 트레이(윈도우)·메뉴 막대(맥) 아이콘 + 작은 창.
// 숫자는 창의 화면(public/widget.html)이 사이트에서 받아 set_tray 로 아이콘에 알려 줌.
// 창을 닫으면 숨기기만 하고, 끝내기는 아이콘 메뉴에서.
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

const TRAY_ID: &str = "main";

fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        } else {
            show(app);
        }
    }
}

/// 화면이 숫자를 받을 때마다 부름: 맥은 메뉴 막대 아이콘 옆에 대기 수, 윈도우는 마우스를 올리면 보이는 글
#[tauri::command]
fn set_tray(app: AppHandle, title: String, tooltip: String) {
    if let Some(t) = app.tray_by_id(TRAY_ID) {
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        let _ = t.set_title(Some(title));
        #[cfg(not(any(target_os = "macos", target_os = "linux")))]
        let _ = title;
        let _ = t.set_tooltip(Some(tooltip));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 두 번 실행하면 새로 띄우지 않고 있던 창을 보여 줌
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_tray])
        .setup(|app| {
            // 맥: Dock에 아이콘 없이 메뉴 막대에만
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "끝내기", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            let icon = Image::from_bytes(include_bytes!("../icons/tray.png"))?;
            TrayIconBuilder::with_id(TRAY_ID)
                .icon(icon)
                .icon_as_template(true)
                .tooltip("영어 채점")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "open" => show(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        toggle(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|w, e| {
            if let WindowEvent::CloseRequested { api, .. } = e {
                api.prevent_close();
                let _ = w.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("영어 채점 위젯을 시작하지 못했어요");
}
