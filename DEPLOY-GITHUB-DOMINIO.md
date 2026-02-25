# Subir NutriPlant Pro a GitHub y al dominio

## Estado actual
- ✅ Git inicializado en esta carpeta
- ✅ Primer commit hecho (todo el proyecto)
- ✅ Login con mensaje claro: "Calculadoras gratis — no necesitas registrarte"

---

## 1. Conectar con tu repositorio de GitHub

Si **ya tienes** un repo en GitHub (vacío o con contenido):

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

Sustituye `TU_USUARIO` y `TU_REPO` por tu usuario de GitHub y el nombre del repositorio.

Si **aún no** tienes el repo:
1. Entra a https://github.com/new
2. Nombre del repo (ej. `nutriplant-pro`), público o privado
3. **No** marques "Add a README" (ya tienes código local)
4. Crear repositorio
5. Copia la URL que te da (ej. `https://github.com/tu-usuario/nutriplant-pro.git`) y úsala en los comandos de arriba.

---

## 2. Después de cada cambio (cuando quieras actualizar la web)

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
git add -A
git commit -m "Descripción breve del cambio"
git push
```

Si tu dominio está conectado al repo (Netlify, Vercel, GitHub Pages, etc.), el sitio se actualiza solo al hacer `git push`.

---

## 3. Dominio: opciones típicas

- **GitHub Pages**: repo público → Settings → Pages → Source: main branch. La URL será `https://tu-usuario.github.io/tu-repo/`.
- **Netlify / Vercel**: conectar el repo de GitHub; cada push despliega.
- **Tu propio hosting**: subir los archivos por FTP o con `git pull` en el servidor desde tu repo.

---

## 4. Crear usuario de prueba (registro cerrado al público)

Si el registro está cerrado pero tú quieres crear un usuario prueba (suscripción, etc.):

- Abre en el navegador: **`login.html?np_reg=1`** (o tu dominio: `https://tudominio.com/login.html?np_reg=1`).
- En esa carga aparecerá de nuevo "Crear Nueva Cuenta" y podrás completar el registro.
- La URL se limpia sola (queda solo `login.html`) para no dejar el parámetro visible.

---

## 5. Recordatorio

Sigue editando **esta misma carpeta** en Cursor. Aquí hacemos los cambios; GitHub y el dominio solo reciben lo que subes con `git push`. Así seguimos trabajando igual que hasta ahora.
