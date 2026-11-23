/**
 * ═══════════════════════════════════════════════════════════
 * 📝 HANI-MD - Notes Personnelles
 * ═══════════════════════════════════════════════════════════
 * Sauvegarde rapide d'informations importantes
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const NOTES_FILE = path.join(__dirname, "../DataBase/notes_personnelles.json");

function loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveNotes(data) {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function getUserNotes(userId) {
  const notes = loadNotes();
  return notes[userId] || [];
}

function addUserNote(userId, text) {
  const notes = loadNotes();
  if (!notes[userId]) notes[userId] = [];
  notes[userId].push({
    id: notes[userId].length + 1,
    text: text,
    createdAt: new Date().toISOString()
  });
  saveNotes(notes);
  return notes[userId].length;
}

function deleteUserNote(userId, noteId) {
  const notes = loadNotes();
  if (!notes[userId]) return false;
  const idx = notes[userId].findIndex(n => n.id === parseInt(noteId));
  if (idx === -1) return false;
  notes[userId].splice(idx, 1);
  // Réordonner les IDs
  notes[userId].forEach((n, i) => n.id = i + 1);
  saveNotes(notes);
  return true;
}

// ═══════════════════════════════════════════════════════════
// 📝 AJOUTER UNE NOTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "note",
    classe: "Productivité",
    react: "📝",
    desc: "Sauvegarder une note rapide",
    alias: ["addnote", "savenote"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const text = arg.join(" ");
      if (!text) {
        return repondre("❌ Utilisation: .note [votre note]\n\nExemple: .note Appeler client à 14h");
      }

      const noteId = addUserNote(auteurMessage, text);
      repondre(`✅ *Note sauvegardée!*\n\n📝 Note #${noteId}\n💾 "${text}"`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 VOIR LES NOTES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "notes",
    classe: "Productivité",
    react: "📋",
    desc: "Voir toutes vos notes",
    alias: ["mynotes", "listnotes"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const userNotes = getUserNotes(auteurMessage);
      
      if (userNotes.length === 0) {
        return repondre("📋 *Vos Notes*\n\nAucune note sauvegardée.\n\n💡 Utilisez .note [texte] pour en ajouter une.");
      }

      let text = `📋 *Vos Notes (${userNotes.length})*\n\n`;
      userNotes.forEach(n => {
        const date = new Date(n.createdAt).toLocaleDateString('fr-FR');
        text += `${n.id}. ${n.text}\n   📅 ${date}\n\n`;
      });
      text += `🗑️ Pour supprimer: .delnote [numéro]`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UNE NOTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delnote",
    classe: "Productivité",
    react: "🗑️",
    desc: "Supprimer une note",
    alias: ["deletenote", "rmnote"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const noteId = arg[0];
      if (!noteId || isNaN(noteId)) {
        return repondre("❌ Utilisation: .delnote [numéro]\n\n💡 Voir vos notes avec .notes");
      }

      if (deleteUserNote(auteurMessage, noteId)) {
        repondre(`✅ *Note #${noteId} supprimée!*`);
      } else {
        repondre(`❌ Note #${noteId} introuvable`);
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔍 CHERCHER DANS LES NOTES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "findnote",
    classe: "Productivité",
    react: "🔍",
    desc: "Chercher dans vos notes",
    alias: ["searchnote"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const query = arg.join(" ").toLowerCase();
      if (!query) {
        return repondre("❌ Utilisation: .findnote [mot-clé]");
      }

      const userNotes = getUserNotes(auteurMessage);
      const found = userNotes.filter(n => n.text.toLowerCase().includes(query));

      if (found.length === 0) {
        return repondre(`🔍 Aucune note trouvée pour "${query}"`);
      }

      let text = `🔍 *Résultats (${found.length})*\n\n`;
      found.forEach(n => {
        text += `${n.id}. ${n.text}\n\n`;
      });

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Notes.js chargé - Commandes: note, notes, delnote, findnote");
