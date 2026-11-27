// 윈도우에서 콘솔 창이 같이 뜨지 않게
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    engtest_widget_lib::run()
}
