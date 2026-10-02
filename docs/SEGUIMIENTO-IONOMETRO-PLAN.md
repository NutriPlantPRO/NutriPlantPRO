# Seguimiento con ionómetro

Documento de trabajo. Aquí se define la herramienta antes de construirla. Lo que está escrito es lo acordado en el chat del 2 de octubre de 2026. Si algo cambia, se cambia en este archivo.

Estado: **herramienta armada** (login y dashboard). El PDF y la vista en admin siguen pendientes.

## Qué es

Bitácora para anotar lecturas de ionómetro o fotómetro de nutrientes. Sirve para solución nutritiva, extracto de pasta, pecíolo, foliar o savia. El usuario llena los iones que su equipo mide y deja vacíos los demás.

Cada tabla es un seguimiento. El título lo escribe él: «Savia semanal», «Solución tanque A», «Tomate malla 3 — pasta». En una misma tabla no se mezclan tipos de muestra, porque el potasio de savia y el de solución no caben en la misma escala.

La pantalla es la misma en gratuita y en Pro. En la computadora, la tabla va a la izquierda y las gráficas a la derecha, una por columna. En el teléfono, la tabla arriba y las gráficas abajo.

## Tabla

La primera columna es el título de la fila: Semana 1, 07 ago, Malla 12, o el nombre que quiera. Agrega las filas que necesite. Puede borrar una fila, y subirla o bajarla. La gráfica sigue ese orden, no una fecha: el título es texto libre, no un calendario.

Después, en este orden:

| Grupo | Columna | Se teclea | Pasa a meq |
| --- | --- | --- | --- |
| — | pH (H⁺) | el pH de la pantalla | No |
| — | CE | dS/m | No |
| Aniones | NO₃⁻ | ppm | Sí |
| Aniones | PO₄ | ppm | Sí |
| Aniones | SO₄²⁻ | ppm | Sí |
| Cationes | K⁺ | ppm | Sí |
| Cationes | Ca²⁺ | ppm | Sí |
| Cationes | Mg²⁺ | ppm | Sí |
| Orilla | Cl⁻ | ppm | Sí |
| Orilla | Na⁺ | ppm | Sí |
| Orilla | NH₄⁺ | ppm | Sí |

El amonio va en la orilla, como en la solución de NutriPlant: es catión, y no entra en el grupo K-Ca-Mg. Cloro y sodio tampoco entran a los tres aniones ni a los tres cationes.

Ejemplo de cómo se ve una fila. Los números son redondos, para ver la celda:

| Lectura | pH (H⁺) | CE | NO₃⁻ | PO₄ | SO₄²⁻ | K⁺ | Ca²⁺ | Mg²⁺ | Cl⁻ | Na⁺ | NH₄⁺ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Semana 1 | 6.2 | 2.2 | 620 ppm · 10.0 meq | 95 ppm · 1.0 meq | 96 ppm · 2.0 meq | 391 ppm · 10.0 meq | 200 ppm · 10.0 meq | 49 ppm · 4.0 meq | 71 ppm · 2.0 meq | 46 ppm · 2.0 meq | 36 ppm · 2.0 meq |

En la celda iónica, arriba va el ppm que tecleó y abajo el meq calculado. Solo se edita el ppm. pH y CE son un solo número. La celda vacía se queda vacía.

## Forma química del título

El desplegable está en el título de la columna, solo donde la pantalla del equipo cambia la molécula. Al cambiarlo, el meq de esa columna se recalcula con el peso de la forma elegida. El ppm tecleado no se convierte solo. La forma elegida se guarda con esa tabla.

| Columna | Arranca en | La otra opción | meq/L |
| --- | --- | --- | --- |
| Nitrato | NO₃⁻ | N | ppm ÷ 62,0 · ppm ÷ 14,0 |
| Fósforo | PO₄ | P | ppm ÷ 95 · ppm ÷ 31,0 |
| Sulfato | SO₄²⁻ | S | ppm ÷ 48,03 · ppm ÷ 16,03 |
| Amonio | NH₄⁺ | N | ppm ÷ 18,04 · ppm ÷ 14,0 |

Potasio, calcio, magnesio, sodio y cloro no llevan desplegable. El ion y el elemento son el mismo número.

| Ion | Peso equivalente | meq/L |
| --- | --- | --- |
| K⁺ | 39,1 | ppm ÷ 39,1 |
| Ca²⁺ | 20,04 | ppm ÷ 20,04 |
| Mg²⁺ | 12,15 | ppm ÷ 12,15 |
| Na⁺ | 22,99 | ppm ÷ 22,99 |
| Cl⁻ | 35,45 | ppm ÷ 35,45 |

pH (H⁺) tampoco lleva desplegable. Si la pantalla marca 4.0, la celda guarda 4.0. No hay ppm ni meq. Los milivoltios del electrodo no se anotan aquí: son la señal, no otra forma del pH. El buffer de pH 4 es solo para calibrar.

El fósforo arranca en PO₄ porque así lo muestra Hanna, que es quien lo mide en esta lista. 95 ppm de PO₄ son 31 ppm de P y 1,0 meq/L. Se divide entre 95 con carga 1: a pH de solución o de savia el fosfato va como H₂PO₄⁻. H₂PO₄⁻ no es una opción del título, porque ningún equipo de esta lista lo escribe así. Dividir el PO₄ entre 3, por el exponente de PO₄³⁻, triplicaría el meq.

## Equipos de referencia

Sirven para saber qué columnas se llenan y en qué forma llega el número. La herramienta no se amarra a una marca.

| Equipo | Mide | Cómo lo escribe | No mide |
| --- | --- | --- | --- |
| Imacimus 10 Agro (NT Sensors) | NO₃⁻, NH₄⁺, K⁺, Ca²⁺, Mg²⁺, Na⁺, Cl⁻, pH | mg/L o mmol/L. La CE la calcula con los siete iones; no trae celda de conductividad. | P y SO₄ |
| Hanna HI83325 | Nitrato, amonio, fosfato, K, Ca, Mg, SO₄, pH | Nitrato como N, con botón a NO₃⁻. Amonio como N. Fosfato como PO₄, con botón a P y a P₂O₅. Sulfato como SO₄²⁻. | Na y Cl. El potasio solo hasta 20 ppm: una savia de miles hay que diluirla. |
| Hanna HI713 y HI717 | Fosfato | PO₄. Hasta 2,50 ppm y hasta 30 ppm. | El resto |
| Hanna HI4113 | Nitrato | Ion NO₃⁻ | El resto |
| Horiba LAQUAtwin | NO₃⁻, K⁺, Ca²⁺, Na⁺. pH y CE en otros lápices. | Nitrato en NO₃⁻; se puede pasar a N. | P, Mg, NH₄, Cl y SO₄ |

Los miles de ppm de potasio de una savia caben en Imacimus o en Horiba. En el fotómetro Hanna, sin diluir, no.

Si Imacimus está en mmol/L, esta tabla no recibe mmol. El usuario anota mg/L. En un ion de carga 1, mmol y meq coinciden. En calcio y magnesio, el meq es el mmol por 2.

## Proporción en meq

La proporción entre iones se lee en meq, no en ppm. Cuenta solo con los iones que esa fila trae llenos.

- Cada catión, en % sobre la suma de cationes llenos. Se muestra si hay al menos dos.
- Cada anión, en % sobre la suma de aniones llenos. Se muestra si hay al menos dos.
- Con un solo ion del grupo, el 100 % no se muestra.

Si además hay una CE medida con otro aparato, se compara la suma de cationes con unos 10 meq/L por cada dS/m. La diferencia queda dicha como iones no medidos: bicarbonato, sulfato o fosfato, según el kit. No se presenta como balance cerrado.

La CE que calcula Imacimus ya sale de sus iones. No se usa como medición aparte para ese contraste.

## Gráfica

Una gráfica por columna, en el tiempo de esa columna. No van juntas para compararlas entre sí: cada una tiene su escala y no se mezclan.

El eje horizontal son las lecturas, en el orden de la tabla. Puede haber diez, quince, treinta o las que el usuario agregue. Con muchas, el eje muestra los títulos que quepan y se puede recorrer; los puntos están todos.

- Los iones van en meq/L. Su eje Y es solo esa escala.
- El pH va en su gráfica, en unidades de pH.
- La CE va en la suya, en dS/m.

El eje Y se dibuja en el mismo color de su línea, más tenue, para que se vea a qué curva pertenece. pH y CE usan dos colores distintos entre sí. No comparten gráfica con los iones: en un solo eje de meq, un potasio alto aplasta a un fósforo bajo, y pH o CE en otro eje de esa misma gráfica suma líneas de más.

Qué se dibuja en cada una:

- Una columna sin ningún número en toda la tabla no tiene gráfica. No sale, y no hay una nota que diga que falta.
- Una sola lectura es un punto marcado, sin línea.
- Dos o más lecturas seguidas son una línea entre esas lecturas.
- Si en medio falta una, ese punto no se ve y la línea no lo salta. No se une el anterior con el siguiente, y no se pone un cero. Ejemplo: magnesio leído en casi todas las filas, y una fila sin magnesio. Esa lectura no aparece; el tramo de antes y el de después quedan separados.

Con la tabla vacía no hay gráficas. La tabla sí se ve. En la computadora quedan a la derecha, una debajo de otra. En el teléfono, debajo de la tabla.

## Gratuita y Pro

Las dos se guardan solas, sin botón de guardar. Un año de lecturas semanales pesa decenas de kilobytes.

**Gratuita.** Una tabla, en ese navegador, igual que las otras calculadoras gratuitas (`localStorage`, clave `nutriplant_free_…`). No pide cuenta y no va a la nube. Si limpia el navegador, cambia de teléfono o abre la computadora, esa tabla no viaja.

**Pro.** En el dashboard, con la cuenta abierta, hay una lista de sus tablas. Desde cualquier proyecto entra y ve las que ha guardado. Elige una y trabaja esa. Puede crear otra, cambiarle el título y borrar una. Cambiar de proyecto no las esconde. Borrar un proyecto no las borra. El predio, si quiere distinguirlo, va en el título: «Tomate malla 3 — savia». No hay un cupo: cuatro, cinco o las que necesite.

Al teclear, la lista se guarda sola. Primero queda en ese navegador. Al dejar de escribir un momento, se sube a la cuenta en la nube, en el perfil del usuario, igual que la biblioteca de curvas. No entra en el proyecto que esté abierto. Al abrir la herramienta en otro equipo, con la misma cuenta, baja esa lista. La gratuita no da este paso.

## Editar y eliminar

Editar es volver a escribir. El título de la fila, el ppm, el pH y la CE se cambian en la celda. El meq se recalcula. La forma del título (NO₃⁻ o N, PO₄ o P, y las demás) se cambia en el desplegable y también se recalcula. En Pro, el título de la tabla se cambia en la lista. Todo eso se guarda solo, igual que una lectura nueva.

Se puede eliminar una fila. Sale de la tabla, su punto sale de la gráfica y, en Pro, deja de estar en la nube: en otro equipo ya no vuelve.

En Pro se puede eliminar una tabla completa. Pide confirmación, porque se lleva todas sus lecturas. Sale de la lista y de la cuenta. Las otras tablas siguen. Un PDF que ya se haya generado no se borra con ella: ese archivo ya quedó armado.

En la gratuita hay una sola tabla. Ahí se eliminan filas, o se vacía esa tabla del navegador. No hay una lista de tablas que borrar.

## PDF y admin

En el listado para armar el PDF, la sección nueva va al final, después de Extracción por etapa. Es una casilla más: si se marca, entra; si no, el PDF sale sin ella.

Como puede haber varias tablas, en esa casilla se elige cuál: «Savia semanal», «Solución tanque A». Al PDF baja la tabla, con ppm y meq, y debajo una gráfica por cada columna que tenga lecturas, igual que en pantalla.

En admin se ve la lista de tablas de esa cuenta.

## Fuera de esta versión

- Semáforo dentro de cada celda de la tabla. La referencia va debajo, y el punto solo en la fila que se está viendo.
- Cerrar la CE con un balance completo de aniones y cationes.
- Recibir la lectura en mmol/L.
- Guardar milivoltios del pH.
- Poner H₂PO₄⁻ como forma tecleable.
- Atajos que oculten columnas según la marca del equipo.

## Seguimos en este archivo

La pantalla, el guardado local y el guardado en la cuenta ya están en `seguimiento-ionometro-free.html`. Falta la casilla del PDF y la lista en admin. La nube pide la columna `ionometro_seguimientos` (`supabase-profiles-ionometro.sql`).
