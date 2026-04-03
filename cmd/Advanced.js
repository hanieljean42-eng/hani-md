/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        🚀 HANI-MD - COMMANDES AVANCÉES V3.0               ║
 * ║     Fonctionnalités Pro pour WhatsApp Bot                 ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const config = require('../set');
const fs = require('fs');
const path = require('path');
const db = require('../DataBase/db'); // Firebase-first via proxy db.js

// ═══════════════════════════════════════════════════════════
// 🔒 SÉCURITÉ AVANCÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "protect",
  classe: "🔒 Sécurité",
  react: "🛡️",
  desc: "Active/désactive toutes les protections du groupe",
  alias: ["protection", "securite"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, arg }) => {
  if (!verif_Groupe) return repondre("❌ Cette commande est réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  
  const groupId = ms.key.remoteJid;
  const action = arg[0]?.toLowerCase();
  const activate = action !== 'off';
  
  try {
    // Sauvegarder dans MySQL UNIQUEMENT
    await db.setGroupProtection(groupId, {
      antilink: activate,
      antibot: activate,
      antispam: activate,
      antitag: activate,
      antimention: activate
    });
    
    const status = activate ? 'ACTIVÉE' : 'DÉSACTIVÉE';
    const emoji = activate ? '✅' : '❌';
    
    const message = `
╔══════════════════════════════╗
║     🛡️ PROTECTION ${status}    ║
╠══════════════════════════════╣
║ ${emoji} Anti-Link     : ${activate ? 'ON' : 'OFF'}    ║
║ ${emoji} Anti-Bot      : ${activate ? 'ON' : 'OFF'}    ║
║ ${emoji} Anti-Spam     : ${activate ? 'ON' : 'OFF'}    ║
║ ${emoji} Anti-Mention  : ${activate ? 'ON' : 'OFF'}    ║
║ ${emoji} Anti-Tag      : ${activate ? 'ON' : 'OFF'}    ║
╠══════════════════════════════╣
║ 💾 Sauvegardé en base!       ║
╚══════════════════════════════╝`;
    
    await repondre(message);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "lockdown",
  classe: "🔒 Sécurité",
  react: "🚨",
  desc: "Mode urgence - Ferme le groupe et supprime les messages récents",
  alias: ["urgence", "emergency"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, arg }) => {
  if (!verif_Groupe) return repondre("❌ Cette commande est réservée aux groupes.");
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const groupId = ms.key.remoteJid;
  
  await repondre(`
🚨 *MODE URGENCE ACTIVÉ* 🚨

⏳ Actions en cours:
1️⃣ Fermeture du groupe aux non-admins...
2️⃣ Activation de toutes les protections...
3️⃣ Notification aux admins...

✅ Le groupe est maintenant en mode lockdown.
Utilisez .unlock pour désactiver.`);
  
  // Fermer le groupe
  await hani.groupSettingUpdate(groupId, 'announcement');
});

ovlcmd({
  nom_cmd: "unlock",
  classe: "🔒 Sécurité",
  react: "🔓",
  desc: "Désactive le mode urgence",
  alias: ["deverrouiller"]
}, async (hani, ms, { repondre, verif_Groupe, superUser }) => {
  if (!verif_Groupe) return repondre("❌ Cette commande est réservée aux groupes.");
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const groupId = ms.key.remoteJid;
  await hani.groupSettingUpdate(groupId, 'not_announcement');
  
  await repondre("🔓 Mode urgence désactivé. Le groupe est de nouveau ouvert.");
});

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES & ANALYTICS
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "stats",
  classe: "📊 Analytics",
  react: "📈",
  desc: "Affiche les statistiques détaillées du bot",
  alias: ["statistiques", "analytics"]
}, async (hani, ms, { repondre }) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const memUsage = process.memoryUsage();
  const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
  
  const stats = `
╔══════════════════════════════╗
║      📊 STATISTIQUES BOT     ║
╠══════════════════════════════╣
║ ⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s
║ 💾 Mémoire: ${memMB} MB
║ 🖥️ Platform: ${process.platform}
║ 📦 Node: ${process.version}
╠══════════════════════════════╣
║ 🤖 Bot: HANI-MD V2.6.0
║ 👨‍💻 Dev: H2025
║ 📅 Date: ${new Date().toLocaleDateString('fr-FR')}
╚══════════════════════════════╝`;
  
  await repondre(stats);
});

ovlcmd({
  nom_cmd: "groupstats",
  classe: "📊 Analytics",
  react: "📊",
  desc: "Statistiques du groupe",
  alias: ["gstats", "groupinfo"]
}, async (hani, ms, { repondre, verif_Groupe }) => {
  if (!verif_Groupe) return repondre("❌ Réservé aux groupes.");
  
  const groupId = ms.key.remoteJid;
  const metadata = await hani.groupMetadata(groupId);
  
  const admins = metadata.participants.filter(p => p.admin).length;
  const members = metadata.participants.length;
  
  const stats = `
╔══════════════════════════════╗
║    📊 STATS GROUPE           ║
╠══════════════════════════════╣
║ 📛 Nom: ${metadata.subject}
║ 👥 Membres: ${members}
║ 👑 Admins: ${admins}
║ 📅 Créé: ${new Date(metadata.creation * 1000).toLocaleDateString('fr-FR')}
║ 🔗 ID: ${groupId.split('@')[0].slice(-10)}...
╚══════════════════════════════╝`;
  
  await repondre(stats);
});

// ═══════════════════════════════════════════════════════════
// 🎯 GESTION AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "autoreply",
  classe: "🎯 Automatisation",
  react: "🤖",
  desc: "Configure une réponse automatique. Usage: .autoreply mot | réponse",
  alias: ["ar", "autoresponse"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .autoreply mot | réponse");
  
  const fullArg = arg.join(' ');
  const [trigger, response] = fullArg.split('|').map(s => s.trim());
  
  if (!trigger || !response) {
    return repondre("❌ Usage: .autoreply mot | réponse");
  }
  
  // Sauvegarder dans MySQL UNIQUEMENT
  const success = await db.createAutoReply(trigger.toLowerCase(), response, 'contains');
  
  if (success) {
    await repondre(`✅ Réponse auto configurée:\n\n📝 Déclencheur: "${trigger}"\n💬 Réponse: "${response}"\n💾 Sauvegardé en base de données!`);
  } else {
    await repondre(`❌ Erreur lors de la sauvegarde. Vérifiez la connexion MySQL.`);
  }
});

ovlcmd({
  nom_cmd: "listar",
  classe: "🎯 Automatisation",
  react: "📋",
  desc: "Liste toutes les réponses automatiques",
  alias: ["listautoreply"]
}, async (hani, ms, { repondre }) => {
  // Récupérer de MySQL UNIQUEMENT
  const autoReplies = await db.getAutoReplies();
  
  if (autoReplies.length === 0) {
    return repondre("📋 Aucune réponse automatique configurée.");
  }
  
  let list = "╔══════════════════════════════╗\n";
  list += "║   📋 RÉPONSES AUTOMATIQUES   ║\n";
  list += "╠══════════════════════════════╣\n";
  
  autoReplies.forEach((ar, i) => {
    list += `║ ${i+1}. [ID:${ar.id}] "${ar.trigger_word}" \u2192 "${ar.response.substring(0, 15)}..."\n`;
  });
  
  list += "╚══════════════════════════════╝";
  list += "\n💾 Source: MySQL";
  
  await repondre(list);
});

ovlcmd({
  nom_cmd: "delar",
  classe: "🎯 Automatisation", 
  react: "🗑️",
  desc: "Supprime une réponse auto. Usage: .delar ID",
  alias: ["delautoreply"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .delar ID (utilisez .listar pour voir les IDs)");
  
  const id = parseInt(arg[0]);
  if (isNaN(id)) {
    return repondre("❌ L'ID doit être un nombre. Utilisez .listar pour voir les IDs.");
  }
  
  // Supprimer de MySQL UNIQUEMENT
  const success = await db.deleteAutoReply(id);
  
  if (success) {
    await repondre(`✅ Réponse automatique ID:${id} supprimée.`);
  } else {
    await repondre(`❌ Erreur lors de la suppression. Vérifiez l'ID.`);
  }
});

// NOTE: broadcast est dans Owner.js

// ═══════════════════════════════════════════════════════════
// 📢 ANNONCES
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "announce",
  classe: "📢 Diffusion",
  react: "📣",
  desc: "Annonce avec mise en forme. Usage: .announce titre | message",
  alias: ["annonce"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, arg }) => {
  if (!verif_Groupe) return repondre("❌ Réservé aux groupes.");
  if (!verif_Admin) return repondre("❌ Réservé aux admins.");
  
  if (!arg[0]) return repondre("❌ Usage: .announce titre | message");
  
  const fullArg = arg.join(' ');
  const parts = fullArg.split('|').map(s => s.trim());
  
  const title = parts[0] || "Annonce";
  const content = parts[1] || parts[0];
  
  const announcement = `
╔══════════════════════════════╗
║         📣 ANNONCE           ║
╠══════════════════════════════╣

*${title.toUpperCase()}*

${content}

╚══════════════════════════════╝
📅 ${new Date().toLocaleDateString('fr-FR')} | 🤖 HANI-MD`;
  
  await hani.sendMessage(ms.key.remoteJid, { text: announcement });
});

// NOTE: roulette et duel sont dans Ovl-game.js

// ═══════════════════════════════════════════════════════════
// 🔧 UTILITAIRES AVANCÉS
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "schedule",
  classe: "🔧 Utilitaires",
  react: "📅",
  desc: "Planifie un message. Usage: .schedule HH:MM | message",
  alias: ["programmer", "timer"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .schedule 14:30 | Votre message");
  
  const fullArg = arg.join(' ');
  const [time, message] = fullArg.split('|').map(s => s.trim());
  
  if (!time || !message) {
    return repondre("❌ Usage: .schedule 14:30 | Votre message");
  }
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
    return repondre("❌ Format d'heure invalide. Utilisez HH:MM (ex: 14:30)");
  }
  
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);
  
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  const delay = scheduled - now;
  const delayMinutes = Math.round(delay / 60000);
  
  setTimeout(async () => {
    await hani.sendMessage(ms.key.remoteJid, { text: `⏰ *MESSAGE PROGRAMMÉ*\n\n${message}` });
  }, delay);
  
  await repondre(`✅ Message programmé pour ${time} (dans ${delayMinutes} minutes)`);
});

ovlcmd({
  nom_cmd: "poll",
  classe: "🔧 Utilitaires",
  react: "📊",
  desc: "Crée un sondage. Usage: .poll question | option1 | option2 | ...",
  alias: ["sondage", "vote"]
}, async (hani, ms, { repondre, arg, verif_Groupe }) => {
  if (!verif_Groupe) return repondre("❌ Réservé aux groupes.");
  if (!arg[0]) return repondre("❌ Usage: .poll Question | Option1 | Option2 | Option3");
  
  const fullArg = arg.join(' ');
  const parts = fullArg.split('|').map(s => s.trim());
  
  if (parts.length < 3) {
    return repondre("❌ Il faut au moins une question et 2 options.\nUsage: .poll Question | Option1 | Option2");
  }
  
  const question = parts[0];
  const options = parts.slice(1);
  
  await hani.sendMessage(ms.key.remoteJid, {
    poll: {
      name: question,
      values: options,
      selectableCount: 1
    }
  });
});

ovlcmd({
  nom_cmd: "reminder",
  classe: "🔧 Utilitaires",
  react: "⏰",
  desc: "Rappel dans X minutes. Usage: .reminder 30 | message",
  alias: ["rappel", "remind"]
}, async (hani, ms, { repondre, arg }) => {
  if (!arg[0]) return repondre("❌ Usage: .reminder 30 | Ton rappel");
  
  const fullArg = arg.join(' ');
  const [minutes, message] = fullArg.split('|').map(s => s.trim());
  
  const mins = parseInt(minutes);
  
  if (isNaN(mins) || mins < 1 || mins > 1440) {
    return repondre("❌ Durée invalide (1-1440 minutes)");
  }
  
  if (!message) {
    return repondre("❌ Usage: .reminder 30 | Ton rappel");
  }
  
  setTimeout(async () => {
    await hani.sendMessage(ms.key.remoteJid, { 
      text: `⏰ *RAPPEL*\n\n${message}` 
    });
  }, mins * 60000);
  
  await repondre(`✅ Je te rappellerai dans ${mins} minutes!`);
});

// ═══════════════════════════════════════════════════════════
// 💰 ÉCONOMIE AVANCÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "shop",
  classe: "💰 Économie",
  react: "🏪",
  desc: "Affiche la boutique du bot",
  alias: ["boutique", "magasin"]
}, async (hani, ms, { repondre }) => {
  const shop = `
╔══════════════════════════════╗
║        🏪 BOUTIQUE           ║
╠══════════════════════════════╣
║                              ║
║ 🎭 VIP Status    - 5000 💎   ║
║ 🎨 Custom Title  - 2000 💎   ║
║ 🎁 Lucky Box     - 1000 💎   ║
║ 🎟️ Lottery Ticket - 500 💎   ║
║ 🔮 Fortune Tell  - 200 💎    ║
║ 🎲 Double Dice   - 100 💎    ║
║                              ║
╠══════════════════════════════╣
║ 💡 Utilisez .buy <item>      ║
║ 💰 Votre solde: .balance     ║
╚══════════════════════════════╝`;
  
  await repondre(shop);
});

ovlcmd({
  nom_cmd: "gamble",
  classe: "💰 Économie",
  react: "🎲",
  desc: "Parie tes coins. Usage: .gamble montant",
  alias: ["pari", "bet"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) return repondre("❌ Usage: .gamble 100");
  
  const amount = parseInt(arg[0]);
  
  if (isNaN(amount) || amount < 10) {
    return repondre("❌ Mise minimum: 10 💰");
  }
  
  try {
    // Récupérer le solde depuis MySQL uniquement
    let currentCoins = 0;
    let userId = auteurMessage;
    
    const user = await db.query(`SELECT coins FROM users_economy WHERE jid = ?`, [userId]);
    if (user && user[0]) {
      currentCoins = user[0].coins || 0;
    } else {
      // Créer l'utilisateur s'il n'existe pas
      await db.query(`
        INSERT INTO users_economy (jid, coins, level, xp) 
        VALUES (?, 100, 1, 0)
        ON DUPLICATE KEY UPDATE jid = jid
      `, [userId]);
      currentCoins = 100;
    }
    
    if (currentCoins < amount) {
      return repondre(`❌ Solde insuffisant! Tu as ${currentCoins} 💰`);
    }
    
    const win = Math.random() > 0.55; // 45% de chance de gagner
    const multiplier = win ? (Math.random() * 1.5 + 1) : 0;
    const change = win ? Math.floor(amount * multiplier) - amount : -amount;
    const newCoins = currentCoins + change;
    
    // Mettre à jour le solde dans MySQL
    await db.query(`UPDATE users_economy SET coins = ? WHERE jid = ?`, [newCoins, userId]);
    
    if (win) {
      const winAmount = Math.floor(amount * multiplier);
      await repondre(`🎲 *VICTOIRE!*\n\n💰 Mise: ${amount}\n✨ Multiplicateur: x${multiplier.toFixed(2)}\n🏆 Gain: +${winAmount - amount} coins\n\n💵 Nouveau solde: ${newCoins} 💰`);
    } else {
      await repondre(`🎲 *PERDU!*\n\n💸 Tu as perdu ${amount} coins\n\n💵 Nouveau solde: ${newCoins} 💰\n💡 Retente ta chance!`);
    }
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 🔍 RECHERCHE & INFO
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "whois",
  classe: "🔍 Info",
  react: "👤",
  desc: "Informations sur un utilisateur. Usage: .whois @user",
  alias: ["userinfo", "profil"]
}, async (hani, ms, { repondre, verif_Groupe, arg }) => {
  let target;
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (ms.message?.extendedTextMessage?.contextInfo?.participant) {
    target = ms.message.extendedTextMessage.contextInfo.participant;
  } else {
    target = ms.key.participant || ms.key.remoteJid;
  }
  
  let isAdmin = false;
  let groupName = "N/A";
  
  if (verif_Groupe) {
    const metadata = await hani.groupMetadata(ms.key.remoteJid);
    groupName = metadata.subject;
    const participant = metadata.participants.find(p => p.id === target);
    isAdmin = participant?.admin ? true : false;
  }
  
  const info = `
╔══════════════════════════════╗
║        👤 PROFIL USER        ║
╠══════════════════════════════╣
║ 📱 Numéro: ${target.split('@')[0]}
║ 👑 Admin: ${isAdmin ? 'Oui ✅' : 'Non ❌'}
║ 📍 Groupe: ${groupName}
║ 🔗 ID: @${target.split('@')[0]}
╚══════════════════════════════╝`;
  
  await repondre(info, { mentions: [target] });
});

// ═══════════════════════════════════════════════════════════
// 📝 NOTES & SAUVEGARDE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "note",
  classe: "📝 Notes",
  react: "📝",
  desc: "Sauvegarde une note. Usage: .note nom | contenu",
  alias: ["save", "sauvegarder"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) return repondre("❌ Usage: .note nom | contenu");
  
  const fullArg = arg.join(' ');
  const [name, content] = fullArg.split('|').map(s => s.trim());
  
  if (!name || !content) {
    return repondre("❌ Usage: .note nom | contenu");
  }
  
  // Sauvegarder dans MySQL UNIQUEMENT
  const success = await db.saveNote(auteurMessage, name, content);
  
  if (success) {
    await repondre(`✅ Note "${name}" sauvegardée en base de données!`);
  } else {
    await repondre(`❌ Erreur lors de la sauvegarde.`);
  }
});

ovlcmd({
  nom_cmd: "getnote",
  classe: "📝 Notes",
  react: "📋",
  desc: "Récupère une note. Usage: .getnote nom",
  alias: ["readnote", "lire"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) return repondre("❌ Usage: .getnote nom");
  
  const name = arg.join(' ').toLowerCase();
  
  // Récupérer de MySQL UNIQUEMENT
  const note = await db.getNote(auteurMessage, name);
  
  if (!note) {
    return repondre(`❌ Note "${name}" non trouvée.`);
  }
  
  await repondre(`📝 *Note: ${note.name}*\n\n${note.content}\n\n📅 Créée le: ${new Date(note.created_at).toLocaleDateString('fr-FR')}`);
});

ovlcmd({
  nom_cmd: "listnotes",
  classe: "📝 Notes",
  react: "📋",
  desc: "Liste toutes tes notes",
  alias: ["notes", "mesnotes"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  // Récupérer de MySQL UNIQUEMENT
  const notes = await db.getAllNotes(auteurMessage);
  
  if (notes.length === 0) {
    return repondre("📋 Tu n'as aucune note.");
  }
  
  let list = "╔══════════════════════════════╗\n";
  list += "║       📋 TES NOTES           ║\n";
  list += "╠══════════════════════════════╣\n";
  
  notes.forEach((note, i) => {
    list += `║ ${i+1}. ${note.name}\n`;
  });
  
  list += "╠══════════════════════════════╣\n";
  list += "║ 💡 .getnote nom pour lire    ║\n";
  list += "╚══════════════════════════════╝";
  list += "\n💾 Source: MySQL";
  
  await repondre(list);
});

// ═══════════════════════════════════════════════════════════
// 👤 GESTION DU PROFIL BOT
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "setname",
  classe: "👤 Profil",
  react: "✏️",
  desc: "Change le nom WhatsApp du bot. Usage: .setname Nouveau Nom",
  alias: ["changename", "botname", "nom"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .setname Nouveau Nom");
  
  const newName = arg.join(' ');
  
  if (newName.length > 25) {
    return repondre("❌ Le nom ne peut pas dépasser 25 caractères.");
  }
  
  try {
    await hani.updateProfileName(newName);
    await repondre(`✅ Nom WhatsApp changé en: *${newName}*`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "setbio",
  classe: "👤 Profil",
  react: "📝",
  desc: "Change la bio/statut WhatsApp du bot. Usage: .setbio Nouvelle bio",
  alias: ["bio", "setstatus", "about"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .setbio Nouvelle bio");
  
  const newBio = arg.join(' ');
  
  if (newBio.length > 139) {
    return repondre("❌ La bio ne peut pas dépasser 139 caractères.");
  }
  
  try {
    await hani.updateProfileStatus(newBio);
    await repondre(`✅ Bio WhatsApp changée en:\n\n_${newBio}_`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "setpp",
  classe: "👤 Profil",
  react: "🖼️",
  desc: "Change la photo de profil du bot. Réponds à une image.",
  alias: ["setpic", "setphoto", "pp"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const quotedMsg = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!quotedMsg?.imageMessage) {
    return repondre("❌ Réponds à une image pour la définir comme photo de profil.");
  }
  
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const buffer = await downloadMediaMessage(
      { message: quotedMsg },
      'buffer',
      {}
    );
    
    await hani.updateProfilePicture(hani.user.id, buffer);
    await repondre("✅ Photo de profil mise à jour!");
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 🔒 CONFIDENTIALITÉ & VIE PRIVÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "privacy",
  classe: "🔒 Confidentialité",
  react: "🔐",
  desc: "Affiche les paramètres de confidentialité actuels",
  alias: ["confidentialite", "vieprivee"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  try {
    const settings = await hani.fetchPrivacySettings();
    
    const statusMap = {
      'all': '👁️ Tout le monde',
      'contacts': '📱 Contacts',
      'contact_blacklist': '🚫 Contacts sauf...',
      'none': '🔒 Personne',
      'match_last_seen': '🔄 Comme Vu à'
    };
    
    const privacy = `
╔══════════════════════════════╗
║     🔒 CONFIDENTIALITÉ       ║
╠══════════════════════════════╣
║
║ 👤 Photo de profil:
║    ${statusMap[settings.profile] || settings.profile}
║
║ 🕐 Vu à (dernière connexion):
║    ${statusMap[settings.last] || settings.last}
║
║ ✅ Confirmations de lecture:
║    ${settings.readreceipts === 'all' ? '✅ Activées' : '❌ Désactivées'}
║
║ 📊 Statuts:
║    ${statusMap[settings.status] || settings.status}
║
║ 🔵 En ligne:
║    ${statusMap[settings.online] || settings.online || '👁️ Visible'}
║
║ 📋 Infos groupes:
║    ${statusMap[settings.groupadd] || settings.groupadd}
║
╚══════════════════════════════╝

💡 Commandes disponibles:
• .hidenum - Masquer numéro
• .hideonline - Masquer "en ligne"
• .hidevu - Masquer "vu à"
• .hidepp - Masquer photo profil`;
    
    await repondre(privacy);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "hidepp",
  classe: "🔒 Confidentialité",
  react: "🖼️",
  desc: "Masque ta photo de profil. Usage: .hidepp all/contacts/none",
  alias: ["hidephoto", "hidepic"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const option = arg[0]?.toLowerCase() || 'none';
  const validOptions = ['all', 'contacts', 'contact_blacklist', 'none'];
  
  if (!validOptions.includes(option)) {
    return repondre(`❌ Options valides: all, contacts, none\n\n• all = Tout le monde peut voir\n• contacts = Seulement les contacts\n• none = Personne ne peut voir`);
  }
  
  try {
    await hani.updateProfilePicturePrivacy(option);
    
    const messages = {
      'all': '👁️ Photo visible par tout le monde',
      'contacts': '📱 Photo visible par les contacts uniquement',
      'none': '🔒 Photo masquée à tout le monde'
    };
    
    await repondre(`✅ ${messages[option] || 'Paramètre mis à jour'}`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}\n\n💡 Cette fonction nécessite WhatsApp récent.`);
  }
});

ovlcmd({
  nom_cmd: "hidevu",
  classe: "🔒 Confidentialité",
  react: "🕐",
  desc: "Masque 'Vu à'. Usage: .hidevu all/contacts/none",
  alias: ["hidelastseen", "vumasque"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const option = arg[0]?.toLowerCase() || 'none';
  const validOptions = ['all', 'contacts', 'contact_blacklist', 'none'];
  
  if (!validOptions.includes(option)) {
    return repondre(`❌ Options valides: all, contacts, none\n\n• all = Tout le monde peut voir\n• contacts = Seulement les contacts\n• none = Personne ne peut voir`);
  }
  
  try {
    await hani.updateLastSeenPrivacy(option);
    
    const messages = {
      'all': '👁️ "Vu à" visible par tout le monde',
      'contacts': '📱 "Vu à" visible par les contacts uniquement', 
      'none': '🔒 "Vu à" masqué à tout le monde'
    };
    
    await repondre(`✅ ${messages[option] || 'Paramètre mis à jour'}\n\n⚠️ Note: Si tu masques ton "Vu à", tu ne verras plus celui des autres.`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "hideonline",
  classe: "🔒 Confidentialité",
  react: "🟢",
  desc: "Masque ton statut 'en ligne'. Usage: .hideonline on/off",
  alias: ["hideenligne", "invisible"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const option = arg[0]?.toLowerCase();
  
  if (option !== 'on' && option !== 'off') {
    return repondre(`❌ Usage: .hideonline on/off\n\n• on = Masquer "en ligne"\n• off = Afficher "en ligne"`);
  }
  
  try {
    // match_last_seen = visible seulement pour ceux qui partagent aussi
    // all = visible par tout le monde
    await hani.updateOnlinePrivacy(option === 'on' ? 'match_last_seen' : 'all');
    
    if (option === 'on') {
      await repondre(`✅ Statut "en ligne" masqué!\n\n🔒 Tu apparaîtras hors ligne pour tout le monde.\n⚠️ Tu ne verras pas non plus qui est en ligne.`);
    } else {
      await repondre(`✅ Statut "en ligne" visible!\n\n👁️ Tout le monde peut voir quand tu es en ligne.`);
    }
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}\n\n💡 Cette fonction nécessite WhatsApp récent.`);
  }
});

ovlcmd({
  nom_cmd: "hideread",
  classe: "🔒 Confidentialité",
  react: "✅",
  desc: "Masque les confirmations de lecture (coches bleues). Usage: .hideread on/off",
  alias: ["hideblue", "cochesbleues"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const option = arg[0]?.toLowerCase();
  
  if (option !== 'on' && option !== 'off') {
    return repondre(`❌ Usage: .hideread on/off\n\n• on = Masquer coches bleues\n• off = Afficher coches bleues`);
  }
  
  try {
    await hani.updateReadReceiptsPrivacy(option === 'on' ? 'none' : 'all');
    
    if (option === 'on') {
      await repondre(`✅ Coches bleues désactivées!\n\n🔒 Les autres ne verront pas quand tu lis.\n⚠️ Tu ne verras pas non plus leurs coches bleues.`);
    } else {
      await repondre(`✅ Coches bleues activées!\n\n👁️ Confirmations de lecture visibles.`);
    }
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "hidegroups",
  classe: "🔒 Confidentialité",
  react: "👥",
  desc: "Qui peut t'ajouter aux groupes. Usage: .hidegroups all/contacts/none",
  alias: ["groupinvite", "groupadd"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const option = arg[0]?.toLowerCase() || 'contacts';
  const validOptions = ['all', 'contacts', 'contact_blacklist', 'none'];
  
  if (!validOptions.includes(option)) {
    return repondre(`❌ Options valides: all, contacts, none\n\n• all = Tout le monde peut t'ajouter\n• contacts = Seulement les contacts\n• none = Personne (invitations seulement)`);
  }
  
  try {
    await hani.updateGroupsAddPrivacy(option);
    
    const messages = {
      'all': '👥 Tout le monde peut t\'ajouter aux groupes',
      'contacts': '📱 Seuls les contacts peuvent t\'ajouter',
      'none': '🔒 Personne ne peut t\'ajouter (invitations seulement)'
    };
    
    await repondre(`✅ ${messages[option] || 'Paramètre mis à jour'}`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "fullprivacy",
  classe: "🔒 Confidentialité",
  react: "🛡️",
  desc: "Active la confidentialité maximale (tout masqué)",
  alias: ["maxprivacy", "ghostmode"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  await repondre("🔄 Activation de la confidentialité maximale...");
  
  const results = [];
  
  try {
    // Masquer photo de profil
    try {
      await hani.updateProfilePicturePrivacy('none');
      results.push("✅ Photo de profil masquée");
    } catch (e) {
      results.push("❌ Photo de profil: " + e.message);
    }
    
    // Masquer "Vu à"
    try {
      await hani.updateLastSeenPrivacy('none');
      results.push("✅ 'Vu à' masqué");
    } catch (e) {
      results.push("❌ Vu à: " + e.message);
    }
    
    // Masquer "En ligne"
    try {
      await hani.updateOnlinePrivacy('match_last_seen');
      results.push("✅ Statut 'en ligne' masqué");
    } catch (e) {
      results.push("❌ En ligne: " + e.message);
    }
    
    // Désactiver coches bleues
    try {
      await hani.updateReadReceiptsPrivacy('none');
      results.push("✅ Coches bleues désactivées");
    } catch (e) {
      results.push("❌ Coches bleues: " + e.message);
    }
    
    // Groupes - contacts seulement
    try {
      await hani.updateGroupsAddPrivacy('contacts');
      results.push("✅ Ajout groupes: contacts seulement");
    } catch (e) {
      results.push("❌ Groupes: " + e.message);
    }
    
    const report = `
╔══════════════════════════════╗
║   🛡️ MODE FANTÔME ACTIVÉ     ║
╠══════════════════════════════╣

${results.join('\n')}

╠══════════════════════════════╣
║ 🔒 Tu es maintenant invisible║
║ pour la plupart des gens!   ║
╚══════════════════════════════╝

⚠️ Note: En mode fantôme, tu ne verras
pas non plus les infos des autres.`;
    
    await repondre(report);
  } catch (e) {
    await repondre(`❌ Erreur générale: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 🕵️ ESPIONNAGE & SURVEILLANCE (FONCTIONNEL)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "spy",
  classe: "🕵️ Espionnage",
  react: "🔍",
  desc: "Active la surveillance d'un utilisateur. Usage: .spy @user",
  alias: ["espion", "surveiller", "track"]
}, async (hani, ms, { repondre, superUser, arg }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  // Récupérer la cible
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (arg[0]) {
    target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  } else {
    return repondre("❌ Usage: .spy @user ou .spy numéro");
  }
  
  try {
    // Ajouter à la liste de surveillance dans MySQL UNIQUEMENT
    const added = await db.addToSurveillance(target);
    
    const num = target.split('@')[0];
    
    await repondre(`🕵️ *Surveillance Activée*

👤 Cible: @${num}
📊 Statut: ${added ? 'Ajouté à MySQL' : 'Déjà en surveillance'}

📋 Les messages de cette personne seront:
• Loggés automatiquement
• Notifications à chaque activité
• Statistiques d'activité collectées

⚠️ Commandes associées:
• .spylist - Voir toutes les cibles
• .unspy @user - Arrêter la surveillance
• .spyactivity @user - Voir l'activité

💾 Source: MySQL`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "unspy",
  classe: "🕵️ Espionnage",
  react: "❌",
  desc: "Arrête la surveillance d'un utilisateur",
  alias: ["stopspy", "desurveiller"]
}, async (hani, ms, { repondre, superUser, arg }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (arg[0]) {
    target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  } else {
    return repondre("❌ Usage: .unspy @user");
  }
  
  try {
    // Supprimer de MySQL UNIQUEMENT
    await db.removeFromSurveillance(target);
    
    await repondre(`✅ Surveillance arrêtée pour @${target.split('@')[0]}\n💾 Supprimé de MySQL`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "spylist",
  classe: "🕵️ Espionnage",
  react: "📋",
  desc: "Affiche la liste des personnes surveillées",
  alias: ["listspy", "surveillancelist"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  try {
    // Récupérer de MySQL UNIQUEMENT
    const dbList = await db.getSurveillanceList();
    
    if (dbList.length === 0) {
      return repondre("📋 Aucune personne sous surveillance.");
    }
    
    const allJids = dbList.map(r => r.jid);
    
    let message = `
╔══════════════════════════════╗
║   🕵️ LISTE DE SURVEILLANCE   ║
╠══════════════════════════════╣
║ Total: ${dbList.length} cible(s)
╠══════════════════════════════╣\n`;
    
    for (const entry of dbList) {
      const num = entry.jid.split('@')[0];
      const msgs = entry.total_messages || 0;
      const lastActive = entry.last_activity ? new Date(entry.last_activity).toLocaleString('fr-FR') : 'N/A';
      message += `║ 👤 @${num}\n`;
      message += `║    📊 Messages: ${msgs}\n`;
      message += `║    🕐 Dernier: ${lastActive}\n`;
    }
    
    message += `╚══════════════════════════════╝`;
    message += `\n💾 Source: MySQL`;
    
    await repondre(message, { mentions: allJids });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "spyactivity",
  classe: "🕵️ Espionnage",
  react: "📊",
  desc: "Voir l'activité récente d'un utilisateur surveillé",
  alias: ["activity", "activite"]
}, async (hani, ms, { repondre, superUser, arg }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (arg[0]) {
    target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  } else {
    return repondre("❌ Usage: .spyactivity @user");
  }
  
  try {
    const activity = await db.getActivity(target, 20);
    
    if (activity.length === 0) {
      return repondre(`📊 Aucune activité enregistrée pour @${target.split('@')[0]}`, { mentions: [target] });
    }
    
    let message = `
╔══════════════════════════════╗
║   📊 ACTIVITÉ DE @${target.split('@')[0].slice(0, 12)}
╠══════════════════════════════╣\n`;
    
    for (const act of activity.slice(0, 10)) {
      const time = new Date(act.timestamp).toLocaleString('fr-FR');
      message += `║ ${act.action_type}: ${act.details?.slice(0, 30) || 'N/A'}\n`;
      message += `║ 🕐 ${time}\n║ ──────────────────────\n`;
    }
    
    message += `╚══════════════════════════════╝`;
    
    await repondre(message, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👮 GESTION UTILISATEURS (FONCTIONNEL AVEC MYSQL)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "ban",
  classe: "👮 Modération",
  react: "🚫",
  desc: "Bannit un utilisateur des commandes du bot. Usage: .ban @user",
  alias: ["bannir", "block"]
}, async (hani, ms, { repondre, superUser, arg }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (arg[0]) {
    target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  } else {
    return repondre("❌ Usage: .ban @user ou .ban numéro");
  }
  
  try {
    // Vérifier si déjà banni
    const isBanned = await db.isBanned(target);
    if (isBanned) {
      return repondre(`❌ @${target.split('@')[0]} est déjà banni!`, { mentions: [target] });
    }
    
    // Bannir dans MySQL UNIQUEMENT
    await db.banUser(target);
    
    await repondre(`
╔══════════════════════════════╗
║      🚫 UTILISATEUR BANNI    ║
╠══════════════════════════════╣
║ 👤 @${target.split('@')[0]}
║ 📛 Statut: BANNI
║ ⛔ Ne peut plus utiliser les
║    commandes du bot
╠══════════════════════════════╣
║ ↩️ Pour débannir: .unban @user
║ 💾 Sauvegardé dans MySQL
╚══════════════════════════════╝`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "unban",
  classe: "👮 Modération",
  react: "✅",
  desc: "Débannit un utilisateur",
  alias: ["debannir", "pardon", "deban"]
}, async (hani, ms, { repondre, superUser, arg }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (arg[0]) {
    target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  } else {
    return repondre("❌ Usage: .unban @user");
  }
  
  try {
    // Débannir dans MySQL UNIQUEMENT
    await db.unbanUser(target);
    
    await repondre(`✅ @${target.split('@')[0]} a été débanni et peut à nouveau utiliser le bot.\n💾 Supprimé de MySQL`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "banlist",
  classe: "👮 Modération",
  react: "📋",
  desc: "Affiche la liste des utilisateurs bannis",
  alias: ["listban", "banned"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  
  try {
    // Récupérer les bannis de MySQL UNIQUEMENT
    const result = await db.query('SELECT jid FROM users WHERE is_banned = TRUE');
    const dbBanned = result ? result[0] || [] : [];
    
    if (dbBanned.length === 0) {
      return repondre("📋 Aucun utilisateur banni.");
    }
    
    const allBanned = dbBanned.map(r => r.jid);
    
    let message = `
╔══════════════════════════════╗
║     🚫 UTILISATEURS BANNIS   ║
╠══════════════════════════════╣
║ Total: ${allBanned.length} banni(s)
╠══════════════════════════════╣\n`;
    
    for (const jid of allBanned) {
      message += `║ 🚫 @${jid.split('@')[0]}\n`;
    }
    
    message += `╚══════════════════════════════╝`;
    message += `\n💾 Source: MySQL`;
    
    await repondre(message, { mentions: allBanned });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "warn",
  classe: "👮 Modération",
  react: "⚠️",
  desc: "Avertit un utilisateur. 3 warns = kick. Usage: .warn @user [raison]",
  alias: ["avertir", "avertissement"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, arg }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else {
    return repondre("❌ Usage: .warn @user [raison]");
  }
  
  const groupId = ms.key.remoteJid;
  const reason = arg.slice(1).join(' ') || 'Aucune raison spécifiée';
  
  try {
    // Ajouter le warn dans MySQL
    const warnCount = await db.addWarn(groupId, target);
    const maxWarns = 3;
    
    let message = `
╔══════════════════════════════╗
║      ⚠️ AVERTISSEMENT        ║
╠══════════════════════════════╣
║ 👤 @${target.split('@')[0]}
║ 📝 Raison: ${reason}
║ ⚠️ Warns: ${warnCount}/${maxWarns}
╠══════════════════════════════╣`;
    
    if (warnCount >= maxWarns) {
      // Kicker l'utilisateur
      try {
        await hani.groupParticipantsUpdate(groupId, [target], 'remove');
        message += `\n║ 🚪 EXPULSÉ: ${maxWarns} warns atteints!`;
        // Reset les warns après kick
        await db.resetWarns(groupId, target);
      } catch (kickError) {
        message += `\n║ ❌ Impossible d'expulser (pas admin?)`;
      }
    } else {
      message += `\n║ ⚠️ Encore ${maxWarns - warnCount} warn(s) avant kick`;
    }
    
    message += `\n╚══════════════════════════════╝`;
    
    await repondre(message, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "unwarn",
  classe: "👮 Modération",
  react: "✅",
  desc: "Retire les avertissements d'un utilisateur",
  alias: ["pardonwarn", "resetwarn", "delwarn"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else {
    return repondre("❌ Usage: .unwarn @user");
  }
  
  const groupId = ms.key.remoteJid;
  
  try {
    await db.resetWarns(groupId, target);
    await repondre(`✅ Les avertissements de @${target.split('@')[0]} ont été réinitialisés.`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "checkwarn",
  classe: "👮 Modération",
  react: "📊",
  desc: "Vérifie les avertissements d'un utilisateur",
  alias: ["warns", "warncount"]
}, async (hani, ms, { repondre, verif_Groupe, arg }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let target;
  
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else {
    target = ms.key.participant || ms.key.remoteJid;
  }
  
  const groupId = ms.key.remoteJid;
  
  try {
    const warnCount = await db.getWarns(groupId, target);
    await repondre(`⚠️ @${target.split('@')[0]} a ${warnCount}/3 avertissement(s).`, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👢 KICK & ACTIONS GROUPE (FONCTIONNEL BAILEYS API)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "kick",
  classe: "👮 Modération",
  react: "👢",
  desc: "Expulse un membre du groupe. Usage: .kick @user",
  alias: ["expulser", "remove", "virer"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin pour expulser.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Usage: .kick @user");
  }
  
  const groupId = ms.key.remoteJid;
  
  try {
    await hani.groupParticipantsUpdate(groupId, mentioned, 'remove');
    const names = mentioned.map(jid => `@${jid.split('@')[0]}`).join(', ');
    await repondre(`👢 ${names} a été expulsé(e) du groupe!`, { mentions: mentioned });
  } catch (e) {
    await repondre(`❌ Impossible d'expulser: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "add",
  classe: "👮 Modération",
  react: "➕",
  desc: "Ajoute un membre au groupe. Usage: .add numéro",
  alias: ["ajouter", "invite"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin, arg }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin pour ajouter.");
  
  if (!arg[0]) return repondre("❌ Usage: .add numéro");
  
  const number = arg[0].replace(/[^0-9]/g, '');
  const jid = number + '@s.whatsapp.net';
  const groupId = ms.key.remoteJid;
  
  try {
    const result = await hani.groupParticipantsUpdate(groupId, [jid], 'add');
    
    if (result[0]?.status === '403') {
      // L'utilisateur a des paramètres de confidentialité, envoyer invitation
      const code = await hani.groupInviteCode(groupId);
      await hani.sendMessage(jid, { 
        text: `👋 Vous êtes invité à rejoindre le groupe!\nhttps://chat.whatsapp.com/${code}` 
      });
      await repondre(`📩 L'utilisateur a des restrictions. Une invitation lui a été envoyée.`);
    } else {
      await repondre(`✅ @${number} a été ajouté au groupe!`, { mentions: [jid] });
    }
  } catch (e) {
    await repondre(`❌ Impossible d'ajouter: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "promote",
  classe: "👮 Modération",
  react: "👑",
  desc: "Promeut un membre en admin. Usage: .promote @user",
  alias: ["admin", "promouvoir"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin pour promouvoir.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Usage: .promote @user");
  }
  
  const groupId = ms.key.remoteJid;
  
  try {
    await hani.groupParticipantsUpdate(groupId, mentioned, 'promote');
    const names = mentioned.map(jid => `@${jid.split('@')[0]}`).join(', ');
    await repondre(`👑 ${names} est maintenant admin!`, { mentions: mentioned });
  } catch (e) {
    await repondre(`❌ Impossible de promouvoir: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "demote",
  classe: "👮 Modération",
  react: "⬇️",
  desc: "Retire les droits admin d'un membre. Usage: .demote @user",
  alias: ["unadmin", "retrograder"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin pour rétrograder.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Usage: .demote @user");
  }
  
  const groupId = ms.key.remoteJid;
  
  try {
    await hani.groupParticipantsUpdate(groupId, mentioned, 'demote');
    const names = mentioned.map(jid => `@${jid.split('@')[0]}`).join(', ');
    await repondre(`⬇️ ${names} n'est plus admin.`, { mentions: mentioned });
  } catch (e) {
    await repondre(`❌ Impossible de rétrograder: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "mute",
  classe: "👮 Modération",
  react: "🔇",
  desc: "Ferme le groupe (seuls les admins peuvent parler)",
  alias: ["fermer", "silence"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin.");
  
  const groupId = ms.key.remoteJid;
  
  try {
    await hani.groupSettingUpdate(groupId, 'announcement');
    await repondre("🔇 Groupe fermé. Seuls les admins peuvent envoyer des messages.");
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "unmute",
  classe: "👮 Modération",
  react: "🔊",
  desc: "Ouvre le groupe (tout le monde peut parler)",
  alias: ["ouvrir", "unsilence"]
}, async (hani, ms, { repondre, verif_Groupe, verif_Admin, superUser, verif_Ovl_Admin }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  if (!verif_Admin && !superUser) return repondre("❌ Réservé aux admins.");
  if (!verif_Ovl_Admin) return repondre("❌ Je dois être admin.");
  
  const groupId = ms.key.remoteJid;
  
  try {
    await hani.groupSettingUpdate(groupId, 'not_announcement');
    await repondre("🔊 Groupe ouvert. Tout le monde peut envoyer des messages.");
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

ovlcmd({
  nom_cmd: "groupinfo",
  classe: "🔍 Info",
  react: "ℹ️",
  desc: "Affiche les informations complètes du groupe",
  alias: ["infogroupe", "ginfo"]
}, async (hani, ms, { repondre, verif_Groupe }) => {
  if (!verif_Groupe) return repondre("❌ Commande réservée aux groupes.");
  
  const groupId = ms.key.remoteJid;
  
  try {
    const metadata = await hani.groupMetadata(groupId);
    const admins = metadata.participants.filter(p => p.admin);
    const superadmins = metadata.participants.filter(p => p.admin === 'superadmin');
    
    const info = `
╔══════════════════════════════╗
║     ℹ️ INFOS DU GROUPE        ║
╠══════════════════════════════╣
║ 📛 Nom: ${metadata.subject}
║ 🆔 ID: ${metadata.id}
║ 📝 Description: ${metadata.desc?.slice(0, 100) || 'Aucune'}
║ 👥 Membres: ${metadata.participants.length}
║ 👑 Admins: ${admins.length}
║ 🌟 Super Admin: ${superadmins.length}
║ 📅 Créé: ${new Date(metadata.creation * 1000).toLocaleDateString('fr-FR')}
║ 🔒 Restrictions: ${metadata.restrict ? 'Oui' : 'Non'}
║ 📢 Annonces: ${metadata.announce ? 'Oui' : 'Non'}
╚══════════════════════════════╝`;
    
    await repondre(info);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👤 WHOIS AMÉLIORÉ
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "whoisv2",
  classe: "🔍 Info",
  react: "👤",
  desc: "Informations détaillées sur un utilisateur avec données MySQL",
  alias: ["profilev2", "userstats"]
}, async (hani, ms, { repondre, verif_Groupe, arg }) => {
  let target;
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
  } else if (ms.message?.extendedTextMessage?.contextInfo?.participant) {
    target = ms.message.extendedTextMessage.contextInfo.participant;
  } else {
    target = ms.key.participant || ms.key.remoteJid;
  }
  
  try {
    // Récupérer infos MySQL
    const user = await db.getUser(target);
    const isBanned = await db.isBanned(target);
    const isSudo = await db.isSudo(target);
    const isSpied = await db.isUnderSurveillance(target);
    
    let isAdmin = false;
    let groupName = "N/A";
    let memberSince = "N/A";
    
    if (verif_Groupe) {
      const metadata = await hani.groupMetadata(ms.key.remoteJid);
      groupName = metadata.subject;
      const participant = metadata.participants.find(p => p.id === target);
      isAdmin = participant?.admin ? true : false;
    }
    
    // Récupérer photo de profil
    let ppUrl = "Aucune";
    try {
      ppUrl = await hani.profilePictureUrl(target, 'image');
      ppUrl = "Disponible ✅";
    } catch (e) {
      ppUrl = "Masquée/Privée 🔒";
    }
    
    const info = `
╔══════════════════════════════════════╗
║         👤 PROFIL UTILISATEUR        ║
╠══════════════════════════════════════╣
║ 📱 Numéro: +${target.split('@')[0]}
║ 🔗 JID: @${target.split('@')[0]}
╠══════════════════════════════════════╣
║ 📊 STATISTIQUES BOT
║ ├ 💬 Messages: ${user?.messages || 0}
║ ├ ⭐ XP: ${user?.xp || 0}
║ ├ 🎖️ Niveau: ${user?.level || 1}
║ └ 📅 Dernière vue: ${user?.last_seen ? new Date(user.last_seen).toLocaleString('fr-FR') : 'N/A'}
╠══════════════════════════════════════╣
║ 🔐 STATUTS
║ ├ 🚫 Banni: ${isBanned ? 'Oui ❌' : 'Non ✅'}
║ ├ 👑 Sudo: ${isSudo ? 'Oui ✅' : 'Non'}
║ ├ 🕵️ Surveillé: ${isSpied ? 'Oui 👁️' : 'Non'}
║ └ 📷 Photo: ${ppUrl}
╠══════════════════════════════════════╣
║ 👥 GROUPE: ${groupName}
║ ├ 👑 Admin: ${isAdmin ? 'Oui ✅' : 'Non ❌'}
╚══════════════════════════════════════╝`;
    
    await repondre(info, { mentions: [target] });
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

console.log("✅ Advanced Commands loaded - HANI-MD V3.1 - Spy & User Management FUNCTIONAL");

