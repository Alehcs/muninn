//! Exportación a carpeta: escribe una lista de archivos de texto dentro de una
//! subcarpeta NUEVA (`Aurhabits-export-<fecha-hora>/`) del directorio elegido.
//!
//! Nunca sobrescribe ni borra nada que ya existiera: la subcarpeta se crea con
//! `create_dir` (falla si existe, y entonces se prueba con otro sufijo), cada
//! archivo con `create_new`, y todas las rutas se validan ANTES de tocar el
//! disco. Si la escritura falla a medias, se elimina únicamente la subcarpeta
//! recién creada.

use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::Path;

use chrono::Local;
use serde::{Deserialize, Serialize};

const EXPORT_PREFIX: &str = "Aurhabits-export-";
const TIMESTAMP_FORMAT: &str = "%Y-%m-%d-%H%M%S";
/// Caracteres que no se admiten en ningún componente (Windows los prohíbe).
const FORBIDDEN_CHARS: [char; 8] = ['\\', ':', '*', '?', '"', '<', '>', '|'];
const MAX_COMPONENT_BYTES: usize = 255;
const MAX_PATH_BYTES: usize = 1024;
const MAX_NAME_ATTEMPTS: u32 = 99;

#[derive(Debug, Deserialize)]
pub struct ExportFile {
    /// Ruta relativa con `/` como separador.
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct ExportResult {
    /// Ruta de la subcarpeta creada.
    pub path: String,
    /// Número de archivos escritos.
    pub count: usize,
}

/// Valida una ruta relativa y devuelve sus componentes. Rechaza rutas
/// absolutas, `..`, `.`, componentes vacíos, separadores de Windows, unidades
/// (`C:`), caracteres prohibidos o de control y nombres que terminan en punto
/// o espacio.
pub fn validate_relative_path(path: &str) -> Result<Vec<&str>, String> {
    let invalid = |reason: &str| Err(format!("Ruta de exportación no válida ({reason}): {path:?}"));

    if path.is_empty() {
        return invalid("vacía");
    }
    if path.len() > MAX_PATH_BYTES {
        return invalid("demasiado larga");
    }
    if path.starts_with('/') || Path::new(path).is_absolute() {
        return invalid("es absoluta");
    }

    let components: Vec<&str> = path.split('/').collect();
    for component in &components {
        if component.is_empty() {
            return invalid("tiene un componente vacío");
        }
        if *component == "." || *component == ".." {
            return invalid("contiene . o ..");
        }
        if component.len() > MAX_COMPONENT_BYTES {
            return invalid("un nombre es demasiado largo");
        }
        if component.chars().any(|c| c.is_control() || FORBIDDEN_CHARS.contains(&c)) {
            return invalid("contiene caracteres no permitidos");
        }
        if component.ends_with('.') || component.ends_with(' ') {
            return invalid("un nombre termina en punto o espacio");
        }
    }
    Ok(components)
}

/// Valida todas las rutas y que no choquen entre sí (mismo archivo repetido,
/// sin distinguir mayúsculas, o un archivo que también es carpeta).
fn validate_all(files: &[ExportFile]) -> Result<(), String> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut folders: HashSet<String> = HashSet::new();

    for file in files {
        let components = validate_relative_path(&file.path)?;
        let key = file.path.to_lowercase();
        if !seen.insert(key.clone()) {
            return Err(format!("Ruta de exportación repetida: {:?}", file.path));
        }
        let mut prefix = String::new();
        for component in &components[..components.len() - 1] {
            if !prefix.is_empty() {
                prefix.push('/');
            }
            prefix.push_str(&component.to_lowercase());
            folders.insert(prefix.clone());
        }
    }
    if let Some(clash) = files.iter().find(|f| folders.contains(&f.path.to_lowercase())) {
        return Err(format!(
            "La ruta {:?} es a la vez un archivo y una carpeta.",
            clash.path
        ));
    }
    Ok(())
}

/// Escribe los archivos en una subcarpeta nueva de `dir` y devuelve su ruta y
/// el número de archivos. `stamp` forma parte del nombre de la subcarpeta.
pub fn write_export(dir: &Path, stamp: &str, files: &[ExportFile]) -> Result<ExportResult, String> {
    write_export_with(dir, stamp, files, write_files)
}

/// Como `write_export`, con la escritura inyectable (para probar el fallo a medias).
fn write_export_with(
    dir: &Path,
    stamp: &str,
    files: &[ExportFile],
    write: impl Fn(&Path, &[ExportFile]) -> Result<(), String>,
) -> Result<ExportResult, String> {
    if !dir.is_absolute() {
        return Err(format!("La carpeta de destino debe ser una ruta absoluta: {dir:?}"));
    }
    if !dir.is_dir() {
        return Err(format!("La carpeta de destino no existe: {dir:?}"));
    }
    validate_all(files)?;

    let root = create_unique_dir(dir, &format!("{EXPORT_PREFIX}{stamp}"))?;
    match write(&root, files) {
        Ok(()) => Ok(ExportResult {
            path: root.to_string_lossy().into_owned(),
            count: files.len(),
        }),
        Err(error) => {
            // La subcarpeta es nuestra (la acabamos de crear vacía): se retira.
            let _ = fs::remove_dir_all(&root);
            Err(error)
        }
    }
}

fn create_unique_dir(parent: &Path, base: &str) -> Result<std::path::PathBuf, String> {
    for attempt in 1..=MAX_NAME_ATTEMPTS {
        let name = if attempt == 1 {
            base.to_string()
        } else {
            format!("{base}-{attempt}")
        };
        let candidate = parent.join(name);
        match fs::create_dir(&candidate) {
            Ok(()) => return Ok(candidate),
            Err(e) if e.kind() == ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(format!("No se pudo crear la carpeta de exportación: {e}")),
        }
    }
    Err("No se pudo elegir un nombre libre para la carpeta de exportación.".to_string())
}

fn write_files(root: &Path, files: &[ExportFile]) -> Result<(), String> {
    for file in files {
        let target = root.join(&file.path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("No se pudo crear la carpeta de {:?}: {e}", file.path))?;
        }
        let mut handle = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|e| format!("No se pudo crear {:?}: {e}", file.path))?;
        handle
            .write_all(file.content.as_bytes())
            .map_err(|e| format!("No se pudo escribir {:?}: {e}", file.path))?;
    }
    Ok(())
}

/// Escribe la exportación en una subcarpeta nueva de `dir`.
#[tauri::command]
pub fn export_files(dir: String, files: Vec<ExportFile>) -> Result<ExportResult, String> {
    let stamp = Local::now().format(TIMESTAMP_FORMAT).to_string();
    write_export(Path::new(&dir), &stamp, &files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn file(path: &str, content: &str) -> ExportFile {
        ExportFile {
            path: path.to_string(),
            content: content.to_string(),
        }
    }

    fn entries(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    #[test]
    fn escribe_archivos_y_carpetas_en_una_subcarpeta_nueva() {
        let tmp = TempDir::new().unwrap();
        let files = vec![
            file("Tareas.md", "# Tareas\n"),
            file("Páginas/Madre/Hija.md", "canción 🎉\n"),
            file("Páginas/Madre.md", "madre"),
        ];

        let result = write_export(tmp.path(), "2026-11-10-120000", &files).unwrap();

        assert_eq!(result.count, 3);
        let root = Path::new(&result.path);
        assert_eq!(root, tmp.path().join("Aurhabits-export-2026-11-10-120000"));
        assert_eq!(entries(tmp.path()), vec!["Aurhabits-export-2026-11-10-120000"]);
        assert_eq!(fs::read_to_string(root.join("Tareas.md")).unwrap(), "# Tareas\n");
        assert_eq!(
            fs::read_to_string(root.join("Páginas/Madre/Hija.md")).unwrap(),
            "canción 🎉\n"
        );
    }

    #[test]
    fn exige_que_la_carpeta_exista_y_sea_absoluta() {
        let tmp = TempDir::new().unwrap();
        let missing = tmp.path().join("no-existe");
        let err = write_export(&missing, "x", &[file("a.md", "")]).unwrap_err();
        assert!(err.contains("no existe"), "{err}");
        assert!(!missing.exists());

        let err = write_export(Path::new("relativa"), "x", &[file("a.md", "")]).unwrap_err();
        assert!(err.contains("absoluta"), "{err}");

        // Un archivo no es una carpeta.
        let plain = tmp.path().join("archivo.txt");
        fs::write(&plain, "x").unwrap();
        assert!(write_export(&plain, "x", &[file("a.md", "")]).is_err());
    }

    #[test]
    fn rechaza_rutas_peligrosas_sin_crear_nada() {
        let bad = [
            "/etc/passwd",
            "../fuera.md",
            "a/../../fuera.md",
            "a/./b.md",
            "a//b.md",
            "a/",
            "",
            "C:/windows.md",
            "a\\b.md",
            "a/b:c.md",
            "a/b*.md",
            "a/b?.md",
            "a/\"b\".md",
            "a/<b>.md",
            "a/b|c.md",
            "a/b\u{0}c.md",
            "a/b\nc.md",
            "a/termina.",
            "a/termina .md ",
        ];
        for path in bad {
            let tmp = TempDir::new().unwrap();
            let files = vec![file("bueno.md", "ok"), file(path, "mal")];
            let result = write_export(tmp.path(), "x", &files);
            assert!(result.is_err(), "debería rechazar {path:?}");
            assert!(entries(tmp.path()).is_empty(), "no debe crear nada con {path:?}");
        }
    }

    #[test]
    fn rechaza_nombres_demasiado_largos() {
        let tmp = TempDir::new().unwrap();
        let long = format!("{}.md", "a".repeat(300));
        assert!(write_export(tmp.path(), "x", &[file(&long, "")]).is_err());
        assert!(entries(tmp.path()).is_empty());
    }

    #[test]
    fn rechaza_rutas_repetidas_y_choques_archivo_carpeta() {
        let tmp = TempDir::new().unwrap();
        let dup = vec![file("A.md", "1"), file("a.md", "2")];
        let err = write_export(tmp.path(), "x", &dup).unwrap_err();
        assert!(err.contains("repetida"), "{err}");

        let clash = vec![file("Carpeta", "1"), file("carpeta/dentro.md", "2")];
        let err = write_export(tmp.path(), "x", &clash).unwrap_err();
        assert!(err.contains("archivo y una carpeta"), "{err}");
        assert!(entries(tmp.path()).is_empty());
    }

    #[test]
    fn nunca_sobrescribe_si_la_subcarpeta_ya_existe() {
        let tmp = TempDir::new().unwrap();
        let first = write_export(tmp.path(), "mismo", &[file("a.md", "primero")]).unwrap();
        let second = write_export(tmp.path(), "mismo", &[file("a.md", "segundo")]).unwrap();

        assert_ne!(first.path, second.path);
        assert!(second.path.ends_with("Aurhabits-export-mismo-2"));
        assert_eq!(
            fs::read_to_string(Path::new(&first.path).join("a.md")).unwrap(),
            "primero"
        );
        assert_eq!(
            fs::read_to_string(Path::new(&second.path).join("a.md")).unwrap(),
            "segundo"
        );
    }

    #[test]
    fn no_toca_lo_que_ya_hay_en_la_carpeta_de_destino() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("mio.md"), "intacto").unwrap();
        write_export(tmp.path(), "x", &[file("mio.md", "otro")]).unwrap();
        assert_eq!(fs::read_to_string(tmp.path().join("mio.md")).unwrap(), "intacto");
    }

    #[test]
    fn si_la_escritura_falla_a_mitad_retira_solo_la_subcarpeta_nueva() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("conservar.txt"), "x").unwrap();

        let result = write_export_with(tmp.path(), "x", &[file("a.md", "1")], |root, files| {
            write_files(root, files)?;
            Err("fallo simulado".to_string())
        });

        assert_eq!(result.unwrap_err(), "fallo simulado");
        assert_eq!(entries(tmp.path()), vec!["conservar.txt"]);
    }

    #[test]
    fn write_files_falla_si_el_archivo_ya_existe_y_no_lo_pisa() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("a.md"), "original").unwrap();
        let err = write_files(tmp.path(), &[file("a.md", "nuevo")]).unwrap_err();
        assert!(err.contains("a.md"), "{err}");
        assert_eq!(fs::read_to_string(tmp.path().join("a.md")).unwrap(), "original");
    }

    #[test]
    fn una_lista_vacia_crea_la_carpeta_vacia() {
        let tmp = TempDir::new().unwrap();
        let result = write_export(tmp.path(), "x", &[]).unwrap();
        assert_eq!(result.count, 0);
        assert!(Path::new(&result.path).is_dir());
    }

    #[test]
    fn valida_rutas_correctas() {
        assert_eq!(
            validate_relative_path("Páginas/Mi canción 🎉.md").unwrap(),
            vec!["Páginas", "Mi canción 🎉.md"]
        );
        assert!(validate_relative_path("a.b/c-d_e (1).md").is_ok());
    }
}
