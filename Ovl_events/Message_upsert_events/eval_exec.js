/**
 * ═══════════════════════════════════════════════════════════
 * ⚡ HANI-MD - Eval/Exec
 * ═══════════════════════════════════════════════════════════
 * Exécute du code JavaScript pour le propriétaire
 * ═══════════════════════════════════════════════════════════
 */

const { exec } = require("child_process");
const util = require("util");

/**
 * Gestionnaire eval/exec
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const { superUser } = options;
    
    // Seulement pour le propriétaire
    if (!superUser) return;
    
    // Récupérer le texte du message
    let text = "";
    if (msg.message?.conversation) {
      text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    }
    
    if (!text) return;
    
    const chatId = msg.key.remoteJid;
    
    // Commande eval (JavaScript)
    if (text.startsWith("=>")) {
      const code = text.slice(2).trim();
      if (!code) return;
      
      try {
        let result = await eval(`(async () => { ${code} })()`);
        
        if (typeof result !== "string") {
          result = util.inspect(result, { depth: 2 });
        }
        
        await ovl.sendMessage(chatId, {
          text: `✅ *Résultat:*\n\n\`\`\`\n${result}\n\`\`\``
        }, { quoted: msg });
        
      } catch (error) {
        await ovl.sendMessage(chatId, {
          text: `❌ *Erreur:*\n\n\`\`\`\n${error.message}\n\`\`\``
        }, { quoted: msg });
      }
    }
    
    // Commande exec rapide (une ligne)
    if (text.startsWith(">")) {
      const code = text.slice(1).trim();
      if (!code) return;
      
      try {
        let result = await eval(code);
        
        if (typeof result !== "string") {
          result = util.inspect(result, { depth: 2 });
        }
        
        await ovl.sendMessage(chatId, {
          text: `✅ ${result}`
        }, { quoted: msg });
        
      } catch (error) {
        await ovl.sendMessage(chatId, {
          text: `❌ ${error.message}`
        }, { quoted: msg });
      }
    }
    
    // Commande shell ($)
    if (text.startsWith("$")) {
      const command = text.slice(1).trim();
      if (!command) return;
      
      exec(command, { maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
        let output = "";
        
        if (error) {
          output = `❌ Erreur: ${error.message}`;
        } else if (stderr) {
          output = `⚠️ Stderr:\n${stderr}`;
        } else {
          output = stdout || "✅ Commande exécutée (pas de sortie)";
        }
        
        // Tronquer si trop long
        if (output.length > 4000) {
          output = output.substring(0, 4000) + "\n... (tronqué)";
        }
        
        await ovl.sendMessage(chatId, {
          text: `\`\`\`\n${output}\n\`\`\``
        }, { quoted: msg });
      });
    }
    
  } catch (error) {
    console.error("[EVAL_EXEC]", error);
  }
}

module.exports = { handle };
