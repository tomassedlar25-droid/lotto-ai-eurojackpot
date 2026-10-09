# LOTTO AI – Eurojackpot Lab (PWA 1.0)

Mobilní webová aplikace pro Android (i počítač) v češtině. Nevyžaduje účet, API klíč ani serverové výpočty. Jde o statistický experiment, **ne o spolehlivou předpověď loterie**.

## Instalace na Android

PWA se dá instalovat pouze z webové adresy na **HTTPS** (případně při vývoji z `localhost`). Samotné otevření ZIP nebo souboru `index.html` nedokáže aplikaci plnohodnotně nainstalovat, protože service worker vyžaduje bezpečný původ.

1. Rozbal ZIP soubor `LOTTO_AI_Eurojackpot_PWA.zip`.
2. Nahraj **obsah složky** `lotto-ai-pwa` včetně podsložek `data/` a `icons/` na libovolný statický HTTPS hosting (např. GitHub Pages nebo Netlify). `index.html` musí být v kořenovém adresáři zveřejněné stránky.
3. V telefonu otevři zveřejněnou HTTPS adresu v prohlížeči Chrome.
4. V nabídce **⋮** vyber **Instalovat aplikaci** (nebo **Přidat na plochu**, podle verze prohlížeče).
5. Po prvním načtení jsou základní soubory dostupné offline; výsledky zůstávají v prohlížeči v lokálním úložišti.

### Rychlá ukázka ještě před nasazením

Samostatný soubor `LOTTO_AI_nahled.html` funguje po otevření v kompatibilním prohlížeči i bez hostingu. Obsahuje data a všechny výpočty, ale **není instalovatelná PWA** a offline aktualizace výsledků vyžaduje internet. Někteří správci souborů pro Android nemusí spouštět JavaScript v HTML náhledu; v takovém případě otevři soubor přímo v prohlížeči nebo použij HTTPS hosting.

## Obsah

- `index.html`, `styles.css`, `app.js` — mobilní uživatelské rozhraní.
- `core.mjs` — kontrola importu, historické statistiky, generátor a walk-forward backtest.
- `data/eurojackpot.csv` — **128 skutečných losování** (18. 7. 2025 – 6. 10. 2026) pro okamžitý offline start. Kompletní dostupná historie od roku 2012 se automaticky pokusí stáhnout při připojení k internetu.
- `manifest.webmanifest`, `service-worker.js`, `icons/` — PWA instalace a základní offline režim.
- `tests.mjs` — kontrolní testy spustitelné příkazem `node tests.mjs`.

## Historie a aktualizace

Veřejný CSV archiv: https://github.com/dev-baris/lottery-archive (`eu/eurojackpot/results.csv`).

Aplikace se při startu automaticky pokusí načíst aktuální veřejný CSV soubor, který následně uloží lokálně. Tlačítko **Stáhnout aktualizace** dovoluje opakovaný pokus. Aktuálnost není zaručena: zdroj spravuje komunita, může mít výpadek a nové losování se může objevit se zpožděním. Před nákupem tiketu ověř výsledky oficiálně.

Ruční import podporuje následující formáty:

```csv
date,n1,n2,n3,n4,n5,e1,e2
2026-10-06,7,12,19,28,50,1,6
```

nebo

```csv
datum;z1;z2;z3;z4;z5;eurozahlen;wochentag;jahr
06.10.2026;7;12;19;28;50;1-6;Úterý;2026
```

Podporován je také export historie a manuální přidání výsledku. Duplicitní datum se aktualizuje novou hodnotou.

## Modely

- **Trend Z 5/75** – srovnání normalizované odchylky četnosti v posledních 5 a 75 tazích.
- **Antitrend Z 5/75** – obrácené pořadí trendové metriky.
- **Četnost 75** – preferuje výskyty v posledních 75 losováních.
- **Náhodná metoda** – náhodně vážené výběry.
- **Filtr EJP ZERO** (volitelný): vyřadí nejmenší a největší z pěti seřazených hlavních čísel v každém z posledních 12 tahů.
- Omezení počtu hlavních kandidátů a maximálního překryvu hlavních čísel mezi sloupci; pokud limit nelze splnit, zobrazí varování.
- Euročísla ve strategických sloupcích: dvě nejčastější nepřekrývající se dvojice z posledních 15 tahů (pokud není zvolena náhodná metoda).

**Backtest:** Chronologicky se pro každé testované losování vygeneruje portfolio POUZE na základě všech dříve známých výsledků. Nejprve lze trénovat na min. 75 losováních. Testy se omezují na éru současných pravidel od 25. 3. 2022. Porovnává se stejně velké náhodné portfolio (bez filtru). Zobrazeny jsou výherní třídy (nikoli finanční zisk), počty tiketů s alespoň třemi hlavními zásahy a podíl losování s výherní třídou.

Historická četnost nepředstavuje predikční výhodu: Eurojackpot je navržen jako náhodné losování a minulé tahy nemají předvídat další.

## Vývojářská kontrola

Lokální spuštění:

```bash
python -m http.server 8000
```

V prohlížeči otevři `http://localhost:8000`.

Testy:

```bash
node tests.mjs
```

## Bezpečnost a limity

Žádné platby, sázení, cookies třetích stran ani sledovací skripty. Při aktualizaci dat se aplikace připojuje na `raw.githubusercontent.com`; jinak funguje lokálně. Používej pouze ve věku 18+. Ztráty při hazardní hře jsou možné; modely negarantují žádný zisk. PWA není APK, není publikována v Google Play a tento balíček zatím nemá veřejnou URL.
