/**
 * ═══════════════════════════════════════════════════════════
 * 📥 HANI-MD - Download Status
 * ═══════════════════════════════════════════════════════════
 * Télécharge automatiquement les statuts des contacts
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DL_STATUS_ENABLED = process.env.DL_STATUS === "true" || false;
const STATUS_FOLDER = path.join(__dirname, "../../downloads/statuts");

// Créer le dossier si nécessaire
if (!fs.existsSync(STATUS_FOLDER)) {
  fs.mkdirSync(STATUS_FOLDER, { recursive: true });
}

/**
 * Gestionnaire téléchargement de statuts
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    if (!DL_STATUS_ENABLED) return;
    
    const chatId = msg.key.remoteJid;
    
    // Vérifier si c'est un statut
    if (chatId !== "status@broadcast") return;
    
    // Ne pas télécharger ses propres statuts
    if (msg.key.fromMe) return;
    
    const sender = msg.key.participant;
    const senderNumber = sender.split("@")[0];
    const timestamp = Date.now();
    
    // Créer le dossier du contact si nécessaire
    const contactFolder = path.join(STATUS_FOLDER, senderNumber);
    if (!fs.existsSync(contactFolder)) {
      fs.mkdirSync(contactFolder, { recursive: true });
    }
    
    // Déterminer le type de média
    const msgType = Object.keys(msg.message || {})[0];
    
    if (msgType === "imageMessage") {
      try {
        const buffer = await ovl.downloadMediaMessage(msg);
        const filename = `status_${timestamp}.jpg`;
        fs.writeFileSync(path.join(contactFolder, filename), buffer);
        console.log(`[DL_STATUS] Image sauvegardée: ${senderNumber}/${filename}`);
      } catch (e) {}
      
    } else if (msgType === "videoMessage") {
      try {
        const buffer = await ovl.downloadMediaMessage(msg);
        const filename = `status_${timestamp}.mp4`;
        fs.writeFileSync(path.join(contactFolder, filename), buffer);
        console.log(`[DL_STATUS] Vidéo sauvegardée: ${senderNumber}/${filename}`);
      } catch (e) {}
      
    } else if (msgType === "audioMessage") {
      try {
        const buffer = await ovl.downloadMediaMessage(msg);
        const filename = `status_${timestamp}.mp3`;
        fs.writeFileSync(path.join(contactFolder, filename), buffer);
        console.log(`[DL_STATUS] Audio sauvegardé: ${senderNumber}/${filename}`);
      } catch (e) {}
      
    } else if (msgType === "extendedTextMessage" || msgType === "conversation") {
      const text = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      if (text) {
        const filename = `status_${timestamp}.txt`;
        fs.writeFileSync(path.join(contactFolder, filename), text);
        console.log(`[DL_STATUS] Texte sauvegardé: ${senderNumber}/${filename}`);
      }
    }
    
  } catch (error) {
    console.error("[DL_STATUS]", error);
  }
}

module.exports = { handle };
