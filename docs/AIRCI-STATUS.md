# AirCI — Estado real (2026-08-07)

## Objetivo
Ortomosaico → copas confiables → métricas → decisión en huerta.

## Arquitectura
**Cerrada y nivel PRO en papel:**  
`docs/AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`  
- A: qué necesita AirCI · B: pipeline técnico · C: escalas S/M/L · E: JSON, casos duros, DoD

## Hecho en código (tubería)
- UI, subida GeoTIFF, Cloud Run, calibración UI, edición, Supabase

## No hecho en código (cerebro)
- Pipeline TO-BE: patrón desde las 10 → rejilla → confirmar RGB  
- Prueba contada a mano (§7 del doc de arquitectura)

## Cuando se retome
Seguir **solo** el orden de la §9 de la arquitectura.  
Prohibido seguir con parches de umbral “verde”.
