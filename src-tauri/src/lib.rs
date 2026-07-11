// V1 Tauri 后端入口
// 移动端（Tauri 2 mobile）需要 lib + bin 双入口

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Tauri 插件（按需启用）
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            // V1 自用场景：直接用 password bytes 作为 key 派生输入
            // 实际安全靠 OS keychain（Tauri plugin 自动用 keychain 加密存储）
            password.as_bytes().to_vec()
        }).build())  // session 加密存储（keychain 后端）
        .plugin(tauri_plugin_store::Builder::new().build())        // 一般 KV 持久化
        .plugin(tauri_plugin_fs::init())                           // 文件系统访问
        .plugin(tauri_plugin_notification::init())                  // 原生通知（V1.1）
        // V1 setup 钩子：未来加 deep link / 单实例 / etc.
        // .setup(|app| { ... })
        // V1 commands：未来加 invoke handlers（T5+）
        // .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}