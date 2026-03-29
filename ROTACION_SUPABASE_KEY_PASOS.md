# Rotacion Segura de SUPABASE_SERVICE_ROLE_KEY

Guia practica para rotar la key sin romper operacion.

## Objetivo

- Rotar `SUPABASE_SERVICE_ROLE_KEY` en Supabase.
- Actualizar la nueva key en Netlify/backend.
- Verificar que login, proyectos y sincronizacion sigan funcionando.

## Antes de empezar (2 min)

- Ten a la mano acceso a:
  - Supabase Dashboard del proyecto correcto.
  - Netlify del sitio correcto.
- No cierres sesiones hasta terminar pruebas.
- Haz este proceso en una ventana de mantenimiento corta (10-20 min).

## Paso 1 - Rotar key en Supabase

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard).
2. Abre tu proyecto de NutriPlant.
3. Ve a `Project Settings` -> `API` (o seccion de keys/JWT).
4. Rota/regenera la `service_role key`.
5. Copia la nueva key en un bloc temporal (no la pegues en frontend).

## Paso 2 - Actualizar Netlify

1. Entra a Netlify -> Site -> `Site configuration` -> `Environment variables`.
2. Busca `SUPABASE_SERVICE_ROLE_KEY`.
3. Reemplaza valor viejo por la nueva key.
4. Guarda cambios.
5. Dispara redeploy (si Netlify no lo hace automatico).

## Paso 3 - Actualizar backend local (si aplica)

Solo si usas backend local tipo `server.py`:

1. Actualiza variable/archivo de entorno con la nueva key.
2. Reinicia servidor.

## Paso 4 - Eliminar key vieja de archivos locales

1. Revisa `supabase-server-config.json` y cualquier archivo local de config.
2. Quita la key vieja o dejala vacia.
3. Mantener `.gitignore` activo para no subir secretos.

## Paso 5 - Pruebas funcionales (obligatorio)

### A) Dashboard y proyectos

- Login normal.
- Ver lista de proyectos.
- Abrir 2-3 proyectos.
- Cambiar una cosa minima y guardar.
- Pulsar `Actualizar con la nube`.

### B) Reportes

- Abrir `Reporte`.
- Compartir vista de un reporte.
- Confirmar que genera link.

### C) (Recomendado) Flujo PayPal

- Validar que webhook/proceso post-pago sigue escribiendo en Supabase.
- No necesitas cambiar keys de PayPal, solo comprobar que no se rompio backend.

## Paso 6 - Validacion de errores

Si algo falla, revisa:

- Logs de Netlify functions.
- Errores 401/403 en funciones backend.
- Variables de entorno (typos o espacios).

## Resultado esperado

- `SUPABASE_SERVICE_ROLE_KEY` vieja queda invalida.
- Operacion normal con key nueva.
- Sin secretos sensibles expuestos en archivos del proyecto.

---

## Checklist rapido

- [ ] Rotada key en Supabase
- [ ] Actualizada key en Netlify
- [ ] Redeploy completado
- [ ] Backend local actualizado (si aplica)
- [ ] Key vieja removida de archivos locales
- [ ] Login/proyectos OK
- [ ] Reportes OK
- [ ] (Opcional) PayPal post-pago OK

