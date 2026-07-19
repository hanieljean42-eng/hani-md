/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║   🗄️  HANI-MD - PERSISTANCE DES FICHIERS JSON (Firebase)   ║
 * ╠═══════════════════════════════════════════════════════════╣
 * ║ Le disque de Render est éphémère : tous les *.json de       ║
 * ║ DataBase/ (paiements, codes, abonnés, premium, économie…)   ║
 * ║ sont perdus à chaque redémarrage. Ce module sauvegarde      ║
 * ║ chaque fichier comme un "setting" dans la Realtime Database ║
 * ║ et le restaure au démarrage. Si Firebase n'est pas          ║
 * ║ connecté, tout continue de fonctionner sur disque (no-op).  ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 *  - restoreAll()      : recharge les fichiers depuis Firebase (au boot)
 *  - backupAll()       : sauvegarde les fichiers modifiés vers Firebase
 *  - backupFile(file)  : sauvegarde immédiate d'un fichier (write-through)
 *  - startAutoBackup() : sauvegarde périodique + au shutdown (SIGTERM/SIGINT)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db'); // proxy Firebase-first (Firebase → MySQL → null)

const DB_DIR = __dirname;
const INDEX_KEY = 'hani_jsonstore_index';

// Compat avec les clés déjà utilisées par DataBase/premium.js
// (pour ne pas dupliquer/diverger des données déjà sauvegardées).
const LEGACY_KEYS = {
  'premium_users.json': 'hani_premium_users',
  'premium_codes.json': 'hani_premium_codes',
  'transactions.json': 'hani_transactions',
  'pending_validations.json': 'hani_pending_validations',
  'subscribers.json': 'hani_subscribers',
};

// Fichiers à NE PAS persister : gros caches volatils (messages supprimés,
// vue unique). Ils gonflent vite et n'ont aucune valeur après un restart.
const EXCLUDE = new Set([
  'deleted_messages.json',
  'viewonce_cache.json',
  'package.json',
  'package-lock.json',
]);

const _hashes = Object.create(null); // base -> hash du dernier contenu sync
let _started = false;
let _timer = null;
let _flushing = false;

const _hash = (s) => crypto.createHash('sha1').update(s).digest('hex');

function settingKey(base) {
  return LEGACY_KEYS[base] || ('jsonfile_' + base.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_]/g, '_'));
}

function _connected() {
  try { return db && typeof db.isConnected === 'function' && db.isConnected(); }
  catch (e) { return false; }
}

function listDataFiles() {
  try {
    return fs.readdirSync(DB_DIR).filter(f => f.toLowerCase().endsWith('.json') && !EXCLUDE.has(f));
  } catch (e) { return []; }
}

// ── Restauration au démarrage : Firebase → disque ──
async function restoreAll() {
  if (!_connected()) return { ok: false, restored: 0 };
  let restored = 0;

  // Liste des fichiers connus côté Firebase + fichiers legacy (premium.js)
  let bases = [];
  try {
    const idxRaw = await db.getSetting(INDEX_KEY);
    if (idxRaw) bases = JSON.parse(idxRaw);
  } catch (e) { bases = []; }
  if (!Array.isArray(bases)) bases = [];
  for (const b of Object.keys(LEGACY_KEYS)) if (!bases.includes(b)) bases.push(b);

  for (const base of bases) {
    if (EXCLUDE.has(base)) continue;
    try {
      const val = await db.getSetting(settingKey(base));
      if (val == null) continue;
      let parsed;
      try { parsed = JSON.parse(val); } catch (e) { continue; } // valeur corrompue → ignorer
      fs.writeFileSync(path.join(DB_DIR, base), JSON.stringify(parsed, null, 2), 'utf8');
      _hashes[base] = _hash(JSON.stringify(parsed));
      restored++;
    } catch (e) { /* fichier suivant */ }
  }
  console.log(`[JSONSTORE] ♻️ ${restored} fichier(s) restauré(s) depuis Firebase`);
  return { ok: true, restored };
}

// ── Sauvegarde d'un seul fichier (write-through) ──
async function backupFile(fileOrBase) {
  if (!_connected()) return false;
  const base = path.basename(fileOrBase);
  if (EXCLUDE.has(base)) return false;
  try {
    const content = fs.readFileSync(path.join(DB_DIR, base), 'utf8');
    const normalized = JSON.stringify(JSON.parse(content)); // valide + compact
    const h = _hash(normalized);
    if (_hashes[base] === h) return true; // inchangé
    const ok = await db.setSetting(settingKey(base), normalized);
    if (ok) {
      _hashes[base] = h;
      await _addToIndex(base);
    }
    return !!ok;
  } catch (e) { return false; }
}

// ── Sauvegarde de tous les fichiers modifiés : disque → Firebase ──
async function backupAll() {
  if (!_connected()) return { ok: false, backed: 0 };
  const files = listDataFiles();
  let backed = 0;
  for (const base of files) {
    try {
      const content = fs.readFileSync(path.join(DB_DIR, base), 'utf8');
      let normalized;
      try { normalized = JSON.stringify(JSON.parse(content)); } catch (e) { continue; }
      const h = _hash(normalized);
      if (_hashes[base] === h) continue;
      const ok = await db.setSetting(settingKey(base), normalized);
      if (ok) { _hashes[base] = h; backed++; }
    } catch (e) { /* fichier suivant */ }
  }
  try {
    const set = new Set(await _readIndex());
    for (const b of files) set.add(b);
    await db.setSetting(INDEX_KEY, JSON.stringify([...set]));
  } catch (e) { /* index best-effort */ }
  if (backed) console.log(`[JSONSTORE] 💾 ${backed} fichier(s) sauvegardé(s) sur Firebase`);
  return { ok: true, backed };
}

async function _readIndex() {
  try {
    const raw = await db.getSetting(INDEX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

async function _addToIndex(base) {
  try {
    const set = new Set(await _readIndex());
    if (!set.has(base)) {
      set.add(base);
      await db.setSetting(INDEX_KEY, JSON.stringify([...set]));
    }
  } catch (e) { /* best-effort */ }
}

// ── Sauvegarde périodique + au shutdown ──
function startAutoBackup(intervalMs = 60000) {
  if (_started) return;
  _started = true;

  _timer = setInterval(() => { backupAll().catch(() => {}); }, intervalMs);
  if (_timer.unref) _timer.unref();

  const flush = async () => {
    if (_flushing) return;
    _flushing = true;
    try { await backupAll(); } catch (e) {}
    process.exit(0);
  };
  process.once('SIGTERM', flush);
  process.once('SIGINT', flush);
  console.log(`[JSONSTORE] ⏱️ Sauvegarde auto toutes les ${Math.round(intervalMs / 1000)}s + au shutdown`);
}

module.exports = {
  restoreAll,
  backupAll,
  backupFile,
  startAutoBackup,
  listDataFiles,
  settingKey,
};
