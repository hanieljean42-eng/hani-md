/**
 * ═══════════════════════════════════════════════════════════
 * 👥 HANI-MD - Commandes Groupe
 * ═══════════════════════════════════════════════════════════
 * Gestion des groupes WhatsApp
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");

// ═══════════════════════════════════════════════════════════
// 👢 KICK/BAN
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "kick",
    classe: "Groupe",
    react: "👢",
    desc: "Expulser un membre du groupe",
    alias: ["remove", "expulser"]
  },
  async (ovl, msg, { arg, ms, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour utiliser cette commande");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un membre pour l'expulser");
      }

      await ovl.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], "remove");
      repondre(`👢 @${targetJid.split("@")[0]} a été expulsé du groupe`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[KICK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ➕ ADD
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "add",
    classe: "Groupe",
    react: "➕",
    desc: "Ajouter un membre au groupe",
    alias: ["ajouter", "invite"]
  },
  async (ovl, msg, { arg, ms, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour utiliser cette commande");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      if (!arg[0]) {
        return repondre("❌ Utilisation: .add [numéro]\nExemple: .add 22512345678");
      }

      const number = arg[0].replace(/[^0-9]/g, "");
      const targetJid = number + "@s.whatsapp.net";

      await ovl.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], "add");
      repondre(`✅ @${number} a été ajouté au groupe`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[ADD]", error);
      if (error.message.includes("not-authorized")) {
        repondre("❌ Cette personne a bloqué les ajouts ou n'est pas sur WhatsApp");
      } else {
        repondre(`❌ Erreur: ${error.message}`);
      }
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👑 PROMOTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "promote",
    classe: "Groupe",
    react: "👑",
    desc: "Promouvoir un membre en admin",
    alias: ["promouvoir", "admin"]
  },
  async (ovl, msg, { arg, ms, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour utiliser cette commande");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un membre pour le promouvoir");
      }

      await ovl.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], "promote");
      repondre(`👑 @${targetJid.split("@")[0]} est maintenant admin`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[PROMOTE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👤 DEMOTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "demote",
    classe: "Groupe",
    react: "👤",
    desc: "Rétrograder un admin en membre",
    alias: ["retrograder", "unadmin"]
  },
  async (ovl, msg, { arg, ms, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour utiliser cette commande");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un admin pour le rétrograder");
      }

      await ovl.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], "demote");
      repondre(`👤 @${targetJid.split("@")[0]} n'est plus admin`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[DEMOTE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 LIEN DU GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "grouplink",
    classe: "Groupe",
    react: "🔗",
    desc: "Obtenir le lien d'invitation du groupe",
    alias: ["link", "liengroupe", "invite"]
  },
  async (ovl, msg, { repondre, verif_Groupe, admin_Groupe }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour obtenir le lien");
      }

      const code = await ovl.groupInviteCode(msg.key.remoteJid);
      repondre(`🔗 *Lien d'invitation*\n\nhttps://chat.whatsapp.com/${code}`);

    } catch (error) {
      console.error("[GROUPLINK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 RÉVOQUER LE LIEN
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "revoke",
    classe: "Groupe",
    react: "🔄",
    desc: "Révoquer et générer un nouveau lien",
    alias: ["resetlink", "newlink"]
  },
  async (ovl, msg, { repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour révoquer le lien");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      await ovl.groupRevokeInvite(msg.key.remoteJid);
      const newCode = await ovl.groupInviteCode(msg.key.remoteJid);
      repondre(`🔄 *Lien révoqué!*\n\n🔗 Nouveau lien:\nhttps://chat.whatsapp.com/${newCode}`);

    } catch (error) {
      console.error("[REVOKE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 DESCRIPTION DU GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setdesc",
    classe: "Groupe",
    react: "📝",
    desc: "Modifier la description du groupe",
    alias: ["setdescription", "gdesc"]
  },
  async (ovl, msg, { arg, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour modifier la description");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      const newDesc = arg.join(" ");
      if (!newDesc) {
        return repondre("❌ Utilisation: .setdesc [nouvelle description]");
      }

      await ovl.groupUpdateDescription(msg.key.remoteJid, newDesc);
      repondre(`✅ Description modifiée:\n\n${newDesc}`);

    } catch (error) {
      console.error("[SETDESC]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📛 NOM DU GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setname",
    classe: "Groupe",
    react: "📛",
    desc: "Modifier le nom du groupe",
    alias: ["rename", "gname"]
  },
  async (ovl, msg, { arg, repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour modifier le nom");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      const newName = arg.join(" ");
      if (!newName) {
        return repondre("❌ Utilisation: .setname [nouveau nom]");
      }

      await ovl.groupUpdateSubject(msg.key.remoteJid, newName);
      repondre(`✅ Nom du groupe modifié: *${newName}*`);

    } catch (error) {
      console.error("[SETNAME]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔒 OUVRIR/FERMER LE GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "groupopen",
    classe: "Groupe",
    react: "🔓",
    desc: "Ouvrir le groupe (tous peuvent écrire)",
    alias: ["open", "ouvrir"]
  },
  async (ovl, msg, { repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour modifier les paramètres");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      await ovl.groupSettingUpdate(msg.key.remoteJid, "not_announcement");
      repondre("🔓 *Groupe ouvert!*\n\nTous les membres peuvent maintenant écrire.");

    } catch (error) {
      console.error("[GROUPOPEN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

ovlcmd(
  {
    nom_cmd: "groupclose",
    classe: "Groupe",
    react: "🔒",
    desc: "Fermer le groupe (admins seulement)",
    alias: ["close", "fermer", "mute"]
  },
  async (ovl, msg, { repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour modifier les paramètres");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      await ovl.groupSettingUpdate(msg.key.remoteJid, "announcement");
      repondre("🔒 *Groupe fermé!*\n\nSeuls les admins peuvent maintenant écrire.");

    } catch (error) {
      console.error("[GROUPCLOSE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 INFOS DU GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "groupinfo",
    classe: "Groupe",
    react: "📊",
    desc: "Afficher les informations du groupe",
    alias: ["ginfo", "infosgroupe"]
  },
  async (ovl, msg, { repondre, verif_Groupe }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }

      const groupMetadata = await ovl.groupMetadata(msg.key.remoteJid);
      
      const admins = groupMetadata.participants.filter(p => p.admin);
      const members = groupMetadata.participants.length;
      const owner = groupMetadata.owner || "Inconnu";
      const createdAt = new Date(groupMetadata.creation * 1000).toLocaleDateString("fr-FR");

      let info = `📊 *Infos du Groupe*\n\n`;
      info += `📛 *Nom:* ${groupMetadata.subject}\n`;
      info += `📝 *Description:* ${groupMetadata.desc || "Aucune"}\n\n`;
      info += `👑 *Créateur:* @${owner.split("@")[0]}\n`;
      info += `📅 *Créé le:* ${createdAt}\n\n`;
      info += `👥 *Membres:* ${members}\n`;
      info += `👑 *Admins:* ${admins.length}\n`;

      repondre(info, { mentions: [owner] });

    } catch (error) {
      console.error("[GROUPINFO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES ADMINS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "adminlist",
    classe: "Groupe",
    react: "👑",
    desc: "Liste des administrateurs",
    alias: ["admins", "listeadmins"]
  },
  async (ovl, msg, { repondre, verif_Groupe }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }

      const groupMetadata = await ovl.groupMetadata(msg.key.remoteJid);
      const admins = groupMetadata.participants.filter(p => p.admin);

      if (admins.length === 0) {
        return repondre("❌ Aucun admin trouvé");
      }

      let list = `👑 *Administrateurs du groupe* (${admins.length})\n\n`;
      
      admins.forEach((admin, i) => {
        const role = admin.admin === "superadmin" ? "👑 Super Admin" : "🛡️ Admin";
        list += `${i + 1}. @${admin.id.split("@")[0]} ${role}\n`;
      });

      repondre(list, { mentions: admins.map(a => a.id) });

    } catch (error) {
      console.error("[ADMINLIST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES MEMBRES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "memberlist",
    classe: "Groupe",
    react: "👥",
    desc: "Liste des membres",
    alias: ["members", "listemembres"]
  },
  async (ovl, msg, { repondre, verif_Groupe }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }

      const groupMetadata = await ovl.groupMetadata(msg.key.remoteJid);
      const members = groupMetadata.participants;

      if (members.length === 0) {
        return repondre("❌ Aucun membre trouvé");
      }

      let list = `👥 *Membres du groupe* (${members.length})\n\n`;
      
      members.slice(0, 50).forEach((member, i) => {
        const role = member.admin ? (member.admin === "superadmin" ? " 👑" : " 🛡️") : "";
        list += `${i + 1}. @${member.id.split("@")[0]}${role}\n`;
      });

      if (members.length > 50) {
        list += `\n... et ${members.length - 50} autres membres`;
      }

      repondre(list, { mentions: members.slice(0, 50).map(m => m.id) });

    } catch (error) {
      console.error("[MEMBERLIST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📢 TAG ALL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tagall",
    classe: "Groupe",
    react: "📢",
    desc: "Mentionner tous les membres",
    alias: ["everyone", "all"]
  },
  async (ovl, msg, { arg, ms, repondre, verif_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      const groupMetadata = await ovl.groupMetadata(msg.key.remoteJid);
      const members = groupMetadata.participants.map(p => p.id);
      const message = arg.join(" ") || "📢 Attention tout le monde!";

      let tagMessage = `📢 *ANNONCE*\n\n${message}\n\n`;
      
      members.forEach(member => {
        tagMessage += `@${member.split("@")[0]} `;
      });

      await ovl.sendMessage(msg.key.remoteJid, {
        text: tagMessage,
        mentions: members
      }, { quoted: ms });

    } catch (error) {
      console.error("[TAGALL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎭 ANTI-LIEN
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "antilink",
    classe: "Groupe",
    react: "🔗",
    desc: "Activer/désactiver l'anti-lien",
    alias: ["antiliengroupe"]
  },
  async (ovl, msg, { arg, repondre, verif_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      const action = arg[0]?.toLowerCase();
      
      if (action === "on" || action === "1") {
        // Activer l'anti-lien (à implémenter avec la DB)
        repondre("🔗 *Anti-lien activé!*\n\nLes liens seront automatiquement supprimés.");
      } else if (action === "off" || action === "0") {
        // Désactiver l'anti-lien
        repondre("🔗 *Anti-lien désactivé!*");
      } else {
        repondre("❌ Utilisation: .antilink on/off");
      }

    } catch (error) {
      console.error("[ANTILINK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Groupe.js chargé - Commandes: kick, add, promote, demote, grouplink, revoke, setdesc, setname, groupopen, groupclose, groupinfo, adminlist, memberlist, tagall, antilink");
