/**
 * ═══════════════════════════════════════════════════════════
 * 🎵 HANI-MD - Effets Audio
 * ═══════════════════════════════════════════════════════════
 * Effets sonores, modification de voix avec FFmpeg
 * Version avec effets réels fonctionnels
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec, execSync } = require("child_process");
const os = require("os");

// Fonction pour télécharger un média audio
async function downloadAudioBuffer(quotedMessage) {
  try {
    const stream = await downloadContentFromMessage(
      quotedMessage.audioMessage,
      'audio'
    );
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (e) {
    console.error("[AUDIO] Erreur téléchargement:", e.message);
    return null;
  }
}

// ffmpeg-static: binaire bundlé cross-platform (Windows + Linux/Render)
let ffmpegStaticPath = null;
try { ffmpegStaticPath = require('ffmpeg-static'); } catch(e) {}

// Chemins possibles pour FFmpeg
const FFMPEG_PATHS = [
  ...(ffmpegStaticPath ? [ffmpegStaticPath] : []),
  "ffmpeg", // PATH système
  "/usr/bin/ffmpeg", // Linux standard
  "/usr/local/bin/ffmpeg", // Linux brew/local
  "C:\\ffmpeg\\bin\\ffmpeg.exe",
  "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"
];

// Variable pour stocker le chemin FFmpeg trouvé
let FFMPEG_PATH = null;

// Fonction pour trouver FFmpeg
function findFFmpeg() {
  for (const ffmpegPath of FFMPEG_PATHS) {
    try {
      execSync(`"${ffmpegPath}" -version`, { stdio: 'pipe' });
      return ffmpegPath;
    } catch (e) {
      // Essayer le prochain chemin
    }
  }
  return null;
}

// Fonction pour vérifier FFmpeg à chaque appel
function checkFFmpeg() {
  if (FFMPEG_PATH) return true;
  FFMPEG_PATH = findFFmpeg();
  return FFMPEG_PATH !== null;
}

// Obtenir la commande FFmpeg
function getFFmpegCommand() {
  if (!FFMPEG_PATH) FFMPEG_PATH = findFFmpeg();
  return FFMPEG_PATH ? `"${FFMPEG_PATH}"` : "ffmpeg";
}

// Vérification initiale
FFMPEG_PATH = findFFmpeg();
if (FFMPEG_PATH) {
  console.log("[AUDIO FX] ✅ FFmpeg détecté:", FFMPEG_PATH);
} else {
  console.log("[AUDIO FX] ⚠️ FFmpeg non détecté - Effets audio limités");
}

// Créer un dossier temp s'il n'existe pas
const tempDir = path.join(os.tmpdir(), "hani-audio");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Commande pour vérifier l'état des effets audio
ovlcmd(
  {
    nom_cmd: "fxstatus",
    classe: "Audio FX",
    react: "🎵",
    desc: "Vérifier si les effets audio sont disponibles",
    alias: ["audiofx", "ffmpegcheck"]
  },
  async (ovl, msg, { repondre }) => {
    const ffmpegOk = checkFFmpeg();
    if (ffmpegOk) {
      const ffmpegPath = FFMPEG_PATH || "ffmpeg";
      repondre(`🎵 *Effets Audio - HANI-MD*\n\n✅ FFmpeg est installé!\n📂 Chemin: ${ffmpegPath.length > 50 ? '...' + ffmpegPath.slice(-40) : ffmpegPath}\n\n📝 *Effets disponibles (15):*\n• .bass - Amplifier les basses\n• .slow - Ralentir l'audio\n• .fast - Accélérer l'audio\n• .chipmunk - Voix aiguë\n• .deep - Voix grave\n• .reverb - Effet réverbération\n• .8d - Effet 8D\n• .robot - Voix robotique\n• .karaoke - Supprimer voix\n• .loud - Augmenter volume\n• .telephone - Effet téléphone\n• .underwater - Effet sous l'eau\n• .vibrato - Effet vibrato\n• .treble - Augmenter aigus\n• .reverse - Inverser audio\n\n💡 Répondez à un audio avec la commande\n📋 Voir: .menu audio`);
    } else {
      repondre(`🎵 *Effets Audio - HANI-MD*\n\n❌ FFmpeg n'est pas installé!\n\n💡 Installation:\n• Windows: winget install ffmpeg\n• Linux: sudo apt install ffmpeg\n\n⚠️ Après installation, redémarrez le bot.`);
    }
  }
);

// Fonction utilitaire pour appliquer un effet audio avec ffmpeg
async function applyAudioEffect(ovl, msg, ms, repondre, effectName, ffmpegFilter, description) {
  try {
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMessage?.audioMessage) {
      return repondre(`❌ Répondez à un audio avec .${effectName}`);
    }

    // Vérifier FFmpeg à chaque appel
    const ffmpegAvailable = checkFFmpeg();
    
    if (!ffmpegAvailable) {
      return repondre(`❌ L'effet ${effectName} nécessite FFmpeg.\n\n💡 Installation:\n• Windows: winget install ffmpeg\n• Linux: sudo apt install ffmpeg\n\n📝 Utilisez .fxstatus pour vérifier`);
    }

    await repondre(`🎵 Application de l'effet ${effectName}...`);

    // Télécharger l'audio avec la bonne méthode
    const audioBuffer = await downloadAudioBuffer(quotedMessage);

    if (!audioBuffer) {
      return repondre("❌ Impossible de télécharger l'audio");
    }

    // Créer les fichiers temporaires
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp3`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp3`);

    // Sauvegarder l'audio d'entrée
    fs.writeFileSync(inputPath, audioBuffer);

    // Appliquer l'effet avec FFmpeg (utiliser le chemin trouvé)
    const ffmpegBin = getFFmpegCommand();
    const ffmpegCmd = `${ffmpegBin} -i "${inputPath}" -af "${ffmpegFilter}" -y "${outputPath}"`;
    
    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg: ${error.message}`));
        } else {
          resolve();
        }
      });
    });

    // Lire le fichier de sortie
    if (!fs.existsSync(outputPath)) {
      throw new Error("Le fichier traité n'a pas été créé");
    }

    const processedBuffer = fs.readFileSync(outputPath);

    // Nettoyer les fichiers temporaires
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (e) {}

    // Envoyer l'audio traité
    await ovl.sendMessage(msg.key.remoteJid, {
      audio: processedBuffer,
      mimetype: "audio/mpeg",
      ptt: false
    }, { quoted: ms });

    await repondre(`✅ Effet ${effectName} appliqué!\n${description}\n🔥 HANI-MD`);

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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "bass", 
      "bass=g=10,equalizer=f=40:width_type=h:width=50:g=5",
      "🔊 Basses amplifiées +10dB"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "slow", 
      "atempo=0.8",
      "🐌 Vitesse réduite à 80%"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "fast", 
      "atempo=1.5,asetrate=44100*1.1,aresample=44100",
      "⚡ Vitesse x1.5 + pitch légèrement augmenté"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "chipmunk", 
      "asetrate=44100*1.6,aresample=44100,atempo=0.65",
      "🐿️ Voix aiguë style Alvin"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "deep", 
      "asetrate=44100*0.6,aresample=44100,atempo=1.4",
      "🎸 Voix grave et profonde"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "reverb", 
      "aecho=0.8:0.88:60:0.4",
      "🏛️ Effet d'écho/réverbération"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "8d", 
      "apulsator=hz=0.125",
      "🎧 Audio 8D - Mettez vos écouteurs!"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "robot", 
      "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)',aecho=0.8:0.88:6:0.4",
      "🤖 Voix robotique"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "karaoke", 
      "stereotools=mlev=0.015625",
      "🎤 Tentative de suppression des voix"
    );
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
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "loud", 
      "volume=2.5",
      "🔊 Volume augmenté x2.5"
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 TELEPHONE (Voix téléphone)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "telephone",
    classe: "Audio FX",
    react: "📞",
    desc: "Effet voix de téléphone",
    alias: ["phone", "call"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "telephone", 
      "highpass=f=300,lowpass=f=3400,volume=1.5",
      "📞 Effet voix de téléphone"
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 UNDERWATER (Sous l'eau)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "underwater",
    classe: "Audio FX",
    react: "🌊",
    desc: "Effet sous l'eau",
    alias: ["water", "sousleau"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "underwater", 
      "lowpass=f=500,aecho=0.8:0.9:1000:0.3",
      "🌊 Effet audio sous l'eau"
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 VIBRATO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "vibrato",
    classe: "Audio FX",
    react: "〰️",
    desc: "Effet vibrato",
    alias: ["vibrate", "wobble"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "vibrato", 
      "vibrato=f=7:d=0.5",
      "〰️ Effet vibrato appliqué"
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 TREBLE (Aigus)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "treble",
    classe: "Audio FX",
    react: "🔔",
    desc: "Augmenter les aigus",
    alias: ["highs", "aigus"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "treble", 
      "treble=g=8,equalizer=f=8000:width_type=h:width=2000:g=5",
      "🔔 Aigus amplifiés"
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 REVERSE (Inverser)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "reverse",
    classe: "Audio FX",
    react: "⏪",
    desc: "Inverser l'audio",
    alias: ["backwards", "inverser"]
  },
  async (ovl, msg, { ms, repondre }) => {
    await applyAudioEffect(
      ovl, msg, ms, repondre, 
      "reverse", 
      "areverse",
      "⏪ Audio inversé"
    );
  }
);

// Nettoyer le dossier temp au démarrage
setTimeout(() => {
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      // Supprimer les fichiers de plus de 1 heure
      if (Date.now() - stats.mtime.getTime() > 3600000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) {}
}, 5000);

console.log("[CMD] ✅ Fx_audio.js chargé - Commandes: bass, slow, fast, chipmunk, deep, reverb, 8d, robot, karaoke, loud, telephone, underwater, vibrato, treble, reverse");
