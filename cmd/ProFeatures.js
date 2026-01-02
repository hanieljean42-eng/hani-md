/**
 * ═══════════════════════════════════════════════════════════
 * 💎 HANI-MD - Fonctionnalités Pro
 * ═══════════════════════════════════════════════════════════
 * Fonctionnalités avancées pour utilisateurs premium
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// 👤 GET PROFILE PIC
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pp",
    classe: "Pro",
    react: "👤",
    desc: "Obtenir la photo de profil d'un utilisateur",
    alias: ["profilepic", "photoprofil", "getpp"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        targetJid = msg.key.remoteJid;
      }

      let profilePic;
      try {
        profilePic = await ovl.profilePictureUrl(targetJid, "image");
      } catch (e) {
        return repondre("❌ Impossible d'obtenir la photo de profil (privée ou inexistante)");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        image: { url: profilePic },
        caption: `👤 *Photo de profil*\n\n📱 @${targetJid.split("@")[0]}\n\n✨ HANI-MD`
      }, { quoted: ms, mentions: [targetJid] });

    } catch (error) {
      console.error("[PP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 SET PROFILE PIC
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setpp",
    classe: "Pro",
    react: "📱",
    desc: "Changer la photo de profil du bot",
    alias: ["setprofilepic", "changepic"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .setpp");
      }

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!imageBuffer) {
        return repondre("❌ Impossible de télécharger l'image");
      }

      await ovl.updateProfilePicture(ovl.user.id, imageBuffer);
      repondre("✅ Photo de profil du bot mise à jour!");

    } catch (error) {
      console.error("[SETPP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 SET BIO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setbio",
    classe: "Pro",
    react: "📝",
    desc: "Changer la bio du bot",
    alias: ["bio", "setstatus"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const bio = arg.join(" ");
      if (!bio) {
        return repondre("❌ Utilisation: .setbio [nouvelle bio]");
      }

      await ovl.updateProfileStatus(bio);
      repondre(`✅ Bio mise à jour: "${bio}"`);

    } catch (error) {
      console.error("[SETBIO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 GET CONTACT INFO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "checkuser",
    classe: "Pro",
    react: "📋",
    desc: "Vérifier les infos d'un utilisateur",
    alias: ["userinfo", "infouser", "whois"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
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

      // Vérifier si le numéro est sur WhatsApp
      let onWhatsApp = false;
      try {
        const [result] = await ovl.onWhatsApp(targetJid);
        onWhatsApp = result?.exists || false;
      } catch (e) {}

      // Essayer d'obtenir la photo de profil
      let hasProfilePic = false;
      try {
        await ovl.profilePictureUrl(targetJid, "image");
        hasProfilePic = true;
      } catch (e) {}

      // Essayer d'obtenir le statut
      let status = "Non disponible";
      try {
        const statusResult = await ovl.fetchStatus(targetJid);
        status = statusResult?.status || "Non disponible";
      } catch (e) {}

      let info = `📋 *Informations Utilisateur*\n\n`;
      info += `📱 Numéro: +${targetJid.split("@")[0]}\n`;
      info += `✅ Sur WhatsApp: ${onWhatsApp ? "Oui" : "Non"}\n`;
      info += `🖼️ Photo de profil: ${hasProfilePic ? "Visible" : "Masquée/Aucune"}\n`;
      info += `📝 Bio: ${status.substring(0, 100)}\n\n`;
      info += `✨ HANI-MD`;

      repondre(info);

    } catch (error) {
      console.error("[CHECKUSER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 CRÉER UN LIEN D'INVITATION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "createlink",
    classe: "Pro",
    react: "🔗",
    desc: "Créer un lien WhatsApp direct",
    alias: ["walink", "walink", "chatlink"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const number = arg[0]?.replace(/[^0-9]/g, "");
      
      if (!number) {
        return repondre("❌ Utilisation: .createlink [numéro]");
      }

      const message = arg.slice(1).join(" ");
      let link = `https://wa.me/${number}`;
      
      if (message) {
        link += `?text=${encodeURIComponent(message)}`;
      }

      repondre(`🔗 *Lien WhatsApp créé*\n\n📱 Numéro: +${number}\n🔗 ${link}`);

    } catch (error) {
      console.error("[CREATELINK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📤 FORWARD MESSAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "forward",
    classe: "Pro",
    react: "📤",
    desc: "Transférer un message",
    alias: ["fwd", "transferer"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage) {
        return repondre("❌ Répondez à un message avec .forward [numéro]");
      }

      const number = arg[0]?.replace(/[^0-9]/g, "");
      if (!number) {
        return repondre("❌ Utilisation: .forward [numéro]");
      }

      const targetJid = number + "@s.whatsapp.net";

      await ovl.sendMessage(targetJid, quotedMessage);
      repondre(`📤 Message transféré à +${number}`);

    } catch (error) {
      console.error("[FORWARD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📍 ENVOYER LOCALISATION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "location",
    classe: "Pro",
    react: "📍",
    desc: "Envoyer une fausse localisation",
    alias: ["loc", "fakeloc"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ Utilisation: .location [latitude] [longitude]\n📝 Exemple: .location 48.8566 2.3522 (Paris)");
      }

      const latitude = parseFloat(arg[0]);
      const longitude = parseFloat(arg[1]);

      if (isNaN(latitude) || isNaN(longitude)) {
        return repondre("❌ Coordonnées invalides");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude
        }
      }, { quoted: ms });

    } catch (error) {
      console.error("[LOCATION]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📞 VCARD (Envoyer un contact)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "vcard",
    classe: "Pro",
    react: "📞",
    desc: "Envoyer un contact personnalisé",
    alias: ["contact", "sendcontact"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ Utilisation: .vcard [numéro] [nom]\n📝 Exemple: .vcard 22512345678 John Doe");
      }

      const number = arg[0].replace(/[^0-9]/g, "");
      const name = arg.slice(1).join(" ");

      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;type=CELL;type=VOICE;waid=${number}:+${number}
END:VCARD`;

      await ovl.sendMessage(msg.key.remoteJid, {
        contacts: {
          displayName: name,
          contacts: [{
            vcard
          }]
        }
      }, { quoted: ms });

      repondre(`📞 Contact "${name}" envoyé!`);

    } catch (error) {
      console.error("[VCARD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎭 SET GROUP PP
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "setgrouppp",
    classe: "Pro",
    react: "🎭",
    desc: "Changer la photo du groupe",
    alias: ["setgpp", "groupphoto"]
  },
  async (ovl, msg, { repondre, verif_Groupe, admin_Groupe, verif_Admin, superUser }) => {
    try {
      if (!verif_Groupe) {
        return repondre("❌ Cette commande fonctionne uniquement dans les groupes");
      }
      
      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour modifier la photo");
      }
      
      if (!verif_Admin && !superUser) {
        return repondre("❌ Seuls les admins peuvent utiliser cette commande");
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .setgrouppp");
      }

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!imageBuffer) {
        return repondre("❌ Impossible de télécharger l'image");
      }

      await ovl.updateProfilePicture(msg.key.remoteJid, imageBuffer);
      repondre("✅ Photo du groupe mise à jour!");

    } catch (error) {
      console.error("[SETGROUPPP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ ProFeatures.js chargé - Commandes: pp, setpp, setbio, checkuser, createlink, forward, location, vcard, setgrouppp");
