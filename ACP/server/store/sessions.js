import { v4 as uuidv4 } from 'uuid';

const sessions = new Map(); // csn_id -> record

export function createSession({ currency = 'usd', items = [] } = {}) {
  const id = 'csn_' + uuidv4().replace(/-/g, '').slice(0, 14);
  const now = new Date().toISOString();
  const rec = {
    id,
    status: 'not_ready_for_payment',
    currency,
    line_items: items.map((i) => ({ id: i.id, quantity: i.quantity || 1 })),
    totals: [{ type: 'subtotal', amount: 100 }],
    fulfillment_options: [],
    messages: [],
    links: [],
    created: now,
    updated: now,
  };
  sessions.set(id, rec);
  return rec;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function updateSession(id, partial) {
  const current = sessions.get(id);
  if (!current) return null;
  const updated = { ...current, ...partial, updated: new Date().toISOString() };
  sessions.set(id, updated);
  return updated;
}

