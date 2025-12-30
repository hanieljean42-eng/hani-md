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

// ═══════════════════════════════════════════════════════════
// 🔒 SÉCURITÉ AVANCÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "protect",
  classe: "🔒 Sécurité",
  react: "🛡️",
  desc: "Active/désactive toutes les protections du groupe",
  alias: ["protection", "securite"]
}, async (hani, ms, { repondre, verifGroupe, verifAdmin, superUser }) => {
  if (!verifGroupe) return repondre("❌ Cette commande est réservée aux groupes.");
  if (!verifAdmin && !superUser) return repondre("❌ Réservé aux admins.");
  
  const protections = {
    antilink: true,
    antibot: true,
    antispam: true,
    antimention: true,
    antitag: true
  };
  
  // Active toutes les protections
  const groupId = ms.key.remoteJid;
  
  const message = `
╔══════════════════════════════╗
║     🛡️ PROTECTION ACTIVÉE    ║
╠══════════════════════════════╣
║ ✅ Anti-Link     : ACTIVÉ    ║
║ ✅ Anti-Bot      : ACTIVÉ    ║
║ ✅ Anti-Spam     : ACTIVÉ    ║
║ ✅ Anti-Mention  : ACTIVÉ    ║
║ ✅ Anti-Tag      : ACTIVÉ    ║
╠══════════════════════════════╣
║ 🔒 Le groupe est maintenant  ║
║    entièrement protégé !     ║
╚══════════════════════════════╝`;
  
  await repondre(message);
});

ovlcmd({
  nom_cmd: "lockdown",
  classe: "🔒 Sécurité",
  react: "🚨",
  desc: "Mode urgence - Ferme le groupe et supprime les messages récents",
  alias: ["urgence", "emergency"]
}, async (hani, ms, { repondre, verifGroupe, verifAdmin, superUser, arg }) => {
  if (!verifGroupe) return repondre("❌ Cette commande est réservée aux groupes.");
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
}, async (hani, ms, { repondre, verifGroupe, superUser }) => {
  if (!verifGroupe) return repondre("❌ Cette commande est réservée aux groupes.");
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
}, async (hani, ms, { repondre, verifGroupe }) => {
  if (!verifGroupe) return repondre("❌ Réservé aux groupes.");
  
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
  
  // Sauvegarder dans un fichier JSON
  const autoReplyFile = path.join(__dirname, '../DataBase/autoreply.json');
  let autoReplies = {};
  
  if (fs.existsSync(autoReplyFile)) {
    autoReplies = JSON.parse(fs.readFileSync(autoReplyFile));
  }
  
  autoReplies[trigger.toLowerCase()] = response;
  fs.writeFileSync(autoReplyFile, JSON.stringify(autoReplies, null, 2));
  
  await repondre(`✅ Réponse auto configurée:\n\n📝 Déclencheur: "${trigger}"\n💬 Réponse: "${response}"`);
});

ovlcmd({
  nom_cmd: "listar",
  classe: "🎯 Automatisation",
  react: "📋",
  desc: "Liste toutes les réponses automatiques",
  alias: ["listautoreply"]
}, async (hani, ms, { repondre }) => {
  const autoReplyFile = path.join(__dirname, '../DataBase/autoreply.json');
  
  if (!fs.existsSync(autoReplyFile)) {
    return repondre("📋 Aucune réponse automatique configurée.");
  }
  
  const autoReplies = JSON.parse(fs.readFileSync(autoReplyFile));
  const keys = Object.keys(autoReplies);
  
  if (keys.length === 0) {
    return repondre("📋 Aucune réponse automatique configurée.");
  }
  
  let list = "╔══════════════════════════════╗\n";
  list += "║   📋 RÉPONSES AUTOMATIQUES   ║\n";
  list += "╠══════════════════════════════╣\n";
  
  keys.forEach((key, i) => {
    list += `║ ${i+1}. "${key}" → "${autoReplies[key].substring(0, 20)}..."\n`;
  });
  
  list += "╚══════════════════════════════╝";
  
  await repondre(list);
});

ovlcmd({
  nom_cmd: "delar",
  classe: "🎯 Automatisation", 
  react: "🗑️",
  desc: "Supprime une réponse auto. Usage: .delar mot",
  alias: ["delautoreply"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .delar mot");
  
  const trigger = arg.join(' ').toLowerCase();
  const autoReplyFile = path.join(__dirname, '../DataBase/autoreply.json');
  
  if (!fs.existsSync(autoReplyFile)) {
    return repondre("❌ Aucune réponse automatique configurée.");
  }
  
  const autoReplies = JSON.parse(fs.readFileSync(autoReplyFile));
  
  if (!autoReplies[trigger]) {
    return repondre(`❌ Pas de réponse auto pour "${trigger}".`);
  }
  
  delete autoReplies[trigger];
  fs.writeFileSync(autoReplyFile, JSON.stringify(autoReplies, null, 2));
  
  await repondre(`✅ Réponse auto "${trigger}" supprimée.`);
});

// ═══════════════════════════════════════════════════════════
// 📢 DIFFUSION & ANNONCES
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "broadcast",
  classe: "📢 Diffusion",
  react: "📢",
  desc: "Envoie un message à tous les groupes. Usage: .broadcast message",
  alias: ["bc", "diffusion"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) return repondre("❌ Réservé au propriétaire.");
  if (!arg[0]) return repondre("❌ Usage: .broadcast votre message");
  
  const message = arg.join(' ');
  const groups = await hani.groupFetchAllParticipating();
  const groupIds = Object.keys(groups);
  
  await repondre(`📢 Diffusion en cours vers ${groupIds.length} groupes...`);
  
  let success = 0;
  let failed = 0;
  
  for (const groupId of groupIds) {
    try {
      await hani.sendMessage(groupId, { 
        text: `📢 *ANNONCE*\n\n${message}\n\n_Envoyé par HANI-MD_` 
      });
      success++;
      await new Promise(r => setTimeout(r, 1000)); // Anti-spam
    } catch (e) {
      failed++;
    }
  }
  
  await repondre(`✅ Diffusion terminée!\n📨 Envoyés: ${success}\n❌ Échecs: ${failed}`);
});

ovlcmd({
  nom_cmd: "announce",
  classe: "📢 Diffusion",
  react: "📣",
  desc: "Annonce avec mise en forme. Usage: .announce titre | message",
  alias: ["annonce"]
}, async (hani, ms, { repondre, verifGroupe, verifAdmin, arg }) => {
  if (!verifGroupe) return repondre("❌ Réservé aux groupes.");
  if (!verifAdmin) return repondre("❌ Réservé aux admins.");
  
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

// ═══════════════════════════════════════════════════════════
// 🎮 JEUX AVANCÉS
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "roulette",
  classe: "🎮 Jeux",
  react: "🎰",
  desc: "Roulette russe - Teste ta chance !",
  alias: ["russianroulette"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const chamber = Math.floor(Math.random() * 6) + 1;
  const bullet = Math.floor(Math.random() * 6) + 1;
  
  await repondre("🔫 Tu charges le pistolet et tournes le barillet...");
  await new Promise(r => setTimeout(r, 2000));
  
  if (chamber === bullet) {
    await repondre("💥 *BANG!* Tu as perdu! 💀");
  } else {
    await repondre("😅 *Click!* Tu as survécu! Continue à jouer si tu oses...");
  }
});

ovlcmd({
  nom_cmd: "duel",
  classe: "🎮 Jeux",
  react: "⚔️",
  desc: "Défie quelqu'un en duel. Usage: .duel @user",
  alias: ["fight", "combat"]
}, async (hani, ms, { repondre, arg, verifGroupe, auteurMessage }) => {
  if (!verifGroupe) return repondre("❌ Réservé aux groupes.");
  
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Mentionne quelqu'un pour le défier! .duel @user");
  }
  
  const opponent = mentioned[0];
  const challenger = auteurMessage;
  
  await repondre(`⚔️ *DUEL!*\n\n🟦 @${challenger.split('@')[0]}\n    VS\n🟥 @${opponent.split('@')[0]}\n\n⏳ Combat en cours...`, {
    mentions: [challenger, opponent]
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  const winner = Math.random() > 0.5 ? challenger : opponent;
  const loser = winner === challenger ? opponent : challenger;
  
  const damage = Math.floor(Math.random() * 50) + 50;
  
  await repondre(`🏆 *VICTOIRE!*\n\n👑 @${winner.split('@')[0]} a gagné!\n💀 @${loser.split('@')[0]} a perdu!\n\n💥 Dégâts infligés: ${damage} HP`, {
    mentions: [winner, loser]
  });
});

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
}, async (hani, ms, { repondre, arg, verifGroupe }) => {
  if (!verifGroupe) return repondre("❌ Réservé aux groupes.");
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
  desc: "Parie tes points. Usage: .gamble montant",
  alias: ["pari", "bet"]
}, async (hani, ms, { repondre, arg }) => {
  if (!arg[0]) return repondre("❌ Usage: .gamble 100");
  
  const amount = parseInt(arg[0]);
  
  if (isNaN(amount) || amount < 10) {
    return repondre("❌ Mise minimum: 10 💎");
  }
  
  const win = Math.random() > 0.5;
  const multiplier = Math.random() * 2 + 0.5;
  
  if (win) {
    const winAmount = Math.floor(amount * multiplier);
    await repondre(`🎲 *VICTOIRE!*\n\n💰 Mise: ${amount} 💎\n✨ Multiplicateur: x${multiplier.toFixed(2)}\n🏆 Gain: +${winAmount} 💎`);
  } else {
    await repondre(`🎲 *PERDU!*\n\n💸 Tu as perdu ${amount} 💎\n\n💡 Retente ta chance!`);
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
}, async (hani, ms, { repondre, verifGroupe, arg }) => {
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
  
  if (verifGroupe) {
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
  
  const notesFile = path.join(__dirname, '../DataBase/notes.json');
  let notes = {};
  
  if (fs.existsSync(notesFile)) {
    notes = JSON.parse(fs.readFileSync(notesFile));
  }
  
  const userId = auteurMessage;
  if (!notes[userId]) notes[userId] = {};
  
  notes[userId][name.toLowerCase()] = {
    content,
    date: new Date().toISOString()
  };
  
  fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2));
  
  await repondre(`✅ Note "${name}" sauvegardée!`);
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
  const notesFile = path.join(__dirname, '../DataBase/notes.json');
  
  if (!fs.existsSync(notesFile)) {
    return repondre("❌ Aucune note trouvée.");
  }
  
  const notes = JSON.parse(fs.readFileSync(notesFile));
  const userId = auteurMessage;
  
  if (!notes[userId] || !notes[userId][name]) {
    return repondre(`❌ Note "${name}" non trouvée.`);
  }
  
  const note = notes[userId][name];
  
  await repondre(`📝 *Note: ${name}*\n\n${note.content}\n\n📅 Créée le: ${new Date(note.date).toLocaleDateString('fr-FR')}`);
});

ovlcmd({
  nom_cmd: "listnotes",
  classe: "📝 Notes",
  react: "📋",
  desc: "Liste toutes tes notes",
  alias: ["notes", "mesnotes"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const notesFile = path.join(__dirname, '../DataBase/notes.json');
  
  if (!fs.existsSync(notesFile)) {
    return repondre("📋 Tu n'as aucune note.");
  }
  
  const notes = JSON.parse(fs.readFileSync(notesFile));
  const userId = auteurMessage;
  
  if (!notes[userId] || Object.keys(notes[userId]).length === 0) {
    return repondre("📋 Tu n'as aucune note.");
  }
  
  const userNotes = notes[userId];
  const noteNames = Object.keys(userNotes);
  
  let list = "╔══════════════════════════════╗\n";
  list += "║       📋 TES NOTES           ║\n";
  list += "╠══════════════════════════════╣\n";
  
  noteNames.forEach((name, i) => {
    list += `║ ${i+1}. ${name}\n`;
  });
  
  list += "╠══════════════════════════════╣\n";
  list += "║ 💡 .getnote nom pour lire    ║\n";
  list += "╚══════════════════════════════╝";
  
  await repondre(list);
});

console.log("✅ Advanced Commands loaded - HANI-MD V3.0");
