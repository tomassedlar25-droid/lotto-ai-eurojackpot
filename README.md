# LOTTO AI – Eurojackpot Lab (PWA 2.0)

**Statistický experiment, nikoli předpověď s garantovanou výhodou.** Aplikace neobsahuje systém pro sázení ani platební funkce.

## Nové funkce verze 2.0

- **Ensemble** – kombinuje trendy 5/75, antitrend a historickou četnost. Váhy se odhadují z posledních 24 předchozích tahů; každý validační krok používá pouze starší výsledky. Není to neuronová síť.
- **Vlastní filtry** – vyřazení posledního tahu, ruční vyřazení čísel 1–50, filtr krajních čísel posledních 12 tahů, pevná dvojice euročísel nebo výběr podle četnosti. Omezení počtu sloupců a překryvů.
- **Walk-forward** – test jednotlivé metody s porovnáním proti náhodnému výběru, vyhodnocení výherních tříd, graf kumulativních zásahů. Srovnání čtyř metod na stejných minulých tazích. Pokud si vybereš nejlepší model až podle těchto dat, jde o dodatečný výběr, který zkresluje budoucí odhady.
- **Aktualizace historie při otevření** – volitelná automatická kontrola komunitního archivu. Vyžaduje internet a dostupnost zdroje; nejde o zaručené oficiální živé napojení. Ručně importovaná data mají při konfliktu přednost před externími údaji.
- **Evidence tiketů** – vygenerovaný tiket lze výslovně uložit, poté se automaticky vyhodnotí při načtení prvního následujícího losování, včetně výherní třídy a exportu CSV. Nezapočítává výši výhry ani náklady.

## Aktualizace stávajícího GitHub Pages

Repozitář: <https://github.com/tomassedlar25-droid/lotto-ai-eurojackpot>

1. Rozbal aktualizační ZIP `LOTTO_AI_2_0_GitHub_UPDATE.zip`.
2. Na GitHubu zvol `Add file > Upload files` a nahraj soubory **přímo do kořene repozitáře** (stejně jako původní `index.html`).
3. Nahraď soubory: `index.html`, `styles.css`, `app.js`, `core.mjs`, `manifest.webmanifest`, `service-worker.js` a `README.md`.
4. **Nemaž ani nenahrazuj** `data/eurojackpot.csv`, adresář `data`, obrázky `icon-192.png` a `icon-512.png`. Aktualizační ZIP je úmyslně neobsahuje.
5. `Commit changes` na větvi `main`. Po nasazení otevři GitHub Pages v Chrome a stránku načti znovu; služba service worker obvykle aktualizaci převezme během následujícího otevření, případně stránku obnov dvakrát.
6. Ověř nápis `LAB 2.0` a kartu **Moje tikety**.

URL: <https://tomassedlar25-droid.github.io/lotto-ai-eurojackpot/>

## Zachování dat

Stávající historie z `localStorage` zůstává pod původním klíčem `lotto-ai-eurojackpot-history-v1`. Nové uložené tikety používají nový klíč `lotto-ai-eurojackpot-tickets-v2`. *Nemaž data webu / Chrome ani znovu neinstaluj aplikaci bez exportu archivů.*

## Omezení, bezpečnost a reprodukovatelnost

- Všechna losování Eurojackpotu jsou nezávislá; heuristický model **nemá prokázanou predikční výhodu** proti čistě náhodnému výběru.
- Vlastní filtry zadané zpětně mohou způsobit selection bias. Výsledky testů nejsou prognózou výher.
- Zkušební data ve zdrojové vývojové složce pokrývají 128 tahů. V živém repozitáři uživatele je delší archiv, který není aktualizačním ZIPem nahrazen.
- PWA běží bez vlastního serveru a uchovává tikety v místním prohlížeči. Ztráta dat aplikace odstraní lokální historii tiketů. Používej export.
- Přesnost externího komunitního archivu si před sázením ověř u provozovatele loterie.

## Kontrolní testy

`node tests-v2.mjs` v kompletní vývojové složce (data jsou v `data/eurojackpot.csv`).
