// V1 desktop 入口（macOS / Windows / Linux）
// 移动端会单独走 lib.rs 的 mobile_entry_point

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    artchrono_lib::run()
}