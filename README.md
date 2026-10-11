# Gym

App web (GitHub Pages) para entrenamiento estilo Fit Notes: configurás
ejercicios y rutinas, registrás series con timer de descanso y mirás tu
evolución. Corre sobre el backend reutilizable **`bds`**
(ver el repo `backend-bds`): los datos viven en Google Sheets
(dominios `ejercicios`, `rutinas`, `series`) y la app lee/escribe a través
de un Web App de Apps Script.

```
Navegador (esta página) ──bt-core.js──▶ MOTOR bds (/exec) ──▶ Sheets
```

## Secciones

- **Entrenar:** elegís la rutina del día, anotás kg×reps por serie
  (con marcas de superserie/dropset), timer de descanso por ejercicio,
  series editables/borrables.
- **Configurar:** categorías (salen de tus ejercicios), ejercicios con nota
  técnica, rutinas con descanso por ítem, grupos de superserie y dropsets.
- **Evolución:** por ejercicio, PR de peso, 1RM estimado (Epley),
  tonelaje, gráfico de progreso e historial con marcas S/D.

## Archivos

- `index.html`, `styles.css` — estructura + diseño "plotter"
- `app.js`, `view-*.js`, `ui.js` — vistas y arranque
- `lib.js`, `timer.js` — lógica pura (tests con `node --test`)
- `bt-core.js` — cliente común del backend (**no tocar**)
- `config.js` — sólo la URL del Web App (**no tocar**)

## Tests

```
node --test
```

## Publicar en GitHub Pages (repo nuevo)

1. Creá un repo nuevo en GitHub (ej. `gym`), subí estos archivos a `main`.
2. Settings → Pages → Source: `main` / `/ (root)`.
3. Queda en `https://joacomedel.github.io/gym/`.

No hay que tocar el motor ni sacar Nueva versión (los dominios ya existen y
el motor los descubre solo). La contraseña es la misma de tus otras apps
(mismo origen, se pide una sola vez por dispositivo).
