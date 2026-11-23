# Krótka pomoc do obrony

1. Otwórz aplikację i kliknij „Przykład kontrolny”. Pokaż 465 min wykonanych, 135 min pozostałych i 77,5% postępu.
2. Wyjaśnij wpis A. 09:00 to 540 min od północy, a 12:00 to 720 min. Po odjęciu 15 min przerwy zostaje 165 min.
3. Zmień przerwę we wpisie A na 30 min. Czas całkowity spadnie do 450 min, czas pozostały wzrośnie do 150 min, a postęp spadnie do 75,0%. Pokaż komunikat przy próbie dodania wpisu nakładającego się na A.
4. Pokaż chronologię na wejściu C, A, B. Sortowanie przez wstawianie bierze A i przesuwa C w prawo, otrzymując A, C, B. Następnie wstawia B przed C. Klucz porównania to data, start i ID.
5. Wyszukiwanie liniowe sprawdza wszystkie opisy, bo zwraca wszystkie dopasowania. Przy 100 rekordach skanuje 100 pozycji niezależnie od miejsca trafienia.
6. W `js/core.js` znajdują się algorytmy, walidacja, sumowanie i wykrywanie konfliktów. `js/app.js` obsługuje formularz, zapis w przeglądarce oraz import i eksport JSON.

W zapisie HH.MM część po kropce oznacza minuty w systemie sześćdziesiątkowym. Jedna godzina i 45 minut plus 30 minut to 105 + 30 = 135 minut, czyli 2 godziny i 15 minut. Zwykłe dodawanie `1.45 + 0.30` dałoby `1.75`, a 75 minut nie mieści się w polu minut.
