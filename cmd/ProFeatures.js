/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║      🌟 HANI-MD - FONCTIONNALITÉS PRO V3.0                ║
 * ║  Système de Niveaux, Badges, Achievements & Plus          ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const fs = require('fs');
const path = require('path');
const db = require('../DataBase/mysql');

// ═══════════════════════════════════════════════════════════
// 🗄️ FONCTIONS DATABASE (MySQL UNIQUEMENT)
// ═══════════════════════════════════════════════════════════

// Obtenir un utilisateur depuis MySQL
async function getUser(userId) {
  try {
    const user = await db.query(
      `SELECT * FROM users_economy WHERE jid = ?`, [userId]
    );
    if (user && user[0]) {
      return user[0];
    }
    // Créer l'utilisateur s'il n'existe pas
    await db.query(`
      INSERT INTO users_economy (jid, xp, level, coins, diamonds, streak, last_daily, badges, inventory, total_messages, created_at)
      VALUES (?, 0, 1, 100, 0, 0, NULL, '[]', '[]', 0, NOW())
      ON DUPLICATE KEY UPDATE jid = jid
    `, [userId]);
    return { jid: userId, xp: 0, level: 1, coins: 100, diamonds: 0, streak: 0, last_daily: null, badges: '[]', inventory: '[]', total_messages: 0 };
  } catch (e) {
    console.log('[ProFeatures] MySQL error:', e.message);
    return { jid: userId, xp: 0, level: 1, coins: 100, diamonds: 0, streak: 0, last_daily: null, badges: '[]', inventory: '[]', total_messages: 0 };
  }
}

// Mettre à jour un utilisateur dans MySQL
async function updateUser(userId, data) {
  try {
    const updates = [];
    const values = [];
    
    Object.entries(data).forEach(([key, value]) => {
      // Convertir les noms de champs
      const dbKey = key === 'lastDaily' ? 'last_daily' : 
                   key === 'totalMessages' ? 'total_messages' : key;
      if (typeof value === 'object') {
        updates.push(`${dbKey} = ?`);
        values.push(JSON.stringify(value));
      } else {
        updates.push(`${dbKey} = ?`);
        values.push(value);
      }
    });
    
    if (updates.length > 0) {
      values.push(userId);
      await db.query(`UPDATE users_economy SET ${updates.join(', ')} WHERE jid = ?`, values);
    }
    return data;
  } catch (e) {
    console.log('[ProFeatures] MySQL update error:', e.message);
    return data;
  }
}

// Calculer le niveau basé sur l'XP
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp)) + 1;
}

// XP requis pour le prochain niveau
function xpForNextLevel(level) {
  return Math.pow((level) * 10, 2);
}

// Créer la table économie si elle n'existe pas
async function initEconomyTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users_economy (
        jid VARCHAR(100) PRIMARY KEY,
        xp INT DEFAULT 0,
        level INT DEFAULT 1,
        coins INT DEFAULT 100,
        diamonds INT DEFAULT 0,
        streak INT DEFAULT 0,
        last_daily DATE NULL,
        badges JSON DEFAULT '[]',
        inventory JSON DEFAULT '[]',
        total_messages INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('[ProFeatures] Table users_economy ready');
  } catch (e) {
    console.log('[ProFeatures] Could not create economy table:', e.message);
  }
}

// Initialiser au démarrage
initEconomyTable();

// ═══════════════════════════════════════════════════════════
// 🏆 SYSTÈME DE NIVEAUX
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "level",
  classe: "🏆 Niveaux",
  react: "📊",
  desc: "Affiche ton niveau et XP",
  alias: ["lvl", "niveau", "rank"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const badges = typeof user.badges === 'string' ? JSON.parse(user.badges) : (user.badges || []);
    const xp = user.xp || 0;
    const level = user.level || 1;
    const coins = user.coins || 0;
    const diamonds = user.diamonds || 0;
    const totalMessages = user.total_messages || user.totalMessages || 0;
    
    const nextLevelXP = xpForNextLevel(level);
    const progress = Math.min(100, Math.floor((xp / nextLevelXP) * 100));
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    const levelEmoji = level >= 50 ? '👑' : level >= 30 ? '💎' : level >= 20 ? '⭐' : level >= 10 ? '🔥' : '📊';
    
    const card = `
╔══════════════════════════════╗
║     ${levelEmoji} CARTE DE NIVEAU ${levelEmoji}     ║
╠══════════════════════════════╣
║ 👤 @${auteurMessage.split('@')[0]}
║
║ 📊 Niveau: ${level}
║ ✨ XP: ${xp} / ${nextLevelXP}
║ 
║ [${progressBar}] ${progress}%
║
║ 💰 Coins: ${coins}
║ 💎 Diamants: ${diamonds}
║ 📨 Messages: ${totalMessages}
║ 🎖️ Badges: ${badges.length}
╚══════════════════════════════╝`;
    
    await repondre(card, { mentions: [auteurMessage] });
  } catch (e) {
    await repondre("❌ Erreur lors de la récupération de ton profil: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "leaderboard",
  classe: "🏆 Niveaux",
  react: "🏅",
  desc: "Classement des meilleurs joueurs",
  alias: ["lb", "top", "classement"]
}, async (hani, ms, { repondre }) => {
  try {
    let sorted = [];
    
    // Récupérer depuis MySQL
    const results = await db.query(`SELECT * FROM users_economy ORDER BY level DESC, xp DESC LIMIT 10`);
    if (results && results.length > 0) {
      sorted = results.map(u => ({ id: u.jid, level: u.level, xp: u.xp }));
    }
    
    if (sorted.length === 0) {
      return repondre("📊 Aucun utilisateur dans le classement. Utilise des commandes pour gagner de l'XP!");
    }
    
    let lb = "╔══════════════════════════════╗\n";
    lb += "║     🏆 TOP 10 JOUEURS        ║\n";
    lb += "╠══════════════════════════════╣\n";
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    sorted.forEach((user, i) => {
      const name = user.id.split('@')[0].slice(0, 10);
      lb += `║ ${medals[i]} Lv.${user.level} | ${name}... | ${user.xp}XP\n`;
    });
    
    lb += "╚══════════════════════════════╝";
    
    await repondre(lb);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 💰 ÉCONOMIE COMPLÈTE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "daily",
  classe: "💰 Économie",
  react: "🎁",
  desc: "Récompense quotidienne",
  alias: ["quotidien", "bonus"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format YYYY-MM-DD pour MySQL
    
    const lastDaily = user.last_daily || user.lastDaily;
    
    if (lastDaily === today) {
      return repondre("❌ Tu as déjà réclamé ta récompense aujourd'hui!\n⏰ Reviens demain!");
    }
    
    // Vérifier le streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const wasYesterday = lastDaily === yesterdayStr;
    
    let streak = wasYesterday ? (user.streak || 0) + 1 : 1;
    let coins = 100 + (streak * 25);
    let diamonds = streak >= 7 ? 5 : 0;
    let xp = 50 + (streak * 10);
    
    const currentCoins = user.coins || 0;
    const currentDiamonds = user.diamonds || 0;
    const currentXp = user.xp || 0;
    
    // Bonus streak
    let bonusMsg = "";
    if (streak === 7) {
      coins += 500;
      diamonds += 10;
      bonusMsg = "\n🔥 *STREAK DE 7 JOURS!* Bonus x2!";
    }
    
    await updateUser(auteurMessage, {
      coins: currentCoins + coins,
      diamonds: currentDiamonds + diamonds,
      xp: currentXp + xp,
      level: calculateLevel(currentXp + xp),
      streak,
      lastDaily: today,
      last_daily: today
    });
    
    const reward = `
╔══════════════════════════════╗
║     🎁 RÉCOMPENSE DAILY      ║
╠══════════════════════════════╣
║ 
║ 🔥 Streak: ${streak} jour(s)
║
║ 💰 Coins: +${coins} (Total: ${currentCoins + coins})
║ 💎 Diamants: +${diamonds} (Total: ${currentDiamonds + diamonds})
║ ✨ XP: +${xp} (Total: ${currentXp + xp})
║
╠══════════════════════════════╣
║ 💡 Reviens demain pour       ║
║    continuer ton streak!     ║
╚══════════════════════════════╝${bonusMsg}`;
    
    await repondre(reward);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "balance",
  classe: "💰 Économie",
  react: "💰",
  desc: "Affiche ton solde",
  alias: ["bal", "solde", "money"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const coins = user.coins || 0;
    const diamonds = user.diamonds || 0;
    const level = user.level || 1;
    const xp = user.xp || 0;
    
    const balance = `
╔══════════════════════════════╗
║       💰 TON PORTEFEUILLE    ║
╠══════════════════════════════╣
║ 
║ 💰 Coins: ${coins.toLocaleString()}
║ 💎 Diamants: ${diamonds.toLocaleString()}
║ 
║ 📊 Niveau: ${level}
║ ✨ XP: ${xp.toLocaleString()}
║
╚══════════════════════════════╝`;
    
    await repondre(balance);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "transfer",
  classe: "💰 Économie",
  react: "💸",
  desc: "Transfère des coins. Usage: .transfer @user montant",
  alias: ["pay", "give", "envoyer"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    
    if (!mentioned || mentioned.length === 0) {
      return repondre("❌ Mentionne quelqu'un! .transfer @user 100");
    }
    
    const amount = parseInt(arg[arg.length - 1]);
    
    if (isNaN(amount) || amount < 1) {
      return repondre("❌ Montant invalide! .transfer @user 100");
    }
    
    const sender = await getUser(auteurMessage);
    const receiver = await getUser(mentioned[0]);
    const senderCoins = sender.coins || 0;
    const receiverCoins = receiver.coins || 0;
    
    if (senderCoins < amount) {
      return repondre(`❌ Solde insuffisant! Tu as ${senderCoins} 💰`);
    }
    
    await updateUser(auteurMessage, { coins: senderCoins - amount });
    await updateUser(mentioned[0], { coins: receiverCoins + amount });
    
    await repondre(`✅ Transfert réussi!\n\n💸 ${amount} coins envoyés à @${mentioned[0].split('@')[0]}\n\n💰 Ton solde: ${senderCoins - amount} coins`, {
      mentions: [mentioned[0]]
    });
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "work",
  classe: "💰 Économie",
  react: "💼",
  desc: "Travaille pour gagner des coins",
  alias: ["travail", "job"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const currentCoins = user.coins || 0;
    const currentXp = user.xp || 0;
    const now = Date.now();
    const lastWork = user.last_work || user.lastWork || 0;
    
    // Cooldown de 30 minutes (1800000ms)
    const cooldown = 1800000;
    const timeLeft = cooldown - (now - lastWork);
    
    if (timeLeft > 0 && lastWork > 0) {
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      return repondre(`⏰ Tu dois attendre ${minutes}m ${seconds}s avant de retravailler!`);
    }
    
    const jobs = [
      { name: "Développeur", emoji: "💻", min: 50, max: 150 },
      { name: "Chef", emoji: "👨‍🍳", min: 40, max: 120 },
      { name: "Artiste", emoji: "🎨", min: 30, max: 100 },
      { name: "Musicien", emoji: "🎸", min: 35, max: 110 },
      { name: "Streamer", emoji: "🎮", min: 45, max: 140 },
      { name: "Photographe", emoji: "📷", min: 40, max: 130 },
      { name: "YouTuber", emoji: "📺", min: 55, max: 160 }
    ];
    
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
    const xpGained = Math.floor(earnings / 5);
    
    await updateUser(auteurMessage, {
      coins: currentCoins + earnings,
      xp: currentXp + xpGained,
      level: calculateLevel(currentXp + xpGained),
      lastWork: now,
      last_work: now
    });
    
    await repondre(`${job.emoji} *${job.name}*\n\n💼 Tu as travaillé dur!\n💰 Gagné: +${earnings} coins (Total: ${currentCoins + earnings})\n✨ XP: +${xpGained}\n\n⏰ Prochain travail dans 30 minutes`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "rob",
  classe: "💰 Économie",
  react: "🦹",
  desc: "Tente de voler quelqu'un. Usage: .rob @user",
  alias: ["steal", "voler"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    
    if (!mentioned || mentioned.length === 0) {
      return repondre("❌ Mentionne quelqu'un à voler! .rob @user");
    }
    
    if (mentioned[0] === auteurMessage) {
      return repondre("❌ Tu ne peux pas te voler toi-même!");
    }
    
    const robber = await getUser(auteurMessage);
    const victim = await getUser(mentioned[0]);
    const robberCoins = robber.coins || 0;
    const victimCoins = victim.coins || 0;
    
    // Cooldown de 10 minutes
    const now = Date.now();
    const lastRob = robber.last_rob || robber.lastRob || 0;
    const cooldown = 600000;
    const timeLeft = cooldown - (now - lastRob);
    
    if (timeLeft > 0 && lastRob > 0) {
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      return repondre(`⏰ Tu dois attendre ${minutes}m ${seconds}s avant de voler à nouveau!`);
    }
    
    const success = Math.random() > 0.6; // 40% de chance de réussite
    
    if (success) {
      const stolen = Math.min(Math.floor(victimCoins * 0.2), 500); // Max 20% ou 500
      
      if (stolen < 10) {
        return repondre("❌ Cette personne n'a pas assez de coins!");
      }
      
      await updateUser(auteurMessage, { coins: robberCoins + stolen, lastRob: now, last_rob: now });
      await updateUser(mentioned[0], { coins: victimCoins - stolen });
      
      await repondre(`🦹 *VOL RÉUSSI!*\n\n💰 Tu as volé ${stolen} coins à @${mentioned[0].split('@')[0]}!\n💰 Ton solde: ${robberCoins + stolen} coins`, {
        mentions: [mentioned[0]]
      });
    } else {
      const fine = Math.floor(robberCoins * 0.1);
      await updateUser(auteurMessage, { coins: Math.max(0, robberCoins - fine), lastRob: now, last_rob: now });
      
      await repondre(`🚔 *ATTRAPÉ!*\n\n👮 La police t'a attrapé!\n💸 Amende: -${fine} coins\n💰 Ton solde: ${Math.max(0, robberCoins - fine)} coins`);
    }
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 🎖️ BADGES & ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════

const BADGES = {
  newcomer: { emoji: "🌱", name: "Nouveau", desc: "Rejoindre le bot" },
  chatter: { emoji: "💬", name: "Bavard", desc: "100 messages" },
  rich: { emoji: "💰", name: "Riche", desc: "10000 coins" },
  diamond: { emoji: "💎", name: "Diamant", desc: "100 diamants" },
  veteran: { emoji: "⭐", name: "Vétéran", desc: "Niveau 10" },
  elite: { emoji: "🔥", name: "Élite", desc: "Niveau 25" },
  legend: { emoji: "👑", name: "Légende", desc: "Niveau 50" },
  streak7: { emoji: "🔥", name: "Streak 7", desc: "7 jours consécutifs" },
  gambler: { emoji: "🎰", name: "Parieur", desc: "Gagner 10 paris" },
  helper: { emoji: "🤝", name: "Aidant", desc: "Aider 10 personnes" }
};

ovlcmd({
  nom_cmd: "badges",
  classe: "🎖️ Achievements",
  react: "🏅",
  desc: "Affiche tes badges",
  alias: ["badge", "mesbadges"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const badges = typeof user.badges === 'string' ? JSON.parse(user.badges) : (user.badges || []);
    
    let display = "╔══════════════════════════════╗\n";
    display += "║       🎖️ TES BADGES          ║\n";
    display += "╠══════════════════════════════╣\n\n";
    
    if (badges.length === 0) {
      display += "║ Aucun badge encore!\n";
      display += "║ Continue à jouer pour en\n";
      display += "║ débloquer!\n";
    } else {
      badges.forEach(badgeId => {
        const badge = BADGES[badgeId];
        if (badge) {
          display += `║ ${badge.emoji} ${badge.name}\n`;
          display += `║   └ ${badge.desc}\n\n`;
        }
      });
    }
    
    display += "\n╠══════════════════════════════╣\n";
    display += `║ 🎖️ Total: ${badges.length}/${Object.keys(BADGES).length}\n`;
    display += "╚══════════════════════════════╝";
    
    await repondre(display);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "allbadges",
  classe: "🎖️ Achievements",
  react: "📋",
  desc: "Liste tous les badges disponibles",
  alias: ["badgelist"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const badges = typeof user.badges === 'string' ? JSON.parse(user.badges) : (user.badges || []);
    
    let display = "╔══════════════════════════════╗\n";
    display += "║    📋 TOUS LES BADGES        ║\n";
    display += "╠══════════════════════════════╣\n\n";
    
    Object.entries(BADGES).forEach(([id, badge]) => {
      const owned = badges.includes(id) ? "✅" : "🔒";
      display += `║ ${owned} ${badge.emoji} ${badge.name}\n`;
      display += `║   └ ${badge.desc}\n\n`;
    });
    
    display += "╚══════════════════════════════╝";
    
    await repondre(display);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 🎮 MINI-JEUX AVANCÉS
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "slots",
  classe: "🎮 Jeux",
  react: "🎰",
  desc: "Machine à sous. Usage: .slots mise",
  alias: ["slot", "machine"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    const bet = parseInt(arg[0]) || 50;
    const user = await getUser(auteurMessage);
    const currentCoins = user.coins || 0;
    const gamesWon = user.games_won || user.gamesWon || 0;
    
    if (bet < 10) return repondre("❌ Mise minimum: 10 coins");
    if (currentCoins < bet) return repondre(`❌ Solde insuffisant! Tu as ${currentCoins} 💰`);
    
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];
    const weights = [30, 25, 20, 15, 5, 3, 1, 1]; // Probabilités
    
    function spin() {
      const total = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * total;
      for (let i = 0; i < symbols.length; i++) {
        random -= weights[i];
        if (random <= 0) return symbols[i];
      }
      return symbols[0];
    }
    
    const s1 = spin(), s2 = spin(), s3 = spin();
    
    let multiplier = 0;
    let message = "";
    
    if (s1 === s2 && s2 === s3) {
      if (s1 === '7️⃣') { multiplier = 50; message = "🎉 JACKPOT!!!"; }
      else if (s1 === '💎') { multiplier = 25; message = "💎 DIAMANTS!"; }
      else if (s1 === '⭐') { multiplier = 30; message = "⭐ ÉTOILES!"; }
      else { multiplier = 10; message = "🎊 TRIPLE!"; }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      multiplier = 2;
      message = "👍 Double!";
    } else {
      multiplier = 0;
      message = "😢 Perdu...";
    }
    
    const winnings = bet * multiplier;
    const newCoins = currentCoins - bet + winnings;
    const newGamesWon = multiplier > 0 ? gamesWon + 1 : gamesWon;
    
    await updateUser(auteurMessage, { 
      coins: newCoins,
      gamesWon: newGamesWon,
      games_won: newGamesWon
    });
  
    await repondre(`
🎰 *MACHINE À SOUS* 🎰

╔═══════════════╗
║  ${s1}  ${s2}  ${s3}  ║
╚═══════════════╝

${message}

💰 Mise: ${bet}
🏆 Gain: ${winnings > 0 ? '+' + winnings : '0'}
💵 Nouveau solde: ${newCoins}`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "coinflip",
  classe: "🎮 Jeux",
  react: "🪙",
  desc: "Pile ou face. Usage: .coinflip pile/face mise",
  alias: ["cf", "flip"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    if (!arg[0] || !arg[1]) {
      return repondre("❌ Usage: .coinflip pile 100 ou .coinflip face 100");
    }
    
    const choice = arg[0].toLowerCase();
    if (choice !== 'pile' && choice !== 'face') {
      return repondre("❌ Choisis pile ou face!");
    }
    
    const bet = parseInt(arg[1]);
    const user = await getUser(auteurMessage);
    const currentCoins = user.coins || 0;
    const gamesWon = user.games_won || user.gamesWon || 0;
    
    if (isNaN(bet) || bet < 10) return repondre("❌ Mise minimum: 10 coins");
    if (currentCoins < bet) return repondre(`❌ Solde insuffisant! Tu as ${currentCoins} 💰`);
    
    const result = Math.random() > 0.5 ? 'pile' : 'face';
    const won = choice === result;
    
    const emoji = result === 'pile' ? '🪙' : '👑';
    const winnings = won ? bet : -bet;
    const newCoins = currentCoins + winnings;
    const newGamesWon = won ? gamesWon + 1 : gamesWon;
    
    await updateUser(auteurMessage, { 
      coins: newCoins,
      gamesWon: newGamesWon,
      games_won: newGamesWon
    });
    
    await repondre(`
🪙 *COIN FLIP* 🪙

La pièce tourne...

${emoji} Résultat: *${result.toUpperCase()}*

${won ? '🎉 Tu as GAGNÉ!' : '😢 Tu as perdu...'}
${won ? `+${bet}` : `-${bet}`} coins
💵 Solde: ${newCoins} coins`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "dice",
  classe: "🎮 Jeux",
  react: "🎲",
  desc: "Parie sur un nombre. Usage: .dice 1-6 mise",
  alias: ["de", "roll"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    if (!arg[0] || !arg[1]) {
      return repondre("❌ Usage: .dice 4 100 (parie sur le 4)");
    }
    
    const guess = parseInt(arg[0]);
    if (isNaN(guess) || guess < 1 || guess > 6) {
      return repondre("❌ Choisis un nombre entre 1 et 6!");
    }
    
    const bet = parseInt(arg[1]);
    const user = await getUser(auteurMessage);
    const currentCoins = user.coins || 0;
    const gamesWon = user.games_won || user.gamesWon || 0;
    
    if (isNaN(bet) || bet < 10) return repondre("❌ Mise minimum: 10 coins");
    if (currentCoins < bet) return repondre(`❌ Solde insuffisant! Tu as ${currentCoins} 💰`);
    
    const result = Math.floor(Math.random() * 6) + 1;
    const won = guess === result;
    
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceEmoji = diceEmojis[result - 1];
    
    const winnings = won ? bet * 5 : -bet; // x5 si gagné
    const newCoins = currentCoins + winnings;
    const newGamesWon = won ? gamesWon + 1 : gamesWon;
    
    await updateUser(auteurMessage, { 
      coins: newCoins,
      gamesWon: newGamesWon,
      games_won: newGamesWon
    });
    
    await repondre(`
🎲 *DICE ROLL* 🎲

Tu as parié sur: ${guess}

${diceEmoji} Le dé montre: *${result}*

${won ? '🎉 GAGNÉ! x5' : '😢 Perdu...'}
${winnings > 0 ? `+${winnings}` : `${winnings}`} coins
💵 Solde: ${newCoins} coins`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 🎁 INVENTAIRE & BOUTIQUE
// ═══════════════════════════════════════════════════════════

const SHOP_ITEMS = {
  vip: { name: "VIP Status", emoji: "🎭", price: 5000, type: "diamonds", desc: "Statut VIP permanent" },
  lootbox: { name: "Loot Box", emoji: "📦", price: 500, type: "coins", desc: "Récompense aléatoire" },
  xpboost: { name: "XP Boost", emoji: "⚡", price: 1000, type: "coins", desc: "+50% XP pendant 1h" },
  shield: { name: "Bouclier", emoji: "🛡️", price: 2000, type: "coins", desc: "Protection anti-vol 24h" },
  lucky: { name: "Trèfle", emoji: "🍀", price: 1500, type: "coins", desc: "+10% chance aux jeux" }
};

ovlcmd({
  nom_cmd: "inventory",
  classe: "🎁 Inventaire",
  react: "🎒",
  desc: "Affiche ton inventaire",
  alias: ["inv", "sac"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const inventory = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : (user.inventory || []);
    
    let display = "╔══════════════════════════════╗\n";
    display += "║       🎒 INVENTAIRE          ║\n";
    display += "╠══════════════════════════════╣\n\n";
    
    if (!inventory || inventory.length === 0) {
      display += "║ 📭 Inventaire vide!\n";
      display += "║ Utilise .shop pour acheter\n";
    } else {
      const counted = {};
      inventory.forEach(item => {
        counted[item] = (counted[item] || 0) + 1;
      });
      
      Object.entries(counted).forEach(([itemId, count]) => {
        const item = SHOP_ITEMS[itemId];
        if (item) {
          display += `║ ${item.emoji} ${item.name} x${count}\n`;
        }
      });
    }
    
    display += "\n╠══════════════════════════════╣\n";
    display += "║ 💡 .use <item> pour utiliser ║\n";
    display += "╚══════════════════════════════╝";
    
    await repondre(display);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "shop",
  classe: "🎁 Inventaire",
  react: "🛍️",
  desc: "Affiche la boutique",
  alias: ["boutique", "magasin"]
}, async (hani, ms, { repondre }) => {
  let display = "╔══════════════════════════════╗\n";
  display += "║       🛍️ BOUTIQUE            ║\n";
  display += "╠══════════════════════════════╣\n\n";
  
  Object.entries(SHOP_ITEMS).forEach(([id, item]) => {
    const currency = item.type === 'diamonds' ? '💎' : '💰';
    display += `║ ${item.emoji} *${item.name}*\n`;
    display += `║   ID: ${id}\n`;
    display += `║   Prix: ${item.price} ${currency}\n`;
    display += `║   ${item.desc}\n\n`;
  });
  
  display += "╠══════════════════════════════╣\n";
  display += "║ 💡 .buy <id> pour acheter    ║\n";
  display += "╚══════════════════════════════╝";
  
  await repondre(display);
});

ovlcmd({
  nom_cmd: "buy",
  classe: "🎁 Inventaire",
  react: "🛒",
  desc: "Achète un item. Usage: .buy item",
  alias: ["acheter"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    if (!arg[0]) {
      return repondre("❌ Usage: .buy lootbox\n\n💡 Utilise .shop pour voir les items");
    }
    
    const itemId = arg[0].toLowerCase();
    const item = SHOP_ITEMS[itemId];
    
    if (!item) {
      return repondre("❌ Item non trouvé! Utilise .shop");
    }
    
    const user = await getUser(auteurMessage);
    const currentCoins = user.coins || 0;
    const currentDiamonds = user.diamonds || 0;
    const currency = item.type === 'diamonds' ? currentDiamonds : currentCoins;
    const inventory = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : (user.inventory || []);
    
    if (currency < item.price) {
      return repondre(`❌ Pas assez de ${item.type === 'diamonds' ? '💎' : '💰'}!\nPrix: ${item.price} | Tu as: ${currency}`);
    }
    
    // Déduire et ajouter à l'inventaire
    const newInventory = [...inventory, itemId];
    const update = item.type === 'diamonds' 
      ? { diamonds: currentDiamonds - item.price, inventory: JSON.stringify(newInventory) }
      : { coins: currentCoins - item.price, inventory: JSON.stringify(newInventory) };
    
    await updateUser(auteurMessage, update);
    
    const remaining = item.type === 'diamonds' ? currentDiamonds - item.price : currentCoins - item.price;
    await repondre(`✅ *ACHAT RÉUSSI!*\n\n${item.emoji} ${item.name} ajouté à ton inventaire!\n💰 Dépensé: ${item.price} ${item.type === 'diamonds' ? '💎' : 'coins'}\n💵 Reste: ${remaining}`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

ovlcmd({
  nom_cmd: "use",
  classe: "🎁 Inventaire",
  react: "✨",
  desc: "Utilise un item. Usage: .use item",
  alias: ["utiliser"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  try {
    if (!arg[0]) {
      return repondre("❌ Usage: .use lootbox");
    }
    
    const itemId = arg[0].toLowerCase();
    const user = await getUser(auteurMessage);
    const inventory = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : (user.inventory || []);
    const currentCoins = user.coins || 0;
    const currentDiamonds = user.diamonds || 0;
    const currentXp = user.xp || 0;
    
    if (!inventory || !inventory.includes(itemId)) {
      return repondre("❌ Tu n'as pas cet item!");
    }
    
    // Retirer l'item de l'inventaire
    const newInventory = [...inventory];
    const index = newInventory.indexOf(itemId);
    newInventory.splice(index, 1);
    
    let result = "";
    
    switch (itemId) {
      case 'lootbox':
        const rewards = [
          { type: 'coins', amount: Math.floor(Math.random() * 1000) + 100 },
          { type: 'diamonds', amount: Math.floor(Math.random() * 20) + 1 },
          { type: 'xp', amount: Math.floor(Math.random() * 500) + 100 }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        
        if (reward.type === 'coins') {
          await updateUser(auteurMessage, { coins: currentCoins + reward.amount, inventory: JSON.stringify(newInventory) });
          result = `💰 +${reward.amount} coins! (Total: ${currentCoins + reward.amount})`;
        } else if (reward.type === 'diamonds') {
          await updateUser(auteurMessage, { diamonds: currentDiamonds + reward.amount, inventory: JSON.stringify(newInventory) });
          result = `💎 +${reward.amount} diamants! (Total: ${currentDiamonds + reward.amount})`;
        } else {
          await updateUser(auteurMessage, { xp: currentXp + reward.amount, level: calculateLevel(currentXp + reward.amount), inventory: JSON.stringify(newInventory) });
          result = `✨ +${reward.amount} XP! (Total: ${currentXp + reward.amount})`;
        }
        break;
      
      case 'xpboost':
        await updateUser(auteurMessage, { 
          xpBoostUntil: Date.now() + 3600000, // 1 heure
          inventory: JSON.stringify(newInventory) 
        });
        result = "⚡ XP Boost activé! +50% XP pendant 1 heure!";
        break;
        
      case 'shield':
        await updateUser(auteurMessage, { 
          shieldUntil: Date.now() + 86400000, // 24 heures
          inventory: JSON.stringify(newInventory) 
        });
        result = "🛡️ Bouclier activé! Protection contre les vols pendant 24h!";
        break;
        
      case 'lucky':
        await updateUser(auteurMessage, { 
          luckyUntil: Date.now() + 3600000, // 1 heure
          inventory: JSON.stringify(newInventory) 
        });
        result = "🍀 Trèfle activé! +10% chance aux jeux pendant 1h!";
        break;
        
      case 'vip':
        await updateUser(auteurMessage, { 
          vip: true,
          inventory: JSON.stringify(newInventory) 
        });
        result = "🎭 Statut VIP activé en permanence!";
        break;
      
      default:
        await updateUser(auteurMessage, { inventory: JSON.stringify(newInventory) });
        result = "Item utilisé!";
    }
    
    await repondre(`📦 *ITEM UTILISÉ!*\n\n🎁 ${result}`);
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES PERSONNELLES
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "mystats",
  classe: "📊 Stats",
  react: "📈",
  desc: "Affiche tes statistiques complètes",
  alias: ["messtats", "profile"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  try {
    const user = await getUser(auteurMessage);
    const badges = typeof user.badges === 'string' ? JSON.parse(user.badges) : (user.badges || []);
    const inventory = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : (user.inventory || []);
    
    const stats = `
╔══════════════════════════════╗
║      📊 MES STATISTIQUES     ║
╠══════════════════════════════╣
║ 
║ 👤 @${auteurMessage.split('@')[0]}
║
║ 📊 Niveau: ${user.level || 1}
║ ✨ XP Total: ${(user.xp || 0).toLocaleString()}
║
║ 💰 Coins: ${(user.coins || 0).toLocaleString()}
║ 💎 Diamants: ${(user.diamonds || 0).toLocaleString()}
║
║ 🔥 Streak Daily: ${user.streak || 0} jours
║ 🎮 Jeux gagnés: ${user.gamesWon || user.games_won || 0}
║ 📨 Messages: ${user.totalMessages || user.total_messages || 0}
║
║ 🎖️ Badges: ${badges.length}
║ 🎒 Items: ${inventory.length}
║
║ ${user.vip ? '🎭 VIP: ✅' : '🎭 VIP: ❌'}
╚══════════════════════════════╝`;
    
    await repondre(stats, { mentions: [auteurMessage] });
  } catch (e) {
    await repondre("❌ Erreur: " + e.message);
  }
});

// Initialiser la table economy au chargement
initEconomyTable().catch(console.error);

console.log("✅ Pro Features loaded - HANI-MD V3.0 avec MySQL");
