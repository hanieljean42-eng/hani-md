/**
 * ═══════════════════════════════════════════════════════════
 * 👁️ HANI-MD - Vues Uniques & Messages Supprimés
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require('../lib/ovlcmd');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

// ═══════════════════════════════════════════════════════════
// 👁️ VV — Récupérer une vue unique (répondre au message)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'vv',
    classe: 'Espionnage',
    react: '👁️',
    desc: 'Récupérer un message à vue unique (réponds au message)',
    alias: ['viewonce', 'vo', 'wé', 'we'],
    superUser: true
  },
  async (ovl, msg, { repondre, from }) => {
    const vm = global._viewOnceMessages;
    if (!vm) return repondre('❌ Système vue unique non initialisé.');

    const msgType = Object.keys(msg.message || {})[0];
    const contextInfo =
      msg.message?.[msgType]?.contextInfo ||
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo;

    if (!contextInfo?.stanzaId) {
      return repondre('❌ Réponds à un message à vue unique pour le récupérer.\n\n💡 Utilise `.listvv` pour voir les vues uniques interceptées.');
    }

    const quotedId = contextInfo.stanzaId;
    const quotedMsg = contextInfo.quotedMessage;

    let storedViewOnce = vm.get(quotedId);
    if (!storedViewOnce) {
      for (const [, data] of vm) {
        if (contextInfo.participant === data.message?.key?.participant ||
            contextInfo.participant === data.sender) {
          storedViewOnce = data;
          break;
        }
      }
    }

    let viewOnceContent = null;
    let originalMsg = null;

    if (storedViewOnce) {
      originalMsg = storedViewOnce.message;
      viewOnceContent =
        originalMsg?.message?.viewOnceMessage ||
        originalMsg?.message?.viewOnceMessageV2 ||
        originalMsg?.message?.viewOnceMessageV2Extension;
    } else if (quotedMsg) {
      viewOnceContent =
        quotedMsg.viewOnceMessage ||
        quotedMsg.viewOnceMessageV2 ||
        quotedMsg.viewOnceMessageV2Extension;
      if (!viewOnceContent) {
        const qt = Object.keys(quotedMsg)[0];
        if (['imageMessage', 'videoMessage', 'audioMessage'].includes(qt)) {
          viewOnceContent = { message: quotedMsg };
        }
      }
    }

    if (!viewOnceContent) {
      return repondre('❌ Ce message n\'est pas une vue unique ou n\'a pas été intercepté.\n\n💡 Utilise `.listvv` pour voir celles disponibles.');
    }

    try {
      const mediaMsg = viewOnceContent.message;
      const mediaType = Object.keys(mediaMsg || {})[0];
      const media = mediaMsg?.[mediaType];

      if (!mediaType || !media) return repondre('❌ Impossible de lire le contenu du média.');

      const downloadMsg = originalMsg || { message: mediaMsg, key: { ...msg.key, id: quotedId } };
      const stream = await downloadMediaMessage(downloadMsg, 'buffer', {}, {
        logger: pino({ level: 'silent' }),
        reuploadRequest: ovl.updateMediaMessage
      });

      const caption = '👁️ Vue unique récupérée :\n' + (media.caption || '');

      if (mediaType === 'imageMessage') {
        await ovl.sendMessage(from, { image: stream, caption });
      } else if (mediaType === 'videoMessage') {
        await ovl.sendMessage(from, { video: stream, caption });
      } else if (mediaType === 'audioMessage') {
        await ovl.sendMessage(from, { audio: stream, mimetype: 'audio/mp4' });
      } else {
        return repondre('❌ Type de média non supporté: ' + mediaType);
      }

      if (storedViewOnce) {
        vm.delete(quotedId);
        if (global._saveViewOnceMessages) global._saveViewOnceMessages(vm);
      }
    } catch (e) {
      repondre('❌ Impossible de récupérer ce média.\n\nErreur: ' + e.message);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTVV — Lister les vues uniques interceptées
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'listvv',
    classe: 'Espionnage',
    react: '📋',
    desc: 'Lister les messages à vue unique interceptés',
    alias: ['listviewonce'],
    superUser: true
  },
  async (ovl, msg, { repondre }) => {
    const vm = global._viewOnceMessages;
    if (!vm || vm.size === 0) {
      return repondre('📭 Aucun message à vue unique intercepté récemment.\n\n💡 Les vues uniques sont interceptées automatiquement à leur réception.');
    }

    let list = '👁️ *Messages à vue unique interceptés :*\n\n';
    let i = 1;
    for (const [id, data] of vm) {
      const senderName = data.pushName || data.sender?.split('@')[0] || 'Inconnu';
      list += `*${i}.* ${senderName}\n`;
      list += `   📁 Type: ${data.type || 'inconnu'}\n`;
      list += `   🕐 Date: ${data.date || '?'}\n`;
      list += `   🆔 ID: ${id.substring(0, 10)}...\n\n`;
      i++;
    }
    list += '\n💡 *Pour récupérer:* Réponds au message original avec `.vv`';
    repondre(list);
  }
);

// ═══════════════════════════════════════════════════════════
// ⏭️ LASTVV — Dernière vue unique sans répondre
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'lastvv',
    classe: 'Espionnage',
    react: '👁️',
    desc: 'Récupérer la dernière vue unique interceptée',
    alias: ['lastviewonce'],
    superUser: true
  },
  async (ovl, msg, { repondre, from }) => {
    const vm = global._viewOnceMessages;
    if (!vm || vm.size === 0) return repondre('📭 Aucun message à vue unique intercepté.');

    const lastEntry = Array.from(vm.entries()).pop();
    if (!lastEntry) return repondre('❌ Erreur lors de la récupération.');

    const [lastId, lastData] = lastEntry;

    try {
      const viewOnceContent =
        lastData.message?.message?.viewOnceMessage ||
        lastData.message?.message?.viewOnceMessageV2 ||
        lastData.message?.message?.viewOnceMessageV2Extension;

      if (!viewOnceContent) return repondre('❌ Le contenu n\'est plus disponible.');

      const mediaMsg = viewOnceContent.message;
      const mediaType = Object.keys(mediaMsg || {})[0];
      const media = mediaMsg?.[mediaType];

      const stream = await downloadMediaMessage(lastData.message, 'buffer', {}, {
        logger: pino({ level: 'silent' }),
        reuploadRequest: ovl.updateMediaMessage
      });

      const caption = `👁️ Dernière vue unique (de ${lastData.pushName || 'Inconnu'}):\n${media?.caption || ''}`;

      if (mediaType === 'imageMessage') {
        await ovl.sendMessage(from, { image: stream, caption });
      } else if (mediaType === 'videoMessage') {
        await ovl.sendMessage(from, { video: stream, caption });
      } else if (mediaType === 'audioMessage') {
        await ovl.sendMessage(from, { audio: stream, mimetype: 'audio/mp4' });
      }

      vm.delete(lastId);
      if (global._saveViewOnceMessages) global._saveViewOnceMessages(vm);
    } catch (e) {
      repondre('❌ Erreur: ' + e.message);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ DELETED — Voir les messages supprimés
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'deleted',
    classe: 'Espionnage',
    react: '🗑️',
    desc: 'Voir les messages supprimés interceptés',
    alias: ['delmsg', 'listdeleted', 'voirsupp'],
    superUser: true
  },
  async (ovl, msg, { repondre, arg }) => {
    const dm = global._deletedMessages;
    if (!dm || dm.length === 0) {
      return repondre('📭 *Aucun message supprimé enregistré.*\n\n💡 L\'anti-delete capture automatiquement les messages supprimés et les sauvegarde sur disque.');
    }

    const param = (arg[0] || '').toLowerCase();
    let count = 15;
    if (param === 'all') count = dm.length;
    else if (!isNaN(parseInt(param))) count = Math.min(parseInt(param), dm.length);

    const recent = dm.slice(-count).reverse();
    let list = `🗑️ *MESSAGES SUPPRIMÉS INTERCEPTÉS*\n`;
    list += `📊 Total enregistré: *${dm.length}* | Affichage: *${recent.length}*\n`;
    list += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    recent.forEach((del, i) => {
      list += `*${i + 1}.* 👤 ${del.sender || 'Inconnu'}\n`;
      if (del.text) list += `   💬 "${del.text.substring(0, 120)}${del.text.length > 120 ? '...' : ''}"\n`;
      else list += `   📎 [${del.type || 'media'}]\n`;
      list += `   🕐 ${del.date}\n\n`;
    });

    list += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    list += `💡 *.deleted all* → tout voir | *.deleted 30* → les 30 derniers\n`;
    list += `💡 *.cleardeleted* → vider l'historique`;
    repondre(list);
  }
);

// ═══════════════════════════════════════════════════════════
// 🧹 CLEARDELETED — Vider l'historique des supprimés
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'cleardeleted',
    classe: 'Espionnage',
    react: '🧹',
    desc: 'Vider l\'historique des messages supprimés',
    alias: ['supprdeleted'],
    superUser: true
  },
  async (ovl, msg, { repondre }) => {
    const dm = global._deletedMessages;
    if (!dm) return repondre('❌ Système non initialisé.');
    const nb = dm.length;
    dm.length = 0;
    if (global._saveDeletedMessages) global._saveDeletedMessages(dm);
    repondre(`✅ *Historique vidé.*\n${nb} message(s) supprimé(s) de l'historique.`);
  }
);
