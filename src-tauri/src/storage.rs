//! Almacenamiento: escrituras atómicas y copias de seguridad de la base SQLite.
//!
//! `tauri-plugin-sql` reparte cada `execute` entre las conexiones de un pool
//! (sqlx, hasta 10), así que `BEGIN` / sentencias / `COMMIT` enviados por
//! separado pueden caer en conexiones distintas. Aquí se abre una conexión
//! propia al mismo archivo y toda la transacción corre sobre ella.
//!
//! La lógica vive en funciones que reciben rutas (fáciles de probar con
//! directorios temporales); los comandos de Tauri solo resuelven el directorio
//! de la app y delegan.

use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::{Local, NaiveDateTime};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::sqlite::{SqliteConnectOptions, SqliteConnection};
use sqlx::{ConnectOptions, Connection};
use tauri::{AppHandle, Manager};

/// Archivos de base de datos permitidos (producción y desarrollo).
const ALLOWED_FILES: [&str; 2] = ["aurhabits.db", "aurhabits-dev.db"];
const BACKUPS_DIR: &str = "backups";
const TIMESTAMP_FORMAT: &str = "%Y-%m-%d-%H%M%S";
/// Longitud de `YYYY-MM-DD-HHMMSS`.
const TIMESTAMP_LEN: usize = 17;
const DAILY_REASON: &str = "diario";
const KEEP_DAILY: usize = 14;
const KEEP_OTHER: usize = 10;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct BatchStatement {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SnapshotInfo {
    pub name: String,
    pub path: String,
    pub reason: String,
    /// Fecha local en formato `YYYY-MM-DDTHH:MM:SS`.
    pub created_at: String,
    pub size_bytes: u64,
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/// Solo se aceptan los nombres de archivo de la lista blanca.
pub fn validate_file(file: &str) -> Result<&'static str, String> {
    ALLOWED_FILES
        .iter()
        .copied()
        .find(|allowed| *allowed == file)
        .ok_or_else(|| format!("Archivo de base de datos no permitido: {file:?}"))
}

/// El motivo forma parte del nombre del archivo: `[a-z0-9-]{1,40}`.
/// No puede empezar por `dev-` para no confundirse con copias de la base de desarrollo.
pub fn validate_reason(reason: &str) -> Result<(), String> {
    let valid = !reason.is_empty()
        && reason.len() <= 40
        && reason
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !reason.starts_with("dev-");
    if valid {
        Ok(())
    } else {
        Err(format!("Motivo de copia no válido: {reason:?}"))
    }
}

// ---------------------------------------------------------------------------
// Transacciones
// ---------------------------------------------------------------------------

async fn connect(db_path: &Path, create: bool) -> Result<SqliteConnection, String> {
    SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(create)
        .busy_timeout(Duration::from_secs(5))
        .connect()
        .await
        .map_err(|e| format!("No se pudo abrir la base de datos: {e}"))
}

fn bind_value<'q>(
    query: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    value: &Value,
) -> Result<sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>, String> {
    Ok(match value {
        Value::Null => query.bind(None::<i64>),
        Value::Bool(b) => query.bind(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                query.bind(i)
            } else if let Some(f) = n.as_f64() {
                query.bind(f)
            } else {
                return Err(format!("Número fuera de rango: {n}"));
            }
        }
        Value::String(s) => query.bind(s.clone()),
        other => return Err(format!("Parámetro no soportado: {other}")),
    })
}

async fn run_statements(
    conn: &mut SqliteConnection,
    statements: &[BatchStatement],
) -> Result<(), String> {
    for (index, statement) in statements.iter().enumerate() {
        let mut query = sqlx::query(&statement.sql);
        for value in &statement.params {
            query = bind_value(query, value)?;
        }
        query
            .execute(&mut *conn)
            .await
            .map_err(|e| format!("Falló la sentencia {} del lote: {e}", index + 1))?;
    }
    Ok(())
}

/// Ejecuta todas las sentencias en una única transacción (`BEGIN IMMEDIATE`).
/// Ante cualquier error hace `ROLLBACK` y no queda ningún cambio.
pub async fn run_batch(db_path: &Path, statements: &[BatchStatement]) -> Result<(), String> {
    let mut conn = connect(db_path, false).await?;

    sqlx::query("BEGIN IMMEDIATE")
        .execute(&mut conn)
        .await
        .map_err(|e| format!("No se pudo iniciar la transacción: {e}"))?;

    let outcome = match run_statements(&mut conn, statements).await {
        Ok(()) => sqlx::query("COMMIT")
            .execute(&mut conn)
            .await
            .map(|_| ())
            .map_err(|e| format!("No se pudo confirmar la transacción: {e}")),
        Err(error) => Err(error),
    };

    if outcome.is_err() {
        // Si el COMMIT falló la transacción puede seguir abierta; si no, esto es inocuo.
        let _ = sqlx::query("ROLLBACK").execute(&mut conn).await;
    }
    let _ = conn.close().await;
    outcome
}

// ---------------------------------------------------------------------------
// Copias
// ---------------------------------------------------------------------------

fn backups_dir(db_path: &Path) -> Result<PathBuf, String> {
    db_path
        .parent()
        .map(|dir| dir.join(BACKUPS_DIR))
        .ok_or_else(|| "Ruta de base de datos sin directorio".to_string())
}

fn db_stem(db_path: &Path) -> Result<String, String> {
    db_path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(str::to_string)
        .ok_or_else(|| "Nombre de base de datos no válido".to_string())
}

fn info_for(path: &Path, reason: &str, created: NaiveDateTime, size: u64) -> SnapshotInfo {
    SnapshotInfo {
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
        path: path.to_string_lossy().into_owned(),
        reason: reason.to_string(),
        created_at: created.format("%Y-%m-%dT%H:%M:%S").to_string(),
        size_bytes: size,
    }
}

/// Crea una copia consistente con `VACUUM INTO`. `now` se inyecta para poder probarlo.
pub async fn create_snapshot(
    db_path: &Path,
    reason: &str,
    now: NaiveDateTime,
) -> Result<SnapshotInfo, String> {
    validate_reason(reason)?;
    if !db_path.is_file() {
        return Err("La base de datos todavía no existe".to_string());
    }
    let dir = backups_dir(db_path)?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("No se pudo crear la carpeta de copias: {e}"))?;

    let stem = db_stem(db_path)?;
    let name = format!("{stem}-{reason}-{}.db", now.format(TIMESTAMP_FORMAT));
    let target = dir.join(&name);

    if !target.exists() {
        let mut conn = connect(db_path, false).await?;
        let result = sqlx::query("VACUUM INTO ?1")
            .bind(target.to_string_lossy().into_owned())
            .execute(&mut conn)
            .await;
        let _ = conn.close().await;
        if let Err(e) = result {
            // No dejar una copia a medias.
            let _ = std::fs::remove_file(&target);
            return Err(format!("No se pudo crear la copia: {e}"));
        }
    }
    // Si ya existía (misma marca de segundo), se reutiliza: es una copia válida reciente.

    let size = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
    Ok(info_for(&target, reason, now, size))
}

/// Interpreta `<stem>-<motivo>-<YYYY-MM-DD-HHMMSS>.db`. `None` si no encaja.
fn parse_snapshot_name(stem: &str, file_name: &str) -> Option<(String, NaiveDateTime)> {
    let rest = file_name.strip_prefix(stem)?.strip_prefix('-')?;
    let rest = rest.strip_suffix(".db")?;
    if rest.len() <= TIMESTAMP_LEN + 1 {
        return None;
    }
    let split = rest.len() - TIMESTAMP_LEN;
    let (reason_part, timestamp) = rest.split_at(split);
    let reason = reason_part.strip_suffix('-')?;
    validate_reason(reason).ok()?;
    let created = NaiveDateTime::parse_from_str(timestamp, TIMESTAMP_FORMAT).ok()?;
    // Cuando el nombre se re-formatea debe coincidir exactamente (descarta formas raras).
    if created.format(TIMESTAMP_FORMAT).to_string() != timestamp {
        return None;
    }
    Some((reason.to_string(), created))
}

/// Copias de esta base, de la más reciente a la más antigua.
pub fn list_snapshots_in(db_path: &Path) -> Result<Vec<SnapshotInfo>, String> {
    let dir = backups_dir(db_path)?;
    let stem = db_stem(db_path)?;
    let entries = match std::fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(format!("No se pudo leer la carpeta de copias: {e}")),
    };

    let mut found = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let Some((reason, created)) = parse_snapshot_name(&stem, file_name) else {
            continue;
        };
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        found.push(info_for(&path, &reason, created, metadata.len()));
    }
    // Más reciente primero; el nombre desempata para que el orden sea estable.
    found.sort_by(|a, b| b.created_at.cmp(&a.created_at).then(b.name.cmp(&a.name)));
    Ok(found)
}

/// Conserva las 14 copias `diario` más recientes y las 10 más recientes de cada
/// otro motivo. Solo toca archivos que encajan con el patrón propio.
/// Devuelve cuántas copias borró.
pub fn prune_snapshots_in(db_path: &Path) -> Result<usize, String> {
    let snapshots = list_snapshots_in(db_path)?;
    let mut kept: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    let mut removed = 0;

    for snapshot in &snapshots {
        let limit = if snapshot.reason == DAILY_REASON {
            KEEP_DAILY
        } else {
            KEEP_OTHER
        };
        let count = kept.entry(snapshot.reason.as_str()).or_insert(0);
        if *count < limit {
            *count += 1;
            continue;
        }
        if std::fs::remove_file(&snapshot.path).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

// ---------------------------------------------------------------------------
// Comandos de Tauri
// ---------------------------------------------------------------------------

/// Mismo directorio que usa `tauri-plugin-sql` para `sqlite:<archivo>`
/// (`app_config_dir`, ver `wrapper.rs::connect` en el plugin).
fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("No se encontró el directorio de la app: {e}"))
}

fn resolve_db(app: &AppHandle, file: &str) -> Result<PathBuf, String> {
    let file = validate_file(file)?;
    Ok(config_dir(app)?.join(file))
}

#[tauri::command]
pub async fn db_batch(
    app: AppHandle,
    file: String,
    statements: Vec<BatchStatement>,
) -> Result<(), String> {
    let path = resolve_db(&app, &file)?;
    run_batch(&path, &statements).await
}

#[tauri::command]
pub async fn db_snapshot(
    app: AppHandle,
    file: String,
    reason: String,
) -> Result<SnapshotInfo, String> {
    let path = resolve_db(&app, &file)?;
    create_snapshot(&path, &reason, Local::now().naive_local()).await
}

#[tauri::command]
pub fn list_snapshots(app: AppHandle, file: String) -> Result<Vec<SnapshotInfo>, String> {
    let path = resolve_db(&app, &file)?;
    list_snapshots_in(&path)
}

#[tauri::command]
pub fn prune_snapshots(app: AppHandle, file: String) -> Result<usize, String> {
    let path = resolve_db(&app, &file)?;
    prune_snapshots_in(&path)
}

/// Abre la carpeta de copias en el explorador del sistema y devuelve su ruta.
#[tauri::command]
pub fn reveal_backups_dir(app: AppHandle) -> Result<String, String> {
    let dir = config_dir(&app)?.join(BACKUPS_DIR);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("No se pudo crear la carpeta de copias: {e}"))?;
    tauri_plugin_opener::open_path(&dir, None::<&str>)
        .map_err(|e| format!("No se pudo abrir la carpeta: {e}"))?;
    Ok(dir.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use serde_json::json;
    use tempfile::TempDir;

    fn block<F: std::future::Future>(future: F) -> F::Output {
        tauri::async_runtime::block_on(future)
    }

    fn stmt(sql: &str, params: Vec<Value>) -> BatchStatement {
        BatchStatement {
            sql: sql.to_string(),
            params,
        }
    }

    /// Crea una base con una tabla `t` y dos filas; devuelve el directorio temporal y la ruta.
    fn setup(file: &str) -> (TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(file);
        block(async {
            let mut conn = connect(&path, true).await.unwrap();
            sqlx::query("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score REAL)")
                .execute(&mut conn)
                .await
                .unwrap();
            sqlx::query("INSERT INTO t (id, name) VALUES (1, 'a'), (2, 'b')")
                .execute(&mut conn)
                .await
                .unwrap();
            conn.close().await.unwrap();
        });
        (dir, path)
    }

    fn count(path: &Path) -> i64 {
        block(async {
            let mut conn = connect(path, false).await.unwrap();
            let (n,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM t")
                .fetch_one(&mut conn)
                .await
                .unwrap();
            conn.close().await.unwrap();
            n
        })
    }

    fn at(day: u32, hour: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(2026, 11, day)
            .unwrap()
            .and_hms_opt(hour, 0, 0)
            .unwrap()
    }

    #[test]
    fn batch_confirma_todo_con_parametros_de_cada_tipo() {
        let (_dir, path) = setup("aurhabits.db");
        block(run_batch(
            &path,
            &[
                stmt("INSERT INTO t (id, name, score) VALUES ($1, $2, $3)", vec![json!(3), json!("c"), json!(1.5)]),
                stmt("INSERT INTO t (id, name, score) VALUES ($1, $2, $3)", vec![json!(4), json!("d"), Value::Null]),
                // `$1` repetido y fuera de orden, como hacen los repositorios.
                stmt("DELETE FROM t WHERE id = $2 OR ($2 = $2 AND name = $1)", vec![json!("zzz"), json!(1)]),
            ],
        ))
        .unwrap();
        assert_eq!(count(&path), 3);
    }

    #[test]
    fn batch_con_sentencia_invalida_a_mitad_no_deja_cambios() {
        let (_dir, path) = setup("aurhabits.db");
        let result = block(run_batch(
            &path,
            &[
                stmt("DELETE FROM t", vec![]),
                stmt("INSERT INTO t (id, name) VALUES (9, 'x')", vec![]),
                stmt("INSERT INTO tabla_inexistente VALUES (1)", vec![]),
                stmt("INSERT INTO t (id, name) VALUES (10, 'y')", vec![]),
            ],
        ));
        assert!(result.is_err());
        assert_eq!(count(&path), 2, "el DELETE previo debe haberse revertido");
    }

    #[test]
    fn batch_con_violacion_de_restriccion_revierte() {
        let (_dir, path) = setup("aurhabits.db");
        let result = block(run_batch(
            &path,
            &[
                stmt("INSERT INTO t (id, name) VALUES (3, 'c')", vec![]),
                stmt("INSERT INTO t (id, name) VALUES (1, 'duplicado')", vec![]),
            ],
        ));
        assert!(result.is_err());
        assert_eq!(count(&path), 2);
    }

    #[test]
    fn batch_rechaza_parametros_no_soportados_y_revierte() {
        let (_dir, path) = setup("aurhabits.db");
        let result = block(run_batch(
            &path,
            &[
                stmt("DELETE FROM t", vec![]),
                stmt("INSERT INTO t (id, name) VALUES ($1, 'z')", vec![json!([1, 2])]),
            ],
        ));
        assert!(result.is_err());
        assert_eq!(count(&path), 2);
    }

    #[test]
    fn batch_no_crea_una_base_inexistente() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("aurhabits.db");
        assert!(block(run_batch(&path, &[stmt("SELECT 1", vec![])])).is_err());
        assert!(!path.exists());
    }

    #[test]
    fn snapshot_se_puede_abrir_y_tiene_las_mismas_filas() {
        let (dir, path) = setup("aurhabits-dev.db");
        let info = block(create_snapshot(&path, "diario", at(10, 15))).unwrap();

        assert_eq!(info.name, "aurhabits-dev-diario-2026-11-10-150000.db");
        assert_eq!(info.reason, "diario");
        assert_eq!(info.created_at, "2026-11-10T15:00:00");
        assert!(info.size_bytes > 0);
        assert!(Path::new(&info.path).starts_with(dir.path().join("backups")));
        assert_eq!(count(Path::new(&info.path)), 2);

        let listed = list_snapshots_in(&path).unwrap();
        assert_eq!(listed, vec![info]);
    }

    #[test]
    fn snapshot_de_base_inexistente_falla_sin_crear_nada() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("aurhabits.db");
        assert!(block(create_snapshot(&path, "diario", at(10, 15))).is_err());
        assert!(!dir.path().join("backups").exists());
    }

    #[test]
    fn la_lista_va_de_mas_reciente_a_mas_antigua_y_separa_las_dos_bases() {
        let (dir, path) = setup("aurhabits.db");
        block(create_snapshot(&path, "diario", at(8, 9))).unwrap();
        block(create_snapshot(&path, "antes-de-importar", at(10, 9))).unwrap();
        block(create_snapshot(&path, "diario", at(9, 9))).unwrap();

        // Una copia de la base de desarrollo en la misma carpeta no debe aparecer.
        let dev = dir.path().join("aurhabits-dev.db");
        std::fs::copy(&path, &dev).unwrap();
        block(create_snapshot(&dev, "diario", at(11, 9))).unwrap();

        let names: Vec<String> = list_snapshots_in(&path)
            .unwrap()
            .into_iter()
            .map(|s| s.name)
            .collect();
        assert_eq!(
            names,
            vec![
                "aurhabits-antes-de-importar-2026-11-10-090000.db",
                "aurhabits-diario-2026-11-09-090000.db",
                "aurhabits-diario-2026-11-08-090000.db",
            ]
        );
        assert_eq!(list_snapshots_in(&dev).unwrap().len(), 1);
    }

    #[test]
    fn la_poda_respeta_limites_y_no_toca_archivos_ajenos() {
        let (dir, path) = setup("aurhabits.db");
        let backups = dir.path().join("backups");
        std::fs::create_dir_all(&backups).unwrap();

        for day in 1..=20 {
            let name = format!("aurhabits-diario-2026-10-{day:02}-120000.db");
            std::fs::write(backups.join(name), b"x").unwrap();
        }
        for day in 1..=13 {
            let name = format!("aurhabits-pre-migracion-v0-2026-09-{day:02}-120000.db");
            std::fs::write(backups.join(name), b"x").unwrap();
        }
        let foreign = [
            "notas-personales.db",
            "aurhabits-diario-ayer.db",
            "aurhabits-diario-2026-10-01-120000.db.bak",
            "aurhabits-dev-diario-2026-10-01-120000.db",
            "aurhabits-DIARIO-2025-01-01-120000.db",
            "otra-aurhabits-diario-2026-10-01-120000.db",
        ];
        for name in foreign {
            std::fs::write(backups.join(name), b"x").unwrap();
        }
        std::fs::create_dir(backups.join("aurhabits-diario-2026-10-02-120000.db.d")).unwrap();

        let removed = prune_snapshots_in(&path).unwrap();
        assert_eq!(removed, 6 + 3);

        let listed = list_snapshots_in(&path).unwrap();
        let daily: Vec<_> = listed.iter().filter(|s| s.reason == "diario").collect();
        let pre: Vec<_> = listed.iter().filter(|s| s.reason == "pre-migracion-v0").collect();
        assert_eq!(daily.len(), 14);
        assert_eq!(pre.len(), 10);
        assert_eq!(daily[0].name, "aurhabits-diario-2026-10-20-120000.db");
        assert_eq!(daily[13].name, "aurhabits-diario-2026-10-07-120000.db");
        assert_eq!(pre[9].name, "aurhabits-pre-migracion-v0-2026-09-04-120000.db");

        for name in foreign {
            assert!(backups.join(name).exists(), "{name} no debió tocarse");
        }
        assert!(backups.join("aurhabits-diario-2026-10-02-120000.db.d").is_dir());
    }

    #[test]
    fn la_poda_sin_carpeta_de_copias_no_hace_nada() {
        let (_dir, path) = setup("aurhabits.db");
        assert_eq!(prune_snapshots_in(&path).unwrap(), 0);
    }

    #[test]
    fn valida_el_archivo() {
        assert!(validate_file("aurhabits.db").is_ok());
        assert!(validate_file("aurhabits-dev.db").is_ok());
        for bad in ["", "other.db", "../aurhabits.db", "/etc/passwd", "aurhabits.db/", "aurhabits.db ", "AURHABITS.db", "a/../aurhabits.db"] {
            assert!(validate_file(bad).is_err(), "{bad:?}");
        }
    }

    #[test]
    fn valida_el_motivo() {
        let long_ok = "a".repeat(40);
        let long_bad = "a".repeat(41);
        for ok in ["diario", "pre-migracion-v0", "antes-de-importar", "a", long_ok.as_str()] {
            assert!(validate_reason(ok).is_ok(), "{ok:?}");
        }
        for bad in ["", "Diario", "con espacio", "../x", "a/b", "a.b", "ñ", "dev-diario", long_bad.as_str()] {
            assert!(validate_reason(bad).is_err(), "{bad:?}");
        }
    }

    #[test]
    fn el_motivo_invalido_no_crea_archivos() {
        let (dir, path) = setup("aurhabits.db");
        assert!(block(create_snapshot(&path, "../fuera", at(10, 15))).is_err());
        assert!(!dir.path().join("backups").exists());
    }
}
