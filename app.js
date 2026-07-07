"use strict";

/* =========================================================
   DEUTSCH FLASH STUDIO — app.js

   Organisation du fichier :
   1.  Constantes et données d'exemple
   2.  Petits utilitaires (dates, HTML, base64, toast)
   3.  Couche IndexedDB (cartes + images)
   4.  Audio (Web Speech API)
   5.  Navigation entre les pages
   6.  Dashboard
   7.  Révision (répétition espacée)
   8.  Ajouter une carte
   9.  Bibliothèque
   10. Apprentissage
   11. Grammaire (mini quiz)
   12. Sauvegarde (export / import)
   13. Démarrage de l'application
   ========================================================= */


/* =========================================================
   1. CONSTANTES ET DONNÉES D'EXEMPLE
   ========================================================= */

const DB_NAME = "deutsch-flash-studio";
const DB_VERSION = 2;
const MAX_NEW_CARDS_PER_DAY = 20;

// Clés utilisées dans localStorage (uniquement pour de petits réglages)
const LS_LAST_PAGE = "dfs_lastPage"; // dernier onglet ouvert
const LS_SEEDED = "dfs_seeded";      // "les cartes d'exemple ont déjà été créées"
const LS_DECKS = "dfs_custom_decks";
const LS_SUBCATEGORIES = "dfs_custom_subcategories";
const LS_LAST_EXPORT_AT = "dfs_last_export_at";

// Image par défaut (un petit SVG intégré : aucune dépendance externe)
const DEFAULT_IMAGE = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#1a1f2a"/><stop offset="1" stop-color="#232a38"/>' +
  '</linearGradient></defs>' +
  '<rect width="400" height="250" fill="url(#g)"/>' +
  '<g opacity="0.7">' +
  '<rect x="152" y="95" width="96" height="9" rx="4.5" fill="#3a3f4b"/>' +
  '<rect x="152" y="111" width="96" height="9" rx="4.5" fill="#a03c42"/>' +
  '<rect x="152" y="127" width="96" height="9" rx="4.5" fill="#b9923a"/>' +
  '</g>' +
  '<text x="200" y="172" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">Deutsch Flash Studio</text>' +
  '</svg>'
);

// Cartes créées au tout premier lancement, si la base est vide
const SEED_CARDS = [
  { article: "der", de: "Hund",    plural: "Hunde",  fr: "chien",  exampleDe: "Der Hund ist klein.",  exampleFr: "Le chien est petit.",   level: "", category: "Animaux" },
  { article: "die", de: "Katze",   plural: "Katzen", fr: "chat",   exampleDe: "Die Katze schläft.",   exampleFr: "Le chat dort.",         level: "", category: "Animaux" },
  { article: "das", de: "Haus",    plural: "Häuser", fr: "maison", exampleDe: "Das Haus ist groß.",   exampleFr: "La maison est grande.", level: "", category: "Maison" },
  { article: "der", de: "Apfel",   plural: "Äpfel",  fr: "pomme",  exampleDe: "Der Apfel ist rot.",   exampleFr: "La pomme est rouge.",   level: "", category: "Nourriture" },
  { article: "",    de: "trinken", plural: "",       fr: "boire",  exampleDe: "Ich trinke Wasser.",   exampleFr: "Je bois de l'eau.",     level: "", category: "Verbes" },
];

// Questions du mini quiz de grammaire
const QUIZ_QUESTIONS = [
  { sentence: "___ Hund ist klein.",       choices: ["der", "die", "das"],     answer: "der",   explain: "Hund (chien) est masculin → der Hund." },
  { sentence: "___ Katze schläft.",        choices: ["der", "die", "das"],     answer: "die",   explain: "Katze (chat) est féminin → die Katze." },
  { sentence: "___ Haus ist groß.",        choices: ["der", "die", "das"],     answer: "das",   explain: "Haus (maison) est neutre → das Haus." },
  { sentence: "___ Mädchen singt.",        choices: ["der", "die", "das"],     answer: "das",   explain: "Les mots en -chen sont toujours neutres → das Mädchen." },
  { sentence: "Ich sehe ___ Hund.",        choices: ["der", "den", "dem"],     answer: "den",   explain: "COD (accusatif) : le masculin der devient den." },
  { sentence: "Ich trinke ___ Kaffee.",    choices: ["den", "dem", "das"],     answer: "den",   explain: "Kaffee est masculin et COD → accusatif : den Kaffee." },
  { sentence: "Ich helfe ___ Frau.",       choices: ["die", "der", "den"],     answer: "der",   explain: "Le verbe helfen demande le datif : die devient der." },
  { sentence: "Er fährt mit ___ Auto.",    choices: ["das", "dem", "der"],     answer: "dem",   explain: "mit demande toujours le datif : das devient dem." },
  { sentence: "Du ___ Brot.",              choices: ["esse", "isst", "essen"], answer: "isst",  explain: "essen est un verbe fort : e → i à la 2e personne (du isst)." },
  { sentence: "Ein Hund, zwei ___.",       choices: ["Hunde", "Hunden", "Hunds"], answer: "Hunde", explain: "Pluriel de Hund : die Hunde (famille des pluriels en -e)." },
];

// Variables globales de l'application
let db = null;                       // connexion IndexedDB
const imageUrlCache = new Map();     // imageId -> URL d'affichage (évite de recréer les URLs)
let reviewQueue = [];                // cartes restantes dans la séance de révision
let currentCard = null;              // carte affichée en ce moment
let failedOnceInSession = new Set(); // cartes ratées déjà remises une fois dans la séance
let previewUrl = null;               // URL de l'aperçu d'image dans le formulaire
let reviewSessionStats = null;
let toastTimer = null;               // pour la notification
let editingCard = null;              // carte en cours de modification, ou null en mode ajout
let imageMarkedForRemoval = false;   // indique que l'image actuelle doit être retirée en édition
let learningCards = [];              // cartes visibles dans le mode Apprentissage
let currentLearningIndex = 0;         // index de la carte affichée en Apprentissage
let pendingLearningCategory = null;   // catégorie choisie depuis le dashboard
let currentReviewCategory = null;     // null = révision globale, sinon deck ciblé
let currentReviewMode = "classic";
let reviewSessionType = "due";        // "due" = SRS du jour, "free" = entraînement sans SRS
let reviewChoicePool = [];
let currentDeckDetailCategory = null;
let deckDetailSearch = "";
let deckDetailSubcategoryFilter = "";
let deckDetailRenderVersion = 0;
let deckDetailSelectionMode = false;
let selectedDeckCardIds = new Set();
let visibleDeckDetailCardIds = [];
let pendingFormCategory = null;
let pendingFormSubcategory = null;
let pendingSubcategoryCardId = null;
let pendingSubcategoryCardIds = [];
let deckGridSelectionMode = false;    // mode sélection multiple sur le dashboard
let selectedDeckNames = new Set();    // noms des jeux sélectionnés sur le dashboard
let visibleDeckNames = [];            // jeux actuellement affichés sur le dashboard
let deckModalMode = "create";
let deckModalOriginalName = "";
let pendingImageBlob = null;          // image compressée prête à être stockée
let isGrading = false;                // verrou anti double-clic en révision
let libraryRenderVersion = 0;         // évite qu'un ancien rendu écrase un rendu récent
let learningRenderVersion = 0;
let pendingImportFile = null;
let pendingImportData = null;
let pendingImportAnalysis = null;
let replaceImportArmed = false;
let imageInputVersion = 0;
let lastImageTargetCardId = null;
let skippedMissingImageIds = new Set();


/* =========================================================
   2. PETITS UTILITAIRES
   ========================================================= */

// Raccourci pratique : $("mon-id") au lieu de document.getElementById("mon-id")
function $(id) {
  return document.getElementById(id);
}

// Date du jour au format "2026-07-05" (en heure locale, pas UTC)
function todayISO() {
  return dateToISO(new Date());
}

function isMastered(card) {
  return normalizeSrs(card.srs).box >= 4;
}

function isNewCard(card) {
  const srs = normalizeSrs(card.srs);
  return srs.correctCount === 0 && srs.wrongCount === 0;
}

function cardDeckName(card) {
  return card.category || "Général";
}

function cardSubcategoryName(card) {
  return card.subcategory || "";
}

function matchesCardQuery(card, query) {
  if (!query) return true;
  return (
    card.de.toLowerCase().includes(query) ||
    card.fr.toLowerCase().includes(query) ||
    (card.plural || "").toLowerCase().includes(query) ||
    (card.exampleDe || "").toLowerCase().includes(query) ||
    (card.exampleFr || "").toLowerCase().includes(query) ||
    (card.subcategory || "").toLowerCase().includes(query) ||
    (card.imageQuery || "").toLowerCase().includes(query)
  );
}

function getEffectiveImageQuery(card) {
  const manualQuery = String(card.imageQuery || "").trim();
  if (manualQuery) return manualQuery;

  const base = String(card.fr || card.de || fullWord(card) || "").trim();
  if (!base) return "";

  const category = cardDeckName(card);
  if (["Aliments", "Animaux", "Objets", "Maison"].includes(category)) {
    return base + " isolated white background";
  }
  if (category === "Verbes") {
    return base + " simple illustration";
  }
  if (["Expressions", "Temps", "Grammaire"].includes(category)) {
    return base + " icon simple illustration";
  }
  return base + " simple illustration";
}

function imageSearchURL(query) {
  const encoded = encodeURIComponent(String(query || "").trim());
  return "https://www.google.com/search?tbm=isch&tbs=ic:trans&q=" + encoded;
}

function openImageSearchForCard(card) {
  const query = getEffectiveImageQuery(card);
  if (!query) return;
  window.open(imageSearchURL(query), "dfs-images");
}

function imageQueryHTML(card) {
  const manualQuery = String(card.imageQuery || "").trim();
  const query = getEffectiveImageQuery(card);
  if (!query) return "";
  const searchButton = !card.imageId
    ? '<span class="image-query-actions">' +
      '<a class="btn btn-small btn-ghost image-query-action" href="' + imageSearchURL(query) + '" target="dfs-images" rel="noopener noreferrer" title="Trouver une image">Trouver image</a>' +
      "</span>"
    : "";
  return (
    '<div class="image-query-note">' +
      '<span class="image-query-text">' + (manualQuery ? "Recherche image : " : "Recherche auto : ") + escapeHTML(query) + "</span>" +
      searchButton +
    "</div>"
  );
}

function subcategoryChipHTML(card, compact = false) {
  return card.subcategory
    ? '<span class="chip chip-subcategory' + (compact ? " chip-subcategory-compact" : "") + '">' +
      escapeHTML(compact ? card.subcategory : "Sous-catégorie : " + card.subcategory) + "</span>"
    : "";
}

async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (error) {
      console.warn("Persistance du stockage non accordée :", error);
    }
  }
}

function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Ajoute N jours à une date "2026-07-05" et renvoie la nouvelle date
function addDays(isoDate, days) {
  const date = new Date(isoDate + "T00:00:00");
  date.setDate(date.getDate() + days);
  return dateToISO(date);
}

// "2026-07-05" -> "05/07/2026"
function formatDateFr(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "date inconnue";
  const parts = isoDate.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

// Identifiant unique simple, basé sur l'heure actuelle.
// Comme il commence par un timestamp, trier les ids = trier par date de création.
function uniqueId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// Sécurise du texte avant de l'insérer dans du HTML
// (important dès qu'on affiche du contenu tapé par l'utilisateur)
function escapeHTML(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Convertit un Blob (fichier image) en texte base64 pour l'export JSON
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Fait l'inverse : base64 ("data:image/png;base64,....") -> Blob
function base64ToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// Petite notification en bas de l'écran
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// "der Hund" ou juste "trinken" si pas d'article
function fullWord(card) {
  return card.article ? card.article + " " + card.de : card.de;
}

function formatPlural(card) {
  const plural = String(card.plural || "").trim();
  const hasArticle = Boolean(card.article);
  const normalizedPlural = plural.toLowerCase();
  const noNormalPlural = ["kein plural", "pas de pluriel", "—", "-"].includes(normalizedPlural);

  if (noNormalPlural) return "Pas de pluriel normal";
  if (plural) return (hasArticle ? "die " : "") + plural;
  if (hasArticle) return "Pas de pluriel renseigné";
  return "";
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function debounce(fn, delay = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function srsIntervalDays(box) {
  if (box <= 1) return 1;
  if (box === 2) return 3;
  if (box === 3) return 7;
  if (box === 4) return 14;
  if (box === 5) return 30;
  return 60;
}

function normalizeSrs(srs) {
  const nextReview = /^\d{4}-\d{2}-\d{2}$/.test(srs?.nextReview || "")
    ? srs.nextReview
    : todayISO();

  return {
    box: Math.max(1, Number(srs?.box) || 1),
    nextReview: nextReview,
    correctCount: Math.max(0, Number(srs?.correctCount) || 0),
    wrongCount: Math.max(0, Number(srs?.wrongCount) || 0),
  };
}

function normalizeCard(card) {
  const createdAt = card.createdAt || todayISO();
  return {
    id: card.id || uniqueId("card"),
    article: ["der", "die", "das"].includes(card.article) ? card.article : "",
    de: String(card.de || "").trim(),
    plural: String(card.plural || "").trim(),
    fr: String(card.fr || "").trim(),
    exampleDe: String(card.exampleDe || "").trim(),
    exampleFr: String(card.exampleFr || "").trim(),
    level: String(card.level || "").trim(),
    category: String(card.category || "Général").trim() || "Général",
    subcategory: String(card.subcategory || "").trim(),
    favorite: Boolean(card.favorite),
    imageId: card.imageId || null,
    imageQuery: String(card.imageQuery || "").trim(),
    createdAt: createdAt,
    updatedAt: card.updatedAt || createdAt,
    srs: normalizeSrs(card.srs),
  };
}

function normalizeDeck(deck) {
  const name = String(deck?.name || "").trim();
  return {
    id: deck?.id || uniqueId("deck"),
    name: name,
    color: ["gold", "blue", "green", "orange", "red", "purple"].includes(deck?.color) ? deck.color : "gold",
    emoji: String(deck?.emoji || "").trim().slice(0, 4),
    createdAt: deck?.createdAt || todayISO(),
  };
}

function getCustomDecks() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_DECKS) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw
      .map(normalizeDeck)
      .filter((deck) => {
        const key = deck.name.toLowerCase();
        if (!deck.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (error) {
    console.warn("Decks personnalisés illisibles :", error);
    return [];
  }
}

function saveCustomDecks(decks) {
  localStorage.setItem(LS_DECKS, JSON.stringify(decks.map(normalizeDeck).filter((deck) => deck.name)));
}

function findCustomDeckByName(name) {
  const key = String(name || "").trim().toLowerCase();
  return getCustomDecks().find((deck) => deck.name.toLowerCase() === key) || null;
}

function upsertCustomDeck(deckData, oldName = "") {
  const deck = normalizeDeck(deckData);
  if (!deck.name) return null;

  const decks = getCustomDecks();
  const oldKey = String(oldName || deck.name).trim().toLowerCase();
  const existingIndex = decks.findIndex((item) => item.name.toLowerCase() === oldKey || item.id === deck.id);

  if (existingIndex >= 0) {
    decks[existingIndex] = { ...decks[existingIndex], ...deck, id: decks[existingIndex].id };
  } else {
    const sameNameIndex = decks.findIndex((item) => item.name.toLowerCase() === deck.name.toLowerCase());
    if (sameNameIndex >= 0) {
      decks[sameNameIndex] = { ...decks[sameNameIndex], ...deck, id: decks[sameNameIndex].id };
    } else {
      decks.push(deck);
    }
  }

  saveCustomDecks(decks);
  return deck;
}

function deleteCustomDeckByName(name) {
  const key = String(name || "").trim().toLowerCase();
  saveCustomDecks(getCustomDecks().filter((deck) => deck.name.toLowerCase() !== key));
}

function mergeCustomDecks(importedDecks, replace = false) {
  if (!Array.isArray(importedDecks)) return;
  if (replace) {
    saveCustomDecks(importedDecks);
    return;
  }

  const decks = getCustomDecks();
  importedDecks.map(normalizeDeck).forEach((deck) => {
    if (!deck.name) return;
    const index = decks.findIndex((item) => item.name.toLowerCase() === deck.name.toLowerCase());
    if (index >= 0) {
      decks[index] = { ...decks[index], ...deck, id: decks[index].id };
    } else {
      decks.push(deck);
    }
  });
  saveCustomDecks(decks);
}

function normalizeCustomSubcategory(item) {
  const category = String(item?.category || "").trim();
  const name = String(item?.name || "").trim();
  return {
    id: item?.id || uniqueId("sub"),
    category: category,
    name: name,
    createdAt: item?.createdAt || todayISO(),
  };
}

function getCustomSubcategories() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SUBCATEGORIES) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw
      .map(normalizeCustomSubcategory)
      .filter((item) => {
        const key = item.category.toLowerCase() + "::" + item.name.toLowerCase();
        if (!item.category || !item.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (error) {
    console.warn("Sous-catégories personnalisées illisibles :", error);
    return [];
  }
}

function saveCustomSubcategories(items) {
  localStorage.setItem(LS_SUBCATEGORIES, JSON.stringify(items.map(normalizeCustomSubcategory).filter((item) => item.category && item.name)));
}

function upsertCustomSubcategory(category, name) {
  const item = normalizeCustomSubcategory({ category: category, name: name });
  if (!item.category || !item.name) return null;

  const items = getCustomSubcategories();
  const key = item.category.toLowerCase() + "::" + item.name.toLowerCase();
  const existingIndex = items.findIndex((entry) => entry.category.toLowerCase() + "::" + entry.name.toLowerCase() === key);
  if (existingIndex >= 0) {
    items[existingIndex] = { ...items[existingIndex], ...item, id: items[existingIndex].id };
  } else {
    items.push(item);
  }
  saveCustomSubcategories(items);
  return item;
}

function mergeCustomSubcategories(importedItems, replace = false) {
  if (!Array.isArray(importedItems)) return;
  if (replace) {
    saveCustomSubcategories(importedItems);
    return;
  }

  importedItems.forEach((item) => {
    const normalized = normalizeCustomSubcategory(item);
    if (normalized.category && normalized.name) upsertCustomSubcategory(normalized.category, normalized.name);
  });
}

function customSubcategoriesForCategory(category) {
  return getCustomSubcategories()
    .filter((item) => item.category === category)
    .map((item) => item.name);
}

function deleteCustomSubcategoriesForCategory(category) {
  const key = String(category || "").trim().toLowerCase();
  saveCustomSubcategories(getCustomSubcategories().filter((item) => item.category.toLowerCase() !== key));
}

function renameCustomSubcategoriesCategory(oldName, newName) {
  const oldKey = String(oldName || "").trim().toLowerCase();
  const items = getCustomSubcategories().map((item) => {
    return item.category.toLowerCase() === oldKey ? { ...item, category: newName } : item;
  });
  saveCustomSubcategories(items);
}

function validateCardForm(data) {
  const tips = [];

  if (!data.de || !data.fr) {
    return { ok: false, tips: ["Le mot allemand et la traduction sont obligatoires."] };
  }

  if (data.article && !data.plural) {
    tips.push("Conseil : ajoute le pluriel pour les noms avec der, die ou das.");
  }
  if (data.exampleDe && !data.exampleFr) {
    tips.push("Conseil : ajoute aussi la traduction de la phrase exemple.");
  }
  if (data.exampleFr && !data.exampleDe) {
    tips.push("Conseil : ajoute aussi la phrase exemple en allemand.");
  }

  return { ok: true, tips: tips };
}

// HTML du mot avec son article coloré (der = bleu, die = rose, das = vert)
function wordHTML(card) {
  const articlePart = card.article
    ? '<span class="art-' + card.article + '">' + escapeHTML(card.article) + "</span> "
    : "";
  return articlePart + escapeHTML(card.de);
}

// Crée un objet carte complet à partir des infos du formulaire (ou des exemples)
function createNewCard(data) {
  return {
    id: uniqueId("card"),
    article: data.article || "",
    de: data.de,
    plural: data.plural || "",
    fr: data.fr,
    exampleDe: data.exampleDe || "",
    exampleFr: data.exampleFr || "",
    level: data.level || "",
    category: data.category || "Général",
    subcategory: data.subcategory || "",
    imageId: data.imageId || null,
    imageQuery: data.imageQuery || "",
    createdAt: todayISO(),
    updatedAt: todayISO(),
    srs: {
      box: 1,                  // boîte SRS de départ
      nextReview: todayISO(),  // une nouvelle carte est à réviser tout de suite
      correctCount: 0,
      wrongCount: 0,
    },
  };
}


/* =========================================================
   3. COUCHE INDEXEDDB
   IndexedDB stocke les cartes ET les images (localStorage
   serait trop petit pour des images).
   ========================================================= */

// Ouvre (ou crée) la base de données
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Appelé uniquement à la création de la base : on crée les "tables"
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("cards")) {
        database.createObjectStore("cards", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("images")) {
        database.createObjectStore("images", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("reviews")) {
        const reviewStore = database.createObjectStore("reviews", { keyPath: "id" });
        reviewStore.createIndex("reviewedDate", "reviewedDate", { unique: false });
        reviewStore.createIndex("cardId", "cardId", { unique: false });
        reviewStore.createIndex("category", "category", { unique: false });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Fonction générique : ouvre une transaction, exécute une action, renvoie une Promise.
// Ça évite de répéter 6 fois le même code onsuccess/onerror.
function dbAction(storeName, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Cartes ---
function saveCard(card)   { return dbAction("cards", "readwrite", (store) => store.put(card)); }
function updateCard(card) { return saveCard(card); } // put() crée OU met à jour
function getCard(id) {
  return dbAction("cards", "readonly", (store) => store.get(id))
    .then((card) => card ? normalizeCard(card) : null);
}
function getAllCards()    {
  return dbAction("cards", "readonly", (store) => store.getAll())
    .then((cards) => cards.map(normalizeCard).filter((card) => card.de || card.fr));
}
function deleteCard(id)   { return dbAction("cards", "readwrite", (store) => store.delete(id)); }
function clearStore(storeName) { return dbAction(storeName, "readwrite", (store) => store.clear()); }

// --- Journal de révisions ---
function normalizeReviewGrade(grade) {
  return grade === "fail" ? "again" : grade;
}

function isPassingGrade(grade) {
  const normalized = normalizeReviewGrade(grade);
  return normalized === "hard" || normalized === "good" || normalized === "easy";
}

function createReviewLog(card, grade, options = {}) {
  const normalizedGrade = normalizeReviewGrade(grade);
  return {
    id: options.id || uniqueId("review"),
    cardId: card.id,
    grade: normalizedGrade,
    correct: isPassingGrade(normalizedGrade),
    mode: options.mode || reviewSessionType || "",
    reviewMode: options.reviewMode || currentReviewMode || "",
    category: cardDeckName(card),
    subcategory: cardSubcategoryName(card),
    reviewedAt: options.reviewedAt || new Date().toISOString(),
    reviewedDate: options.reviewedDate || todayISO(),
  };
}

function normalizeReview(review) {
  const reviewedAt = review.reviewedAt || new Date().toISOString();
  const reviewedDate = review.reviewedDate || reviewedAt.slice(0, 10) || todayISO();
  const grade = normalizeReviewGrade(review.grade || "");
  return {
    id: review.id || uniqueId("review"),
    cardId: String(review.cardId || ""),
    grade: grade,
    correct: typeof review.correct === "boolean" ? review.correct : isPassingGrade(grade),
    mode: String(review.mode || ""),
    reviewMode: String(review.reviewMode || ""),
    category: String(review.category || "Général").trim() || "Général",
    subcategory: String(review.subcategory || "").trim(),
    reviewedAt: reviewedAt,
    reviewedDate: reviewedDate,
  };
}

function saveReview(review) {
  return dbAction("reviews", "readwrite", (store) => store.put(normalizeReview(review)));
}

function getAllReviews() {
  return dbAction("reviews", "readonly", (store) => store.getAll())
    .then((reviews) => reviews.map(normalizeReview));
}

function getReviewsByDate(dateISOValue) {
  return dbAction("reviews", "readonly", (store) => store.index("reviewedDate").getAll(dateISOValue))
    .then((reviews) => reviews.map(normalizeReview));
}

function getTodayReviews() {
  return getReviewsByDate(todayISO());
}

async function getTodayStats() {
  const reviews = await getTodayReviews();
  const correctCount = reviews.filter((review) => review.correct).length;
  const wrongCount = reviews.length - correctCount;
  return {
    reviewsCount: reviews.length,
    correctCount: correctCount,
    wrongCount: wrongCount,
    successRate: reviews.length ? Math.round((correctCount / reviews.length) * 100) : 0,
  };
}

async function getReviewStreak() {
  const reviews = await getAllReviews();
  const dates = new Set(reviews.map((review) => review.reviewedDate).filter(Boolean));
  let cursor = todayISO();
  if (!dates.has(cursor)) {
    const yesterday = addDays(cursor, -1);
    if (!dates.has(yesterday)) {
      return { streak: 0, lastReviewDate: reviews.sort((a, b) => b.reviewedDate.localeCompare(a.reviewedDate))[0]?.reviewedDate || "" };
    }
    cursor = yesterday;
  }

  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { streak: streak, lastReviewDate: addDays(cursor, 1) };
}

async function getHardCards(limit = 10) {
  const cards = await getAllCards();
  return cards
    .filter((card) => normalizeSrs(card.srs).wrongCount >= 3)
    .sort((a, b) => normalizeSrs(b.srs).wrongCount - normalizeSrs(a.srs).wrongCount)
    .slice(0, limit)
    .map((card) => ({
      card: card,
      wrongCount: normalizeSrs(card.srs).wrongCount,
      correctCount: normalizeSrs(card.srs).correctCount,
      isLeech: normalizeSrs(card.srs).wrongCount >= 5,
    }));
}

// --- Images ---
function saveImage(id, blob) { return dbAction("images", "readwrite", (store) => store.put({ id: id, blob: blob })); }
function getImage(id)        { return dbAction("images", "readonly",  (store) => store.get(id)); }
function getAllImages()      { return dbAction("images", "readonly",  (store) => store.getAll()); }
function deleteImage(id)     { return dbAction("images", "readwrite", (store) => store.delete(id)); }

// Renvoie une URL affichable pour une carte : son image, ou l'image par défaut
async function getImageURL(imageId) {
  if (!imageId) return DEFAULT_IMAGE;
  if (imageUrlCache.has(imageId)) return imageUrlCache.get(imageId);

  const record = await getImage(imageId);
  if (!record || !record.blob) return DEFAULT_IMAGE;

  const url = URL.createObjectURL(record.blob);
  imageUrlCache.set(imageId, url);
  return url;
}

async function deleteImageIfUnused(imageId) {
  if (!imageId) return;

  const cards = await getAllCards();
  const stillUsed = cards.some((card) => card.imageId === imageId);
  if (stillUsed) return;

  await deleteImage(imageId);
  const url = imageUrlCache.get(imageId);
  if (url) URL.revokeObjectURL(url);
  imageUrlCache.delete(imageId);
}

function clearImageUrlCache() {
  imageUrlCache.forEach((url) => URL.revokeObjectURL(url));
  imageUrlCache.clear();
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataURL(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image illisible"));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImageFile(file, maxSize = 900, quality = 0.82) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Le fichier choisi n'est pas une image.");
  }

  const dataUrl = await fileToDataURL(file);
  const image = await loadImageFromDataURL(dataUrl);
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, "image/webp", quality);
  if (webpBlob) return webpBlob;

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (jpegBlob) return jpegBlob;

  throw new Error("Compression impossible");
}

function isTextEntryTarget(target) {
  return Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
}

function getImageFileFromClipboard(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type && item.type.startsWith("image/"));
  return imageItem ? imageItem.getAsFile() : null;
}

function getImageFileFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []);
  return files.find((file) => file.type && file.type.startsWith("image/")) || null;
}

async function prepareImageBlob(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Dépose une image valide.");
  }
  if (file.size > 3 * 1024 * 1024) {
    toast("Image lourde : compression automatique en cours.");
  }
  try {
    return await compressImageFile(file);
  } catch (error) {
    console.warn("Compression image impossible, fichier original utilisé :", error);
    toast("Compression impossible : image originale conservée.");
    return file;
  }
}

async function applyImageToForm(file) {
  if (!file || !file.type?.startsWith("image/")) {
    toast("Choisis une image valide.");
    return false;
  }

  try {
    const version = ++imageInputVersion;
    pendingImageBlob = await prepareImageBlob(file);
    if (version !== imageInputVersion) return false;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    $("f-image").value = "";
    previewUrl = URL.createObjectURL(pendingImageBlob);
    $("image-preview").src = previewUrl;
    $("image-preview-wrap").classList.remove("hidden");
    imageMarkedForRemoval = false;
    return true;
  } catch (error) {
    console.error("Image non préparée :", error);
    toast(error.message || "Impossible d'utiliser cette image.");
    return false;
  }
}

async function applyImageToCard(cardId, file) {
  if (!file || !file.type?.startsWith("image/")) {
    toast("Dépose une image valide.");
    return;
  }

  const card = await getCard(cardId);
  if (!card) {
    toast("Carte introuvable.");
    return;
  }

  try {
    const blob = await prepareImageBlob(file);
    const previousImageId = card.imageId;
    const imageId = uniqueId("img");
    await saveImage(imageId, blob);
    card.imageId = imageId;
    card.updatedAt = todayISO();
    await saveCard(card);
    if (previousImageId && previousImageId !== imageId) {
      await deleteImageIfUnused(previousImageId);
    }
    toast("Image ajoutée à la carte.");
    await refreshAfterCardImageChange();
    if ($("page-missing-images").classList.contains("active")) {
      await advanceMissingImageWorkflow();
    }
  } catch (error) {
    console.error("Image non ajoutée :", error);
    toast(error.message || "Impossible d'ajouter cette image.");
  }
}

function isImagePastePageActive() {
  return $("page-bibliotheque").classList.contains("active") ||
    $("page-deck-detail").classList.contains("active") ||
    $("page-missing-images").classList.contains("active");
}

async function handlePastedImage(event) {
  const file = getImageFileFromClipboard(event);
  if (!file) return;

  if ($("page-ajouter").classList.contains("active")) {
    event.preventDefault();
    const ok = await applyImageToForm(file);
    if (ok) toast("Image collée avec succès.");
    return;
  }

  if (!isImagePastePageActive() || !lastImageTargetCardId || isTextEntryTarget(event.target)) return;
  event.preventDefault();
  await applyImageToCard(lastImageTargetCardId, file);
}

function setImageTarget(cardId, element) {
  lastImageTargetCardId = cardId;
  document.querySelectorAll(".paste-target").forEach((item) => item.classList.remove("paste-target"));
  if (element) element.classList.add("paste-target");
  if ($("page-missing-images").classList.contains("active") && $("btn-open-current-image-search")) {
    const url = element?.dataset.imageSearchUrl || "";
    $("btn-open-current-image-search").dataset.imageSearchUrl = url;
    $("btn-open-current-image-search").disabled = !url;
  }
}

function attachImageDropHandlers(container) {
  container.querySelectorAll("[data-image-target-card]").forEach((el) => {
    const cardId = el.dataset.imageTargetCard;
    el.addEventListener("click", (event) => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      setImageTarget(cardId, el);
    });
    el.addEventListener("dragenter", (event) => {
      event.preventDefault();
      setImageTarget(cardId, el);
      el.classList.add("is-drop-target");
    });
    el.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      el.classList.add("is-drop-target");
    });
    el.addEventListener("dragleave", (event) => {
      if (!el.contains(event.relatedTarget)) el.classList.remove("is-drop-target");
    });
    el.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      el.classList.remove("is-drop-target");
      setImageTarget(cardId, el);
      const file = getImageFileFromDataTransfer(event.dataTransfer);
      if (!file) {
        toast("Dépose une image valide.");
        return;
      }
      await applyImageToCard(cardId, file);
    });
  });
}

async function refreshAfterCardImageChange() {
  renderLibraryIfVisible();
  renderDeckDetailIfVisible();
  if ($("page-missing-images").classList.contains("active")) {
    await renderMissingImagesPage();
  }
  refreshDashboard();
  refreshBackupInfoIfVisible();
}

function deckPlaceholderMark(card) {
  const deck = findCustomDeckByName(cardDeckName(card));
  if (deck?.emoji) return escapeHTML(deck.emoji);
  const name = cardDeckName(card);
  return escapeHTML((name[0] || "D").toUpperCase());
}

function smartPlaceholderHTML(card) {
  return (
    '<div class="smart-placeholder" aria-label="Image manquante">' +
      '<span class="smart-placeholder-emoji">' + deckPlaceholderMark(card) + "</span>" +
      '<span class="smart-placeholder-text">' + escapeHTML(card.de || card.fr || "Image") + "</span>" +
      '<span class="paste-hint">Clique puis Ctrl+V, ou glisse une image</span>' +
    "</div>"
  );
}

function cardImageHTML(card, imageUrl) {
  return card.imageId
    ? '<img src="' + imageUrl + '" alt="" loading="lazy">'
    : smartPlaceholderHTML(card);
}

function imageSearchDataAttribute(card) {
  const query = getEffectiveImageQuery(card);
  return query ? ' data-image-search-url="' + escapeHTML(imageSearchURL(query)) + '"' : "";
}

function getCurrentMissingImageCard(missingCards) {
  return missingCards.find((card) => card.id === lastImageTargetCardId) || missingCards[0] || null;
}

// Ajoute les 5 cartes d'exemple au tout premier lancement
async function seedIfEmpty() {
  const cards = await getAllCards();
  // Le drapeau localStorage évite de recréer les exemples si l'utilisateur
  // a volontairement supprimé toutes ses cartes.
  if (cards.length > 0 || localStorage.getItem(LS_SEEDED)) return;

  for (const data of SEED_CARDS) {
    await saveCard(createNewCard(data));
  }
  localStorage.setItem(LS_SEEDED, "yes");
}


/* =========================================================
   4. AUDIO — WEB SPEECH API
   Synthèse vocale intégrée au navigateur : gratuite,
   hors ligne, aucune API externe.
   ========================================================= */

function speakGerman(text) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    toast("La synthèse vocale n'est pas disponible dans ce navigateur.");
    return;
  }

  speechSynthesis.cancel(); // coupe une éventuelle lecture en cours

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.9; // un peu plus lent, plus facile à comprendre

  // Bonus : si une voix allemande est installée, on la choisit explicitement
  const germanVoice = speechSynthesis.getVoices().find((voice) => voice.lang.startsWith("de"));
  if (germanVoice) utterance.voice = germanVoice;

  speechSynthesis.speak(utterance);
}

// Les voix se chargent parfois en différé : ce petit appel les "réveille"
function warmUpVoices() {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}


/* =========================================================
   5. NAVIGATION ENTRE LES PAGES
   Une seule page HTML : on affiche/cache des sections.
   ========================================================= */

const PAGES = ["dashboard", "deck-detail", "apprentissage", "revision", "ajouter", "bibliotheque", "missing-images", "grammaire", "sauvegarde"];

function showPage(name) {
  if (!PAGES.includes(name)) name = "dashboard";
  hideDeckActionMenu();

  // Affiche la bonne section, cache les autres
  PAGES.forEach((page) => {
    $("page-" + page).classList.toggle("active", page === name);
  });

  // Met en surbrillance le bon bouton de navigation
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === name);
  });

  // Mémorise le dernier onglet ouvert (petit réglage -> localStorage suffit)
  localStorage.setItem(LS_LAST_PAGE, name);

  // Rafraîchit le contenu de la page qu'on vient d'ouvrir
  if (name === "dashboard")    refreshDashboard();
  if (name === "deck-detail")  renderDeckDetail();
  if (name === "apprentissage") renderLearningPage();
  if (name === "revision")     startReviewSession();
  if (name === "bibliotheque") renderLibrary();
  if (name === "missing-images") renderMissingImagesPage();
  if (name === "ajouter") {
    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
    applyPendingFormCategory();
  }
  if (name === "sauvegarde")   refreshBackupInfo();

  window.scrollTo({ top: 0 });
}

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.page === "revision") {
        currentReviewCategory = null;
        reviewSessionType = "due";
      }
      showPage(btn.dataset.page);
    });
  });

  $("btn-create-deck").addEventListener("click", () => openDeckModal("create"));
  $("btn-select-decks").addEventListener("click", toggleDeckGridSelectionMode);
  $("btn-deck-grid-select-all").addEventListener("click", selectAllDecks);
  $("btn-deck-grid-clear").addEventListener("click", clearDeckGridSelection);
  $("btn-deck-grid-delete").addEventListener("click", deleteSelectedDecks);
  $("btn-study-all-decks").addEventListener("click", () => {
    $("learning-filter-category").value = "";
    $("learning-filter-subcategory").value = "";
    pendingLearningCategory = "";
    showPage("apprentissage");
  });
  $("btn-review-all-decks").addEventListener("click", () => {
    currentReviewCategory = null;
    reviewSessionType = "due";
    showPage("revision");
  });
  $("btn-train-all-decks").addEventListener("click", () => {
    currentReviewCategory = null;
    reviewSessionType = "free";
    showPage("revision");
  });
  $("btn-save-deck").addEventListener("click", saveDeckFromModal);
  $("btn-cancel-deck").addEventListener("click", closeDeckModal);
  $("subcategory-select").addEventListener("change", onSubcategorySelectChange);
  $("btn-save-subcategory-choice").addEventListener("click", saveSubcategoryChoice);
  $("btn-cancel-subcategory-choice").addEventListener("click", closeSubcategoryModal);
  document.addEventListener("paste", handlePastedImage);
  setupDeckDetailPage();
  $("deck-action-menu").addEventListener("click", (event) => {
    event.stopPropagation();
    const actionBtn = event.target.closest("[data-deck-action]");
    if (actionBtn) handleDeckAction(actionBtn.dataset.deckAction, $("deck-action-menu").dataset.deckName);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideDeckActionMenu();
      closeSubcategoryModal();
      closeImportPreviewModal();
    }
  });

  window.addEventListener("resize", hideDeckActionMenu);
  window.addEventListener("scroll", hideDeckActionMenu, true);

  // Écouteur global pour deux types de boutons créés dynamiquement :
  // - data-speak : lit un texte en allemand
  // - data-goto  : navigue vers une page
  document.addEventListener("click", (event) => {
    const speakBtn = event.target.closest("[data-speak]");
    if (speakBtn) {
      speakGerman(speakBtn.dataset.speak);
      return;
    }
    const gotoBtn = event.target.closest("[data-goto]");
    if (gotoBtn) showPage(gotoBtn.dataset.goto);

    const learningCategoryBtn = event.target.closest("[data-learning-category]");
    if (learningCategoryBtn && !learningCategoryBtn.disabled) {
      pendingLearningCategory = learningCategoryBtn.dataset.learningCategory;
      showPage("apprentissage");
    }

    const reviewCategoryBtn = event.target.closest("[data-review-category]");
    if (reviewCategoryBtn && !reviewCategoryBtn.disabled) {
      currentReviewCategory = reviewCategoryBtn.dataset.reviewCategory;
      reviewSessionType = "due";
      showPage("revision");
    }

    const freeReviewCategoryBtn = event.target.closest("[data-free-review-category]");
    if (freeReviewCategoryBtn && !freeReviewCategoryBtn.disabled) {
      currentReviewCategory = freeReviewCategoryBtn.dataset.freeReviewCategory;
      reviewSessionType = "free";
      showPage("revision");
    }

    const addCardCategoryBtn = event.target.closest("[data-add-card-category]");
    if (addCardCategoryBtn && !addCardCategoryBtn.disabled) {
      if (editingCard) resetCardForm();
      pendingFormCategory = addCardCategoryBtn.dataset.addCardCategory;
      pendingFormSubcategory = null;
      showPage("ajouter");
    }

    const openDeckCard = event.target.closest("[data-open-deck]");
    if (openDeckCard && deckGridSelectionMode && !event.target.closest("button, input, select, textarea, a, #deck-action-menu")) {
      // En mode sélection, cliquer sur un deck le coche/décoche au lieu de l'ouvrir
      const name = openDeckCard.dataset.openDeck;
      setDeckNameSelected(name, !selectedDeckNames.has(name));
      return;
    }
    if (openDeckCard && !event.target.closest("button, input, select, textarea, a, #deck-action-menu")) {
      currentDeckDetailCategory = openDeckCard.dataset.openDeck;
      deckDetailSearch = "";
      deckDetailSubcategoryFilter = "";
      $("deck-detail-search").value = "";
      $("deck-detail-subcategory-filter").value = "";
      showPage("deck-detail");
    }

    const deckMenuBtn = event.target.closest("[data-deck-menu]");
    if (deckMenuBtn) {
      event.stopPropagation();
      showDeckActionMenu(deckMenuBtn.dataset.deckMenu, deckMenuBtn);
    } else if (!event.target.closest("#deck-action-menu")) {
      hideDeckActionMenu();
    }
  });
}

function setupDeckDetailPage() {
  $("btn-deck-detail-back").addEventListener("click", () => showPage("dashboard"));

  $("btn-deck-detail-review").addEventListener("click", () => {
    if (!currentDeckDetailCategory) return;
    currentReviewCategory = currentDeckDetailCategory;
    reviewSessionType = "due";
    showPage("revision");
  });

  $("btn-deck-detail-train").addEventListener("click", () => {
    if (!currentDeckDetailCategory) return;
    currentReviewCategory = currentDeckDetailCategory;
    reviewSessionType = "free";
    showPage("revision");
  });

  $("btn-deck-detail-study").addEventListener("click", () => {
    if (!currentDeckDetailCategory) return;
    pendingLearningCategory = currentDeckDetailCategory;
    showPage("apprentissage");
  });

  const addToCurrentDeck = () => {
    if (!currentDeckDetailCategory) return;
    if (editingCard) resetCardForm();
    pendingFormCategory = currentDeckDetailCategory;
    pendingFormSubcategory = deckDetailSubcategoryFilter && deckDetailSubcategoryFilter !== "__none__"
      ? deckDetailSubcategoryFilter
      : null;
    showPage("ajouter");
  };

  $("btn-deck-detail-add").addEventListener("click", addToCurrentDeck);
  $("btn-deck-detail-empty-add").addEventListener("click", addToCurrentDeck);

  $("btn-deck-detail-appearance").addEventListener("click", () => {
    if (!currentDeckDetailCategory) return;
    openDeckModal("appearance", currentDeckDetailCategory);
  });

  $("btn-deck-detail-select").addEventListener("click", toggleDeckSelectionMode);
  $("btn-bulk-select-all").addEventListener("click", selectAllVisibleDeckCards);
  $("btn-bulk-clear").addEventListener("click", clearDeckSelection);
  $("btn-bulk-subcategory").addEventListener("click", openBulkSubcategoryModal);

  const debouncedRenderDeckDetail = debounce(renderDeckDetail, 150);
  $("deck-detail-search").addEventListener("input", () => {
    deckDetailSearch = $("deck-detail-search").value;
    debouncedRenderDeckDetail();
  });
  $("deck-detail-subcategory-filter").addEventListener("change", () => {
    deckDetailSubcategoryFilter = $("deck-detail-subcategory-filter").value;
    renderDeckDetail();
  });
}


/* =========================================================
   6. DASHBOARD
   ========================================================= */

async function refreshDashboard() {
  const cards = await getAllCards();
  const today = todayISO();

  // Les 3 grands chiffres
  $("stat-total").textContent = cards.length;
  $("stat-due").textContent = cards.filter((c) => c.srs.nextReview <= today).length;
  // Une carte est "acquise" quand elle a été réussie au moins 3 fois
  $("stat-mastered").textContent = cards.filter(isMastered).length;

  try {
    await renderDashboardStats();
  } catch (error) {
    console.warn("Stats dashboard non rendues :", error);
  }

  renderDecks(cards);
}

async function renderDashboardStats() {
  const todayStats = await getTodayStats();
  const streak = await getReviewStreak();
  const allHardCards = await getHardCards(10000);
  const hardCards = allHardCards.slice(0, 5);

  $("today-streak").textContent = streak.streak + " jour" + (streak.streak > 1 ? "s" : "");
  $("today-reviews-count").textContent = todayStats.reviewsCount;
  $("today-success-rate").textContent = todayStats.successRate + "%";
  $("today-hard-count").textContent = allHardCards.length;
  $("today-stats-message").textContent = todayStats.reviewsCount
    ? (streak.streak > 0 ? "Continue comme ça." : "Révisions enregistrées aujourd'hui.")
    : "Pas encore de révision aujourd'hui.";

  $("hard-cards-list").innerHTML = hardCards.length
    ? hardCards.map((item) => hardCardRowHTML(item)).join("")
    : '<p class="muted">Aucune carte difficile pour le moment.</p>';
}

function hardCardRowHTML(item) {
  return (
    '<div class="hard-card-row">' +
      '<div>' +
        '<strong>' + escapeHTML(item.card.fr || fullWord(item.card)) + "</strong>" +
        '<span>' + wordHTML(item.card) + " · " + escapeHTML(cardDeckName(item.card)) + "</span>" +
      "</div>" +
      '<div class="hard-card-score">' +
        '<span>' + item.wrongCount + " erreurs</span>" +
        (item.isLeech ? '<span class="badge-leech">Leech</span>' : "") +
      "</div>" +
    "</div>"
  );
}

function renderDecks(cards) {
  const container = $("deck-grid");
  const empty = $("deck-empty");
  const today = todayISO();
  const groups = {};
  const customDecks = getCustomDecks();
  const accents = ["gold", "blue", "green", "orange", "red", "purple"];

  cards.forEach((card) => {
    const category = cardDeckName(card);
    if (!groups[category]) {
      groups[category] = { name: category, total: 0, mastered: 0, due: 0, color: "", emoji: "", custom: false };
    }
    groups[category].total++;
    if (isMastered(card)) groups[category].mastered++;
    if (card.srs.nextReview <= today) groups[category].due++;
  });

  customDecks.forEach((deck) => {
    if (!groups[deck.name]) {
      groups[deck.name] = { name: deck.name, total: 0, mastered: 0, due: 0, color: deck.color, emoji: deck.emoji, custom: true };
    } else {
      groups[deck.name].color = deck.color;
      groups[deck.name].emoji = deck.emoji;
      groups[deck.name].custom = true;
    }
  });

  let decks = Object.values(groups);
  if (cards.length > 0 && decks.length === 0) {
    const categories = [...new Set(cards.map((card) => String(card.category || "Général").trim() || "Général"))];
    decks = categories.map((category) => ({
      name: category,
      total: cards.filter((card) => (String(card.category || "Général").trim() || "Général") === category).length,
      mastered: cards.filter((card) => (String(card.category || "Général").trim() || "Général") === category && isMastered(card)).length,
      due: cards.filter((card) => (String(card.category || "Général").trim() || "Général") === category && card.srs.nextReview <= today).length,
      color: "",
      emoji: "",
      custom: false,
    }));
  }
  decks = decks.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));

  // On garde seulement les sélections qui correspondent à des jeux encore affichés
  visibleDeckNames = decks.map((deck) => deck.name);
  selectedDeckNames = new Set([...selectedDeckNames].filter((name) => visibleDeckNames.includes(name)));
  updateDeckGridBulkBar();

  if (decks.length === 0) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  container.innerHTML = decks.map((deck, index) => {
    const percent = deck.total === 0 ? 0 : Math.round((deck.mastered / deck.total) * 100);
    const color = deck.color || accents[index % accents.length];
    const displayName = (deck.emoji ? deck.emoji + " " : "") + deck.name;
    const reviewDisabled = deck.total === 0 || deck.due === 0 ? " disabled" : "";
    const emptyText = deck.total === 0 ? '<p class="deck-empty-note">Commence par ajouter une carte.</p>' : "";
    const selected = selectedDeckNames.has(deck.name);
    // En mode sélection : une checkbox remplace le menu "..."
    const cornerControl = deckGridSelectionMode
      ? '<label class="deck-grid-select" title="Sélectionner ce jeu"><input type="checkbox" data-deck-grid-select="' + escapeHTML(deck.name) + '"' + (selected ? " checked" : "") + '></label>'
      : '<button class="deck-menu-btn" type="button" data-deck-menu="' + escapeHTML(deck.name) + '">...</button>';
    return (
      '<article class="deck-card deck-' + escapeHTML(color) + (selected ? " selected" : "") + '" data-open-deck="' + escapeHTML(deck.name) + '">' +
        cornerControl +
        '<span class="deck-open-hint">' + (deckGridSelectionMode ? "Sélectionner" : "Ouvrir le jeu") + '</span>' +
        '<div class="deck-name">' + escapeHTML(displayName) + '</div>' +
        '<p class="deck-count">' + deck.total + ' carte(s) · ' + deck.due + ' à réviser</p>' +
        emptyText +
        '<div class="deck-progress-line">' +
          '<span>' + deck.mastered + ' / ' + deck.total + ' mémorisé</span>' +
          '<strong>' + percent + '%</strong>' +
        '</div>' +
        '<div class="progress-track deck-track">' +
          '<div class="progress-fill fill-blue" style="width:' + percent + '%"></div>' +
        '</div>' +
        '<div class="deck-actions">' +
          '<button class="btn btn-primary btn-small" data-review-category="' + escapeHTML(deck.name) + '"' + reviewDisabled + '>Révision</button>' +
          '<button class="btn btn-ghost btn-small" data-free-review-category="' + escapeHTML(deck.name) + '">S&apos;entraîner</button>' +
          '<button class="btn btn-ghost btn-small" data-learning-category="' + escapeHTML(deck.name) + '">Tout étudier</button>' +
          '<button class="btn btn-ghost btn-small" data-add-card-category="' + escapeHTML(deck.name) + '">+ Ajouter</button>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  container.querySelectorAll("[data-deck-grid-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setDeckNameSelected(checkbox.dataset.deckGridSelect, checkbox.checked);
    });
  });
}

/* --- Sélection multiple de jeux sur le dashboard --- */

function toggleDeckGridSelectionMode() {
  deckGridSelectionMode = !deckGridSelectionMode;
  if (!deckGridSelectionMode) selectedDeckNames.clear();
  hideDeckActionMenu();
  refreshDashboard();
}

function setDeckNameSelected(deckName, selected) {
  if (selected) {
    selectedDeckNames.add(deckName);
  } else {
    selectedDeckNames.delete(deckName);
  }

  // Mise à jour visuelle sans re-render complet (plus fluide)
  document.querySelectorAll("[data-open-deck]").forEach((el) => {
    if (el.dataset.openDeck === deckName) el.classList.toggle("selected", selected);
  });
  document.querySelectorAll("[data-deck-grid-select]").forEach((checkbox) => {
    if (checkbox.dataset.deckGridSelect === deckName) checkbox.checked = selected;
  });
  updateDeckGridBulkBar();
}

function updateDeckGridBulkBar() {
  $("btn-select-decks").textContent = deckGridSelectionMode ? "Annuler sélection" : "Sélectionner";
  $("deck-grid-bulk-bar").classList.toggle("hidden", !deckGridSelectionMode);

  const count = selectedDeckNames.size;
  $("deck-grid-bulk-count").textContent = count + " jeu" + (count > 1 ? "x" : "") + " sélectionné" + (count > 1 ? "s" : "");
  $("btn-deck-grid-delete").disabled = count === 0;
  $("btn-deck-grid-clear").disabled = count === 0;
  $("btn-deck-grid-select-all").disabled = visibleDeckNames.length === 0;
}

function selectAllDecks() {
  visibleDeckNames.forEach((name) => selectedDeckNames.add(name));
  refreshDashboard();
}

function clearDeckGridSelection() {
  selectedDeckNames.clear();
  refreshDashboard();
}

async function deleteSelectedDecks() {
  const names = [...selectedDeckNames];
  if (names.length === 0) return;

  const cards = await getAllCards();
  const totalCards = cards.filter((card) => names.includes(cardDeckName(card))).length;
  const plural = names.length > 1;
  const confirmed = confirm(
    "Supprimer " + names.length + " jeu" + (plural ? "x" : "") + " (" + names.join(", ") + ")" +
    (totalCards > 0 ? " et " + totalCards + " carte(s) au total ?" : " ?") +
    "\n\nLes cartes et leurs images seront définitivement supprimées. Pense à exporter avant si tu as un doute."
  );
  if (!confirmed) return;

  for (const name of names) {
    await removeDeckData(name, cards);
  }

  selectedDeckNames.clear();
  deckGridSelectionMode = false;
  refreshAfterDeckChange();
  refreshSubcategorySuggestions();
  toast(names.length + " jeu" + (plural ? "x" : "") + " supprimé" + (plural ? "s" : "") + ".");
}

async function renderDeckDetail() {
  const version = ++deckDetailRenderVersion;
  const deckName = currentDeckDetailCategory;
  if (!deckName) {
    showPage("dashboard");
    return;
  }

  const allCards = await getAllCards();
  if (version !== deckDetailRenderVersion) return;

  const deck = findCustomDeckByName(deckName);
  const displayName = (deck?.emoji ? deck.emoji + " " : "") + deckName;
  const today = todayISO();
  const deckCards = allCards.filter((card) => cardDeckName(card) === deckName);
  const mastered = deckCards.filter(isMastered).length;
  const due = deckCards.filter((card) => card.srs.nextReview <= today).length;
  updateDeckDetailSubcategoryFilter(deckCards);
  renderDeckDetailSubcategorySummary(deckCards);

  $("deck-detail-title").textContent = displayName;
  $("deck-detail-subtitle").textContent =
    deckCards.length + " carte(s) · " + mastered + " mémorisée(s) · " + due + " à réviser";
  $("deck-detail-search").value = deckDetailSearch;

  const query = deckDetailSearch.trim().toLowerCase();
  const visibleCards = deckCards
    .filter((card) => {
      const matchesSubcategory =
        !deckDetailSubcategoryFilter ||
        (deckDetailSubcategoryFilter === "__none__" ? !cardSubcategoryName(card) : cardSubcategoryName(card) === deckDetailSubcategoryFilter);
      return matchesSubcategory && matchesCardQuery(card, query);
    })
    .sort((a, b) => fullWord(a).localeCompare(fullWord(b), "de"));
  visibleDeckDetailCardIds = visibleCards.map((card) => card.id);
  selectedDeckCardIds = new Set([...selectedDeckCardIds].filter((id) => visibleDeckDetailCardIds.includes(id)));
  updateDeckBulkBar();

  const empty = $("deck-detail-empty");
  const grid = $("deck-detail-grid");
  if (deckCards.length === 0) {
    empty.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  if (visibleCards.length === 0) {
    const activeSubcategoryLabel =
      deckDetailSubcategoryFilter && deckDetailSubcategoryFilter !== "__none__"
        ? deckDetailSubcategoryFilter
        : "";
    grid.innerHTML = activeSubcategoryLabel
      ? '<div class="panel deck-detail-filter-empty"><p>Aucune carte dans cette sous-catégorie.</p><button class="btn btn-primary" type="button" id="btn-add-filtered-subcategory">+ Ajouter une carte dans ' + escapeHTML(activeSubcategoryLabel) + "</button></div>"
      : '<p class="muted">Aucune carte ne correspond à cette recherche.</p>';
    if (activeSubcategoryLabel) {
      grid.querySelector("#btn-add-filtered-subcategory").addEventListener("click", () => {
        pendingFormCategory = currentDeckDetailCategory;
        pendingFormSubcategory = activeSubcategoryLabel;
        if (editingCard) resetCardForm();
        showPage("ajouter");
      });
    }
    return;
  }

  const imageUrls = await Promise.all(visibleCards.map((card) => getImageURL(card.imageId)));
  if (version !== deckDetailRenderVersion) return;

  grid.innerHTML = visibleCards
    .map((card, index) => deckDetailCardHTML(card, imageUrls[index]))
    .join("");

  grid.querySelectorAll("[data-deck-detail-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.deckDetailEdit));
  });
  grid.querySelectorAll("[data-deck-detail-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.deckDetailDelete));
  });
  grid.querySelectorAll("[data-deck-detail-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.deckDetailFavorite));
  });
  grid.querySelectorAll("[data-deck-detail-sub-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openSubcategoryModal(btn.dataset.deckDetailSubEdit));
  });
  grid.querySelectorAll("[data-deck-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setDeckCardSelected(checkbox.dataset.deckSelect, checkbox.checked);
    });
  });
  grid.querySelectorAll("[data-deck-select-card]").forEach((cardEl) => {
    cardEl.addEventListener("click", (event) => {
      if (!deckDetailSelectionMode || event.target.closest("button, input, select, textarea, a")) return;
      const id = cardEl.dataset.deckSelectCard;
      setDeckCardSelected(id, !selectedDeckCardIds.has(id));
      renderDeckDetail();
    });
  });
  attachImageDropHandlers(grid);
}

function toggleDeckSelectionMode() {
  deckDetailSelectionMode = !deckDetailSelectionMode;
  if (!deckDetailSelectionMode) selectedDeckCardIds.clear();
  renderDeckDetail();
}

function setDeckCardSelected(cardId, selected) {
  if (selected) {
    selectedDeckCardIds.add(cardId);
  } else {
    selectedDeckCardIds.delete(cardId);
  }
  updateDeckBulkBar();
}

function selectAllVisibleDeckCards() {
  visibleDeckDetailCardIds.forEach((id) => selectedDeckCardIds.add(id));
  renderDeckDetail();
}

function clearDeckSelection() {
  selectedDeckCardIds.clear();
  renderDeckDetail();
}

function updateDeckBulkBar() {
  $("btn-deck-detail-select").textContent = deckDetailSelectionMode ? "Annuler sélection" : "Sélectionner";
  $("deck-bulk-bar").classList.toggle("hidden", !deckDetailSelectionMode);
  const count = selectedDeckCardIds.size;
  $("deck-bulk-count").textContent = count + " sélectionnée" + (count > 1 ? "s" : "");
  $("btn-bulk-subcategory").disabled = count === 0;
  $("btn-bulk-clear").disabled = count === 0;
  $("btn-bulk-select-all").disabled = visibleDeckDetailCardIds.length === 0;
}

function createSubcategoryForCurrentDeck() {
  if (!currentDeckDetailCategory) return;
  const name = prompt("Nom de la sous-catégorie :", "");
  if (!name) return;
  const cleanName = name.trim();
  if (!cleanName) return;

  upsertCustomSubcategory(currentDeckDetailCategory, cleanName);
  deckDetailSubcategoryFilter = cleanName;
  refreshSubcategorySuggestions();
  renderDeckDetail();
  toast("Sous-catégorie créée.");
}

async function openSubcategoryModal(cardId) {
  const card = await getCard(cardId);
  if (!card) return;

  pendingSubcategoryCardId = cardId;
  pendingSubcategoryCardIds = [];
  const deckName = cardDeckName(card);
  await prepareSubcategoryModal(deckName, card.subcategory);
  $("subcategory-modal-card").textContent = fullWord(card) + " · " + deckName;
}

async function openBulkSubcategoryModal() {
  if (!currentDeckDetailCategory || selectedDeckCardIds.size === 0) return;
  pendingSubcategoryCardId = null;
  pendingSubcategoryCardIds = [...selectedDeckCardIds];
  await prepareSubcategoryModal(currentDeckDetailCategory, "");
  const count = pendingSubcategoryCardIds.length;
  $("subcategory-modal-card").textContent = "Changer la sous-catégorie de " + count + " carte" + (count > 1 ? "s" : "");
}

async function prepareSubcategoryModal(deckName, selectedSubcategory = "") {
  const cards = await getAllCards();
  const subcategories = [...new Set([
    ...cards
      .filter((item) => cardDeckName(item) === deckName)
      .map((item) => item.subcategory)
      .filter(Boolean),
    ...customSubcategoriesForCategory(deckName),
  ])].sort((a, b) => a.localeCompare(b, "fr"));

  $("subcategory-select").innerHTML =
    '<option value="__none__">Sans sous-catégorie</option>' +
    subcategories.map((name) => '<option value="' + escapeHTML(name) + '">' + escapeHTML(name) + "</option>").join("") +
    '<option value="__new__">+ Nouvelle sous-catégorie</option>';
  $("subcategory-select").value = selectedSubcategory && subcategories.includes(selectedSubcategory)
    ? selectedSubcategory
    : "__none__";
  $("subcategory-new-name").value = "";
  onSubcategorySelectChange();
  $("subcategory-modal").classList.remove("hidden");
}

function closeSubcategoryModal() {
  $("subcategory-modal").classList.add("hidden");
  pendingSubcategoryCardId = null;
  pendingSubcategoryCardIds = [];
  $("subcategory-new-name").value = "";
  $("subcategory-new-wrap").classList.add("hidden");
}

function onSubcategorySelectChange() {
  const isNew = $("subcategory-select").value === "__new__";
  $("subcategory-new-wrap").classList.toggle("hidden", !isNew);
  if (isNew) $("subcategory-new-name").focus();
}

async function saveSubcategoryChoice() {
  const targetIds = pendingSubcategoryCardIds.length ? pendingSubcategoryCardIds : (pendingSubcategoryCardId ? [pendingSubcategoryCardId] : []);
  if (targetIds.length === 0) return;
  const cards = (await Promise.all(targetIds.map((id) => getCard(id)))).filter(Boolean);
  if (cards.length === 0) {
    closeSubcategoryModal();
    return;
  }
  const deckName = pendingSubcategoryCardIds.length ? currentDeckDetailCategory : cardDeckName(cards[0]);

  const choice = $("subcategory-select").value;
  let nextSubcategory = "";

  if (choice === "__new__") {
    nextSubcategory = $("subcategory-new-name").value.trim();
    if (!nextSubcategory) {
      toast("Indique le nom de la nouvelle sous-catégorie.");
      return;
    }
    upsertCustomSubcategory(deckName, nextSubcategory);
  } else if (choice !== "__none__") {
    nextSubcategory = choice;
  }

  for (const card of cards) {
    card.subcategory = nextSubcategory;
    card.updatedAt = todayISO();
    await saveCard(card);
  }
  if (nextSubcategory) upsertCustomSubcategory(deckName, nextSubcategory);

  refreshSubcategorySuggestions();
  selectedDeckCardIds.clear();
  if (pendingSubcategoryCardIds.length) deckDetailSelectionMode = false;
  renderDeckDetailIfVisible();
  renderLibraryIfVisible();
  renderLearningIfVisible();
  closeSubcategoryModal();
  toast(cards.length + " carte" + (cards.length > 1 ? "s" : "") + " mise" + (cards.length > 1 ? "s" : "") + " à jour.");
}

function changeCardSubcategory(cardId) {
  openSubcategoryModal(cardId);
}

function updateDeckDetailSubcategoryFilter(cards) {
  const select = $("deck-detail-subcategory-filter");
  const currentValue = deckDetailSubcategoryFilter;
  const subcategories = [...new Set([
    ...cards.map((card) => card.subcategory).filter(Boolean),
    ...customSubcategoriesForCategory(currentDeckDetailCategory),
  ])]
    .sort((a, b) => a.localeCompare(b, "fr"));
  const hasEmpty = cards.some((card) => !card.subcategory);

  select.innerHTML =
    '<option value="">Toutes les sous-catégories</option>' +
    subcategories.map((subcategory) => '<option value="' + escapeHTML(subcategory) + '">' + escapeHTML(subcategory) + "</option>").join("") +
    (hasEmpty ? '<option value="__none__">Sans sous-catégorie</option>' : "");

  deckDetailSubcategoryFilter = subcategories.includes(currentValue) || (currentValue === "__none__" && hasEmpty) ? currentValue : "";
  select.value = deckDetailSubcategoryFilter;
}

function renderDeckDetailSubcategorySummary(cards) {
  const counts = {};
  cards.forEach((card) => {
    const name = card.subcategory || "Sans sous-catégorie";
    counts[name] = (counts[name] || 0) + 1;
  });
  customSubcategoriesForCategory(currentDeckDetailCategory).forEach((name) => {
    if (!counts[name]) counts[name] = 0;
  });

  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b, "fr"));
  $("deck-detail-subcategories").innerHTML = names.length
    ? '<span>Sous-catégories :</span>' + names.map((name) => {
        const value = name === "Sans sous-catégorie" ? "__none__" : name;
        const active = deckDetailSubcategoryFilter === value ? " active" : "";
        return '<button class="subcategory-pill' + active + '" type="button" data-deck-detail-subcategory="' + escapeHTML(value) + '">' +
          escapeHTML(name) + " : " + counts[name] + "</button>";
      }).join("") +
      '<button class="btn btn-ghost btn-small" type="button" id="btn-create-subcategory">+ Créer une sous-catégorie</button>'
    : '<button class="btn btn-ghost btn-small" type="button" id="btn-create-subcategory">+ Créer une sous-catégorie</button>';

  $("deck-detail-subcategories").querySelectorAll("[data-deck-detail-subcategory]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deckDetailSubcategoryFilter = btn.dataset.deckDetailSubcategory;
      renderDeckDetail();
    });
  });
  const createBtn = $("deck-detail-subcategories").querySelector("#btn-create-subcategory");
  if (createBtn) createBtn.addEventListener("click", createSubcategoryForCurrentDeck);
}

function renderDeckDetailIfVisible() {
  if ($("page-deck-detail").classList.contains("active")) renderDeckDetail();
}

function deckDetailCardHTML(card, imageUrl) {
  const pluralText = formatPlural(card);
  const pluralLine = pluralText
    ? '<p class="deck-detail-plural">Pluriel : ' + escapeHTML(pluralText) + "</p>"
    : "";
  const exampleLine = card.exampleDe
    ? '<p class="deck-detail-example">' + escapeHTML(card.exampleDe) + (card.exampleFr ? '<span>' + escapeHTML(card.exampleFr) + "</span>" : "") + "</p>"
    : "";
  const subcategoryLine = card.subcategory
    ? '<div class="deck-detail-subcategory-line"><span class="chip-subcategory-compact">' + escapeHTML(card.subcategory) + "</span></div>"
    : "";
  const imageQueryLine = imageQueryHTML(card);
  const selected = selectedDeckCardIds.has(card.id);
  const selectBox = deckDetailSelectionMode
    ? '<label class="deck-detail-select" title="Sélectionner"><input type="checkbox" data-deck-select="' + escapeHTML(card.id) + '"' + (selected ? " checked" : "") + '><span></span></label>'
    : "";

  return (
    '<article class="deck-detail-card' + (selected ? " selected" : "") + '" data-deck-select-card="' + escapeHTML(card.id) + '" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      selectBox +
      cardImageHTML(card, imageUrl) +
      '<div class="deck-detail-card-body">' +
        '<div class="deck-detail-card-top">' +
          '<div class="deck-detail-chips">' +
            '<span class="chip chip-category">' + escapeHTML(cardDeckName(card)) + "</span>" +
          "</div>" +
          '<span class="deck-detail-status">' + escapeHTML(cardStatusLabel(card)) + "</span>" +
        "</div>" +
        '<p class="deck-detail-fr">' + escapeHTML(card.fr) + "</p>" +
        '<div class="deck-detail-word">' + wordHTML(card) + "</div>" +
        subcategoryLine +
        pluralLine +
        imageQueryLine +
        exampleLine +
      "</div>" +
      '<div class="deck-detail-card-actions compact">' +
        '<button class="btn btn-icon btn-small" data-speak="' + escapeHTML(fullWord(card)) + '" title="Écouter" aria-label="Écouter">🔊</button>' +
        '<button class="btn btn-icon btn-small btn-favorite ' + (card.favorite ? "active" : "") + '" data-deck-detail-favorite="' + escapeHTML(card.id) + '" title="Favori" aria-label="Favori">' + (card.favorite ? "♥" : "♡") + "</button>" +
        '<button class="btn btn-icon btn-small" data-deck-detail-sub-edit="' + escapeHTML(card.id) + '" title="Changer la sous-catégorie" aria-label="Changer la sous-catégorie">↔️</button>' +
        '<button class="btn btn-icon btn-small btn-edit" data-deck-detail-edit="' + escapeHTML(card.id) + '" title="Modifier la carte" aria-label="Modifier la carte">✏️</button>' +
        '<button class="btn btn-icon btn-small btn-danger" data-deck-detail-delete="' + escapeHTML(card.id) + '" title="Supprimer" aria-label="Supprimer">🗑️</button>' +
      "</div>" +
    "</article>"
  );
}

function cardStatusLabel(card) {
  const today = todayISO();
  if (isNewCard(card)) return "Nouvelle";
  if (card.srs.nextReview <= today) return "À réviser aujourd'hui";
  if (isMastered(card)) return "Acquise";
  return "Prochaine révision : " + formatDateFr(card.srs.nextReview);
}

async function deckHasCards(name) {
  const cards = await getAllCards();
  return cards.some((card) => cardDeckName(card) === name);
}

function openDeckModal(mode, deckName = "") {
  const deck = findCustomDeckByName(deckName) || { name: deckName, color: "gold", emoji: "" };
  deckModalMode = mode;
  deckModalOriginalName = deckName;
  $("deck-modal-title").textContent = mode === "create" ? "Créer un jeu" : "Modifier l'apparence";
  $("deck-name-input").value = mode === "create" ? "" : deck.name;
  $("deck-name-input").disabled = mode !== "create";
  $("deck-color-input").value = deck.color || "gold";
  $("deck-emoji-input").value = deck.emoji || "";
  $("deck-modal").classList.remove("hidden");
  $("deck-name-input").focus();
}

function closeDeckModal() {
  $("deck-modal").classList.add("hidden");
  deckModalOriginalName = "";
}

function saveDeckFromModal() {
  const name = $("deck-name-input").value.trim();
  if (!name) {
    toast("Nom du jeu obligatoire.");
    return;
  }

  upsertCustomDeck({
    name: name,
    color: $("deck-color-input").value,
    emoji: $("deck-emoji-input").value.trim(),
  }, deckModalOriginalName || name);

  closeDeckModal();
  refreshDashboard();
  refreshCategorySuggestions();
  renderDeckDetailIfVisible();
  toast("Jeu sauvegardé.");
}

function showDeckActionMenu(deckName, anchorButton) {
  const menu = $("deck-action-menu");
  const rect = anchorButton.getBoundingClientRect();
  menu.dataset.deckName = deckName;
  menu.innerHTML =
    '<button type="button" data-deck-action="rename">Renommer</button>' +
    '<button type="button" data-deck-action="appearance">Modifier apparence</button>' +
    '<button type="button" data-deck-action="add">Ajouter une carte</button>' +
    '<button type="button" data-deck-action="study">Tout étudier</button>' +
    '<button type="button" data-deck-action="train">S&apos;entraîner</button>' +
    '<button type="button" data-deck-action="review">Réviser</button>' +
    '<button type="button" data-deck-action="delete">Supprimer le jeu</button>';
  menu.classList.remove("hidden");

  const gap = 8;
  const menuWidth = menu.offsetWidth || 220;
  const menuHeight = menu.offsetHeight || 240;
  let left = rect.right - menuWidth;
  let top = rect.bottom + gap;

  left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));
  if (top + menuHeight > window.innerHeight - 12) {
    top = rect.top - menuHeight - gap;
  }
  top = Math.max(12, top);

  menu.style.left = left + "px";
  menu.style.top = top + "px";
}

function hideDeckActionMenu() {
  const menu = $("deck-action-menu");
  menu.classList.add("hidden");
  menu.style.left = "";
  menu.style.top = "";
}

async function handleDeckAction(action, deckName) {
  hideDeckActionMenu();

  if (action === "add") {
    if (editingCard) resetCardForm();
    pendingFormCategory = deckName;
    showPage("ajouter");
    return;
  }
  if (action === "study") {
    pendingLearningCategory = deckName;
    showPage("apprentissage");
    return;
  }
  if (action === "review") {
    currentReviewCategory = deckName;
    reviewSessionType = "due";
    showPage("revision");
    return;
  }
  if (action === "train") {
    currentReviewCategory = deckName;
    reviewSessionType = "free";
    showPage("revision");
    return;
  }
  if (action === "appearance") {
    openDeckModal("appearance", deckName);
    return;
  }
  if (action === "rename") {
    await renameDeck(deckName);
    return;
  }
  if (action === "delete") {
    await deleteDeck(deckName);
  }
}

async function renameDeck(oldName) {
  const newName = prompt("Nouveau nom du jeu :", oldName);
  if (!newName) return;
  const cleanName = newName.trim();
  if (!cleanName || cleanName === oldName) return;

  const cards = await getAllCards();
  const affectedCards = cards.filter((card) => cardDeckName(card) === oldName);
  if (affectedCards.length > 0) {
    const confirmed = confirm("Renommer ce jeu déplacera " + affectedCards.length + " carte(s) vers « " + cleanName + " ». Continuer ?");
    if (!confirmed) return;
  }

  const existingDeck = findCustomDeckByName(oldName) || { color: "gold", emoji: "" };
  upsertCustomDeck({ ...existingDeck, name: cleanName }, oldName);
  renameCustomSubcategoriesCategory(oldName, cleanName);

  for (const card of affectedCards) {
    card.category = cleanName;
    card.updatedAt = todayISO();
    await saveCard(card);
  }

  if (currentReviewCategory === oldName) currentReviewCategory = cleanName;
  if (pendingLearningCategory === oldName) pendingLearningCategory = cleanName;
  if (currentDeckDetailCategory === oldName) currentDeckDetailCategory = cleanName;
  refreshAfterDeckChange();
  toast("Jeu renommé.");
}

// Supprime un jeu et tout ce qui va avec (cartes, images orphelines,
// sous-catégories, états). Ne demande PAS de confirmation : c'est aux
// fonctions appelantes de le faire.
async function removeDeckData(deckName, allCards) {
  const deckCards = allCards.filter((card) => cardDeckName(card) === deckName);

  // On supprime d'abord les cartes, puis on nettoie les images devenues orphelines
  const imageIds = [...new Set(deckCards.map((card) => card.imageId).filter(Boolean))];
  for (const card of deckCards) {
    await deleteCard(card.id);
  }
  for (const imageId of imageIds) {
    await deleteImageIfUnused(imageId);
  }

  deleteCustomSubcategoriesForCategory(deckName);
  deleteCustomDeckByName(deckName);

  // Nettoyage des états qui pointaient vers ce deck
  if (currentReviewCategory === deckName) currentReviewCategory = null;
  if (pendingLearningCategory === deckName) pendingLearningCategory = null;
  if (currentDeckDetailCategory === deckName) {
    currentDeckDetailCategory = null;
    if ($("page-deck-detail").classList.contains("active")) showPage("dashboard");
  }

  return deckCards.length;
}

async function deleteDeck(deckName) {
  const cards = await getAllCards();
  const deckCards = cards.filter((card) => cardDeckName(card) === deckName);

  // Message adapté : un jeu vide est sans risque, un jeu plein demande un vrai avertissement
  const message = deckCards.length > 0
    ? "Supprimer le jeu « " + deckName + " » et ses " + deckCards.length + " carte(s) ?\n\nLes cartes et leurs images seront définitivement supprimées. Pense à exporter avant si tu as un doute."
    : "Supprimer le jeu vide « " + deckName + " » de la liste ?";
  const confirmed = confirm(message);
  if (!confirmed) return;

  await removeDeckData(deckName, cards);

  refreshAfterDeckChange();
  refreshSubcategorySuggestions();
  toast(deckCards.length > 0 ? "Jeu, cartes et images supprimés." : "Jeu supprimé.");
}

function refreshAfterDeckChange() {
  refreshDashboard();
  refreshCategorySuggestions();
  renderLibraryIfVisible();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  if ($("page-revision").classList.contains("active")) startReviewSession();
}

/* =========================================================
   7. RÉVISION — RÉPÉTITION ESPACÉE (SRS)

   Règles simples :
   - Raté      -> box 1, revient aujourd'hui
   - Difficile -> box - 1 minimum 1, revient demain
   - Bien      -> box + 1, revient selon la nouvelle box
   - Facile    -> box + 2, revient selon la nouvelle box
   ========================================================= */

async function startReviewSession() {
  const cards = await getAllCards();
  const scopedCards = currentReviewCategory
    ? cards.filter((card) => cardDeckName(card) === currentReviewCategory)
    : cards;
  failedOnceInSession = new Set();
  reviewSessionStats = { seen: 0, correct: 0, wrong: 0, failedCardIds: [], failedCards: [] };
  isGrading = false;
  setGradeButtonsDisabled(false);
  reviewChoicePool = scopedCards;
  updateReviewSetup(scopedCards);
  reviewQueue = reviewSessionType === "due"
    ? buildReviewQueue(scopedCards)
    : buildFreePracticeQueue(scopedCards);

  if (cards.length === 0) {
    showReviewEmpty("Ta bibliothèque est vide. Commence par ajouter quelques cartes ! 📝");
  } else if (scopedCards.length === 0 && currentReviewCategory) {
    showReviewEmpty("Aucune carte dans ce deck.");
  } else if (reviewQueue.length === 0) {
    if (reviewSessionType === "due") {
      showReviewEmpty("Aucune carte prévue aujourd'hui. Tu peux lancer Entraînement libre pour réviser quand même.", scopedCards.length > 0);
    } else {
      showReviewEmpty(currentReviewCategory ? "Aucune carte dans ce deck." : "Aucune carte à entraîner.");
    }
  } else {
    showNextReviewCard();
  }
}

function updateReviewSetup(scopedCards) {
  const sessionLabel = reviewSessionType === "free" ? "Entraînement libre" : "Révision du jour";
  $("review-scope-title").textContent = currentReviewCategory
    ? sessionLabel + " : " + currentReviewCategory
    : sessionLabel + " : toutes les catégories";

  const distinctChoices = new Set(scopedCards.map((card) => fullWord(card))).size;
  const multipleAvailable = distinctChoices >= 4;
  $("btn-review-mode-multiple").disabled = !multipleAvailable;
  if (!multipleAvailable && currentReviewMode === "multiple") {
    currentReviewMode = "classic";
  }

  $("btn-review-type-due").classList.toggle("active", reviewSessionType === "due");
  $("btn-review-type-free").classList.toggle("active", reviewSessionType === "free");
  $("btn-review-mode-classic").classList.toggle("active", currentReviewMode === "classic");
  $("btn-review-mode-multiple").classList.toggle("active", currentReviewMode === "multiple");
  $("btn-review-mode-written").classList.toggle("active", currentReviewMode === "written");
  if (reviewSessionType === "free") {
    $("review-mode-help").textContent = "Entraînement libre : ta progression SRS ne sera pas modifiée.";
  } else {
    $("review-mode-help").textContent = multipleAvailable
      ? "Révision du jour : seules les cartes dues modifient ta progression SRS."
      : "Réponses multiples disponibles avec 4 réponses allemandes distinctes dans ce deck.";
  }
}

function showReviewEmpty(message, canStartFreePractice = false) {
  currentCard = null;
  $("review-area").classList.add("hidden");
  $("review-empty").classList.remove("hidden");
  $("review-empty-text").textContent = message;
  $("btn-start-free-practice").classList.toggle("hidden", !canStartFreePractice);
  $("session-summary").classList.add("hidden");
  $("session-summary").innerHTML = "";
}

function showSessionSummary() {
  const stats = reviewSessionStats || { seen: 0, correct: 0, wrong: 0, failedCards: [] };
  const successRate = stats.seen ? Math.round((stats.correct / stats.seen) * 100) : 0;
  $("review-area").classList.add("hidden");
  $("review-empty").classList.remove("hidden");
  $("review-empty-text").textContent = "Résumé de séance";
  $("btn-start-free-practice").classList.add("hidden");
  $("session-summary").classList.remove("hidden");
  $("session-summary").innerHTML =
    '<div class="session-summary-grid">' +
      '<div><span>Cartes vues</span><strong>' + stats.seen + "</strong></div>" +
      '<div><span>Bonnes réponses</span><strong>' + stats.correct + "</strong></div>" +
      '<div><span>Erreurs</span><strong>' + stats.wrong + "</strong></div>" +
      '<div><span>Réussite</span><strong>' + successRate + "%</strong></div>" +
    "</div>" +
    (stats.failedCards.length
      ? '<div class="session-failed-list"><strong>Cartes ratées</strong><ul>' +
        stats.failedCards.map((card) => '<li>' + escapeHTML(fullWord(card)) + "</li>").join("") +
        "</ul></div>"
      : '<p class="muted">Aucune carte ratée dans cette séance.</p>');
}

function buildReviewQueue(cards) {
  const today = todayISO();
  const groups = {};
  const newCards = [];

  cards.forEach((card) => {
    if (card.srs.nextReview > today) return;

    if (isNewCard(card)) {
      newCards.push(card);
      return;
    }

    const date = card.srs.nextReview;
    if (!groups[date]) groups[date] = [];
    groups[date].push(card);
  });

  shuffleArray(newCards);
  newCards.slice(0, MAX_NEW_CARDS_PER_DAY).forEach((card) => {
      const date = card.srs.nextReview;
      if (!groups[date]) groups[date] = [];
      groups[date].push(card);
  });

  return Object.keys(groups)
    .sort()
    .flatMap((date) => {
      const group = groups[date];
      shuffleArray(group);
      return group;
    });
}

function buildFreePracticeQueue(cards) {
  const queue = [...cards];
  shuffleArray(queue);
  return queue;
}

function setGradeButtonsDisabled(disabled) {
  document.querySelectorAll(".grade-buttons button").forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function showNextReviewCard() {
  if (reviewQueue.length === 0) {
    setGradeButtonsDisabled(false);
    showSessionSummary();
    return;
  }

  // On prend la première carte de la file
  currentCard = reviewQueue.shift();

  $("review-empty").classList.add("hidden");
  $("review-area").classList.remove("hidden");
  $("review-counter").textContent = "Cartes restantes : " + (reviewQueue.length + 1);

  // --- Face avant : image + traduction française ---
  $("review-category").textContent = "Catégorie : " + cardDeckName(currentCard);
  $("review-image").src = await getImageURL(currentCard.imageId);
  $("review-front-fr").textContent = currentCard.fr;
  $("review-front-hint").textContent = "Retrouve le mot allemand";

  // --- On cache la réponse jusqu'au clic ---
  $("review-answer").classList.add("hidden");
  $("multiple-feedback").classList.add("hidden");
  $("multiple-choice").classList.add("hidden");
  $("multiple-choice").innerHTML = "";
  $("written-review").classList.add("hidden");
  $("written-article").value = "";
  $("written-word").value = "";
  $("btn-check-written").disabled = false;
  $("written-article").disabled = false;
  $("written-word").disabled = false;
  $("btn-free-next").classList.add("hidden");
  document.querySelector(".grade-question").classList.remove("hidden");
  document.querySelector(".grade-buttons").classList.remove("hidden");

  if (currentReviewMode === "multiple") {
    $("btn-show-answer").classList.add("hidden");
    renderMultipleChoice();
  } else if (currentReviewMode === "written") {
    $("btn-show-answer").classList.add("hidden");
    $("review-front-hint").textContent = "Écris le mot allemand";
    $("written-review").classList.remove("hidden");
    $("written-article").focus();
  } else {
    $("btn-show-answer").classList.remove("hidden");
  }
  setGradeButtonsDisabled(false);
}

function renderMultipleChoice() {
  if (!currentCard || reviewChoicePool.length < 4) return;

  const correctAnswer = fullWord(currentCard);
  const wrongChoices = [...new Set(
    reviewChoicePool
      .filter((card) => card.id !== currentCard.id)
      .map((card) => fullWord(card))
  )].filter((word) => word !== correctAnswer);
  shuffleArray(wrongChoices);

  if (wrongChoices.length < 3) {
    $("multiple-feedback").textContent = "Pas assez de réponses distinctes pour ce QCM.";
    $("multiple-feedback").className = "multiple-feedback ko";
    return;
  }

  const choices = [correctAnswer, ...wrongChoices.slice(0, 3)];
  shuffleArray(choices);

  $("multiple-choice").innerHTML = choices.map((choice) => {
    return '<button class="btn multiple-choice-btn" data-choice="' + escapeHTML(choice) + '">' + escapeHTML(choice) + '</button>';
  }).join("");
  $("multiple-choice").classList.remove("hidden");
}

function setMultipleChoiceDisabled(disabled) {
  document.querySelectorAll(".multiple-choice-btn").forEach((btn) => {
    btn.disabled = disabled;
  });
}

function handleMultipleChoice(choice) {
  if (isGrading || !currentCard) return;

  const correctAnswer = fullWord(currentCard);
  const isCorrect = choice === correctAnswer;
  $("multiple-feedback").textContent = isCorrect
    ? "Bonne réponse"
    : "Réponse correcte : " + correctAnswer;
  $("multiple-feedback").className = "multiple-feedback " + (isCorrect ? "ok" : "ko");
  setMultipleChoiceDisabled(true);
  isGrading = true;

  setTimeout(() => {
    isGrading = false;
    handleGrade(isCorrect ? "good" : "fail");
  }, 550);
}

function normalizeTypedAnswer(value) {
  return value.trim().toLowerCase();
}

function handleWrittenAnswer() {
  if (isGrading || !currentCard) return;

  const typedArticle = normalizeTypedAnswer($("written-article").value);
  const typedWord = normalizeTypedAnswer($("written-word").value);
  const expectedArticle = normalizeTypedAnswer(currentCard.article || "");
  const expectedWord = normalizeTypedAnswer(currentCard.de);
  const isCorrect = typedArticle === expectedArticle && typedWord === expectedWord;
  const correctAnswer = fullWord(currentCard);

  $("multiple-feedback").textContent = isCorrect
    ? "Bonne réponse"
    : "Réponse correcte : " + correctAnswer;
  $("multiple-feedback").className = "multiple-feedback " + (isCorrect ? "ok" : "ko");
  $("multiple-feedback").classList.remove("hidden");
  $("btn-check-written").disabled = true;
  $("written-article").disabled = true;
  $("written-word").disabled = true;
  isGrading = true;

  setTimeout(() => {
    $("written-article").disabled = false;
    $("written-word").disabled = false;
    isGrading = false;
    handleGrade(isCorrect ? "good" : "fail");
  }, 750);
}

// Remplit et affiche la face arrière de la carte
function showAnswer() {
  const card = currentCard;
  if (!card) return;

  const articleEl = $("answer-article");
  articleEl.textContent = card.article ? card.article + " " : "";
  articleEl.className = card.article ? "art-" + card.article : "";
  $("answer-word-text").textContent = card.de;

  const pluralRow = $("answer-plural-row");
  const pluralText = formatPlural(card);
  if (pluralText) {
    pluralRow.classList.remove("hidden");
    $("answer-plural").textContent = pluralText;
  } else {
    pluralRow.classList.add("hidden");
  }

  const subcategoryRow = $("answer-subcategory-row");
  if (card.subcategory) {
    subcategoryRow.classList.remove("hidden");
    $("answer-subcategory").textContent = card.subcategory;
  } else {
    subcategoryRow.classList.add("hidden");
  }

  // Phrase d'exemple : affichée seulement si elle existe
  const exampleBlock = $("answer-example-block");
  if (card.exampleDe) {
    exampleBlock.classList.remove("hidden");
    $("answer-example-de").textContent = card.exampleDe;
    $("answer-example-fr").textContent = card.exampleFr || "";
  } else {
    exampleBlock.classList.add("hidden");
  }

  $("review-answer").classList.remove("hidden");
  $("btn-show-answer").classList.add("hidden");
  const freeMode = reviewSessionType === "free";
  document.querySelector(".grade-question").classList.toggle("hidden", freeMode);
  document.querySelector(".grade-buttons").classList.toggle("hidden", freeMode);
  $("btn-free-next").classList.toggle("hidden", !freeMode);
}

// Met à jour les données SRS de la carte selon la réponse de l'utilisateur
function applyGrade(card, grade) {
  const today = todayISO();
  card.srs = normalizeSrs(card.srs);

  if (grade === "fail") {
    // Raté : retour en box 1, à revoir aujourd'hui.
    card.srs.wrongCount++;
    card.srs.box = 1;
    card.srs.nextReview = today;
  } else if (grade === "hard") {
    // Difficile : on baisse d'une box si possible, puis demain.
    card.srs.wrongCount++;
    card.srs.box = Math.max(1, card.srs.box - 1);
    card.srs.nextReview = addDays(today, 1);
  } else if (grade === "good") {
    // Bien : on monte d'une box et on applique l'intervalle de cette box.
    card.srs.correctCount++;
    card.srs.box++;
    card.srs.nextReview = addDays(today, srsIntervalDays(card.srs.box));
  } else if (grade === "easy") {
    // Facile : on monte de deux box et on applique l'intervalle de cette box.
    card.srs.correctCount++;
    card.srs.box += 2;
    card.srs.nextReview = addDays(today, srsIntervalDays(card.srs.box));
  }
}

async function saveReviewLogSafely(card, grade) {
  try {
    await saveReview(createReviewLog(card, grade, {
      mode: reviewSessionType,
      reviewMode: currentReviewMode,
    }));
  } catch (error) {
    console.warn("Journal de révision non enregistré :", error);
  }
}

function updateSessionStats(card, grade) {
  if (!reviewSessionStats) return;
  const correct = isPassingGrade(grade);
  reviewSessionStats.seen++;
  if (correct) {
    reviewSessionStats.correct++;
  } else {
    reviewSessionStats.wrong++;
    if (!reviewSessionStats.failedCardIds.includes(card.id)) {
      reviewSessionStats.failedCardIds.push(card.id);
      reviewSessionStats.failedCards.push(card);
    }
  }
}

async function handleGrade(grade) {
  if (isGrading || !currentCard) return;

  isGrading = true;
  setGradeButtonsDisabled(true);
  const card = currentCard;
  const originalCard = { ...card, srs: { ...card.srs } };
  currentCard = null;

  try {
    await saveReviewLogSafely(card, grade);
    updateSessionStats(card, grade);

    if (reviewSessionType === "free") {
      await showNextReviewCard();
      refreshDashboard();
      return;
    }

    applyGrade(card, grade);
    await updateCard(card);

    // Une carte ratée ne revient qu'une seule fois maximum dans la même séance.
    if (grade === "fail" && !failedOnceInSession.has(card.id)) {
      failedOnceInSession.add(card.id);
      reviewQueue.push(card);
    }

    await showNextReviewCard();
    refreshDashboard();
  } catch (error) {
    console.error("Erreur pendant l'enregistrement SRS :", error);
    currentCard = originalCard;
    toast("Impossible d'enregistrer la réponse. Réessaie.");
  } finally {
    isGrading = false;
    setGradeButtonsDisabled(false);
  }
}

function setupReviewPage() {
  $("btn-show-answer").addEventListener("click", showAnswer);
  $("btn-review-all").addEventListener("click", () => {
    currentReviewCategory = null;
    reviewSessionType = "due";
    startReviewSession();
  });
  $("btn-review-type-due").addEventListener("click", () => {
    reviewSessionType = "due";
    startReviewSession();
  });
  $("btn-review-type-free").addEventListener("click", () => {
    reviewSessionType = "free";
    startReviewSession();
  });
  $("btn-review-mode-classic").addEventListener("click", () => {
    currentReviewMode = "classic";
    startReviewSession();
  });
  $("btn-review-mode-multiple").addEventListener("click", () => {
    if ($("btn-review-mode-multiple").disabled) return;
    currentReviewMode = "multiple";
    startReviewSession();
  });
  $("btn-review-mode-written").addEventListener("click", () => {
    currentReviewMode = "written";
    startReviewSession();
  });
  $("multiple-choice").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-choice]");
    if (btn) handleMultipleChoice(btn.dataset.choice);
  });
  $("btn-check-written").addEventListener("click", handleWrittenAnswer);
  ["written-article", "written-word"].forEach((id) => {
    $(id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleWrittenAnswer();
      }
    });
  });
  $("btn-start-free-practice").addEventListener("click", () => {
    reviewSessionType = "free";
    startReviewSession();
  });
  $("btn-free-next").addEventListener("click", () => handleGrade("good"));

  // 🔊 lire le mot avec son article : "der Hund"
  $("btn-answer-speak-word").addEventListener("click", () => {
    if (currentCard) speakGerman(fullWord(currentCard));
  });

  // 🔊 lire la phrase d'exemple : "Der Hund ist klein."
  $("btn-speak-sentence").addEventListener("click", () => {
    if (currentCard && currentCard.exampleDe) speakGerman(currentCard.exampleDe);
  });

  // Les 4 boutons Raté / Difficile / Bien / Facile
  document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.addEventListener("click", () => handleGrade(btn.dataset.grade));
  });

  document.addEventListener("keydown", onReviewShortcut);
}

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
}

function onReviewShortcut(event) {
  if (event.repeat || isTypingTarget(event.target)) return;
  if (isGrading || !$("page-revision").classList.contains("active") || !currentCard) return;
  if (currentReviewMode === "multiple" || currentReviewMode === "written") return;

  const answerHidden = $("review-answer").classList.contains("hidden");

  if (event.code === "Space" && answerHidden) {
    event.preventDefault();
    showAnswer();
    return;
  }

  if (answerHidden) return;

  const grades = {
    Digit1: "fail",
    Numpad1: "fail",
    Digit2: "hard",
    Numpad2: "hard",
    Digit3: "good",
    Numpad3: "good",
    Digit4: "easy",
    Numpad4: "easy",
  };

  const grade = grades[event.code];
  if (grade) {
    event.preventDefault();
    handleGrade(grade);
  }
}


/* =========================================================
   8. AJOUTER UNE CARTE
   ========================================================= */

function setupAddForm() {
  const form = $("add-card-form");
  const imageInput = $("f-image");

  // Aperçu de l'image choisie
  imageInput.addEventListener("change", async () => {
    const version = ++imageInputVersion;
    const file = imageInput.files[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl); // libère l'ancien aperçu
    pendingImageBlob = null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        imageInput.value = "";
        toast("Choisis un fichier image.");
        if (!editingCard) $("image-preview-wrap").classList.add("hidden");
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        toast("Image lourde : compression automatique en cours.");
      }

      try {
        pendingImageBlob = await compressImageFile(file);
      } catch (error) {
        console.warn("Compression image impossible, fichier original utilisé :", error);
        pendingImageBlob = file;
        toast("Compression impossible : image originale conservée.");
      }

      if (version !== imageInputVersion) return;

      previewUrl = URL.createObjectURL(pendingImageBlob);
      $("image-preview").src = previewUrl;
      $("image-preview-wrap").classList.remove("hidden");
      imageMarkedForRemoval = false;
    } else {
      if (editingCard) {
        $("image-preview").src = await getImageURL(editingCard.imageId);
      } else {
        $("image-preview-wrap").classList.add("hidden");
      }
    }
  });

  // Bouton "Supprimer l'image"
  $("btn-remove-image").addEventListener("click", () => {
    imageInputVersion++;
    imageInput.value = "";
    pendingImageBlob = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    if (editingCard) {
      imageMarkedForRemoval = true;
      $("image-preview").src = DEFAULT_IMAGE;
      $("image-preview-wrap").classList.remove("hidden");
    } else {
      $("image-preview-wrap").classList.add("hidden");
    }
  });

  $("btn-cancel-edit").addEventListener("click", resetCardForm);
  $("f-category").addEventListener("input", debounce(refreshSubcategorySuggestions, 150));
  $("btn-no-normal-plural").addEventListener("click", () => {
    $("f-plural").value = "kein Plural";
    $("f-plural").focus();
  });

  // Sauvegarde de la carte
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // empêche le rechargement de la page

    const formData = {
      article: $("f-article").value,
      de: $("f-de").value.trim(),
      plural: $("f-plural").value.trim(),
      fr: $("f-fr").value.trim(),
      exampleDe: $("f-example-de").value.trim(),
      exampleFr: $("f-example-fr").value.trim(),
      category: $("f-category").value.trim() || "Général",
      subcategory: $("f-subcategory").value.trim(),
      imageQuery: $("f-image-query").value.trim(),
    };

    const validation = validateCardForm(formData);
    if (!validation.ok) {
      toast(validation.tips[0]);
      return;
    }

    // 1) Si une image a été choisie, on la stocke d'abord dans IndexedDB.
    let imageId = editingCard ? editingCard.imageId : null;
    const previousImageId = editingCard ? editingCard.imageId : null;
    const file = imageInput.files[0];
    if (file || pendingImageBlob) {
      imageId = uniqueId("img");
      await saveImage(imageId, pendingImageBlob || file);
    } else if (editingCard && imageMarkedForRemoval) {
      imageId = null;
    }

    // 2) Puis on crée ou met à jour la carte, reliée à l'image par imageId.
    let card;
    if (editingCard) {
      card = {
        ...editingCard,
        ...formData,
        imageId: imageId,
        createdAt: editingCard.createdAt || todayISO(),
        updatedAt: todayISO(),
        srs: normalizeSrs(editingCard.srs),
      };
    } else {
      card = createNewCard({ ...formData, imageId: imageId });
    }

    await saveCard(card);

    if (previousImageId && previousImageId !== imageId) {
      await deleteImageIfUnused(previousImageId);
    }

    // 3) On remet le formulaire à zéro.
    const wasEditing = Boolean(editingCard);
    resetCardForm();

    toast(
      "Carte « " + fullWord(card) + " » " + (wasEditing ? "mise à jour" : "ajoutée") + " ✓" +
      (validation.tips.length ? " " + validation.tips[0] : "")
    );

    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
    refreshDashboard();
    renderLibraryIfVisible();
    renderLearningIfVisible();
    renderDeckDetailIfVisible();
    renderMissingImagesIfVisible();
  });
}

function resetCardForm() {
  $("add-card-form").reset();
  imageInputVersion++;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  editingCard = null;
  imageMarkedForRemoval = false;
  pendingImageBlob = null;

  $("form-title").textContent = "Ajouter une carte";
  $("form-help").innerHTML = "En allemand, on n'apprend jamais un nom seul&nbsp;: toujours <strong>l'article + le mot + le pluriel</strong>.";
  $("edit-mode-note").classList.add("hidden");
  $("btn-save-card").textContent = "💾 Sauvegarder la carte";
  $("btn-cancel-edit").classList.add("hidden");
  $("image-preview-wrap").classList.add("hidden");
}

function applyPendingFormCategory() {
  if (editingCard) {
    pendingFormCategory = null;
    pendingFormSubcategory = null;
    return;
  }
  if (pendingFormCategory) {
    $("f-category").value = pendingFormCategory;
    pendingFormCategory = null;
  }
  refreshSubcategorySuggestions();
  if (pendingFormSubcategory) {
    $("f-subcategory").value = pendingFormSubcategory;
    pendingFormSubcategory = null;
  }
}

async function startEditCard(cardId) {
  const card = await getCard(cardId);
  if (!card) {
    toast("Carte introuvable.");
    return;
  }

  editingCard = card;
  pendingFormCategory = null;
  pendingFormSubcategory = null;
  imageMarkedForRemoval = false;
  pendingImageBlob = null;
  imageInputVersion++;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  $("f-article").value = card.article || "";
  $("f-de").value = card.de || "";
  $("f-plural").value = card.plural || "";
  $("f-fr").value = card.fr || "";
  $("f-example-de").value = card.exampleDe || "";
  $("f-example-fr").value = card.exampleFr || "";
  $("f-category").value = card.category || "";
  $("f-subcategory").value = card.subcategory || "";
  $("f-image-query").value = card.imageQuery || "";
  $("f-image").value = "";

  $("form-title").textContent = "Modifier une carte";
  $("form-help").textContent = "Modifie les champs puis valide pour mettre à jour cette carte.";
  $("edit-mode-note").classList.remove("hidden");
  $("btn-save-card").textContent = "Mettre à jour la carte";
  $("btn-cancel-edit").classList.remove("hidden");

  $("image-preview").src = await getImageURL(card.imageId);
  $("image-preview-wrap").classList.remove("hidden");

  showPage("ajouter");
}

// Propose les catégories déjà existantes pendant la saisie
async function refreshCategorySuggestions() {
  const cards = await getAllCards();
  const categories = [...new Set([
    ...cards.map(cardDeckName),
    ...getCustomDecks().map((deck) => deck.name),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

  $("category-suggestions").innerHTML = categories
    .map((category) => '<option value="' + escapeHTML(category) + '"></option>')
    .join("");
}

async function refreshSubcategorySuggestions() {
  const cards = await getAllCards();
  const category = $("f-category").value.trim();
  const subcategories = [...new Set([
    ...cards
      .filter((card) => !category || cardDeckName(card) === category)
      .map((card) => card.subcategory)
      .filter(Boolean),
    ...getCustomSubcategories()
      .filter((item) => !category || item.category === category)
      .map((item) => item.name),
  ])].sort((a, b) => a.localeCompare(b, "fr"));

  $("subcategory-suggestions").innerHTML = subcategories
    .map((subcategory) => '<option value="' + escapeHTML(subcategory) + '"></option>')
    .join("");
}


/* =========================================================
   9. BIBLIOTHÈQUE
   ========================================================= */

async function renderLibrary() {
  const version = ++libraryRenderVersion;
  const allCards = await getAllCards();
  if (version !== libraryRenderVersion) return;

  updateCategoryFilter(allCards);
  updateLibrarySubcategoryFilter(allCards);

  // Filtres actifs
  const query = $("search-input").value.trim().toLowerCase();
  const category = $("filter-category").value;
  const subcategory = $("filter-subcategory").value;

  const visibleCards = allCards
    .filter((card) => {
      const matchesCategory = !category || cardDeckName(card) === category;
      const matchesSubcategory = !subcategory || (subcategory === "__none__" ? !card.subcategory : card.subcategory === subcategory);
      return matchesCardQuery(card, query) && matchesCategory && matchesSubcategory;
    })
    .sort((a, b) => b.id.localeCompare(a.id)); // plus récentes d'abord

  $("library-count").textContent =
    visibleCards.length + " carte(s) affichée(s) sur " + allCards.length;

  if (visibleCards.length === 0) {
    $("library-grid").innerHTML =
      '<p class="muted">Aucune carte ne correspond. Essaie une autre recherche, ou ajoute des cartes !</p>';
    return;
  }

  // On récupère toutes les URLs d'images d'un coup, puis on construit la grille
  const imageUrls = await Promise.all(visibleCards.map((card) => getImageURL(card.imageId)));
  if (version !== libraryRenderVersion) return;

  $("library-grid").innerHTML = visibleCards
    .map((card, index) => libraryItemHTML(card, imageUrls[index]))
    .join("");

  // Branche les boutons "supprimer" qui viennent d'être créés
  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete));
  });

  document.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.edit));
  });

  document.querySelectorAll("[data-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.favorite));
  });

  attachImageDropHandlers($("library-grid"));
}

function renderLibraryIfVisible() {
  if ($("page-bibliotheque").classList.contains("active")) renderLibrary();
}

function libraryItemHTML(card, imageUrl) {
  const today = todayISO();
  const nextReviewLabel =
    card.srs.nextReview <= today
      ? "À réviser aujourd'hui"
      : "Prochaine révision : " + formatDateFr(card.srs.nextReview);

  const pluralText = formatPlural(card);
  const pluralLine = pluralText
    ? '<p class="library-plural">Pluriel : ' + escapeHTML(pluralText) + "</p>"
    : "";
  const subcategoryLine = card.subcategory
    ? '<div class="library-subcategory">' + subcategoryChipHTML(card) + "</div>"
    : "";
  const imageQueryLine = imageQueryHTML(card);

  return (
    '<article class="library-item" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      cardImageHTML(card, imageUrl) +
      '<div class="library-body">' +
        '<p class="library-fr">' + escapeHTML(card.fr) + "</p>" +
        '<div class="library-word">' + wordHTML(card) + "</div>" +
        pluralLine +
        '<div class="library-category">' +
          '<span>Catégorie</span>' +
          '<strong>' + escapeHTML(cardDeckName(card)) + "</strong>" +
        "</div>" +
        subcategoryLine +
        imageQueryLine +
        '<p class="library-next">📅 ' + nextReviewLabel + "</p>" +
        '<p class="library-score">Réussites : ' + card.srs.correctCount + " · Erreurs : " + card.srs.wrongCount + "</p>" +
      "</div>" +
      '<div class="library-actions">' +
        '<button class="btn btn-icon" data-speak="' + escapeHTML(fullWord(card)) + '" title="Écouter">🔊</button>' +
        '<button class="btn btn-icon btn-favorite ' + (card.favorite ? "active" : "") + '" data-favorite="' + escapeHTML(card.id) + '" title="Favori">' + (card.favorite ? "♥" : "♡") + "</button>" +
        '<button class="btn btn-small btn-edit" data-edit="' + escapeHTML(card.id) + '">Modifier</button>' +
        '<button class="btn btn-icon btn-danger" data-delete="' + escapeHTML(card.id) + '" title="Supprimer">🗑️</button>' +
      "</div>" +
    "</article>"
  );
}

async function renderMissingImagesPage() {
  const allCards = await getAllCards();
  const missingCards = allCards
    .filter((card) => !card.imageId && !skippedMissingImageIds.has(card.id))
    .sort((a, b) => cardDeckName(a).localeCompare(cardDeckName(b), "fr") || fullWord(a).localeCompare(fullWord(b), "de"));

  $("missing-images-count").textContent =
    missingCards.length + " carte" + (missingCards.length > 1 ? "s" : "") + " sans image";
  $("missing-images-empty").classList.toggle("hidden", missingCards.length !== 0);
  $("missing-images-grid").innerHTML = missingCards.map(missingImageCardHTML).join("");
  const currentCard = getCurrentMissingImageCard(missingCards);
  lastImageTargetCardId = currentCard ? currentCard.id : null;
  const currentQuery = currentCard ? getEffectiveImageQuery(currentCard) : "";
  $("btn-open-current-image-search").disabled = !currentQuery;
  $("btn-open-current-image-search").dataset.imageSearchUrl = currentQuery ? imageSearchURL(currentQuery) : "";

  $("missing-images-grid").querySelectorAll("[data-missing-skip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      skippedMissingImageIds.add(btn.dataset.missingSkip);
      renderMissingImagesPage();
    });
  });
  attachImageDropHandlers($("missing-images-grid"));
  if (currentCard) {
    const currentEl = Array.from($("missing-images-grid").querySelectorAll("[data-image-target-card]"))
      .find((el) => el.dataset.imageTargetCard === currentCard.id);
    if (currentEl) setImageTarget(currentCard.id, currentEl);
  }
}

function renderMissingImagesIfVisible() {
  if ($("page-missing-images").classList.contains("active")) renderMissingImagesPage();
}

async function advanceMissingImageWorkflow() {
  const cards = await getAllCards();
  const missingCards = cards
    .filter((card) => !card.imageId && !skippedMissingImageIds.has(card.id))
    .sort((a, b) => cardDeckName(a).localeCompare(cardDeckName(b), "fr") || fullWord(a).localeCompare(fullWord(b), "de"));
  const nextCard = getCurrentMissingImageCard(missingCards);
  if (!nextCard) {
    lastImageTargetCardId = null;
    return;
  }

  lastImageTargetCardId = nextCard.id;
  const nextEl = Array.from($("missing-images-grid").querySelectorAll("[data-image-target-card]"))
    .find((el) => el.dataset.imageTargetCard === nextCard.id);
  if (nextEl) setImageTarget(nextCard.id, nextEl);
  openImageSearchForCard(nextCard);
}

function missingImageCardHTML(card) {
  const subcategory = card.subcategory
    ? '<span class="chip chip-subcategory chip-subcategory-compact">' + escapeHTML(card.subcategory) + "</span>"
    : "";
  return (
    '<article class="missing-image-card" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      '<div class="image-drop-zone">' +
        smartPlaceholderHTML(card) +
      "</div>" +
      '<div class="missing-image-body">' +
        '<p class="library-fr">' + escapeHTML(card.fr) + "</p>" +
        '<div class="library-word">' + wordHTML(card) + "</div>" +
        '<div class="missing-image-meta">' +
          '<span class="chip chip-category">' + escapeHTML(cardDeckName(card)) + "</span>" +
          subcategory +
        "</div>" +
        imageQueryHTML(card) +
      "</div>" +
      '<div class="missing-image-actions">' +
        '<button class="btn btn-ghost btn-small" type="button" data-missing-skip="' + escapeHTML(card.id) + '">Passer</button>' +
      "</div>" +
    "</article>"
  );
}

function openCurrentMissingImageSearch() {
  const url = $("btn-open-current-image-search").dataset.imageSearchUrl;
  if (!url) {
    toast("Aucune recherche image disponible.");
    return;
  }
  window.open(url, "dfs-images");
}

async function toggleFavorite(cardId) {
  const card = await getCard(cardId);
  if (!card) return;

  card.favorite = !card.favorite;
  card.updatedAt = todayISO();
  await saveCard(card);
  renderLibraryIfVisible();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();
  refreshDashboard();
}

async function handleDelete(cardId) {
  const card = await getCard(cardId);
  if (!card) return;

  const confirmed = confirm('Supprimer la carte « ' + fullWord(card) + ' » ?');
  if (!confirmed) return;

  await deleteCard(card.id);

  await deleteImageIfUnused(card.imageId);

  toast("Carte supprimée.");
  renderLibrary();
  refreshDashboard();
  refreshCategorySuggestions();
  refreshSubcategorySuggestions();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();
}

// Remplit le filtre des catégories sans perdre la sélection en cours
function updateCategoryFilter(cards) {
  const select = $("filter-category");
  const currentValue = select.value;
  const categories = [...new Set([
    ...cards.map(cardDeckName),
    ...getCustomDecks().map((deck) => deck.name),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

  select.innerHTML =
    '<option value="">Toutes les catégories</option>' +
    categories.map((c) => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + "</option>").join("");

  // On restaure le choix précédent s'il existe toujours
  if (categories.includes(currentValue)) select.value = currentValue;
}

function updateLibrarySubcategoryFilter(cards) {
  const select = $("filter-subcategory");
  const currentValue = select.value;
  const category = $("filter-category").value;
  const scopedCards = category ? cards.filter((card) => cardDeckName(card) === category) : cards;
  fillSubcategorySelect(select, scopedCards, currentValue, category);
}

function fillSubcategorySelect(select, cards, currentValue, category = "") {
  const subcategories = [...new Set([
    ...cards.map((card) => card.subcategory).filter(Boolean),
    ...getCustomSubcategories()
      .filter((item) => !category || item.category === category)
      .map((item) => item.name),
  ])]
    .sort((a, b) => a.localeCompare(b, "fr"));
  const hasEmpty = cards.some((card) => !card.subcategory);

  select.innerHTML =
    '<option value="">Toutes les sous-catégories</option>' +
    subcategories.map((subcategory) => '<option value="' + escapeHTML(subcategory) + '">' + escapeHTML(subcategory) + "</option>").join("") +
    (hasEmpty ? '<option value="__none__">Sans sous-catégorie</option>' : "");

  select.value = subcategories.includes(currentValue) || (currentValue === "__none__" && hasEmpty) ? currentValue : "";
}

function setupLibraryPage() {
  const debouncedRenderLibrary = debounce(renderLibrary, 150);
  $("search-input").addEventListener("input", debouncedRenderLibrary);
  $("filter-category").addEventListener("change", renderLibrary);
  $("filter-subcategory").addEventListener("change", renderLibrary);
  $("btn-open-missing-images").addEventListener("click", () => showPage("missing-images"));
  $("btn-missing-images-library").addEventListener("click", () => showPage("bibliotheque"));
  $("btn-open-current-image-search").addEventListener("click", openCurrentMissingImageSearch);
}


/* =========================================================
   10. APPRENTISSAGE
   ========================================================= */

async function renderLearningPage(resetIndex = false) {
  const version = ++learningRenderVersion;
  const allCards = await getAllCards();
  if (version !== learningRenderVersion) return;
  updateLearningCategoryFilter(allCards);
  updateLearningSubcategoryFilter(allCards);

  if (pendingLearningCategory) {
    $("learning-filter-category").value = pendingLearningCategory;
    $("learning-filter-subcategory").value = "";
    pendingLearningCategory = null;
    resetIndex = true;
    updateLearningSubcategoryFilter(allCards);
  }

  if (resetIndex) currentLearningIndex = 0;

  const query = $("learning-search").value.trim().toLowerCase();
  const category = $("learning-filter-category").value;
  const subcategory = $("learning-filter-subcategory").value;

  learningCards = allCards
    .filter((card) => {
      const matchesCategory = !category || cardDeckName(card) === category;
      const matchesSubcategory = !subcategory || (subcategory === "__none__" ? !card.subcategory : card.subcategory === subcategory);
      return matchesCardQuery(card, query) && matchesCategory && matchesSubcategory;
    })
    .sort((a, b) => fullWord(a).localeCompare(fullWord(b), "de"));

  if (currentLearningIndex >= learningCards.length) {
    currentLearningIndex = Math.max(0, learningCards.length - 1);
  }

  if (allCards.length === 0) {
    $("btn-learning-shuffle").disabled = true;
    showLearningEmpty("Ta bibliothèque est vide. Ajoute une première carte pour commencer.");
    return;
  }

  if (learningCards.length === 0) {
    $("btn-learning-shuffle").disabled = true;
    showLearningEmpty("Aucune carte ne correspond à ces filtres.");
    return;
  }

  $("learning-empty").classList.add("hidden");
  $("learning-area").classList.remove("hidden");
  $("btn-learning-shuffle").disabled = learningCards.length < 2;
  showLearningCard();
}

function renderLearningIfVisible() {
  if ($("page-apprentissage").classList.contains("active")) renderLearningPage();
}

function showLearningEmpty(message) {
  $("learning-area").classList.add("hidden");
  $("learning-empty").classList.remove("hidden");
  $("learning-empty-text").textContent = message;
}

async function showLearningCard() {
  const card = learningCards[currentLearningIndex];
  if (!card) return;

  $("learning-counter").textContent =
    "Carte " + (currentLearningIndex + 1) + " sur " + learningCards.length;
  $("learning-image").src = await getImageURL(card.imageId);

  const articleEl = $("learning-article");
  articleEl.textContent = card.article ? card.article + " " : "";
  articleEl.className = card.article ? "art-" + card.article : "";
  $("learning-word-text").textContent = card.de;

  const pluralText = formatPlural(card);
  if (pluralText) {
    $("learning-plural").textContent = "Pluriel : " + pluralText;
    $("learning-plural").classList.remove("hidden");
  } else {
    $("learning-plural").textContent = "";
    $("learning-plural").classList.add("hidden");
  }
  $("learning-fr").textContent = card.fr;

  const exampleBlock = $("learning-example-block");
  if (card.exampleDe || card.exampleFr) {
    exampleBlock.classList.remove("hidden");
    $("learning-example-de").textContent = card.exampleDe || "";
    $("learning-example-fr").textContent = card.exampleFr || "";
  } else {
    exampleBlock.classList.add("hidden");
  }

  $("learning-category").textContent = "Catégorie : " + cardDeckName(card);
  if (card.subcategory) {
    $("learning-subcategory").textContent = "Sous-catégorie : " + card.subcategory;
    $("learning-subcategory").classList.remove("hidden");
  } else {
    $("learning-subcategory").classList.add("hidden");
  }

  $("btn-learning-prev").disabled = currentLearningIndex === 0;
  $("btn-learning-next").disabled = currentLearningIndex >= learningCards.length - 1;
}

function updateLearningCategoryFilter(cards) {
  const select = $("learning-filter-category");
  const currentValue = select.value;
  const categories = [...new Set([
    ...cards.map(cardDeckName),
    ...getCustomDecks().map((deck) => deck.name),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

  select.innerHTML =
    '<option value="">Toutes les catégories</option>' +
    categories.map((c) => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + "</option>").join("");

  if (categories.includes(currentValue)) select.value = currentValue;
}

function updateLearningSubcategoryFilter(cards) {
  const select = $("learning-filter-subcategory");
  const currentValue = select.value;
  const category = $("learning-filter-category").value;
  const scopedCards = category ? cards.filter((card) => cardDeckName(card) === category) : cards;
  fillSubcategorySelect(select, scopedCards, currentValue, category);
}

function setupLearningPage() {
  const debouncedRenderLearning = debounce(() => renderLearningPage(true), 150);
  $("learning-search").addEventListener("input", debouncedRenderLearning);
  $("learning-filter-category").addEventListener("change", () => renderLearningPage(true));
  $("learning-filter-subcategory").addEventListener("change", () => renderLearningPage(true));
  $("btn-learning-shuffle").addEventListener("click", () => {
    if (learningCards.length < 2) return;
    shuffleArray(learningCards);
    currentLearningIndex = 0;
    showLearningCard();
  });

  $("btn-learning-prev").addEventListener("click", () => {
    if (currentLearningIndex > 0) {
      currentLearningIndex--;
      showLearningCard();
    }
  });

  $("btn-learning-next").addEventListener("click", () => {
    if (currentLearningIndex < learningCards.length - 1) {
      currentLearningIndex++;
      showLearningCard();
    }
  });

  $("btn-learning-speak-word").addEventListener("click", () => {
    const card = learningCards[currentLearningIndex];
    if (card) speakGerman(fullWord(card));
  });

  $("btn-learning-speak-sentence").addEventListener("click", () => {
    const card = learningCards[currentLearningIndex];
    if (card && card.exampleDe) speakGerman(card.exampleDe);
  });
}


/* =========================================================
   11. GRAMMAIRE — MINI QUIZ
   ========================================================= */

function renderQuiz() {
  $("quiz-container").innerHTML = QUIZ_QUESTIONS.map((question, index) => {
    const choicesHTML = question.choices
      .map((choice) =>
        '<button class="btn quiz-choice" data-q="' + index + '" data-choice="' + escapeHTML(choice) + '">' +
          escapeHTML(choice) +
        "</button>"
      )
      .join("");

    return (
      '<div class="quiz-question">' +
        '<p class="quiz-sentence">' + (index + 1) + ". " + escapeHTML(question.sentence) + "</p>" +
        '<div class="quiz-choices">' + choicesHTML + "</div>" +
        '<p class="quiz-feedback hidden"></p>' +
      "</div>"
    );
  }).join("");

  document.querySelectorAll(".quiz-choice").forEach((btn) => {
    btn.addEventListener("click", onQuizChoice);
  });
}

function onQuizChoice(event) {
  const clickedBtn = event.currentTarget;
  const question = QUIZ_QUESTIONS[Number(clickedBtn.dataset.q)];
  const questionBox = clickedBtn.closest(".quiz-question");
  const feedback = questionBox.querySelector(".quiz-feedback");

  // Correction immédiate : on désactive tous les choix
  // et on met la bonne réponse en vert
  questionBox.querySelectorAll(".quiz-choice").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.choice === question.answer) btn.classList.add("correct");
  });

  if (clickedBtn.dataset.choice === question.answer) {
    feedback.textContent = "✅ Bonne réponse ! " + question.explain;
    feedback.classList.add("ok");
  } else {
    clickedBtn.classList.add("wrong");
    feedback.textContent = "❌ Raté. " + question.explain;
    feedback.classList.add("ko");
  }
  feedback.classList.remove("hidden");
}

function setupGrammarPage() {
  renderQuiz();
  $("btn-restart-quiz").addEventListener("click", renderQuiz);
}


/* =========================================================
   12. SAUVEGARDE — EXPORT / IMPORT
   ========================================================= */

async function refreshBackupInfo() {
  const cards = await getAllCards();
  const images = await getAllImages();
  const reviews = await getAllReviews();
  $("backup-info").textContent =
    "Actuellement : " + cards.length + " carte(s), " + images.length + " image(s) et " + reviews.length + " révision(s) dans ta base locale.";

  const lastExport = localStorage.getItem(LS_LAST_EXPORT_AT);
  if (!lastExport) {
    $("last-export-note").textContent = "Aucun export récent détecté.";
    $("last-export-note").classList.add("warning");
    return;
  }

  const daysSinceExport = Math.floor((new Date(todayISO() + "T00:00:00") - new Date(lastExport + "T00:00:00")) / 86400000);
  $("last-export-note").textContent = "Dernier export : " + formatDateFr(lastExport) +
    (daysSinceExport > 7 ? " · Pense à exporter tes données." : "");
  $("last-export-note").classList.toggle("warning", daysSinceExport > 7);
}

function refreshBackupInfoIfVisible() {
  if ($("page-sauvegarde").classList.contains("active")) refreshBackupInfo();
}

async function exportData() {
  const cards = await getAllCards();
  const images = await getAllImages();
  const reviews = await getAllReviews();

  // Les images sont des Blobs dans IndexedDB : on les convertit en base64
  // pour pouvoir les mettre dans un fichier JSON.
  const exportedImages = [];
  for (const image of images) {
    exportedImages.push({ id: image.id, data: await blobToBase64(image.blob) });
  }

  const payload = {
    app: "Deutsch Flash Studio",
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: cards,          // la progression SRS est incluse dans chaque carte
    reviews: reviews,
    images: exportedImages,
    customDecks: getCustomDecks(),
    customSubcategories: getCustomSubcategories(),
  };

  // Création et téléchargement du fichier JSON
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "deutsch-flash-studio-" + todayISO() + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  localStorage.setItem(LS_LAST_EXPORT_AT, todayISO());
  refreshBackupInfoIfVisible();

  toast("Export téléchargé ✓");
}

async function readImportFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.cards)) {
    throw new Error("Format de fichier invalide");
  }

  return {
    version: data.version || "",
    exportedAt: data.exportedAt || "",
    cards: data.cards,
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    images: Array.isArray(data.images) ? data.images : [],
    customDecks: Array.isArray(data.customDecks) ? data.customDecks : [],
    customSubcategories: Array.isArray(data.customSubcategories) ? data.customSubcategories : [],
  };
}

function importCardKey(card) {
  return [
    String(card.article || "").trim().toLowerCase(),
    String(card.de || "").trim().toLowerCase(),
    String(card.fr || "").trim().toLowerCase(),
    String(card.category || "Général").trim().toLowerCase(),
  ].join("|");
}

async function analyzeImportData(data) {
  const localCards = await getAllCards();
  const localIds = new Set(localCards.map((card) => card.id));
  const localKeys = new Set(localCards.map(importCardKey));
  const warnings = [];
  let existingCardsCount = 0;
  let missingIdCount = 0;
  let missingCategoryCount = 0;
  let missingImageQueryCount = 0;

  const categories = new Set();
  data.cards.forEach((rawCard) => {
    const card = normalizeCard(rawCard || {});
    categories.add(cardDeckName(card));
    if (!rawCard?.id) missingIdCount++;
    if (!rawCard?.category) missingCategoryCount++;
    if (!rawCard?.imageQuery) missingImageQueryCount++;
    if ((rawCard?.id && localIds.has(rawCard.id)) || localKeys.has(importCardKey(card))) {
      existingCardsCount++;
    }
  });

  if (data.cards.length === 0) warnings.push("Ce fichier ne contient aucune carte.");
  if (!data.exportedAt) warnings.push("Ce fichier ne contient pas de date d'export.");
  if (missingIdCount) warnings.push("Certaines cartes n'ont pas d'id.");
  if (missingCategoryCount) warnings.push("Certaines cartes n'ont pas de category.");
  if (missingImageQueryCount) warnings.push("Certaines cartes n'ont pas de imageQuery.");
  if (data.images.length) warnings.push("Le fichier contient des images intégrées.");
  if (data.reviews.length) warnings.push("Ce fichier contient un historique de révisions.");

  const categoriesList = [...categories].sort((a, b) => a.localeCompare(b, "fr"));
  return {
    exportedAt: data.exportedAt,
    version: data.version,
    totalCardsInFile: data.cards.length,
    totalReviewsInFile: data.reviews.length,
    totalImagesInFile: data.images.length,
    totalDecksInFile: data.customDecks.length,
    totalSubcategoriesInFile: data.customSubcategories.length,
    newCardsCount: Math.max(0, data.cards.length - existingCardsCount),
    existingCardsCount: existingCardsCount,
    categoriesCount: categoriesList.length,
    categoriesList: categoriesList,
    warnings: warnings,
  };
}

async function importData(file, mode = "merge", options = {}) {
  try {
    const data = options.data || await readImportFile(file);

    if (mode === "replace") {
      if (!options.skipConfirm) {
        const firstConfirm = confirm(
          "Tu vas remplacer toutes tes cartes, images et progression par le contenu du fichier JSON. Continuer ?"
        );
        if (!firstConfirm) return;

        const secondConfirm = confirm(
          "Dernière confirmation : les données actuelles seront supprimées avant l'import. Confirmer ?"
        );
        if (!secondConfirm) return;
      }
      await clearStore("cards");
      await clearStore("images");
      await clearStore("reviews");
      clearImageUrlCache();
      mergeCustomDecks(Array.isArray(data.customDecks) ? data.customDecks : [], true);
      mergeCustomSubcategories(Array.isArray(data.customSubcategories) ? data.customSubcategories : [], true);
      if (editingCard) resetCardForm();
    } else if (Array.isArray(data.customDecks)) {
      mergeCustomDecks(data.customDecks, false);
    }
    if (mode !== "replace" && Array.isArray(data.customSubcategories)) {
      mergeCustomSubcategories(data.customSubcategories, false);
    }

    const existingReviewIds = new Set((mode === "replace" ? [] : await getAllReviews()).map((review) => review.id));
    let reviewCount = 0;
    if (Array.isArray(data.reviews)) {
      for (const review of data.reviews) {
        if (!review) continue;
        const normalizedReview = normalizeReview(review);
        if (existingReviewIds.has(normalizedReview.id)) continue;
        await saveReview(normalizedReview);
        existingReviewIds.add(normalizedReview.id);
        reviewCount++;
      }
    }

    // --- Cartes ---
    let cardCount = 0;
    for (const card of data.cards) {
      if (!card || !card.id || !card.de) continue; // on ignore les entrées cassées
      await saveCard(normalizeCard(card));
      cardCount++;
    }

    // --- Images (base64 -> Blob) ---
    let imageCount = 0;
    if (Array.isArray(data.images)) {
      for (const image of data.images) {
        if (!image || !image.id || !image.data) continue;
        try {
          await saveImage(image.id, base64ToBlob(image.data));
          imageCount++;
        } catch (error) {
          console.warn("Image ignorée pendant l'import :", image.id, error);
        }
      }
    }

    // Les images ont pu changer : on vide le cache d'URLs
    clearImageUrlCache();

    const label = mode === "replace" ? "Restauration complète" : "Import en fusion";
    toast(label + " réussi : " + cardCount + " carte(s), " + imageCount + " image(s), " + reviewCount + " révision(s) ✓");
    refreshBackupInfo();
    refreshDashboard();
    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
    renderLibraryIfVisible();
    renderLearningIfVisible();
    renderDeckDetailIfVisible();
    renderMissingImagesIfVisible();
    if ($("page-revision").classList.contains("active")) {
      startReviewSession();
    }
  } catch (error) {
    console.error("Erreur d'import :", error);
    toast("Fichier invalide : impossible d'importer ces données.");
  }
}

async function previewImportFile(file) {
  try {
    pendingImportFile = file;
    pendingImportData = await readImportFile(file);
    pendingImportAnalysis = await analyzeImportData(pendingImportData);
    replaceImportArmed = false;
    renderImportPreviewModal();
    $("import-preview-modal").classList.remove("hidden");
  } catch (error) {
    console.error("Prévisualisation import impossible :", error);
    closeImportPreviewModal();
    toast("Fichier invalide : impossible de prévisualiser cet import.");
  }
}

function importPreviewStatHTML(label, value) {
  return '<div class="import-preview-stat"><span>' + escapeHTML(label) + '</span><strong>' + escapeHTML(value) + "</strong></div>";
}

function renderImportPreviewModal() {
  const analysis = pendingImportAnalysis;
  if (!analysis) return;

  $("import-preview-summary").textContent =
    "Ce fichier contient " + analysis.totalCardsInFile + " carte" + (analysis.totalCardsInFile > 1 ? "s" : "") + ".";
  $("import-preview-stats").innerHTML =
    importPreviewStatHTML("Exporté le", analysis.exportedAt ? formatImportDate(analysis.exportedAt) : "Date inconnue") +
    importPreviewStatHTML("Version", analysis.version || "inconnue") +
    importPreviewStatHTML("Cartes", analysis.totalCardsInFile) +
    importPreviewStatHTML("Révisions", analysis.totalReviewsInFile) +
    importPreviewStatHTML("Images", analysis.totalImagesInFile) +
    importPreviewStatHTML("Jeux personnalisés", analysis.totalDecksInFile) +
    importPreviewStatHTML("Sous-catégories", analysis.totalSubcategoriesInFile) +
    importPreviewStatHTML("Nouvelles cartes", analysis.newCardsCount) +
    importPreviewStatHTML("Cartes déjà existantes", analysis.existingCardsCount);
  $("import-preview-categories").textContent = analysis.categoriesList.length
    ? analysis.categoriesList.join(", ")
    : "Aucune catégorie détectée.";

  $("import-preview-warnings").classList.toggle("hidden", analysis.warnings.length === 0);
  $("import-preview-warnings").innerHTML = analysis.warnings.length
    ? "<strong>Points à vérifier</strong><ul>" + analysis.warnings.map((warning) => "<li>" + escapeHTML(warning) + "</li>").join("") + "</ul>"
    : "";

  $("import-replace-warning").classList.add("hidden");
  $("btn-import-preview-replace").textContent = "Tout remplacer";
}

function formatImportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("fr-FR");
}

function closeImportPreviewModal() {
  $("import-preview-modal").classList.add("hidden");
  pendingImportFile = null;
  pendingImportData = null;
  pendingImportAnalysis = null;
  replaceImportArmed = false;
  $("import-file").value = "";
  $("import-replace-warning").classList.add("hidden");
  $("btn-import-preview-replace").textContent = "Tout remplacer";
}

async function confirmImportPreview(mode) {
  if (!pendingImportFile || !pendingImportData) {
    toast("Aucun fichier d'import prêt.");
    return;
  }

  if (mode === "replace" && !replaceImportArmed) {
    replaceImportArmed = true;
    $("import-replace-warning").classList.remove("hidden");
    $("btn-import-preview-replace").textContent = "Confirmer le remplacement";
    return;
  }

  const file = pendingImportFile;
  const data = pendingImportData;
  closeImportPreviewModal();
  await importData(file, mode, { data: data, skipConfirm: true });
}

function refreshAfterDangerAction() {
  refreshBackupInfo();
  refreshDashboard();
  refreshCategorySuggestions();
  refreshSubcategorySuggestions();
  renderLibraryIfVisible();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();

  if ($("page-revision").classList.contains("active")) {
    startReviewSession();
  }
}

async function resetAllSrsProgress() {
  const firstConfirm = confirm(
    "Tu vas réinitialiser toute ta progression SRS. Les cartes et images seront conservées. Continuer ?"
  );
  if (!firstConfirm) return;

  const secondConfirm = confirm(
    "Dernière confirmation : cette action remettra toutes les cartes à zéro. Confirmer ?"
  );
  if (!secondConfirm) return;

  const cards = await getAllCards();
  for (const card of cards) {
    card.srs = {
      box: 1,
      nextReview: todayISO(),
      correctCount: 0,
      wrongCount: 0,
    };
    card.updatedAt = todayISO();
    await saveCard(card);
  }

  toast("Progression SRS réinitialisée pour " + cards.length + " carte(s).");
  refreshAfterDangerAction();
}

async function deleteAllCardsAndImages() {
  const firstConfirm = confirm(
    "Tu vas supprimer toutes les cartes et toutes les images. Cette action est irréversible sans export. Continuer ?"
  );
  if (!firstConfirm) return;

  const secondConfirm = confirm(
    "Dernière confirmation : toutes les données de vocabulaire vont être supprimées. Confirmer ?"
  );
  if (!secondConfirm) return;

  await clearStore("cards");
  await clearStore("images");
  await clearStore("reviews");

  clearImageUrlCache();
  if (editingCard) resetCardForm();

  toast("Toutes les cartes et images ont été supprimées.");
  refreshAfterDangerAction();
}

async function deleteEverything() {
  const firstConfirm = confirm(
    "Tu vas TOUT supprimer : les jeux, les sous-catégories, les cartes, les images et l'historique de révisions. Cette action est irréversible sans export. Continuer ?"
  );
  if (!firstConfirm) return;

  const secondConfirm = confirm(
    "Dernière confirmation : l'application reviendra complètement à zéro. Confirmer ?"
  );
  if (!secondConfirm) return;

  // Données IndexedDB
  await clearStore("cards");
  await clearStore("images");
  await clearStore("reviews");

  // Structures stockées dans localStorage (jeux + sous-catégories personnalisés)
  localStorage.removeItem(LS_DECKS);
  localStorage.removeItem(LS_SUBCATEGORIES);

  clearImageUrlCache();
  selectedDeckNames.clear();
  deckGridSelectionMode = false;
  if (editingCard) resetCardForm();

  toast("Tous les jeux, cartes, images et sous-catégories ont été supprimés.");
  refreshAfterDangerAction();
}

function setupBackupPage() {
  $("btn-export").addEventListener("click", exportData);
  $("btn-delete-everything").addEventListener("click", deleteEverything);
  $("btn-export-before-reset").addEventListener("click", exportData);
  $("btn-reset-srs").addEventListener("click", resetAllSrsProgress);
  $("btn-delete-all-data").addEventListener("click", deleteAllCardsAndImages);
  $("btn-toggle-danger-zone").addEventListener("click", () => {
    const hidden = $("danger-zone-content").classList.toggle("hidden");
    $("btn-toggle-danger-zone").textContent = hidden ? "Afficher la Danger Zone" : "Masquer la Danger Zone";
  });

  $("btn-import-json").addEventListener("click", () => {
    $("import-file").click();
  });

  $("import-file").addEventListener("change", async () => {
    const file = $("import-file").files[0];
    if (file) await previewImportFile(file);
  });

  $("btn-import-preview-merge").addEventListener("click", () => confirmImportPreview("merge"));
  $("btn-import-preview-replace").addEventListener("click", () => confirmImportPreview("replace"));
  $("btn-import-preview-cancel").addEventListener("click", closeImportPreviewModal);
}


/* =========================================================
   13. DÉMARRAGE DE L'APPLICATION
   ========================================================= */

async function startApp() {
  await initDB();       // 1. Ouvre la base de données
  requestPersistentStorage();
  await seedIfEmpty();  // 2. Ajoute les cartes d'exemple au premier lancement

  // 3. Branche tous les boutons et formulaires
  setupNavigation();
  setupLearningPage();
  setupReviewPage();
  setupAddForm();
  setupLibraryPage();
  setupGrammarPage();
  setupBackupPage();
  warmUpVoices();

  // 4. Rouvre le dernier onglet visité (ou le dashboard)
  const lastPage = localStorage.getItem(LS_LAST_PAGE) || "dashboard";
  showPage(lastPage);
}

// On attend que le HTML soit chargé avant de démarrer
document.addEventListener("DOMContentLoaded", startApp);
