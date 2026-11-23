# ASD1-M2-07 — Dziennik praktyk studenckich

**Autor:** Daniel Zawisza · **rok akademicki:** 2026/2027

## Uruchomienie

Aplikacja jest statyczna i nie wymaga bibliotek ani serwera. Otwórz `index.html` w aktualnej przeglądarce. Dane zapisują się w `localStorage` tej przeglądarki; każda osoba odwiedzająca stronę ma swój niezależny zapis. Eksport JSON służy do kopii i przenoszenia danych.

```sh
npm test
npm run benchmark
```

`npm test` uruchamia wymagane testy logiki oraz regresje UI w lekkim, lokalnym harnessie DOM (bez zależności zewnętrznych). `npm run benchmark` odtwarza deterministyczne porównanie algorytmów; `node tests/benchmark.js --write` aktualizuje raport [docs/BENCHMARK.md](docs/BENCHMARK.md).

## Funkcje i format danych

Aplikacja pozwala dodawać, edytować i usuwać wpisy, wyszukiwać po opisie, filtrować daty, liczyć minuty po odjęciu przerw, sumy dzienne, postęp i czas pozostały. Nakładające się wpisy tego samego dnia są odrzucane; stykające się są dozwolone. Import JSON jest w całości walidowany przed potwierdzeniem i zastąpieniem danych. Obsługiwany format ma `version: 1`, obiekt `practice` (`name`, dodatnie całkowite `required`) i tablicę `entries` (`id`, `date`, `start`, `end`, całkowita `break`, `description`). Limit wynosi 1000 wpisów. Przykładowy plik: [dane-demo.json](dane-demo.json).

Trzy przyciski w aplikacji ładują scenariusze typowy, graniczny i większy; osobny przycisk ładuje wymagany przykład kontrolny. Aplikacja jest pomocniczym dziennikiem, nie stanowi formalnego zatwierdzenia praktyk.

## Algorytmy

Własne funkcje w `js/core.js`: wyszukiwanie liniowe zwracające wszystkie dopasowania, sortowanie przez wstawianie po dacie/początku/ID, liniowe sumowanie minut, sumy dzienne i kontrola konfliktów przedziałów. UI pokazuje rzeczywiste liczniki porównań kluczy i sprawdzonych rekordów. Opis oraz powtarzalne wyniki dla 10/100/1000 elementów zawiera [raport benchmarków](docs/BENCHMARK.md).

## Materiały i źródła

Logo Filii UwB w Wilnie zapisano lokalnie w `assets/logo-uwb.png`. Jest osadzone w prezentacji PPTX/PDF oraz na stronie tytułowej dokumentacji i wyświetlany w aplikacji, także bez internetu. Pierwszy slajd nie zawiera opisu źródła ani komunikatów technicznych. Źródło i sposób pozyskania oryginalnego znaku: [assets/LOGO_SOURCE.md](assets/LOGO_SOURCE.md).


Prezentacja PPTX, jej wersja PDF i PDF dokumentacji są odrębnymi plikami w `presentation/` i `docs/`. Dokumentacja ma 10 stron, prezentacja 10 slajdów. Oba materiały zawierają własny zrzut działającej aplikacji. Pełne zrzuty i widok mobilny: `presentation/assets/`. Opis materiałów: [docs/DELIVERABLES.md](docs/DELIVERABLES.md).

## Testy i AI

Testy obejmują osiem wymaganych grup oraz przypadki graniczne (ID, daty/godziny, stykanie, edycja i limit), a także regresje UI dla starego szkicu edycji, niepoprawnych ustawień/importu, usuwania edytowanego wpisu. Benchmark porównuje sortowanie z niezależnym wzorcem; liczniki mierzą wykonane pętle. Przegląd i poprawki z pomocą Codex objęły typy danych przy imporcie, bezpieczny zakres wymaganych minut, klawiaturę, pustą listę, układ mobilny, rzeczywiste zrzuty, opis komparatora i testy przeglądarkowe. Wyniki: [docs/POPRAWKI.md](docs/POPRAWKI.md). Wersję bazową przygotowano z pomocą OpenClaw: generowanie i porządkowanie kodu, testów oraz materiałów; student powinien zapoznać się z kodem, zweryfikować wyniki i umieć zmienić regułę lub dane podczas obrony.

## Publikacja

- [Otwórz aplikację na GitHub Pages](https://rgfdrf.github.io/ASD1-M2-07/)
- [Repozytorium projektu](https://github.com/RGFDRF/ASD1-M2-07)
- [Krótka pomoc do obrony](docs/OBRONA.md)

Przy oddaniu wpisz adres repozytorium w polu „Linki” Dziennika i podaj SHA końcowego commitu. Dane demonstracyjne są fikcyjne, a własne wpisy zostają w przeglądarce.

## Dodatkowe testy przeglądarkowe

Główne `npm test` działa bez instalowania pakietów. Dodatkowe `npm run test:browser` wymaga Playwright i Chrome. Po przygotowaniu Playwright ustaw `CHROME_PATH` na plik wykonywalny Chrome, jeżeli nie używasz standardowej ścieżki macOS. Test uruchamia oddzielną przeglądarkę, sprawdza 12 zachowań (w tym brak uszkodzonych obrazów i żądań do zewnętrznego serwera logo) i zapisuje raport oraz zrzuty. Nie używa danych z osobistego profilu przeglądarki.

## Budowanie PDF i slajdów

Gotowe materiały są dołączone. Ich ponowne wygenerowanie wymaga Python 3.12+ z pip, bibliotek z `python3 docs/build_dependencies.py` i fontów DejaVu. Na systemie bez `/usr/share/fonts/truetype/dejavu` ustaw `ASD_FONT_DIR` na folder z `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf` i `DejaVuSansMono.ttf`. Następnie uruchom `python3 docs/generate_deliverables.py`, `python3 docs/export_slides_pdf.py` oraz `python3 docs/verify_layout.py`. Skrypt budowania dobiera zależności do systemu; aplikacja nie wymaga Pythona.
