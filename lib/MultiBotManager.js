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

// Mirror mode: ownerJid à notifier pour chaque bot
let _mirrorOwnerJid = null;

function setMirrorOwner(jid) { _mirrorOwnerJid = jid; }
function getMirrorOwner() { return _mirrorOwnerJid; }

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

    // ── BOT MIRROR — transmettre tous les messages reçus au owner ──
    sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      if (type !== 'notify') return;
      const db = loadNetworkDB();
      const botCfg = db.bots[name] || {};
      if (botCfg.mirrorEnabled === false) return;  // mirror désactivé pour ce bot
      const dest = _mirrorOwnerJid || ownerJid;
      if (!dest) return;

      for (const m of msgs) {
        try {
          if (!m.message) continue;
          const isFromMe = m.key.fromMe;
          const sender   = m.key.remoteJid || '?';
          const senderPhone = sender.replace('@s.whatsapp.net','').replace('@g.us','');
          const pushName  = m.pushName || senderPhone;
          const isGroup   = sender.endsWith('@g.us');
          const time      = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' });

          // Extraire le texte
          const msgContent = m.message;
          const text = msgContent.conversation ||
            msgContent.extendedTextMessage?.text ||
            msgContent.imageMessage?.caption ||
            msgContent.videoMessage?.caption ||
            msgContent.documentMessage?.caption || '';

          // Détecter le type
          const msgType = Object.keys(msgContent)[0];
          const typeEmoji = {
            conversation: '💬', extendedTextMessage: '💬',
            imageMessage: '🖼️', videoMessage: '🎥',
            audioMessage: '🎵', voiceMessage: '🎙️',
            documentMessage: '📄', stickerMessage: '🎭',
            locationMessage: '📍', contactMessage: '👤',
            reactionMessage: '❤️', pollCreationMessage: '📊'
          }[msgType] || '📩';

          // Header du miroir
          let header = `🔭 *[MIROIR — ${name}]* ${isFromMe ? '📤 ENVOYÉ' : '📥 REÇU'}\n`;
          header    += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          header    += `${typeEmoji} Type: *${msgType.replace('Message','')}*\n`;
          header    += `👤 ${isFromMe ? 'Vers' : 'De'}: *${pushName}* (+${senderPhone})\n`;
          if (isGroup) header += `👥 Groupe: ${senderPhone}\n`;
          header    += `🕐 ${time}\n`;
          if (text)  header += `\n💬 *Message:*\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`;

          // Envoyer le header au owner
          await sock.sendMessage(dest, { text: header });

          // Transmettre le média si présent
          if (['imageMessage','videoMessage','audioMessage','voiceMessage','documentMessage','stickerMessage'].includes(msgType)) {
            try {
              const { downloadMediaMessage } = require('@whiskeysockets/baileys');
              const buffer = await downloadMediaMessage(m, 'buffer', {});
              if (buffer) {
                const mimeMap = {
                  imageMessage:    { image: buffer },
                  videoMessage:    { video: buffer },
                  audioMessage:    { audio: buffer, mimetype: 'audio/mp4', ptt: false },
                  voiceMessage:    { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true },
                  documentMessage: { document: buffer, mimetype: msgContent.documentMessage?.mimetype || 'application/octet-stream', fileName: msgContent.documentMessage?.fileName || 'fichier' },
                  stickerMessage:  { sticker: buffer }
                };
                const content = mimeMap[msgType];
                if (content) await sock.sendMessage(dest, content);
              }
            } catch (dlErr) {
              await sock.sendMessage(dest, { text: `⚠️ Média non téléchargeable: ${dlErr.message}` });
            }
          }
        } catch (mirrorErr) {
          console.log(`[BOT-MIRROR] Erreur forward ${name}:`, mirrorErr.message);
        }
      }
    });

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
  saveNetworkDB,
  setMirrorOwner,
  getMirrorOwner
};
