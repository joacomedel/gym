# Gym-web — Plan de implementación (ejecutado)

> Para agentes: este plan ya está implementado. Los tests viven en `test/`.

**Objetivo:** app estilo Fit Notes sobre el backend bds: configuración
(categorías, ejercicios, rutinas) + uso (sesión, series, timer) + evolución.

**Arquitectura:** página estática en GitHub Pages; solo habla con el motor bds
vía `bt-core.js`. 3 dominios = 3 Sheets ya creados en Drive.

**Tech stack:** HTML + CSS "plotter" + JS vanilla, `node --test`, sin dependencias.

## Dominios (ya creados en `bds/`)

- `ejercicios`: `id, creado, nombre, categoria, nota`
- `rutinas`: `id, creado, rutina, ejercicio, descanso_seg, grupo, orden, dropset`
- `series`: `id, creado, sesion, rutina, ejercicio, kg, reps, grupo, dropset`

## Rulings (decisiones fijadas con evidencia del motor)

- Fechado por `creado` (ISO local AR): `dataAppend_` ignora columnas que no
  existen en el Sheet (`Dominios.gs:324`), así que no hay dónde guardar otra
  fecha. Parseo manual en `lib.js`.
- Categorías derivadas (distinct); renombrar = N `update`, no hay cascada.
- Dropset: filas separadas que cuentan como 1 serie; el tonelaje suma todo.
- Descanso default en `localStorage` (`gym.cfg`), override por ítem de rutina.
- Timer con timestamp + `visibilitychange`: con el celu bloqueado el navegador
  puede suspender JS; se avisa al volver, no se promete exactitud nativa.
- Referencias por nombre (ejercicio/rutina): renombrar un ejercicio no
  re-apunta rutinas/series (deuda documentada en la UI al editar).

## Archivos

- `index.html`, `styles.css` — shell + look plotter
- `lib.js` — lógica pura (testeada) · `timer.js` — Countdown con reloj inyectable
- `ui.js` — esc, avisos, beep/vibración/notificación
- `view-config.js`, `view-train.js`, `view-evol.js`, `app.js` — vistas y arranque
- `config.js`, `bt-core.js` — copiados idénticos del backend, NO tocar
- `test/lib.test.mjs`, `test/timer.test.mjs` — 14 tests

## Progreso

- Task 1 scaffold: complete
- Task 2 categorías + ejercicios: complete
- Task 3 rutinas: complete
- Task 4 sesión + series: complete
- Task 5 timer: complete
- Task 6 evolución: complete
- Task 7 deploy: pendiente (repo nuevo en GitHub + Pages, lo hace el usuario)
