/**
 * ═══════════════════════════════════════════════════════════
 * 🤝 HANI-MD - Système de Parrainage & Affiliation
 * ═══════════════════════════════════════════════════════════
 * Gagnez des récompenses en invitant de nouveaux utilisateurs
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { getSelfJid } = require('../lib/selfRedirect');
const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("../set");

// Base de données Parrainage
const REFERRAL_DB_PATH = path.join(__dirname, "../DataBase/referral.json");

function loadReferralDB() {
  try {
    if (fs.existsSync(REFERRAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(REFERRAL_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    users: {},
    referrals: [],
    rewards: {
      perReferral: 50, // Points par parrainage
      premiumBonus: 100, // Bonus si le filleul prend premium
      levels: [
        { count: 5, reward: "1 jour Bronze gratuit" },
        { count: 10, reward: "3 jours Argent gratuit" },
        { count: 25, reward: "7 jours Or gratuit" },
        { count: 50, reward: "1 mois Diamant gratuit" },
        { count: 100, reward: "Lifetime gratuit!" }
      ]
    },
    settings: {
      enabled: true,
      minDaysActive: 1, // Jours minimum d'activité pour compter
      pointsToFCFA: 10 // 10 points = 1 FCFA de réduction
    },
    stats: {
      totalReferrals: 0,
      totalRewardsGiven: 0
    }
  };
}

function saveReferralDB(data) {
  try {
    fs.writeFileSync(REFERRAL_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Générer un code unique
function generateReferralCode(number) {
  const hash = crypto.createHash('md5').update(number + Date.now().toString()).digest('hex');
  return `REF${hash.substring(0, 8).toUpperCase()}`;
}

// ═══════════════════════════════════════════════════════════
// 🎁 VOIR MON CODE DE PARRAINAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "myref",
    classe: "Parrainage",
    react: "🎁",
    desc: "Obtenir votre code de parrainage",
    alias: ["moncode", "referral", "parrainage"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      
      const db = loadReferralDB();
      
      // Créer l'utilisateur si nouveau
      if (!db.users[number]) {
        db.users[number] = {
          jid: sender,
          name: msg.pushName || "Utilisateur",
          code: generateReferralCode(number),
          referrals: [],
          points: 0,
          referredBy: null,
          createdAt: new Date().toISOString(),
          rewardsReceived: []
        };
        saveReferralDB(db);
      }

      const user = db.users[number];
      const botNumber = ovl.user?.id?.split(":")[0] || ovl.user?.id?.split("@")[0] || "";

      let refText = `🎁 *VOTRE PARRAINAGE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      refText += `🔑 *Votre code:* \`${user.code}\`\n\n`;
      refText += `👥 *Filleuls:* ${user.referrals.length}\n`;
      refText += `💰 *Points accumulés:* ${user.points}\n`;
      refText += `💵 *Valeur:* ${Math.floor(user.points / db.settings.pointsToFCFA)} FCFA de réduction\n\n`;
      
      refText += `📤 *Lien de parrainage:*\n`;
      refText += `https://wa.me/${botNumber}?text=.join%20${user.code}\n\n`;
      
      refText += `🏆 *RÉCOMPENSES:*\n`;
      db.rewards.levels.forEach(level => {
        const achieved = user.referrals.length >= level.count;
        refText += `${achieved ? "✅" : "⚪"} ${level.count} filleuls → ${level.reward}\n`;
      });

      refText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      refText += `📌 Partagez votre code et gagnez ${db.rewards.perReferral} points par parrainage!`;

      repondre(refText);

    } catch (error) {
      console.error("[MYREF]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🤝 UTILISER UN CODE DE PARRAINAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "join",
    classe: "Parrainage",
    react: "🤝",
    desc: "Rejoindre avec un code de parrainage",
    alias: ["useref", "rejoindre"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const referralCode = arg[0]?.toUpperCase();

      if (!referralCode) {
        return repondre(`🤝 *REJOINDRE AVEC UN CODE*\n\n❌ Utilisation: .join [CODE]\n\nExemple: .join REF12AB34CD`);
      }

      const db = loadReferralDB();

      // Vérifier si l'utilisateur existe déjà
      if (db.users[number]) {
        if (db.users[number].referredBy) {
          return repondre("❌ Vous avez déjà utilisé un code de parrainage.");
        }
      }

      // Trouver le parrain
      let referrer = null;
      let referrerNumber = null;
      
      for (const [num, user] of Object.entries(db.users)) {
        if (user.code === referralCode) {
          referrer = user;
          referrerNumber = num;
          break;
        }
      }

      if (!referrer) {
        return repondre("❌ Code de parrainage invalide.");
      }

      if (referrerNumber === number) {
        return repondre("❌ Vous ne pouvez pas utiliser votre propre code!");
      }

      // Créer ou mettre à jour l'utilisateur
      if (!db.users[number]) {
        db.users[number] = {
          jid: sender,
          name: msg.pushName || "Utilisateur",
          code: generateReferralCode(number),
          referrals: [],
          points: 0,
          referredBy: referrerNumber,
          createdAt: new Date().toISOString(),
          rewardsReceived: []
        };
      } else {
        db.users[number].referredBy = referrerNumber;
      }

      // Mettre à jour le parrain
      referrer.referrals.push({
        number: number,
        name: msg.pushName || "Utilisateur",
        date: new Date().toISOString(),
        premium: false
      });
      referrer.points += db.rewards.perReferral;

      db.stats.totalReferrals++;
      saveReferralDB(db);

      // Notifier le parrain
      await ovl.sendMessage(referrer.jid, {
        text: `🎉 *NOUVEAU FILLEUL!*\n\n👤 ${msg.pushName || "Un utilisateur"} a rejoint avec votre code!\n\n💰 +${db.rewards.perReferral} points\n📊 Total filleuls: ${referrer.referrals.length}\n💵 Points totaux: ${referrer.points}`
      });

      repondre(`✅ *BIENVENUE!*\n\nVous avez rejoint grâce au parrainage de *${referrer.name}*!\n\n🎁 Votre propre code: \`${db.users[number].code}\`\nPartagez-le pour gagner des points!\n\n💡 Tapez .myref pour plus d'infos`);

    } catch (error) {
      console.error("[JOIN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🏆 CLASSEMENT DES PARRAINS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "refleaderboard",
    classe: "Parrainage",
    react: "🏆",
    desc: "Classement des meilleurs parrains",
    alias: ["topref", "leaderboard", "classement"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const db = loadReferralDB();
      
      // Trier par nombre de filleuls
      const sorted = Object.entries(db.users)
        .filter(([_, user]) => user.referrals.length > 0)
        .sort((a, b) => b[1].referrals.length - a[1].referrals.length)
        .slice(0, 10);

      if (sorted.length === 0) {
        return repondre("🏆 Pas encore de parrains au classement!\n\nSoyez le premier: .myref");
      }

      let leaderboardText = `🏆 *TOP 10 PARRAINS*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const medals = ["🥇", "🥈", "🥉"];
      sorted.forEach(([number, user], index) => {
        const medal = medals[index] || `${index + 1}.`;
        leaderboardText += `${medal} *${user.name}*\n`;
        leaderboardText += `   👥 ${user.referrals.length} filleuls | 💰 ${user.points} pts\n\n`;
      });

      leaderboardText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      leaderboardText += `📊 Total parrainages: ${db.stats.totalReferrals}\n`;
      leaderboardText += `🎁 Obtenez votre code: .myref`;

      repondre(leaderboardText);

    } catch (error) {
      console.error("[REFLEADERBOARD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💱 CONVERTIR LES POINTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "redeempoints",
    classe: "Parrainage",
    react: "💱",
    desc: "Convertir vos points en réduction",
    alias: ["echanger", "convertir", "redeem"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const pointsToRedeem = parseInt(arg[0]);

      const db = loadReferralDB();
      const user = db.users[number];

      if (!user) {
        return repondre("❌ Vous n'avez pas de compte de parrainage.\nTapez .myref pour en créer un.");
      }

      if (!pointsToRedeem) {
        const fcfaValue = Math.floor(user.points / db.settings.pointsToFCFA);
        return repondre(`💱 *ÉCHANGER VOS POINTS*\n\n💰 Vos points: ${user.points}\n💵 Valeur: ${fcfaValue} FCFA\n\n📝 Taux: ${db.settings.pointsToFCFA} points = 1 FCFA\n\n📌 Utilisation: .redeempoints [nombre]\nExemple: .redeempoints 500\n\n⚠️ Les points seront convertis en code de réduction pour votre prochain abonnement premium.`);
      }

      if (pointsToRedeem > user.points) {
        return repondre(`❌ Points insuffisants!\n\n💰 Vos points: ${user.points}\n📝 Demandé: ${pointsToRedeem}`);
      }

      if (pointsToRedeem < 100) {
        return repondre("❌ Minimum 100 points pour échanger.");
      }

      const fcfaValue = Math.floor(pointsToRedeem / db.settings.pointsToFCFA);
      const discountCode = `DISC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Déduire les points
      user.points -= pointsToRedeem;
      user.rewardsReceived.push({
        type: "discount",
        code: discountCode,
        value: fcfaValue,
        points: pointsToRedeem,
        date: new Date().toISOString()
      });
      
      db.stats.totalRewardsGiven++;
      saveReferralDB(db);

      repondre(`✅ *ÉCHANGE RÉUSSI!*\n\n💰 Points échangés: ${pointsToRedeem}\n💵 Valeur: ${fcfaValue} FCFA\n🎟️ Code réduction: \`${discountCode}\`\n\n📌 Utilisez ce code lors de votre prochain achat premium!\n\n💰 Points restants: ${user.points}`);

      // Notifier le propriétaire
      if (config.OWNER_NUMBER) {
        const ownerJid = getSelfJid(ovl);
        await ovl.sendMessage(ownerJid, {
          text: `💱 *ÉCHANGE DE POINTS*\n\n👤 ${user.name} (+${number})\n💰 ${pointsToRedeem} points → ${fcfaValue} FCFA\n🎟️ Code: ${discountCode}`
        });
      }

    } catch (error) {
      console.error("[REDEEMPOINTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES PARRAINAGE (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "refstats",
    classe: "Parrainage",
    react: "📊",
    desc: "Statistiques du système de parrainage (Owner)",
    alias: ["referralstats"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadReferralDB();
      
      const totalUsers = Object.keys(db.users).length;
      const usersWithReferrals = Object.values(db.users).filter(u => u.referrals.length > 0).length;
      const totalPoints = Object.values(db.users).reduce((sum, u) => sum + u.points, 0);
      const totalFilleuls = db.stats.totalReferrals;

      // Top parrain
      let topReferrer = { name: "N/A", count: 0 };
      for (const user of Object.values(db.users)) {
        if (user.referrals.length > topReferrer.count) {
          topReferrer = { name: user.name, count: user.referrals.length };
        }
      }

      let statsText = `📊 *STATISTIQUES PARRAINAGE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      statsText += `👥 Utilisateurs inscrits: ${totalUsers}\n`;
      statsText += `🤝 Parrains actifs: ${usersWithReferrals}\n`;
      statsText += `📈 Total parrainages: ${totalFilleuls}\n`;
      statsText += `💰 Points en circulation: ${totalPoints}\n`;
      statsText += `🎁 Récompenses données: ${db.stats.totalRewardsGiven}\n\n`;
      statsText += `🏆 Top parrain: ${topReferrer.name} (${topReferrer.count})\n\n`;
      statsText += `⚙️ *Configuration:*\n`;
      statsText += `• Points/parrainage: ${db.rewards.perReferral}\n`;
      statsText += `• Taux conversion: ${db.settings.pointsToFCFA} pts = 1 FCFA`;

      repondre(statsText);

    } catch (error) {
      console.error("[REFSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURER PARRAINAGE (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "refconfig",
    classe: "Parrainage",
    react: "⚙️",
    desc: "Configurer le système de parrainage (Owner)",
    alias: ["configref"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();
      const value = parseInt(arg[1]);

      const db = loadReferralDB();

      if (subCommand === "points" && value) {
        db.rewards.perReferral = value;
        saveReferralDB(db);
        repondre(`✅ Points par parrainage mis à jour: ${value}`);
      } else if (subCommand === "rate" && value) {
        db.settings.pointsToFCFA = value;
        saveReferralDB(db);
        repondre(`✅ Taux de conversion mis à jour: ${value} points = 1 FCFA`);
      } else if (subCommand === "on") {
        db.settings.enabled = true;
        saveReferralDB(db);
        repondre("✅ Système de parrainage activé!");
      } else if (subCommand === "off") {
        db.settings.enabled = false;
        saveReferralDB(db);
        repondre("❌ Système de parrainage désactivé!");
      } else {
        repondre(`⚙️ *CONFIGURATION PARRAINAGE*\n\n.refconfig points [n] - Points par parrainage\n.refconfig rate [n] - Taux de conversion\n.refconfig on/off - Activer/désactiver\n\n📊 Actuel:\n• Points/ref: ${db.rewards.perReferral}\n• Taux: ${db.settings.pointsToFCFA} pts = 1 FCFA\n• Statut: ${db.settings.enabled ? "✅ Actif" : "❌ Inactif"}`);
      }

    } catch (error) {
      console.error("[REFCONFIG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Referral.js chargé - Commandes: myref, join, refleaderboard, redeempoints, refstats, refconfig");
