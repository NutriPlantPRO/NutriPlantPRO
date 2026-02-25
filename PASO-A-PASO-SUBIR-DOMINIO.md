# Paso a paso: Subir NutriPlant Pro al dominio (con mi apoyo)

Socio, aquí va todo en orden. Puedes ir haciendo un paso, decirme “listo” o “no sé dónde está eso”, y seguimos al siguiente. **Seguirás editando igual en Cursor**; solo vamos a conectar esta carpeta con GitHub y con tu dominio para que la web se actualice cuando tú subas los cambios.

---

## Empezar desde tu repo NutriPlantPRO/NutriPlantPRO (ya lo tienes)

Tu repo en GitHub es **NutriPlantPRO/NutriPlantPRO**. Para conectar tu carpeta "MI PROYECTO" con ese repo y subir todo:

1. Abre **Terminal** en tu Mac (Spotlight: escribe "Terminal" y Enter).
2. Pega y ejecuta **uno por uno** (Enter después de cada línea):

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
```
```bash
git remote add origin https://github.com/NutriPlantPRO/NutriPlantPRO.git
```
```bash
git push -u origin main --force
```

El `--force` es porque el repo en GitHub tiene otro historial; así lo que queda en GitHub es exactamente lo de tu carpeta (todo lo que hemos trabajado).  
Si te pide usuario/contraseña: usa tu usuario de GitHub y, si no acepta la contraseña normal, en GitHub → Settings → Developer settings → Personal access tokens, crea un token con permiso **repo** y úsalo como contraseña.

Cuando termine sin error, avisa y seguimos con el dominio (Netlify).

---

## Resumen de qué vamos a hacer

1. **Crear una cuenta en GitHub** (si no tienes) y un “repositorio” para el proyecto.
2. **Conectar tu carpeta “MI PROYECTO”** con ese repositorio y subir el código (primera vez).
3. **Poner la web en tu dominio** usando un servicio gratis (Netlify o similar) que se enlaza a GitHub.
4. A partir de ahí: **cada vez que quieras actualizar la web**, en Cursor hacemos los cambios como siempre y luego tú (o yo te digo) ejecutas 3 comandos: `git add`, `git commit`, `git push`. El dominio se actualiza solo.

Tu flujo sigue siendo: **abres Cursor → editas esta misma carpeta → cuando quieras publicar, haces push**. Yo te sigo ayudando aquí como hasta ahora.

---

## PASO 1 — Cuenta de GitHub

1. Entra a **https://github.com**
2. Si no tienes cuenta: **Sign up** (correo, contraseña, nombre de usuario). Si ya tienes: **Sign in**.
3. Cuando estés dentro (ves tu nombre arriba a la derecha), avisa y pasamos al Paso 2.

---

## PASO 2 — Crear el repositorio (la “caja” del proyecto en GitHub)

1. Arriba a la derecha, clic en el **+** → **New repository**.
2. **Repository name:** pon por ejemplo `nutriplant-pro` (todo junto, minúsculas, sin espacios).
3. **Public**.
4. **No marques** “Add a README file” ni “Add .gitignore”. Deja todo en blanco.
5. Clic en **Create repository**.
6. En la página que sale te dará una **URL** tipo:  
   `https://github.com/TU_USUARIO/nutriplant-pro.git`  
   **Cópiala** (o anota TU_USUARIO y el nombre del repo). La vamos a usar en el Paso 3.

Cuando tengas esa URL (o tu usuario y nombre del repo), dímelo y te digo exactamente qué pegar en la terminal.

---

## PASO 3 — Conectar tu carpeta con GitHub y subir (primera vez)

En tu Mac, abre **Terminal** (búsqueda Spotlight: “Terminal” o en Aplicaciones → Utilidades).

Copia y pega estos comandos **uno por uno** (después de cada uno pulsa Enter).  
**En el segundo comando** cambia `TU_USUARIO` y `nutriplant-pro` por tu usuario de GitHub y el nombre del repo que creaste.

```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
```

```bash
git remote add origin https://github.com/TU_USUARIO/nutriplant-pro.git
```
*(sustituye TU_USUARIO y nutriplant-pro por los tuyos)*

```bash
git push -u origin main
```

Te pedirá **usuario y contraseña de GitHub**. Si te pide “token” en lugar de contraseña: en GitHub → Settings → Developer settings → Personal access tokens, crea un token con permiso `repo` y usa ese token como contraseña.

Cuando veas algo como “Branch 'main' set up to track...” y sin errores, **el código ya está en GitHub**. Avísame y pasamos al Paso 4 (dominio).

---

## PASO 4 — Poner la web en tu dominio (Netlify, gratis)

Vamos a usar **Netlify** porque es gratis y enlaza directo con GitHub: cada vez que hagas `git push`, la web se actualiza sola.

1. Entra a **https://www.netlify.com** → **Sign up** (puedes “Sign up with GitHub” para que no crees otra contraseña).
2. Dentro de Netlify: **Add new site** → **Import an existing project**.
3. **Connect to GitHub** y autoriza Netlify si te lo pide.
4. Elige el repositorio **NutriPlantPRO** (o NutriPlantPRO/NutriPlantPRO).
5. **Build settings** (importante):
   - **Branch to deploy:** `main`
   - **Build command:** déjalo **vacío**
   - **Publish directory:** escribe un punto: **`.`**
6. **Deploy site**.

En unos minutos Netlify te dará una URL tipo `algo-random.netlify.app`. Esa ya es tu web en vivo.  
Si tienes **tu propio dominio** (ej. nutriplantpro.com):
- En Netlify: **Domain settings** → **Add custom domain** → pones tu dominio y sigues las instrucciones (apuntar el dominio donde te indique Netlify). Eso ya es tema de “DNS”; si me dices qué compañía te vendió el dominio, te digo qué pantalla tocar.

Cuando tengas al menos la URL de Netlify (aunque sea la .netlify.app), **avísame** y revisamos que login, calculadoras y todo carguen bien. Si algo no carga (por ejemplo Supabase o PayPal), lo ajustamos.

---

## PASO 5 — Después de esto: cómo seguir trabajando (y con mi apoyo)

- **Seguir editando:** igual que hasta ahora. Abres **Cursor**, abres la carpeta **“MI PROYECTO”** y editamos archivos. Nada cambia en tu forma de trabajar.
- **Cuando quieras que los cambios se vean en la web:**
  1. En Terminal (desde esa carpeta):
     ```bash
     cd "/Users/jesusavila/Desktop/MI PROYECTO"
     git add -A
     git commit -m "Lo que cambiamos, por ejemplo: texto en login"
     git push
     ```
  2. Netlify actualiza solo en 1–2 minutos.
- **Soporte posterior:** cuando quieras cambiar algo (textos, botones, registro, dominio, etc.), seguimos aquí en Cursor como hasta ahora. Si en algún paso no sabes “dónde está eso” o te sale un error, me pegas el mensaje o describes la pantalla y te guío al siguiente clic o comando.

---

## Resumen rápido

| Qué quieres hacer | Dónde / cómo |
|-------------------|--------------|
| Editar el proyecto | Cursor → carpeta “MI PROYECTO” (como siempre) |
| Subir cambios a la web | Terminal: `git add -A` → `git commit -m "..."` → `git push` |
| Crear usuario de prueba | Abrir `login.html?np_reg=1` en el navegador |
| Ayuda paso a paso | Seguimos en este chat; dices en qué paso vas y te guío |

Cuando estés listo, dime en qué paso vas (1, 2, 3, 4 o 5) y lo hacemos juntos.
