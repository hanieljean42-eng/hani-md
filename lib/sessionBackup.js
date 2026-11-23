/**
 * ═══════════════════════════════════════════════════════════
 * 💾 HANI-MD - Backup de session WhatsApp vers Firebase RTDB
 * ═══════════════════════════════════════════════════════════
 * Problème : sur Render le disque est éphémère. Avec le backend
 * "disk" + SESSION_ID, chaque redémarrage revenait au bundle
 * SESSION_ID initial (clés Signal périmées → désynchronisation,
 * "En attente de ce message", puis déconnexion).
 *
 * Solution : ré-encoder le dossier de session (format V2 identique
 * à SESSION_ID) et le pousser dans Firebase à chaque changement de
 * creds + périodiquement. Au boot on restaure la copie Firebase
 * (toujours la plus fraîche), sinon on retombe sur SESSION_ID.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FB_BUNDLE_PATH = 'hanimd/session_bundle';

function encodeBundle(sessionFolder) {
  const files = fs.readdirSync(sessionFolder);
  const bundle = {};
  for (const f of files) {
    const fp = path.join(sessionFolder, f);
    if (fs.statSync(fp).isFile()) bundle[f] = fs.readFileSync(fp).toString('base64');
  }
  if (!bundle['creds.json']) return null;
  return 'HANI-MD-V2~' + zlib.brotliCompressSync(Buffer.from(JSON.stringify(bundle))).toString('base64');
}

function writeBundleToFolder(sessionFolder, sessionData) {
  const compressed = Buffer.from(sessionData.replace('HANI-MD-V2~', ''), 'base64');
  const bundle = JSON.parse(zlib.brotliDecompressSync(compressed).toString('utf-8'));
  for (const [filename, b64content] of Object.entries(bundle)) {
    fs.writeFileSync(path.join(sessionFolder, filename), Buffer.from(b64content, 'base64'));
  }
  return Object.keys(bundle).length;
}

async function pushBundle(firebaseDB, sessionFolder) {
  try {
    if (!firebaseDB?.isConnected?.()) return false;
    const data = encodeBundle(sessionFolder);
    if (!data) return false;
    await firebaseDB._set(FB_BUNDLE_PATH, { data, updated_at: new Date().toISOString() });
    console.log('[SESSION] ☁️ Bundle session sauvegardé sur Firebase');
    return true;
  } catch (e) {
    console.log('[SESSION] ⚠️ Backup Firebase échoué:', e.message);
    return false;
  }
}

async function restoreBundle(firebaseDB, sessionFolder) {
  try {
    if (!firebaseDB?.isConnected?.()) return false;
    const rec = await firebaseDB._get(FB_BUNDLE_PATH);
    if (!rec?.data?.startsWith('HANI-MD-V2~')) return false;
    const n = writeBundleToFolder(sessionFolder, rec.data);
    console.log(`[SESSION] ☁️ Session restaurée depuis Firebase (${n} fichiers, ${rec.updated_at || '?'})`);
    return true;
  } catch (e) {
    console.log('[SESSION] ⚠️ Restauration Firebase impossible:', e.message);
    return false;
  }
}

async function clearBundle(firebaseDB) {
  try { if (firebaseDB?.isConnected?.()) await firebaseDB._remove(FB_BUNDLE_PATH); }
  catch (_) {}
}

// Backup débouncé + périodique (les fichiers session-*/pre-key changent
// via keys.set sans déclencher creds.update — d'où le timer de secours).
function startAutoBackup(firebaseDB, sessionFolder) {
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => pushBundle(firebaseDB, sessionFolder), 30000);
  };
  const interval = setInterval(() => pushBundle(firebaseDB, sessionFolder), 15 * 60 * 1000);
  interval.unref?.();
  return { schedule, pushNow: () => pushBundle(firebaseDB, sessionFolder) };
}

module.exports = { pushBundle, restoreBundle, clearBundle, startAutoBackup };
