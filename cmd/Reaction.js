/**
 * ═══════════════════════════════════════════════════════════
 * 😊 HANI-MD - Commandes Réaction
 * ═══════════════════════════════════════════════════════════
 * Réactions aux messages, emojis
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");

// ═══════════════════════════════════════════════════════════
// ❤️ RÉAGIR À UN MESSAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "react",
    classe: "Réaction",
    react: "❤️",
    desc: "Réagir à un message avec un emoji",
    alias: ["reaction", "emoji"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .react [emoji]");
      }

      const emoji = arg[0] || "❤️";

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: emoji,
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: quotedMessage.participant === ovl.user?.id,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

      repondre(`✅ Réaction ${emoji} ajoutée!`);

    } catch (error) {
      console.error("[REACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❤️ LIKE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "like",
    classe: "Réaction",
    react: "❤️",
    desc: "Aimer un message (❤️)",
    alias: ["coeur", "heart"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .like");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "❤️",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

    } catch (error) {
      console.error("[LIKE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 😂 LOL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "lol",
    classe: "Réaction",
    react: "😂",
    desc: "Réagir avec 😂",
    alias: ["haha", "mdr"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .lol");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "😂",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

    } catch (error) {
      console.error("[LOL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👍 POUCE EN L'AIR
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ok",
    classe: "Réaction",
    react: "👍",
    desc: "Réagir avec 👍",
    alias: ["thumbsup", "super"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .ok");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "👍",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

    } catch (error) {
      console.error("[OK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔥 FEU
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "feu",
    classe: "Réaction",
    react: "🔥",
    desc: "Réagir avec 🔥",
    alias: ["hot", "chaud"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .feu");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "🔥",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

    } catch (error) {
      console.error("[FEU]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 😢 SAD
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "sad",
    classe: "Réaction",
    react: "😢",
    desc: "Réagir avec 😢",
    alias: ["triste", "crying"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .sad");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "😢",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

    } catch (error) {
      console.error("[SAD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❌ UNREACT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "unreact",
    classe: "Réaction",
    react: "❌",
    desc: "Supprimer une réaction",
    alias: ["removereact", "noreact"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .unreact");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: "",
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

      repondre("✅ Réaction supprimée!");

    } catch (error) {
      console.error("[UNREACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎲 REACTION ALÉATOIRE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "randomreact",
    classe: "Réaction",
    react: "🎲",
    desc: "Réaction aléatoire",
    alias: ["randreact", "rreact"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!quotedMessage?.stanzaId) {
        return repondre("❌ Répondez à un message avec .randomreact");
      }

      const emojis = ["❤️", "😂", "😍", "👍", "🔥", "👏", "😮", "🥺", "😢", "😡", "💕", "🎉", "✨", "💯", "🙏"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      await ovl.sendMessage(msg.key.remoteJid, {
        react: {
          text: randomEmoji,
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedMessage.stanzaId,
            participant: quotedMessage.participant
          }
        }
      });

      repondre(`✅ Réaction ${randomEmoji} ajoutée!`);

    } catch (error) {
      console.error("[RANDOMREACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Reaction.js chargé - Commandes: react, like, lol, ok, feu, sad, unreact, randomreact");
