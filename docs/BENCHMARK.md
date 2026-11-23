# Powtarzalne porównanie algorytmów — ASD1-M2-07

**Autor projektu:** Daniel Zawisza

Raport wygenerowany przez `node tests/benchmark.js --write`. Wyniki pochodzą z faktycznie wykonanych pętli produkcyjnego `js/core.js`, nie z pomiaru czasu ani oszacowania.

Środowisko wykonania: Node.js v20.20.2. SHA-256 badanego core.js: `e34291a12718f2c2dfebc07062e8568fe3b2da4bd162fe8732c295b5a9ef2ede`.

## Metoda

Dane są generowane deterministycznie: kolejne daty UTC od 01.01.2024, godziny 09:00–10:00, zerowa przerwa i unikalne ID. Nie korzystamy z losowania. Dla każdego n badamy porządek rosnący i odwrotny. Wzorzec używa standardowego sortowania z własnym porównaniem pól date/start/id, bez wywoływania komparatora aplikacji. Dane benchmarku mają ASCII ID, więc nie zależą od porządku znaków języka naturalnego.

Licznik sortowania oznacza wywołania porównania całego klucza (nie pojedynczych pól ani sprawdzeń j ≥ 0). Licznik wyszukiwania oznacza liczbę obejrzanych rekordów. Przed każdym uruchomieniem licznik jest zerowany. Asercje sprawdzają wynik oraz licznik; dodatkowo potwierdzają brak zmiany danych wejściowych.

## Sortowanie przez wstawianie

| n | Układ | Porównania zmierzone | Oczekiwane | Zgodność ze wzorcem |
| ---: | --- | ---: | ---: | --- |
| 10 | uporządkowany | 9 | 9 | PASS |
| 10 | odwrócony | 45 | 45 | PASS |
| 100 | uporządkowany | 99 | 99 | PASS |
| 100 | odwrócony | 4950 | 4950 | PASS |
| 1000 | uporządkowany | 999 | 999 | PASS |
| 1000 | odwrócony | 499500 | 499500 | PASS |

Dodatkowy przypadek remisów: wejście C, D, B, A → wynik A, C, B, D (PASS). Remis daty rozstrzyga start, a remis daty i startu — ID. A i C mają datę 02.11.2026 i start 09:00; B tę samą datę i 10:00; D datę 03.11.2026 i 08:00.

Dla rosnącego wejścia każdy klucz jest porównany raz: n − 1. Dla odwrotnego wejścia klucz przesuwa się przez cały uporządkowany prefiks: 1 + 2 + … + (n − 1) = n(n − 1)/2. Czas wynosi odpowiednio O(n) i O(n²). Funkcja tworzy kopię przez slice(): łączna dodatkowa pamięć wynosi O(n); sam etap wstawiania w tej kopii używa O(1) dodatkowej pamięci.

## Wyszukiwanie liniowe — wszystkie dopasowania

| n | Położenie jedynego trafienia | Sprawdzone rekordy | Liczba wyników | Wynik asercji |
| ---: | --- | ---: | ---: | --- |
| 10 | początek | 10 | 1 | PASS |
| 10 | koniec | 10 | 1 | PASS |
| 10 | brak | 10 | 0 | PASS |
| 100 | początek | 100 | 1 | PASS |
| 100 | koniec | 100 | 1 | PASS |
| 100 | brak | 100 | 0 | PASS |
| 1000 | początek | 1000 | 1 | PASS |
| 1000 | koniec | 1000 | 1 | PASS |
| 1000 | brak | 1000 | 0 | PASS |

Dodatkowy przypadek wielu trafień: rekordy pierwszy i ostatni są zwracane razem; licznik = 10 (PASS).

Funkcja zwraca wszystkie dopasowania, dlatego zawsze odwiedza n rekordów — nawet gdy pierwsze trafienie jest na początku. Dla opisów o ograniczonej długości koszt jest O(n), a pamięć wyniku O(k) dla k trafień. Koszt operacji tekstowych zależy także od długości opisów i zapytania; same liczniki rekordów nie mierzą tej pracy.

## Zakres weryfikacji i odtworzenie

Wszystkie asercje przeszły: 6 układów sortowania, 1 przypadek remisów, 9 scenariuszy wyszukiwania i 1 przypadek wielu trafień. Raport nie potwierdza poprawności interfejsu, importu, zapisu lokalnego ani publikacji. Osobne testy aplikacji uruchamia polecenie `node tests/tests.js`.

```sh
node tests/benchmark.js
node tests/benchmark.js --write
```

Pierwsze polecenie wyświetla raport bez zapisu; drugie aktualizuje ten plik. Po zmianie algorytmów ponownie uruchom benchmark. Raport przygotowano z pomocą OpenClaw; nie przypisuje on studentowi niepotwierdzonego zakresu samodzielnej pracy.
