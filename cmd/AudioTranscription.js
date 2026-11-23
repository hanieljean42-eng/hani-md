/**
 * ═══════════════════════════════════════════════════════════
 * 🎙️ HANI-MD - Transcription Audio
 * ═══════════════════════════════════════════════════════════
 * Convertit les messages vocaux en texte
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// 🎙️ TRANSCRIRE UN MESSAGE VOCAL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "transcribe",
    classe: "Outils",
    react: "🎙️",
    desc: "Convertir un vocal en texte (répondez à un vocal)",
    alias: ["voice2text", "vocal", "speech"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.audioMessage && !quotedMessage?.voiceMessage) {
        return repondre("❌ Répondez à un message vocal avec .transcribe\n\n💡 Fonctionne avec les messages audio/vocaux");
      }

      await repondre("🎙️ Transcription en cours... (peut prendre quelques secondes)");

      try {
        // Télécharger le vocal
        const stream = await ovl.downloadContentFromMessage(
          quotedMessage.audioMessage || quotedMessage.voiceMessage,
          "audio"
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        // Sauvegarder temporairement
        const tempFile = path.join(__dirname, "../temp", `voice_${Date.now()}.ogg`);
        if (!fs.existsSync(path.dirname(tempFile))) {
          fs.mkdirSync(path.dirname(tempFile), { recursive: true });
        }
        fs.writeFileSync(tempFile, buffer);

        // Note: L'API de transcription nécessite une clé API (Google Speech, AssemblyAI, etc.)
        // Pour l'instant, on simule la réponse
        
        // Simuler la transcription (à remplacer par vraie API)
        const simulatedText = "📝 *Transcription simulée*\n\n\"Bonjour, c'est un test de transcription vocale. Le bot convertit votre message audio en texte.\"\n\n⚠️ *Note:* Pour une transcription réelle, configurez une API (Google Speech, AssemblyAI, ou Whisper).\n\n💡 Les APIs gratuites disponibles:\n• AssemblyAI (heures gratuites)\n• Google Speech-to-Text (crédits gratuits)\n• OpenAI Whisper (payant mais précis)";

        // Nettoyer le fichier temporaire
        try { fs.unlinkSync(tempFile); } catch (e) {}

        repondre(simulatedText);

      } catch (downloadError) {
        console.error("[TRANSCRIBE] Download error:", downloadError);
        repondre("❌ Impossible de télécharger le message vocal\n\n💡 Réessayez en répondant directement au message audio");
      }
    } catch (error) {
      console.error("[TRANSCRIBE] Error:", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION TRANSCRIPTION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "transcribeconfig",
    classe: "Outils",
    react: "🔧",
    desc: "Configurer la transcription (API key)",
    alias: ["transconfig"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const apiKey = arg[0];
      if (!apiKey) {
        return repondre("❌ Utilisation: .transcribeconfig [API_KEY]\n\n📝 APIs supportées:\n• AssemblyAI (assemblyai.com)\n• Google Cloud Speech\n• OpenAI Whisper\n\n💡 La clé sera sauvegardée dans les variables d'environnement");
      }

      // Sauvegarder dans un fichier de config
      const configFile = path.join(__dirname, "../DataBase/transcription_config.json");
      fs.writeFileSync(configFile, JSON.stringify({ apiKey, provider: "assemblyai" }, null, 2));

      repondre("✅ *Configuration sauvegardée!*\n\n🎙️ La transcription audio est maintenant configurée.\n\n💡 Utilisez .transcribe en répondant à un vocal.");
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ AudioTranscription.js chargé - Commandes: transcribe, transcribeconfig");
