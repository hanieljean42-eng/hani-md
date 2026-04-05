/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD — Multi-Bot Network Manager
 * ═══════════════════════════════════════════════════════════
 * Contrôler plusieurs instances WhatsApp depuis un seul panneau
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');
const pino = require('pino');

const BOT_NETWORK_DB   = path.join(__dirname, '../DataBase/bot_network.json');
const BOT_SESSIONS_DIR = path.join(__dirname, '../DataBase/network_sessions');

if (!fs.existsSync(BOT_SESSIONS_DIR)) fs.mkdirSync(BOT_SESSIONS_DIR, { recursive: true });

// Map of active bot connections: name → { sock, status, phone, jid, connectedAt }
const activeBots = new Map();

// ── DB helpers ──────────────────────────────────────────────
function loadNetworkDB() {
  try {
    if (fs.existsSync(BOT_NETWORK_DB))
      return JSON.parse(fs.readFileSync(BOT_NETWORK_DB, 'utf8'));
  } catch (e) {}
  return { bots: {}, settings: { maxBots: 10 } };
}

function saveNetworkDB(data) {
  try { fs.writeFileSync(BOT_NETWORK_DB, JSON.stringify(data, null, 2)); } catch (e) {}
}

// ── Restore session from HANI-MD~ token ────────────────────
function restoreSession(name, sessionId) {
  try {
    const sessionDir = path.join(BOT_SESSIONS_DIR, name);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    const b64  = sessionId.replace('HANI-MD~', '');
    const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.log(`[BOT-NET] Erreur restore session ${name}:`, e.message);
    return false;
  }
}

// ── Start a single bot instance ─────────────────────────────
async function startBotInstance(name, sessionId, ownerJid) {
  if (activeBots.has(name) && activeBots.get(name).status === 'connected') {
    return { success: false, error: `Bot "${name}" déjà connecté` };
  }

  const sessionDir = path.join(BOT_SESSIONS_DIR, name);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  if (sessionId && sessionId.startsWith('HANI-MD~')) {
    const ok = restoreSession(name, sessionId);
    if (!ok) return { success: false, error: 'Session invalide ou corrompue' };
  } else if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
    return { success: false, error: `Aucune session pour "${name}". Fournis un session_id.` };
  }

  try {
    const { version }         = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      generateHighQualityLinkPreview: false,
      getMessage: async () => ({ conversation: '' })
    });

    activeBots.set(name, { sock, status: 'connecting', phone: null, jid: null, connectedAt: null, name });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0];
        activeBots.set(name, { sock, status: 'connected', phone, jid: sock.user?.id, connectedAt: new Date().toISOString(), name });
        console.log(`[BOT-NET] ✅ Bot "${name}" connecté: ${phone}`);
        const db = loadNetworkDB();
        db.bots[name] = { ...db.bots[name], phone, status: 'connected', connectedAt: new Date().toISOString() };
        saveNetworkDB(db);
        if (ownerJid) {
          try { await sock.sendMessage(ownerJid, { text: `✅ *Bot Network*\n\n🤖 Bot *${name}* (${phone}) connecté!\n🕐 ${new Date().toLocaleString('fr-FR')}` }); } catch (e) {}
        }
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut && code !== 401;
        const entry = activeBots.get(name);
        if (entry) entry.status = 'disconnected';
        console.log(`[BOT-NET] ⚠️ Bot "${name}" déconnecté (code ${code}). Reconnexion: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => startBotInstance(name, null, ownerJid), 12000);
        } else {
          activeBots.delete(name);
        }
      }
    });

    return { success: true, message: `Bot "${name}" démarré, connexion en cours...` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Stop a bot instance ─────────────────────────────────────
async function stopBotInstance(name) {
  const bot = activeBots.get(name);
  if (!bot) return { success: false, error: `Bot "${name}" non trouvé` };
  try { bot.sock?.end?.(); } catch (e) {}
  activeBots.delete(name);
  return { success: true };
}

// ── Get status of all bots ──────────────────────────────────
function getNetworkStatus() {
  return Array.from(activeBots.values()).map(b => ({
    name: b.name,
    phone: b.phone || '?',
    status: b.status,
    connectedAt: b.connectedAt
  }));
}

// ── Broadcast via all active bots ──────────────────────────
async function networkBroadcast(targetJid, message) {
  const results = [];
  for (const [name, bot] of activeBots.entries()) {
    if (bot.status !== 'connected') { results.push({ bot: name, success: false, error: 'non connecté' }); continue; }
    try {
      await bot.sock.sendMessage(targetJid, { text: message });
      results.push({ bot: name, success: true });
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    } catch (e) {
      results.push({ bot: name, success: false, error: e.message });
    }
  }
  return results;
}

// ── Auto-reconnect saved bots at startup ────────────────────
async function autoConnectSavedBots(ownerJid) {
  const db = loadNetworkDB();
  for (const [name, cfg] of Object.entries(db.bots || {})) {
    if (cfg.autoConnect !== false) {
      const sessionDir = path.join(BOT_SESSIONS_DIR, name);
      if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        console.log(`[BOT-NET] 🔄 Reconnexion bot "${name}"...`);
        await startBotInstance(name, null, ownerJid);
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }
}

module.exports = {
  startBotInstance,
  stopBotInstance,
  getNetworkStatus,
  networkBroadcast,
  autoConnectSavedBots,
  activeBots,
  loadNetworkDB,
  saveNetworkDB
};
