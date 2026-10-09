# LOTTO AI – Eurojackpot Lab 2.1 (PWA)

Statistická analytická PWA pro Android. Nejde o spolehlivou předpověď ani systém pro přijetí sázek.

## Co je nového oproti 2.0

- **Moje tikety:** rozbal každou uloženou sestavu klepnutím na řádek. Uvidíš vylosovaných 5+2 čísel, všech šest nebo jiný počet uložených sloupců, zásahy hlavních i euročísel, barvou označená trefená čísla a případnou výherní třídu. Čekající sestavy nejsou započteny mezi neúspěšné.
- **Forward evidence:** počty vyhodnocených a čekajících sestav, výherních tříd a zásahů 3+ hlavních čísel. Evidenci lze stáhnout jako CSV s jednotlivými zásahy.
- **Walk-forward:** lze zvolit 25, 50, 100, 200, 500, 750 nebo až 1000 losování, pokud jich historie obsahuje dostatek. Test výhradně s dříve známými čísly. Historické rozsahy euročísel 8 / 10 / 12 podle data.
- **Náhodné benchmarky:** po backtestu tlačítko „1 000 náhodných benchmarků“ ukáže medián, 5.–95. percentil a podíl simulací s minimálně stejně dobrým výsledkem. Tento retrospektivní test není důkaz budoucí výhody.
- **Finanční evidence:** volitelná cena za jeden sloupec, vypočtené celkové náklady, import skutečných historických výplat podle data a třídy. Aplikace **nevymýšlí výše výher**. Pokud některá výherní třída nemá doloženou výplatu, zisk ani ztrátu nevyhodnotí.
- **Porovnání čtyř modelů:** zobrazuje i upozornění na riziko zpětného výběru nejlepšího modelu.

## Aktualizace existujícího GitHub Pages

Nahraj všech 7 souborů ZIP **přímo do kořenové složky** existujícího repozitáře `tomassedlar25-droid/lotto-ai-eurojackpot`:

`index.html`, `app.js`, `core.mjs`, `styles.css`, `service-worker.js`, `manifest.webmanifest`, `README.md`.

Nemaž `data/eurojackpot.csv`, `icon-192.png` ani `icon-512.png`. Nezakládej novou složku. Na GitHubu soubory nahraj se stejnými názvy a potvrď Commit changes. GitHub Pages je již nastavené na větev `main`, složku `/(root)`.

Po nasazení znovu otevři https://tomassedlar25-droid.github.io/lotto-ai-eurojackpot/ v Chrome. Service worker má novou verzi `v2.1.0`, po dokončení aktualizace může být třeba stránku znovu otevřít.

**Přetrvání dat:** key `lotto-ai-eurojackpot-history-v1` a `lotto-ai-eurojackpot-tickets-v2` se nemění. Staré uložené sestavy jsou kompatibilní. Data jsou lokálně v prohlížeči; před mazáním dat Chrome exportuj historii a evidenci tiketů.

## Vzorek CSV pro výplaty

```csv
date;tier;amount
2026-10-06;9;123.50
2026-10-06;12;50.00
```

**Uvedené částky jsou smyšlené a slouží pouze jako vzor formátu**; pro skutečnou bilanci musíš importovat skutečné výhry pro odpovídající datum a třídu. Historické výherní částky jsou proměnlivé. Zadanou cenu za sloupec neber jako oficiální ceník.

## Kontrola a bezpečnost

Aplikace neposílá tikety ani historie na server. Pro načítání komunitního archivu používá GitHub a vždy má také ruční import CSV. Simulace Monte Carlo předpokládá rovnoměrnou náhodnost. Nezaručuje ani nedokazuje predikční výhodu. Ručně zvolené filtry a výběr vítězné strategie zpětně jsou náchylné k přeučení.
