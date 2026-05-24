/**
 * ═══════════════════════════════════════════════════════════
 * 👻 HANI-MD - Contacts Fantômes (Ghost Contact)
 * ═══════════════════════════════════════════════════════════
 * Faire disparaître totalement un contact de WhatsApp :
 * - Ses messages sont interceptés et stockés silencieusement
 * - Aucune notification n'est reçue
 * - Ses statuts sont masqués
 * - Ses vues de vos statuts sont masquées
 * - Le contact réapparaît avec tous ses messages stockés
 *
 * IMPORTANT: WhatsApp utilise des JIDs @lid (Linked Identity)
 * et non des numéros de téléphone. Ce module stocke les JIDs
 * réels pour un matching correct.
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require('../lib/ovlcmd');
const fs = require('fs');
const path = require('path');

const GHOST_FILE = path.join(__dirname, '..', 'DataBase', 'ghost_contacts.json');

// ═══════════════════════════════════════════════════════════
// 📦 PERSISTANCE
// ═══════════════════════════════════════════════════════════

function loadGhostData() {
  try {
    if (fs.existsSync(GHOST_FILE)) {
      return JSON.parse(fs.readFileSync(GHOST_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('[GHOST] ⚠️ Erreur chargement:', e.message);
  }
  return { contacts: {}, messages: {} };
}

function saveGhostData(data) {
  try {
    const dir = path.dirname(GHOST_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GHOST_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('[GHOST] ⚠️ Erreur sauvegarde:', e.message);
  }
}

// Initialiser les globals au chargement du module
// _ghostContacts: Map<JID_complet, { phone, addedAt, pushName, reason, allJids[] }>
// _ghostMessages: Map<JID_complet, [ { text, type, date, ... } ]>
function initGhostGlobals() {
  if (!global._ghostContacts) {
    const data = loadGhostData();
    global._ghostContacts = new Map(Object.entries(data.contacts || {}));
    global._ghostMessages = new Map(Object.entries(data.messages || {}).map(
      ([k, v]) => [k, Array.isArray(v) ? v : []]
    ));
    console.log(`[GHOST] 👻 ${global._ghostContacts.size} contact(s) fantôme(s) chargé(s)`);
  }
}
initGhostGlobals();

function saveGhostState() {
  const contacts = Object.fromEntries(global._ghostContacts);
  const messages = {};
  for (const [k, v] of global._ghostMessages) {
    messages[k] = v.slice(-500);
  }
  saveGhostData({ contacts, messages });
}

// Helper : vérifier si un JID est un contact fantôme
// Compare le JID complet ET le remoteJid du chat privé
function isGhostJid(jid) {
  if (!global._ghostContacts || global._ghostContacts.size === 0) return false;
  if (!jid) return false;
  
  // Match direct par JID complet
  if (global._ghostContacts.has(jid)) return true;
  
  // Match par n'importe quel JID stocké dans allJids
  for (const [key, info] of global._ghostContacts) {
    if (info.allJids && info.allJids.includes(jid)) return true;
    // Match aussi par le numéro de base du JID (avant @)
    const jidBase = jid.split('@')[0].split(':')[0];
    const keyBase = key.split('@')[0].split(':')[0];
    if (jidBase === keyBase) return true;
  }
  return false;
}

// Helper : trouver la clé ghost pour un JID
function findGhostKey(jid) {
  if (!jid || !global._ghostContacts) return null;
  if (global._ghostContacts.has(jid)) return jid;
  
  for (const [key, info] of global._ghostContacts) {
    if (info.allJids && info.allJids.includes(jid)) return key;
    const jidBase = jid.split('@')[0].split(':')[0];
    const keyBase = key.split('@')[0].split(':')[0];
    if (jidBase === keyBase) return key;
  }
  return null;
}

// Helper : trouver par numéro de téléphone
function findGhostByPhone(phone) {
  const clean = phone.replace(/[^0-9]/g, '');
  for (const [key, info] of global._ghostContacts) {
    if (info.phone === clean || info.phone?.endsWith(clean) || clean.endsWith(info.phone || '')) return key;
  }
  return null;
}

// Helper : résoudre le JID cible depuis un message (quoted) ou argument
function resolveTargetJid(msg, arg) {
  // Si on répond à un message, prendre le JID complet du participant
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (ctx?.participant) return ctx.participant;
  if (ctx?.remoteJid) return ctx.remoteJid;
  // Sinon retourner le numéro brut (sera résolu plus tard via onWhatsApp)
  if (arg[0]) return arg[0].replace(/[^0-9]/g, '');
  return null;
}

// ═══════════════════════════════════════════════════════════
// 👻 .hide — Faire disparaître un contact
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'hide',
    classe: 'Confidentialité',
    react: '👻',
    desc: 'Faire disparaître totalement un contact (messages, statuts, notifications)',
    alias: ['ghost', 'disparaitre', 'masquer'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const rawTarget = resolveTargetJid(msg, arg);
      if (!rawTarget || rawTarget.length < 4) {
        return repondre(
          '👻 *GHOST CONTACT — Mode d\'emploi*\n\n' +
          'Utilisation:\n' +
          '• `.hide 22550000000` — masquer par numéro\n' +
          '• Répondre à un message + `.hide` — masquer l\'auteur\n\n' +
          'Le contact va *totalement disparaître*:\n' +
          '❌ Plus de notifications\n' +
          '❌ Messages interceptés silencieusement\n' +
          '❌ Statuts invisibles\n' +
          '❌ Vues de vos statuts masquées\n\n' +
          '📋 `.hidden` — voir les contacts fantômes\n' +
          '👁️ `.unhide 225...` — faire réapparaître'
        );
      }

      // Résoudre le JID réel du contact
      let primaryJid = rawTarget;
      let phoneNumber = rawTarget.replace(/[^0-9]/g, '');
      let allJids = [];
      let resolvedName = null;

      // Si c'est déjà un JID complet (depuis un message quoté ou donné directement)
      if (rawTarget.includes('@')) {
        primaryJid = rawTarget;
        allJids.push(rawTarget);
        phoneNumber = rawTarget.split('@')[0].split(':')[0];
        // Récupérer le nom depuis le JID map
        const mapInfo = global._jidMap?.get(rawTarget);
        if (mapInfo) {
          resolvedName = mapInfo.pushName;
          if (mapInfo.chatJid && !allJids.includes(mapInfo.chatJid)) allJids.push(mapInfo.chatJid);
        }
      } else {
        // C'est un numéro ou un nom — chercher dans le JID map d'abord
        let foundInMap = false;
        if (global._jidMap && global._jidMap.size > 0) {
          const searchTerm = rawTarget.toLowerCase();
          // Chercher par nom (pushName) OU par numéro dans le JID
          for (const [jid, info] of global._jidMap) {
            const nameMatch = info.pushName && info.pushName.toLowerCase().includes(searchTerm);
            const jidMatch = jid.includes(phoneNumber) && phoneNumber.length >= 6;
            if (nameMatch || jidMatch) {
              primaryJid = jid;
              allJids.push(jid);
              if (info.chatJid && !allJids.includes(info.chatJid)) allJids.push(info.chatJid);
              resolvedName = info.pushName;
              foundInMap = true;
              console.log(`[GHOST] 📇 Trouvé dans JID map: "${info.pushName}" → ${jid}`);
              break;
            }
          }
        }
        
        // Si pas trouvé dans le map, essayer onWhatsApp()
        if (!foundInMap) {
          repondre(`🔍 Résolution du contact +${phoneNumber}...`);
          try {
            const results = await ovl.onWhatsApp(phoneNumber);
            if (results && results.length > 0) {
              primaryJid = results[0].jid;
              allJids = results.map(r => r.jid);
              console.log(`[GHOST] 🔍 Résolu via onWhatsApp: +${phoneNumber} → ${allJids.join(', ')}`);
            } else {
              primaryJid = phoneNumber + '@s.whatsapp.net';
              allJids.push(primaryJid);
              console.log(`[GHOST] ⚠️ Non trouvé, utilise ${primaryJid}`);
            }
          } catch (e) {
            primaryJid = phoneNumber + '@s.whatsapp.net';
            allJids.push(primaryJid);
            console.log(`[GHOST] ⚠️ onWhatsApp erreur: ${e.message}`);
          }
          
          // Aussi chercher le JID @lid dans le map qui correspond au JID @s.whatsapp.net résolu
          if (global._jidMap) {
            for (const [jid, info] of global._jidMap) {
              if (info.chatJid && allJids.includes(info.chatJid) && !allJids.includes(jid)) {
                allJids.push(jid);
                resolvedName = resolvedName || info.pushName;
              }
            }
          }
        }
      }

      // Vérifier si déjà fantôme
      if (isGhostJid(primaryJid) || findGhostByPhone(phoneNumber)) {
        return repondre(`⚠️ Ce contact est déjà fantôme.\n\n👁️ Utilise \`.unhide ${phoneNumber}\` pour le faire réapparaître.`);
      }

      // Aussi chercher le JID @lid correspondant via le remoteJid du chat
      // (quand on tape dans un chat, le remoteJid peut être différent)
      const chatJid = msg.key?.remoteJid;
      if (chatJid && !chatJid.endsWith('@g.us') && chatJid !== primaryJid && !allJids.includes(chatJid)) {
        // Si la commande est envoyée depuis un chat privé avec cette personne
        // le remoteJid du chat EST le bon JID
      }

      // Actions pour faire disparaître
      // Baileys v2 exige lastMessages pour archive/markRead
      for (const jid of allJids) {
        // Muter 1 an
        try {
          await ovl.chatModify({ mute: Math.floor(Date.now()/1000) + 365*24*60*60 }, jid);
          console.log(`[GHOST] ✅ Muté: ${jid}`);
        } catch(e) { console.log(`[GHOST] mute err (${jid}):`, e.message); }
        
        // Archiver (avec un faux lastMessage si nécessaire)
        try {
          const fakeLast = [{ key: { remoteJid: jid, fromMe: false, id: 'ghost_init' }, messageTimestamp: Math.floor(Date.now()/1000) }];
          await ovl.chatModify({ archive: true, lastMessages: fakeLast }, jid);
          console.log(`[GHOST] ✅ Archivé: ${jid}`);
        } catch(e) { console.log(`[GHOST] archive err (${jid}):`, e.message); }
        
        // Marquer comme lu
        try {
          const fakeLast = [{ key: { remoteJid: jid, fromMe: false, id: 'ghost_init' }, messageTimestamp: Math.floor(Date.now()/1000) }];
          await ovl.chatModify({ markRead: true, lastMessages: fakeLast }, jid);
          console.log(`[GHOST] ✅ Marqué lu: ${jid}`);
        } catch(e) { console.log(`[GHOST] markRead err (${jid}):`, e.message); }
      }

      // Stocker avec le JID principal comme clé
      global._ghostContacts.set(primaryJid, {
        phone: phoneNumber,
        addedAt: new Date().toISOString(),
        pushName: resolvedName || null,
        reason: arg.length > 1 ? arg.slice(1).join(' ') : null,
        allJids: [...new Set(allJids)]
      });
      if (!global._ghostMessages.has(primaryJid)) {
        global._ghostMessages.set(primaryJid, []);
      }
      saveGhostState();

      const displayName = resolvedName || phoneNumber;
      repondre(
        `👻 *CONTACT FANTÔME ACTIVÉ*\n\n` +
        `� *${displayName}*\n` +
        `🔑 JID principal: \`${primaryJid}\`\n` +
        `${allJids.length > 1 ? `📋 ${allJids.length} JIDs liés détectés\n` : ''}` +
        `\n✅ Messages interceptés silencieusement\n` +
        `✅ Notifications bloquées\n` +
        `✅ Statuts masqués\n` +
        `✅ Chat archivé et muté\n\n` +
        `👁️ \`.unhide ${displayName}\` pour réapparaître\n` +
        `📋 \`.hidden\` pour voir la liste\n` +
        `💬 \`.hiddenmsgs ${displayName}\` pour lire ses messages`
      );

      console.log(`[GHOST] 👻 Contact fantôme ajouté: +${phoneNumber} (JID: ${primaryJid}, total JIDs: ${allJids.length})`);
    } catch (error) {
      console.error('[GHOST]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👁️ .unhide — Faire réapparaître un contact
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'unhide',
    classe: 'Confidentialité',
    react: '👁️',
    desc: 'Faire réapparaître un contact fantôme et recevoir ses messages stockés',
    alias: ['unghost', 'apparaitre', 'demasquer'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const rawTarget = resolveTargetJid(msg, arg);
      if (!rawTarget || rawTarget.length < 4) {
        return repondre('❌ Spécifie le numéro: `.unhide 22550000000`');
      }

      // Chercher le contact fantôme par JID ou par numéro
      let foundKey = null;
      if (rawTarget.includes('@')) {
        foundKey = findGhostKey(rawTarget);
      }
      if (!foundKey) {
        const phone = rawTarget.replace(/[^0-9]/g, '');
        foundKey = findGhostByPhone(phone);
      }
      if (!foundKey) {
        foundKey = findGhostKey(rawTarget);
      }

      if (!foundKey) {
        return repondre(`❌ Ce contact n'est pas un fantôme.\n\n📋 \`.hidden\` pour voir la liste.`);
      }

      const info = global._ghostContacts.get(foundKey);
      const storedMsgs = global._ghostMessages.get(foundKey) || [];
      const phone = info?.phone || foundKey.split('@')[0];

      // Désarchiver et unmute tous les JIDs
      const jidsToRestore = [...new Set([foundKey, ...(info?.allJids || [])])];
      for (const jid of jidsToRestore) {
        const fakeLast = [{ key: { remoteJid: jid, fromMe: false, id: 'ghost_restore' }, messageTimestamp: Math.floor(Date.now()/1000) }];
        try { await ovl.chatModify({ archive: false, lastMessages: fakeLast }, jid); } catch(e) {}
        try { await ovl.chatModify({ mute: null }, jid); } catch(e) {}
      }

      // Supprimer des fantômes
      global._ghostContacts.delete(foundKey);
      global._ghostMessages.delete(foundKey);
      saveGhostState();

      // Envoyer le résumé
      const myJid = msg.key?.remoteJid || ovl.user?.id;

      let report = `👁️ *CONTACT RÉAPPARU*\n\n`;
      report += `📱 *+${phone}*`;
      if (info?.pushName) report += ` (${info.pushName})`;
      report += `\n`;
      report += `📅 Fantôme depuis: ${new Date(info?.addedAt).toLocaleString('fr-FR')}\n\n`;

      if (storedMsgs.length === 0) {
        report += `📭 Aucun message reçu pendant la période fantôme.`;
      } else {
        report += `📬 *${storedMsgs.length} message(s)* intercepté(s):\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        const display = storedMsgs.slice(-30);
        if (storedMsgs.length > 30) {
          report += `_... ${storedMsgs.length - 30} message(s) antérieur(s) omis ..._\n\n`;
        }
        for (const m of display) {
          const prefix = m.fromGroup ? `👥 ${m.groupName || 'Groupe'}` : '💬';
          report += `┌ ${prefix} — ${m.date}\n`;
          if (m.text) {
            report += `└ "${m.text.substring(0, 200)}${m.text.length > 200 ? '...' : ''}"\n\n`;
          } else {
            report += `└ [${m.type || 'média'}]\n\n`;
          }
        }
      }

      report += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `✅ Notifications et messages rétablis.`;

      repondre(report);

      console.log(`[GHOST] 👁️ Contact réapparu: +${phone} (${storedMsgs.length} messages)`);
    } catch (error) {
      console.error('[GHOST]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 .hidden — Liste des contacts fantômes
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'hidden',
    classe: 'Confidentialité',
    react: '📋',
    desc: 'Voir la liste des contacts fantômes',
    alias: ['ghostlist', 'fantomes', 'listeghosts'],
    superUser: true
  },
  async (ovl, msg, { repondre }) => {
    try {
      if (!global._ghostContacts || global._ghostContacts.size === 0) {
        return repondre('📭 *Aucun contact fantôme.*\n\n👻 Utilise `.hide 225...` pour masquer un contact.');
      }

      let text = `👻 *CONTACTS FANTÔMES* (${global._ghostContacts.size})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      let i = 1;
      for (const [jid, info] of global._ghostContacts) {
        const msgs = global._ghostMessages.get(jid) || [];
        const since = new Date(info.addedAt).toLocaleDateString('fr-FR');
        const phone = info.phone || jid.split('@')[0];
        text += `*${i}.* 📱 +${phone}`;
        if (info.pushName) text += ` (${info.pushName})`;
        text += `\n`;
        text += `   🔑 JID: \`${jid}\`\n`;
        text += `   📅 Depuis: ${since}\n`;
        text += `   💬 Messages stockés: ${msgs.length}\n`;
        if (info.reason) text += `   📝 Raison: ${info.reason}\n`;
        text += `\n`;
        i++;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `👁️ \`.unhide <numéro>\` — faire réapparaître\n`;
      text += `💬 \`.hiddenmsgs <numéro>\` — lire les messages`;

      repondre(text);
    } catch (error) {
      console.error('[GHOST]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💬 .hiddenmsgs — Lire les messages d'un contact fantôme
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'hiddenmsgs',
    classe: 'Confidentialité',
    react: '💬',
    desc: 'Lire les messages stockés d\'un contact fantôme sans le faire réapparaître',
    alias: ['ghostmsgs', 'msgsfantome'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const target = (arg[0] || '').replace(/[^0-9@.]/g, '');
      if (!target || target.length < 4) {
        return repondre('❌ Spécifie le numéro: `.hiddenmsgs 22550000000`');
      }

      // Chercher par JID ou par numéro
      let foundKey = findGhostKey(target) || findGhostByPhone(target);
      if (!foundKey) {
        return repondre(`❌ Ce contact n'est pas un fantôme.`);
      }

      const info = global._ghostContacts.get(foundKey);
      const phone = info?.phone || foundKey.split('@')[0];
      const storedMsgs = global._ghostMessages.get(foundKey) || [];
      if (storedMsgs.length === 0) {
        return repondre(`📭 *+${phone}* — Aucun message stocké.`);
      }

      const count = parseInt(arg[1]) || 20;
      const display = storedMsgs.slice(-count);

      let text = `💬 *MESSAGES DE +${phone}* (${storedMsgs.length} total)\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (storedMsgs.length > count) {
        text += `_Affichage des ${count} derniers. Utilise \`.hiddenmsgs ${phone} 50\` pour en voir plus._\n\n`;
      }

      for (const m of display) {
        const prefix = m.fromGroup ? `👥 ${m.groupName || 'Groupe'}` : '💬';
        text += `┌ ${prefix} — ${m.date}\n`;
        if (m.text) {
          text += `└ "${m.text.substring(0, 200)}${m.text.length > 200 ? '...' : ''}"\n\n`;
        } else {
          text += `└ [${m.type || 'média'}]\n\n`;
        }
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `👁️ \`.unhide ${phone}\` — faire réapparaître\n`;
      text += `⚠️ Le contact reste fantôme.`;

      repondre(text);
    } catch (error) {
      console.error('[GHOST]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ .clearghost — Vider les messages stockés d'un fantôme
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'clearghost',
    classe: 'Confidentialité',
    react: '🗑️',
    desc: 'Vider les messages stockés d\'un contact fantôme',
    alias: ['clearghostmsgs'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const target = (arg[0] || '').replace(/[^0-9@.]/g, '');
      if (!target || target.length < 4) {
        return repondre('❌ Spécifie le numéro: `.clearghost 22550000000`');
      }

      let foundKey = findGhostKey(target) || findGhostByPhone(target);
      if (!foundKey) {
        return repondre(`❌ Ce contact n'est pas un fantôme.`);
      }

      const info = global._ghostContacts.get(foundKey);
      const phone = info?.phone || foundKey.split('@')[0];
      const count = (global._ghostMessages.get(foundKey) || []).length;
      global._ghostMessages.set(foundKey, []);
      saveGhostState();

      repondre(`🗑️ *${count} message(s)* supprimé(s) pour +${phone}.\nLe contact reste fantôme.`);
    } catch (error) {
      console.error('[GHOST]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📇 .jids — Voir tous les contacts connus (JID map)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'jids',
    classe: 'Confidentialité',
    react: '📇',
    desc: 'Voir la liste de tous les contacts connus avec leurs JIDs',
    alias: ['contacts', 'listjids', 'whoall'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (!global._jidMap || global._jidMap.size === 0) {
        return repondre('📭 *Aucun contact connu.*\n\nLes contacts s\'ajoutent automatiquement quand ils t\'envoient un message.');
      }

      const search = (arg[0] || '').toLowerCase();
      let entries = [...global._jidMap.entries()];
      
      // Filtrer si un terme de recherche est donné
      if (search) {
        entries = entries.filter(([jid, info]) => 
          (info.pushName || '').toLowerCase().includes(search) ||
          jid.toLowerCase().includes(search)
        );
      }

      // Trier par dernière activité
      entries.sort((a, b) => new Date(b[1].lastSeen || 0) - new Date(a[1].lastSeen || 0));

      const total = entries.length;
      const page = Math.max(1, parseInt(arg[1]) || 1);
      const perPage = 15;
      const start = (page - 1) * perPage;
      const display = entries.slice(start, start + perPage);
      const totalPages = Math.ceil(total / perPage);

      let text = `📇 *CONTACTS CONNUS* (${total}${search ? ` filtrés sur "${search}"` : ''})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      let i = start + 1;
      for (const [jid, info] of display) {
        const ghost = isGhostJid(jid) ? ' 👻' : '';
        const name = info.pushName || '???';
        const lastDate = info.lastSeen ? new Date(info.lastSeen).toLocaleDateString('fr-FR') : '?';
        text += `*${i}.* ${name}${ghost}\n`;
        text += `   🔑 \`${jid}\`\n`;
        if (info.chatJid && info.chatJid !== jid) text += `   💬 Chat: \`${info.chatJid}\`\n`;
        text += `   📊 ${info.msgCount || 0} msg — 📅 ${lastDate}\n\n`;
        i++;
      }

      if (totalPages > 1) {
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📄 Page ${page}/${totalPages}\n`;
        text += `💡 \`.jids ${search || ''} ${page + 1}\` → page suivante\n`;
      }
      
      text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🔍 \`.jids <nom>\` — chercher un contact\n`;
      text += `👻 \`.hide <JID>\` — masquer avec le JID exact`;

      repondre(text);
    } catch (error) {
      console.error('[JIDS]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔍 .whois — Identifier un contact par son JID ou pushName
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'whois',
    classe: 'Confidentialité',
    react: '🔍',
    desc: 'Identifier un contact: répondre à un message ou donner un nom/JID',
    alias: ['qui', 'identify'],
    superUser: true
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      // Si on répond à un message → identifier l'expéditeur
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid = ctx?.participant || null;
      
      if (!targetJid && arg[0]) {
        // Chercher par nom ou JID partiel
        const search = arg.join(' ').toLowerCase();
        for (const [jid, info] of (global._jidMap || new Map())) {
          if (jid.includes(search) || (info.pushName || '').toLowerCase().includes(search)) {
            targetJid = jid;
            break;
          }
        }
      }

      if (!targetJid) {
        return repondre('🔍 *WHOIS — Identifier un contact*\n\n• Réponds à un message + `.whois`\n• `.whois <nom>` — chercher par nom\n• `.whois <JID>` — chercher par JID');
      }

      const info = global._jidMap?.get(targetJid) || {};
      const ghost = isGhostJid(targetJid) ? '\n👻 *CE CONTACT EST FANTÔME*' : '';
      
      let text = `🔍 *IDENTIFICATION*\n\n`;
      text += `👤 *Nom:* ${info.pushName || 'Inconnu'}\n`;
      text += `🔑 *JID:* \`${targetJid}\`\n`;
      if (info.chatJid && info.chatJid !== targetJid) {
        text += `💬 *Chat JID:* \`${info.chatJid}\`\n`;
      }
      text += `📊 *Messages:* ${info.msgCount || 0}\n`;
      text += `📅 *Dernière activité:* ${info.lastSeen ? new Date(info.lastSeen).toLocaleString('fr-FR') : 'Inconnue'}\n`;
      text += ghost;
      text += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `👻 Pour masquer: \`.hide ${targetJid}\``;

      repondre(text);
    } catch (error) {
      console.error('[WHOIS]', error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// Exporter les helpers pour start.js
module.exports = { isGhostJid, findGhostKey, findGhostByPhone, saveGhostState };
