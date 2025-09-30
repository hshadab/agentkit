import { v4 as uuidv4 } from 'uuid';

// In-memory vault for vt_ tokens
const tokens = new Map(); // vt_id -> record

export function createVaultToken(record) {
  const id = 'vt_' + uuidv4().replace(/-/g, '').slice(0, 14);
  const created = new Date().toISOString();
  tokens.set(id, { id, created, ...record });
  return { id, created };
}

export function getVaultToken(id) {
  return tokens.get(id) || null;
}

export function putVaultToken(id, update) {
  const existing = tokens.get(id);
  if (!existing) return null;
  const merged = { ...existing, ...update };
  tokens.set(id, merged);
  return merged;
}

