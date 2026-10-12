# EUROJACKPOT AI 3.0 — šest analytických modulů

**Rozšíření existujícího repozitáře** `tomassedlar25-droid/lotto-ai-eurojackpot`. Nepřepisuje historii ani uložené tikety.

### Co přidává

- Novou mobilní záložku **6 agentů** vedle již fungujících sekcí PWA.
- Researcher: popisná statistika archivu (četnosti, období, sousední opakování).
- Data Analyst: formální validace datumů a dobových číselných rozsahů.
- Strategist: převzetí nastavení dosavadního generátoru včetně EJP ZERO.
- Coder/Backtest: využití existujícího `backtestAsync` a porovnání se stejným počtem náhodných tiketů; bez použití budoucích dat.
- Risk Manager: REJECT / REVISE / APPROVE FOR GENERATION ONLY.
- Boss: konečný stav, šest auditních handoff bloků, export TXT a podmíněně zobrazené kombinace.

**Důležité:** Jsou to transparentní deterministické výpočetní moduly, nikoli šest skutečně samostatných jazykových AI modelů. Nezískávají aktuální výsledky samy; používají archiv a funkce stávající aplikace. Žádné sázky nejsou podávány. Historická úspěšnost nijak nezaručuje budoucí výsledky.

### Instalace do současného projektu

1. V GitHubu otevři repozitář `tomassedlar25-droid/lotto-ai-eurojackpot` v Codespaces nebo jej lokálně naklonuj.
2. Rozbal tento ZIP **do kořene repozitáře**, aby `agent-team.mjs` ležel vedle `app.js`.
3. Spusť `node upgrade-v3.mjs` (idempotentní — lze spustit opakovaně).
4. Ověř `node tests.mjs` a `node agent-audit.test.mjs`.
5. Zkontroluj `git diff`, potom proveď `git add . && git commit -m "feat: Eurojackpot six-agent audit" && git push`.
6. Po aktualizaci GitHub Pages otevři PWA v mobilu a spusť záložku **6 agentů**. Při staré verzi zavři a znovu otevři PWA; nový service worker používá cache v3.

**Podmínky schválení:** platná historie, aspoň 30 walk-forward testovaných tahů, platné kombinace, žádné porušení maximálního překryvu, náhodný benchmark a uživatelem provedené potvrzení ověření zdroje. Nejde o potvrzení prediktivní výhody.

### Známá omezení

- Archiv je externí a historická data nebyla nezávisle ověřena; checkbox neprokazuje autenticitu.
- Rozsah backtestu závisí na počtu dostupných losování; prvních 75 slouží jako tréninková historie.
- Ladění strategie na stejném období způsobuje výběrové zkreslení.
- Bez výplatních CSV nelze doložit finanční bilanci (původní modul takové údaje nevymýšlí).
- Aplikace je instalovatelná PWA, ne nativní APK; ke konverzi by byla potřeba samostatná Android obálka a distribuce.
