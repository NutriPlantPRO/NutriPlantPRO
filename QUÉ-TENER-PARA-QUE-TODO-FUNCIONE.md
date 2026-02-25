# Qué tener para que todo funcione

Lista mínima: archivos que deben existir y un solo comando.

---

## 1. Archivos en la carpeta del proyecto

| Archivo | Para qué | ¿Lo tienes? |
|--------|----------|--------------|
| `server.py` | Servidor (chat, admin, APIs) | ✅ Ya está |
| `supabase-server-config.json` | Borrar/editar usuarios en Supabase Auth desde el admin | ✅ Ya lo tienes con URL y clave |

El contenido de `supabase-server-config.json` debe ser algo así (con tus valores reales):

```json
{
  "SUPABASE_URL": "https://tu-proyecto.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
}
```

La **SUPABASE_SERVICE_ROLE_KEY** la sacas en Supabase → **Settings** → **API** → **service_role** (secret).

---

## 2. Un solo comando

Abre la terminal, entra a la carpeta del proyecto y arranca el servidor:

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
python3 server.py
```

Cuando veas:

```
Servidor corriendo en http://localhost:8000
```

ya está todo listo.

---

## 3. URLs que debes usar en el navegador

- **App (login, dashboard, proyectos):**  
  `http://localhost:8000/login.html`  
  o `http://localhost:8000/dashboard.html`

- **Panel de admin (usuarios, borrar en Auth, etc.):**  
  `http://localhost:8000/admin/?k=np_admin_key_8f4a2b9c1e7d`

No abras el admin como archivo (no `file:///.../admin/index.html`). Siempre con `http://localhost:8000/admin/...`.

---

## Resumen

1. Tener `supabase-server-config.json` con **SUPABASE_URL** y **SUPABASE_SERVICE_ROLE_KEY**.
2. Ejecutar `python3 server.py` en la carpeta del proyecto.
3. Usar en el navegador `http://localhost:8000/...` (login, dashboard, admin).

Con eso el chat, la nube, el panel de admin y el borrado en Supabase Authentication salen bien.
