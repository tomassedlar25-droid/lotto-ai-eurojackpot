/* EUROJACKPOT AI 3.1 — freeze a six-agent ticket portfolio in local pending-ticket storage.
 * No external network calls, no bet placement and no fabricated winning results. */
import {euroPoolAt} from './core.mjs';

const equalTickets = (a, b) => Array.isArray(a) && Array.isArray(b) &&
  JSON.stringify(a) === JSON.stringify(b);

export function makeAgentSavedSet({draws, config, tickets, existing = [], asOf, createdAt}) {
  if (!Array.isArray(draws) || !draws.length) throw Error('Chybí archiv losování.');
  const lastDate = draws.at(-1)?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDate ?? '')) throw Error('Chybí datum posledního losování.');
  if (asOf !== lastDate) throw Error('Archiv se změnil. Spusť kontrolu šesti agentů znovu.');
  if (!config || typeof config.strategy !== 'string' || !config.strategy) throw Error('Chybí strategie.');
  if (!Array.isArray(tickets) || tickets.length !== Number(config.count) || !tickets.length) throw Error('Nesouhlasí počet sloupců.');
  if (!Array.isArray(existing)) throw Error('Neplatná evidence uložených tiketů.');
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) throw Error('Chybí čas uložení.');

  const allowedEuro = euroPoolAt(lastDate);
  const validate = (xs, limit, amount) => Array.isArray(xs) && xs.length === amount &&
    xs.every(n => Number.isInteger(n) && n >= 1 && n <= limit) && new Set(xs).size === amount;
  const frozen = tickets.map(t => {
    if (!validate(t?.main, 50, 5) || !validate(t?.euro, allowedEuro, 2)) throw Error('Neplatný sloupec Eurojackpot.');
    return {main: [...t.main].sort((a,b) => a-b), euro: [...t.euro].sort((a,b) => a-b)};
  });
  if (new Set(frozen.map(t => JSON.stringify(t))).size !== frozen.length) throw Error('Duplicitní sloupce.');
  const duplicate = existing.find(s => s.source === 'six-agents' && s.strategy === config.strategy && s.asOf === asOf && equalTickets(s.tickets, frozen));
  if (duplicate) return {duplicate: true, record: duplicate};

  const id = 'agents-' + createdAt.replace(/\D/g, '') + '-' + String(existing.length);
  return {duplicate: false, record: {
    id, createdAt, asOf, strategy: config.strategy, source: 'six-agents',
    settings: {...config, manualExclude: [...(config.manualExclude || [])], fixedEuro: [...(config.fixedEuro || [])]},
    tickets: frozen
  }};
}
