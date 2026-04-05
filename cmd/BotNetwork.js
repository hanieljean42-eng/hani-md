/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD — Bot Clone Network Commands
 * ═══════════════════════════════════════════════════════════
 * Commandes pour gérer une armée de bots WhatsApp
 * depuis un seul panneau de contrôle (owner uniquement)
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require('../lib/ovlcmd');
const Net = require('../lib/MultiBotManager');

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
        `❌ *Format:*\n.addbot <nom> <session_id>\n\n` +
        `📌 *Exemple:*\n.addbot bot2 HANI-MD~xxxx...\n\n` +
        `💡 Le session_id se génère avec *.getsession* sur le deuxième numéro`
      );
    }

    await repondre(`⏳ Démarrage du bot *${name}*...\n\nPatiente 10-20 secondes.`);

    const ownerJid = ovl.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
    const result   = await Net.startBotInstance(name, sessionId, ownerJid);

    if (result.success) {
      const db = Net.loadNetworkDB();
      db.bots[name] = {
        name,
        sessionId: sessionId || null,
        autoConnect: true,
        addedAt: new Date().toISOString()
      };
      Net.saveNetworkDB(db);
      return repondre(
        `✅ *Bot "${name}" démarré!*\n\n` +
        `🔄 Connexion en cours...\n` +
        `📱 Tu recevras une confirmation quand il sera en ligne.\n\n` +
        `💡 *.botlist* → voir tous les bots`
      );
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

console.log('[CMD] ✅ BotNetwork.js chargé — addbot, botlist, botcast, botsay, botping, removebot, netstats');
