'use strict';
// Powtarzalny benchmark liczników operacji; bez zależności zewnętrznych.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../js/core.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const P = context.window.Practice;
// Niezależny wzorzec: nie wywołuje produkcyjnego Practice.compare.
function referenceCompare(a, b) {
  for (const field of ['date', 'start', 'id']) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  return 0;
}
function generate(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `R-${String(i).padStart(4, '0')}`,
    date: new Date(Date.UTC(2024, 0, i + 1)).toISOString().slice(0, 10),
    start: '09:00', end: '10:00', break: 0,
    description: `Czynność ${i}`
  }));
}
const lines = [
  '# Powtarzalne porównanie algorytmów — ASD1-M2-07', '',
  '**Autor projektu:** Daniel Zawisza', '',
  'Raport wygenerowany przez `node tests/benchmark.js --write`. Wyniki pochodzą z faktycznie wykonanych pętli produkcyjnego `js/core.js`, nie z pomiaru czasu ani oszacowania.', '',
  `Środowisko wykonania: Node.js ${process.version}. SHA-256 badanego core.js: \`${crypto.createHash('sha256').update(source).digest('hex')}\`.`, '',
  '## Metoda', '',
  'Dane są generowane deterministycznie: kolejne daty UTC od 01.01.2024, godziny 09:00–10:00, zerowa przerwa i unikalne ID. Nie korzystamy z losowania. Dla każdego n badamy porządek rosnący i odwrotny. Wzorzec używa standardowego sortowania z własnym porównaniem pól date/start/id, bez wywoływania komparatora aplikacji. Dane benchmarku mają ASCII ID, więc nie zależą od porządku znaków języka naturalnego.', '',
  'Licznik sortowania oznacza wywołania porównania całego klucza (nie pojedynczych pól ani sprawdzeń j ≥ 0). Licznik wyszukiwania oznacza liczbę obejrzanych rekordów. Przed każdym uruchomieniem licznik jest zerowany. Asercje sprawdzają wynik oraz licznik; dodatkowo potwierdzają brak zmiany danych wejściowych.', '',
  '## Sortowanie przez wstawianie', '',
  '| n | Układ | Porównania zmierzone | Oczekiwane | Zgodność ze wzorcem |',
  '| ---: | --- | ---: | ---: | --- |'
];
for (const n of [10, 100, 1000]) {
  const ordered = generate(n);
  for (const [label, input, expectedCount] of [
    ['uporządkowany', ordered, n - 1],
    ['odwrócony', ordered.slice().reverse(), n * (n - 1) / 2]
  ]) {
    const before = JSON.stringify(input);
    const expected = input.slice().sort(referenceCompare);
    const counter = { comparisons: 0 };
    const actual = P.insertionSort(input, counter);
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
    assert.equal(counter.comparisons, expectedCount);
    assert.equal(JSON.stringify(input), before);
    lines.push(`| ${n} | ${label} | ${counter.comparisons} | ${expectedCount} | PASS |`);
  }
}
const tied = [
  { id: 'C', date: '2026-11-02', start: '09:00' },
  { id: 'D', date: '2026-11-03', start: '08:00' },
  { id: 'B', date: '2026-11-02', start: '10:00' },
  { id: 'A', date: '2026-11-02', start: '09:00' }
];
assert.equal(JSON.stringify(tied.slice().sort(referenceCompare).map(x => x.id)), JSON.stringify(['A', 'C', 'B', 'D']));
assert.equal(JSON.stringify(P.insertionSort(tied).map(x => x.id)), JSON.stringify(['A', 'C', 'B', 'D']));
lines.push('', 'Dodatkowy przypadek remisów: wejście C, D, B, A → wynik A, C, B, D (PASS). Remis daty rozstrzyga start, a remis daty i startu — ID. A i C mają datę 02.11.2026 i start 09:00; B tę samą datę i 10:00; D datę 03.11.2026 i 08:00.', '',
  'Dla rosnącego wejścia każdy klucz jest porównany raz: n − 1. Dla odwrotnego wejścia klucz przesuwa się przez cały uporządkowany prefiks: 1 + 2 + … + (n − 1) = n(n − 1)/2. Czas wynosi odpowiednio O(n) i O(n²). Funkcja tworzy kopię przez slice(): łączna dodatkowa pamięć wynosi O(n); sam etap wstawiania w tej kopii używa O(1) dodatkowej pamięci.', '',
  '## Wyszukiwanie liniowe — wszystkie dopasowania', '',
  '| n | Położenie jedynego trafienia | Sprawdzone rekordy | Liczba wyników | Wynik asercji |',
  '| ---: | --- | ---: | ---: | --- |');
for (const n of [10, 100, 1000]) {
  for (const [label, position] of [['początek', 0], ['koniec', n - 1], ['brak', -1]]) {
    const input = generate(n);
    if (position >= 0) input[position].description = 'Unikalny SZUKANY opis';
    const before = JSON.stringify(input);
    const counter = { checked: 0 };
    const actual = P.linearSearch(input, 'szukany', counter);
    const expectedIds = position >= 0 ? [input[position].id] : [];
    assert.equal(JSON.stringify(actual.map(x => x.id)), JSON.stringify(expectedIds));
    assert.equal(counter.checked, n);
    assert.equal(JSON.stringify(input), before);
    lines.push(`| ${n} | ${label} | ${counter.checked} | ${actual.length} | PASS |`);
  }
}
const multiple = generate(10);
multiple[0].description = multiple[9].description = 'Trafienie';
const counter = { checked: 0 };
assert.equal(JSON.stringify(P.linearSearch(multiple, 'trafienie', counter).map(x => x.id)), JSON.stringify(['R-0000', 'R-0009']));
assert.equal(counter.checked, 10);
lines.push('', 'Dodatkowy przypadek wielu trafień: rekordy pierwszy i ostatni są zwracane razem; licznik = 10 (PASS).', '',
  'Funkcja zwraca wszystkie dopasowania, dlatego zawsze odwiedza n rekordów — nawet gdy pierwsze trafienie jest na początku. Dla opisów o ograniczonej długości koszt jest O(n), a pamięć wyniku O(k) dla k trafień. Koszt operacji tekstowych zależy także od długości opisów i zapytania; same liczniki rekordów nie mierzą tej pracy.', '',
  '## Zakres weryfikacji i odtworzenie', '',
  'Wszystkie asercje przeszły: 6 układów sortowania, 1 przypadek remisów, 9 scenariuszy wyszukiwania i 1 przypadek wielu trafień. Raport nie potwierdza poprawności interfejsu, importu, zapisu lokalnego ani publikacji. Osobne testy aplikacji uruchamia polecenie `node tests/tests.js`.', '',
  '```sh', 'node tests/benchmark.js', 'node tests/benchmark.js --write', '```', '',
  'Pierwsze polecenie wyświetla raport bez zapisu; drugie aktualizuje ten plik. Po zmianie algorytmów ponownie uruchom benchmark. Raport przygotowano z pomocą OpenClaw; nie przypisuje on studentowi niepotwierdzonego zakresu samodzielnej pracy.', '');
const report = lines.join('\n');
if (process.argv.includes('--write')) {
  const destination = path.join(__dirname, '../docs/BENCHMARK.md');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, report);
  console.log('PASS: 6 sortowań, 1 remis, 9 wyszukiwań, 1 wiele trafień. Zapisano docs/BENCHMARK.md.');
} else {
  process.stdout.write(report);
}
