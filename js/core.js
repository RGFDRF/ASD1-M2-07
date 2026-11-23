(() => {
  'use strict';
  const LIMIT = 1000;
  const minutes = time => {
    if (typeof time !== 'string') throw Error('Niepoprawna godzina.');
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match || +match[1] > 23 || +match[2] > 59) throw Error('Niepoprawna godzina.');
    return +match[1] * 60 + +match[2];
  };
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  function compare(a, b) {
    for (const field of ['date', 'start', 'id']) {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
    }
    return 0;
  }
  function insertionSort(data, counter = { comparisons: 0 }) {
    const result = data.slice();
    for (let i = 1; i < result.length; i++) {
      const key = result[i];
      let j = i - 1;
      while (j >= 0) {
        counter.comparisons++;
        if (compare(result[j], key) <= 0) break;
        result[j + 1] = result[j];
        j--;
      }
      result[j + 1] = key;
    }
    return result;
  }
  function linearSearch(data, term, counter = { checked: 0 }) {
    const needle = String(term ?? '').toLocaleLowerCase('pl');
    const matches = [];
    for (const entry of data) {
      counter.checked++;
      if (String(entry.description).toLocaleLowerCase('pl').includes(needle)) matches.push(entry);
    }
    return matches;
  }
  function sumMinutes(data, counter = { checked: 0 }) {
    let total = 0;
    for (const entry of data) {
      counter.checked++;
      total += minutes(entry.end) - minutes(entry.start) - entry.break;
    }
    return total;
  }
  function findConflict(data, candidate, skipId = '', counter = { checked: 0 }) {
    const start = minutes(candidate.start);
    const end = minutes(candidate.end);
    for (const entry of data) {
      counter.checked++;
      if (entry.id === skipId || entry.date !== candidate.date) continue;
      if (start < minutes(entry.end) && end > minutes(entry.start)) return entry;
    }
    return null;
  }
  function dailyTotals(data) {
    const totals = Object.create(null);
    for (const entry of data) totals[entry.date] = (totals[entry.date] || 0) + minutes(entry.end) - minutes(entry.start) - entry.break;
    return totals;
  }
  function validatePractice(practice) {
    if (!practice || typeof practice.name !== 'string' || !practice.name.trim()) throw Error('Podaj nazwę praktyki.');
    if (practice.name.trim().length > 120) throw Error('Nazwa praktyki może mieć najwyżej 120 znaków.');
    if (typeof practice.required !== 'number' || !Number.isSafeInteger(practice.required) || practice.required <= 0) throw Error('Wymagany czas musi być dodatnią, bezpieczną liczbą całkowitą minut (do 9007199254740991).');
    return { name: practice.name.trim(), required: practice.required };
  }
  function validate(practice, entries, candidate, editing = '') {
    validatePractice(practice);
    if (!Array.isArray(entries)) throw Error('Niepoprawna lista wpisów.');
    if (entries.length >= LIMIT && !editing) throw Error('Osiągnięto limit 1000 wpisów.');
    if (editing && !entries.some(entry => entry.id === editing)) throw Error('Edytowany wpis nie istnieje.');
    if (!candidate || typeof candidate !== 'object') throw Error('Niepoprawny wpis.');
    if (typeof candidate.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(candidate.id)) throw Error('ID jest wymagane (1–80 liter, cyfr lub łączników).');
    if (editing && candidate.id !== editing) throw Error('ID wpisu jest niezmienne.');
    if (entries.some(entry => entry.id === candidate.id && entry.id !== editing)) throw Error('ID musi być unikalne.');
    if (!validDate(candidate.date)) throw Error('Podaj poprawną datę.');
    let start, end;
    try { start = minutes(candidate.start); end = minutes(candidate.end); }
    catch { throw Error('Podaj poprawną godzinę początku i końca.'); }
    const length = end - start;
    if (length <= 0) throw Error('Koniec musi być późniejszy od początku tego samego dnia.');
    const pause = candidate.break;
    if (typeof pause !== 'number' || !Number.isInteger(pause) || pause < 0 || pause > length) throw Error('Przerwa musi być całkowitą liczbą minut od 0 do długości wpisu.');
    if (typeof candidate.description !== 'string' || !candidate.description.trim()) throw Error('Opis czynności nie może być pusty.');
    if (candidate.description.length > 2000) throw Error('Opis może mieć najwyżej 2000 znaków.');
    const conflict = findConflict(entries, candidate, editing);
    if (conflict) throw Error(`Wpis nakłada się na ${conflict.id}.`);
    return { id: candidate.id, date: candidate.date, start: candidate.start, end: candidate.end, break: pause, description: candidate.description.trim() };
  }
  function validateDataset(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > LIMIT) throw Error('Nieobsługiwany lub niepoprawny format.');
    const practice = validatePractice(data.practice);
    const seen = new Set();
    const entries = [];
    for (const candidate of data.entries) {
      if (!candidate || typeof candidate.id !== 'string' || seen.has(candidate.id)) throw Error('ID musi być niepuste i unikalne.');
      seen.add(candidate.id);
      entries.push(validate(practice, entries, candidate));
    }
    return { version: 1, practice, entries };
  }
  function progress(total, required) {
    const done = Math.max(0, Number(total) || 0);
    const target = Number(required) || 0;
    return { remaining: Math.max(0, target - done), percent: target > 0 ? Math.min(100, Math.round(done / target * 1000) / 10) : 0 };
  }
  const api = { LIMIT, minutes, validDate, compare, insertionSort, linearSearch, sumMinutes, dailyTotals, findConflict, validatePractice, validate, validateDataset, progress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Practice = api;
})();
