/**
 * 👁️ HANI-MD - Coffre privé des vues uniques (Vault)
 *
 * À chaque vue unique interceptée, le média est téléchargé immédiatement
 * (avant expiration de l'URL WhatsApp) et stocké :
 *   - sur disque dans DataBase/viewonce_media/ (servi par /vault)
 *   - en backup Firebase RTDB (viewonce_media/) pour survivre aux redeploys.
 */

const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');

const VAULT_DIR = path.join(ROOT_DIR, 'DataBase', 'viewonce_media');
const VAULT_INDEX = path.join(VAULT_DIR, 'index.json');
const MAX_BACKUP_BYTES = 7 * 1024 * 1024; // backup Firebase limité à ~7 Mo

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/webm': 'webm',
  'audio/ogg': 'ogg', 'audio/ogg; codecs=opus': 'ogg',
  'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac',
  'application/pdf': 'pdf',
};

function ensureDir() {
  if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
}

function loadIndex() {
  try {
    if (fs.existsSync(VAULT_INDEX)) return JSON.parse(fs.readFileSync(VAULT_INDEX, 'utf8'));
  } catch (e) { console.log('[VAULT] ⚠️ index illisible:', e.message); }
  return {};
}

function saveIndex(idx) {
  try {
    ensureDir();
    fs.writeFileSync(VAULT_INDEX, JSON.stringify(idx, null, 2), 'utf8');
  } catch (e) { console.log('[VAULT] ⚠️ sauvegarde index:', e.message); }
}

let _index = loadIndex();

// Trouve le nœud média dans le contenu d'une vue unique
// (imageMessage direct, ou imbriqué sous buttonsMessage / documentMessage...)
function findMediaNode(messageContent) {
  const MEDIA_KEYS = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
  if (!messageContent || typeof messageContent !== 'object') return null;
  for (const k of MEDIA_KEYS) {
    if (messageContent[k]) return { type: k, node: messageContent[k] };
  }
  // un niveau d'imbrication (buttonsMessage.imageMessage etc.)
  for (const v of Object.values(messageContent)) {
    if (v && typeof v === 'object') {
      for (const k of MEDIA_KEYS) {
        if (v[k]) return { type: k, node: v[k] };
      }
    }
  }
  return null;
}

function sanitizeFileName(id) {
  return String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

// Sauvegarde un média téléchargé dans le coffre (disque + backup Firebase)
async function saveMedia({ id, buffer, mime, meta }) {
  ensureDir();
  const ext = EXT[mime] || 'bin';
  const file = sanitizeFileName(id) + '.' + ext;
  const filePath = path.join(VAULT_DIR, file);
  fs.writeFileSync(filePath, buffer);

  const entry = {
    id,
    file,
    mime,
    size: buffer.length,
    sender: meta?.sender || '',
    pushName: meta?.pushName || 'Inconnu',
    chat: meta?.chat || '',
    type: meta?.type || 'media',
    caption: meta?.caption || '',
    date: new Date().toLocaleString('fr-FR'),
    timestamp: Date.now(),
  };
  _index[id] = entry;
  saveIndex(_index);
  console.log(`[VAULT] ✅ Média archivé: ${file} (${Math.round(buffer.length / 1024)} Ko) — de ${entry.pushName}`);

  // Backup Firebase (survit aux redeploys) — fire-and-forget
  if (buffer.length <= MAX_BACKUP_BYTES) {
    (async () => {
      try {
        const fdb = require('../DataBase/firebase_db');
        if (fdb.isConnected && fdb.isConnected()) {
          const { file: _f, ...metaNoFile } = entry;
          await fdb._set('viewonce_media/' + sanitizeFileName(id), { meta: metaNoFile, data_b64: buffer.toString('base64') });
        }
      } catch (e) { /* silencieux — le disque suffit */ }
    })();
  }
  return entry;
}

// Restaure les médias depuis Firebase si le disque a été effacé (redeploy)
async function restoreFromFirebase() {
  try {
    const fdb = require('../DataBase/firebase_db');
    if (!fdb.isConnected || !fdb.isConnected()) return;
    const data = await fdb._get('viewonce_media');
    if (!data) return;
    let restored = 0;
    for (const [key, rec] of Object.entries(data)) {
      const meta = rec?.meta;
      if (!meta || !rec.data_b64) continue;
      const id = meta.id || key;
      if (_index[id] && fs.existsSync(path.join(VAULT_DIR, _index[id].file))) continue;
      const ext = EXT[meta.mime] || 'bin';
      const file = sanitizeFileName(id) + '.' + ext;
      fs.writeFileSync(path.join(VAULT_DIR, file), Buffer.from(rec.data_b64, 'base64'));
      _index[id] = { ...meta, id, file };
      restored++;
    }
    if (restored) {
      saveIndex(_index);
      console.log(`[VAULT] ☁️ ${restored} média(s) restauré(s) depuis Firebase`);
    }
  } catch (e) { /* silencieux */ }
}

function list() {
  return Object.values(_index).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function getEntry(id) { return _index[id] || null; }

function mediaPath(file) {
  const p = path.join(VAULT_DIR, path.basename(file));
  return fs.existsSync(p) ? p : null;
}

async function remove(id) {
  const e = _index[id];
  if (!e) return false;
  try { const p = mediaPath(e.file); if (p) fs.unlinkSync(p); } catch (err) {}
  delete _index[id];
  saveIndex(_index);
  try {
    const fdb = require('../DataBase/firebase_db');
    if (fdb.isConnected && fdb.isConnected()) await fdb._remove('viewonce_media/' + sanitizeFileName(id));
  } catch (err) {}
  return true;
}

module.exports = { saveMedia, restoreFromFirebase, list, getEntry, mediaPath, remove, findMediaNode, VAULT_DIR };
