mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            storage::db_batch,
            storage::db_snapshot,
            storage::list_snapshots,
            storage::prune_snapshots,
            storage::reveal_backups_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
