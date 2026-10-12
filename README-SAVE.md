# EUROJACKPOT AI 3.1 — ukládání šesti agentů

Toto rozšíření přidává tlačítko **Uložit do čekajících tiketů** k technicky schválené sestavě šesti agentů. Ukládá do stejného lokálního úložiště jako původní Generátor a zobrazuje ji v záložce **Moje tikety** pod názvem „✦ 6 agentů · [strategie]“. Po importu dalšího losování se sestava automaticky porovná se skutečným výsledkem. Žádná sázka se neodesílá.

## Jak nainstalovat

1. Na GitHub nahraj ZIP `eurojackpot-ai-3.1-save.zip` do kořene repozitáře stejným způsobem jako předchozí aktualizaci.
2. V Codespaces terminálu (kořen `lotto-ai-eurojackpot`) spusť postupně:

```bash
git pull --ff-only
unzip -o eurojackpot-ai-3.1-save.zip
node install-save-v31.mjs
node tests.mjs && node agent-audit.test.mjs && node agent-save.test.mjs
git add app.js agent-team.mjs agent-save.mjs agent-save.test.mjs index.html service-worker.js install-save-v31.mjs README-SAVE.md
git commit -m "EUROJACKPOT AI 3.1 - Save agent tickets"
git push origin main
```

3. Restartuj mobilní aplikaci po aktualizaci GitHub Pages; nová verze má cache `v3.1.0`.
4. V záložce **6 agentů** spusť kontrolu své strategie a klikni na tlačítko **Uložit do čekajících tiketů** pod šesti sloupci. Zobrazí se **Moje tikety**.

## Důležité

- Před uložením musí Risk Manager schválit sestavu `APPROVE FOR GENERATION ONLY`.
- Sestava se uloží jako kopie, další losování ji nemůže samo přepočítat.
- Pokud se archiv změnil mezi generováním a kliknutím na uložit, je nutné test spustit znovu.
- Opětovné uložení stejné sestavy téže strategie a dne se nerozmnoží do duplicity.
- Uložené tikety jsou jen v místním úložišti dané aplikace/prohlížeče a mohou zmizet vymazáním dat aplikace. Pro bezpečnou evidenci použij export z **Moje tikety**.
- Nejedná se o sázení a software neposkytuje záruku výhry.
