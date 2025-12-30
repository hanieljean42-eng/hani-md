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

// Fichiers de données
const DATA_DIR = path.join(__dirname, '../DataBase');
const USERS_FILE = path.join(DATA_DIR, 'users_pro.json');
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, 'achievements.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Utilitaires
function loadJSON(file, defaultValue = {}) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file));
    }
  } catch (e) {}
  return defaultValue;
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const users = loadJSON(USERS_FILE);
  if (!users[userId]) {
    users[userId] = {
      xp: 0,
      level: 1,
      coins: 100,
      diamonds: 0,
      badges: [],
      achievements: [],
      inventory: [],
      streak: 0,
      lastDaily: null,
      totalMessages: 0,
      joinDate: new Date().toISOString()
    };
    saveJSON(USERS_FILE, users);
  }
  return users[userId];
}

function updateUser(userId, data) {
  const users = loadJSON(USERS_FILE);
  users[userId] = { ...users[userId], ...data };
  saveJSON(USERS_FILE, users);
  return users[userId];
}

function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp)) + 1;
}

function xpForNextLevel(level) {
  return Math.pow((level) * 10, 2);
}

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
  const user = getUser(auteurMessage);
  const nextLevelXP = xpForNextLevel(user.level);
  const progress = Math.min(100, Math.floor((user.xp / nextLevelXP) * 100));
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
  
  const levelEmoji = user.level >= 50 ? '👑' : user.level >= 30 ? '💎' : user.level >= 20 ? '⭐' : user.level >= 10 ? '🔥' : '📊';
  
  const card = `
╔══════════════════════════════╗
║     ${levelEmoji} CARTE DE NIVEAU ${levelEmoji}     ║
╠══════════════════════════════╣
║ 👤 @${auteurMessage.split('@')[0]}
║
║ 📊 Niveau: ${user.level}
║ ✨ XP: ${user.xp} / ${nextLevelXP}
║ 
║ [${progressBar}] ${progress}%
║
║ 💰 Coins: ${user.coins}
║ 💎 Diamants: ${user.diamonds}
║ 📨 Messages: ${user.totalMessages}
║ 🎖️ Badges: ${user.badges.length}
╚══════════════════════════════╝`;
  
  await repondre(card, { mentions: [auteurMessage] });
});

ovlcmd({
  nom_cmd: "leaderboard",
  classe: "🏆 Niveaux",
  react: "🏅",
  desc: "Classement des meilleurs joueurs",
  alias: ["lb", "top", "classement"]
}, async (hani, ms, { repondre }) => {
  const users = loadJSON(USERS_FILE);
  
  // Trier par niveau puis XP
  const sorted = Object.entries(users)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 10);
  
  if (sorted.length === 0) {
    return repondre("📊 Aucun utilisateur dans le classement.");
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
  const user = getUser(auteurMessage);
  const now = new Date();
  const today = now.toDateString();
  
  if (user.lastDaily === today) {
    return repondre("❌ Tu as déjà réclamé ta récompense aujourd'hui!\n⏰ Reviens demain!");
  }
  
  // Vérifier le streak
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = user.lastDaily === yesterday.toDateString();
  
  let streak = wasYesterday ? user.streak + 1 : 1;
  let coins = 100 + (streak * 25);
  let diamonds = streak >= 7 ? 5 : 0;
  let xp = 50 + (streak * 10);
  
  // Bonus streak
  if (streak === 7) {
    coins += 500;
    diamonds += 10;
    await repondre("🔥 *STREAK DE 7 JOURS!* Bonus x2!");
  }
  
  updateUser(auteurMessage, {
    coins: user.coins + coins,
    diamonds: user.diamonds + diamonds,
    xp: user.xp + xp,
    level: calculateLevel(user.xp + xp),
    streak,
    lastDaily: today
  });
  
  const reward = `
╔══════════════════════════════╗
║     🎁 RÉCOMPENSE DAILY      ║
╠══════════════════════════════╣
║ 
║ 🔥 Streak: ${streak} jours
║
║ 💰 Coins: +${coins}
║ 💎 Diamants: +${diamonds}
║ ✨ XP: +${xp}
║
╠══════════════════════════════╣
║ 💡 Reviens demain pour       ║
║    continuer ton streak!     ║
╚══════════════════════════════╝`;
  
  await repondre(reward);
});

ovlcmd({
  nom_cmd: "balance",
  classe: "💰 Économie",
  react: "💰",
  desc: "Affiche ton solde",
  alias: ["bal", "solde", "money"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const user = getUser(auteurMessage);
  
  const balance = `
╔══════════════════════════════╗
║       💰 TON PORTEFEUILLE    ║
╠══════════════════════════════╣
║ 
║ 💰 Coins: ${user.coins.toLocaleString()}
║ 💎 Diamants: ${user.diamonds.toLocaleString()}
║ 
║ 📊 Niveau: ${user.level}
║ ✨ XP: ${user.xp}
║
╚══════════════════════════════╝`;
  
  await repondre(balance);
});

ovlcmd({
  nom_cmd: "transfer",
  classe: "💰 Économie",
  react: "💸",
  desc: "Transfère des coins. Usage: .transfer @user montant",
  alias: ["pay", "give", "envoyer"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Mentionne quelqu'un! .transfer @user 100");
  }
  
  const amount = parseInt(arg[arg.length - 1]);
  
  if (isNaN(amount) || amount < 1) {
    return repondre("❌ Montant invalide! .transfer @user 100");
  }
  
  const sender = getUser(auteurMessage);
  const receiver = getUser(mentioned[0]);
  
  if (sender.coins < amount) {
    return repondre(`❌ Solde insuffisant! Tu as ${sender.coins} 💰`);
  }
  
  updateUser(auteurMessage, { coins: sender.coins - amount });
  updateUser(mentioned[0], { coins: receiver.coins + amount });
  
  await repondre(`✅ Transfert réussi!\n\n💸 ${amount} coins envoyés à @${mentioned[0].split('@')[0]}`, {
    mentions: [mentioned[0]]
  });
});

ovlcmd({
  nom_cmd: "work",
  classe: "💰 Économie",
  react: "💼",
  desc: "Travaille pour gagner des coins",
  alias: ["travail", "job"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const user = getUser(auteurMessage);
  
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
  
  updateUser(auteurMessage, {
    coins: user.coins + earnings,
    xp: user.xp + xpGained,
    level: calculateLevel(user.xp + xpGained)
  });
  
  await repondre(`${job.emoji} *${job.name}*\n\n💼 Tu as travaillé dur!\n💰 Gagné: +${earnings} coins\n✨ XP: +${xpGained}`);
});

ovlcmd({
  nom_cmd: "rob",
  classe: "💰 Économie",
  react: "🦹",
  desc: "Tente de voler quelqu'un. Usage: .rob @user",
  alias: ["steal", "voler"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const mentioned = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Mentionne quelqu'un à voler! .rob @user");
  }
  
  if (mentioned[0] === auteurMessage) {
    return repondre("❌ Tu ne peux pas te voler toi-même!");
  }
  
  const robber = getUser(auteurMessage);
  const victim = getUser(mentioned[0]);
  
  const success = Math.random() > 0.6; // 40% de chance de réussite
  
  if (success) {
    const stolen = Math.min(Math.floor(victim.coins * 0.2), 500); // Max 20% ou 500
    
    if (stolen < 10) {
      return repondre("❌ Cette personne n'a pas assez de coins!");
    }
    
    updateUser(auteurMessage, { coins: robber.coins + stolen });
    updateUser(mentioned[0], { coins: victim.coins - stolen });
    
    await repondre(`🦹 *VOL RÉUSSI!*\n\n💰 Tu as volé ${stolen} coins à @${mentioned[0].split('@')[0]}!`, {
      mentions: [mentioned[0]]
    });
  } else {
    const fine = Math.floor(robber.coins * 0.1);
    updateUser(auteurMessage, { coins: robber.coins - fine });
    
    await repondre(`🚔 *ATTRAPÉ!*\n\n👮 La police t'a attrapé!\n💸 Amende: -${fine} coins`);
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
  const user = getUser(auteurMessage);
  
  let display = "╔══════════════════════════════╗\n";
  display += "║       🎖️ TES BADGES          ║\n";
  display += "╠══════════════════════════════╣\n\n";
  
  if (user.badges.length === 0) {
    display += "║ Aucun badge encore!\n";
    display += "║ Continue à jouer pour en\n";
    display += "║ débloquer!\n";
  } else {
    user.badges.forEach(badgeId => {
      const badge = BADGES[badgeId];
      if (badge) {
        display += `║ ${badge.emoji} ${badge.name}\n`;
        display += `║   └ ${badge.desc}\n\n`;
      }
    });
  }
  
  display += "\n╠══════════════════════════════╣\n";
  display += `║ 🎖️ Total: ${user.badges.length}/${Object.keys(BADGES).length}\n`;
  display += "╚══════════════════════════════╝";
  
  await repondre(display);
});

ovlcmd({
  nom_cmd: "allbadges",
  classe: "🎖️ Achievements",
  react: "📋",
  desc: "Liste tous les badges disponibles",
  alias: ["badgelist"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const user = getUser(auteurMessage);
  
  let display = "╔══════════════════════════════╗\n";
  display += "║    📋 TOUS LES BADGES        ║\n";
  display += "╠══════════════════════════════╣\n\n";
  
  Object.entries(BADGES).forEach(([id, badge]) => {
    const owned = user.badges.includes(id) ? "✅" : "🔒";
    display += `║ ${owned} ${badge.emoji} ${badge.name}\n`;
    display += `║   └ ${badge.desc}\n\n`;
  });
  
  display += "╚══════════════════════════════╝";
  
  await repondre(display);
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
  const bet = parseInt(arg[0]) || 50;
  const user = getUser(auteurMessage);
  
  if (bet < 10) return repondre("❌ Mise minimum: 10 coins");
  if (user.coins < bet) return repondre(`❌ Solde insuffisant! Tu as ${user.coins} 💰`);
  
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
  const newCoins = user.coins - bet + winnings;
  
  updateUser(auteurMessage, { coins: newCoins });
  
  await repondre(`
🎰 *MACHINE À SOUS* 🎰

╔═══════════════╗
║  ${s1}  ${s2}  ${s3}  ║
╚═══════════════╝

${message}

💰 Mise: ${bet}
🏆 Gain: ${winnings > 0 ? '+' + winnings : '0'}
💵 Nouveau solde: ${newCoins}`);
});

ovlcmd({
  nom_cmd: "coinflip",
  classe: "🎮 Jeux",
  react: "🪙",
  desc: "Pile ou face. Usage: .coinflip pile/face mise",
  alias: ["cf", "flip"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0] || !arg[1]) {
    return repondre("❌ Usage: .coinflip pile 100 ou .coinflip face 100");
  }
  
  const choice = arg[0].toLowerCase();
  if (choice !== 'pile' && choice !== 'face') {
    return repondre("❌ Choisis pile ou face!");
  }
  
  const bet = parseInt(arg[1]);
  const user = getUser(auteurMessage);
  
  if (isNaN(bet) || bet < 10) return repondre("❌ Mise minimum: 10 coins");
  if (user.coins < bet) return repondre(`❌ Solde insuffisant! Tu as ${user.coins} 💰`);
  
  const result = Math.random() > 0.5 ? 'pile' : 'face';
  const won = choice === result;
  
  const emoji = result === 'pile' ? '🪙' : '👑';
  const winnings = won ? bet : -bet;
  
  updateUser(auteurMessage, { coins: user.coins + winnings });
  
  await repondre(`
🪙 *COIN FLIP* 🪙

La pièce tourne...

${emoji} Résultat: *${result.toUpperCase()}*

${won ? '🎉 Tu as GAGNÉ!' : '😢 Tu as perdu...'}
${won ? `+${bet}` : `-${bet}`} coins`);
});

ovlcmd({
  nom_cmd: "dice",
  classe: "🎮 Jeux",
  react: "🎲",
  desc: "Parie sur un nombre. Usage: .dice 1-6 mise",
  alias: ["de", "roll"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0] || !arg[1]) {
    return repondre("❌ Usage: .dice 4 100 (parie sur le 4)");
  }
  
  const guess = parseInt(arg[0]);
  if (isNaN(guess) || guess < 1 || guess > 6) {
    return repondre("❌ Choisis un nombre entre 1 et 6!");
  }
  
  const bet = parseInt(arg[1]);
  const user = getUser(auteurMessage);
  
  if (isNaN(bet) || bet < 10) return repondre("❌ Mise minimum: 10 coins");
  if (user.coins < bet) return repondre(`❌ Solde insuffisant! Tu as ${user.coins} 💰`);
  
  const result = Math.floor(Math.random() * 6) + 1;
  const won = guess === result;
  
  const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const diceEmoji = diceEmojis[result - 1];
  
  const winnings = won ? bet * 5 : -bet; // x5 si gagné
  
  updateUser(auteurMessage, { coins: user.coins + winnings });
  
  await repondre(`
🎲 *DICE ROLL* 🎲

Tu as parié sur: ${guess}

${diceEmoji} Le dé montre: *${result}*

${won ? '🎉 GAGNÉ! x5' : '😢 Perdu...'}
${winnings > 0 ? `+${winnings}` : `${winnings}`} coins`);
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
  const user = getUser(auteurMessage);
  
  let display = "╔══════════════════════════════╗\n";
  display += "║       🎒 INVENTAIRE          ║\n";
  display += "╠══════════════════════════════╣\n\n";
  
  if (!user.inventory || user.inventory.length === 0) {
    display += "║ 📭 Inventaire vide!\n";
    display += "║ Utilise .shop pour acheter\n";
  } else {
    const counted = {};
    user.inventory.forEach(item => {
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
});

ovlcmd({
  nom_cmd: "buy",
  classe: "🎁 Inventaire",
  react: "🛒",
  desc: "Achète un item. Usage: .buy item",
  alias: ["acheter"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) {
    return repondre("❌ Usage: .buy lootbox\n\n💡 Utilise .shop pour voir les items");
  }
  
  const itemId = arg[0].toLowerCase();
  const item = SHOP_ITEMS[itemId];
  
  if (!item) {
    return repondre("❌ Item non trouvé! Utilise .shop");
  }
  
  const user = getUser(auteurMessage);
  const currency = item.type === 'diamonds' ? user.diamonds : user.coins;
  
  if (currency < item.price) {
    return repondre(`❌ Pas assez de ${item.type === 'diamonds' ? '💎' : '💰'}!\nPrix: ${item.price} | Tu as: ${currency}`);
  }
  
  // Déduire et ajouter à l'inventaire
  const newInventory = [...(user.inventory || []), itemId];
  const update = item.type === 'diamonds' 
    ? { diamonds: user.diamonds - item.price, inventory: newInventory }
    : { coins: user.coins - item.price, inventory: newInventory };
  
  updateUser(auteurMessage, update);
  
  await repondre(`✅ *ACHAT RÉUSSI!*\n\n${item.emoji} ${item.name} ajouté à ton inventaire!\n💰 Dépensé: ${item.price} ${item.type === 'diamonds' ? '💎' : 'coins'}`);
});

ovlcmd({
  nom_cmd: "use",
  classe: "🎁 Inventaire",
  react: "✨",
  desc: "Utilise un item. Usage: .use item",
  alias: ["utiliser"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) {
    return repondre("❌ Usage: .use lootbox");
  }
  
  const itemId = arg[0].toLowerCase();
  const user = getUser(auteurMessage);
  
  if (!user.inventory || !user.inventory.includes(itemId)) {
    return repondre("❌ Tu n'as pas cet item!");
  }
  
  // Retirer l'item de l'inventaire
  const newInventory = [...user.inventory];
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
        updateUser(auteurMessage, { coins: user.coins + reward.amount, inventory: newInventory });
        result = `💰 +${reward.amount} coins!`;
      } else if (reward.type === 'diamonds') {
        updateUser(auteurMessage, { diamonds: user.diamonds + reward.amount, inventory: newInventory });
        result = `💎 +${reward.amount} diamants!`;
      } else {
        updateUser(auteurMessage, { xp: user.xp + reward.amount, level: calculateLevel(user.xp + reward.amount), inventory: newInventory });
        result = `✨ +${reward.amount} XP!`;
      }
      break;
      
    default:
      updateUser(auteurMessage, { inventory: newInventory });
      result = "Item utilisé!";
  }
  
  await repondre(`📦 *LOOT BOX OUVERTE!*\n\n🎁 Récompense: ${result}`);
});

console.log("✅ Pro Features loaded - HANI-MD V3.0");
