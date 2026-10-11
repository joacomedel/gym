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
