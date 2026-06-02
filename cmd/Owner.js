/**
 * ═══════════════════════════════════════════════════════════
 * 👑 HANI-MD - Commandes Owner (Propriétaire)
 * ═══════════════════════════════════════════════════════════
 * Commandes réservées au propriétaire du bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// 🔄 RESTART BOT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "restart",
    classe: "Owner",
    react: "🔄",
    desc: "Redémarrer le bot",
    alias: ["reboot", "redemarrer"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      await repondre("🔄 Redémarrage du bot en cours...");
      
      // Petit délai avant le redémarrage
      setTimeout(() => {
        process.exit(0);
      }, 2000);

    } catch (error) {
      console.error("[RESTART]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔌 SHUTDOWN
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "shutdown",
    classe: "Owner",
    react: "🔌",
    desc: "Arrêter le bot",
    alias: ["stop", "off", "eteindre"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      await repondre("🔌 Arrêt du bot... À bientôt!");
      
      setTimeout(() => {
        process.exit(1);
      }, 2000);

    } catch (error) {
      console.error("[SHUTDOWN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📢 BROADCAST
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "broadcast",
    classe: "Owner",
    react: "📢",
    desc: "Envoyer un message à tous les groupes",
    alias: ["bc", "diffuser"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const message = arg.join(" ");
      if (!message) {
        return repondre("❌ Utilisation: .broadcast [message]");
      }

      await repondre("📢 Diffusion en cours...");

      // Récupérer tous les groupes
      const groups = await ovl.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);

      let sent = 0;
      let failed = 0;

      for (const groupId of groupIds) {
        try {
          await ovl.sendMessage(groupId, {
            text: `📢 *ANNONCE DU BOT*\n\n${message}\n\n— *HANI-MD*`
          });
          sent++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Délai anti-spam
        } catch (e) {
          failed++;
        }
      }

      repondre(`📢 *Diffusion terminée!*\n\n✅ Envoyé: ${sent} groupes\n❌ Échec: ${failed} groupes`);

    } catch (error) {
      console.error("[BROADCAST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🚪 LEAVE GROUP
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "leave",
    classe: "Owner",
    react: "🚪",
    desc: "Quitter un groupe",
    alias: ["quit", "partir"]
  },
  async (ovl, msg, { repondre, superUser, verif_Groupe }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }

      await repondre("👋 Au revoir! Je quitte ce groupe...");
      
      setTimeout(async () => {
        await ovl.groupLeave(msg.key.remoteJid);
      }, 2000);

    } catch (error) {
      console.error("[LEAVE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👤 AJOUTER SUDO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "addsudo",
    classe: "Owner",
    react: "👤",
    desc: "Ajouter un utilisateur sudo",
    alias: ["addsuperuser", "addsu"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      // Ajouter à la liste sudo
      const { addSudo } = require("../DataBase/sudo");
      await addSudo(targetJid.split("@")[0]);

      repondre(`✅ @${targetJid.split("@")[0]} est maintenant sudo`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[ADDSUDO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👤 RETIRER SUDO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delsudo",
    classe: "Owner",
    react: "👤",
    desc: "Retirer un utilisateur sudo",
    alias: ["remsudo", "removesudo"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      // Retirer de la liste sudo
      const { removeSudo } = require("../DataBase/sudo");
      await removeSudo(targetJid.split("@")[0]);

      repondre(`✅ @${targetJid.split("@")[0]} n'est plus sudo`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[DELSUDO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE SUDO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "listsudo",
    classe: "Owner",
    react: "📋",
    desc: "Liste des utilisateurs sudo",
    alias: ["sudolist", "sulist"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const { getSudos } = require("../DataBase/sudo");
      const sudoList = await getSudos();

      if (!sudoList || sudoList.length === 0) {
        return repondre("📋 *Liste Sudo*\n\nAucun utilisateur sudo.");
      }

      let list = `📋 *Liste Sudo* (${sudoList.length})\n\n`;
      
      sudoList.forEach((sudo, i) => {
        list += `${i + 1}. @${sudo}\n`;
      });

      const mentions = sudoList.map(s => s + "@s.whatsapp.net");
      repondre(list, { mentions });

    } catch (error) {
      console.error("[LISTSUDO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🚫 BAN USER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ban",
    classe: "Owner",
    react: "🚫",
    desc: "Bannir un utilisateur du bot",
    alias: ["banuser", "bannir"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      const reason = arg.slice(1).join(" ") || "Aucune raison spécifiée";

      // Ajouter à la liste des bannis
      const { banUser } = require("../DataBase/ban");
      await banUser(targetJid.split("@")[0], reason);

      repondre(`🚫 @${targetJid.split("@")[0]} a été banni\n\n📝 Raison: ${reason}`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[BAN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ UNBAN USER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "unban",
    classe: "Owner",
    react: "✅",
    desc: "Débannir un utilisateur",
    alias: ["unblock", "deban"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      // Retirer de la liste des bannis
      const { unbanUser } = require("../DataBase/ban");
      await unbanUser(targetJid.split("@")[0]);

      repondre(`✅ @${targetJid.split("@")[0]} a été débanni`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[UNBAN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💻 SHELL (Commande système)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "shell",
    classe: "Owner",
    react: "💻",
    desc: "Exécuter une commande shell",
    alias: ["sh", "exec", "$"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const command = arg.join(" ");
      if (!command) {
        return repondre("❌ Utilisation: .shell [commande]");
      }

      exec(command, (error, stdout, stderr) => {
        if (error) {
          return repondre(`❌ Erreur:\n\n${error.message}`);
        }
        if (stderr) {
          return repondre(`⚠️ Stderr:\n\n${stderr}`);
        }
        repondre(`💻 *Résultat:*\n\n${stdout || "Aucune sortie"}`);
      });

    } catch (error) {
      console.error("[SHELL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATS BOT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "stats",
    classe: "Owner",
    react: "📊",
    desc: "Statistiques du bot",
    alias: ["botstats", "status"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      // Infos système
      const os = require("os");
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      // Mémoire
      const used = process.memoryUsage();
      const memUsed = (used.heapUsed / 1024 / 1024).toFixed(2);
      const memTotal = (used.heapTotal / 1024 / 1024).toFixed(2);

      // Groupes
      let groupCount = 0;
      try {
        const groups = await ovl.groupFetchAllParticipating();
        groupCount = Object.keys(groups).length;
      } catch (e) {}

      let stats = `📊 *Statistiques HANI-MD*\n\n`;
      stats += `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n\n`;
      stats += `💾 *Mémoire:*\n`;
      stats += `├ Utilisée: ${memUsed} MB\n`;
      stats += `└ Totale: ${memTotal} MB\n\n`;
      stats += `💻 *Système:*\n`;
      stats += `├ OS: ${os.type()}\n`;
      stats += `├ Platform: ${os.platform()}\n`;
      stats += `└ Arch: ${os.arch()}\n\n`;
      stats += `👥 *Groupes:* ${groupCount}\n`;
      stats += `🤖 *Version:* 2.6.0 SECURE\n`;

      repondre(stats);

    } catch (error) {
      console.error("[STATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔧 SET PREFIX
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setprefix",
    classe: "Owner",
    react: "🔧",
    desc: "Changer le préfixe du bot",
    alias: ["prefix", "changeprefix"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const newPrefix = arg[0];
      if (!newPrefix) {
        return repondre("❌ Utilisation: .setprefix [nouveau préfixe]");
      }

      if (newPrefix.length > 3) {
        return repondre("❌ Le préfixe ne peut pas dépasser 3 caractères");
      }

      // Sauvegarder le nouveau préfixe
      process.env.PREFIX = newPrefix;

      repondre(`✅ Préfixe changé en: *${newPrefix}*\n\n⚠️ Redémarrez le bot pour appliquer le changement.`);

    } catch (error) {
      console.error("[SETPREFIX]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔧 MODE PUBLIC/PRIVÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "public",
    classe: "Owner",
    react: "🌐",
    desc: "Passer le bot en mode public",
    alias: ["modepublic"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      process.env.BOT_MODE = "public";
      repondre("🌐 *Mode Public activé!*\n\nTout le monde peut utiliser le bot.");

    } catch (error) {
      console.error("[PUBLIC]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

ovlcmd(
  {
    nom_cmd: "private",
    classe: "Owner",
    react: "🔒",
    desc: "Passer le bot en mode privé",
    alias: ["modeprivate", "prive"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      process.env.BOT_MODE = "private";
      repondre("🔒 *Mode Privé activé!*\n\nSeuls les sudos peuvent utiliser le bot.");

    } catch (error) {
      console.error("[PRIVATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Owner.js chargé - Commandes: restart, shutdown, broadcast, leave, addsudo, delsudo, listsudo, ban, unban, shell, stats, setprefix, public, private");
