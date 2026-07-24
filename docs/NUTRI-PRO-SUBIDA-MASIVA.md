# Nutri PRO — subida masiva desde la Mac

Guía para subir carpetas enteras a Nutri PRO **respetando la misma estructura** (carpetas dentro de carpetas), reintentar si se corta, indexar al final, y volver a subir solo lo nuevo cuando agregues archivos.

Script: `scripts/nutri-pro-bulk-upload.mjs`

---

## Qué hace

| En tu Mac | En Nutri PRO |
|-----------|----------------|
| Una carpeta | Una carpeta con el mismo nombre |
| Subcarpetas (con `--recursive`) | Subcarpetas iguales |
| Archivos PDF, Office, imágenes, etc. | Archivos en esa carpeta |

**No gasta Netlify** (ni deploys ni functions). Habla directo con **Supabase** (Storage + base de datos).

---

## Antes de empezar

1. Terminal en la raíz del proyecto:
   ```bash
   cd "/Users/jesusavila/Desktop/MI PROYECTO"
   ```
2. Credenciales de admin (no las guardes en el repo):
   ```bash
   export NUTRI_PRO_BULK_EMAIL="tu@correo.com"
   export NUTRI_PRO_BULK_PASSWORD="tu-contraseña"
   ```
3. Comillas **cerradas** en los `export`. Si ves `dquote>`, pulsa **Ctrl + C** y vuelve a escribir.
4. Rutas con `!` o espacios: usa **comillas simples**:
   ```bash
   --dir '/Users/jesusavila/Documents/2Work JJAM'
   ```
5. Deja la **laptop abierta y sin dormir** (en cargador). Si se duerme, la subida se corta.

---

## Carpeta grande (primera vez) — como `2Work JJAM`

Recomendado: **primero subir sin indexar** (más rápido), **después indexar**.

### 1) Subir (sin indexar)

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"

export NUTRI_PRO_BULK_EMAIL="tu@correo.com"
export NUTRI_PRO_BULK_PASSWORD="tu-contraseña"

node scripts/nutri-pro-bulk-upload.mjs \
  --dir '/Users/jesusavila/Documents/2Work JJAM' \
  --title '2Work JJAM' \
  --recursive \
  --reuse-folder \
  --resume \
  --skip-existing \
  --concurrency 3 \
  --no-index
```

### 2) Indexar (cuando ya terminó la subida)

```bash
node scripts/nutri-pro-bulk-upload.mjs \
  --dir '/Users/jesusavila/Documents/2Work JJAM' \
  --title '2Work JJAM' \
  --recursive \
  --reuse-folder \
  --index-only
```

Eso lee los archivos ya en la nube / locales coincidentes y llena el texto indexado para búsqueda y el GPT.

**Pendiente acordado:** al terminar la tanda grande de `2Work JJAM`, correr el paso **index-only**.

---

## Flags que siempre conviene usar

| Flag | Para qué |
|------|----------|
| `--recursive` | Misma estructura de subcarpetas |
| `--reuse-folder` | No crea carpetas duplicadas si ya existen |
| `--skip-existing` | Omite archivos que ya están (mismo nombre en esa carpeta) |
| `--resume` | Continúa si se corta (usa `.nutri-pro-upload-state.json`) |
| `--no-index` | Solo sube (rápido en tandas grandes) |
| `--index-only` | Solo indexa lo ya subido |
| `--dry-run` | Prueba: lista qué haría, no sube |

---

## Cuando agregues archivos nuevos (recurrente)

Misma carpeta local, mismos nombres de carpetas en Nutri PRO:

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
export NUTRI_PRO_BULK_EMAIL="tu@correo.com"
export NUTRI_PRO_BULK_PASSWORD="tu-contraseña"

node scripts/nutri-pro-bulk-upload.mjs \
  --dir '/Users/jesusavila/Documents/2Work JJAM' \
  --title '2Work JJAM' \
  --recursive \
  --reuse-folder \
  --resume \
  --skip-existing \
  --concurrency 3 \
  --no-index
```

Solo sube lo que falta. Luego, si quieres que sean buscables:

```bash
node scripts/nutri-pro-bulk-upload.mjs \
  --dir '/Users/jesusavila/Documents/2Work JJAM' \
  --title '2Work JJAM' \
  --recursive \
  --reuse-folder \
  --index-only
```

O pídele al socio/agente en Cursor: *“sube lo nuevo de 2Work JJAM a Nutri PRO”*.

---

## Si se corta a mitad

1. No borres `.nutri-pro-upload-state.json` en la carpeta local raíz (`2Work JJAM`).
2. Vuelve a correr el **mismo** comando con `--resume` y `--skip-existing`.
3. En Cursor a veces el proceso de fondo se aborta; lo más estable es pegar el comando en **Terminal.app**.

Ver avance (si guardaste log):

```bash
tail -f "/Users/jesusavila/Desktop/MI PROYECTO/scripts/nutri-pro-bulk-2work-jjama.log"
```

Contar subidos en el state:

```bash
python3 -c "import json; d=json.load(open('/Users/jesusavila/Documents/2Work JJAM/.nutri-pro-upload-state.json')); print(len(d.get('uploaded',{})))"
```

---

## Archivos que fallan o se omiten

### Omitidos (normal)
- Videos (`.mp4`, etc.) — Nutri PRO no los acepta en este script
- Excel con macros (`.xlsm`)

### Errores frecuentes
- **`fetch failed`** — red/timeout (archivos muy pesados). Reintentar al final.
- **`maximum allowed size`** — límite de Supabase Storage.

Límite de tamaño (dashboard Supabase):
1. Proyecto → **Storage** → **Files** → **Settings**
2. **Global file size limit** (ej. 250 MB)
3. Si dice *spend cap*, hay que desactivar el spend cap en Billing antes de poder subir de 50 MB.

En Nutri PRO (app): botón **Más pesados** lista los archivos más grandes, con ruta y **Ir** a la carpeta para borrarlos si hace falta.

---

## Duplicados (importante)

`--skip-existing` solo evita duplicar **dentro de la misma carpeta Nutri PRO**.

Si antes subiste carpetas **sueltas en la raíz** y luego la misma estructura **dentro de `2Work JJAM`**, puedes tener dos copias. Quédate con el árbol bajo `2Work JJAM` y borra las carpetas sueltas de la raíz.

---

## Checklist rápido para el agente / socio

Cuando diga “sube a Nutri PRO” o “lo nuevo de 2Work JJAM”:

1. Confirmar ruta local (`Documents/2Work JJAM` u otra).
2. Correr con `--recursive --reuse-folder --resume --skip-existing`.
3. Tanda grande → `--no-index` primero.
4. Al terminar → recordar y ofrecer / ejecutar `--index-only`.
5. Reportar errores `✗` y omitidos; reintentar pesados si el límite de Supabase ya está alto.
6. No poner contraseñas en commits ni en docs del repo.

---

## Referencias

- Script: `scripts/nutri-pro-bulk-upload.mjs`
- Bucket Storage: `plan-pro-nutri-pro`
- UI Plan PRO → Nutri PRO: `planpro/index.html` (botón **Más pesados**, scroll lateral en carpetas)
