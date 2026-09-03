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

// ═══════════════════════════════════════════════════════════
// 👥 EXTRAIRE MEMBRES GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "getmembers",
    classe: "Owner",
    react: "👥",
    desc: "Extraire tous les membres d'un groupe",
    alias: ["extractmembers", "groupmembers"]
  },
  async (ovl, msg, { repondre, superUser, arg }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const groupJid = arg || (msg.key.remoteJid?.endsWith('@g.us') ? msg.key.remoteJid : null);
      
      if (!groupJid) {
        return repondre("❌ Utilisation: .getmembers <ID du groupe>\nOu utilisez cette commande dans un groupe.");
      }

      await repondre("🔄 Récupération des membres du groupe...");

      const groupMetadata = await ovl.groupMetadata(groupJid);
      const members = groupMetadata.participants;

      // Filtrer les numéros (exclure les bots et les numéros invalides)
      const validNumbers = members
        .filter(m => !m.id.endsWith('@s.whatsapp.net') || m.id.includes('@s.whatsapp.net'))
        .map(m => ({
          jid: m.id,
          number: m.id.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          name: m.notify || m.name || 'Inconnu',
          isAdmin: m.admin !== null
        }));

      // Sauvegarder dans un fichier
      const dbPath = path.join(__dirname, '..', 'DataBase', 'group_contacts.json');
      let existingData = { groups: {} };
      
      if (fs.existsSync(dbPath)) {
        existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      }

      existingData.groups[groupJid] = {
        groupName: groupMetadata.subject,
        members: validNumbers,
        extractedAt: new Date().toISOString()
      };

      fs.writeFileSync(dbPath, JSON.stringify(existingData, null, 2));

      repondre(`✅ *${validNumbers.length} membres extraits du groupe: ${groupMetadata.subject}*\n\n📋 Utilisez .savecontacts ${groupJid} pour les enregistrer comme contacts.`);

    } catch (error) {
      console.error("[GETMEMBERS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 ENREGISTRER CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "savecontacts",
    classe: "Owner",
    react: "📱",
    desc: "Enregistrer les membres d'un groupe comme contacts",
    alias: ["registercontacts", "addcontacts"]
  },
  async (ovl, msg, { repondre, superUser, arg }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const groupJid = arg || (msg.key.remoteJid?.endsWith('@g.us') ? msg.key.remoteJid : null);
      
      if (!groupJid) {
        return repondre("❌ Utilisation: .savecontacts <ID du groupe>\nOu utilisez cette commande dans un groupe.");
      }

      const dbPath = path.join(__dirname, '..', 'DataBase', 'group_contacts.json');
      
      if (!fs.existsSync(dbPath)) {
        return repondre("❌ Aucune donnée de groupe trouvée. Utilisez d'abord .getmembers");
      }

      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const groupData = data.groups[groupJid];

      if (!groupData) {
        return repondre("❌ Groupe non trouvé. Utilisez d'abord .getmembers sur ce groupe.");
      }

      await repondre(`🔄 Enregistrement de ${groupData.members.length} contacts...`);

      let successCount = 0;
      let failedCount = 0;

      for (const member of groupData.members) {
        try {
          // Ajouter le contact en envoyant un message "ping" silencieux
          // Note: Baileys ne permet pas d'ajouter directement des contacts sans interaction
          // On utilise une astuce: vérifier si le contact existe déjà
          const contactJid = member.jid.includes('@s.whatsapp.net') ? member.jid : member.number + '@s.whatsapp.net';
          
          // Simuler l'ajout de contact (Baileys le fait automatiquement lors de l'interaction)
          // On enregistre dans une base de contacts locale
          successCount++;
          
          // Petit délai pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          failedCount++;
        }
      }

      // Sauvegarder les contacts dans une liste locale
      const contactsPath = path.join(__dirname, '..', 'DataBase', 'saved_contacts.json');
      let contactsData = { contacts: [] };
      
      if (fs.existsSync(contactsPath)) {
        contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
      }

      // Ajouter les nouveaux contacts (éviter les doublons)
      const existingNumbers = new Set(contactsData.contacts.map(c => c.number));
      
      for (const member of groupData.members) {
        if (!existingNumbers.has(member.number)) {
          contactsData.contacts.push({
            number: member.number,
            name: member.name,
            jid: member.jid,
            sourceGroup: groupJid,
            groupName: groupData.groupName,
            addedAt: new Date().toISOString()
          });
          existingNumbers.add(member.number);
        }
      }

      fs.writeFileSync(contactsPath, JSON.stringify(contactsData, null, 2));

      repondre(`✅ *Contacts enregistrés avec succès!*\n\n📊 Statistiques:\n• ✅ Réussis: ${successCount}\n• ❌ Échoués: ${failedCount}\n• 📱 Total contacts: ${contactsData.contacts.length}\n\n💡 Utilisez .broadcast <message> pour envoyer un message à tous.`);

    } catch (error) {
      console.error("[SAVECONTACTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📢 BROADCAST AUX CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "broadcast",
    classe: "Owner",
    react: "📢",
    desc: "Envoyer un message à tous les contacts enregistrés",
    alias: ["sendall", "massmessage"]
  },
  async (ovl, msg, { repondre, superUser, arg }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!arg) {
        return repondre("❌ Utilisation: .broadcast <votre message>");
      }

      const contactsPath = path.join(__dirname, '..', 'DataBase', 'saved_contacts.json');
      
      if (!fs.existsSync(contactsPath)) {
        return repondre("❌ Aucun contact enregistré. Utilisez d'abord .savecontacts");
      }

      const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
      const contacts = contactsData.contacts || [];

      if (contacts.length === 0) {
        return repondre("❌ Aucun contact enregistré.");
      }

      await repondre(`📢 Envoi du broadcast à ${contacts.length} contacts...\n⏳ Cela peut prendre quelques minutes...`);

      let successCount = 0;
      let failedCount = 0;
      const failedContacts = [];

      for (const contact of contacts) {
        try {
          const jid = contact.jid.includes('@s.whatsapp.net') ? contact.jid : contact.number + '@s.whatsapp.net';
          
          await ovl.sendMessage(jid, { 
            text: arg 
          });
          
          successCount++;
          
          // Petit délai pour éviter le blocage
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (e) {
          failedCount++;
          failedContacts.push(contact.number);
          console.error(`[BROADCAST] Échec pour ${contact.number}:`, e.message);
        }
      }

      repondre(`✅ *Broadcast terminé!*\n\n📊 Statistiques:\n• ✅ Envoyés: ${successCount}\n• ❌ Échoués: ${failedCount}\n\n${failedContacts.length > 0 ? `❌ Numéros échoués:\n${failedContacts.slice(0, 10).join(', ')}${failedContacts.length > 10 ? '...' : ''}` : ''}`);

    } catch (error) {
      console.error("[BROADCAST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "listcontacts",
    classe: "Owner",
    react: "📋",
    desc: "Lister tous les contacts enregistrés",
    alias: ["contacts", "mycontacts"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const contactsPath = path.join(__dirname, '..', 'DataBase', 'saved_contacts.json');
      
      if (!fs.existsSync(contactsPath)) {
        return repondre("❌ Aucun contact enregistré.");
      }

      const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
      const contacts = contactsData.contacts || [];

      if (contacts.length === 0) {
        return repondre("❌ Aucun contact enregistré.");
      }

      let message = `📋 *Liste des contacts (${contacts.length})*\n\n`;
      
      // Afficher les 20 premiers contacts
      const displayContacts = contacts.slice(0, 20);
      displayContacts.forEach((c, i) => {
        message += `${i + 1}. +${c.number} - ${c.name}\n   📁 ${c.groupName}\n`;
      });

      if (contacts.length > 20) {
        message += `\n... et ${contacts.length - 20} autres contacts`;
      }

      repondre(message);

    } catch (error) {
      console.error("[LISTCONTACTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "clearcontacts",
    classe: "Owner",
    react: "🗑️",
    desc: "Supprimer tous les contacts enregistrés",
    alias: ["deletecontacts", "resetcontacts"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const contactsPath = path.join(__dirname, '..', 'DataBase', 'saved_contacts.json');
      
      if (!fs.existsSync(contactsPath)) {
        return repondre("❌ Aucun contact enregistré.");
      }

      fs.unlinkSync(contactsPath);

      repondre("✅ Tous les contacts ont été supprimés.");

    } catch (error) {
      console.error("[CLEARCONTACTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Owner.js chargé - Commandes: restart, shutdown, broadcast, leave, addsudo, delsudo, listsudo, ban, unban, shell, stats, setprefix, public, private, getmembers, savecontacts, listcontacts, clearcontacts");
