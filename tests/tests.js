'use strict';
const assert = require('node:assert/strict');
const P = require('../js/core.js');

const sample = [
  { id: 'A', date: '2026-11-02', start: '09:00', end: '12:00', break: 15, description: 'Dokumenty' },
  { id: 'B', date: '2026-11-02', start: '13:00', end: '15:00', break: 0, description: 'Wsparcie' },
  { id: 'C', date: '2026-11-03', start: '09:00', end: '12:00', break: 0, description: 'Testy' }
];
const practice = { name: 'Praktyka', required: 600 };
let groups = 0;

// 1. Dokładne wyniki przykładu kontrolnego.
assert.deepEqual(sample.map(e => P.minutes(e.end) - P.minutes(e.start) - e.break), [165, 120, 180]);
assert.equal(P.sumMinutes(sample), 465);
assert.deepEqual({ ...P.dailyTotals(sample) }, { '2026-11-02': 285, '2026-11-03': 180 });
assert.deepEqual(P.progress(465, 600), { remaining: 135, percent: 77.5 });
groups++;

// 2. Przerwa nie może przekroczyć długości wpisu ani być ułamkiem.
assert.throws(() => P.validate(practice, [], { ...sample[0], break: 181 }), /Przerwa/);
assert.throws(() => P.validate(practice, [], { ...sample[0], break: 1.5 }), /Przerwa/);
groups++;

// 3. Nakładanie odrzucane; stykające się przedziały są dozwolone.
const original = JSON.stringify([sample[0]]);
assert.throws(() => P.validate(practice, [sample[0]], { ...sample[0], id: 'X', start: '11:00' }), /nakłada/);
assert.equal(JSON.stringify([sample[0]]), original, 'odrzucona walidacja nie zmienia listy');
assert.doesNotThrow(() => P.validate(practice, [sample[0]], { ...sample[0], id: 'X', start: '12:00', end: '13:00' }));
const conflictCounter = { checked: 0 };
assert.equal(P.findConflict([sample[0]], { ...sample[0], id: 'X', start: '11:00' }, '', conflictCounter).id, 'A');
assert.equal(conflictCounter.checked, 1);
groups++;

// 4. Przekroczenie wymaganego czasu daje 100% i zero pozostałych minut.
assert.deepEqual(P.progress(645, 600), { remaining: 0, percent: 100 });
groups++;

// 5. Zmiana przerwy natychmiast zmienia sumę i sumę dzienną.
const changed = sample.map(e => e.id === 'A' ? { ...e, break: 30 } : e);
assert.equal(P.sumMinutes(changed), 450);
assert.equal(P.dailyTotals(changed)['2026-11-02'], 270);
groups++;

// 6. Pusta lista oraz liczniki rzeczywistych pętli.
const emptySumCounter = { checked: 0 };
const emptySearchCounter = { checked: 0 };
assert.equal(P.sumMinutes([], emptySumCounter), 0);
assert.deepEqual({ ...P.dailyTotals([]) }, {});
assert.deepEqual(P.linearSearch([], 'x', emptySearchCounter), []);
assert.deepEqual(emptySumCounter, { checked: 0 });
assert.deepEqual(emptySearchCounter, { checked: 0 });
groups++;

// 7. JSON eksport/import odtwarza dane i wyniki; zły import nie podmienia stanu.
const dataset = { version: 1, practice, entries: sample };
const packagedExample = P.validateDataset(require('../dane-demo.json'));
assert.equal(P.sumMinutes(packagedExample.entries), 465);
const imported = P.validateDataset(JSON.parse(JSON.stringify(dataset)));
assert.deepEqual(imported, dataset);
assert.equal(P.sumMinutes(imported.entries), 465);
let current = P.validateDataset(JSON.parse(JSON.stringify(dataset)));
const before = JSON.stringify(current);
const invalid = { version: 1, practice, entries: [sample[0], { ...sample[1], id: 'X', start: '11:00' }] };
assert.throws(() => { const candidate = P.validateDataset(invalid); current = candidate; }, /nakłada/);
assert.equal(JSON.stringify(current), before);
assert.throws(() => P.validateDataset({ version: 1, entries: [] }), /Podaj nazwę/);
assert.throws(() => P.validateDataset({ version: 1, practice: { name: 'Praktyka', required: true }, entries: [] }), /Wymagany czas/);
assert.throws(() => P.validateDataset({ version: 1, practice, entries: [{ ...sample[0], break: true }] }), /Przerwa/);
groups++;

// 8. Sortowanie sprawdzone względem niezależnego komparatora: rosnąco, odwrotnie, remisy.
function reference(a, b) {
  for (const field of ['date', 'start', 'id']) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  return 0;
}
const ordered = [
  { id: 'A', date: '2026-11-02', start: '09:00' },
  { id: 'B', date: '2026-11-02', start: '10:00' },
  { id: 'C', date: '2026-11-03', start: '09:00' }
];
const tied = [
  { id: 'C', date: '2026-11-02', start: '09:00' },
  { id: 'D', date: '2026-11-03', start: '08:00' },
  { id: 'B', date: '2026-11-02', start: '10:00' },
  { id: 'A', date: '2026-11-02', start: '09:00' }
];
for (const input of [ordered, ordered.slice().reverse(), tied]) {
  const beforeInput = JSON.stringify(input);
  const expected = input.slice().sort(reference).map(e => e.id);
  const counter = { comparisons: 0 };
  assert.deepEqual(P.insertionSort(input, counter).map(e => e.id), expected);
  assert.equal(JSON.stringify(input), beforeInput, 'sortowanie nie zmienia wejścia');
  if (input.length > 1) assert.ok(counter.comparisons > 0);
}
groups++;

// Dodatkowe przypadki graniczne: ID, niepoprawna data/godzina, edycja i limit.
assert.throws(() => P.validate(practice, [], { ...sample[0], id: '' }), /ID/);
assert.throws(() => P.validate(practice, [], { ...sample[0], id: 'zły' }), /ID/);
assert.throws(() => P.validate(practice, [], { ...sample[0], break: '' }), /Przerwa/);
assert.throws(() => P.validate(practice, [], { ...sample[0], date: '2026-02-31' }), /datę/);
assert.throws(() => P.validate(practice, [], { ...sample[0], start: '25:00' }), /godzinę/);
assert.throws(() => P.validate(practice, sample, { ...sample[0] }), /unikalne/);
assert.equal(P.validate(practice, sample, { ...sample[0], description: 'Poprawiony opis' }, 'A').id, 'A');
assert.throws(() => P.validate(practice, sample, { ...sample[0] }, 'missing'), /nie istnieje/);
assert.equal(P.minutes('23:59'), 1439);
assert.throws(() => P.minutes('24:00'), /godzina/);

// Limit: accept 1000 records, reject the 1001st, but allow editing at capacity.
const capacityEntries = Array.from({ length: P.LIMIT }, (_, i) => ({
  id: `L-${i}`,
  date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
  start: '09:00', end: '10:00', break: 0, description: `Wpis ${i}`
}));
assert.equal(P.validateDataset({ version: 1, practice, entries: capacityEntries }).entries.length, 1000);
assert.throws(() => P.validate(practice, capacityEntries, {
  id: 'EXTRA', date: '2030-01-01', start: '09:00', end: '10:00', break: 0, description: 'Ponad limit'
}), /limit 1000/);
assert.doesNotThrow(() => P.validate(practice, capacityEntries, {
  ...capacityEntries[0], description: 'Edycja przy pełnej liście'
}, capacityEntries[0].id));

console.log(`PASS: ${groups} grup wymaganych oraz dodatkowe przypadki graniczne.`);
