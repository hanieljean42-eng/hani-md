/**
 * ═══════════════════════════════════════════════════════════
 * 💰 HANI-MD - Système d'Économie
 * ═══════════════════════════════════════════════════════════
 * Système monétaire virtuel complet pour le bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { getEconomyUser, updateBalance, transferMoney, getTopUsers, createBankAccount, depositToBank, withdrawFromBank } = require("../DataBase/economie");

// ═══════════════════════════════════════════════════════════
// 💰 BALANCE - Voir son solde
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "balance",
    classe: "Economy",
    react: "💰",
    desc: "Voir votre solde",
    alias: ["bal", "money", "coins", "portefeuille"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas encore de compte. Utilisez .register");
      }

      const walletBalance = user.wallet || 0;
      const bankBalance = user.bank || 0;
      const totalBalance = walletBalance + bankBalance;

      let response = `💰 *Votre Solde*\n\n`;
      response += `👛 Portefeuille: ${walletBalance.toLocaleString()} 🪙\n`;
      response += `🏦 Banque: ${bankBalance.toLocaleString()} 🪙\n`;
      response += `───────────────\n`;
      response += `💎 Total: ${totalBalance.toLocaleString()} 🪙\n\n`;
      response += `✨ HANI-MD Economy`;

      repondre(response);

    } catch (error) {
      console.error("[BALANCE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 REGISTER - Créer un compte
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "register",
    classe: "Economy",
    react: "📝",
    desc: "Créer un compte économie",
    alias: ["inscription", "createaccount"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const existingUser = await getEconomyUser(auteur_Msg);
      
      if (existingUser) {
        return repondre("❌ Vous avez déjà un compte!");
      }

      await createBankAccount(auteur_Msg, 500); // Bonus de bienvenue
      
      repondre(`🎉 *Compte créé avec succès!*\n\n💰 Bonus de bienvenue: 500 🪙\n\n📝 Utilisez .daily pour réclamer vos coins quotidiens!\n\n✨ HANI-MD Economy`);

    } catch (error) {
      console.error("[REGISTER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎁 DAILY - Récompense quotidienne
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "daily",
    classe: "Economy",
    react: "🎁",
    desc: "Réclamer votre récompense quotidienne",
    alias: ["quotidien", "dailybonus"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      const now = Date.now();
      const lastDaily = user.lastDaily || 0;
      const cooldown = 24 * 60 * 60 * 1000; // 24 heures

      if (now - lastDaily < cooldown) {
        const remaining = cooldown - (now - lastDaily);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return repondre(`⏳ Revenez dans ${hours}h ${minutes}min pour votre récompense quotidienne!`);
      }

      const reward = Math.floor(Math.random() * 500) + 200; // 200-700 coins
      await updateBalance(auteur_Msg, reward, "add", { lastDaily: now });
      
      const newUser = await getEconomyUser(auteur_Msg);

      repondre(`🎁 *Récompense Quotidienne*\n\n💰 +${reward} 🪙\n\n👛 Nouveau solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);

    } catch (error) {
      console.error("[DAILY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💼 WORK - Travailler pour gagner des coins
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "work",
    classe: "Economy",
    react: "💼",
    desc: "Travailler pour gagner des coins",
    alias: ["travailler", "job"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      const now = Date.now();
      const lastWork = user.lastWork || 0;
      const cooldown = 30 * 60 * 1000; // 30 minutes

      if (now - lastWork < cooldown) {
        const remaining = cooldown - (now - lastWork);
        const minutes = Math.floor(remaining / (60 * 1000));
        return repondre(`⏳ Vous êtes fatigué! Reposez-vous pendant ${minutes} minutes.`);
      }

      const jobs = [
        { job: "Développeur", emoji: "💻", min: 100, max: 300 },
        { job: "Médecin", emoji: "🏥", min: 150, max: 350 },
        { job: "Professeur", emoji: "📚", min: 80, max: 250 },
        { job: "Policier", emoji: "👮", min: 120, max: 280 },
        { job: "Pompier", emoji: "🚒", min: 100, max: 260 },
        { job: "Chef cuisinier", emoji: "👨‍🍳", min: 90, max: 240 },
        { job: "Pilote", emoji: "✈️", min: 200, max: 400 },
        { job: "Musicien", emoji: "🎵", min: 50, max: 300 },
        { job: "YouTuber", emoji: "📺", min: 30, max: 500 },
        { job: "Streamer", emoji: "🎮", min: 40, max: 450 }
      ];

      const selectedJob = jobs[Math.floor(Math.random() * jobs.length)];
      const earnings = Math.floor(Math.random() * (selectedJob.max - selectedJob.min)) + selectedJob.min;

      await updateBalance(auteur_Msg, earnings, "add", { lastWork: now });
      const newUser = await getEconomyUser(auteur_Msg);

      repondre(`${selectedJob.emoji} *Travail: ${selectedJob.job}*\n\n💰 Vous avez gagné ${earnings} 🪙\n👛 Nouveau solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);

    } catch (error) {
      console.error("[WORK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💸 TRANSFER - Envoyer des coins
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "transfer",
    classe: "Economy",
    react: "💸",
    desc: "Transférer des coins à quelqu'un",
    alias: ["pay", "send", "envoyer"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid;

      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0] && !isNaN(parseInt(arg[0]))) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Utilisation: .transfer [montant] (en réponse à quelqu'un)\nou .transfer [numéro] [montant]");
      }

      let amount;
      if (quotedMessage?.participant) {
        amount = parseInt(arg[0]);
      } else {
        amount = parseInt(arg[1] || arg[0]);
      }

      if (!amount || amount <= 0) {
        return repondre("❌ Montant invalide");
      }

      if (targetJid === auteur_Msg) {
        return repondre("❌ Vous ne pouvez pas vous envoyer des coins!");
      }

      const sender = await getEconomyUser(auteur_Msg);
      if (!sender) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      if (sender.wallet < amount) {
        return repondre(`❌ Solde insuffisant. Vous avez ${sender.wallet} 🪙`);
      }

      const receiver = await getEconomyUser(targetJid);
      if (!receiver) {
        return repondre("❌ Le destinataire n'a pas de compte économie");
      }

      await transferMoney(auteur_Msg, targetJid, amount);

      repondre(`💸 *Transfert effectué*\n\n💰 Montant: ${amount} 🪙\n📤 Envoyé à: @${targetJid.split("@")[0]}\n\n✨ HANI-MD Economy`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[TRANSFER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🏦 BANK - Gérer son compte bancaire
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "deposit",
    classe: "Economy",
    react: "🏦",
    desc: "Déposer de l'argent à la banque",
    alias: ["dep", "deposer"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      let amount;
      if (arg[0] === "all" || arg[0] === "tout") {
        amount = user.wallet;
      } else {
        amount = parseInt(arg[0]);
      }

      if (!amount || amount <= 0) {
        return repondre("❌ Utilisation: .deposit [montant] ou .deposit all");
      }

      if (user.wallet < amount) {
        return repondre(`❌ Solde insuffisant. Vous avez ${user.wallet} 🪙`);
      }

      await depositToBank(auteur_Msg, amount);
      const newUser = await getEconomyUser(auteur_Msg);

      repondre(`🏦 *Dépôt effectué*\n\n💰 Montant: ${amount} 🪙\n👛 Portefeuille: ${newUser.wallet.toLocaleString()} 🪙\n🏦 Banque: ${newUser.bank.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);

    } catch (error) {
      console.error("[DEPOSIT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

ovlcmd(
  {
    nom_cmd: "withdraw",
    classe: "Economy",
    react: "🏧",
    desc: "Retirer de l'argent de la banque",
    alias: ["wd", "retirer"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      let amount;
      if (arg[0] === "all" || arg[0] === "tout") {
        amount = user.bank;
      } else {
        amount = parseInt(arg[0]);
      }

      if (!amount || amount <= 0) {
        return repondre("❌ Utilisation: .withdraw [montant] ou .withdraw all");
      }

      if (user.bank < amount) {
        return repondre(`❌ Solde bancaire insuffisant. Vous avez ${user.bank} 🪙 en banque`);
      }

      await withdrawFromBank(auteur_Msg, amount);
      const newUser = await getEconomyUser(auteur_Msg);

      repondre(`🏧 *Retrait effectué*\n\n💰 Montant: ${amount} 🪙\n👛 Portefeuille: ${newUser.wallet.toLocaleString()} 🪙\n🏦 Banque: ${newUser.bank.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);

    } catch (error) {
      console.error("[WITHDRAW]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🏆 LEADERBOARD - Classement des plus riches
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "leaderboard",
    classe: "Economy",
    react: "🏆",
    desc: "Voir le classement des plus riches",
    alias: ["lb", "top", "classement", "rich"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const topUsers = await getTopUsers(10);
      
      if (!topUsers || topUsers.length === 0) {
        return repondre("❌ Aucun utilisateur dans le classement");
      }

      const medals = ["🥇", "🥈", "🥉"];
      let response = `🏆 *Top 10 des plus riches*\n\n`;

      topUsers.forEach((user, index) => {
        const medal = medals[index] || `${index + 1}.`;
        const total = (user.wallet || 0) + (user.bank || 0);
        const phone = user.jid?.split("@")[0] || "Inconnu";
        response += `${medal} +${phone}\n   💰 ${total.toLocaleString()} 🪙\n\n`;
      });

      response += `✨ HANI-MD Economy`;
      repondre(response);

    } catch (error) {
      console.error("[LEADERBOARD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎰 GAMBLE - Parier ses coins
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gamble",
    classe: "Economy",
    react: "🎰",
    desc: "Parier vos coins (risqué!)",
    alias: ["bet", "pari"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      let amount;
      if (arg[0] === "all" || arg[0] === "tout") {
        amount = user.wallet;
      } else {
        amount = parseInt(arg[0]);
      }

      if (!amount || amount <= 0) {
        return repondre("❌ Utilisation: .gamble [montant]");
      }

      if (user.wallet < amount) {
        return repondre(`❌ Solde insuffisant. Vous avez ${user.wallet} 🪙`);
      }

      const win = Math.random() < 0.45; // 45% de chance de gagner
      const multiplier = win ? (Math.random() * 1.5 + 0.5) : -1; // 0.5x à 2x si gagné
      const change = win ? Math.floor(amount * multiplier) : -amount;

      await updateBalance(auteur_Msg, change, change > 0 ? "add" : "remove");
      const newUser = await getEconomyUser(auteur_Msg);

      if (win) {
        repondre(`🎰 *GAGNÉ!*\n\n🎉 Vous avez gagné ${change} 🪙!\n👛 Nouveau solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);
      } else {
        repondre(`🎰 *PERDU!*\n\n😢 Vous avez perdu ${amount} 🪙\n👛 Nouveau solde: ${newUser.wallet.toLocaleString()} 🪙\n\n💡 Conseil: Ne jouez que ce que vous pouvez perdre!\n\n✨ HANI-MD Economy`);
      }

    } catch (error) {
      console.error("[GAMBLE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎣 FISH - Pêcher pour gagner des coins
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fish",
    classe: "Economy",
    react: "🎣",
    desc: "Aller à la pêche",
    alias: ["peche", "pecher"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      const now = Date.now();
      const lastFish = user.lastFish || 0;
      const cooldown = 15 * 60 * 1000; // 15 minutes

      if (now - lastFish < cooldown) {
        const remaining = cooldown - (now - lastFish);
        const minutes = Math.floor(remaining / (60 * 1000));
        return repondre(`⏳ Les poissons ont besoin de repos! Revenez dans ${minutes} minutes.`);
      }

      const catches = [
        { fish: "Rien", emoji: "🌊", coins: 0 },
        { fish: "Petit poisson", emoji: "🐟", coins: 30 },
        { fish: "Poisson moyen", emoji: "🐠", coins: 75 },
        { fish: "Gros poisson", emoji: "🐡", coins: 150 },
        { fish: "Thon", emoji: "🐟", coins: 200 },
        { fish: "Requin", emoji: "🦈", coins: 500 },
        { fish: "Baleine", emoji: "🐋", coins: 1000 },
        { fish: "Coffre au trésor", emoji: "📦", coins: 2000 },
        { fish: "Botte usée", emoji: "👢", coins: 5 },
        { fish: "Pneu", emoji: "⭕", coins: 1 }
      ];

      const probabilities = [0.1, 0.25, 0.25, 0.15, 0.1, 0.05, 0.02, 0.01, 0.05, 0.02];
      const random = Math.random();
      let cumulative = 0;
      let selectedIndex = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random <= cumulative) {
          selectedIndex = i;
          break;
        }
      }

      const caught = catches[selectedIndex];
      await updateBalance(auteur_Msg, caught.coins, "add", { lastFish: now });
      const newUser = await getEconomyUser(auteur_Msg);

      if (caught.coins === 0) {
        repondre(`🎣 *Partie de pêche*\n\n${caught.emoji} Vous n'avez rien attrapé!\n👛 Solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);
      } else {
        repondre(`🎣 *Partie de pêche*\n\n${caught.emoji} Vous avez attrapé: ${caught.fish}!\n💰 +${caught.coins} 🪙\n👛 Solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);
      }

    } catch (error) {
      console.error("[FISH]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🦴 HUNT - Chasser pour gagner des coins
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "hunt",
    classe: "Economy",
    react: "🏹",
    desc: "Aller à la chasse",
    alias: ["chasse", "chasser"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const user = await getEconomyUser(auteur_Msg);
      
      if (!user) {
        return repondre("❌ Vous n'avez pas de compte. Utilisez .register");
      }

      const now = Date.now();
      const lastHunt = user.lastHunt || 0;
      const cooldown = 20 * 60 * 1000; // 20 minutes

      if (now - lastHunt < cooldown) {
        const remaining = cooldown - (now - lastHunt);
        const minutes = Math.floor(remaining / (60 * 1000));
        return repondre(`⏳ Les animaux se cachent! Revenez dans ${minutes} minutes.`);
      }

      const animals = [
        { animal: "Rien", emoji: "🌲", coins: 0 },
        { animal: "Lapin", emoji: "🐰", coins: 50 },
        { animal: "Renard", emoji: "🦊", coins: 100 },
        { animal: "Cerf", emoji: "🦌", coins: 200 },
        { animal: "Ours", emoji: "🐻", coins: 350 },
        { animal: "Lion", emoji: "🦁", coins: 500 },
        { animal: "Dragon", emoji: "🐉", coins: 1500 }
      ];

      const probabilities = [0.15, 0.3, 0.25, 0.15, 0.08, 0.05, 0.02];
      const random = Math.random();
      let cumulative = 0;
      let selectedIndex = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random <= cumulative) {
          selectedIndex = i;
          break;
        }
      }

      const caught = animals[selectedIndex];
      await updateBalance(auteur_Msg, caught.coins, "add", { lastHunt: now });
      const newUser = await getEconomyUser(auteur_Msg);

      if (caught.coins === 0) {
        repondre(`🏹 *Partie de chasse*\n\n${caught.emoji} Vous n'avez rien attrapé!\n👛 Solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);
      } else {
        repondre(`🏹 *Partie de chasse*\n\n${caught.emoji} Vous avez attrapé: ${caught.animal}!\n💰 +${caught.coins} 🪙\n👛 Solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`);
      }

    } catch (error) {
      console.error("[HUNT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎁 GIVE - Donner des coins (Owner only)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "givecoins",
    classe: "Economy",
    react: "🎁",
    desc: "Donner des coins à un utilisateur (Owner)",
    alias: ["addcoins", "donner"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid;
      let amount;

      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
        amount = parseInt(arg[0]);
      } else if (arg.length >= 2) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
        amount = parseInt(arg[1]);
      } else {
        return repondre("❌ Utilisation: .givecoins [montant] (en réponse)\nou .givecoins [numéro] [montant]");
      }

      if (!amount || amount <= 0) {
        return repondre("❌ Montant invalide");
      }

      const receiver = await getEconomyUser(targetJid);
      if (!receiver) {
        await createBankAccount(targetJid, amount);
      } else {
        await updateBalance(targetJid, amount, "add");
      }

      const newUser = await getEconomyUser(targetJid);
      repondre(`🎁 *Coins donnés*\n\n💰 +${amount} 🪙 à @${targetJid.split("@")[0]}\n👛 Nouveau solde: ${newUser.wallet.toLocaleString()} 🪙\n\n✨ HANI-MD Economy`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[GIVECOINS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ RESETECONOMY - Réinitialiser l'économie (Owner only)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "reseteconomy",
    classe: "Economy",
    react: "🗑️",
    desc: "Réinitialiser le compte d'un utilisateur (Owner)",
    alias: ["resetuser"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid;

      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Répondez à un utilisateur ou spécifiez un numéro");
      }

      await updateBalance(targetJid, 0, "set");
      repondre(`🗑️ Compte économie de @${targetJid.split("@")[0]} réinitialisé!`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[RESETECONOMY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Ovl-economy.js chargé - Commandes: balance, register, daily, work, transfer, deposit, withdraw, leaderboard, gamble, fish, hunt, givecoins, reseteconomy");
