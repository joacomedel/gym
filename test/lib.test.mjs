import { test } from 'node:test';
import assert from 'node:assert/strict';
import GymLib from '../lib.js';

test('toNum acepta coma, punto y miles es-AR', () => {
  assert.equal(GymLib.toNum('80'), 80);
  assert.equal(GymLib.toNum('80,5'), 80.5);
  assert.equal(GymLib.toNum('1.200,50'), 1200.5);
  assert.equal(GymLib.toNum('1200.50'), 1200.5);
  assert.equal(GymLib.toNum('$ 1.200'), 1200);
  assert.equal(GymLib.toNum('abc'), null);
  assert.equal(GymLib.toNum(''), null);
  assert.equal(GymLib.toNum(80), 80);
});

test('parseCreado parsea ISO local del motor', () => {
  const d = GymLib.parseCreado('2026-10-11T20:35:00');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 11);
  assert.equal(d.getHours(), 20);
  assert.equal(GymLib.parseCreado('x'), null);
  assert.equal(GymLib.parseCreado(''), null);
});

test('newSesionId genera ids únicos no vacíos', () => {
  const a = GymLib.newSesionId();
  const b = GymLib.newSesionId();
  assert.ok(a && typeof a === 'string');
  assert.notEqual(a, b);
});

test('distinctCategorias deduce, recorta y ordena', () => {
  const ej = [{ categoria: 'Pierna' }, { categoria: ' pecho ' }, { categoria: 'Pierna' }, { categoria: '' }, {}];
  assert.deepEqual(GymLib.distinctCategorias(ej), ['pecho', 'Pierna']);
});

test('agruparRutina junta superseries por letra y respeta orden', () => {
  const items = [
    { ejercicio: 'Sentadilla', grupo: '', orden: 2 },
    { ejercicio: 'Curl', grupo: 'A', orden: 0 },
    { ejercicio: 'Press', grupo: 'A', orden: 1 },
    { ejercicio: 'Plancha', grupo: '', orden: 3 },
  ];
  const g = GymLib.agruparRutina(items);
  assert.equal(g.length, 3);
  assert.equal(g[0].tipo, 'super');
  assert.deepEqual(g[0].items.map((i) => i.ejercicio), ['Curl', 'Press']);
  assert.equal(g[1].tipo, 'solo');
  assert.equal(g[1].items[0].ejercicio, 'Sentadilla');
  assert.equal(g[2].items[0].ejercicio, 'Plancha');
});

test('contarSeries: drops cuentan 1 junto a su primera', () => {
  const rows = [
    { kg: '80', reps: '8' },
    { kg: '80', reps: '8' },
    { kg: '60', reps: '10', dropset: 'sí' },
    { kg: '100', reps: '5' },
    { kg: '70', reps: '8', dropset: 'sí' },
    { kg: '50', reps: '10', dropset: 'sí' },
  ];
  assert.equal(GymLib.contarSeries(rows), 3);
});

test('contarSeries: drop huérfano al inicio cuenta 1', () => {
  assert.equal(GymLib.contarSeries([{ kg: '50', reps: '10', dropset: 'sí' }]), 1);
});

test('tonelaje suma kg×reps e ignora inválidos', () => {
  const rows = [{ kg: '80', reps: '8' }, { kg: '60,5', reps: '10' }, { kg: 'x', reps: '8' }, { kg: '80', reps: '' }];
  assert.equal(GymLib.tonelaje(rows), 1245);
});

test('epley calcula 1RM estimado', () => {
  assert.equal(GymLib.epley(100, 5), 116.7);
  assert.equal(GymLib.epley(100, 1), 100);
  assert.equal(GymLib.epley(100, 0), null);
  assert.equal(GymLib.epley('x', 5), null);
});

test('porSesion agrupa y fecha por creado mínimo', () => {
  const rows = [
    { sesion: 's1', rutina: 'A', kg: '80', reps: '8', creado: '2026-10-10T10:00:00' },
    { sesion: 's1', rutina: 'A', kg: '80', reps: '8', creado: '2026-10-10T10:05:00' },
    { sesion: 's2', rutina: 'B', kg: '60', reps: '10', creado: '2026-10-11T10:00:00' },
  ];
  const g = GymLib.porSesion(rows);
  assert.equal(g.length, 2);
  assert.equal(g[0].sesion, 's1');
  assert.equal(g[0].tonelaje, 1280);
  assert.equal(g[0].nSeries, 2);
  assert.equal(g[0].fecha, '10/10/2026');
});

test('parseDescanso valida con fallback', () => {
  assert.equal(GymLib.parseDescanso('90', 60), 90);
  assert.equal(GymLib.parseDescanso('x', 60), 60);
  assert.equal(GymLib.parseDescanso('0', 60), 60);
  assert.equal(GymLib.parseDescanso('-5', 60), 60);
  assert.equal(GymLib.parseDescanso('', 60), 60);
});

test('stepNum suma pasos con redondeo exacto', () => {
  assert.equal(GymLib.stepNum('70', 1, 2.5), 72.5);
  assert.equal(GymLib.stepNum('70', -1, 1), 69);
  assert.equal(GymLib.stepNum('', 1, 2.5), 2.5);
  assert.equal(GymLib.stepNum('12.5', 1, 2.5), 15);
  assert.equal(GymLib.stepNum('0', -1, 1), 0);
  assert.equal(GymLib.stepNum('70', -1, 2.5), 67.5);
});

test('linTrend ajusta recta por mínimos cuadrados', () => {
  const t = GymLib.linTrend([{ t: 0, valor: 0 }, { t: 1, valor: 2 }, { t: 2, valor: 4 }]);
  assert.ok(Math.abs(t.slope - 2) < 1e-9);
  assert.ok(Math.abs(t.intercept) < 1e-9);
  assert.equal(GymLib.linTrend([{ t: 0, valor: 5 }]), null);
});

test('filtrarRango recorta por ventana', () => {
  const ahora = new Date(2026, 9, 11).getTime();
  const d = (ymd) => new Date(ymd[0], ymd[1] - 1, ymd[2]).getTime();
  const pts = [
    { t: d([2026, 10, 1]), valor: 1 },
    { t: d([2026, 8, 1]), valor: 2 },
    { t: d([2026, 1, 1]), valor: 3 },
  ];
  assert.equal(GymLib.filtrarRango(pts, '1m', ahora).length, 1);
  assert.equal(GymLib.filtrarRango(pts, '3m', ahora).length, 2);
  assert.equal(GymLib.filtrarRango(pts, 'all', ahora).length, 3);
});

test('serieMaxKg y serieTonelaje agregan por sesión', () => {
  const rows = [
    { sesion: 's1', kg: '80', reps: '8', creado: '2026-10-10T10:00:00' },
    { sesion: 's1', kg: '70', reps: '10', creado: '2026-10-10T10:05:00' },
    { sesion: 's2', kg: '60', reps: '10', creado: '2026-10-11T10:00:00' },
  ];
  assert.deepEqual(GymLib.serieMaxKg(rows).map((p) => p.valor), [80, 60]);
  assert.deepEqual(GymLib.serieTonelaje(rows).map((p) => p.valor), [1340, 600]);
});

test('agruparPorRutina ordena por selección y conserva orden interno', () => {
  const items = [
    { rutina: 'Pull', ejercicio: 'B', orden: 1 },
    { rutina: 'Push', ejercicio: 'A', orden: 0 },
    { rutina: 'Push', ejercicio: 'C', orden: 2 },
  ];
  const g = GymLib.agruparPorRutina(items, ['Push', 'Pull']);
  assert.deepEqual(g.map((x) => x.rutina), ['Push', 'Pull']);
  assert.deepEqual(g[0].items.map((i) => i.ejercicio), ['A', 'C']);
});

test('agruparPorRutina manda al final lo no seleccionado', () => {
  const items = [{ rutina: 'X', ejercicio: 'A', orden: 0 }, { rutina: 'Y', ejercicio: 'B', orden: 0 }];
  const g = GymLib.agruparPorRutina(items, ['Y']);
  assert.deepEqual(g.map((x) => x.rutina), ['Y', 'X']);
});

test('splitRutinas une y separa etiquetas de sesión', () => {
  assert.deepEqual(GymLib.splitRutinas('Push + Pull'), ['Push', 'Pull']);
  assert.deepEqual(GymLib.splitRutinas('Push'), ['Push']);
  assert.equal(GymLib.joinRutinas(['Push', 'Pull']), 'Push + Pull');
});
