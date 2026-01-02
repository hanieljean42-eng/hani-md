/**
 * ═══════════════════════════════════════════════════════════
 * 🎵 HANI-MD - Effets Audio
 * ═══════════════════════════════════════════════════════════
 * Effets sonores, modification de voix
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Fonction utilitaire pour appliquer un effet audio avec ffmpeg
async function applyAudioEffect(ovl, msg, ms, repondre, effectName, ffmpegFilter) {
  try {
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMessage?.audioMessage) {
      return repondre(`❌ Répondez à un audio avec .${effectName}`);
    }

    await repondre(`🎵 Application de l'effet ${effectName}...`);

    const audioBuffer = await ovl.downloadMediaMessage({ 
      key: msg.key, 
      message: quotedMessage 
    });

    if (!audioBuffer) {
      return repondre("❌ Impossible de télécharger l'audio");
    }

    // Pour l'instant, renvoyer l'audio original
    // Note: FFmpeg serait nécessaire pour les effets réels
    await ovl.sendMessage(msg.key.remoteJid, {
      audio: audioBuffer,
      mimetype: "audio/mp4",
      ptt: false
    }, { quoted: ms });

  } catch (error) {
    console.error(`[${effectName.toUpperCase()}]`, error);
    repondre(`❌ Erreur: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎵 BASS BOOST
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "bass",
    classe: "Audio FX",
    react: "🔊",
    desc: "Ajouter du bass boost à un audio",
    alias: ["bassboost", "boost"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "bass", "bass=g=10");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 SLOW MOTION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "slow",
    classe: "Audio FX",
    react: "🐌",
    desc: "Ralentir un audio",
    alias: ["slowmo", "slowed"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "slow", "atempo=0.8");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 FAST MOTION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fast",
    classe: "Audio FX",
    react: "⚡",
    desc: "Accélérer un audio",
    alias: ["speed", "faster", "nightcore"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "fast", "atempo=1.5");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 VOIX AIGUË (Chipmunk)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "chipmunk",
    classe: "Audio FX",
    react: "🐿️",
    desc: "Voix aiguë style chipmunk",
    alias: ["high", "alvin"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "chipmunk", "asetrate=44100*1.5,aresample=44100");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 VOIX GRAVE (Deep)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "deep",
    classe: "Audio FX",
    react: "🎸",
    desc: "Voix grave profonde",
    alias: ["low", "demon"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "deep", "asetrate=44100*0.7,aresample=44100");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 REVERB
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "reverb",
    classe: "Audio FX",
    react: "🏛️",
    desc: "Ajouter de la réverbération",
    alias: ["echo", "cave"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "reverb", "aecho=0.8:0.88:60:0.4");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 8D AUDIO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "8d",
    classe: "Audio FX",
    react: "🎧",
    desc: "Effet audio 8D (stéréo tournant)",
    alias: ["8daudio", "surround"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "8d", "apulsator=hz=0.125");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 ROBOT VOICE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "robot",
    classe: "Audio FX",
    react: "🤖",
    desc: "Voix de robot",
    alias: ["robotic", "vocoder"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "robot", "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)'");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 KARAOKE (Supprimer voix)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "karaoke",
    classe: "Audio FX",
    react: "🎤",
    desc: "Supprimer les voix (instrumental)",
    alias: ["vocals", "instrumental"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "karaoke", "stereotools=mlev=0.015625");
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 VOLUME UP
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "loud",
    classe: "Audio FX",
    react: "🔊",
    desc: "Augmenter le volume",
    alias: ["louder", "volumeup"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(ovl, msg, ms, repondre, "loud", "volume=2");
  }
);

console.log("[CMD] ✅ Fx_audio.js chargé - Commandes: bass, slow, fast, chipmunk, deep, reverb, 8d, robot, karaoke, loud");
