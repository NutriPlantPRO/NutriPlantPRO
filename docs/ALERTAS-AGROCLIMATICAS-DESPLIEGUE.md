# Alertas agroclimáticas — despliegue

## 1. Base de datos

Ejecutar en el proyecto Supabase:

`supabase/migrations/20260722_agroclimate_alerts.sql`

La migración activa RLS y no expone políticas públicas. Las solicitudes, predios,
tokens, reportes, entregas, accesos y auditoría se consultan mediante las funciones
Netlify con `service_role`.

## 2. Variables de Netlify

Ya utilizadas:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NUTRIPLANT_ADMIN_KEY`
- `PLAN_PRO_SMTP_USER` / `PLAN_PRO_SMTP_PASS` (correo existente de Outlook; Plan PRO no cambia)

Solo para alertas agroclimáticas (opcionales, recomendadas):

- `NUTRIPLANT_SMTP_USER` / `NUTRIPLANT_SMTP_PASS` — si las pones, las alertas las usan; si no, reutilizan `PLAN_PRO_SMTP_*`
- `AGROCLIMATE_EMAIL_FROM` (opcional; predeterminado `notifications@nutriplantpro.com`)
- `AGROCLIMATE_EMAIL_NAME` (opcional; predeterminado `NutriPlant | Alertas Agroclimáticas`)
- `AGROCLIMATE_TOKEN_SECRET`: secreto largo y aleatorio, mínimo 32 bytes.
- `AGROCLIMATE_CRON_SECRET`: secreto para ejecuciones manuales de diagnóstico.

SMTP autentica con `admin@` (`PLAN_PRO_SMTP_*`). El remitente visible de las alertas es `notifications@nutriplantpro.com`.

No cambiar `AGROCLIMATE_TOKEN_SECRET` después de activar usuarios: invalidaría los
enlaces que ya recibieron.

## 3. Programación

`agroclimate-weekly` se ejecuta cada hora. Solo procesa predios cuyo horario local
sea domingo a las 17:00. La clave única del reporte y la revisión de entrega evitan
reenvíos por una repetición del job.

## 4. Rutas

- Herramienta: `/pronosticoclimatico/`
- Demostración: `/pronosticoclimatico/?demo=1`
- Reporte personal: `/pronosticoclimatico/?token=...`
- Administración: `/admin/agroclimate.html?k=...`
- API pública: `/api/agroclimate`
- API admin: `/api/admin/agroclimate`

## 5. Revisión posterior al despliegue

1. Abrir la herramienta desde el botón nuevo del login.
2. Generar una lectura real y comprobar 7 días históricos y 7 de pronóstico.
3. Registrar una solicitud de prueba y confirmar el folio de cuatro caracteres.
4. En admin, marcar WhatsApp, aprobar y comprobar el correo inicial.
5. Abrir el enlace del correo y confirmar que aumenta el contador de accesos.
6. Editar coordenadas y Kc desde admin y desde el reporte personal.
7. Ejecutar un envío manual antes de dejar activo el job dominical.
