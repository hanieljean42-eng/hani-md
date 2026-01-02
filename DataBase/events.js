/**
 * ═══════════════════════════════════════════════════════════
 * 📆 HANI-MD - Events Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des événements planifiés
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "events_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { events: [], scheduled: [] };
}

// Sauvegarder la base de données
function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Ajouter un événement
 * @param {Object} event - Données de l'événement
 */
async function addEvent(event) {
  const db = loadDB();
  
  const newEvent = {
    id: Date.now().toString(36),
    createdAt: Date.now(),
    ...event
  };
  
  db.events.push(newEvent);
  saveDB(db);
  return newEvent;
}

/**
 * Supprimer un événement
 * @param {string} eventId - ID de l'événement
 */
async function removeEvent(eventId) {
  const db = loadDB();
  
  db.events = db.events.filter(e => e.id !== eventId);
  saveDB(db);
  return true;
}

/**
 * Obtenir tous les événements
 */
async function getAllEvents() {
  const db = loadDB();
  return db.events;
}

/**
 * Obtenir les événements d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getGroupEvents(groupId) {
  const db = loadDB();
  return db.events.filter(e => e.groupId === groupId);
}

/**
 * Obtenir un événement par ID
 * @param {string} eventId - ID de l'événement
 */
async function getEvent(eventId) {
  const db = loadDB();
  return db.events.find(e => e.id === eventId) || null;
}

/**
 * Planifier un message
 * @param {Object} scheduled - Données du message planifié
 */
async function scheduleMessage(scheduled) {
  const db = loadDB();
  
  const newScheduled = {
    id: Date.now().toString(36),
    createdAt: Date.now(),
    executed: false,
    ...scheduled
  };
  
  db.scheduled.push(newScheduled);
  saveDB(db);
  return newScheduled;
}

/**
 * Obtenir les messages planifiés non exécutés
 */
async function getPendingScheduled() {
  const db = loadDB();
  return db.scheduled.filter(s => !s.executed);
}

/**
 * Marquer un message planifié comme exécuté
 * @param {string} scheduleId - ID du message planifié
 */
async function markAsExecuted(scheduleId) {
  const db = loadDB();
  
  const schedule = db.scheduled.find(s => s.id === scheduleId);
  if (schedule) {
    schedule.executed = true;
    schedule.executedAt = Date.now();
    saveDB(db);
  }
  return true;
}

module.exports = {
  addEvent,
  removeEvent,
  getAllEvents,
  getGroupEvents,
  getEvent,
  scheduleMessage,
  getPendingScheduled,
  markAsExecuted
};

console.log("[DB] ✅ Events database chargée");
