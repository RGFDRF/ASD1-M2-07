'use strict';

// Lightweight DOM harness for critical state transitions in app.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Practice = require('../js/core.js');

class Element {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.children = [];
    this.listeners = Object.create(null);
    this.hidden = false;
    this.disabled = false;
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatch(type) { this.listeners[type]?.({ target: this }); }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  focus() {}
  reset() {
    for (const id of ['id', 'date', 'start', 'end', 'description']) elements[id].value = '';
    elements.break.value = '';
  }
  click() { this.onclick?.({ target: this }); }
}

const ids = [
  'practice','required','done','left','progress','bar','sortCounter','searchCounter','search','from','to',
  'entries','days','report','entryForm','editId','id','date','start','end','break','description','cancel',
  'formTitle','message','example','typical','boundary','demo','export','import','downloadReport'
];
const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
elements.practice.value = 'Praktyka zawodowa';
elements.required.value = '600';
elements.break.value = '0';
const stored = new Map();
const document = {
  getElementById: id => elements[id],
  createElement: tag => new Element(tag)
};
const confirm = () => true;
const context = {
  Practice, document, confirm,
  localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  },
  setTimeout: () => 0,
  Blob: class Blob {}
};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/app.js'), 'utf8'), context);
elements.example.click();
assert.equal(elements.done.textContent, '465 min (7 h 45 min)');
assert.equal(elements.left.textContent, '135 min');

// Replacing a dataset while an edit is open must discard that stale draft.
const rowFor = id => elements.entries.children.find(row => row.children[0].textContent.startsWith(`ID ${id} ·`));
const buttonsFor = id => rowFor(id).children.filter(child => child.tagName === 'button' || ['Edytuj', 'Usuń'].includes(child.textContent));
let row = rowFor('A');
row.children[2].click();
elements.description.value = 'Nieaktualny szkic edycji';
elements.example.click();
assert.equal(elements.editId.value, '', 'ładowanie scenariusza resetuje aktywną edycję');
assert.equal(rowFor('A').children[1].textContent, 'Przygotowanie dokumentacji praktyk');

// Invalid settings never affect the committed totals and are restored on change.
elements.required.value = '-10';
elements.required.dispatch('input');
assert.equal(elements.left.textContent, '135 min');
elements.required.dispatch('change');
assert.equal(elements.required.value, '600');
assert.equal(elements.progress.textContent, '77,5%');
elements.required.value = '800';
elements.required.dispatch('input');
assert.equal(elements.left.textContent, '335 min', 'poprawny wymagany czas od razu przelicza podgląd');
elements.required.dispatch('change');
assert.equal(JSON.parse(stored.get('asd1m207')).practice.required, 800, 'poprawne ustawienie zostaje zapisane');
elements.required.value = '600';
elements.required.dispatch('change');

// A malformed JSON numeric type is rejected before confirmation or state change.
let confirms = 0;
context.confirm = () => { confirms++; return true; };
elements.import.onchange({ target: {
  files: [{ text: async () => JSON.stringify({ version: 1, practice: { name: 'Praktyka', required: true }, entries: [] }) }]
}}).then(() => {
  assert.equal(confirms, 0, 'wadliwy import nie pyta o zastąpienie danych');
  assert.equal(elements.done.textContent, '465 min (7 h 45 min)');
  assert.match(elements.message.textContent, /Import odrzucony/);

  // Editing and deleting the edited record must not leave a stale form draft.
  assert.deepEqual(rowFor('A').children.map(child => child.textContent), [
    'ID A · 2026-11-02 · 09:00–12:00 · przerwa 15 min · zaliczone 165 min',
    'Przygotowanie dokumentacji praktyk', 'Edytuj', 'Usuń'
  ]);
  rowFor('A').children[2].click();
  rowFor('A').children[3].click();
  assert.equal(elements.editId.value, '', `editId after delete; status: ${elements.message.textContent}`);
  assert.equal(elements.entries.children.length, 2);
  console.log('PASS: UI state regressions — stale edit, valid/invalid settings, invalid import, edited deletion.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
