/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD — Bot Clone Network Commands
 * ═══════════════════════════════════════════════════════════
 * Commandes pour gérer une armée de bots WhatsApp
 * depuis un seul panneau de contrôle (owner uniquement)
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require('../lib/ovlcmd');
const Net     = require('../lib/MultiBotManager');
const QRCode  = require('qrcode');
const fs      = require('fs');
const path    = require('path');

// ─────────────────────────────────────────────────────────
// ➕ .addbot <nom> <session_id>
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'addbot',
    classe: 'Bot Network',
    react: '🤖',
    desc: 'Ajouter un bot au réseau de clones',
    alias: ['newbot', 'botadd', 'connectbot']
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const name      = arg[0];
    const sessionId = arg[1];

    if (!name) {
      return repondre(
        `❌ *Format:*\n.addbot <nom> [session_id]\n\n` +
        `📌 *Sans session_id:*\n.addbot bot2\n↳ Un QR code sera envoyé à scanner\n\n` +
        `📌 *Avec session_id:*\n.addbot bot2 HANI-MD~xxxx...\n↳ Restaure depuis une session existante\n\n` +
        `💡 Obtenir le session_id d'un bot: *.getsession*`
      );
    }

    const ownerJid = ovl.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
    const from     = msg.key.remoteJid;
    let qrSent     = false;

    // Callback QR — génère une image et l'envoie au owner
    const qrCallback = async (qrData) => {
      if (qrSent) return; // Envoyer le QR une seule fois
      qrSent = true;
      try {
        const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 400, margin: 2 });
        await ovl.sendMessage(from, {
          image: qrBuffer,
          caption:
            `📱 *Scanne ce QR avec le téléphone de "${name}"*\n\n` +
            `⏳ Expire dans ~20s — scanne rapidement!\n` +
            `ℹ️ Ouvre WhatsApp → Appareils connectés → Connecter un appareil`
        }, { quoted: msg });
      } catch (e) {
        await repondre(`❌ Erreur génération QR: ${e.message}`);
      }
    };

    await repondre(`⏳ Démarrage du bot *${name}*...\n\n${sessionId ? 'Restauration de la session...' : 'Génération du QR code...'}`);

    const result = await Net.startBotInstance(name, sessionId || null, ownerJid, sessionId ? null : qrCallback);

    if (result.success) {
      const db = Net.loadNetworkDB();
      db.bots[name] = {
        name,
        sessionId: sessionId || null,
        autoConnect: true,
        addedAt: new Date().toISOString()
      };
      Net.saveNetworkDB(db);
      if (sessionId) {
        return repondre(
          `✅ *Bot "${name}" démarré!*\n\n🔄 Connexion en cours...\n📱 Tu recevras une confirmation quand il sera en ligne.\n\n💡 *.botlist* → voir tous les bots`
        );
      }
      // Si QR mode, le message de confirmation sera envoyé quand le bot se connecte
    } else {
      return repondre(`❌ Erreur: ${result.error}`);
    }
  }
);

// ─────────────────────────────────────────────────────────
// 📋 .botlist — Liste tous les bots du réseau
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'botlist',
    classe: 'Bot Network',
    react: '📋',
    desc: 'Liste tous les bots du réseau',
    alias: ['botstatus', 'botnetwork', 'mybots']
  },
  async (ovl, msg, { repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const status   = Net.getNetworkStatus();
    const db       = Net.loadNetworkDB();
    const saved    = Object.keys(db.bots || {});
    const connected = status.filter(b => b.status === 'connected').length;

    let text = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    text    += `┃   🤖 *BOT CLONE NETWORK*     ┃\n`;
    text    += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    text    += `📊 Actifs: *${connected}* | Enregistrés: *${saved.length}*\n`;
    text    += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (status.length === 0) {
      text += `📭 *Aucun bot actif*\n\n`;
      text += `💡 Ajoute un bot:\n*.addbot <nom> <session_id>*`;
    } else {
      status.forEach(b => {
        const icon = b.status === 'connected' ? '🟢' : '🔴';
        text += `${icon} *${b.name}*`;
        if (b.phone) text += ` (+${b.phone})`;
        text += `\n   └ ${b.status}`;
        if (b.connectedAt) {
          const d = new Date(b.connectedAt);
          text += ` depuis ${d.toLocaleTimeString('fr-FR')}`;
        }
        text += '\n\n';
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📡 *.botcast <msg>* → diffuser sur tous\n`;
    text += `💬 *.botsay <bot> <num> <msg>* → parler via un bot\n`;
    text += `🏓 *.botping* → vérifier tous les bots\n`;
    text += `🗑️ *.removebot <nom>* → retirer un bot`;

    return repondre(text);
  }
);

// ─────────────────────────────────────────────────────────
// 📡 .botcast <message> — Diffuser via tous les bots
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'botcast',
    classe: 'Bot Network',
    react: '📡',
    desc: 'Diffuser un message via TOUS les bots du réseau',
    alias: ['networkcast', 'allbots', 'castall']
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const message = arg.join(' ');
    if (!message) return repondre('❌ Usage: .botcast <message>');

    const status    = Net.getNetworkStatus();
    const connected = status.filter(b => b.status === 'connected');

    if (connected.length === 0) {
      return repondre('❌ Aucun bot connecté.\n\n💡 Ajoute un bot: *.addbot <nom> <session_id>*');
    }

    await repondre(`📡 *Broadcast réseau*\n\n⏳ Envoi via *${connected.length} bots*...\n\n💬 Message: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);

    const ownerJid = msg.key.remoteJid;
    let success = 0, fail = 0;

    for (const bot of connected) {
      const b = Net.activeBots.get(bot.name);
      if (!b?.sock) { fail++; continue; }
      try {
        await b.sock.sendMessage(ownerJid, {
          text: `📡 *[RÉSEAU — ${bot.name}]*\n\n${message}`
        });
        success++;
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        fail++;
      }
    }

    return repondre(
      `✅ *Broadcast terminé!*\n\n` +
      `📊 Résultats:\n` +
      `✅ Succès: *${success}* bots\n` +
      `❌ Échec: *${fail}* bots`
    );
  }
);

// ─────────────────────────────────────────────────────────
// 💬 .botsay <nom_bot> <numéro> <message>
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'botsay',
    classe: 'Bot Network',
    react: '💬',
    desc: 'Faire parler un bot spécifique à un numéro',
    alias: ['botsend', 'botmsg', 'botparle']
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const botName = arg[0];
    const target  = arg[1];
    const message = arg.slice(2).join(' ');

    if (!botName || !target || !message) {
      return repondre(
        `❌ *Format:*\n.botsay <nom_bot> <numéro> <message>\n\n` +
        `📌 *Exemple:*\n.botsay bot2 22612345678 Bonjour! 👋`
      );
    }

    const bot = Net.activeBots.get(botName);
    if (!bot || bot.status !== 'connected') {
      return repondre(`❌ Bot "${botName}" non connecté.\n\n💡 *.botlist* pour voir les bots disponibles`);
    }

    const targetJid = target.includes('@') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    try {
      await bot.sock.sendMessage(targetJid, { text: message });
      return repondre(`✅ *Message envoyé!*\n\n🤖 Bot: ${botName}\n📱 Vers: +${target}\n💬 "${message.substring(0, 80)}"`);
    } catch (e) {
      return repondre(`❌ Erreur envoi: ${e.message}`);
    }
  }
);

// ─────────────────────────────────────────────────────────
// 🏓 .botping — Vérifier tous les bots
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'botping',
    classe: 'Bot Network',
    react: '🏓',
    desc: 'Vérifier que tous les bots du réseau répondent',
    alias: ['networkping', 'pingbots', 'botcheck']
  },
  async (ovl, msg, { repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const status    = Net.getNetworkStatus();
    const db        = Net.loadNetworkDB();
    const savedBots = Object.keys(db.bots || {});

    if (status.length === 0 && savedBots.length === 0) {
      return repondre('📭 Aucun bot dans le réseau.\n\n💡 *.addbot <nom> <session_id>*');
    }

    let text = `🏓 *PING RÉSEAU*\n━━━━━━━━━━━━━━━━━━━\n\n`;
    let online = 0;

    for (const b of status) {
      const icon = b.status === 'connected' ? '✅' : '⚠️';
      text += `${icon} *${b.name}*`;
      if (b.phone) text += ` (+${b.phone})`;
      text += ` — ${b.status}\n`;
      if (b.status === 'connected') online++;
    }

    // Bots enregistrés mais pas actifs
    for (const name of savedBots) {
      if (!status.find(b => b.name === name)) {
        text += `🔴 *${name}* — hors ligne\n`;
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *${online}/${savedBots.length}* bots en ligne\n\n`;

    if (online < savedBots.length) {
      text += `💡 *.addbot <nom>* pour reconnecter les bots hors ligne`;
    }

    return repondre(text);
  }
);

// ─────────────────────────────────────────────────────────
// 🗑️ .removebot <nom> — Retirer un bot
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'removebot',
    classe: 'Bot Network',
    react: '🗑️',
    desc: 'Retirer un bot du réseau',
    alias: ['delbot', 'botdel', 'botremove']
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const name = arg[0];
    if (!name) return repondre('❌ Usage: .removebot <nom_bot>');

    await Net.stopBotInstance(name);

    const db = Net.loadNetworkDB();
    delete db.bots[name];
    Net.saveNetworkDB(db);

    return repondre(`✅ *Bot "${name}" retiré du réseau.*\n\n💡 *.botlist* pour voir les bots restants`);
  }
);

// ─────────────────────────────────────────────────────────
// 📊 .netstats — Statistiques du réseau
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'netstats',
    classe: 'Bot Network',
    react: '📊',
    desc: 'Statistiques complètes du réseau de bots',
    alias: ['networkstats', 'botstats']
  },
  async (ovl, msg, { repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const status = Net.getNetworkStatus();
    const db     = Net.loadNetworkDB();

    const connected    = status.filter(b => b.status === 'connected');
    const disconnected = status.filter(b => b.status !== 'connected');

    let text = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    text    += `┃   📊 *STATS RÉSEAU DE BOTS*  ┃\n`;
    text    += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    text    += `🟢 Connectés:   *${connected.length}*\n`;
    text    += `🔴 Déconnectés: *${disconnected.length}*\n`;
    text    += `📦 Enregistrés: *${Object.keys(db.bots || {}).length}*\n`;
    text    += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text    += `\n*Bots connectés:*\n`;

    if (connected.length === 0) {
      text += `└ Aucun\n`;
    } else {
      connected.forEach(b => {
        const since = b.connectedAt
          ? Math.round((Date.now() - new Date(b.connectedAt).getTime()) / 60000)
          : '?';
        text += `┌ 🟢 *${b.name}* (+${b.phone})\n`;
        text += `└   En ligne depuis ${since} min\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Commandes réseau:*\n`;
    text += `• *.addbot* <nom> <session> → ajouter\n`;
    text += `• *.botcast* <msg> → diffuser\n`;
    text += `• *.botsay* <bot> <num> <msg> → parler\n`;
    text += `• *.botping* → vérifier\n`;
    text += `• *.removebot* <nom> → retirer`;

    return repondre(text);
  }
);

// ─────────────────────────────────────────────────────────
// 🔭 .botmirror [on/off] [nom_bot] — Activer le miroir
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'botmirror',
    classe: 'Bot Network',
    react: '🔭',
    desc: 'Voir tout ce que les bots reçoivent en temps réel',
    alias: ['mirrorbot', 'botspy', 'botwatch', 'botsee']
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const action  = (arg[0] || '').toLowerCase();
    const botName = arg[1] || null;  // null = tous les bots

    const db = Net.loadNetworkDB();
    const ownerJid = msg.key.remoteJid;

    if (!action || action === 'status') {
      // Afficher l'état du miroir pour chaque bot
      const status = Net.getNetworkStatus();
      let text = `🔭 *BOT MIRROR STATUS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      if (status.length === 0) {
        text += `📭 Aucun bot actif\n\n💡 *.addbot <nom> <session>* pour ajouter`;
      } else {
        for (const b of status) {
          const cfg     = db.bots[b.name] || {};
          const enabled = cfg.mirrorEnabled !== false;
          text += `${enabled ? '✅' : '❌'} *${b.name}* (+${b.phone}) — Mirror: ${enabled ? 'ON' : 'OFF'}\n`;
        }
        text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `💡 *.botmirror on* → activer tous\n`;
        text += `💡 *.botmirror off* → désactiver tous\n`;
        text += `💡 *.botmirror on bot2* → activer seulement bot2\n\n`;
        text += `📡 Quand activé, tu reçois ICI:\n`;
        text += `• Tous les messages reçus par les bots\n`;
        text += `• Photos, vidéos, audio, documents\n`;
        text += `• Stickers, localisation, contacts\n`;
        text += `• Messages envoyés ET reçus`;
      }
      return repondre(text);
    }

    if (action !== 'on' && action !== 'off') {
      return repondre(`❌ Usage: *.botmirror on/off [nom_bot]*\n\nExemples:\n• *.botmirror on* → tous les bots\n• *.botmirror on bot2* → seulement bot2\n• *.botmirror status* → voir l'état`);
    }

    const enable   = action === 'on';
    const targets  = botName ? [botName] : Object.keys(db.bots || {});

    if (targets.length === 0) {
      return repondre('❌ Aucun bot enregistré.\n\n💡 *.addbot <nom> <session>*');
    }

    let changed = 0;
    for (const t of targets) {
      if (!db.bots[t]) continue;
      db.bots[t].mirrorEnabled = enable;
      changed++;
    }
    Net.saveNetworkDB(db);

    // Définir le owner comme destinataire du miroir
    if (enable) {
      Net.setMirrorOwner(ownerJid);
    }

    const icon = enable ? '✅' : '❌';
    const targetLabel = botName || `tous les ${changed} bots`;
    return repondre(
      `${icon} *Mirror ${enable ? 'ACTIVÉ' : 'DÉSACTIVÉ'}*\n\n` +
      `🤖 Bots concernés: *${targetLabel}*\n` +
      `📍 Messages redirigés vers: *ce chat*\n\n` +
      `${enable
        ? '📡 Tu recevras maintenant en temps réel:\n• Textes, photos, vidéos, audio\n• Documents, stickers, locations\n• Messages envoyés ET reçus'
        : '🔇 Plus aucun message ne sera redirigé.'}`
    );
  }
);

// ─────────────────────────────────────────────────────────
// 🔑 .getsession — Exporter la session du bot courant
// ─────────────────────────────────────────────────────────
ovlcmd(
  {
    nom_cmd: 'getsession',
    classe: 'Bot Network',
    react: '🔑',
    desc: 'Obtenir le session_id de ce bot pour l\'ajouter au réseau',
    alias: ['mysession', 'sessionid', 'sessionkey', 'exportsession']
  },
  async (ovl, msg, { repondre, superUser }) => {
    if (!superUser) return repondre('❌ Commande réservée au propriétaire');

    const possiblePaths = [
      path.join(process.cwd(), 'DataBase', 'session', 'principale', 'creds.json'),
      path.join(process.cwd(), 'DataBase', 'session', 'creds.json'),
      path.join(process.cwd(), 'session', 'creds.json'),
      path.join(process.cwd(), 'auth_info_baileys', 'creds.json'),
    ];

    let credsData = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try { credsData = JSON.parse(fs.readFileSync(p, 'utf8')); break; } catch {}
      }
    }

    if (!credsData) {
      return repondre('❌ Fichier de session introuvable (creds.json).\n\nAssure-toi que le bot est bien connecté.');
    }

    const sessionId = 'HANI-MD~' + Buffer.from(JSON.stringify(credsData)).toString('base64');

    // Envoyer comme document .txt (plus facile à copier que texte brut)
    const tmpFile = path.join(process.cwd(), 'DataBase', `session_export_${Date.now()}.txt`);
    try {
      fs.writeFileSync(tmpFile, sessionId);
      await ovl.sendMessage(msg.key.remoteJid, {
        document: fs.readFileSync(tmpFile),
        mimetype: 'text/plain',
        fileName: 'session_id.txt',
        caption:
          `✅ *Session ID exporté!*\n\n` +
          `📋 *Comment utiliser ce fichier:*\n` +
          `1️⃣ Ouvre le fichier et copie TOUT le contenu\n` +
          `2️⃣ Sur le bot principal, tape:\n` +
          `   *.addbot <nom> <contenu_copié>*\n\n` +
          `⚠️ Ne partage pas ce fichier — il donne accès à ce compte WhatsApp!`
      }, { quoted: msg });
    } catch (e) {
      return repondre(`❌ Erreur export session: ${e.message}`);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
);

console.log('[CMD] ✅ BotNetwork.js chargé — addbot, getsession, botlist, botcast, botsay, botping, removebot, netstats, botmirror');
