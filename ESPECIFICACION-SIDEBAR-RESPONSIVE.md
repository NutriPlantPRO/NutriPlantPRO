# Especificacion Sidebar Responsive (Fuente de Verdad)

## Objetivo
Definir el comportamiento exacto del sidebar para evitar cambios contradictorios.
Este documento manda sobre cualquier ajuste futuro del sidebar.

## Principios
- Un solo comportamiento por tipo de entrada: `mouse` o `touch`.
- Sin reglas duplicadas que se contradigan.
- Sin "adivinar" por dispositivo; prioridad a ancho real + tipo de entrada.
- El sidebar nunca debe tapar contenido de forma inesperada.
- Si un cambio rompe otro escenario, se considera incorrecto.

## Modos oficiales

### 1) Desktop/Laptop (mouse)
Condicion:
- `hover: hover` y `pointer: fine`.

Comportamiento:
- Si el layout esta en modo compacto, sidebar inicia minimizado.
- Al pasar cursor sobre sidebar minimizado: se expande.
- Al quitar cursor: vuelve a minimizado.
- No depende de "tocar fuera" para cerrar/minimizar.

### 2) Compacto Touch (celular / touch estrecho)
Condicion:
- Touch (`hover: none` o `pointer: coarse`) y ancho compacto.

Comportamiento:
- Sidebar visible en estado minimizado (barra de iconos).
- Tocar la barra minimizada: expande.
- Tocar fuera del sidebar: minimiza.
- Sin hover.

### 3) Fold horizontal (touch, pantalla desplegada horizontal)
Condicion:
- Touch + landscape + rango de ancho del Fold horizontal.

Comportamiento:
- Sidebar puede estar expandido o minimizado.
- Tocar fuera: minimiza.
- Tocar barra minimizada: expande.
- No usar overlay bloqueante en este modo.

### 4) Tablet ancha (no Fold)
Condicion:
- Ancho tablet/desktop sin modo Fold horizontal.

Comportamiento:
- Sidebar fijo a la izquierda, contenido a la derecha.
- Estado estable (sin minimizarse solo por eventos de resize).
- No tapar contenido.

## Reglas de UI obligatorias
- Sidebar debe llegar hasta abajo de pantalla util (debajo del header).
- En minimizado: solo iconos; no debe verse texto residual como "Inicio".
- En expandido: textos visibles y alineacion correcta.
- Transiciones suaves, sin parpadeos ni saltos.

## Reglas de implementacion (tecnicas)
- Mantener un controlador unico de estado del sidebar.
- Estados permitidos: `expanded` y `minimized`.
- Modos permitidos: `compact-touch`, `compact-mouse`, `fold-horizontal`, `wide`.
- En cada `resize/orientationchange`:
  - recalcular modo
  - aplicar estado valido para ese modo
  - limpiar clases/estilos que no correspondan
- Evitar estilos inline para mostrar/ocultar labels (preferir CSS por clase/estado).

## Matriz de validacion minima (obligatoria antes de deploy)
1. Laptop ventana chica (mouse)
- Hover abre.
- Salir hover cierra/minimiza.
- Sin bloqueos al dar click en menu.

2. Celular vertical (touch)
- Barra minimizada visible.
- Tocar barra abre.
- Tocar fuera minimiza.

3. Fold vertical (touch)
- Igual que celular touch (sin hover).

4. Fold horizontal (touch)
- Expandido -> tocar fuera minimiza.
- Minimizado -> tocar barra expande.
- Repetir 3 veces seguidas, sin inconsistencias.

5. Tablet horizontal y vertical (no Fold)
- Sidebar estable.
- Sin minimizarse solo.
- Sin tapar contenido.

## Breakpoints y detalle tecnico (referencia)
- Compacto: ancho <= 768 px.
- Tablet ancha: 769–1024 px (sidebar fijo, contenido al lado).
- Fold horizontal (sin adivinar dispositivo): **touch** (`pointer: coarse`) + **landscape** (ancho > alto) + **ancho 769–1400 px**. Una sola regla; no se usa UA ni ratio.
- Overlay: no obligatorio; si se usa, solo en compacto touch cuando el sidebar esta expandido. En fold horizontal no usar overlay bloqueante.

## Politica de cambios a partir de ahora
- No se aceptan cambios "rapidos" sin pasar la matriz de validacion.
- Si un ajuste corrige un modo y rompe otro, se revierte.
- Si hay duda, se actualiza este documento primero y luego el codigo.

## Estado actual esperado (objetivo)
Queremos comportamiento consistente en todos los escenarios anteriores.
Si algo no cumple, se considera bug de regresion del sidebar.

---

## Notas de esta racha de ajustes (no son ley)

**Referencia por si se repiten fallos; no aplicar a ciegas.** Si algo ya funciona bien, no tocarlo solo por cumplir esto.

- Bloquear "expandir" cuando el toque es en enlace del sidebar hizo que "a veces abre a veces no": al tocar la barra casi siempre se toca el enlace Inicio, y si hacemos return ahı no se llama expandir.
- Deteccion por UA o ratio nos hizo subir/bajar numeros y seguir fallando; la regla vista+entrada (touch + landscape + ancho) es mas estable.
- En laptop (compact-mouse) no usar "tocar fuera" para minimizar; solo hover.
- Touch: usar `(pointer: coarse) || (hover: none)` por si el navegador no reporta solo uno.
- Cualquier cambio: comprobar que no se rompa otro modo (cel, fold, tablet, laptop).
