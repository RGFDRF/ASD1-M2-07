(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'asd1m207';
  let entries = [];
  let activePractice = { name: 'Praktyka zawodowa', required: 600 };
  let storageAvailable = true;
  let storageWarning = '';
  const numericField = id => $(id).value.trim() === '' ? '' : Number($(id).value);
  const practice = () => ({ name: $('practice').value, required: numericField('required') });
  function restorePracticeFields() {
    $('practice').value = activePractice.name;
    $('required').value = String(activePractice.required);
  }
  function announce(message) {
    $('message').textContent = [message, storageWarning].filter(Boolean).join(' ');
  }
  function persist(nextPractice = practice(), nextEntries = entries) {
    const normalized = Practice.validateDataset({ version: 1, practice: nextPractice, entries: nextEntries });
    if (storageAvailable) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); }
      catch {
        storageAvailable = false;
        storageWarning = 'Pamięć lokalna jest niedostępna — zmiany działają do zamknięcia karty; pobierz JSON.';
      }
    }
    return normalized;
  }
  function setDataset(nextPractice, nextEntries, message) {
    const normalized = persist(nextPractice, nextEntries);
    activePractice = normalized.practice;
    $('practice').value = normalized.practice.name;
    $('required').value = String(normalized.practice.required);
    entries = normalized.entries;
    resetForm();
    if (message) announce(message);
    render();
  }
  function duration(entry) { return Practice.minutes(entry.end) - Practice.minutes(entry.start) - entry.break; }
  function render() {
    let totalCounter = { checked: 0 };
    const total = Practice.sumMinutes(entries, totalCounter);
    let req = activePractice.required;
    try { req = Practice.validatePractice(practice()).required; } catch { /* Keep the last valid value visible while editing invalid input. */ }
    const stats = Practice.progress(total, req);
    $('done').textContent = `${total} min (${Math.floor(total / 60)} h ${total % 60} min)`;
    $('left').textContent = `${stats.remaining} min`;
    $('progress').textContent = `${stats.percent.toFixed(1).replace('.', ',')}%`;
    $('bar').value = stats.percent;

    const sortCounter = { comparisons: 0 };
    const ordered = Practice.insertionSort(entries, sortCounter);
    const searchCounter = { checked: 0 };
    const found = Practice.linearSearch(ordered, $('search').value, searchCounter);
    const shown = found.filter(e => (! $('from').value || e.date >= $('from').value) && (! $('to').value || e.date <= $('to').value));
    $('sortCounter').textContent = `${sortCounter.comparisons} porównań kluczy`;
    $('searchCounter').textContent = `${searchCounter.checked} sprawdzonych rekordów`;

    const entriesNode = $('entries');
    entriesNode.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement('p');
      empty.textContent = entries.length ? 'Brak wpisów pasujących do filtrów.' : 'Brak wpisów. Dodaj pierwszy wpis lub wczytaj przykład kontrolny.';
      entriesNode.append(empty);
    }
    for (const e of shown) {
      const row = document.createElement('article');
      row.className = 'entry';
      const detail = document.createElement('p');
      detail.textContent = `ID ${e.id} · ${e.date} · ${e.start}–${e.end} · przerwa ${e.break} min · zaliczone ${duration(e)} min`;
      const description = document.createElement('p');
      description.textContent = e.description;
      const edit = document.createElement('button');
      edit.textContent = 'Edytuj';
      edit.onclick = () => beginEdit(e);
      const remove = document.createElement('button');
      remove.textContent = 'Usuń';
      remove.onclick = () => {
        try {
          const next = entries.filter(x => x.id !== e.id);
          const normalized = persist(practice(), next);
          activePractice = normalized.practice;
          entries = next;
          if ($('editId').value === e.id) resetForm();
          announce('Usunięto wpis.');
          render();
        } catch (error) { announce(`Nie udało się zapisać zmiany: ${error.message}`); }
      };
      row.append(detail, description, edit, remove);
      entriesNode.append(row);
    }
    const daily = Practice.dailyTotals(ordered);
    $('days').textContent = Object.entries(daily).map(([date, mins]) => `${date}: ${mins} min (${Math.floor(mins / 60)} h ${mins % 60} min)`).join(' · ') || 'Brak wpisów';
    $('report').textContent = ordered.map(e => `${e.date} · ${e.start}–${e.end} · ${e.id} · przerwa ${e.break} min · ${duration(e)} min · ${e.description}`).join('\n') || 'Raport jest pusty.';
  }
  function resetForm() {
    $('entryForm').reset();
    $('break').value = 0;
    $('editId').value = '';
    $('id').disabled = false;
    $('cancel').hidden = true;
    $('formTitle').textContent = 'Dodaj wpis';
  }
  function beginEdit(entry) {
    for (const key of ['id', 'date', 'start', 'end', 'break', 'description']) $(key).value = entry[key];
    $('editId').value = entry.id;
    $('formTitle').textContent = `Edytuj wpis ${entry.id}`;
    $('id').disabled = true;
    $('cancel').hidden = false;
    $('date').focus();
  }
  $('entryForm').onsubmit = event => {
    event.preventDefault();
    try {
      const oldId = $('editId').value;
      const breakValue = $('break').value.trim() === '' ? '' : Number($('break').value);
      const candidate = Practice.validate(practice(), entries, {
        id: $('id').value, date: $('date').value, start: $('start').value, end: $('end').value,
        break: breakValue, description: $('description').value
      }, oldId);
      const next = oldId ? entries.map(entry => entry.id === oldId ? candidate : entry) : [...entries, candidate];
      const normalized = persist(practice(), next);
      activePractice = normalized.practice;
      entries = next;
      resetForm();
      announce('Zapisano wpis.');
      render();
    } catch (error) { announce(error.message); }
  };
  $('cancel').onclick = resetForm;
  function loadDemo(name, required, rows) {
    if (entries.length && !confirm('Zastąpić bieżące dane wybranym scenariuszem?')) return;
    try { setDataset({ name, required }, rows, `Wczytano scenariusz: ${name}.`); }
    catch (error) { announce(`Nie udało się wczytać scenariusza: ${error.message}`); }
  }
  $('example').onclick = () => loadDemo('Praktyka zawodowa — przykład kontrolny', 600, [
    ['A', '2026-11-02', '09:00', '12:00', 15, 'Przygotowanie dokumentacji praktyk'],
    ['B', '2026-11-02', '13:00', '15:00', 0, 'Wsparcie zespołu'],
    ['C', '2026-11-03', '09:00', '12:00', 0, 'Testowanie aplikacji']
  ].map(([id, date, start, end, pause, description]) => ({ id, date, start, end, break: pause, description })));
  $('typical').onclick = () => loadDemo('Scenariusz typowy', 480, [
    ['P-01', '2026-11-04', '08:30', '12:00', 15, 'Zapoznanie z dokumentacją i procedurami'],
    ['P-02', '2026-11-04', '12:30', '15:00', 0, 'Wprowadzanie danych do systemu'],
    ['P-03', '2026-11-05', '09:00', '13:00', 20, 'Kontrola poprawności i raportowanie']
  ].map(([id, date, start, end, pause, description]) => ({ id, date, start, end, break: pause, description })));
  $('boundary').onclick = () => loadDemo('Scenariusz graniczny', 60, [
    { id: 'G-01', date: '2026-11-06', start: '09:00', end: '10:00', break: 0, description: 'Przedział bazowy; następny wpis styka się z jego końcem' },
    { id: 'G-02', date: '2026-11-06', start: '10:00', end: '11:00', break: 60, description: 'Przerwa równa długości wpisu; nie dolicza minut' }
  ]);
  $('demo').onclick = () => loadDemo('Scenariusz większy (100 wpisów)', 6000, Array.from({ length: 100 }, (_, i) => ({
    id: `R-${String(i).padStart(3, '0')}`,
    date: `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`,
    start: '09:00', end: '10:00', break: 0, description: `Czynność demonstracyjna numer ${i + 1}`
  })));
  $('export').onclick = () => {
    try {
      const data = { version: 1, practice: Practice.validatePractice(practice()), entries: Practice.insertionSort(entries) };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'dziennik-praktyk.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    } catch (error) { announce(error.message); }
  };
  $('import').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const validated = Practice.validateDataset(JSON.parse(await file.text()));
      if (confirm(`Plik poprawny (${validated.entries.length} wpisów). Zastąpić bieżące dane?`)) {
        setDataset(validated.practice, validated.entries, 'Zaimportowano dane.');
      }
    } catch (error) { announce(`Import odrzucony — bieżące dane pozostały bez zmian: ${error.message}`); }
    finally { event.target.value = ''; }
  };
  for (const id of ['search', 'from', 'to', 'required']) $(id).addEventListener('input', render);
  function commitPractice() {
    try {
      const normalized = persist(practice(), entries);
      activePractice = normalized.practice;
      restorePracticeFields();
      announce('Zapisano ustawienia praktyki.');
    } catch (error) {
      restorePracticeFields();
      announce(error.message);
    }
    render();
  }
  $('practice').addEventListener('change', commitPractice);
  $('required').addEventListener('change', commitPractice);
  $('downloadReport').onclick = () => {
    const blob = new Blob([Practice.insertionSort(entries).map(e => `${e.date}\t${e.start}–${e.end}\t${e.id}\tprzerwa ${e.break} min\t${duration(e)} min\t${e.description}`).join('\n')], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'raport-praktyk.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = Practice.validateDataset(JSON.parse(raw));
      $('practice').value = saved.practice.name;
      $('required').value = String(saved.practice.required);
      activePractice = saved.practice;
      entries = saved.entries;
    }
  } catch (error) {
    storageAvailable = false;
    storageWarning = 'Pamięć lokalna jest niedostępna lub zawiera błędne dane; załaduj albo wyeksportuj JSON.';
    announce(`Bieżąca karta pozostaje pusta. ${error.message}`);
  }
  render();
})();
