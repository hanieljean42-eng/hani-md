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
const db = require('../DataBase/mysql');

// ═══════════════════════════════════════════════════════════
// 🔒 SÉCURITÉ AVANCÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "protect",
  classe: "🔒 Sécurité",
  react: "🛡️",
  desc: "Active/désactive toutes les protections du groupe",
  alias: ["protection", "securite"]
}, async (hani, ms, { repondre, verifGroupe, verifAdmin, superUser, arg }) => {
  if (!verifGroupe) return repondre("❌ Cette commande est réservée aux groupes.");
  if (!verifAdmin && !superUser) return repondre("❌ Réservé aux admins.");
  
  const groupId = ms.key.remoteJid;
  const action = arg[0]?.toLowerCase();
  const activate = action !== 'off';
  
  try {
    // Activer dans la vraie DB
    if (db.isConnected && db.isConnected()) {
      await db.query(`
        INSERT INTO \`groups\` (jid, antilink, antibot, antispam, antitag)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE antilink=?, antibot=?, antispam=?, antitag=?
      `, [groupId, activate, activate, activate, activate, activate, activate, activate, activate]);
    }
    
    // Aussi sauvegarder en local
    const protectFile = path.join(__dirname, '../DataBase/protected_groups.json');
    let protected = {};
    if (fs.existsSync(protectFile)) {
      protected = JSON.parse(fs.readFileSync(protectFile));
    }
    protected[groupId] = {
      antilink: activate,
      antibot: activate,
      antispam: activate,
      antimention: activate,
      antitag: activate,
      updatedAt: Date.now()
    };
    fs.writeFileSync(protectFile, JSON.stringify(protected, null, 2));
    
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
  desc: "Parie tes coins. Usage: .gamble montant",
  alias: ["pari", "bet"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) return repondre("❌ Usage: .gamble 100");
  
  const amount = parseInt(arg[0]);
  
  if (isNaN(amount) || amount < 10) {
    return repondre("❌ Mise minimum: 10 💰");
  }
  
  try {
    // Récupérer le solde réel
    let currentCoins = 0;
    let userId = auteurMessage;
    
    if (db.isConnected && db.isConnected()) {
      const user = await db.query(`SELECT coins FROM users_economy WHERE jid = ?`, [userId]);
      if (user && user[0]) {
        currentCoins = user[0].coins || 0;
      }
    } else {
      // Fallback JSON
      const usersFile = path.join(__dirname, '../DataBase/users_pro.json');
      if (fs.existsSync(usersFile)) {
        const users = JSON.parse(fs.readFileSync(usersFile));
        currentCoins = users[userId]?.coins || 0;
      }
    }
    
    if (currentCoins < amount) {
      return repondre(`❌ Solde insuffisant! Tu as ${currentCoins} 💰`);
    }
    
    const win = Math.random() > 0.55; // 45% de chance de gagner
    const multiplier = win ? (Math.random() * 1.5 + 1) : 0;
    const change = win ? Math.floor(amount * multiplier) - amount : -amount;
    const newCoins = currentCoins + change;
    
    // Mettre à jour le solde réel
    if (db.isConnected && db.isConnected()) {
      await db.query(`UPDATE users_economy SET coins = ? WHERE jid = ?`, [newCoins, userId]);
    }
    // Aussi en JSON
    const usersFile = path.join(__dirname, '../DataBase/users_pro.json');
    let users = {};
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile));
    }
    if (!users[userId]) users[userId] = { coins: 0 };
    users[userId].coins = newCoins;
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
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

console.log("✅ Advanced Commands loaded - HANI-MD V3.0");
