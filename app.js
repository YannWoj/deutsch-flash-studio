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

// Clés utilisées dans localStorage (uniquement pour de petits réglages)
const LS_SEEDED = "dfs_seeded";      // "les cartes d'exemple ont déjà été créées"
const LS_DECKS = "dfs_custom_decks";
const LS_PACKS = "dfs_packs";
const LS_SUBCATEGORIES = "dfs_custom_subcategories";
const LS_LAST_EXPORT_AT = "dfs_last_export_at";
const LS_LIBRARY_VIEW = "dfs_library_view";
const LS_LIBRARY_FILTERS_OPEN = "dfs_library_filters_open";
const LS_DECK_DETAIL_FILTERS_OPEN = "dfs_deck_detail_filters_open";
const LS_GRAMMAR_TAB = "dfs_grammar_tab";
const LS_REVIEW_MODE = "dfs_review_mode";
const LS_LEARNING_FILTER = "dfs_learning_filter";
const LS_PACK_CATEGORY_MIGRATION_V1 = "dfs_separate_packs_categories_v1";
const LS_VERB_SUBCATEGORY_MIGRATION_V1 = "dfs_verb_subcategories_v1";
const LS_PREPOSITION_CASE_MIGRATION_V1 = "dfs_preposition_cases_v1";
const OBSOLETE_LOCAL_STORAGE_KEYS = ["dfs_max_new_cards", "dfs_lastPage"];
const FAVORITES_SCOPE = "__favorites__";
const PACK_SCOPE_PREFIX = "pack:";
const PACK_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#fb923c"];
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GOVERNED_CASES = ["Nominatif", "Accusatif", "Datif", "Génitif", "Accusatif/Datif"];
const PREPOSITION_CASES = {
  aus: "Datif",
  bei: "Datif",
  mit: "Datif",
  nach: "Datif",
  seit: "Datif",
  von: "Datif",
  zu: "Datif",
  durch: "Accusatif",
  "für": "Accusatif",
  gegen: "Accusatif",
  ohne: "Accusatif",
  um: "Accusatif",
  in: "Accusatif/Datif",
  an: "Accusatif/Datif",
  auf: "Accusatif/Datif",
  "über": "Accusatif/Datif",
  unter: "Accusatif/Datif",
  vor: "Accusatif/Datif",
  hinter: "Accusatif/Datif",
  neben: "Accusatif/Datif",
  zwischen: "Accusatif/Datif",
};
const DATIVE_VERBS = Object.fromEntries(
  ((typeof GRAMMAR_CASES !== "undefined" && Array.isArray(GRAMMAR_CASES.dativeVerbs))
    ? GRAMMAR_CASES.dativeVerbs
    : ["helfen", "danken", "gefallen", "gehören", "antworten", "folgen", "gratulieren", "schmecken", "passen", "gelingen", "fehlen", "vertrauen", "glauben", "widersprechen", "zuhören"])
    .map((verb) => [normalizedGermanWord(verb), "Datif"])
);
const VERB_CATEGORY_NAME = "Verbes";
const STANDARD_VERB_SUBCATEGORIES = ["Verbes modaux", "Verbes irréguliers", "Verbes à particule", "Verbes réguliers"];
const MODAL_VERBS = new Set(["können", "müssen", "wollen", "sollen", "dürfen", "mögen", "möchten"]);
const SEPARABLE_PREFIXES = ["zurück", "weiter", "statt", "fern", "teil", "nach", "weg", "her", "hin", "los", "auf", "aus", "ein", "mit", "vor", "ab", "an", "zu", "um"];
const COMMON_BASE_VERBS = new Set([
  "arbeiten", "bauen", "bleiben", "bringen", "denken", "fahren", "fallen", "fangen", "finden", "führen",
  "geben", "gehen", "halten", "heben", "helfen", "holen", "hören", "kaufen", "kennen", "kleben",
  "kommen", "laden", "lassen", "laufen", "legen", "lesen", "machen", "nehmen", "passen", "räumen",
  "rufen", "sagen", "schauen", "schlafen", "schreiben", "sehen", "sein", "setzen", "sitzen", "sprechen",
  "steigen", "stellen", "suchen", "tragen", "treten", "trinken", "ziehen"
]);
const INVALID_IMPORTED_CATEGORY_RE = /^vocabulaire\s+\d+$/i;
const REAL_CATEGORIES = ["Maison", "Animaux", "Aliments", "Informatique", "Cuisine", "Transport", "Objets", "Nature", "Vêtements", "Expressions", "Abstrait"];
const VOCABULARY_CATEGORY_BY_WORD = new Map([
  ...["Haus", "Zimmer", "Tür", "Fenster", "Tisch", "Stuhl", "Bett", "Küche", "Badezimmer", "Kühlschrank", "Schrank", "Spiegel", "Lampe", "Treppe", "Boden", "Decke", "Wand", "Garten", "Balkon", "Ventilator", "Waschmaschine"].map((word) => [word.toLowerCase().normalize("NFC"), "Maison"]),
  ...["Auto", "Straße", "Bahnhof", "Aufzug"].map((word) => [word.toLowerCase().normalize("NFC"), "Transport"]),
  ...["Schlüssel", "Buch", "Uhr", "Tasche", "Handy", "Geld", "Feuerzeug", "Brille", "Flasche", "Koffer", "Rucksack", "Regenschirm", "Zeitung", "Brief", "Stift"].map((word) => [word.toLowerCase().normalize("NFC"), "Objets"]),
  ...["Wasser", "Brot", "Fleisch", "Käse", "Kaffee"].map((word) => [word.toLowerCase().normalize("NFC"), "Aliments"]),
  ...["Baum", "Blume"].map((word) => [word.toLowerCase().normalize("NFC"), "Nature"]),
  ...["Hund", "Katze", "Vogel", "Fisch"].map((word) => [word.toLowerCase().normalize("NFC"), "Animaux"]),
  ...["Computer", "Maus", "Tastatur", "Bildschirm"].map((word) => [word.toLowerCase().normalize("NFC"), "Informatique"]),
  ...["Glas", "Teller", "Löffel", "Gabel", "Messer", "Ofen"].map((word) => [word.toLowerCase().normalize("NFC"), "Cuisine"]),
  ["jacke", "Vêtements"],
  ["endlich", "Expressions"],
  ["traum", "Abstrait"],
]);

const COMMON_REGULAR_VERBS = [
  { inf: "machen", fr: "faire" },
  { inf: "lernen", fr: "apprendre" },
  { inf: "wohnen", fr: "habiter" },
  { inf: "arbeiten", fr: "travailler" },
  { inf: "spielen", fr: "jouer" },
  { inf: "kaufen", fr: "acheter" },
  { inf: "fragen", fr: "demander" },
  { inf: "sagen", fr: "dire" },
  { inf: "hören", fr: "entendre, écouter" },
  { inf: "brauchen", fr: "avoir besoin de" },
  { inf: "suchen", fr: "chercher" },
  { inf: "zeigen", fr: "montrer" },
  { inf: "leben", fr: "vivre" },
  { inf: "lieben", fr: "aimer" },
  { inf: "kochen", fr: "cuisiner" },
  { inf: "tanzen", fr: "danser" },
  { inf: "reisen", fr: "voyager" },
  { inf: "warten", fr: "attendre" },
  { inf: "öffnen", fr: "ouvrir" },
  { inf: "glauben", fr: "croire" },
  { inf: "kosten", fr: "coûter" },
  { inf: "zahlen", fr: "payer" },
  { inf: "bezahlen", fr: "payer" },
  { inf: "besuchen", fr: "rendre visite, visiter" },
  { inf: "antworten", fr: "répondre" },
  { inf: "studieren", fr: "étudier" },
  { inf: "telefonieren", fr: "téléphoner" },
  { inf: "fotografieren", fr: "photographier" },
  { inf: "reservieren", fr: "réserver" },
  { inf: "buchstabieren", fr: "épeler" },
  { inf: "erklären", fr: "expliquer" },
  { inf: "erzählen", fr: "raconter" },
  { inf: "wiederholen", fr: "répéter" },
  { inf: "üben", fr: "s'exercer" },
  { inf: "putzen", fr: "nettoyer" },
  { inf: "holen", fr: "aller chercher" },
  { inf: "legen", fr: "poser, mettre à plat" },
  { inf: "stellen", fr: "poser, mettre debout" },
  { inf: "mieten", fr: "louer" },
  { inf: "feiern", fr: "fêter" },
  { inf: "dauern", fr: "durer" },
  { inf: "rechnen", fr: "calculer" },
  { inf: "zeichnen", fr: "dessiner" },
  { inf: "aufräumen", fr: "ranger" },
  { inf: "einkaufen", fr: "faire les courses" },
  { inf: "mitmachen", fr: "participer" },
  { inf: "zumachen", fr: "fermer" },
  { inf: "aufmachen", fr: "ouvrir" },
  { inf: "weiterlernen", fr: "continuer à apprendre" },
];

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

// Variables globales de l'application
let db = null;                       // connexion IndexedDB
const imageUrlCache = new Map();     // imageId -> URL d'affichage (évite de recréer les URLs)
let reviewQueue = [];                // cartes restantes dans la séance de révision
let currentCard = null;              // carte affichée en ce moment
let reviewHistory = [];              // cartes deja vues dans la session courante
let previewUrl = null;               // URL de l'aperçu d'image dans le formulaire
let reviewSessionStats = null;
let toastTimer = null;               // pour la notification
let editingCard = null;              // carte en cours de modification, ou null en mode ajout
let imageMarkedForRemoval = false;   // indique que l'image actuelle doit être retirée en édition
let learningCards = [];              // cartes visibles dans le mode Apprentissage
let currentLearningIndex = 0;         // index de la carte affichée en Apprentissage
let learningOnlyNew = true;
let pendingLearningCategory = null;   // null = tout, string = un deck, array = plusieurs decks, "__favorites__" = favoris
let currentLearningScope = null;      // null = tout, string = un deck, array = plusieurs decks, "__favorites__" = favoris
let currentReviewCategory = null;     // null = révision globale, string = un deck, array = plusieurs decks, "__favorites__" = favoris
let currentReviewMode = localStorage.getItem(LS_REVIEW_MODE) || "classic";
if (!["classic", "written"].includes(currentReviewMode)) {
  currentReviewMode = "classic";
  localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
}
let difficultReviewFallbackAllOnce = false;
let reviewSessionType = "due";        // "due" = cartes difficiles, "free" = entraînement libre
let pendingStudyScope = null;         // null = toutes les cartes, string = un deck, array = plusieurs decks, "__favorites__" = favoris
let pendingSessionType = "due";
let reviewReturnPage = "dashboard";
let skipHubOnce = false;
let currentDeckDetailCategory = null;
let currentDeckDetailPackId = null;
let deckDetailSearch = "";
let deckDetailSubcategoryFilter = "";
let deckDetailLevelFilter = "";
let deckDetailRenderVersion = 0;
let deckDetailSelectionMode = false;
let selectedDeckCardIds = new Set();
let visibleDeckDetailCardIds = [];
let librarySelectionMode = false;
let selectedLibraryCardIds = new Set();
let visibleLibraryCardIds = [];
let packModalMode = "create";
let packModalPackId = null;
let selectedPackColor = PACK_COLORS[0];
let pendingAddToPackCardIds = [];
let pendingPackCreateAddIds = [];
let pendingPackImportFile = null;
let pendingPackImportData = null;
let pendingPackImportAnalysis = null;
let pendingFormCategory = null;
let pendingFormSubcategory = null;
let verbSubcategoryAutofillValue = "";
let governedCaseAutofillValue = "";
let pendingSubcategoryCardId = null;
let pendingSubcategoryCardIds = [];
let pendingDifficultCardId = null;
let difficultManageCards = [];
let deckGridSelectionMode = false;    // mode sélection multiple sur le dashboard
let selectedDeckNames = new Set();    // noms des jeux sélectionnés sur le dashboard
let visibleDeckNames = [];            // jeux actuellement affichés sur le dashboard
let deckCardCounts = new Map();
let deckModalMode = "create";
let deckModalOriginalName = "";
let pendingImageBlob = null;          // image compressée prête à être stockée
let isGrading = false;                // verrou anti double-clic en révision
let libraryRenderVersion = 0;         // évite qu'un ancien rendu écrase un rendu récent
let learningRenderVersion = 0;
let libraryOnlyFavorites = false;
let libraryOnlyNoImage = false;
let libraryOnlyDue = false;
let libraryFiltersOpen = localStorage.getItem(LS_LIBRARY_FILTERS_OPEN) === "1";
let deckDetailFiltersOpen = localStorage.getItem(LS_DECK_DETAIL_FILTERS_OPEN) === "1";
let selectedGrammarVerb = null;
let grammarVerbQuery = "";
let grammarVerbFilter = "all";
let grammarVerbSort = "alpha";
let grammarVerbSearchTimer = null;
let selectedGrammarLevel = "A1";
let pendingImportFile = null;
let pendingImportData = null;
let pendingImportAnalysis = null;
let replaceImportArmed = false;
let imageInputVersion = 0;
let lastImageTargetCardId = null;
let imagePickerTargetCardId = null;
let skippedMissingImageIds = new Set();
let longPressFiredAt = 0;             // timestamp du dernier long-press déclenché
let currentCardDetailId = null;
let cardDetailDirty = false;
let cardDetailTouchStartY = null;
let bodyScrollLockCount = 0;
let visibleModalCount = 0;
let modalScrollLockObserver = null;
let viewportReflowTimer = null;


/* =========================================================
   2. PETITS UTILITAIRES
   ========================================================= */

// Raccourci pratique : $("mon-id") au lieu de document.getElementById("mon-id")
function $(id) {
  return document.getElementById(id);
}

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
  }
  bodyScrollLockCount++;
}

function unlockBodyScroll() {
  if (bodyScrollLockCount === 0) return;
  bodyScrollLockCount--;
  if (bodyScrollLockCount > 0) return;

  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
}

function countVisibleModals() {
  return document.querySelectorAll(".modal-backdrop:not(.hidden):not(.no-scroll-lock)").length;
}

function syncModalScrollLock() {
  const nextVisibleCount = countVisibleModals();
  while (visibleModalCount < nextVisibleCount) {
    lockBodyScroll();
    visibleModalCount++;
  }
  while (visibleModalCount > nextVisibleCount) {
    unlockBodyScroll();
    visibleModalCount--;
  }
}

function showModal(id) {
  $(id).classList.remove("hidden");
  syncModalScrollLock();
}

function hideModal(id) {
  $(id).classList.add("hidden");
  syncModalScrollLock();
}

function setupModalScrollLock() {
  if (modalScrollLockObserver) modalScrollLockObserver.disconnect();
  modalScrollLockObserver = new MutationObserver(syncModalScrollLock);
  document.querySelectorAll(".modal-backdrop").forEach((modal) => {
    modalScrollLockObserver.observe(modal, { attributes: true, attributeFilter: ["class"] });
  });
  syncModalScrollLock();
}

function resetModalScrollLockState() {
  bodyScrollLockCount = 0;
  visibleModalCount = 0;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function forceMobileViewportReflow(resetScroll = false) {
  if (resetScroll) window.scrollTo(0, 0);
  const sidebar = document.querySelector(".sidebar");
  document.body.classList.add("viewport-reflowing");
  void (sidebar ? sidebar.offsetHeight : document.body.offsetHeight);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void (sidebar ? sidebar.offsetHeight : document.body.offsetHeight);
      document.body.classList.remove("viewport-reflowing");
    });
  });
}

function scheduleMobileViewportReflow(resetScroll = false) {
  clearTimeout(viewportReflowTimer);
  viewportReflowTimer = setTimeout(() => forceMobileViewportReflow(resetScroll), 100);
}

function setupMobileViewportReflow() {
  window.addEventListener("resize", () => scheduleMobileViewportReflow(), { passive: true });
  window.addEventListener("orientationchange", () => scheduleMobileViewportReflow(true), { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => scheduleMobileViewportReflow(), { passive: true });
  }
}

function wasLongPressJustFired() {
  return Date.now() - longPressFiredAt < 400;
}

function syncSelectionModeClass() {
  document.body.classList.toggle(
    "selection-mode-active",
    deckGridSelectionMode || deckDetailSelectionMode || librarySelectionMode
  );
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest('button, input, select, textarea, a, label, [role="button"]'));
}

function attachLongPress(element, callback, options = {}) {
  const delay = options.delay || 450;
  const moveTolerance = options.moveTolerance || 8;
  let timer = null;
  let startX = 0;
  let startY = 0;

  function clearPress() {
    clearTimeout(timer);
    timer = null;
    element.classList.remove("pressing");
  }

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    startX = event.clientX;
    startY = event.clientY;
    element.classList.add("pressing");

    timer = setTimeout(() => {
      timer = null;
      longPressFiredAt = Date.now();
      element.classList.remove("pressing");
      if (window.getSelection) window.getSelection().removeAllRanges();
      if (navigator.vibrate) navigator.vibrate(10);
      callback();
    }, delay);
  });

  element.addEventListener("pointermove", (event) => {
    if (!timer) return;
    if (
      Math.abs(event.clientX - startX) > moveTolerance ||
      Math.abs(event.clientY - startY) > moveTolerance
    ) {
      clearPress();
    }
  });

  element.addEventListener("pointerup", clearPress);
  element.addEventListener("pointercancel", clearPress);
  element.addEventListener("pointerleave", clearPress);

  element.addEventListener("contextmenu", (event) => {
    if (Date.now() - longPressFiredAt < 600) event.preventDefault();
  });
}

// Date du jour au format "2026-07-05" (en heure locale, pas UTC)
function todayISO() {
  return dateToISO(new Date());
}

function isNewCard(card) {
  const srs = normalizeSrs(card.srs);
  return srs.correctCount === 0 && srs.wrongCount === 0;
}

function cardDeckName(card) {
  return card.category || "Général";
}

function isPackScope(scope) {
  return typeof scope === "string" && scope.startsWith(PACK_SCOPE_PREFIX);
}

function packIdFromScope(scope) {
  return isPackScope(scope) ? scope.slice(PACK_SCOPE_PREFIX.length) : null;
}

function normalizeScope(scope) {
  if (scope === FAVORITES_SCOPE) return FAVORITES_SCOPE;
  if (isPackScope(scope)) return scope;
  if (Array.isArray(scope)) {
    const clean = scope
      .map((name) => String(name || "").trim())
      .filter((name) => name && name !== FAVORITES_SCOPE && !isPackScope(name));
    return clean.length ? [...new Set(clean)] : null;
  }
  const name = String(scope || "").trim();
  if (name === FAVORITES_SCOPE) return FAVORITES_SCOPE;
  return name ? name : null;
}

function cardInScope(card, scope) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return true;
  if (normalizedScope === FAVORITES_SCOPE) return card.favorite === true;
  if (isPackScope(normalizedScope)) {
    const packId = packIdFromScope(normalizedScope);
    return getPackById(packId)?.cardIds.includes(String(card.id)) ?? false;
  }
  const deckName = cardDeckName(card);
  if (Array.isArray(normalizedScope)) return normalizedScope.includes(deckName);
  return deckName === normalizedScope;
}

function scopeHasDeck(scope, deckName) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return false;
  if (normalizedScope === FAVORITES_SCOPE) return false;
  if (Array.isArray(normalizedScope)) return normalizedScope.includes(deckName);
  return normalizedScope === deckName;
}

function removeDeckFromScope(scope, deckName) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return null;
  if (normalizedScope === FAVORITES_SCOPE) return FAVORITES_SCOPE;
  if (Array.isArray(normalizedScope)) {
    const next = normalizedScope.filter((name) => name !== deckName);
    return next.length ? next : null;
  }
  return normalizedScope === deckName ? null : normalizedScope;
}

function renameDeckInScope(scope, oldName, newName) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return null;
  if (normalizedScope === FAVORITES_SCOPE) return FAVORITES_SCOPE;
  if (Array.isArray(normalizedScope)) {
    return normalizeScope(normalizedScope.map((name) => name === oldName ? newName : name));
  }
  return normalizedScope === oldName ? newName : normalizedScope;
}

function scopeLabel(scope) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return "toutes les catégories";
  if (normalizedScope === FAVORITES_SCOPE) return "mes favoris";
  if (isPackScope(normalizedScope)) return getPackById(packIdFromScope(normalizedScope))?.name || "pack supprimé";
  if (Array.isArray(normalizedScope)) return normalizedScope.join(" + ");
  return normalizedScope;
}

function isMultiScope(scope) {
  return Array.isArray(normalizeScope(scope));
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
    cardLevel(card).toLowerCase().includes(query) ||
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
  return "https://www.google.com/search" + "?tbm=isch&tbs=ic:trans&q=" + encoded;
}

function openImageSearchForCard(card) {
  const query = getEffectiveImageQuery(card);
  if (!query) return;
  window.open(imageSearchURL(query), "dfs-images");
}

function imageQueryHTML(card, includeAction = true) {
  const manualQuery = String(card.imageQuery || "").trim();
  const query = getEffectiveImageQuery(card);
  if (!query) return "";
  const searchButton = includeAction && !card.imageId
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

function cardLevel(card) {
  const level = String(card?.level || "").trim().toUpperCase();
  return CEFR_LEVELS.includes(level) ? level : "";
}

function levelBadgeHTML(card) {
  const level = cardLevel(card);
  return level ? '<span class="chip chip-level">' + escapeHTML(level) + "</span>" : "";
}

function cardGovernedCase(card) {
  const governedCase = String(card?.governedCase || "").trim();
  return GOVERNED_CASES.includes(governedCase) ? governedCase : "";
}

function governedCaseBadgeHTML(card) {
  const governedCase = cardGovernedCase(card);
  if (!governedCase) return "";
  const label = governedCase === "Accusatif/Datif" ? "Acc. / Dat." : governedCase;
  return '<span class="chip chip-case ' + governedCaseBadgeClass(governedCase) + '">' + escapeHTML(label) + "</span>";
}

function governedCaseBadgeClass(governedCase) {
  return {
    "Nominatif": "chip-case-nominatif",
    "Accusatif": "chip-case-accusatif",
    "Datif": "chip-case-datif",
    "Génitif": "chip-case-genitif",
    "Accusatif/Datif": "chip-case-mixed",
  }[governedCase] || "";
}

function levelAndCaseBadgesHTML(card) {
  return levelBadgeHTML(card) + governedCaseBadgeHTML(card);
}

function normalizedGermanWord(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/^sich\s+/, "")
    .replace(/\s+/g, "");
}

function normalizedCaseContext(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function prepositionGovernedCase(value) {
  return PREPOSITION_CASES[normalizedGermanWord(value)] || "";
}

function dativeVerbGovernedCase(value) {
  return DATIVE_VERBS[normalizedGermanWord(value)] || "";
}

function isGrammarPrepositionContext(category, subcategory) {
  return normalizedCaseContext(category) === "grammaire" &&
    normalizedCaseContext(subcategory) === "prepositions";
}

function suggestedGovernedCaseForCardData(data) {
  if (String(data?.category || "").trim().toLowerCase() === VERB_CATEGORY_NAME.toLowerCase()) {
    return dativeVerbGovernedCase(data?.de);
  }
  return prepositionGovernedCase(data?.de);
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

function isValidDateTime(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function normalizeDifficult(difficult) {
  const dueAt = isValidDateTime(difficult?.dueAt) ? new Date(difficult.dueAt).toISOString() : null;
  const markedAt = isValidDateTime(difficult?.markedAt) ? new Date(difficult.markedAt).toISOString() : null;
  return {
    active: Boolean(difficult?.active && dueAt),
    dueAt: dueAt,
    markedAt: markedAt,
  };
}

function nowISODateTime() {
  return new Date().toISOString();
}

function cardDifficult(card) {
  return normalizeDifficult(card?.difficult);
}

function isDifficultActive(card) {
  return cardDifficult(card).active;
}

function isDifficultDue(card, now = new Date()) {
  const difficult = cardDifficult(card);
  return difficult.active && difficult.dueAt && new Date(difficult.dueAt) <= now;
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
    level: cardLevel(card),
    governedCase: cardGovernedCase(card),
    category: String(card.category || "Général").trim() || "Général",
    subcategory: String(card.subcategory || "").trim(),
    difficult: normalizeDifficult(card.difficult),
    favorite: Boolean(card.favorite),
    imageId: card.imageId || null,
    imageQuery: String(card.imageQuery || "").trim(),
    createdAt: createdAt,
    updatedAt: card.updatedAt || createdAt,
    srs: normalizeSrs(card.srs),
  };
}

function cardMatchKey(card) {
  return (String(card.article || "").trim() + "|" + String(card.de || "").trim())
    .toLowerCase()
    .normalize("NFC");
}

function wordCategoryKey(cardOrWord) {
  const word = typeof cardOrWord === "string" ? cardOrWord : cardOrWord?.de;
  return String(word || "").trim().toLowerCase().normalize("NFC");
}

function isInvalidPackCategory(category, packName = "") {
  const clean = String(category || "").trim();
  if (!clean) return true;
  if (INVALID_IMPORTED_CATEGORY_RE.test(clean)) return true;
  return Boolean(packName) && clean.toLowerCase() === String(packName).trim().toLowerCase();
}

function isCategoryNamedLikeExistingPack(category) {
  const key = String(category || "").trim().toLowerCase();
  return Boolean(key) && getPacks().some((pack) => pack.name.toLowerCase() === key);
}

function isPreferredDeckCategory(category) {
  return !isInvalidPackCategory(category) && !isCategoryNamedLikeExistingPack(category);
}

function inferredRealCategory(card) {
  return VOCABULARY_CATEGORY_BY_WORD.get(wordCategoryKey(card)) || "";
}

function resolveImportedCardCategory(card, packName) {
  const current = String(card.category || "").trim();
  if (!isInvalidPackCategory(current, packName)) return current;
  return inferredRealCategory(card);
}

function getAllKnownCategories(cards = []) {
  const names = new Set(REAL_CATEGORIES);
  cards.forEach((card) => {
    const category = cardDeckName(card);
    if (isPreferredDeckCategory(category)) names.add(category);
  });
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
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

function normalizePack(pack) {
  const data = pack || {};
  const createdAt = data.createdAt || todayISO();
  return {
    id: data.id || uniqueId("pack"),
    name: String(data.name || "").trim(),
    color: PACK_COLORS.includes(data.color) ? data.color : PACK_COLORS[0],
    cardIds: Array.isArray(data.cardIds) ? [...new Set(data.cardIds.map(String))] : [],
    createdAt: createdAt,
    updatedAt: data.updatedAt || createdAt,
  };
}

function getPacks() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PACKS) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.map(normalizePack).filter((pack) => {
      if (!pack.name || seen.has(pack.id)) return false;
      seen.add(pack.id);
      return true;
    });
  } catch (error) {
    console.warn("Packs illisibles :", error);
    return [];
  }
}

function savePacks(packs) {
  localStorage.setItem(LS_PACKS, JSON.stringify(packs.map(normalizePack).filter((pack) => pack.name)));
}

function getPackById(packId) {
  return getPacks().find((pack) => pack.id === packId) || null;
}

function getUniquePackName(baseName) {
  const clean = String(baseName || "").trim() || "Pack importé";
  const existingNames = new Set(getPacks().map((pack) => pack.name.toLowerCase()));
  if (!existingNames.has(clean.toLowerCase())) return clean;
  let index = 2;
  while (existingNames.has((clean + " (" + index + ")").toLowerCase())) index++;
  return clean + " (" + index + ")";
}

function createPack(name, color) {
  const packs = getPacks();
  const clean = String(name || "").trim();
  if (!clean) return null;
  if (packs.some((pack) => pack.name.toLowerCase() === clean.toLowerCase())) return null;
  const pack = normalizePack({ name: clean, color: color });
  packs.push(pack);
  savePacks(packs);
  return pack;
}

function renamePack(packId, newName) {
  const packs = getPacks();
  const pack = packs.find((item) => item.id === packId);
  const clean = String(newName || "").trim();
  if (!pack || !clean) return null;
  if (packs.some((item) => item.id !== packId && item.name.toLowerCase() === clean.toLowerCase())) return null;
  pack.name = clean;
  pack.updatedAt = todayISO();
  savePacks(packs);
  return pack;
}

function deletePack(packId) {
  const packs = getPacks();
  const next = packs.filter((pack) => pack.id !== packId);
  if (next.length === packs.length) return false;
  savePacks(next);
  return true;
}

function addCardsToPack(packId, cardIds) {
  const packs = getPacks();
  const pack = packs.find((item) => item.id === packId);
  const ids = Array.isArray(cardIds) ? cardIds : [];
  if (!pack) return 0;
  const before = pack.cardIds.length;
  pack.cardIds = [...new Set([...pack.cardIds, ...ids.map(String)])];
  pack.updatedAt = todayISO();
  savePacks(packs);
  return pack.cardIds.length - before;
}

function removeCardsFromPack(packId, cardIds) {
  const packs = getPacks();
  const pack = packs.find((item) => item.id === packId);
  const ids = new Set((Array.isArray(cardIds) ? cardIds : []).map(String));
  if (!pack || ids.size === 0) return 0;
  const before = pack.cardIds.length;
  pack.cardIds = pack.cardIds.filter((id) => !ids.has(id));
  if (pack.cardIds.length !== before) {
    pack.updatedAt = todayISO();
    savePacks(packs);
  }
  return before - pack.cardIds.length;
}

function packCards(pack, allCards) {
  const byId = new Map(allCards.map((card) => [String(card.id), card]));
  return pack.cardIds.map((id) => byId.get(id)).filter(Boolean);
}

function removeCardFromAllPacks(cardId) {
  const packs = getPacks();
  let changed = false;
  packs.forEach((pack) => {
    const next = pack.cardIds.filter((id) => id !== String(cardId));
    if (next.length !== pack.cardIds.length) {
      pack.cardIds = next;
      pack.updatedAt = todayISO();
      changed = true;
    }
  });
  if (changed) savePacks(packs);
}

function purgePackCardIds(allCards) {
  const existingIds = new Set(allCards.map((card) => String(card.id)));
  const packs = getPacks();
  let changed = false;
  packs.forEach((pack) => {
    const next = pack.cardIds.filter((id) => existingIds.has(id));
    if (next.length !== pack.cardIds.length) {
      pack.cardIds = next;
      pack.updatedAt = todayISO();
      changed = true;
    }
  });
  if (changed) savePacks(packs);
}

function mergePacks(importedPacks, replace = false) {
  if (!Array.isArray(importedPacks)) return;
  if (replace) {
    savePacks(importedPacks);
    return;
  }

  const packs = getPacks();
  importedPacks.map(normalizePack).forEach((pack) => {
    if (!pack.name) return;
    let index = packs.findIndex((item) => item.id === pack.id);
    if (index < 0) {
      index = packs.findIndex((item) => item.name.toLowerCase() === pack.name.toLowerCase());
    }
    if (index >= 0) {
      packs[index] = {
        ...packs[index],
        ...pack,
        id: packs[index].id,
        cardIds: [...new Set([...packs[index].cardIds, ...pack.cardIds])],
        updatedAt: todayISO(),
      };
    } else {
      packs.push(pack);
    }
  });
  savePacks(packs);
}

function srsProgressScore(card) {
  const srs = normalizeSrs(card.srs);
  return (srs.box * 1000000) + (srs.correctCount * 1000) - srs.wrongCount;
}

function betterSrs(a, b) {
  return srsProgressScore({ srs: a }) >= srsProgressScore({ srs: b }) ? normalizeSrs(a) : normalizeSrs(b);
}

function duplicatePrimaryScore(card) {
  return (
    (isPreferredDeckCategory(card.category) ? 100000000 : 0) +
    srsProgressScore(card) +
    (card.imageId ? 10000 : 0) +
    (card.favorite ? 5000 : 0) +
    ["fr", "plural", "exampleDe", "exampleFr", "subcategory", "imageQuery"].reduce((score, field) => score + (card[field] ? 100 : 0), 0)
  );
}

function mergeDuplicateCardData(primary, duplicate) {
  const merged = { ...primary };
  ["fr", "plural", "exampleDe", "exampleFr", "level", "subcategory", "imageQuery"].forEach((field) => {
    if (!merged[field] && duplicate[field]) merged[field] = duplicate[field];
  });
  if (!isPreferredDeckCategory(merged.category) && isPreferredDeckCategory(duplicate.category)) {
    merged.category = duplicate.category;
  }
  if (!merged.imageId && duplicate.imageId) merged.imageId = duplicate.imageId;
  merged.favorite = Boolean(merged.favorite || duplicate.favorite);
  const primaryDifficult = cardDifficult(merged);
  const duplicateDifficult = cardDifficult(duplicate);
  if (
    duplicateDifficult.active &&
    (!primaryDifficult.active || String(duplicateDifficult.dueAt || "").localeCompare(String(primaryDifficult.dueAt || "")) < 0)
  ) {
    merged.difficult = duplicateDifficult;
  }
  merged.srs = betterSrs(merged.srs, duplicate.srs);
  merged.createdAt = [merged.createdAt, duplicate.createdAt].filter(Boolean).sort()[0] || todayISO();
  merged.updatedAt = todayISO();
  return normalizeCard(merged);
}

function replacePackCardReferences(replacementMap) {
  if (!replacementMap.size) return;
  const packs = getPacks();
  let changed = false;
  packs.forEach((pack) => {
    const next = [];
    pack.cardIds.forEach((id) => {
      const replacement = replacementMap.get(String(id)) || String(id);
      if (!next.includes(replacement)) next.push(replacement);
      if (replacement !== String(id)) changed = true;
    });
    if (next.length !== pack.cardIds.length) changed = true;
    pack.cardIds = next;
    if (changed) pack.updatedAt = todayISO();
  });
  if (changed) savePacks(packs);
}

async function replaceReviewCardReferences(replacementMap, cardById) {
  if (!replacementMap.size && !cardById.size) return;
  const reviews = await getAllReviews();
  for (const review of reviews) {
    const nextCardId = replacementMap.get(String(review.cardId)) || String(review.cardId);
    const card = cardById.get(nextCardId);
    if (nextCardId !== review.cardId || (card && review.category !== cardDeckName(card))) {
      await saveReview({
        ...review,
        cardId: nextCardId,
        category: card ? cardDeckName(card) : review.category,
        subcategory: card ? cardSubcategoryName(card) : review.subcategory,
      });
    }
  }
}

async function mergeDuplicateCardsByMatchKey(cards = null) {
  const allCards = cards || await getAllCards();
  const groups = new Map();
  allCards.forEach((card) => {
    const key = cardMatchKey(card);
    if (!key || key === "|") return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  });

  const replacementMap = new Map();
  const mergedCardsById = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => duplicatePrimaryScore(b) - duplicatePrimaryScore(a));
    let primary = sorted[0];
    for (const duplicate of sorted.slice(1)) {
      primary = mergeDuplicateCardData(primary, duplicate);
      replacementMap.set(String(duplicate.id), String(primary.id));
    }
    await saveCard(primary);
    mergedCardsById.set(String(primary.id), primary);
  }

  if (!replacementMap.size) return { merged: 0, removed: 0 };
  replacePackCardReferences(replacementMap);
  await replaceReviewCardReferences(replacementMap, mergedCardsById);
  for (const oldId of replacementMap.keys()) {
    await deleteCard(oldId);
  }
  purgePackCardIds(await getAllCards());
  return { merged: new Set(replacementMap.values()).size, removed: replacementMap.size };
}

async function repairPackCategorySeparationData() {
  const cards = await getAllCards();
  let changed = false;
  const migratedById = new Map();

  for (const card of cards) {
    if (isPreferredDeckCategory(card.category)) continue;
    const category = inferredRealCategory(card);
    if (!category) continue;
    card.category = category;
    card.updatedAt = todayISO();
    await saveCard(card);
    migratedById.set(String(card.id), card);
    changed = true;
  }

  const dedupeResult = await mergeDuplicateCardsByMatchKey(await getAllCards());
  if (migratedById.size) {
    await replaceReviewCardReferences(new Map(), migratedById);
  }
  const customDecks = getCustomDecks();
  const cleanedDecks = customDecks.filter((deck) => isPreferredDeckCategory(deck.name));
  if (cleanedDecks.length !== customDecks.length) saveCustomDecks(cleanedDecks);
  purgePackCardIds(await getAllCards());
  if (changed || dedupeResult.removed > 0) {
    console.info("Réparation catégories/packs terminée :", { categoriesFixed: migratedById.size, duplicatesRemoved: dedupeResult.removed });
  }
  return { categoriesFixed: migratedById.size, duplicatesRemoved: dedupeResult.removed };
}

async function runPackCategorySeparationMigration() {
  if (localStorage.getItem(LS_PACK_CATEGORY_MIGRATION_V1) === "done") return;
  await repairPackCategorySeparationData();
  localStorage.setItem(LS_PACK_CATEGORY_MIGRATION_V1, "done");
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

function irregularVerbSet() {
  return new Set((Array.isArray(IRREGULAR_VERBS) ? IRREGULAR_VERBS : [])
    .map((verb) => normalizedGermanWord(verb.inf))
    .filter(Boolean));
}

function splitSeparableVerb(infinitive) {
  const inf = normalizedGermanWord(infinitive);
  if (!inf) return null;
  const knownBases = new Set([...COMMON_BASE_VERBS, ...irregularVerbSet()]);

  for (const prefix of SEPARABLE_PREFIXES) {
    if (!inf.startsWith(prefix)) continue;
    const base = inf.slice(prefix.length);
    if (base.length < 4) continue;
    if (!/(en|n)$/.test(base)) continue;
    if (knownBases.has(base)) return { prefix: prefix, base: base };
  }

  return null;
}

function classifyVerb(infinitive) {
  const inf = normalizedGermanWord(infinitive);
  if (!inf) return "";
  if (MODAL_VERBS.has(inf)) return "Verbes modaux";
  if (splitSeparableVerb(inf)) return "Verbes à particule";
  if (irregularVerbSet().has(inf)) return "Verbes irréguliers";
  return "Verbes réguliers";
}

async function runVerbSubcategoryMigration() {
  if (localStorage.getItem(LS_VERB_SUBCATEGORY_MIGRATION_V1) === "done") return;

  const cards = await getAllCards();
  let changed = false;

  for (const card of cards) {
    if (cardDeckName(card) !== VERB_CATEGORY_NAME) continue;
    const subcategory = classifyVerb(card.de);
    if (!subcategory) continue;
    if (card.subcategory !== subcategory) {
      card.subcategory = subcategory;
      card.updatedAt = todayISO();
      await saveCard(card);
      changed = true;
    }
  }

  STANDARD_VERB_SUBCATEGORIES.forEach((name) => upsertCustomSubcategory(VERB_CATEGORY_NAME, name));

  const remainingCards = await getAllCards();
  const usedVerbSubcategories = new Set(
    remainingCards
      .filter((card) => cardDeckName(card) === VERB_CATEGORY_NAME)
      .map((card) => card.subcategory)
      .filter(Boolean)
  );
  const customSubcategories = getCustomSubcategories().filter((item) => {
    if (item.category.toLowerCase() !== VERB_CATEGORY_NAME.toLowerCase()) return true;
    return STANDARD_VERB_SUBCATEGORIES.includes(item.name) || usedVerbSubcategories.has(item.name);
  });
  saveCustomSubcategories(customSubcategories);

  localStorage.setItem(LS_VERB_SUBCATEGORY_MIGRATION_V1, "done");
  if (changed) console.info("Migration sous-catégories Verbes terminée.");
}

async function runGovernedCaseMigration() {
  const migrationState = localStorage.getItem(LS_PREPOSITION_CASE_MIGRATION_V1);
  if (migrationState === "governed-cases-v2") return 0;

  const cards = await getAllCards();
  let migratedCount = 0;
  const shouldMigratePrepositions = migrationState !== "done";

  for (const card of cards) {
    if (cardGovernedCase(card)) continue;
    const category = cardDeckName(card);
    let governedCase = "";
    if (shouldMigratePrepositions && isGrammarPrepositionContext(category, card.subcategory)) {
      governedCase = prepositionGovernedCase(card.de);
    } else if (category.toLowerCase() === VERB_CATEGORY_NAME.toLowerCase()) {
      governedCase = dativeVerbGovernedCase(card.de);
    }
    if (!governedCase) continue;
    await saveCard(normalizeCard({
      ...card,
      governedCase: governedCase,
      updatedAt: todayISO(),
    }));
    migratedCount++;
  }

  localStorage.setItem(LS_PREPOSITION_CASE_MIGRATION_V1, "governed-cases-v2");
  console.info("Migration cas gouvernés terminée :", migratedCount);
  return migratedCount;
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
    ? '<span class="art-' + card.article + ' word-article">' + escapeHTML(card.article) + "</span>"
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
    level: cardLevel(data),
    governedCase: cardGovernedCase(data),
    category: data.category || "Général",
    subcategory: data.subcategory || "",
    difficult: normalizeDifficult(data.difficult),
    imageId: data.imageId || null,
    imageQuery: data.imageQuery || "",
    createdAt: todayISO(),
    updatedAt: todayISO(),
    srs: {
      box: 1,
      nextReview: todayISO(),
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
function deleteCard(id)   {
  return dbAction("cards", "readwrite", (store) => store.delete(id))
    .then((result) => {
      removeCardFromAllPacks(id);
      return result;
    });
}
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

function difficultCards(cards, options = {}) {
  const now = options.now || new Date();
  const onlyDue = Boolean(options.onlyDue);
  return cards
    .filter((card) => isDifficultActive(card))
    .filter((card) => !onlyDue || isDifficultDue(card, now))
    .sort((a, b) => {
      const dueDiff = String(cardDifficult(a).dueAt || "").localeCompare(String(cardDifficult(b).dueAt || ""));
      if (dueDiff) return dueDiff;
      return fullWord(a).localeCompare(fullWord(b), "de");
    });
}

function difficultStats(cards) {
  const active = difficultCards(cards);
  const due = difficultCards(cards, { onlyDue: true });
  return { active: active, due: due, activeCount: active.length, dueCount: due.length };
}

function difficultEmptyHintHTML() {
  return 'Aucune pour le moment. Marque une carte avec l\'icône <svg class="hard-cards-inline-icon" focusable="false" aria-hidden="true"><use href="#icon-flame"></use></svg> pour la retrouver ici.';
}

function setDifficultReviewButtonState(btn, state) {
  btn.classList.toggle("btn-primary", state === "due");
  btn.classList.toggle("btn-ghost", state !== "due");
  btn.textContent = state === "waiting" ? "Revoir quand même" : "Revoir";
  btn.disabled = state === "empty";
}

function renderDifficultSummary(stats, options) {
  const badge = $(options.badgeId);
  const info = $(options.infoId);
  const actions = $(options.actionsId);
  const reviewBtn = $(options.reviewBtnId);
  const manageBtn = $(options.manageBtnId);
  const empty = $(options.emptyId);
  const list = options.listId ? $(options.listId) : null;

  if (list) {
    list.classList.add("hidden");
    list.innerHTML = "";
  }

  badge.classList.remove("is-due");
  info.classList.add("hidden");
  info.textContent = "";
  empty.classList.add("hidden");
  empty.innerHTML = "";

  if (stats.activeCount === 0) {
    badge.classList.add("hidden");
    badge.textContent = "";
    actions.classList.add("hidden");
    setDifficultReviewButtonState(reviewBtn, "empty");
    empty.innerHTML = difficultEmptyHintHTML();
    empty.classList.remove("hidden");
    return;
  }

  actions.classList.remove("hidden");
  manageBtn.classList.remove("hidden");
  badge.classList.remove("hidden");

  if (stats.dueCount === 0) {
    const nextCard = stats.active[0];
    const nextDue = nextCard ? formatDifficultDue(cardDifficult(nextCard).dueAt) : "bientôt";
    badge.textContent = stats.activeCount + "\u00a0en attente";
    info.textContent = "Prochaine à revoir : " + nextDue;
    info.classList.remove("hidden");
    setDifficultReviewButtonState(reviewBtn, "waiting");
    return;
  }

  badge.textContent = stats.dueCount + "\u00a0à revoir";
  badge.classList.add("is-due");
  setDifficultReviewButtonState(reviewBtn, "due");
}

function localDateTimeValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return date.getFullYear() + "-" +
    pad(date.getMonth() + 1) + "-" +
    pad(date.getDate()) + "T" +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes());
}

function dateFromDelayKey(key) {
  const date = new Date();
  if (key === "10m") date.setMinutes(date.getMinutes() + 10);
  else if (key === "1h") date.setHours(date.getHours() + 1);
  else if (key === "3h") date.setHours(date.getHours() + 3);
  else if (key === "evening") {
    date.setHours(20, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);
  } else if (key === "tomorrow") {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  } else if (key === "3d") date.setDate(date.getDate() + 3);
  else if (key === "1w") date.setDate(date.getDate() + 7);
  else return null;
  return date;
}

function formatDifficultDue(dueAt) {
  if (!dueAt) return "non programmée";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "date invalide";
  const now = new Date();
  const diffMs = due - now;
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  const time = due.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (diffMs <= -60000) return "en retard";
  if (diffMs <= 60000) return "maintenant";
  if (minutes < 60) return "dans " + minutes + " min";
  if (minutes < 24 * 60) return "dans " + Math.round(minutes / 60) + " h";

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) return "demain " + time;
  return due.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " " + time;
}

function setCardDifficult(card, dueAt) {
  card.difficult = {
    active: true,
    dueAt: new Date(dueAt).toISOString(),
    markedAt: cardDifficult(card).markedAt || nowISODateTime(),
  };
  card.updatedAt = todayISO();
}

function clearCardDifficult(card) {
  card.difficult = { active: false, dueAt: null, markedAt: null };
  card.updatedAt = todayISO();
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

function openImagePickerForCard(cardId) {
  imagePickerTargetCardId = cardId;
  const input = $("card-image-picker");
  input.value = "";
  input.click();
}

function setupImagePicker() {
  $("card-image-picker").addEventListener("change", async () => {
    const file = $("card-image-picker").files[0];
    const cardId = imagePickerTargetCardId;
    $("card-image-picker").value = "";
    imagePickerTargetCardId = null;
    if (file && cardId) await applyImageToCard(cardId, file);
  });
}

async function pasteImageFromClipboardForCard(cardId) {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    toast("Le collage n'est pas supporté sur ce navigateur.");
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((candidate) => candidate.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      const file = new File([blob], "collage.png", { type });
      await applyImageToCard(cardId, file);
      return;
    }
    toast("Aucune image dans le presse-papiers.");
  } catch (error) {
    console.warn("Collage impossible :", error);
    toast("Autorise l'accès au presse-papiers, ou utilise « Choisir une image ».");
  }
}

function attachImageActionHandlers(container) {
  container.querySelectorAll("[data-pick-image]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      openImagePickerForCard(btn.dataset.pickImage);
    });
  });
  container.querySelectorAll("[data-paste-image]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      pasteImageFromClipboardForCard(btn.dataset.pasteImage);
    });
  });
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
      if (isInteractiveTarget(event.target)) return;
      setImageTarget(cardId, el);
      if (event.target.closest(".smart-placeholder")) openImagePickerForCard(cardId);
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
  const placeholderText = card.article
    ? '<span class="art-' + escapeHTML(card.article) + '">' + escapeHTML(card.article) + "</span> " + escapeHTML(card.de || card.fr || "Image")
    : escapeHTML(card.de || card.fr || "Image");

  return (
    '<div class="smart-placeholder" aria-label="Image manquante">' +
      '<span class="smart-placeholder-emoji">' + deckPlaceholderMark(card) + "</span>" +
      '<span class="smart-placeholder-text">' + placeholderText + "</span>" +
      '<span class="paste-hint">Touche pour choisir une image</span>' +
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

const PAGES = ["dashboard", "packs", "favoris", "deck-detail", "apprentissage", "revision", "ajouter", "bibliotheque", "missing-images", "grammaire", "sauvegarde"];

function currentPageName() {
  const active = document.querySelector(".page.active");
  return active?.id?.replace(/^page-/, "") || "dashboard";
}

function showPage(name) {
  if (!PAGES.includes(name)) name = "dashboard";
  hideDeckActionMenu();
  if (name !== "revision") setReviewSessionActive(false);
  if (name !== "bibliotheque" && librarySelectionMode) {
    librarySelectionMode = false;
    selectedLibraryCardIds.clear();
    syncSelectionModeClass();
  }
  if (name !== "deck-detail" && deckDetailSelectionMode) {
    deckDetailSelectionMode = false;
    selectedDeckCardIds.clear();
    syncSelectionModeClass();
  }

  // Affiche la bonne section, cache les autres
  PAGES.forEach((page) => {
    $("page-" + page).classList.toggle("active", page === name);
  });

  // Met en surbrillance le bon bouton de navigation
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === name);
  });
  const moreBtn = $("btn-nav-more");
  if (moreBtn) {
    moreBtn.classList.toggle("active", ["revision", "bibliotheque", "grammaire", "sauvegarde", "missing-images"].includes(name));
  }

  // Rafraîchit le contenu de la page qu'on vient d'ouvrir
  if (name === "dashboard")    refreshDashboard();
  if (name === "packs")        renderPacksPage();
  if (name === "favoris")      renderFavoritesPage();
  if (name === "deck-detail")  renderDeckDetail();
  if (name === "apprentissage") renderLearningPage(true);
  if (name === "revision") {
    if (skipHubOnce) {
      skipHubOnce = false;
      $("review-hub").classList.add("hidden");
      startReviewSession();
    } else {
      showReviewHub();
    }
  }
  if (name === "bibliotheque") renderLibrary();
  if (name === "missing-images") renderMissingImagesPage();
  if (name === "grammaire")    renderGrammarPage();
  if (name === "ajouter") {
    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
    applyPendingFormCategory();
  }
  if (name === "sauvegarde")   refreshBackupInfo();

  window.scrollTo({ top: 0 });
}

function openMoreMenu() {
  showModal("more-menu-modal");
}

function closeMoreMenu() {
  hideModal("more-menu-modal");
}

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.dataset.page) return;
      if (btn.dataset.page === "apprentissage") {
        pendingLearningCategory = null;
        currentLearningScope = null;
        reviewReturnPage = "revision";
      }
      showPage(btn.dataset.page);
    });
  });

  $("btn-create-deck").addEventListener("click", () => openDeckModal("create"));
  $("btn-select-decks").addEventListener("click", toggleDeckGridSelectionMode);
  $("btn-deck-grid-select-all").addEventListener("click", selectAllDecks);
  $("btn-deck-grid-clear").addEventListener("click", clearDeckGridSelection);
  $("btn-deck-grid-study").addEventListener("click", studySelectedDecks);
  $("btn-deck-grid-delete").addEventListener("click", deleteSelectedDecks);
  $("btn-review-hard-cards").addEventListener("click", startDifficultDashboardReview);
  $("btn-manage-hard-cards").addEventListener("click", openDifficultManager);
  $("btn-study-all").addEventListener("click", () => {
    showPage("revision");
  });
  $("btn-create-pack").addEventListener("click", () => openPackModal("create"));
  $("btn-import-pack").addEventListener("click", () => {
    $("pack-import-file").click();
  });
  $("pack-import-file").addEventListener("change", async () => {
    const file = $("pack-import-file").files[0];
    if (file) await previewPackImportFile(file);
  });
  $("btn-confirm-pack-import").addEventListener("click", confirmPackImport);
  $("btn-cancel-pack-import").addEventListener("click", closePackImportModal);
  $("pack-import-modal").addEventListener("click", (event) => {
    if (event.target === $("pack-import-modal")) closePackImportModal();
  });
  $("pack-import-category-select").addEventListener("change", syncPackImportConfirmState);
  $("pack-import-category-new").addEventListener("input", syncPackImportConfirmState);
  $("btn-review-favorites-page").addEventListener("click", () => {
    openStudyModeModal(FAVORITES_SCOPE, "favoris");
  });
  $("btn-nav-more").addEventListener("click", openMoreMenu);
  $("more-menu-modal").addEventListener("click", (event) => {
    if (event.target === $("more-menu-modal")) closeMoreMenu();
    const gotoBtn = event.target.closest("[data-more-goto]");
    if (gotoBtn) {
      closeMoreMenu();
      showPage(gotoBtn.dataset.moreGoto);
    }
  });
  $("btn-close-study-mode").addEventListener("click", closeStudyModeModal);
  $("study-mode-modal").addEventListener("click", (event) => {
    if (event.target === $("study-mode-modal")) closeStudyModeModal();
  });
  $("difficult-modal").addEventListener("click", (event) => {
    if (event.target === $("difficult-modal")) closeDifficultModal();
    const delayBtn = event.target.closest("[data-difficult-delay]");
    if (delayBtn && pendingDifficultCardId) handleDifficultDelay(pendingDifficultCardId, delayBtn.dataset.difficultDelay);
    const rescheduleBtn = event.target.closest("[data-difficult-manage-reschedule]");
    if (rescheduleBtn) openDifficultModal(rescheduleBtn.dataset.difficultManageReschedule);
    const removeBtn = event.target.closest("[data-difficult-manage-remove]");
    if (removeBtn) removeDifficult(removeBtn.dataset.difficultManageRemove);
  });
  $("btn-difficult-custom-save").addEventListener("click", saveDifficultCustomDate);
  $("btn-difficult-remove").addEventListener("click", async () => {
    if (!pendingDifficultCardId) return;
    await removeDifficult(pendingDifficultCardId);
    closeDifficultModal();
  });
  $("btn-close-difficult-modal").addEventListener("click", closeDifficultModal);
  $("study-scope-toggle").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-session-type]");
    if (!btn || btn.disabled) return;
    pendingSessionType = btn.dataset.sessionType;
    syncStudySheet();
  });
  $("study-mode-modal").addEventListener("click", (event) => {
    const option = event.target.closest("[data-study-mode]");
    if (option && !option.disabled) handleStudyModeChoice(option.dataset.studyMode);
  });
  $("btn-study-advanced").addEventListener("click", openAdvancedReviewSettings);
  $("btn-save-deck").addEventListener("click", saveDeckFromModal);
  $("btn-cancel-deck").addEventListener("click", closeDeckModal);
  $("btn-save-pack").addEventListener("click", savePackFromModal);
  $("btn-cancel-pack").addEventListener("click", closePackModal);
  $("pack-modal").addEventListener("click", (event) => {
    if (event.target === $("pack-modal")) closePackModal();
  });
  $("btn-confirm-add-to-pack").addEventListener("click", confirmAddToPack);
  $("btn-cancel-add-to-pack").addEventListener("click", closeAddToPackModal);
  $("btn-add-to-new-pack").addEventListener("click", openNewPackFromAddModal);
  $("add-to-pack-modal").addEventListener("click", (event) => {
    if (event.target === $("add-to-pack-modal")) closeAddToPackModal();
  });
  $("card-detail-modal").addEventListener("click", async (event) => {
    if (event.target === $("card-detail-modal")) {
      closeCardDetailModal();
      return;
    }
    const favoriteBtn = event.target.closest("[data-card-detail-favorite]");
    if (favoriteBtn) {
      event.stopPropagation();
      cardDetailDirty = true;
      await toggleFavorite(favoriteBtn.dataset.cardDetailFavorite);
      await refreshCardDetailSheet();
      return;
    }
    const addToPackBtn = event.target.closest("[data-card-detail-add-to-pack]");
    if (addToPackBtn) {
      event.stopPropagation();
      const id = addToPackBtn.dataset.cardDetailAddToPack;
      cardDetailDirty = true;
      closeCardDetailModal();
      openAddToPackModal([id]);
      return;
    }
    const editBtn = event.target.closest("[data-card-detail-edit]");
    if (editBtn) {
      event.stopPropagation();
      const id = editBtn.dataset.cardDetailEdit;
      closeCardDetailModal();
      startEditCard(id);
      return;
    }
    const deleteBtn = event.target.closest("[data-card-detail-delete]");
    if (deleteBtn) {
      event.stopPropagation();
      const id = deleteBtn.dataset.cardDetailDelete;
      cardDetailDirty = true;
      await handleDelete(id);
      if (!(await getCard(id))) closeCardDetailModal();
    }
  });
  $("btn-close-card-detail").addEventListener("click", closeCardDetailModal);
  $("card-detail-modal").addEventListener("touchstart", (event) => {
    cardDetailTouchStartY = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  $("card-detail-modal").addEventListener("touchend", (event) => {
    if (cardDetailTouchStartY === null) return;
    const panel = event.target.closest(".card-detail-sheet");
    const endY = event.changedTouches[0]?.clientY ?? cardDetailTouchStartY;
    if (panel && panel.scrollTop <= 5 && endY - cardDetailTouchStartY > 80) closeCardDetailModal();
    cardDetailTouchStartY = null;
  }, { passive: true });
  $("subcategory-select").addEventListener("change", onSubcategorySelectChange);
  $("btn-save-subcategory-choice").addEventListener("click", saveSubcategoryChoice);
  $("btn-cancel-subcategory-choice").addEventListener("click", closeSubcategoryModal);
  document.addEventListener("paste", handlePastedImage);
  setupDeckDetailPage();
  $("deck-action-menu").addEventListener("click", (event) => {
    event.stopPropagation();
    const actionBtn = event.target.closest("[data-deck-action]");
    if (actionBtn) handleDeckAction(actionBtn.dataset.deckAction, $("deck-action-menu").dataset.deckName);
    const packActionBtn = event.target.closest("[data-pack-action]");
    if (packActionBtn) handlePackAction(packActionBtn.dataset.packAction, $("deck-action-menu").dataset.packId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideDeckActionMenu();
      closeStudyModeModal();
      closeSubcategoryModal();
      closeImportPreviewModal();
      closeMoreMenu();
      closeDifficultModal();
      closeCardDetailModal();
      closePackModal();
      closeAddToPackModal();
      closePackImportModal();
    }
  });

  window.addEventListener("resize", hideDeckActionMenu);
  window.addEventListener("scroll", hideDeckActionMenu, true);

  // Écouteur global pour deux types de boutons créés dynamiquement :
  // - data-speak : lit un texte en allemand
  // - data-goto  : navigue vers une page
  document.addEventListener("click", (event) => {
    if (wasLongPressJustFired()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const speakBtn = event.target.closest("[data-speak]");
    if (speakBtn) {
      speakGerman(speakBtn.dataset.speak);
      return;
    }
    const gotoBtn = event.target.closest("[data-goto]");
    if (gotoBtn) showPage(gotoBtn.dataset.goto);

    const difficultBtn = event.target.closest("[data-difficult]");
    if (difficultBtn) {
      event.stopPropagation();
      if (difficultBtn.closest("#card-detail-modal")) {
        cardDetailDirty = true;
        closeCardDetailModal();
      }
      openDifficultModal(difficultBtn.dataset.difficult);
      return;
    }

    const studyFavoritesBtn = event.target.closest("#btn-study-favorites");
    if (studyFavoritesBtn) {
      event.stopPropagation();
      openStudyModeModal(FAVORITES_SCOPE, "dashboard");
      return;
    }

    const browseFavoritesBtn = event.target.closest("#btn-browse-favorites");
    if (browseFavoritesBtn) {
      event.stopPropagation();
      showPage("favoris");
      return;
    }

    const studyDeckBtn = event.target.closest("[data-study-deck]");
    if (studyDeckBtn && !studyDeckBtn.disabled) {
      event.stopPropagation();
      openStudyModeModal(studyDeckBtn.dataset.studyDeck, "dashboard");
      return;
    }

    const studyPackBtn = event.target.closest("[data-study-pack]");
    if (studyPackBtn && !studyPackBtn.disabled) {
      event.stopPropagation();
      openStudyModeModal(PACK_SCOPE_PREFIX + studyPackBtn.dataset.studyPack, "packs");
      return;
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
      currentDeckDetailPackId = null;
      deckDetailSearch = "";
      deckDetailSubcategoryFilter = "";
      deckDetailLevelFilter = "";
      $("deck-detail-search").value = "";
      $("deck-detail-subcategory-filter").value = "";
      $("deck-detail-level-filter").value = "";
      showPage("deck-detail");
    }

    const openPackCard = event.target.closest("[data-open-pack]");
    if (openPackCard && !event.target.closest("button, input, select, textarea, a, #deck-action-menu")) {
      openPackDetail(openPackCard.dataset.openPack);
      return;
    }

    const deckMenuBtn = event.target.closest("[data-deck-menu]");
    if (deckMenuBtn) {
      event.stopPropagation();
      showDeckActionMenu(deckMenuBtn.dataset.deckMenu, deckMenuBtn);
    } else {
      const packMenuBtn = event.target.closest("[data-pack-menu]");
      if (packMenuBtn) {
        event.stopPropagation();
        showPackActionMenu(packMenuBtn.dataset.packMenu, packMenuBtn);
      } else if (!event.target.closest("#deck-action-menu")) {
        hideDeckActionMenu();
      }
    }
  });
}

function setupDeckDetailPage() {
  $("btn-deck-detail-back").addEventListener("click", () => showPage(currentDeckDetailPackId ? "packs" : "dashboard"));

  $("btn-deck-detail-study-modal").addEventListener("click", () => {
    if (currentDeckDetailPackId) {
      openStudyModeModal(PACK_SCOPE_PREFIX + currentDeckDetailPackId, "packs");
      return;
    }
    if (!currentDeckDetailCategory) return;
    openStudyModeModal(currentDeckDetailCategory, "dashboard");
  });

  const addToCurrentDeck = () => {
    if (currentDeckDetailPackId) {
      showPage("bibliotheque");
      return;
    }
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
    if (currentDeckDetailPackId) {
      openPackModal("edit", currentDeckDetailPackId);
      return;
    }
    if (!currentDeckDetailCategory) return;
    openDeckModal("appearance", currentDeckDetailCategory);
  });

  $("btn-deck-detail-select").addEventListener("click", toggleDeckSelectionMode);
  $("btn-bulk-select-all").addEventListener("click", selectAllVisibleDeckCards);
  $("btn-bulk-clear").addEventListener("click", clearDeckSelection);
  $("btn-bulk-subcategory").addEventListener("click", openBulkSubcategoryModal);
  $("btn-deck-bulk-add-to-pack").addEventListener("click", () => openAddToPackModal([...selectedDeckCardIds]));
  $("btn-deck-detail-filters-toggle").addEventListener("click", () => {
    deckDetailFiltersOpen = !deckDetailFiltersOpen;
    localStorage.setItem(LS_DECK_DETAIL_FILTERS_OPEN, deckDetailFiltersOpen ? "1" : "0");
    syncDeckDetailFilterCollapse();
  });
  $("btn-deck-detail-filters-reset").addEventListener("click", resetDeckDetailFilters);

  const debouncedRenderDeckDetail = debounce(renderDeckDetail, 150);
  $("deck-detail-search").addEventListener("input", () => {
    deckDetailSearch = $("deck-detail-search").value;
    syncDeckDetailFilterCollapse();
    debouncedRenderDeckDetail();
  });
  $("deck-detail-subcategory-filter").addEventListener("change", () => {
    deckDetailSubcategoryFilter = $("deck-detail-subcategory-filter").value;
    renderDeckDetail();
  });
  $("deck-detail-level-filter").addEventListener("change", () => {
    deckDetailLevelFilter = $("deck-detail-level-filter").value;
    renderDeckDetail();
  });
}


/* =========================================================
   6. DASHBOARD
   ========================================================= */

async function refreshDashboard() {
  const cards = await getAllCards();
  const dueToday = difficultStats(cards).dueCount;

  // Les 3 grands chiffres
  $("stat-total").textContent = cards.length;
  $("stat-due").textContent = dueToday;
  const badge = $("btn-study-all-badge");
  badge.textContent = dueToday;
  badge.classList.toggle("hidden", dueToday === 0);
  $("btn-study-all").disabled = false;
  $("stat-favorites").textContent = cards.filter((card) => card.favorite === true).length;

  try {
    await renderDashboardHardCards();
  } catch (error) {
    console.warn("Cartes difficiles dashboard non rendues :", error);
  }

  renderDecks(cards);
}

async function renderDashboardHardCards() {
  const stats = difficultStats(await getAllCards());
  renderDifficultSummary(stats, {
    badgeId: "dashboard-hard-badge",
    infoId: "dashboard-hard-info",
    actionsId: "dashboard-hard-actions",
    reviewBtnId: "btn-review-hard-cards",
    manageBtnId: "btn-manage-hard-cards",
    emptyId: "dashboard-hard-empty",
  });
}

async function renderDashboardStats() {
  return renderDashboardHardCards();
}

function favoritesDeckCardHTML(cards) {
  const favorites = cards.filter((card) => card.favorite === true);
  if (favorites.length === 0) return "";
  const due = difficultStats(favorites).dueCount;
  const hard = difficultStats(favorites).activeCount;
  return (
    '<article class="deck-card deck-favorites" data-open-favorites>' +
      '<div class="deck-name"><svg class="deck-favorites-icon" focusable="false" aria-hidden="true"><use href="#icon-heart"></use></svg> Favoris</div>' +
      '<p class="deck-count">' + favorites.length + ' carte(s) · ' + hard + ' difficile(s) · ' + due + ' à revoir</p>' +
      '<div class="deck-actions">' +
        '<button class="btn btn-primary btn-small" type="button" id="btn-study-favorites">Étudier</button>' +
        '<button class="btn btn-ghost btn-small" type="button" id="btn-browse-favorites">Voir</button>' +
      "</div>" +
    "</article>"
  );
}

function renderDecks(cards) {
  const container = $("deck-grid");
  const empty = $("deck-empty");
  const groups = {};
  const customDecks = getCustomDecks();
  const accents = ["gold", "blue", "green", "orange", "red", "purple"];

  deckCardCounts = new Map();
  cards.forEach((card) => {
    const category = cardDeckName(card);
    if (!isPreferredDeckCategory(category)) return;
    deckCardCounts.set(category, (deckCardCounts.get(category) || 0) + 1);
    if (!groups[category]) {
      groups[category] = { name: category, total: 0, hard: 0, due: 0, color: "", emoji: "", custom: false };
    }
    groups[category].total++;
    if (isDifficultActive(card)) groups[category].hard++;
    if (isDifficultDue(card)) groups[category].due++;
  });

  customDecks.forEach((deck) => {
    if (!isPreferredDeckCategory(deck.name)) return;
    if (!groups[deck.name]) {
      groups[deck.name] = { name: deck.name, total: 0, hard: 0, due: 0, color: deck.color, emoji: deck.emoji, custom: true };
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
      hard: cards.filter((card) => (String(card.category || "Général").trim() || "Général") === category && isDifficultActive(card)).length,
      due: cards.filter((card) => (String(card.category || "Général").trim() || "Général") === category && isDifficultDue(card)).length,
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
  container.innerHTML = favoritesDeckCardHTML(cards) + decks.map((deck, index) => {
    const color = deck.color || accents[index % accents.length];
    const displayName = (deck.emoji ? deck.emoji + " " : "") + deck.name;
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
        '<p class="deck-count">' + deck.total + ' carte(s) · ' + deck.hard + ' difficile(s) · ' + deck.due + ' à revoir</p>' +
        emptyText +
        '<div class="deck-actions">' +
          '<button class="btn btn-primary btn-small" type="button" data-study-deck="' + escapeHTML(deck.name) + '">Étudier</button>' +
          '<button class="btn btn-ghost btn-small" data-add-card-category="' + escapeHTML(deck.name) + '">+ Ajouter</button>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  container.querySelectorAll("[data-open-favorites]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      showPage("favoris");
    });
  });

  container.querySelectorAll("[data-deck-grid-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setDeckNameSelected(checkbox.dataset.deckGridSelect, checkbox.checked);
    });
  });

  container.querySelectorAll("[data-open-deck]").forEach((el) => {
    attachLongPress(el, () => {
      const name = el.dataset.openDeck;
      if (!deckGridSelectionMode) {
        deckGridSelectionMode = true;
        selectedDeckNames.add(name);
        syncSelectionModeClass();
        refreshDashboard();
        return;
      }
      setDeckNameSelected(name, !selectedDeckNames.has(name));
    });
  });
}

async function renderPacksPage() {
  const cards = await getAllCards();
  const container = $("pack-grid");
  const empty = $("pack-empty");
  if (!container) return;
  const packs = getPacks();

  const packHTML = packs.map((pack) => {
    const cardsInPack = packCards(pack, cards);
    const total = cardsInPack.length;
    const hardStats = difficultStats(cardsInPack);
    const due = hardStats.dueCount;
    const hard = hardStats.activeCount;
    const countText = total === 0
      ? "Aucune carte · ajoute-en depuis la Bibliothèque"
      : pack.name + " · " + total + " carte" + (total > 1 ? "s" : "") + " · " + hard + " difficile" + (hard > 1 ? "s" : "") + " · " + due + " à revoir";
    return (
      '<article class="deck-card pack-card" style="--deck-accent:' + escapeHTML(pack.color) + '" data-open-pack="' + escapeHTML(pack.id) + '">' +
        '<button class="deck-menu-btn" type="button" data-pack-menu="' + escapeHTML(pack.id) + '">...</button>' +
        '<span class="deck-open-hint">Ouvrir le pack</span>' +
        '<div class="deck-name"><span class="pack-dot"></span>' + escapeHTML(pack.name) + '</div>' +
        '<p class="deck-count">' + escapeHTML(countText) + '</p>' +
        '<div class="deck-actions">' +
          '<button class="btn btn-primary btn-small" type="button" data-study-pack="' + escapeHTML(pack.id) + '"' + (total === 0 ? " disabled" : "") + '>Étudier</button>' +
          '<button class="btn btn-ghost btn-small" type="button" data-browse-pack="' + escapeHTML(pack.id) + '">Voir</button>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  container.innerHTML = packHTML;
  if (empty) empty.classList.toggle("hidden", packs.length > 0);

  container.querySelectorAll("[data-browse-pack]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      openPackDetail(btn.dataset.browsePack);
    });
  });
}

function renderPacksPageIfVisible() {
  if ($("page-packs").classList.contains("active")) renderPacksPage();
}

function openPackDetail(packId) {
  if (!getPackById(packId)) {
    toast("Pack introuvable.");
    renderPacksPageIfVisible();
    return;
  }
  currentDeckDetailPackId = packId;
  currentDeckDetailCategory = null;
  deckDetailSearch = "";
  deckDetailSubcategoryFilter = "";
  deckDetailLevelFilter = "";
  deckDetailSelectionMode = false;
  selectedDeckCardIds.clear();
  $("deck-detail-search").value = "";
  $("deck-detail-subcategory-filter").value = "";
  $("deck-detail-level-filter").value = "";
  syncSelectionModeClass();
  showPage("deck-detail");
}

/* --- Sélection multiple de jeux sur le dashboard --- */

function toggleDeckGridSelectionMode() {
  deckGridSelectionMode = !deckGridSelectionMode;
  if (!deckGridSelectionMode) selectedDeckNames.clear();
  syncSelectionModeClass();
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
  syncSelectionModeClass();
  $("btn-select-decks").textContent = deckGridSelectionMode ? "Annuler sélection" : "Sélectionner";
  $("deck-grid-bulk-bar").classList.toggle("hidden", !deckGridSelectionMode);

  const count = selectedDeckNames.size;
  let cardCount = 0;
  selectedDeckNames.forEach((name) => { cardCount += deckCardCounts.get(name) || 0; });

  const deckPart = count + " jeu" + (count > 1 ? "x" : "") + " sélectionné" + (count > 1 ? "s" : "");
  $("deck-grid-bulk-count").textContent = count > 0
    ? deckPart + " · " + cardCount + " carte" + (cardCount > 1 ? "s" : "")
    : "0 jeu sélectionné";
  $("btn-deck-grid-study").disabled = count === 0;
  $("btn-deck-grid-delete").disabled = count === 0;
  $("btn-deck-grid-clear").textContent = count > 0 ? "Désélectionner" : "Quitter la sélection";
  $("btn-deck-grid-clear").disabled = false;
  $("btn-deck-grid-select-all").disabled = visibleDeckNames.length === 0;
}

function selectAllDecks() {
  visibleDeckNames.forEach((name) => selectedDeckNames.add(name));
  refreshDashboard();
}

function clearDeckGridSelection() {
  if (selectedDeckNames.size > 0) {
    selectedDeckNames.clear();
    refreshDashboard();
    syncSelectionModeClass();
    return;
  }

  deckGridSelectionMode = false;
  selectedDeckNames.clear();
  refreshDashboard();
  syncSelectionModeClass();
}

function studySelectedDecks() {
  const scope = normalizeScope(Array.from(selectedDeckNames));
  if (!scope) {
    toast("Sélectionne au moins un jeu.");
    return;
  }
  openStudyModeModal(scope, "dashboard");
  deckGridSelectionMode = false;
  selectedDeckNames.clear();
  syncSelectionModeClass();
  updateDeckGridBulkBar();
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
  syncSelectionModeClass();
  refreshAfterDeckChange();
  refreshSubcategorySuggestions();
  toast(names.length + " jeu" + (plural ? "x" : "") + " supprimé" + (plural ? "s" : "") + ".");
}

async function renderDeckDetail() {
  const version = ++deckDetailRenderVersion;
  const deckName = currentDeckDetailCategory;
  const pack = currentDeckDetailPackId ? getPackById(currentDeckDetailPackId) : null;
  if (currentDeckDetailPackId && !pack) {
    currentDeckDetailPackId = null;
    showPage("dashboard");
    return;
  }
  if (!deckName && !pack) {
    showPage("dashboard");
    return;
  }

  const allCards = await getAllCards();
  if (version !== deckDetailRenderVersion) return;

  const isPackDetail = Boolean(pack);
  const deck = findCustomDeckByName(deckName);
  const displayName = isPackDetail ? pack.name : (deck?.emoji ? deck.emoji + " " : "") + deckName;
  const deckCards = isPackDetail ? packCards(pack, allCards) : allCards.filter((card) => cardDeckName(card) === deckName);
  const hardStats = difficultStats(deckCards);
  const hard = hardStats.activeCount;
  const due = hardStats.dueCount;
  $("btn-deck-detail-add").textContent = isPackDetail ? "Ajouter depuis la Bibliothèque" : "+ Ajouter une carte";
  $("btn-deck-detail-empty-add").textContent = isPackDetail ? "Ajouter depuis la Bibliothèque" : "+ Ajouter une carte";
  $("btn-deck-detail-appearance").textContent = isPackDetail ? "Modifier le pack" : "Modifier apparence";
  $("btn-deck-detail-back").textContent = isPackDetail ? "← Retour aux packs" : "← Retour aux jeux";
  $("btn-bulk-subcategory").classList.toggle("hidden", isPackDetail);
  $("deck-detail-subcategory-filter").classList.toggle("hidden", isPackDetail);
  $("deck-detail-subcategories").classList.toggle("hidden", isPackDetail);
  if (isPackDetail) {
    deckDetailSubcategoryFilter = "";
    $("deck-detail-subcategory-filter").value = "";
    $("deck-detail-subcategories").innerHTML = "";
  } else {
    updateDeckDetailSubcategoryFilter(deckCards);
    renderDeckDetailSubcategorySummary(deckCards);
  }
  fillLevelSelect($("deck-detail-level-filter"), deckDetailLevelFilter);

  $("deck-detail-title").textContent = displayName;
  $("deck-detail-subtitle").textContent =
    deckCards.length + " carte(s) · " + hard + " difficile(s) · " + due + " à revoir";
  $("deck-detail-search").value = deckDetailSearch;
  syncDeckDetailFilterCollapse();

  const query = deckDetailSearch.trim().toLowerCase();
  const visibleCards = deckCards
    .filter((card) => {
      const matchesSubcategory =
        isPackDetail ||
        !deckDetailSubcategoryFilter ||
        (deckDetailSubcategoryFilter === "__none__" ? !cardSubcategoryName(card) : cardSubcategoryName(card) === deckDetailSubcategoryFilter);
      const matchesLevel = matchesLevelFilter(card, deckDetailLevelFilter);
      return matchesSubcategory && matchesLevel && matchesCardQuery(card, query);
    })
    .sort((a, b) => fullWord(a).localeCompare(fullWord(b), "de"));
  visibleDeckDetailCardIds = visibleCards.map((card) => card.id);
  selectedDeckCardIds = new Set([...selectedDeckCardIds].filter((id) => visibleDeckDetailCardIds.includes(id)));
  updateDeckBulkBar();

  const empty = $("deck-detail-empty");
  const grid = $("deck-detail-grid");
  if (deckCards.length === 0) {
    empty.classList.remove("hidden");
    empty.querySelector("p").textContent = isPackDetail ? "Ce pack est vide." : "Ce jeu est vide.";
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
    .map((card, index) => deckDetailCardHTML(card, imageUrls[index], { packId: isPackDetail ? pack.id : null }))
    .join("");

  grid.querySelectorAll("[data-deck-detail-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.deckDetailEdit));
  });
  grid.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.edit));
  });
  grid.querySelectorAll("[data-deck-detail-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.deckDetailDelete));
  });
  grid.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete));
  });
  grid.querySelectorAll("[data-deck-detail-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.deckDetailFavorite));
  });
  grid.querySelectorAll("[data-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.favorite));
  });
  grid.querySelectorAll("[data-deck-detail-sub-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openSubcategoryModal(btn.dataset.deckDetailSubEdit));
  });
  grid.querySelectorAll("[data-remove-from-pack]").forEach((btn) => {
    btn.addEventListener("click", () => removeCardFromCurrentPack(btn.dataset.removeFromPack));
  });
  grid.querySelectorAll("[data-deck-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setDeckCardSelected(checkbox.dataset.deckSelect, checkbox.checked);
    });
  });
  grid.querySelectorAll("[data-deck-select-card]").forEach((cardEl) => {
    cardEl.addEventListener("click", (event) => {
      if (wasLongPressJustFired()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!deckDetailSelectionMode || isInteractiveTarget(event.target)) return;
      const id = cardEl.dataset.deckSelectCard;
      setDeckCardSelected(id, !selectedDeckCardIds.has(id));
      renderDeckDetail();
    });

    attachLongPress(cardEl, () => {
      const id = cardEl.dataset.deckSelectCard;
      if (!deckDetailSelectionMode) {
        deckDetailSelectionMode = true;
        selectedDeckCardIds.add(id);
        syncSelectionModeClass();
        renderDeckDetail();
        return;
      }
      setDeckCardSelected(id, !selectedDeckCardIds.has(id));
      renderDeckDetail();
    });
  });
  attachCardDetailOpenHandlers(grid, "[data-deck-select-card]", () => deckDetailSelectionMode);
  attachImageActionHandlers(grid);
  attachImageDropHandlers(grid);
}

function toggleDeckSelectionMode() {
  deckDetailSelectionMode = !deckDetailSelectionMode;
  if (!deckDetailSelectionMode) selectedDeckCardIds.clear();
  syncSelectionModeClass();
  renderDeckDetail();
}

function setDeckCardSelected(cardId, selected) {
  if (selected) {
    selectedDeckCardIds.add(cardId);
  } else {
    selectedDeckCardIds.delete(cardId);
  }
  syncSelectionModeClass();
  updateDeckBulkBar();
}

function selectAllVisibleDeckCards() {
  visibleDeckDetailCardIds.forEach((id) => selectedDeckCardIds.add(id));
  renderDeckDetail();
}

function clearDeckSelection() {
  selectedDeckCardIds.clear();
  deckDetailSelectionMode = false;
  syncSelectionModeClass();
  renderDeckDetail();
}

function removeCardFromCurrentPack(cardId) {
  if (!currentDeckDetailPackId) return;
  const pack = getPackById(currentDeckDetailPackId);
  const removed = removeCardsFromPack(currentDeckDetailPackId, [cardId]);
  if (removed > 0) {
    selectedDeckCardIds.delete(cardId);
    renderPacksPageIfVisible();
    renderDeckDetail();
    renderLibraryIfVisible();
    renderReviewHubIfVisible();
    toast("Carte retirée de " + (pack?.name || "ce pack") + ".");
  }
}

function updateDeckBulkBar() {
  syncSelectionModeClass();
  $("btn-deck-detail-select").textContent = deckDetailSelectionMode ? "Annuler sélection" : "Sélectionner";
  $("deck-bulk-bar").classList.toggle("hidden", !deckDetailSelectionMode);
  const count = selectedDeckCardIds.size;
  $("deck-bulk-count").textContent = count + " carte" + (count > 1 ? "s" : "") + " sélectionnée" + (count > 1 ? "s" : "");
  $("btn-bulk-subcategory").disabled = count === 0;
  $("btn-deck-bulk-add-to-pack").disabled = count === 0;
  $("btn-bulk-clear").textContent = "Annuler";
  $("btn-bulk-clear").disabled = false;
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
  if (currentDeckDetailPackId) return;
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
  showModal("subcategory-modal");
}

function closeSubcategoryModal() {
  hideModal("subcategory-modal");
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
  try {
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
    syncSelectionModeClass();
    renderDeckDetailIfVisible();
    renderLibraryIfVisible();
    renderLearningIfVisible();
    closeSubcategoryModal();
    toast(cards.length + " carte" + (cards.length > 1 ? "s" : "") + " mise" + (cards.length > 1 ? "s" : "") + " à jour.");
  } catch (error) {
    console.error("Échec de modification de sous-catégorie :", error);
    toast("Impossible de modifier la sous-catégorie.");
  }
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

function getDeckDetailActiveFilterCount() {
  let count = 0;
  if ($("deck-detail-search").value.trim()) count++;
  if ($("deck-detail-subcategory-filter").value) count++;
  if ($("deck-detail-level-filter").value) count++;
  return count;
}

function syncDeckDetailFilterCollapse() {
  const activeCount = getDeckDetailActiveFilterCount();
  $("deck-detail-filter-panel").classList.toggle("expanded", deckDetailFiltersOpen);
  $("btn-deck-detail-filters-toggle").setAttribute("aria-expanded", String(deckDetailFiltersOpen));
  $("deck-detail-filters-label").textContent = activeCount > 0 ? "Filtres · " + activeCount : "Filtres";
  $("btn-deck-detail-filters-reset").classList.toggle("hidden", activeCount === 0);
}

function resetDeckDetailFilters() {
  deckDetailSearch = "";
  deckDetailSubcategoryFilter = "";
  deckDetailLevelFilter = "";
  $("deck-detail-search").value = "";
  $("deck-detail-subcategory-filter").value = "";
  $("deck-detail-level-filter").value = "";
  renderDeckDetail();
}

function deckDetailCardHTML(card, imageUrl, options = {}) {
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
  const removeFromPackButton = options.packId
    ? iconButtonHTML("icon-trash", {
      label: "Retirer du pack",
      className: "btn-remove-pack",
      data: { "remove-from-pack": card.id },
    })
    : "";
  const statusLabel = cardStatusLabel(card);
  const statusHTML = statusLabel
    ? '<span class="deck-detail-status">' + escapeHTML(statusLabel) + "</span>"
    : "";

  return (
    '<article class="deck-detail-card' + (selected ? " selected" : "") + '" data-deck-select-card="' + escapeHTML(card.id) + '" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      selectBox +
      cardImageHTML(card, imageUrl) +
      '<div class="deck-detail-card-body">' +
        '<div class="deck-detail-card-top">' +
          '<div class="deck-detail-chips">' +
            '<span class="chip chip-category">' + escapeHTML(cardDeckName(card)) + "</span>" +
            levelAndCaseBadgesHTML(card) +
          "</div>" +
          statusHTML +
        "</div>" +
        '<p class="deck-detail-fr">' + escapeHTML(card.fr) + "</p>" +
        '<div class="deck-detail-word">' + wordHTML(card) + "</div>" +
        subcategoryLine +
        pluralLine +
        imageQueryLine +
        exampleLine +
      "</div>" +
      cardActionsHTML(card, { subcategory: !options.packId, extraActions: removeFromPackButton }) +
    "</article>"
  );
}

function cardStatusLabel(card) {
  return isDifficultActive(card) ? "Difficile" : "";
}

async function deckHasCards(name) {
  const cards = await getAllCards();
  return cards.some((card) => cardDeckName(card) === name);
}

async function getReviewHubStats(scope = null) {
  const cards = await getAllCards();
  const scoped = cards.filter((card) => cardInScope(card, scope));
  const due = difficultCards(scoped, { onlyDue: true });
  const hard = difficultCards(scoped);
  const queue = buildReviewQueue(scoped);

  return {
    scoped,
    totalCards: scoped.length,
    dueCards: due.length,
    reviewCards: due.length,
    hardCards: hard.length,
    sessionSize: queue.length,
  };
}

async function openStudyModeModal(scope = null, originPage = "") {
  pendingStudyScope = normalizeScope(scope);
  pendingSessionType = "due";
  reviewReturnPage = originPage || currentPageName();

  const stats = await getReviewHubStats(pendingStudyScope);
  $("study-mode-scope").textContent = "Périmètre : " + scopeLabel(pendingStudyScope);
  $("seg-count-due").textContent = stats.sessionSize + " carte" + (stats.sessionSize > 1 ? "s" : "");
  $("seg-count-free").textContent = stats.totalCards + " carte" + (stats.totalCards > 1 ? "s" : "");

  if (stats.sessionSize === 0) pendingSessionType = "free";
  syncStudySheet(stats);

  $("study-mode-modal").dataset.studyStats = JSON.stringify({
    sessionSize: stats.sessionSize,
    totalCards: stats.totalCards,
  });
  showModal("study-mode-modal");
}

function syncStudySheet(stats) {
  const data = stats || JSON.parse($("study-mode-modal").dataset.studyStats || "{}");
  const sessionSize = Number(data.sessionSize) || 0;
  const totalCards = Number(data.totalCards) || 0;
  if (sessionSize === 0) pendingSessionType = "free";

  document.querySelectorAll("[data-session-type]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sessionType === pendingSessionType);
    btn.disabled = btn.dataset.sessionType === "due" && sessionSize === 0;
  });

  $("study-session-hint").textContent = pendingSessionType === "due"
    ? "Les cartes difficiles dues maintenant."
    : "Toutes les cartes du périmètre, mélangées. Ta progression n'est pas modifiée.";

  document.querySelectorAll("#study-mode-modal [data-study-mode]").forEach((btn) => {
    const disabled = totalCards === 0;
    btn.disabled = disabled;
    btn.classList.toggle("disabled", disabled);
  });
}

function closeStudyModeModal() {
  hideModal("study-mode-modal");
}

function handleStudyModeChoice(mode) {
  closeStudyModeModal();
  currentReviewMode = mode;
  localStorage.setItem(LS_REVIEW_MODE, mode);

  if (mode === "learning") {
    currentLearningScope = pendingStudyScope;
    pendingLearningCategory = pendingStudyScope;
    showPage("apprentissage");
    return;
  }

  currentReviewCategory = pendingStudyScope;
  reviewSessionType = pendingSessionType;
  skipHubOnce = true;
  showPage("revision");
}

function openAdvancedReviewSettings() {
  closeStudyModeModal();
  currentReviewCategory = pendingStudyScope;
  skipHubOnce = false;
  showPage("revision");
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
  showModal("deck-modal");
  $("deck-name-input").focus();
}

function closeDeckModal() {
  hideModal("deck-modal");
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

function renderPackColorPicker() {
  $("pack-color-picker").innerHTML = PACK_COLORS.map((color) => {
    return '<button class="pack-color-swatch' + (selectedPackColor === color ? " active" : "") + '" type="button" data-pack-color="' + escapeHTML(color) + '" style="background:' + escapeHTML(color) + '; color:' + escapeHTML(color) + '" aria-label="Couleur ' + escapeHTML(color) + '"></button>';
  }).join("");
  $("pack-color-picker").querySelectorAll("[data-pack-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPackColor = btn.dataset.packColor;
      renderPackColorPicker();
    });
  });
}

function openPackModal(mode = "create", packId = null, options = {}) {
  const pack = packId ? getPackById(packId) : null;
  packModalMode = mode;
  packModalPackId = pack?.id || null;
  selectedPackColor = pack?.color || options.color || PACK_COLORS[0];
  pendingPackCreateAddIds = Array.isArray(options.addCardIds) ? options.addCardIds.map(String) : [];
  $("pack-modal-title").textContent = mode === "create" ? "Créer un pack" : "Modifier le pack";
  $("pack-name-input").value = mode === "create" ? "" : (pack?.name || "");
  renderPackColorPicker();
  showModal("pack-modal");
  $("pack-name-input").focus();
}

function closePackModal() {
  hideModal("pack-modal");
  packModalPackId = null;
  pendingPackCreateAddIds = [];
}

function savePackFromModal() {
  const name = $("pack-name-input").value.trim();
  if (!name) {
    toast("Nom du pack obligatoire.");
    return;
  }

  let pack = null;
  if (packModalMode === "create") {
    pack = createPack(name, selectedPackColor);
    if (!pack) {
      toast("Ce nom de pack est déjà utilisé.");
      return;
    }
  } else {
    const packs = getPacks();
    const current = packs.find((item) => item.id === packModalPackId);
    if (!current) {
      toast("Pack introuvable.");
      closePackModal();
      renderPacksPageIfVisible();
      return;
    }
    if (packs.some((item) => item.id !== current.id && item.name.toLowerCase() === name.toLowerCase())) {
      toast("Ce nom de pack est déjà utilisé.");
      return;
    }
    current.name = name;
    current.color = selectedPackColor;
    current.updatedAt = todayISO();
    savePacks(packs);
    pack = current;
  }

  const idsToAdd = pendingPackCreateAddIds;
  closePackModal();
  if (idsToAdd.length && pack) {
    const added = addCardsToPack(pack.id, idsToAdd);
    toast(added + " carte(s) ajoutée(s) à " + pack.name + ".");
    librarySelectionMode = false;
    selectedLibraryCardIds.clear();
    syncSelectionModeClass();
    renderLibraryIfVisible();
  } else {
    toast("Pack sauvegardé.");
  }
  renderPacksPageIfVisible();
  renderReviewHubIfVisible();
  renderDeckDetailIfVisible();
}

function showPackActionMenu(packId, anchorButton) {
  const pack = getPackById(packId);
  if (!pack) {
    renderPacksPageIfVisible();
    return;
  }
  const menu = $("deck-action-menu");
  const rect = anchorButton.getBoundingClientRect();
  menu.dataset.deckName = "";
  menu.dataset.packId = packId;
  menu.innerHTML =
    '<button type="button" data-pack-action="rename">Renommer</button>' +
    '<button type="button" data-pack-action="color">Changer la couleur</button>' +
    '<button type="button" data-pack-action="export">Exporter ce pack</button>' +
    '<button type="button" data-pack-action="delete">Supprimer le pack</button>';
  menu.classList.remove("hidden");

  const gap = 8;
  const menuWidth = menu.offsetWidth || 220;
  const menuHeight = menu.offsetHeight || 180;
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

async function handlePackAction(action, packId) {
  hideDeckActionMenu();
  const pack = getPackById(packId);
  if (!pack) {
    toast("Pack introuvable.");
    renderPacksPageIfVisible();
    return;
  }

  if (action === "rename" || action === "color") {
    openPackModal("edit", packId);
    return;
  }

  if (action === "export") {
    await exportPack(packId);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm("Supprimer le pack « " + pack.name + " » ?\n\nTes cartes ne seront pas supprimées, seulement le pack.");
    if (!confirmed) return;
    deletePack(packId);
    if (currentDeckDetailPackId === packId) {
      currentDeckDetailPackId = null;
      showPage("packs");
    }
    if (currentReviewCategory === PACK_SCOPE_PREFIX + packId) currentReviewCategory = null;
    renderPacksPageIfVisible();
    renderReviewHubIfVisible();
    toast("Pack supprimé.");
  }
}

function openAddToPackModal(cardIds) {
  pendingAddToPackCardIds = (Array.isArray(cardIds) ? cardIds : []).map(String);
  if (pendingAddToPackCardIds.length === 0) {
    toast("Sélectionne au moins une carte.");
    return;
  }

  const packs = getPacks();
  $("add-to-pack-summary").textContent =
    pendingAddToPackCardIds.length + " carte" + (pendingAddToPackCardIds.length > 1 ? "s" : "") + " sélectionnée" + (pendingAddToPackCardIds.length > 1 ? "s" : "");
  $("add-to-pack-list").innerHTML = packs.length
    ? packs.map((pack) => {
      return '<label class="add-to-pack-option">' +
        '<input type="checkbox" value="' + escapeHTML(pack.id) + '">' +
        '<span class="pack-dot" style="--deck-accent:' + escapeHTML(pack.color) + '"></span>' +
        '<span>' + escapeHTML(pack.name) + '</span>' +
      '</label>';
    }).join("")
    : '<p class="muted">Aucun pack pour le moment.</p>';
  $("btn-confirm-add-to-pack").disabled = packs.length === 0;
  showModal("add-to-pack-modal");
}

function closeAddToPackModal() {
  hideModal("add-to-pack-modal");
  pendingAddToPackCardIds = [];
}

function confirmAddToPack() {
  const selectedPackIds = Array.from($("add-to-pack-list").querySelectorAll("input:checked")).map((input) => input.value);
  if (selectedPackIds.length === 0) {
    toast("Choisis au moins un pack.");
    return;
  }

  const messages = [];
  selectedPackIds.forEach((packId) => {
    const pack = getPackById(packId);
    const added = addCardsToPack(packId, pendingAddToPackCardIds);
    messages.push(added + " carte(s) ajoutée(s) à " + (pack?.name || "ce pack"));
  });

  closeAddToPackModal();
  librarySelectionMode = false;
  selectedLibraryCardIds.clear();
  deckDetailSelectionMode = false;
  selectedDeckCardIds.clear();
  syncSelectionModeClass();
  renderPacksPageIfVisible();
  renderLibraryIfVisible();
  renderDeckDetailIfVisible();
  renderReviewHubIfVisible();
  toast(messages.join(" · "));
}

function openNewPackFromAddModal() {
  const ids = [...pendingAddToPackCardIds];
  closeAddToPackModal();
  openPackModal("create", null, { addCardIds: ids });
}

function showDeckActionMenu(deckName, anchorButton) {
  const menu = $("deck-action-menu");
  const rect = anchorButton.getBoundingClientRect();
  menu.dataset.deckName = deckName;
  menu.innerHTML =
    '<button type="button" data-deck-action="rename">Renommer</button>' +
    '<button type="button" data-deck-action="appearance">Modifier apparence</button>' +
    '<button type="button" data-deck-action="add">Ajouter une carte</button>' +
    '<button type="button" data-deck-action="study">Étudier</button>' +
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
    openStudyModeModal(deckName, "dashboard");
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
  try {
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

    currentReviewCategory = renameDeckInScope(currentReviewCategory, oldName, cleanName);
    pendingLearningCategory = renameDeckInScope(pendingLearningCategory, oldName, cleanName);
    currentLearningScope = renameDeckInScope(currentLearningScope, oldName, cleanName);
    pendingStudyScope = renameDeckInScope(pendingStudyScope, oldName, cleanName);
    if (currentDeckDetailCategory === oldName) currentDeckDetailCategory = cleanName;
    refreshAfterDeckChange();
    toast("Jeu renommé.");
  } catch (error) {
    console.error("Échec de renommage du jeu :", error);
    toast("Impossible de renommer ce jeu.");
  }
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
  currentReviewCategory = removeDeckFromScope(currentReviewCategory, deckName);
  pendingLearningCategory = removeDeckFromScope(pendingLearningCategory, deckName);
  currentLearningScope = removeDeckFromScope(currentLearningScope, deckName);
  pendingStudyScope = removeDeckFromScope(pendingStudyScope, deckName);
  if (currentDeckDetailCategory === deckName) {
    currentDeckDetailCategory = null;
    if ($("page-deck-detail").classList.contains("active")) showPage("dashboard");
  }

  return deckCards.length;
}

async function deleteDeck(deckName) {
  try {
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
  } catch (error) {
    console.error("Échec de suppression du jeu :", error);
    toast("Impossible de supprimer ce jeu.");
  }
}

function refreshAfterDeckChange() {
  refreshDashboard();
  refreshCategorySuggestions();
  renderLibraryIfVisible();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  if ($("page-revision").classList.contains("active")) {
    if (isSessionRunning()) startReviewSession();
    else renderReviewHub();
  }
}

/* =========================================================
   7. RÉVISION MANUELLE
   ========================================================= */

function isSessionRunning() {
  return !$("review-area").classList.contains("hidden");
}

function showReviewHub() {
  reviewReturnPage = "revision";
  $("review-hub").classList.remove("hidden");
  $("review-area").classList.add("hidden");
  $("review-empty").classList.add("hidden");
  $("session-summary").classList.add("hidden");
  $("page-revision").classList.remove("session-active");
  setReviewSessionActive(false);
  renderReviewHub();
}

async function renderReviewHub() {
  currentReviewCategory = normalizeScope(currentReviewCategory);
  if (isPackScope(currentReviewCategory) && !getPackById(packIdFromScope(currentReviewCategory))) {
    currentReviewCategory = null;
    renderReviewHub();
    return;
  }
  if (!["classic", "written"].includes(currentReviewMode)) {
    currentReviewMode = "classic";
    localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
  }
  const stats = await getReviewHubStats(currentReviewCategory);
  if (currentReviewCategory === FAVORITES_SCOPE && stats.totalCards === 0) {
    currentReviewCategory = null;
    renderReviewHub();
    return;
  }
  await renderHubScopeChips();

  await renderReviewDifficultPanel();
  $("hub-subtitle").textContent =
    "Périmètre : " + scopeLabel(currentReviewCategory) + " · " + stats.totalCards + " carte(s)";

  document.querySelectorAll("[data-hub-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.hubMode === currentReviewMode);
  });

  $("btn-hub-free").disabled = stats.totalCards === 0;
  $("btn-hub-free").textContent = stats.totalCards === 0
    ? "Aucune carte à étudier"
    : "Étudier · " + stats.totalCards + " carte" + (stats.totalCards > 1 ? "s" : "");
  $("hub-cta-note").textContent = stats.totalCards === 0
    ? ""
    : "Toutes les cartes du périmètre seront mélangées.";
}

function renderReviewHubIfVisible() {
  if ($("page-revision").classList.contains("active") && !isSessionRunning()) renderReviewHub();
}

async function renderReviewDifficultPanel() {
  const stats = difficultStats(await getAllCards());
  renderDifficultSummary(stats, {
    badgeId: "review-hard-badge",
    infoId: "review-hard-info",
    actionsId: "review-hard-actions",
    reviewBtnId: "btn-review-page-hard",
    manageBtnId: "btn-review-page-manage-hard",
    emptyId: "review-hard-empty",
    listId: "review-difficult-list",
  });
}

async function renderHubScopeChips() {
  const cards = await getAllCards();
  const favoriteCards = cards.filter((card) => card.favorite === true);
  const favoriteDue = difficultStats(favoriteCards).dueCount;
  const decks = [...new Set([
    ...cards.map(cardDeckName),
    ...getCustomDecks().map((deck) => deck.name),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
  const packs = getPacks();

  const normalizedScope = normalizeScope(currentReviewCategory);
  const selected = Array.isArray(normalizedScope)
    ? normalizedScope
    : [];
  const favoritesChip = favoriteCards.length
    ? '<button class="hub-chip hub-chip-favorites' + (normalizedScope === FAVORITES_SCOPE ? " active" : "") + '" type="button" data-hub-scope="' + FAVORITES_SCOPE + '">' +
      '<svg class="btn-svg-icon" focusable="false" aria-hidden="true"><use href="#icon-heart"></use></svg> Favoris' +
      (favoriteDue ? '<span class="hub-chip-badge">' + favoriteDue + "</span>" : "") + "</button>"
    : "";
  const packChips = packs.length
    ? '<span class="hub-chip-group-label">Packs</span>' + packs.map((pack) => {
      const scope = PACK_SCOPE_PREFIX + pack.id;
      const due = difficultStats(packCards(pack, cards)).dueCount;
      return '<button class="hub-chip hub-chip-pack' + (normalizedScope === scope ? " active" : "") + '" type="button" data-hub-scope="' + escapeHTML(scope) + '">' +
        '<span class="pack-dot" style="--deck-accent:' + escapeHTML(pack.color) + '"></span>' +
        escapeHTML(pack.name) + (due ? '<span class="hub-chip-badge">' + due + "</span>" : "") + "</button>";
    }).join("")
    : "";

  $("hub-scope-chips").innerHTML =
    '<button class="hub-chip' + (!normalizedScope ? " active" : "") + '" type="button" data-hub-scope="__all__">Tout</button>' +
    favoritesChip +
    decks.map((name) => {
      const due = difficultStats(cards.filter((card) => cardDeckName(card) === name)).dueCount;
      return '<button class="hub-chip' + (selected.includes(name) ? " active" : "") + '" type="button" data-hub-scope="' + escapeHTML(name) + '">' +
        escapeHTML(name) + (due ? '<span class="hub-chip-badge">' + due + "</span>" : "") + "</button>";
    }).join("") +
    packChips;

  $("hub-scope-chips").querySelectorAll("[data-hub-scope]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const value = chip.dataset.hubScope;
      if (value === "__all__") {
        currentReviewCategory = null;
      } else if (value === FAVORITES_SCOPE) {
        currentReviewCategory = FAVORITES_SCOPE;
      } else if (isPackScope(value)) {
        currentReviewCategory = value;
      } else {
        const next = new Set(selected);
        next.has(value) ? next.delete(value) : next.add(value);
        currentReviewCategory = next.size === 0 ? null : [...next];
      }
      renderReviewHub();
    });
  });
}

async function startReviewSession() {
  $("review-hub").classList.add("hidden");
  const cards = await getAllCards();
  currentReviewCategory = normalizeScope(currentReviewCategory);
  const scopedCards = cards.filter((card) => cardInScope(card, currentReviewCategory));
  reviewSessionStats = { seen: 0, seenIds: [], markedDifficultIds: [] };
  reviewHistory = [];
  isGrading = false;
  if (reviewSessionType === "due") {
    currentReviewMode = "classic";
    localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
  }
  const fallbackAllActive = difficultReviewFallbackAllOnce;
  difficultReviewFallbackAllOnce = false;
  reviewQueue = reviewSessionType === "due"
    ? buildReviewQueue(scopedCards, { fallbackAllActive: fallbackAllActive })
    : buildFreePracticeQueue(scopedCards);

  if (cards.length === 0) {
    showReviewEmpty("Ta bibliothèque est vide. Commence par ajouter quelques cartes ! 📝");
  } else if (scopedCards.length === 0 && currentReviewCategory) {
    showReviewEmpty(reviewEmptyScopeMessage());
  } else if (reviewQueue.length === 0) {
    if (reviewSessionType === "due") {
      showReviewEmpty("Aucune carte difficile à revoir maintenant. Tu peux lancer Entraînement libre pour réviser quand même.", scopedCards.length > 0);
    } else {
      showReviewEmpty(currentReviewCategory
        ? reviewEmptyScopeMessage()
        : "Aucune carte à entraîner.");
    }
  } else {
    showNextReviewCard();
  }
}

function reviewEmptyScopeMessage() {
  if (currentReviewCategory === FAVORITES_SCOPE) return "Aucune carte dans tes favoris.";
  return isMultiScope(currentReviewCategory) ? "Aucune carte dans cette sélection." : "Aucune carte dans ce deck.";
}

function setReviewSessionActive(active) {
  $("page-revision").classList.toggle("session-active", active);
  document.body.classList.toggle("review-session-active", active);
}

function reviewSessionLabelText() {
  const parts = [
    reviewSessionType === "free" ? "Entraînement libre" : "Cartes difficiles",
    scopeLabel(currentReviewCategory),
  ];
  if (currentReviewMode === "written") parts.push("Écrit");
  return parts.join(" · ");
}

function exitReviewSession() {
  reviewQueue = [];
  reviewHistory = [];
  currentCard = null;
  reviewSessionStats = null;
  isGrading = false;
  setReviewSessionActive(false);
  leaveReviewSession();
}

function leaveReviewSession() {
  if (reviewReturnPage && reviewReturnPage !== "revision") {
    const target = reviewReturnPage;
    reviewReturnPage = "dashboard";
    showPage(target);
    return;
  }
  showReviewHub();
}

function showReviewEmpty(message, canStartFreePractice = false) {
  currentCard = null;
  reviewHistory = [];
  setReviewSessionActive(false);
  $("review-hub").classList.add("hidden");
  $("review-area").classList.add("hidden");
  $("review-empty").classList.remove("hidden");
  $("review-empty-text").textContent = message;
  $("btn-start-free-practice").classList.toggle("hidden", !canStartFreePractice);
  $("session-summary").classList.add("hidden");
  $("session-summary").innerHTML = "";
}

function showSessionSummary() {
  const stats = reviewSessionStats || { seen: 0, markedDifficultIds: [] };
  const markedCount = new Set(stats.markedDifficultIds || []).size;
  setReviewSessionActive(false);
  reviewHistory = [];
  $("review-hub").classList.add("hidden");
  $("review-area").classList.add("hidden");
  $("review-empty").classList.remove("hidden");
  $("review-empty-text").textContent = "Résumé de séance";
  $("btn-start-free-practice").classList.add("hidden");
  $("session-summary").classList.remove("hidden");
  $("session-summary").innerHTML =
    '<div class="session-summary-grid">' +
      '<div><span>Cartes vues</span><strong>' + stats.seen + "</strong></div>" +
      '<div><span>Marquées difficiles</span><strong>' + markedCount + "</strong></div>" +
    "</div>" +
    '<p class="muted">Aucune progression automatique n’a été modifiée.</p>';
  $("session-summary").insertAdjacentHTML("beforeend", '<button class="btn btn-primary" type="button" data-review-hub-return>Retour</button>');
}

function buildReviewQueue(cards, options = {}) {
  const due = difficultCards(cards, { onlyDue: true });
  if (due.length > 0 || !options.fallbackAllActive) return due;
  return difficultCards(cards);
}

function buildFreePracticeQueue(cards) {
  const queue = [...cards];
  shuffleArray(queue);
  return queue;
}

function syncReviewNavButtons() {
  const prevBtn = $("btn-review-prev");
  const nextBtn = $("btn-review-next");
  if (!prevBtn || !nextBtn) return;
  const active = Boolean(currentCard) && isSessionRunning();
  prevBtn.disabled = !active || reviewHistory.length === 0 || isGrading;
  nextBtn.disabled = !active || isGrading;
}

async function renderReviewCard(card) {
  currentCard = card;
  $("review-empty").classList.add("hidden");
  $("review-area").classList.remove("hidden");
  setReviewSessionActive(true);
  $("review-session-label").textContent = reviewSessionLabelText();
  $("review-counter").textContent = "Cartes restantes : " + (reviewQueue.length + 1);

  $("review-category").textContent = "Catégorie : " + cardDeckName(currentCard);
  $("review-image").src = await getImageURL(currentCard.imageId);
  $("review-front-fr").textContent = currentCard.fr;
  $("review-front-hint").textContent = "Retrouve le mot allemand";

  $("review-answer").classList.add("hidden");
  $("review-feedback").classList.add("hidden");
  $("written-review").classList.add("hidden");
  $("written-article").value = "";
  $("written-word").value = "";
  $("btn-check-written").disabled = false;
  $("written-article").disabled = false;
  $("written-word").disabled = false;
  $("btn-free-next").classList.add("hidden");
  $("manual-review-actions").classList.add("hidden");
  syncAnswerDifficultButton(currentCard);
  syncAnswerFavoriteButton(currentCard);

  if (currentReviewMode === "written") {
    $("btn-show-answer").classList.add("hidden");
    $("review-front-hint").textContent = "Écris le mot allemand";
    $("written-review").classList.remove("hidden");
    $("written-article").focus();
  } else {
    $("btn-show-answer").classList.remove("hidden");
  }
  syncReviewNavButtons();
}

async function showNextReviewCard() {
  if (reviewQueue.length === 0) {
    showSessionSummary();
    return;
  }

  await renderReviewCard(reviewQueue.shift());
}

function normalizeTypedAnswer(value) {
  return value.trim().toLowerCase();
}

function rememberReviewCard(card = currentCard) {
  if (card) reviewHistory.push(card);
  syncReviewNavButtons();
}

async function navigateNextReviewCard() {
  if (isGrading || !currentCard) return;
  const card = currentCard;
  isGrading = true;
  try {
    updateSessionStats(card);
    rememberReviewCard(card);
    currentCard = null;
    await showNextReviewCard();
  } catch (error) {
    console.error("Echec de navigation vers la carte suivante :", error);
    currentCard = card;
    toast("Impossible de charger la carte suivante.");
  } finally {
    isGrading = false;
    syncReviewNavButtons();
  }
}

async function navigatePreviousReviewCard() {
  if (isGrading || !currentCard || reviewHistory.length === 0) return;
  const nextCurrent = currentCard;
  const previousCard = reviewHistory.pop();
  isGrading = true;
  try {
    reviewQueue.unshift(nextCurrent);
    await renderReviewCard(previousCard);
  } catch (error) {
    console.error("Echec de navigation vers la carte precedente :", error);
    reviewQueue.shift();
    reviewHistory.push(previousCard);
    currentCard = nextCurrent;
    toast("Impossible de charger la carte precedente.");
  } finally {
    isGrading = false;
    syncReviewNavButtons();
  }
}

function handleWrittenAnswer() {
  if (isGrading || !currentCard) return;

  const typedArticle = normalizeTypedAnswer($("written-article").value);
  const typedWord = normalizeTypedAnswer($("written-word").value);
  const expectedArticle = normalizeTypedAnswer(currentCard.article || "");
  const expectedWord = normalizeTypedAnswer(currentCard.de);
  const isCorrect = typedArticle === expectedArticle && typedWord === expectedWord;
  const correctAnswer = fullWord(currentCard);

  $("review-feedback").textContent = isCorrect
    ? "Bonne réponse"
    : "Réponse correcte : " + correctAnswer;
  $("review-feedback").className = "review-feedback " + (isCorrect ? "ok" : "ko");
  $("review-feedback").classList.remove("hidden");
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
  articleEl.textContent = card.article ? card.article : "";
  articleEl.className = card.article ? "art-" + card.article + " word-article" : "";
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
  const levelEl = $("answer-level");
  const level = cardLevel(card);
  if (level) {
    levelEl.textContent = level;
    levelEl.classList.remove("hidden");
  } else {
    levelEl.classList.add("hidden");
  }

  const caseEl = $("answer-case");
  const governedCase = cardGovernedCase(card);
  if (governedCase) {
    caseEl.textContent = governedCase === "Accusatif/Datif" ? "Acc. / Dat." : governedCase;
    caseEl.className = "chip chip-case " + governedCaseBadgeClass(governedCase);
  } else {
    caseEl.className = "chip chip-case hidden";
    caseEl.textContent = "";
  }

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
  const difficultMode = reviewSessionType === "due";
  $("manual-review-actions").classList.toggle("hidden", !difficultMode);
  $("btn-free-next").classList.toggle("hidden", !freeMode);
  syncAnswerDifficultButton(card);
  syncAnswerFavoriteButton(card);
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

function updateSessionStats(card = currentCard) {
  if (!reviewSessionStats) return;
  if (!card || !card.id) {
    reviewSessionStats.seen++;
    return;
  }
  if (!Array.isArray(reviewSessionStats.seenIds)) reviewSessionStats.seenIds = [];
  if (reviewSessionStats.seenIds.includes(card.id)) return;
  reviewSessionStats.seenIds.push(card.id);
  reviewSessionStats.seen = reviewSessionStats.seenIds.length;
}

async function handleGrade(grade) {
  if (isGrading || !currentCard) return;
  if (reviewSessionType === "due") return;

  isGrading = true;
  const card = currentCard;
  const originalCard = card;
  currentCard = null;

  try {
    await saveReviewLogSafely(card, grade);
    updateSessionStats(card);
    rememberReviewCard(card);
    await showNextReviewCard();
    refreshDashboard();
  } catch (error) {
    console.error("Erreur pendant l'enregistrement de la révision :", error);
    currentCard = originalCard;
    toast("Impossible d'enregistrer la réponse. Réessaie.");
  } finally {
    isGrading = false;
  }
}

function setupReviewPage() {
  $("btn-show-answer").addEventListener("click", showAnswer);
  $("btn-review-prev").addEventListener("click", navigatePreviousReviewCard);
  $("btn-review-next").addEventListener("click", navigateNextReviewCard);
  $("btn-review-exit").addEventListener("click", exitReviewSession);
  document.querySelectorAll("[data-hub-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      currentReviewMode = btn.dataset.hubMode;
      localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
      renderReviewHub();
    });
  });
  $("btn-review-page-hard").addEventListener("click", startDifficultDashboardReview);
  $("btn-review-page-manage-hard").addEventListener("click", openDifficultManager);
  $("review-difficult-list").addEventListener("click", (event) => {
    const rescheduleBtn = event.target.closest("[data-difficult-manage-reschedule]");
    if (rescheduleBtn) openDifficultModal(rescheduleBtn.dataset.difficultManageReschedule);
    const removeBtn = event.target.closest("[data-difficult-manage-remove]");
    if (removeBtn) removeDifficult(removeBtn.dataset.difficultManageRemove);
  });
  $("btn-hub-free").addEventListener("click", () => {
    if ($("btn-hub-free").disabled) return;
    currentReviewMode = currentReviewMode === "learning" ? "classic" : currentReviewMode;
    localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
    reviewSessionType = "free";
    $("review-hub").classList.add("hidden");
    startReviewSession();
  });
  $("session-summary").addEventListener("click", (event) => {
    if (event.target.closest("[data-review-hub-return]")) leaveReviewSession();
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
  $("manual-review-actions").addEventListener("click", async (event) => {
    if (!currentCard || isGrading) return;
    const removeBtn = event.target.closest("[data-difficult-session-remove]");
    if (removeBtn) {
      isGrading = true;
      try {
        const removed = await removeDifficult(currentCard.id);
        if (removed) await advanceManualReview();
      } finally {
        isGrading = false;
      }
      return;
    }
    const delayBtn = event.target.closest("[data-difficult-session-delay]");
    if (delayBtn) {
      isGrading = true;
      try {
        await handleDifficultDelay(currentCard.id, delayBtn.dataset.difficultSessionDelay, { nextCard: true });
      } finally {
        isGrading = false;
      }
    }
  });

  // Lire le mot avec son article : "der Hund"
  $("btn-answer-speak-word").addEventListener("click", () => {
    if (currentCard) speakGerman(fullWord(currentCard));
  });

  const handleCurrentCardFavoriteToggle = async () => {
    if (!currentCard) return;
    const updatedCard = await toggleFavorite(currentCard.id);
    if (updatedCard) {
      currentCard.favorite = updatedCard.favorite;
      currentCard.updatedAt = updatedCard.updatedAt;
    }
    syncAnswerFavoriteButton(currentCard);
  };
  $("btn-answer-favorite").addEventListener("click", handleCurrentCardFavoriteToggle);
  $("btn-written-favorite").addEventListener("click", handleCurrentCardFavoriteToggle);

  // Lire la phrase d'exemple : "Der Hund ist klein."
  $("btn-speak-sentence").addEventListener("click", () => {
    if (currentCard && currentCard.exampleDe) speakGerman(currentCard.exampleDe);
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

  if (event.code === "ArrowLeft") {
    event.preventDefault();
    navigatePreviousReviewCard();
    return;
  }

  if (event.code === "ArrowRight") {
    event.preventDefault();
    navigateNextReviewCard();
    return;
  }

  if (currentReviewMode === "written") return;

  const answerHidden = $("review-answer").classList.contains("hidden");

  if (event.code === "Space" && answerHidden) {
    event.preventDefault();
    showAnswer();
    return;
  }

  if (answerHidden) return;
  if (reviewSessionType === "free" && (event.code === "Space" || event.code === "Enter")) {
    event.preventDefault();
    handleGrade("good");
    return;
  }
  if (reviewSessionType === "free") return;
  if (reviewSessionType === "due") {
    const manualActions = {
      Digit1: "remove",
      Numpad1: "remove",
      Digit2: "10m",
      Numpad2: "10m",
      Digit3: "1h",
      Numpad3: "1h",
      Digit4: "evening",
      Numpad4: "evening",
      Digit5: "tomorrow",
      Numpad5: "tomorrow",
      Digit6: "3d",
      Numpad6: "3d",
      Digit7: "1w",
      Numpad7: "1w",
    };
    const action = manualActions[event.code];
    if (!action) return;
    event.preventDefault();
    isGrading = true;
    (async () => {
      try {
        if (action === "remove") {
          const removed = await removeDifficult(currentCard.id);
          if (removed) await advanceManualReview();
        } else {
          await handleDifficultDelay(currentCard.id, action, { nextCard: true });
        }
      } finally {
        isGrading = false;
      }
    })();
  }
}


/* =========================================================
   8. DÉTAIL D'UNE CARTE
   ========================================================= */

function cardDetailBadgesHTML(card) {
  return (
    '<div class="card-detail-badges">' +
      '<span class="chip chip-category">' + escapeHTML(cardDeckName(card)) + "</span>" +
      (card.subcategory ? subcategoryChipHTML(card, true) : "") +
      levelAndCaseBadgesHTML(card) +
      cardStatusHTML(card) +
    "</div>"
  );
}

function cardDetailHTML(card, imageUrl) {
  const pluralText = formatPlural(card);
  const pluralLine = pluralText
    ? '<p class="card-detail-plural">Pluriel : ' + escapeHTML(pluralText) + "</p>"
    : "";
  const exampleBlock = card.exampleDe || card.exampleFr
    ? '<div class="card-detail-example">' +
        '<div class="card-detail-example-head">' +
          '<strong>Exemple</strong>' +
          (card.exampleDe ? iconButtonHTML("icon-volume", { label: "Écouter la phrase", data: { speak: card.exampleDe } }) : "") +
        "</div>" +
        (card.exampleDe ? '<p class="card-detail-example-de">' + escapeHTML(card.exampleDe) + "</p>" : "") +
        (card.exampleFr ? '<p class="card-detail-example-fr">' + escapeHTML(card.exampleFr) + "</p>" : "") +
      "</div>"
    : "";

  return (
    '<div class="card-detail-layout" data-card-detail-id="' + escapeHTML(card.id) + '">' +
      '<div class="card-detail-image">' + cardImageHTML(card, imageUrl) + "</div>" +
      '<div class="card-detail-main">' +
        '<div class="card-detail-word-row">' +
          '<div>' +
            '<h2 id="card-detail-word">' + wordHTML(card) + "</h2>" +
            pluralLine +
          "</div>" +
          iconButtonHTML("icon-volume", { label: "Écouter le mot", data: { speak: fullWord(card) } }) +
        "</div>" +
        '<p class="card-detail-fr">' + escapeHTML(card.fr || "") + "</p>" +
        exampleBlock +
        cardDetailBadgesHTML(card) +
        '<div class="card-detail-actions">' +
          iconButtonHTML("icon-volume", { label: "Écouter", data: { speak: fullWord(card) } }) +
          iconButtonHTML("icon-heart", {
            label: "Favori",
            className: "btn-favorite " + (card.favorite ? "active" : ""),
            data: { "card-detail-favorite": card.id },
          }) +
          iconButtonHTML("icon-flame", {
            label: "Carte difficile",
            className: "btn-difficult " + (isDifficultActive(card) ? "active" : ""),
            data: { difficult: card.id },
          }) +
          iconButtonHTML("icon-layers", {
            label: "Ajouter à un pack",
            className: "btn-add-pack",
            data: { "card-detail-add-to-pack": card.id },
          }) +
          iconButtonHTML("icon-pencil", { label: "Modifier", className: "btn-edit", data: { "card-detail-edit": card.id } }) +
          iconButtonHTML("icon-trash", { label: "Supprimer", className: "btn-danger", data: { "card-detail-delete": card.id } }) +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

async function refreshCardDetailSheet() {
  if (!currentCardDetailId || $("card-detail-modal").classList.contains("hidden")) return;
  const card = await getCard(currentCardDetailId);
  if (!card) {
    closeCardDetailModal();
    return;
  }
  const imageUrl = await getImageURL(card.imageId);
  $("card-detail-content").innerHTML = cardDetailHTML(card, imageUrl);
}

async function openCardDetailModal(cardId) {
  try {
    const card = await getCard(cardId);
    if (!card) return;
    currentCardDetailId = card.id;
    cardDetailDirty = false;
    const imageUrl = await getImageURL(card.imageId);
    $("card-detail-content").innerHTML = cardDetailHTML(card, imageUrl);
    showModal("card-detail-modal");
  } catch (error) {
    console.error("Échec d'ouverture du détail de carte :", error);
    toast("Impossible d'ouvrir le détail de cette carte.");
  }
}

function refreshAfterCardDetailChange() {
  renderLibraryIfVisible();
  renderFavoritesPageIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();
  renderLearningIfVisible();
  refreshDashboard();
  renderReviewHubIfVisible();
}

function closeCardDetailModal() {
  const shouldRefresh = cardDetailDirty;
  hideModal("card-detail-modal");
  $("card-detail-content").innerHTML = "";
  currentCardDetailId = null;
  cardDetailDirty = false;
  cardDetailTouchStartY = null;
  if (shouldRefresh) refreshAfterCardDetailChange();
}

function attachCardDetailOpenHandlers(container, selector, isSelectionModeActive) {
  container.querySelectorAll(selector).forEach((cardEl) => {
    cardEl.addEventListener("click", (event) => {
      if (wasLongPressJustFired()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (isSelectionModeActive() || isInteractiveTarget(event.target)) return;
      const cardId = cardEl.dataset.librarySelectCard || cardEl.dataset.deckSelectCard;
      if (!cardId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openCardDetailModal(cardId);
    }, true);
  });
}


/* =========================================================
   9. AJOUTER UNE CARTE
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
  $("f-de").addEventListener("input", () => {
    syncVerbSubcategoryPrefill();
    syncGovernedCasePrefill();
  });
  $("f-category").addEventListener("input", debounce(() => {
    refreshSubcategorySuggestions();
    syncVerbSubcategoryPrefill();
    syncGovernedCasePrefill();
  }, 150));
  $("f-subcategory").addEventListener("input", () => {
    if ($("f-subcategory").value !== verbSubcategoryAutofillValue) verbSubcategoryAutofillValue = "";
    syncGovernedCasePrefill();
  });
  $("f-case").addEventListener("change", () => {
    if ($("f-case").value !== governedCaseAutofillValue) governedCaseAutofillValue = "";
  });
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
      level: $("f-level").value,
      governedCase: $("f-case").value,
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
    renderFavoritesPageIfVisible();
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
  verbSubcategoryAutofillValue = "";
  governedCaseAutofillValue = "";

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
  syncVerbSubcategoryPrefill();
  syncGovernedCasePrefill();
}

function syncVerbSubcategoryPrefill() {
  if (editingCard) return;
  const category = $("f-category").value.trim();
  const subcategoryInput = $("f-subcategory");
  if (category.toLowerCase() !== VERB_CATEGORY_NAME.toLowerCase()) {
    if (verbSubcategoryAutofillValue && subcategoryInput.value === verbSubcategoryAutofillValue) {
      subcategoryInput.value = "";
    }
    verbSubcategoryAutofillValue = "";
    return;
  }

  const suggestion = classifyVerb($("f-de").value);
  if (!suggestion) return;
  if (!subcategoryInput.value || subcategoryInput.value === verbSubcategoryAutofillValue) {
    subcategoryInput.value = suggestion;
    verbSubcategoryAutofillValue = suggestion;
  }
}

function syncGovernedCasePrefill() {
  const caseSelect = $("f-case");
  const suggestion = suggestedGovernedCaseForCardData({
    de: $("f-de").value,
    category: $("f-category").value,
    subcategory: $("f-subcategory").value,
  });

  if (!suggestion) {
    if (governedCaseAutofillValue && caseSelect.value === governedCaseAutofillValue) {
      caseSelect.value = "";
    }
    governedCaseAutofillValue = "";
    return;
  }

  if (!caseSelect.value || caseSelect.value === governedCaseAutofillValue) {
    caseSelect.value = suggestion;
    governedCaseAutofillValue = suggestion;
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
  verbSubcategoryAutofillValue = "";
  governedCaseAutofillValue = "";
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
  $("f-level").value = cardLevel(card);
  $("f-case").value = cardGovernedCase(card);
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
  fillLevelSelect($("filter-level"), $("filter-level").value);
  updateLibraryStats(allCards);
  updateLibraryControls();

  // Filtres actifs
  const query = $("search-input").value.trim().toLowerCase();
  const category = $("filter-category").value;
  const subcategory = $("filter-subcategory").value;
  const level = $("filter-level").value;
  const sortMode = $("library-sort").value;

  const visibleCards = allCards
    .filter((card) => {
      const matchesCategory = !category || cardDeckName(card) === category;
      const matchesSubcategory = !subcategory || (subcategory === "__none__" ? !card.subcategory : card.subcategory === subcategory);
      const matchesLevel = matchesLevelFilter(card, level);
      const matchesFavorites = !libraryOnlyFavorites || card.favorite === true;
      const matchesNoImage = !libraryOnlyNoImage || !card.imageId;
      const matchesDue = !libraryOnlyDue || isDifficultDue(card);
      return matchesCardQuery(card, query) &&
        matchesCategory &&
        matchesSubcategory &&
        matchesLevel &&
        matchesFavorites &&
        matchesNoImage &&
        matchesDue;
    })
    .sort((a, b) => sortLibraryCards(a, b, sortMode));
  visibleLibraryCardIds = visibleCards.map((card) => card.id);
  selectedLibraryCardIds = new Set([...selectedLibraryCardIds].filter((id) => visibleLibraryCardIds.includes(id)));
  updateLibraryBulkBar();

  const favoritesBar = $("library-favorites-bar");
  const favoriteCount = allCards.filter((card) => card.favorite === true).length;
  const showBar = libraryOnlyFavorites && favoriteCount > 0;
  favoritesBar.classList.toggle("hidden", !showBar);
  if (showBar) {
    $("library-favorites-label").textContent =
      favoriteCount + " carte" + (favoriteCount > 1 ? "s" : "") + " en favori";
  }

  $("library-count").textContent =
    visibleCards.length + " carte(s) affichée(s) sur " + allCards.length;

  const view = getLibraryView();
  $("library-grid").className = view === "list" ? "library-list" : "library-grid";

  if (visibleCards.length === 0) {
    $("library-grid").innerHTML =
      '<p class="muted">Aucune carte ne correspond. Essaie une autre recherche, ou ajoute des cartes !</p>';
    return;
  }

  // On récupère toutes les URLs d'images d'un coup, puis on construit la grille
  const imageUrls = await Promise.all(visibleCards.map((card) => getImageURL(card.imageId)));
  if (version !== libraryRenderVersion) return;

  const container = $("library-grid");
  container.innerHTML = visibleCards
    .map((card, index) => view === "list"
      ? libraryRowHTML(card, imageUrls[index])
      : libraryItemHTML(card, imageUrls[index]))
    .join("");

  // Branche les boutons "supprimer" qui viennent d'être créés
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete));
  });

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.edit));
  });

  container.querySelectorAll("[data-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.favorite));
  });

  container.querySelectorAll("[data-add-to-pack]").forEach((btn) => {
    btn.addEventListener("click", () => openAddToPackModal([btn.dataset.addToPack]));
  });

  container.querySelectorAll("[data-library-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setLibraryCardSelected(checkbox.dataset.librarySelect, checkbox.checked);
    });
  });

  container.querySelectorAll("[data-library-select-card]").forEach((cardEl) => {
    cardEl.addEventListener("click", (event) => {
      if (wasLongPressJustFired()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!librarySelectionMode || isInteractiveTarget(event.target)) return;
      const id = cardEl.dataset.librarySelectCard;
      setLibraryCardSelected(id, !selectedLibraryCardIds.has(id));
      renderLibrary();
    });

    attachLongPress(cardEl, () => {
      const id = cardEl.dataset.librarySelectCard;
      if (!librarySelectionMode) {
        librarySelectionMode = true;
        selectedLibraryCardIds.add(id);
        syncSelectionModeClass();
        renderLibrary();
        return;
      }
      setLibraryCardSelected(id, !selectedLibraryCardIds.has(id));
      renderLibrary();
    });
  });

  attachCardDetailOpenHandlers(container, "[data-library-select-card]", () => librarySelectionMode);
  attachImageActionHandlers(container);
  attachImageDropHandlers(container);
}

function renderLibraryIfVisible() {
  if ($("page-bibliotheque").classList.contains("active")) renderLibrary();
}

async function renderFavoritesPage() {
  const cards = await getAllCards();
  const favorites = cards
    .filter((card) => card.favorite === true)
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.id || "").localeCompare(String(a.updatedAt || a.createdAt || a.id || "")));
  const hero = document.querySelector("#page-favoris .favorites-hero");
  const empty = $("favorites-empty");
  const container = $("favorites-grid");
  const view = getLibraryView();

  $("fav-total").textContent = favorites.length;
  const favoriteHardStats = difficultStats(favorites);
  $("fav-hard").textContent = favoriteHardStats.activeCount;
  $("fav-due").textContent = favoriteHardStats.dueCount;
  if (hero) hero.classList.toggle("hidden", favorites.length === 0);
  empty.classList.toggle("hidden", favorites.length > 0);
  container.className = view === "list" ? "library-list" : "library-grid";

  if (favorites.length === 0) {
    container.innerHTML = "";
    return;
  }

  const imageUrls = await Promise.all(favorites.map((card) => getImageURL(card.imageId)));
  container.innerHTML = favorites
    .map((card, index) => view === "list"
      ? libraryRowHTML(card, imageUrls[index])
      : libraryItemHTML(card, imageUrls[index]))
    .join("");

  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete));
  });
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEditCard(btn.dataset.edit));
  });
  container.querySelectorAll("[data-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.favorite));
  });
  container.querySelectorAll("[data-add-to-pack]").forEach((btn) => {
    btn.addEventListener("click", () => openAddToPackModal([btn.dataset.addToPack]));
  });

  attachCardDetailOpenHandlers(container, "[data-library-select-card]", () => false);
  attachImageActionHandlers(container);
  attachImageDropHandlers(container);
}

function renderFavoritesPageIfVisible() {
  if ($("page-favoris").classList.contains("active")) renderFavoritesPage();
}

function getLibraryView() {
  return localStorage.getItem(LS_LIBRARY_VIEW) === "list" ? "list" : "grid";
}

function setLibraryView(view) {
  localStorage.setItem(LS_LIBRARY_VIEW, view === "list" ? "list" : "grid");
  renderLibrary();
}

function toggleLibrarySelectionMode() {
  librarySelectionMode = !librarySelectionMode;
  if (!librarySelectionMode) selectedLibraryCardIds.clear();
  syncSelectionModeClass();
  renderLibrary();
}

function setLibraryCardSelected(cardId, selected) {
  if (selected) {
    selectedLibraryCardIds.add(cardId);
  } else {
    selectedLibraryCardIds.delete(cardId);
  }
  syncSelectionModeClass();
  updateLibraryBulkBar();
}

function selectAllVisibleLibraryCards() {
  visibleLibraryCardIds.forEach((id) => selectedLibraryCardIds.add(id));
  renderLibrary();
}

function clearLibrarySelection() {
  selectedLibraryCardIds.clear();
  librarySelectionMode = false;
  syncSelectionModeClass();
  renderLibrary();
}

function updateLibraryBulkBar() {
  syncSelectionModeClass();
  $("btn-library-select").textContent = librarySelectionMode ? "Annuler sélection" : "Sélectionner";
  $("library-bulk-bar").classList.toggle("hidden", !librarySelectionMode);
  const count = selectedLibraryCardIds.size;
  $("library-bulk-count").textContent = count + " carte" + (count > 1 ? "s" : "") + " sélectionnée" + (count > 1 ? "s" : "");
  $("btn-library-add-to-pack").disabled = count === 0;
  $("btn-library-clear").textContent = "Annuler";
  $("btn-library-select-all").disabled = visibleLibraryCardIds.length === 0;
}

function updateLibraryStats(cards) {
  $("library-stat-total").textContent = cards.length;
  const stats = difficultStats(cards);
  $("library-stat-hard").textContent = stats.activeCount;
  $("library-stat-due").textContent = stats.dueCount;
  $("library-stat-favorites").textContent = cards.filter((card) => card.favorite === true).length;
}

function getLibraryActiveFilterCount() {
  let count = 0;
  if ($("search-input").value.trim()) count++;
  if ($("filter-category").value) count++;
  if ($("filter-subcategory").value) count++;
  if ($("filter-level").value) count++;
  if ($("library-sort").value && $("library-sort").value !== "recent") count++;
  if (libraryOnlyFavorites) count++;
  if (libraryOnlyNoImage) count++;
  if (libraryOnlyDue) count++;
  return count;
}

function syncLibraryFilterCollapse() {
  const activeCount = getLibraryActiveFilterCount();
  $("library-filter-panel").classList.toggle("expanded", libraryFiltersOpen);
  $("btn-library-filters-toggle").setAttribute("aria-expanded", String(libraryFiltersOpen));
  $("library-filters-label").textContent = activeCount > 0 ? "Filtres · " + activeCount : "Filtres";
  $("btn-library-filters-reset").classList.toggle("hidden", activeCount === 0);
}

function resetLibraryFilters() {
  $("search-input").value = "";
  $("filter-category").value = "";
  $("filter-subcategory").value = "";
  $("filter-level").value = "";
  $("library-sort").value = "recent";
  libraryOnlyFavorites = false;
  libraryOnlyNoImage = false;
  libraryOnlyDue = false;
  renderLibrary();
}

function updateLibraryControls() {
  $("library-filter-favorites").classList.toggle("active", libraryOnlyFavorites);
  $("library-filter-no-image").classList.toggle("active", libraryOnlyNoImage);
  $("library-filter-due").classList.toggle("active", libraryOnlyDue);
  const view = getLibraryView();
  $("library-view-grid").classList.toggle("active", view === "grid");
  $("library-view-list").classList.toggle("active", view === "list");
  syncLibraryFilterCollapse();
}

function sortLibraryCards(a, b, sortMode) {
  if (sortMode === "az") {
    return fullWord(a).localeCompare(fullWord(b), "de");
  }
  if (sortMode === "hard") {
    const activeDiff = Number(isDifficultActive(b)) - Number(isDifficultActive(a));
    const dueDiff = String(cardDifficult(a).dueAt || "9999").localeCompare(String(cardDifficult(b).dueAt || "9999"));
    return activeDiff || dueDiff || fullWord(a).localeCompare(fullWord(b), "de");
  }
  if (sortMode === "due") {
    const dueDiff = String(cardDifficult(a).dueAt || "9999").localeCompare(String(cardDifficult(b).dueAt || "9999"));
    return dueDiff || fullWord(a).localeCompare(fullWord(b), "de");
  }
  const aDate = a.createdAt || a.id || "";
  const bDate = b.createdAt || b.id || "";
  return bDate.localeCompare(aDate) || String(b.id || "").localeCompare(String(a.id || ""));
}

function cardStatusMeta(card) {
  if (!isDifficultActive(card)) return null;
  return { label: "Difficile", className: isDifficultDue(card) ? "status-due" : "status-hard" };
}

function cardStatusHTML(card) {
  const status = cardStatusMeta(card);
  if (!status) return "";
  return (
    '<span class="card-status ' + status.className + '">' +
      '<span class="card-status-dot"></span>' +
      escapeHTML(status.label) +
    "</span>"
  );
}

function libraryImageSearchButton(card) {
  if (card.imageId) return "";
  const query = getEffectiveImageQuery(card);
  if (!query) return "";
  return '<a class="btn btn-small btn-ghost image-query-action" href="' + imageSearchURL(query) + '" target="dfs-images" rel="noopener noreferrer" title="Trouver une image">Trouver image</a>';
}

function iconButtonHTML(iconId, options = {}) {
  const attrs = Object.entries(options.data || {})
    .map(([key, value]) => ' data-' + key + '="' + escapeHTML(value) + '"')
    .join("");
  const classes = "btn btn-icon btn-small " + (options.className || "");
  return '<button class="' + classes.trim() + '" type="button"' + attrs +
    ' title="' + escapeHTML(options.label) + '" aria-label="' + escapeHTML(options.label) + '">' +
    '<svg class="btn-svg-icon" focusable="false" aria-hidden="true"><use href="#' + iconId + '"></use></svg>' +
    "</button>";
}

function cardActionsHTML(card, options = {}) {
  return '<div class="card-actions">' +
    iconButtonHTML("icon-volume", { label: "Écouter", data: { speak: fullWord(card) } }) +
    iconButtonHTML("icon-flame", {
      label: "Carte difficile",
      className: "btn-difficult " + (isDifficultActive(card) ? "active" : ""),
      data: { difficult: card.id },
    }) +
    iconButtonHTML("icon-heart", {
      label: "Favori",
      className: "btn-favorite " + (card.favorite ? "active" : ""),
      data: { favorite: card.id },
    }) +
    (card.imageId ? "" : iconButtonHTML("icon-image-plus", {
      label: "Ajouter une image",
      className: "btn-image-action",
      data: { "pick-image": card.id },
    })) +
    (options.subcategory ? iconButtonHTML("icon-swap", {
      label: "Changer la sous-catégorie",
      data: { "deck-detail-sub-edit": card.id },
    }) : "") +
    (options.addToPack ? iconButtonHTML("icon-layers", {
      label: "Ajouter à un pack",
      className: "btn-add-pack",
      data: { "add-to-pack": card.id },
    }) : "") +
    (options.extraActions || "") +
    iconButtonHTML("icon-pencil", { label: "Modifier", className: "btn-edit", data: { edit: card.id } }) +
    iconButtonHTML("icon-trash", { label: "Supprimer", className: "btn-danger", data: { delete: card.id } }) +
  "</div>";
}

function imagePickButtonHTML(card, compact = false) {
  if (card.imageId) return "";
  return '<button class="btn btn-small ' + (compact ? "btn-icon " : "") + 'btn-primary" type="button" data-pick-image="' + escapeHTML(card.id) + '" title="Choisir une image" aria-label="Choisir une image"><svg class="btn-svg-icon"><use href="#icon-upload"></use></svg>' + (compact ? "" : " Choisir une image") + "</button>";
}

function imagePasteButtonHTML(card, compact = false) {
  if (card.imageId) return "";
  return '<button class="btn btn-small ' + (compact ? "btn-icon " : "btn-ghost ") + '" type="button" data-paste-image="' + escapeHTML(card.id) + '" title="Coller une image" aria-label="Coller une image"><svg class="btn-svg-icon"><use href="#icon-clipboard"></use></svg>' + (compact ? "" : " Coller") + "</button>";
}

function libraryMetaHTML(card) {
  return (
    '<div class="library-card-meta">' +
      '<span class="chip chip-category">' + escapeHTML(cardDeckName(card)) + "</span>" +
      levelAndCaseBadgesHTML(card) +
      (card.subcategory ? subcategoryChipHTML(card, true) : "") +
      cardStatusHTML(card) +
    "</div>"
  );
}

function libraryItemHTML(card, imageUrl) {
  const pluralText = formatPlural(card);
  const pluralLine = pluralText
    ? '<p class="library-plural">Pluriel : ' + escapeHTML(pluralText) + "</p>"
    : "";
  const selected = selectedLibraryCardIds.has(card.id);
  const selectBox = librarySelectionMode
    ? '<label class="deck-detail-select library-select" title="Sélectionner"><input type="checkbox" data-library-select="' + escapeHTML(card.id) + '"' + (selected ? " checked" : "") + '><span></span></label>'
    : "";
  return (
    '<article class="library-item' + (selected ? " selected" : "") + '" data-library-select-card="' + escapeHTML(card.id) + '" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      selectBox +
      cardImageHTML(card, imageUrl) +
      '<div class="library-body">' +
        '<p class="library-fr">' + escapeHTML(card.fr) + "</p>" +
        '<div class="library-word">' + wordHTML(card) + "</div>" +
        pluralLine +
        imageQueryHTML(card) +
        '<div class="library-card-footer">' +
          libraryMetaHTML(card) +
        "</div>" +
      "</div>" +
      cardActionsHTML(card, { addToPack: true }) +
    "</article>"
  );
}

function libraryRowThumbHTML(card, imageUrl) {
  if (card.imageId) {
    return '<img class="library-row-thumb" src="' + imageUrl + '" alt="Illustration de ' + escapeHTML(card.fr || card.de) + '">';
  }
  return (
    '<div class="library-row-thumb smart-placeholder" aria-label="Image manquante">' +
      '<span class="smart-placeholder-emoji">' + deckPlaceholderMark(card) + "</span>" +
    "</div>"
  );
}

function libraryRowHTML(card, imageUrl) {
  const pluralText = formatPlural(card);
  const pluralLine = pluralText ? '<span>Pluriel : ' + escapeHTML(pluralText) + '</span>' : "";
  const selected = selectedLibraryCardIds.has(card.id);
  const selectBox = librarySelectionMode
    ? '<label class="deck-detail-select library-select" title="Sélectionner"><input type="checkbox" data-library-select="' + escapeHTML(card.id) + '"' + (selected ? " checked" : "") + '><span></span></label>'
    : "";
  return (
    '<article class="library-row' + (selected ? " selected" : "") + '" data-library-select-card="' + escapeHTML(card.id) + '" data-image-target-card="' + escapeHTML(card.id) + '"' + imageSearchDataAttribute(card) + ' tabindex="0">' +
      selectBox +
      libraryRowThumbHTML(card, imageUrl) +
      '<div class="library-row-main">' +
        '<div class="library-row-word">' + wordHTML(card) + "</div>" +
        '<div class="library-row-fr">' + escapeHTML(card.fr) + "</div>" +
        '<div class="library-row-meta">' +
          '<span>' + escapeHTML(cardDeckName(card)) + "</span>" +
          levelAndCaseBadgesHTML(card) +
          (card.subcategory ? '<span>' + escapeHTML(card.subcategory) + "</span>" : "") +
          pluralLine +
        "</div>" +
        imageQueryHTML(card) +
      "</div>" +
      '<div class="library-row-status">' + cardStatusHTML(card) + "</div>" +
      cardActionsHTML(card, { addToPack: true }) +
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
  attachImageActionHandlers($("missing-images-grid"));
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
  if (window.matchMedia("(min-width: 801px)").matches) openImageSearchForCard(nextCard);
}

function missingImageCardHTML(card) {
  const subcategory = card.subcategory
    ? '<span class="chip chip-subcategory chip-subcategory-compact">' + escapeHTML(card.subcategory) + "</span>"
    : "";
  const query = getEffectiveImageQuery(card);
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
        imageQueryHTML(card, false) +
      "</div>" +
      '<div class="missing-image-actions">' +
        (query ? '<a class="btn btn-small btn-ghost" href="' + imageSearchURL(query) + '" target="dfs-images" rel="noopener noreferrer"><svg class="btn-svg-icon"><use href="#icon-search"></use></svg> Trouver</a>' : "") +
        imagePickButtonHTML(card) +
        imagePasteButtonHTML(card) +
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
  try {
    const card = await getCard(cardId);
    if (!card) return;

    card.favorite = !card.favorite;
    card.updatedAt = todayISO();
    await saveCard(card);
    renderLibraryIfVisible();
    renderFavoritesPageIfVisible();
    renderLearningIfVisible();
    renderDeckDetailIfVisible();
    renderMissingImagesIfVisible();
    refreshDashboard();
    if ($("page-revision").classList.contains("active") && !isSessionRunning()) renderReviewHub();
    return card;
  } catch (error) {
    console.error("Échec de modification du favori :", error);
    toast("Impossible de modifier le favori.");
    return null;
  }
}

function syncAnswerFavoriteButton(card) {
  if (!card) return;
  const isFavorite = card.favorite === true;
  ["btn-answer-favorite", "btn-written-favorite"].forEach((id) => {
    const btn = $(id);
    if (!btn) return;
    btn.classList.toggle("active", isFavorite);
    btn.setAttribute("aria-pressed", String(isFavorite));
    btn.title = isFavorite ? "Retirer des favoris" : "Ajouter aux favoris";
    btn.setAttribute("aria-label", btn.title);
  });
}

function syncAnswerDifficultButton(card) {
  const btn = $("btn-answer-difficult");
  if (!btn || !card) return;
  btn.classList.toggle("active", isDifficultActive(card));
  btn.dataset.difficult = card.id;
}

async function refreshAfterDifficultChange() {
  refreshDashboard();
  renderLibraryIfVisible();
  renderFavoritesPageIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();
  renderLearningIfVisible();
  renderReviewHubIfVisible();
  await refreshCardDetailSheet();
  if (currentCard) syncAnswerDifficultButton(currentCard);
  if (!$("difficult-modal").classList.contains("hidden") && difficultManageCards.length) {
    await renderDifficultManageList();
  }
}

async function openDifficultModal(cardId) {
  try {
    const card = await getCard(cardId);
    if (!card) return;
    pendingDifficultCardId = card.id;
    difficultManageCards = [];
    const active = isDifficultActive(card);
    $("difficult-modal-title").textContent = active ? "Reprogrammer cette carte" : "Revoir cette carte dans :";
    $("difficult-modal-card").textContent = fullWord(card) + " · " + (card.fr || cardDeckName(card));
    $("difficult-schedule-grid").classList.remove("hidden");
    $("difficult-custom-row").classList.remove("hidden");
    $("difficult-custom-datetime").value = localDateTimeValue(dateFromDelayKey("1h"));
    $("difficult-manage-list").classList.add("hidden");
    $("btn-difficult-remove").classList.toggle("hidden", !active);
    showModal("difficult-modal");
  } catch (error) {
    console.error("Échec d'ouverture de la programmation difficile :", error);
    toast("Impossible d'ouvrir cette carte difficile.");
  }
}

function closeDifficultModal() {
  hideModal("difficult-modal");
  pendingDifficultCardId = null;
  difficultManageCards = [];
}

async function saveDifficultSchedule(cardId, dueAt) {
  try {
    const card = await getCard(cardId);
    if (!card || !isValidDateTime(dueAt)) return;
    const wasActive = isDifficultActive(card);
    setCardDifficult(card, dueAt);
    await updateCard(card);
    if (!wasActive && reviewSessionStats && !reviewSessionStats.markedDifficultIds.includes(card.id)) {
      reviewSessionStats.markedDifficultIds.push(card.id);
    }
    if (currentCard && currentCard.id === card.id) currentCard = card;
    toast("Carte difficile programmée : " + formatDifficultDue(card.difficult.dueAt) + ".");
    await refreshAfterDifficultChange();
    return true;
  } catch (error) {
    console.error("Échec de programmation difficile :", error);
    toast("Impossible de programmer cette carte.");
    return false;
  }
}

async function removeDifficult(cardId) {
  try {
    const card = await getCard(cardId);
    if (!card) return;
    clearCardDifficult(card);
    await updateCard(card);
    if (currentCard && currentCard.id === card.id) currentCard = card;
    toast("Carte retirée des difficiles.");
    await refreshAfterDifficultChange();
    return true;
  } catch (error) {
    console.error("Échec de retrait difficile :", error);
    toast("Impossible de retirer cette carte des difficiles.");
    return false;
  }
}

async function handleDifficultDelay(cardId, delayKey, options = {}) {
  const due = dateFromDelayKey(delayKey);
  if (!due) return;
  const saved = await saveDifficultSchedule(cardId, due.toISOString());
  if (!saved) return;
  if (options.nextCard) {
    await advanceManualReview();
  } else if (!difficultManageCards.length) {
    closeDifficultModal();
  }
}

async function saveDifficultCustomDate() {
  if (!pendingDifficultCardId) return;
  const raw = $("difficult-custom-datetime").value;
  if (!raw) {
    toast("Choisis une date et une heure.");
    return;
  }
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) {
    toast("Date invalide.");
    return;
  }
  const saved = await saveDifficultSchedule(pendingDifficultCardId, due.toISOString());
  if (!saved) return;
  closeDifficultModal();
}

async function openDifficultManager() {
  try {
    const cards = await getAllCards();
    difficultManageCards = difficultCards(cards);
    pendingDifficultCardId = null;
    $("difficult-modal-title").textContent = "Cartes difficiles";
    $("difficult-modal-card").textContent = difficultManageCards.length
      ? difficultManageCards.length + " carte" + (difficultManageCards.length > 1 ? "s" : "") + " programmée" + (difficultManageCards.length > 1 ? "s" : "")
      : "Aucune carte difficile programmée.";
    $("difficult-schedule-grid").classList.add("hidden");
    $("difficult-custom-row").classList.add("hidden");
    $("btn-difficult-remove").classList.add("hidden");
    $("difficult-custom-datetime").value = "";
    $("difficult-manage-list").classList.remove("hidden");
    showModal("difficult-modal");
    await renderDifficultManageList();
  } catch (error) {
    console.error("Échec d'ouverture des cartes difficiles :", error);
    toast("Impossible d'ouvrir les cartes difficiles.");
  }
}

async function renderDifficultManageList() {
  try {
    const cards = difficultCards(await getAllCards());
    difficultManageCards = cards;
    $("difficult-manage-list").innerHTML = difficultManageRowsHTML(cards);
  } catch (error) {
    console.error("Échec d'affichage des cartes difficiles :", error);
    $("difficult-manage-list").innerHTML = '<p class="muted">Impossible de charger les cartes difficiles.</p>';
    toast("Impossible de charger les cartes difficiles.");
  }
}

function difficultManageRowsHTML(cards) {
  return cards.length
    ? cards.map((card) => {
      const difficult = cardDifficult(card);
      return '<div class="difficult-manage-row">' +
        '<div><strong>' + escapeHTML(fullWord(card)) + '</strong><span>' + escapeHTML(card.fr || cardDeckName(card)) + ' · ' + escapeHTML(formatDifficultDue(difficult.dueAt)) + '</span></div>' +
        '<div class="difficult-manage-actions">' +
          '<button class="btn btn-ghost btn-small" type="button" data-difficult-manage-reschedule="' + escapeHTML(card.id) + '">Reprogrammer</button>' +
          '<button class="btn btn-danger-action btn-small" type="button" data-difficult-manage-remove="' + escapeHTML(card.id) + '">Retirer</button>' +
        '</div>' +
      '</div>';
    }).join("")
    : '<p class="muted">Aucune carte difficile programmée.</p>';
}

async function startDifficultDashboardReview() {
  try {
    const cards = await getAllCards();
    const stats = difficultStats(cards);
    if (stats.activeCount === 0) {
      toast("Aucune carte difficile pour le moment.");
      return;
    }
    currentReviewCategory = null;
    reviewSessionType = "due";
    currentReviewMode = "classic";
    localStorage.setItem(LS_REVIEW_MODE, currentReviewMode);
    difficultReviewFallbackAllOnce = stats.dueCount === 0;
    skipHubOnce = true;
    reviewReturnPage = "dashboard";
    showPage("revision");
  } catch (error) {
    console.error("Échec de lancement des difficiles :", error);
    toast("Impossible de lancer la révision des difficiles.");
  }
}

async function advanceManualReview(card = currentCard) {
  try {
    updateSessionStats(card);
    rememberReviewCard(card);
    currentCard = null;
    await showNextReviewCard();
    await refreshAfterDifficultChange();
  } catch (error) {
    console.error("Échec d'avancement de la révision :", error);
    toast("Impossible de charger la carte suivante.");
  }
}

async function handleDelete(cardId) {
  try {
    const card = await getCard(cardId);
    if (!card) return;

    const confirmed = confirm('Supprimer la carte « ' + fullWord(card) + ' » ?');
    if (!confirmed) return;

    await deleteCard(card.id);

    await deleteImageIfUnused(card.imageId);

    toast("Carte supprimée.");
    renderLibrary();
    renderFavoritesPageIfVisible();
    refreshDashboard();
    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
    renderLearningIfVisible();
    renderDeckDetailIfVisible();
    renderMissingImagesIfVisible();
  } catch (error) {
    console.error("Échec de suppression de carte :", error);
    toast("Impossible de supprimer cette carte.");
  }
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

function fillLevelSelect(select, currentValue) {
  select.innerHTML =
    '<option value="">Tous les niveaux</option>' +
    '<option value="__none__">Sans niveau</option>' +
    CEFR_LEVELS.map((level) => '<option value="' + level + '">' + level + "</option>").join("");
  select.value = currentValue === "__none__" || CEFR_LEVELS.includes(currentValue) ? currentValue : "";
}

function matchesLevelFilter(card, level) {
  if (!level) return true;
  const currentLevel = cardLevel(card);
  return level === "__none__" ? !currentLevel : currentLevel === level;
}

function setupLibraryPage() {
  const debouncedRenderLibrary = debounce(renderLibrary, 150);
  $("btn-library-filters-toggle").addEventListener("click", () => {
    libraryFiltersOpen = !libraryFiltersOpen;
    localStorage.setItem(LS_LIBRARY_FILTERS_OPEN, libraryFiltersOpen ? "1" : "0");
    syncLibraryFilterCollapse();
  });
  $("btn-library-filters-reset").addEventListener("click", resetLibraryFilters);
  $("search-input").addEventListener("input", () => {
    syncLibraryFilterCollapse();
    debouncedRenderLibrary();
  });
  $("filter-category").addEventListener("change", renderLibrary);
  $("filter-subcategory").addEventListener("change", renderLibrary);
  $("filter-level").addEventListener("change", renderLibrary);
  $("library-sort").addEventListener("change", renderLibrary);
  $("library-filter-favorites").addEventListener("click", () => {
    libraryOnlyFavorites = !libraryOnlyFavorites;
    renderLibrary();
  });
  $("library-filter-no-image").addEventListener("click", () => {
    libraryOnlyNoImage = !libraryOnlyNoImage;
    renderLibrary();
  });
  $("library-filter-due").addEventListener("click", () => {
    libraryOnlyDue = !libraryOnlyDue;
    renderLibrary();
  });
  $("library-view-grid").addEventListener("click", () => setLibraryView("grid"));
  $("library-view-list").addEventListener("click", () => setLibraryView("list"));
  $("btn-library-select").addEventListener("click", toggleLibrarySelectionMode);
  $("btn-library-select-all").addEventListener("click", selectAllVisibleLibraryCards);
  $("btn-library-clear").addEventListener("click", clearLibrarySelection);
  $("btn-library-add-to-pack").addEventListener("click", () => openAddToPackModal([...selectedLibraryCardIds]));
  $("btn-review-favorites").addEventListener("click", () => {
    currentReviewCategory = FAVORITES_SCOPE;
    showPage("revision");
  });
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

  if (pendingLearningCategory !== null) {
    currentLearningScope = normalizeScope(pendingLearningCategory);
    pendingLearningCategory = null;
    resetIndex = true;
  }

  if (resetIndex) currentLearningIndex = 0;

  $("learning-scope-title").textContent = "Découverte : " + scopeLabel(currentLearningScope);
  document.querySelectorAll("[data-learning-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.learningFilter === (learningOnlyNew ? "new" : "all"));
  });

  const scopedCards = allCards.filter((card) => cardInScope(card, currentLearningScope));
  learningCards = scopedCards
    .filter((card) => !learningOnlyNew || isNewCard(card))
    .sort((a, b) => fullWord(a).localeCompare(fullWord(b), "de"));

  if (learningOnlyNew && learningCards.length === 0 && scopedCards.length > 0) {
    learningOnlyNew = false;
    localStorage.setItem(LS_LEARNING_FILTER, "all");
    toast("Toutes tes cartes de ce périmètre sont déjà vues — affichage complet.");
    renderLearningPage(true);
    return;
  }

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
    showLearningEmpty(currentLearningScope ? "Aucune carte dans ce périmètre." : "Aucune carte à découvrir.");
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
  $("learning-counter").textContent = "";
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

function setupLearningPage() {
  learningOnlyNew = localStorage.getItem(LS_LEARNING_FILTER) !== "all";
  $("btn-learning-exit").addEventListener("click", () => {
    leaveReviewSession();
  });
  document.querySelectorAll("[data-learning-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      learningOnlyNew = btn.dataset.learningFilter === "new";
      localStorage.setItem(LS_LEARNING_FILTER, learningOnlyNew ? "new" : "all");
      document.querySelectorAll("[data-learning-filter]").forEach((other) => {
        other.classList.toggle("active", other === btn);
      });
      renderLearningPage(true);
    });
  });
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
   11. GRAMMAIRE
   ========================================================= */

function grammarHTMLCell(html) {
  return { html: html };
}

const GRAMMAR_CASES_CONTENT = [
  {
    id: "overview",
    title: "Les 4 cas : à quoi ils servent",
    intro: [
      "Les cas indiquent le rôle d'un groupe nominal dans la phrase : sujet, complément direct, complément indirect ou possession.",
    ],
    tables: [
      {
        headers: ["Cas", "Fonction principale", "Question"],
        rows: [
          ["Nominatif", "sujet de la phrase", "qui fait l'action ?"],
          ["Accusatif", "complément direct, COD", "qui ? quoi ?"],
          ["Datif", "complément indirect, COI", "à qui ?"],
          ["Génitif", "possession", "de qui ?"],
        ],
      },
    ],
    examples: [
      {
        de: "Der Mann gibt dem Kind den Schlüssel des Hauses.",
        fr: "",
        notes: [
          "der Mann : nominatif, sujet",
          "dem Kind : datif, à l'enfant",
          "den Schlüssel : accusatif, la clé",
          "des Hauses : génitif, de la maison",
        ],
      },
    ],
  },
  {
    id: "defined-articles",
    title: "Les articles définis",
    intro: [
      "Voici le tableau complet de der, die, das et du pluriel aux quatre cas.",
    ],
    tables: [
      {
        headers: ["Cas", "Masculin", "Féminin", "Neutre", "Pluriel"],
        articleCells: true,
        rows: [
          ["Nominatif", "der", "die", "das", "die"],
          ["Accusatif", "den", "die", "das", "die"],
          ["Datif", "dem", "der", "dem", "den"],
          ["Génitif", "des", "der", "des", "der"],
        ],
      },
      {
        headers: ["Genre", "Nominatif", "Accusatif", "Datif", "Génitif"],
        rows: [
          ["Masculin", "der Mann", grammarHTMLCell("<strong>den</strong> Mann"), grammarHTMLCell("<strong>dem</strong> Mann"), grammarHTMLCell("<strong>des</strong> Mann<strong>es</strong>")],
          ["Féminin", "die Frau", "die Frau", grammarHTMLCell("<strong>der</strong> Frau"), grammarHTMLCell("<strong>der</strong> Frau")],
          ["Neutre", "das Kind", "das Kind", grammarHTMLCell("<strong>dem</strong> Kind"), grammarHTMLCell("<strong>des</strong> Kind<strong>es</strong>")],
          ["Pluriel", "die Kinder", "die Kinder", grammarHTMLCell("<strong>den</strong> Kinder<strong>n</strong>"), grammarHTMLCell("<strong>der</strong> Kinder")],
        ],
      },
    ],
    notes: [
      "Le masculin est celui qui change le plus : der Mann, den Mann, dem Mann, des Mannes.",
      "Le féminin garde die à l'accusatif, puis der au datif et au génitif.",
      "Le neutre garde das au nominatif et à l'accusatif, puis prend dem et des.",
      "Le pluriel prend den au datif et der au génitif.",
    ],
  },
  {
    id: "nominative",
    title: "Le nominatif",
    intro: [
      "Le nominatif désigne généralement le sujet.",
    ],
    examples: [
      { de: "Der große Hund ist schwarz.", fr: "Le grand chien est noir." },
      { de: "Die alte Frau ist nett.", fr: "La vieille femme est gentille." },
      { de: "Das neue Handy ist teuer.", fr: "Le nouveau téléphone est cher." },
      { de: "Die großen Häuser sind modern.", fr: "Les grandes maisons sont modernes." },
    ],
    tables: [
      {
        title: "Adjectif après un article défini",
        headers: ["Genre", "Forme"],
        rows: [
          ["Masculin", grammarHTMLCell("der groß<strong>e</strong> Hund")],
          ["Féminin", grammarHTMLCell("die alt<strong>e</strong> Frau")],
          ["Neutre", grammarHTMLCell("das neu<strong>e</strong> Handy")],
          ["Pluriel", grammarHTMLCell("die groß<strong>en</strong> Häuser")],
        ],
      },
      {
        title: "Avec ein et les possessifs",
        headers: ["Genre", "Exemple"],
        rows: [
          ["Masculin", grammarHTMLCell("ein groß<strong>er</strong> Hund / mein neu<strong>er</strong> Computer")],
          ["Féminin", grammarHTMLCell("eine schön<strong>e</strong> Lampe / meine klein<strong>e</strong> Schwester")],
          ["Neutre", grammarHTMLCell("ein klein<strong>es</strong> Haus / mein neu<strong>es</strong> Handy")],
          ["Pluriel possessif", grammarHTMLCell("meine alt<strong>en</strong> Bücher / deine neu<strong>en</strong> Computer / ihre groß<strong>en</strong> Häuser")],
        ],
      },
      {
        title: "Sans article",
        headers: ["Genre", "Terminaison"],
        rows: [
          ["Masculin", grammarHTMLCell("-<strong>er</strong>")],
          ["Féminin", grammarHTMLCell("-<strong>e</strong>")],
          ["Neutre", grammarHTMLCell("-<strong>es</strong>")],
          ["Pluriel", grammarHTMLCell("-<strong>e</strong>")],
        ],
      },
    ],
    notes: [
      "Au nominatif singulier après der/die/das, l'adjectif prend souvent -e.",
      "Au pluriel après die, l'adjectif prend -en.",
      "Les possessifs suivent le modèle de ein : mein, dein, sein, ihr, unser, euer, Ihr.",
      "Comme ein ou mein ne montrent pas clairement le masculin, l'adjectif prend -er : ein großer Hund, mein neuer Computer.",
      "Sans article, l'adjectif doit montrer le genre.",
      "Tu connais déjà des formes comme guter Käse, frisches Brot, kaltes Wasser, rote Äpfel.",
    ],
    extraExamples: [
      { de: "frischer Kaffee", fr: "du café frais" },
      { de: "frische Milch", fr: "du lait frais" },
      { de: "frisches Brot", fr: "du pain frais" },
      { de: "rote Äpfel", fr: "des pommes rouges" },
    ],
  },
  {
    id: "accusative",
    title: "L'accusatif",
    intro: [
      "L'accusatif désigne principalement le COD : la personne ou la chose directement concernée par l'action.",
    ],
    examples: [
      { de: "Ich sehe den Hund.", fr: "Je vois le chien." },
      { de: "Ich kaufe das Handy.", fr: "J'achète le téléphone." },
      { de: "Ich suche die Lampe.", fr: "Je cherche la lampe." },
      { de: "Ich sehe die Häuser.", fr: "Je vois les maisons." },
    ],
    tables: [
      {
        title: "Articles à l'accusatif",
        headers: ["Genre", "Forme"],
        rows: [
          ["Masculin", grammarHTMLCell("der Hund → <strong>den</strong> Hund")],
          ["Féminin", "die Frau → die Frau"],
          ["Neutre", "das Haus → das Haus"],
          ["Pluriel", "die Häuser → die Häuser"],
        ],
      },
      {
        title: "Adjectif avec article défini",
        headers: ["Genre", "Exemple"],
        rows: [
          ["Masculin", grammarHTMLCell("den groß<strong>en</strong> Hund")],
          ["Féminin", grammarHTMLCell("die alt<strong>e</strong> Frau")],
          ["Neutre", grammarHTMLCell("das neu<strong>e</strong> Handy")],
          ["Pluriel", grammarHTMLCell("die alt<strong>en</strong> Bücher")],
        ],
      },
      {
        title: "Avec ein et les possessifs",
        headers: ["Genre", "Exemples"],
        rows: [
          ["Masculin", grammarHTMLCell("ein<strong>en</strong> groß<strong>en</strong> Hund / mein<strong>en</strong> neu<strong>en</strong> Computer / dein<strong>en</strong> klein<strong>en</strong> Koffer")],
          ["Féminin", grammarHTMLCell("eine schön<strong>e</strong> Lampe / meine klein<strong>e</strong> Tasche")],
          ["Neutre", grammarHTMLCell("ein alt<strong>es</strong> Buch / mein neu<strong>es</strong> Handy")],
          ["Pluriel possessif", grammarHTMLCell("meine neu<strong>en</strong> Bücher / ihre alt<strong>en</strong> Computer")],
        ],
      },
      {
        title: "Sans article",
        headers: ["Genre", "Terminaison"],
        rows: [
          ["Masculin", grammarHTMLCell("-<strong>en</strong>")],
          ["Féminin", grammarHTMLCell("-<strong>e</strong>")],
          ["Neutre", grammarHTMLCell("-<strong>es</strong>")],
          ["Pluriel", grammarHTMLCell("-<strong>e</strong>")],
        ],
      },
      {
        title: "Pronoms personnels à l'accusatif",
        headers: ["Français", "Nominatif", "Accusatif"],
        rows: [
          ["je / me", "ich", "mich"],
          ["tu / te", "du", "dich"],
          ["il / le", "er", "ihn"],
          ["elle / la", "sie", "sie"],
          ["neutre / le", "es", "es"],
          ["nous", "wir", "uns"],
          ["vous", "ihr", "euch"],
          ["ils / elles", "sie", "sie"],
          ["vous, politesse", "Sie", "Sie"],
        ],
      },
    ],
    notes: [
      "Au niveau des articles définis, seul le masculin change vraiment.",
      "Le masculin accusatif est très reconnaissable : den großen Hund. Les deux prennent -en : den, großen.",
      "Le masculin accusatif avec ein et les possessifs prend einen, meinen, deinen, seinen, ihren, unseren, euren.",
      "Käse est masculin et COD dans guten Käse : gut devient guten.",
      "Dans warten auf, auf demande l'accusatif : Warten Sie auf mich.",
    ],
    extraExamples: [
      { de: "Ich sehe den großen Hund.", fr: "" },
      { de: "Du suchst die alte Frau.", fr: "" },
      { de: "Er kauft das neue Handy.", fr: "" },
      { de: "Wir sehen die alten Computer.", fr: "" },
      { de: "Ich sehe einen jungen Mann.", fr: "" },
      { de: "Ich suche meinen neuen Computer.", fr: "" },
      { de: "Du nimmst deinen kleinen Koffer.", fr: "" },
      { de: "Ich kaufe guten Käse.", fr: "J'achète du bon fromage." },
      { de: "Ich kaufe frisches Brot.", fr: "J'achète du pain frais." },
      { de: "Ich trinke kaltes Wasser.", fr: "Je bois de l'eau froide." },
      { de: "Ich kaufe rote Äpfel.", fr: "J'achète des pommes rouges." },
      { de: "Er sieht mich.", fr: "Il me voit." },
      { de: "Ich verstehe dich.", fr: "Je te comprends." },
      { de: "Ich sehe ihn.", fr: "Je le vois." },
      { de: "Ich sehe sie.", fr: "Je la vois." },
      { de: "Ich habe es.", fr: "Je l'ai." },
      { de: "Er sieht uns.", fr: "Il nous voit." },
      { de: "Ich sehe euch.", fr: "Je vous vois." },
      { de: "Ich verstehe Sie.", fr: "Je vous comprends." },
      { de: "Warten Sie auf mich.", fr: "Attendez-moi." },
    ],
  },
  {
    id: "dative",
    title: "Le datif",
    intro: [
      "Le datif sert notamment à dire à quelqu'un. Il marque souvent le destinataire ou le bénéficiaire.",
    ],
    examples: [
      { de: "Ich gebe dem Mann das Buch.", fr: "Je donne le livre à l'homme." },
      { de: "Ich zeige der Frau das Handy.", fr: "Je montre le téléphone à la femme." },
      { de: "Er gibt dem Kind die Flasche.", fr: "Il donne la bouteille à l'enfant." },
      { de: "Wir schreiben den Freunden.", fr: "Nous écrivons aux amis." },
    ],
    tables: [
      {
        title: "Articles au datif",
        headers: ["Genre", "Datif"],
        articleCells: true,
        rows: [
          ["Masculin", "dem"],
          ["Féminin", "der"],
          ["Neutre", "dem"],
          ["Pluriel", "den"],
        ],
      },
      {
        title: "Adjectif avec article défini",
        headers: ["Genre", "Exemple"],
        rows: [
          ["Masculin", grammarHTMLCell("dem alt<strong>en</strong> Mann")],
          ["Féminin", grammarHTMLCell("der jung<strong>en</strong> Frau")],
          ["Neutre", grammarHTMLCell("dem klein<strong>en</strong> Kind")],
          ["Pluriel", grammarHTMLCell("den neu<strong>en</strong> Studenten")],
        ],
      },
      {
        title: "Possessifs au datif",
        headers: ["Genre", "mein", "dein"],
        rows: [
          ["Masculin", "meinem", "deinem"],
          ["Féminin", "meiner", "deiner"],
          ["Neutre", "meinem", "deinem"],
          ["Pluriel", "meinen", "deinen"],
        ],
      },
      {
        title: "Pronoms personnels au datif",
        headers: ["Français", "Nominatif", "Datif"],
        rows: [
          ["à moi", "ich", "mir"],
          ["à toi", "du", "dir"],
          ["à lui", "er", "ihm"],
          ["à elle", "sie", "ihr"],
          ["à lui, neutre", "es", "ihm"],
          ["à nous", "wir", "uns"],
          ["à vous", "ihr", "euch"],
          ["à eux / elles", "sie", "ihnen"],
          ["à vous, politesse", "Sie", "Ihnen"],
        ],
      },
      {
        title: "Le -n du datif pluriel",
        headers: ["Pluriel", "Datif pluriel"],
        rows: [
          ["die Kinder", grammarHTMLCell("den Kinder<strong>n</strong>")],
          ["die Freunde", grammarHTMLCell("den Freunde<strong>n</strong>")],
          ["die Bücher", grammarHTMLCell("den Bücher<strong>n</strong>")],
          ["die Häuser", grammarHTMLCell("den Häuser<strong>n</strong>")],
          ["die Frauen", "den Frauen"],
          ["die Studenten", "den Studenten"],
          ["die Autos", "den Autos"],
        ],
      },
    ],
    notes: [
      "Au datif avec un déterminant, adjectif = presque toujours -en.",
      "Même modèle possessif : seinem / seiner, ihrem / ihrer, unserem / unserer, eurem / eurer, Ihrem / Ihrer.",
      "Avec adjectif : meinem großen Hund, meiner neuen Lampe, meinem kleinen Kind, meinen alten Freunden.",
      "Tu sais distinguer mich = me COD, mir = à moi, dich = te COD, dir = à toi, ihn = le, ihm = à lui, sie = la, ihr = à elle.",
      "Quand il y a deux pronoms, l'accusatif est souvent placé avant le datif : Ich gebe es dir.",
      "Avec deux noms, le datif passe généralement avant l'accusatif : Ich gebe dem Mann das Buch.",
      "Au datif pluriel, l'article devient den et le nom prend souvent un -n supplémentaire.",
      "Pas de nouveau -n si le pluriel se termine déjà par -n ou -s.",
      "Cette règle concerne tous les genres, car au pluriel il n'y a plus de distinction masculin/féminin/neutre.",
    ],
    extraExamples: [
      { de: "Ich gebe dem alten Professor das Buch.", fr: "" },
      { de: "Du zeigst der jungen Frau das Handy.", fr: "" },
      { de: "Er gibt dem kleinen Kind die Flasche.", fr: "" },
      { de: "Wir schreiben den neuen Studenten.", fr: "" },
      { de: "Ich zeige meinem Bruder das Haus.", fr: "" },
      { de: "Sie schreibt ihrem Freund.", fr: "" },
      { de: "Ich spreche mit meiner kleinen Schwester.", fr: "" },
      { de: "Ihr gebt euren alten Freunden die Schlüssel.", fr: "" },
      { de: "Sie sprechen mit ihren guten Freunden.", fr: "" },
      { de: "Er gibt mir das Buch.", fr: "Il me donne le livre." },
      { de: "Ich zeige dir mein Handy.", fr: "Je te montre mon téléphone." },
      { de: "Ich gebe ihm den Schlüssel.", fr: "Je lui donne la clé." },
      { de: "Ich schreibe ihr.", fr: "Je lui écris." },
      { de: "Er hilft uns.", fr: "Il nous aide." },
      { de: "Ich gebe euch das Buch.", fr: "Je vous donne le livre." },
      { de: "Ich schreibe ihnen.", fr: "Je leur écris." },
      { de: "Ich gebe es Ihnen.", fr: "Je vous le donne.", notes: ["es : accusatif, la chose donnée", "Ihnen : datif, à vous"] },
      { de: "Können Sie es mir bringen?", fr: "Pouvez-vous me l'apporter ?", notes: ["es = l'", "mir = à moi"] },
      { de: "Ich spreche mit den Kindern.", fr: "" },
      { de: "Ich bin in den Häusern.", fr: "" },
    ],
  },
  {
    id: "genitive",
    title: "Le génitif",
    intro: [
      "Le génitif exprime la possession ou le lien entre deux noms.",
    ],
    examples: [
      { de: "das Auto des Mannes", fr: "la voiture de l'homme" },
      { de: "der Hund der Frau", fr: "le chien de la femme" },
      { de: "die Tür des Hauses", fr: "la porte de la maison" },
      { de: "die Bücher der Studenten", fr: "les livres des étudiants" },
    ],
    tables: [
      {
        title: "Articles au génitif",
        headers: ["Genre", "Génitif"],
        articleCells: true,
        rows: [
          ["Masculin", "des"],
          ["Féminin", "der"],
          ["Neutre", "des"],
          ["Pluriel", "der"],
        ],
      },
      {
        title: "Le -s ou -es au génitif",
        headers: ["Nominatif", "Génitif"],
        rows: [
          ["der Mann", grammarHTMLCell("des Mann<strong>es</strong>")],
          ["das Haus", grammarHTMLCell("des Haus<strong>es</strong>")],
          ["das Kind", grammarHTMLCell("des Kind<strong>es</strong>")],
          ["der Bruder", grammarHTMLCell("des Bruder<strong>s</strong>")],
          ["der Vater", grammarHTMLCell("des Vater<strong>s</strong>")],
          ["der Freund", grammarHTMLCell("des Freund<strong>es</strong> ou des Freund<strong>s</strong> selon le nom et l'usage")],
          ["die Frau", "der Frau"],
          ["die Mutter", "der Mutter"],
          ["die Studenten", "der Studenten"],
          ["die Freunde", "der Freunde"],
        ],
      },
      {
        title: "Possessifs au génitif",
        headers: ["Genre", "Formes"],
        rows: [
          ["Masculin et neutre", "meines, deines, seines, ihres, unseres, eures, Ihres"],
          ["Féminin et pluriel", "meiner, deiner, seiner, ihrer, unserer, eurer, Ihrer"],
        ],
      },
      {
        title: "Adjectif au génitif",
        headers: ["Genre", "Exemple"],
        rows: [
          ["Masculin", grammarHTMLCell("des alt<strong>en</strong> Mann<strong>es</strong>")],
          ["Féminin", grammarHTMLCell("der jung<strong>en</strong> Frau")],
          ["Neutre", grammarHTMLCell("des klein<strong>en</strong> Kind<strong>es</strong>")],
          ["Pluriel", grammarHTMLCell("der neu<strong>en</strong> Studenten")],
        ],
      },
    ],
    notes: [
      "Au génitif singulier, les noms masculins et neutres prennent généralement -s ou -es.",
      "Le féminin et le pluriel ne prennent normalement pas ce -s/-es.",
      "Après un déterminant au génitif, l'adjectif prend presque toujours -en.",
    ],
    extraExamples: [
      { de: "Das Auto des Mannes.", fr: "" },
      { de: "Die Tür des Hauses.", fr: "" },
      { de: "Der Name des Kindes.", fr: "" },
      { de: "das Handy meines Bruders", fr: "le téléphone de mon frère" },
      { de: "der Garten meines Vaters", fr: "le jardin de mon père" },
      { de: "das Auto meiner Mutter", fr: "la voiture de ma mère" },
      { de: "die Tür unseres Hauses", fr: "la porte de notre maison" },
      { de: "das Haus ihrer Eltern", fr: "la maison de ses/leurs parents" },
      { de: "der Hund der alten Frau", fr: "" },
      { de: "das Auto des alten Mannes", fr: "" },
      { de: "die Tür des kleinen Hauses", fr: "" },
      { de: "die Bücher der neuen Studenten", fr: "" },
    ],
  },
  {
    id: "prepositions",
    title: "Les prépositions et les cas",
    intro: [
      "Certaines prépositions imposent toujours un cas. D'autres peuvent prendre l'accusatif ou le datif selon le sens.",
    ],
    tables: [
      {
        title: "In + accusatif : destination / changement de position",
        headers: ["Genre", "Mouvement"],
        rows: [
          ["Masculin", grammarHTMLCell("in <strong>den</strong>")],
          ["Féminin", "in die"],
          ["Neutre", grammarHTMLCell("in das → <strong>ins</strong>")],
          ["Pluriel", "in die"],
        ],
      },
      {
        title: "In + datif : position fixe / lieu où cela se passe",
        headers: ["Genre", "Position"],
        rows: [
          ["Masculin", grammarHTMLCell("in dem → <strong>im</strong>")],
          ["Féminin", "in der"],
          ["Neutre", grammarHTMLCell("in dem → <strong>im</strong>")],
          ["Pluriel", "in den + nom souvent en -n"],
        ],
      },
      {
        title: "Prépositions que tu sais associer à un cas",
        headers: ["Cas", "Prépositions / constructions", "Principe"],
        rows: [
          ["Toujours datif", "mit, zu, aus", "avec, vers/chez, depuis/de"],
          ["Toujours accusatif", "für, warten auf", "pour, attendre quelqu'un/quelque chose"],
          ["Accusatif ou datif", "in", "accusatif = destination ; datif = position"],
        ],
      },
    ],
    notes: [
      "ins = in das ; im = in dem.",
      "Le vrai principe n'est pas seulement « mouvement ou pas mouvement » : destination / changement de position → accusatif ; lieu où quelque chose se trouve ou se passe → datif.",
      "Tu as aussi commencé à rencontrer auf et an, mais ils restent moins familiers que in.",
    ],
    examples: [
      { de: "Ich gehe in den Garten.", fr: "Je vais dans le jardin." },
      { de: "Ich gehe ins Geschäft.", fr: "Je vais dans le magasin." },
      { de: "Ich gehe in die Küche.", fr: "Je vais dans la cuisine." },
      { de: "Ich gehe in die Häuser.", fr: "Je vais dans les maisons." },
      { de: "Ich bin im Garten.", fr: "Je suis dans le jardin." },
      { de: "Ich bin im Haus.", fr: "Je suis dans la maison." },
      { de: "Ich bin in der Küche.", fr: "Je suis dans la cuisine." },
      { de: "Ich bin in den Häusern.", fr: "Je suis dans les maisons." },
      { de: "mit mir", fr: "avec moi" },
      { de: "mit dem Mann", fr: "avec l'homme" },
      { de: "mit meiner Schwester", fr: "avec ma sœur" },
      { de: "Ich gehe zum Bahnhof.", fr: "" },
      { de: "Ich gehe zur Frau.", fr: "" },
      { de: "aus dem Haus", fr: "de la maison" },
      { de: "aus Frankreich", fr: "de France" },
      { de: "für mich", fr: "pour moi" },
      { de: "für dich", fr: "pour toi" },
      { de: "für meine Schwester", fr: "pour ma sœur" },
      { de: "Ich warte auf dich.", fr: "" },
      { de: "Warten Sie auf mich.", fr: "" },
    ],
  },
  {
    id: "summary-tables",
    title: "Tableaux récapitulatifs",
    intro: [
      "Ces tableaux résument les terminaisons d'adjectifs les plus utiles avec article défini, avec ein/possessifs, et sans article.",
    ],
    tables: [
      {
        title: "Avec article défini",
        headers: ["Cas", "Masculin", "Féminin", "Neutre", "Pluriel"],
        rows: [
          ["Nominatif", grammarHTMLCell("der groß<strong>e</strong>"), grammarHTMLCell("die groß<strong>e</strong>"), grammarHTMLCell("das groß<strong>e</strong>"), grammarHTMLCell("die groß<strong>en</strong>")],
          ["Accusatif", grammarHTMLCell("den groß<strong>en</strong>"), grammarHTMLCell("die groß<strong>e</strong>"), grammarHTMLCell("das groß<strong>e</strong>"), grammarHTMLCell("die groß<strong>en</strong>")],
          ["Datif", grammarHTMLCell("dem groß<strong>en</strong>"), grammarHTMLCell("der groß<strong>en</strong>"), grammarHTMLCell("dem groß<strong>en</strong>"), grammarHTMLCell("den groß<strong>en</strong>")],
          ["Génitif", grammarHTMLCell("des groß<strong>en</strong>"), grammarHTMLCell("der groß<strong>en</strong>"), grammarHTMLCell("des groß<strong>en</strong>"), grammarHTMLCell("der groß<strong>en</strong>")],
        ],
      },
      {
        title: "Avec ein, mein, dein, etc.",
        headers: ["Cas", "Masculin", "Féminin", "Neutre", "Pluriel possessif"],
        rows: [
          ["Nominatif", grammarHTMLCell("ein groß<strong>er</strong>"), grammarHTMLCell("eine groß<strong>e</strong>"), grammarHTMLCell("ein groß<strong>es</strong>"), grammarHTMLCell("meine groß<strong>en</strong>")],
          ["Accusatif", grammarHTMLCell("einen groß<strong>en</strong>"), grammarHTMLCell("eine groß<strong>e</strong>"), grammarHTMLCell("ein groß<strong>es</strong>"), grammarHTMLCell("meine groß<strong>en</strong>")],
          ["Datif", grammarHTMLCell("einem groß<strong>en</strong>"), grammarHTMLCell("einer groß<strong>en</strong>"), grammarHTMLCell("einem groß<strong>en</strong>"), grammarHTMLCell("meinen groß<strong>en</strong>")],
          ["Génitif", grammarHTMLCell("eines groß<strong>en</strong>"), grammarHTMLCell("einer groß<strong>en</strong>"), grammarHTMLCell("eines groß<strong>en</strong>"), grammarHTMLCell("meiner groß<strong>en</strong>")],
        ],
      },
      {
        title: "Sans article",
        headers: ["Cas", "Masculin", "Féminin", "Neutre", "Pluriel"],
        rows: [
          ["Nominatif", grammarHTMLCell("groß<strong>er</strong>"), grammarHTMLCell("groß<strong>e</strong>"), grammarHTMLCell("groß<strong>es</strong>"), grammarHTMLCell("groß<strong>e</strong>")],
          ["Accusatif", grammarHTMLCell("groß<strong>en</strong>"), grammarHTMLCell("groß<strong>e</strong>"), grammarHTMLCell("groß<strong>es</strong>"), grammarHTMLCell("groß<strong>e</strong>")],
        ],
      },
    ],
    notes: [
      "Avec article défini : nominatif singulier souvent -e ; accusatif masculin -en ; pluriel -en ; datif -en ; génitif -en.",
      "Même modèle avec mein, dein, sein, ihr, unser, euer, Ihr.",
      "Exemple avec mein : mein großer Hund, meinen großen Hund, meinem großen Hund, meines großen Hundes.",
      "Sans article, tu as surtout travaillé le nominatif et l'accusatif : guter Käse, guten Käse kaufen, frisches Brot, rote Äpfel.",
      "Tu as moins pratiqué le datif et le génitif sans article ; ils restent à consolider.",
    ],
  },
];

const GRAMMAR_TABS = ["cases", "verbs", "levels"];
const VERB_PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

function getGrammarTab() {
  const stored = localStorage.getItem(LS_GRAMMAR_TAB);
  const tab = stored === "my-verbs" || stored === "irregular" ? "verbs" : stored;
  if (tab !== stored) localStorage.setItem(LS_GRAMMAR_TAB, tab);
  return GRAMMAR_TABS.includes(tab) ? tab : "cases";
}

function setGrammarTab(tabName) {
  const tab = GRAMMAR_TABS.includes(tabName) ? tabName : "cases";
  localStorage.setItem(LS_GRAMMAR_TAB, tab);
  document.querySelectorAll("[data-grammar-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.grammarTab === tab);
  });
  $("grammar-panel-cases").classList.toggle("hidden", tab !== "cases");
  $("grammar-panel-verbs").classList.toggle("hidden", tab !== "verbs");
  $("grammar-panel-levels").classList.toggle("hidden", tab !== "levels");
  renderGrammarPage();
}

function setupGrammarPage() {
  document.querySelectorAll("[data-grammar-tab]").forEach((btn) => {
    btn.addEventListener("click", () => setGrammarTab(btn.dataset.grammarTab));
  });
}

function renderGrammarPage() {
  const tab = getGrammarTab();
  document.querySelectorAll("[data-grammar-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.grammarTab === tab);
  });
  $("grammar-panel-cases").classList.toggle("hidden", tab !== "cases");
  $("grammar-panel-verbs").classList.toggle("hidden", tab !== "verbs");
  $("grammar-panel-levels").classList.toggle("hidden", tab !== "levels");

  if (tab === "cases") renderGrammarCases();
  if (tab === "verbs") renderGrammarVerbs();
  if (tab === "levels") renderGrammarLevels();
}

function speakButtonHTML(text, label = "Écouter") {
  return iconButtonHTML("icon-volume", { label, data: { speak: text } });
}

function articleHTML(value) {
  const clean = String(value || "");
  if (clean === "der" || clean === "den" || clean === "dem" || clean === "einem" || clean === "einen" || clean === "ein") {
    return '<span class="art-der">' + escapeHTML(clean) + "</span>";
  }
  if (clean === "die" || clean === "eine" || clean === "einer") {
    return '<span class="art-die">' + escapeHTML(clean) + "</span>";
  }
  if (clean === "das") {
    return '<span class="art-das">' + escapeHTML(clean) + "</span>";
  }
  return escapeHTML(clean);
}

function grammarCellContentHTML(item, articleCell = false) {
  if (item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "html")) {
    return item.html;
  }
  return articleCell ? articleHTML(item) : escapeHTML(item);
}

function grammarTableHTML(headers, rows, articleCells = false) {
  return (
    '<div class="grammar-table-wrap"><table class="grammar-table"><thead><tr>' +
      headers.map((item) => '<th>' + escapeHTML(item) + "</th>").join("") +
    "</tr></thead><tbody>" +
      rows.map((row) =>
        "<tr>" + row.map((item, index) => '<td>' + grammarCellContentHTML(item, articleCells && index > 0) + "</td>").join("") + "</tr>"
      ).join("") +
    "</tbody></table></div>"
  );
}

function grammarExampleHTML(example) {
  return (
    '<article class="grammar-example-card">' +
      '<div class="grammar-example-de-row"><strong>' + escapeHTML(example.de) + "</strong>" + speakButtonHTML(example.de) + "</div>" +
      (example.fr ? '<p class="example-fr">' + escapeHTML(example.fr) + "</p>" : "") +
      (Array.isArray(example.notes) && example.notes.length
        ? '<ul class="grammar-note-list">' + example.notes.map((note) => '<li>' + escapeHTML(note) + "</li>").join("") + "</ul>"
        : "") +
    "</article>"
  );
}

function grammarTocItemHTML(targetId, title, index) {
  return (
    '<a href="#' + escapeHTML(targetId) + '" data-grammar-toc-target="' + escapeHTML(targetId) + '">' +
      '<span class="grammar-toc-number">' + (index + 1) + "</span>" +
      '<span class="grammar-toc-title">' + escapeHTML(title) + "</span>" +
      '<span class="grammar-toc-chevron" aria-hidden="true">›</span>' +
    "</a>"
  );
}

function grammarSummaryHTML(title, index) {
  return (
    '<summary><span class="grammar-summary-title">' +
      '<span class="grammar-toc-number">' + (index + 1) + "</span>" +
      '<span>' + escapeHTML(title) + "</span>" +
    '</span><span class="grammar-accordion-icon">⌄</span></summary>'
  );
}

function attachGrammarTocHandlers(container) {
  container.querySelectorAll("[data-grammar-toc-target]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = $(link.dataset.grammarTocTarget);
      if (!target) return;
      event.preventDefault();
      if (target.tagName.toLowerCase() === "details") target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function grammarTablesHTML(tables = []) {
  return tables.map((table) =>
    '<div class="grammar-subblock">' +
      (table.title ? '<h3>' + escapeHTML(table.title) + "</h3>" : "") +
      grammarTableHTML(table.headers, table.rows, Boolean(table.articleCells)) +
    "</div>"
  ).join("");
}

function grammarNotesHTML(notes = []) {
  return notes.length
    ? '<ul class="grammar-note-list">' + notes.map((note) => '<li>' + escapeHTML(note) + "</li>").join("") + "</ul>"
    : "";
}

function renderGrammarCases() {
  $("grammar-panel-cases").innerHTML =
    '<section class="panel grammar-section grammar-cases-home">' +
      "<h2>Les cas allemands</h2>" +
      '<p class="muted">Référence structurée : articles, adjectifs, pronoms, prépositions et exemples.</p>' +
      '<nav class="grammar-case-toc" aria-label="Sommaire des cas">' +
        GRAMMAR_CASES_CONTENT.map((section, index) =>
          grammarTocItemHTML("grammar-case-" + section.id, section.title, index)
        ).join("") +
      "</nav>" +
    "</section>" +
    GRAMMAR_CASES_CONTENT.map((section, index) => {
      const examples = [...(section.examples || []), ...(section.extraExamples || [])];
      return (
        '<details class="panel grammar-section grammar-accordion" id="grammar-case-' + escapeHTML(section.id) + '"' + (index === 0 ? " open" : "") + ">" +
          grammarSummaryHTML(section.title, index) +
          '<div class="grammar-accordion-body">' +
            (section.intro || []).map((paragraph) => "<p>" + escapeHTML(paragraph) + "</p>").join("") +
            grammarTablesHTML(section.tables) +
            grammarNotesHTML(section.notes) +
            (examples.length
              ? '<div class="case-cards grammar-example-grid">' + examples.map(grammarExampleHTML).join("") + "</div>"
              : "") +
          "</div>" +
        "</details>"
      );
    }).join("");
  attachGrammarTocHandlers($("grammar-panel-cases"));
}

function isUserVerbCard(card) {
  const de = String(card.de || "").trim();
  if (card.category === "Verbes") return de.length > 0;
  return String(card.article || "") === "" &&
    /^[a-zäöüß]/u.test(de) &&
    (de.endsWith("en") || de.endsWith("eln") || de.endsWith("ern")) &&
    !/\s/.test(de);
}

async function getUserVerbMap() {
  const cards = await getAllCards();
  const verbs = new Map();
  cards.filter(isUserVerbCard).forEach((card) => {
    const inf = String(card.de || "").trim();
    if (!inf) return;
    const key = inf.toLowerCase();
    if (!verbs.has(key)) {
      verbs.set(key, { inf: inf, fr: String(card.fr || "").trim(), cards: [card] });
    } else {
      const item = verbs.get(key);
      item.cards.push(card);
      if (!item.fr && card.fr) item.fr = String(card.fr).trim();
    }
  });
  return new Map([...verbs.entries()].sort((a, b) => a[1].inf.localeCompare(b[1].inf, "de")));
}

function searchFold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .trim();
}

function verbTypeMeta(infinitive) {
  const classification = classifyVerb(infinitive);
  const folded = searchFold(classification);
  if (folded.includes("modaux")) return { key: "modal", label: "Modal", order: 0 };
  if (folded.includes("irreg")) return { key: "irregular", label: "Irrégulier", order: 1 };
  if (folded.includes("particule")) return { key: "particle", label: "Particule", order: 2 };
  return { key: "regular", label: "Régulier", order: 3 };
}

function mergeGrammarVerbItem(map, data) {
  const inf = String(data.inf || "").trim();
  if (!inf) return;
  const key = normalizedGermanWord(inf);
  if (!key) return;
  const existing = map.get(key) || { inf: inf, fr: "", inCards: false };
  map.set(key, {
    inf: existing.inf || inf,
    fr: existing.inCards ? (existing.fr || data.fr || "") : (data.fr || existing.fr || ""),
    inCards: Boolean(existing.inCards || data.inCards),
  });
}

async function getGrammarVerbItems() {
  const userVerbs = await getUserVerbMap();
  const map = new Map();

  IRREGULAR_VERBS.forEach((verb) => mergeGrammarVerbItem(map, { inf: verb.inf, fr: verb.fr || "" }));
  COMMON_REGULAR_VERBS.forEach((verb) => mergeGrammarVerbItem(map, verb));
  userVerbs.forEach((verb) => mergeGrammarVerbItem(map, { inf: verb.inf, fr: verb.fr || "", inCards: true }));

  return [...map.values()].map((verb) => {
    const type = verbTypeMeta(verb.inf);
    return {
      ...verb,
      type: type,
      searchText: searchFold(verb.inf + " " + verb.fr),
    };
  });
}

function filteredGrammarVerbs(items) {
  const query = searchFold(grammarVerbQuery);
  const filtered = items.filter((verb) => {
    if (query && !verb.searchText.includes(query)) return false;
    if (grammarVerbFilter === "mine") return verb.inCards;
    if (grammarVerbFilter === "all") return true;
    return verb.type.key === grammarVerbFilter;
  });

  return filtered.sort((a, b) => {
    if (grammarVerbSort === "type") {
      const typeDiff = a.type.order - b.type.order;
      if (typeDiff) return typeDiff;
    }
    return a.inf.localeCompare(b.inf, "de");
  });
}

function grammarVerbFilterButtonHTML(key, label) {
  return '<button class="verb-filter-chip' + (grammarVerbFilter === key ? " active" : "") + '" type="button" data-verb-filter="' + escapeHTML(key) + '">' + escapeHTML(label) + "</button>";
}

function grammarVerbSortButtonHTML(key, label) {
  return '<button class="verb-sort-chip' + (grammarVerbSort === key ? " active" : "") + '" type="button" data-verb-sort="' + escapeHTML(key) + '">' + escapeHTML(label) + "</button>";
}

function grammarVerbRowHTML(verb) {
  const key = normalizedGermanWord(verb.inf);
  const open = selectedGrammarVerb === key;
  return (
    '<article class="grammar-verb-item' + (open ? " open" : "") + '">' +
      '<button class="grammar-verb-row" type="button" data-grammar-verb-toggle="' + escapeHTML(key) + '">' +
        '<span class="grammar-verb-main"><strong>' + escapeHTML(verb.inf) + "</strong>" +
          (verb.fr ? '<span>' + escapeHTML(verb.fr) + "</span>" : "") +
        "</span>" +
        '<span class="grammar-verb-badges">' +
          '<span class="grammar-badge grammar-badge-' + escapeHTML(verb.type.key) + '">' + escapeHTML(verb.type.label) + "</span>" +
          (verb.inCards ? '<span class="grammar-badge">dans tes cartes</span>' : "") +
        "</span>" +
      "</button>" +
      (open ? '<div class="grammar-verb-detail">' + verbDetailHTML(verb.inf, verb.fr, { embedded: true }) + "</div>" : "") +
    "</article>"
  );
}

async function renderGrammarVerbList() {
  const items = filteredGrammarVerbs(await getGrammarVerbItems());
  const countEl = $("grammar-verb-count");
  const listEl = $("grammar-verb-list");
  if (!countEl || !listEl) return;

  countEl.textContent = items.length + " verbe" + (items.length > 1 ? "s" : "");
  listEl.innerHTML = items.length
    ? items.map(grammarVerbRowHTML).join("")
    : '<div class="empty-state"><p>Aucun verbe ne correspond à cette recherche.</p></div>';

  listEl.querySelectorAll("[data-grammar-verb-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.grammarVerbToggle;
      selectedGrammarVerb = selectedGrammarVerb === key ? null : key;
      renderGrammarVerbList();
    });
  });
}

async function renderGrammarVerbs() {
  $("grammar-panel-verbs").innerHTML =
    '<section class="panel grammar-section grammar-verbs-panel">' +
      '<div class="grammar-verbs-header">' +
        '<div><h2>Verbes</h2><p class="muted">Irréguliers, modaux, verbes à particule et verbes fréquents.</p></div>' +
        '<strong id="grammar-verb-count" class="grammar-verb-count">0 verbe</strong>' +
      "</div>" +
      '<div class="grammar-verb-toolbar">' +
        '<input id="grammar-verb-search" type="search" placeholder="Rechercher un verbe ou une traduction" value="' + escapeHTML(grammarVerbQuery) + '">' +
        '<div class="verb-filter-row">' +
          grammarVerbFilterButtonHTML("all", "Tous") +
          grammarVerbFilterButtonHTML("modal", "Modaux") +
          grammarVerbFilterButtonHTML("irregular", "Irréguliers") +
          grammarVerbFilterButtonHTML("particle", "À particule") +
          grammarVerbFilterButtonHTML("regular", "Réguliers") +
          grammarVerbFilterButtonHTML("mine", "Dans mes cartes") +
        "</div>" +
        '<div class="verb-sort-row" aria-label="Tri des verbes">' +
          grammarVerbSortButtonHTML("alpha", "Alphabétique") +
          grammarVerbSortButtonHTML("type", "Par type") +
        "</div>" +
      "</div>" +
      '<div class="grammar-verb-list" id="grammar-verb-list"></div>' +
    "</section>";

  $("grammar-verb-search").addEventListener("input", (event) => {
    clearTimeout(grammarVerbSearchTimer);
    grammarVerbSearchTimer = setTimeout(() => {
      grammarVerbQuery = event.target.value;
      selectedGrammarVerb = null;
      renderGrammarVerbList();
    }, 180);
  });

  $("grammar-panel-verbs").querySelectorAll("[data-verb-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      grammarVerbFilter = btn.dataset.verbFilter;
      selectedGrammarVerb = null;
      renderGrammarVerbs();
    });
  });

  $("grammar-panel-verbs").querySelectorAll("[data-verb-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      grammarVerbSort = btn.dataset.verbSort;
      renderGrammarVerbs();
    });
  });

  await renderGrammarVerbList();
}

function grammarLevelByName(levelName) {
  return GRAMMAR_LEVELS_CONTENT.find((level) => level.level === levelName) || GRAMMAR_LEVELS_CONTENT[0];
}

function grammarLevelChipHTML(level) {
  return '<button class="grammar-level-chip' + (selectedGrammarLevel === level.level ? " active" : "") + '" type="button" data-grammar-level="' + escapeHTML(level.level) + '">' + escapeHTML(level.level) + "</button>";
}

function grammarPointHTML(point, index) {
  const tableHTML = point.table
    ? grammarTablesHTML([{ ...point.table, title: point.table.title || "" }])
    : "";
  const pitfalls = [
    ...(Array.isArray(point.pitfalls) ? point.pitfalls : []),
    ...(point.pitfall ? [point.pitfall] : []),
  ];
  return (
    '<details class="panel grammar-section grammar-accordion" id="grammar-level-point-' + escapeHTML(point.id) + '"' + (index === 0 ? " open" : "") + ">" +
      grammarSummaryHTML(point.title, index) +
      '<div class="grammar-accordion-body">' +
        '<p>' + escapeHTML(point.explanation) + "</p>" +
        (point.caseLink ? '<p class="grammar-case-link">Voir l\'onglet <strong>Les cas</strong> pour les formes liées aux cas.</p>' : "") +
        tableHTML +
        (point.examples?.length ? '<div class="case-cards grammar-example-grid">' + point.examples.map(grammarExampleHTML).join("") + "</div>" : "") +
        grammarNotesHTML(pitfalls) +
      "</div>" +
    "</details>"
  );
}

function renderGrammarLevels() {
  const current = grammarLevelByName(selectedGrammarLevel);
  selectedGrammarLevel = current.level;

  $("grammar-panel-levels").innerHTML =
    '<section class="panel grammar-section grammar-levels-home">' +
      '<div class="grammar-levels-head">' +
        '<div><h2>Par niveau</h2><p class="muted">Points de grammaire essentiels classés par niveau CEFR.</p></div>' +
        '<strong class="grammar-verb-count">' + current.points.length + " point" + (current.points.length > 1 ? "s" : "") + "</strong>" +
      "</div>" +
      '<div class="grammar-level-tabs">' +
        GRAMMAR_LEVELS_CONTENT.map(grammarLevelChipHTML).join("") +
      "</div>" +
      '<nav class="grammar-case-toc" aria-label="Sommaire du niveau ' + escapeHTML(current.level) + '">' +
        current.points.map((point, index) =>
          grammarTocItemHTML("grammar-level-point-" + point.id, point.title, index)
        ).join("") +
      "</nav>" +
    "</section>" +
    current.points.map(grammarPointHTML).join("");

  $("grammar-panel-levels").querySelectorAll("[data-grammar-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedGrammarLevel = btn.dataset.grammarLevel;
      renderGrammarLevels();
    });
  });
  attachGrammarTocHandlers($("grammar-panel-levels"));
}

function regularStem(inf) {
  if (inf.endsWith("eln") || inf.endsWith("ern")) return inf.slice(0, -1);
  if (inf.endsWith("en")) return inf.slice(0, -2);
  return inf;
}

function regularPraesens(inf) {
  const stem = regularStem(inf);
  const needsE = /[td]$/.test(stem);
  const noDuS = /[sßxz]$/.test(stem);
  return [
    stem + "e",
    stem + (needsE ? "est" : noDuS ? "t" : "st"),
    stem + (needsE ? "et" : "t"),
    stem + "en",
    stem + (needsE ? "et" : "t"),
    stem + "en",
  ];
}

function regularPerfekt(inf) {
  const stem = regularStem(inf);
  if (inf.endsWith("ieren")) return "hat " + stem + "t";
  const noGe = ["be", "emp", "ent", "er", "ge", "miss", "ver", "zer"].some((prefix) => inf.startsWith(prefix));
  return "hat " + (noGe ? "" : "ge") + stem + (/[td]$/.test(stem) ? "et" : "t");
}

function regularPraeteritum(inf) {
  const stem = regularStem(inf);
  return stem + (/[td]$/.test(stem) ? "ete" : "te");
}

function findIrregularVerbEntry(infinitive) {
  const inf = normalizedGermanWord(infinitive);
  return IRREGULAR_VERBS.find((verb) => normalizedGermanWord(verb.inf) === inf) || null;
}

function findCommonRegularVerbEntry(infinitive) {
  const inf = normalizedGermanWord(infinitive);
  return COMMON_REGULAR_VERBS.find((verb) => normalizedGermanWord(verb.inf) === inf) || null;
}

function separablePraesens(prefix, baseForms) {
  return baseForms.map((form) => form + " " + prefix);
}

function separablePerfekt(prefix, basePerfekt) {
  const match = String(basePerfekt || "").match(/^(hat|ist)\s+(.+)$/);
  if (!match) return "hat " + prefix + regularPerfekt("machen").replace(/^hat\s+/, "");
  return match[1] + " " + prefix + match[2];
}

function getVerbConjugation(infinitive) {
  const inf = normalizedGermanWord(infinitive);
  const entry = findIrregularVerbEntry(inf);
  const generatedPraesens = regularPraesens(inf);
  if (entry) {
    return {
      inf: entry.inf,
      fr: entry.fr || null,
      praesens: entry.praesens || generatedPraesens,
      perfekt: entry.perfekt,
      praeteritum: entry.praeteritum,
      note: entry.note || "",
    };
  }

  const separable = splitSeparableVerb(inf);
  if (separable) {
    const base = getVerbConjugation(separable.base);
    const commonEntry = findCommonRegularVerbEntry(inf);
    return {
      inf: inf,
      fr: commonEntry?.fr || null,
      praesens: separablePraesens(separable.prefix, base.praesens),
      perfekt: separablePerfekt(separable.prefix, base.perfekt),
      praeteritum: base.praeteritum + " " + separable.prefix,
      note: "verbe à particule séparable : la particule va en fin de proposition principale",
    };
  }

  const commonEntry = findCommonRegularVerbEntry(inf);
  return {
    inf: inf,
    fr: commonEntry?.fr || null,
    praesens: generatedPraesens,
    perfekt: regularPerfekt(inf),
    praeteritum: regularPraeteritum(inf),
    note: "conjugaison régulière supposée",
  };
}

function verbDetailHTML(infinitive, userTranslation = "", options = {}) {
  const verb = getVerbConjugation(infinitive);
  const translation = userTranslation || verb.fr || "";
  const perfektAux = verb.perfekt.startsWith("ist ") ? "bin" : "habe";
  const perfektPart = verb.perfekt.replace(/^(hat|ist)\s+/, "");
  const perfektSentence = "Ich " + perfektAux + " " + perfektPart + ".";
  const detailClass = (options.embedded ? "" : "panel ") + "verb-detail-card";

  return (
    '<section class="' + detailClass + '">' +
      '<div class="panel-heading-row"><div><h2>' + escapeHTML(verb.inf) + (translation ? " · " + escapeHTML(translation) : "") + "</h2>" +
      '<p class="muted">Fiche de conjugaison</p></div>' + speakButtonHTML(verb.inf) + "</div>" +
      '<div class="verb-conjugation-grid">' +
        '<article class="tense-card"><h3>' + escapeHTML(TENSE_GUIDE.praesens.title) + "</h3><p>" + escapeHTML(TENSE_GUIDE.praesens.description) + "</p>" +
          VERB_PERSONS.map((person, index) => {
            const spoken = person.split("/")[0] + " " + verb.praesens[index];
            return '<div class="verb-form-row"><span>' + escapeHTML(person) + '</span><strong>' + escapeHTML(verb.praesens[index]) + '</strong>' + speakButtonHTML(spoken) + "</div>";
          }).join("") +
        "</article>" +
        '<article class="tense-card"><h3>' + escapeHTML(TENSE_GUIDE.perfekt.title) + "</h3><p>" + escapeHTML(TENSE_GUIDE.perfekt.description) + "</p>" +
          '<div class="verb-form-row"><span>Perfekt</span><strong>' + escapeHTML(verb.perfekt) + '</strong>' + speakButtonHTML(verb.perfekt) + "</div>" +
          '<p class="example-de">' + escapeHTML(perfektSentence) + " " + speakButtonHTML(perfektSentence) + "</p>" +
        "</article>" +
        '<article class="tense-card"><h3>' + escapeHTML(TENSE_GUIDE.praeteritum.title) + "</h3><p>" + escapeHTML(TENSE_GUIDE.praeteritum.description) + "</p>" +
          '<div class="verb-form-row"><span>ich</span><strong>' + escapeHTML(verb.praeteritum) + '</strong>' + speakButtonHTML("ich " + verb.praeteritum) + "</div>" +
          '<p class="grammar-note">Le Präteritum est surtout utilisé à l\'écrit, mais il est très important pour sein, haben et les verbes modaux.</p>' +
        "</article>" +
      "</div>" +
      (verb.note ? '<p class="grammar-note">' + escapeHTML(verb.note) + "</p>" : "") +
    "</section>"
  );
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

function slugifyFilePart(value) {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "pack";
}

async function downloadOrShareJSON(payload, fileName) {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const file = new File([blob], fileName, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") return "aborted";
      console.warn("Partage impossible, téléchargement classique :", error);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
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
    kind: "backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: cards,
    reviews: reviews,
    images: exportedImages,
    customDecks: getCustomDecks(),
    packs: getPacks(),
    customSubcategories: getCustomSubcategories(),
  };

  const fileName = `deutsch-flash-studio-${new Date().toISOString().slice(0,10)}.json`;
  const result = await downloadOrShareJSON(payload, fileName);
  if (result === "aborted") return;
  localStorage.setItem(LS_LAST_EXPORT_AT, todayISO());
  refreshBackupInfoIfVisible();
  toast(result === "shared" ? "Export partagé ✓" : "Export téléchargé ✓");
}

async function exportPack(packId) {
  const pack = getPackById(packId);
  if (!pack) return;
  const allCards = await getAllCards();
  const cards = packCards(pack, allCards);
  if (cards.length === 0) {
    toast("Ce pack est vide.");
    return;
  }

  const imageIds = [...new Set(cards.map((card) => card.imageId).filter(Boolean))];
  const images = [];
  for (const id of imageIds) {
    const image = await getImage(id);
    if (image) images.push({ id: id, data: await blobToBase64(image.blob) });
  }

  const payload = {
    app: "Deutsch Flash Studio",
    kind: "pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    pack: { name: pack.name, color: pack.color },
    cards: cards,
    images: images,
  };

  const fileName = "dfs-pack-" + slugifyFilePart(pack.name) + "-" + new Date().toISOString().slice(0, 10) + ".json";
  const result = await downloadOrShareJSON(payload, fileName);
  if (result === "aborted") return;
  toast(result === "shared" ? "Pack partagé ✓" : "Pack téléchargé ✓");
}

function isCompleteBackupLikeFile(data) {
  return Boolean(data) && (
    Array.isArray(data.customDecks) ||
    Array.isArray(data.reviews) ||
    Array.isArray(data.packs) ||
    Array.isArray(data.customSubcategories)
  );
}

function detectImportKind(data) {
  if (data?.kind === "backup") return "backup";
  if (data?.kind === "pack") return "pack";
  if (data?.kind) return "unknown";
  if (isCompleteBackupLikeFile(data)) return "backup";
  if (data && data.pack && Array.isArray(data.cards)) return "pack";
  if (data && Array.isArray(data.cards)) return "backup";
  return "unknown";
}

async function readPackImportFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  const kind = detectImportKind(data);
  if (kind !== "pack") {
    if (kind === "backup") throw new Error("BACKUP_FILE_IN_PACK_IMPORT");
    throw new Error("PACK_IMPORT_INVALID_KIND");
  }

  const packName = String(data.pack?.name || "").trim();
  if (!packName) throw new Error("PACK_IMPORT_MISSING_NAME");
  if (!Array.isArray(data.cards) || data.cards.length === 0) throw new Error("PACK_IMPORT_EMPTY_CARDS");

  return {
    app: data.app || "",
    kind: "pack",
    version: data.version || 1,
    exportedAt: data.exportedAt || "",
    pack: {
      name: packName,
      color: PACK_COLORS.includes(data.pack?.color) ? data.pack.color : PACK_COLORS[0],
    },
    cards: data.cards,
    images: Array.isArray(data.images) ? data.images : [],
  };
}

async function analysePackFile(data) {
  const allCards = await getAllCards();
  const localKeys = new Map(allCards.map((card) => [cardMatchKey(card), card]));

  const seen = new Set();
  const existing = [];
  const fresh = [];
  const needsCategory = [];

  (data.cards || []).forEach((raw) => {
    const card = normalizeCard(raw || {});
    const rawCategory = String(raw?.category || "").trim();
    if (!card.de && !card.fr) return;
    const key = cardMatchKey(card);
    if (seen.has(key)) return;
    seen.add(key);
    const local = localKeys.get(key);
    if (local) existing.push(local);
    else {
      card.category = rawCategory;
      const resolvedCategory = rawCategory ? resolveImportedCardCategory(card, data.pack?.name) : inferredRealCategory(card);
      if (resolvedCategory) {
        card.category = resolvedCategory;
      } else {
        card.category = "";
        card._needsCategory = true;
        needsCategory.push(card);
      }
      fresh.push(card);
    }
  });

  return {
    existing: existing,
    fresh: fresh,
    needsCategory: needsCategory,
    availableCategories: getAllKnownCategories(allCards),
    packName: data.pack?.name,
    packColor: data.pack?.color,
  };
}

async function previewPackImportFile(file) {
  try {
    pendingPackImportFile = file;
    pendingPackImportData = await readPackImportFile(file);
    pendingPackImportAnalysis = await analysePackFile(pendingPackImportData);
    if (!pendingPackImportAnalysis.existing.length && !pendingPackImportAnalysis.fresh.length) {
      throw new Error("PACK_IMPORT_EMPTY_CARDS");
    }
    renderPackImportModal();
    showModal("pack-import-modal");
  } catch (error) {
    console.error("Prévisualisation pack impossible :", error);
    closePackImportModal();
    if (error.message === "BACKUP_FILE_IN_PACK_IMPORT") {
      await previewImportFile(file);
    } else if (error.message === "PACK_IMPORT_MISSING_NAME") {
      toast("Fichier pack invalide : nom de pack manquant.");
    } else if (error.message === "PACK_IMPORT_EMPTY_CARDS") {
      toast("Fichier pack invalide : aucune carte à importer.");
    } else if (error instanceof SyntaxError) {
      toast("JSON invalide : impossible d'importer ce pack.");
    } else {
      toast("Fichier invalide : impossible d'importer ce pack.");
    }
  }
}

function renderPackImportModal() {
  const analysis = pendingPackImportAnalysis;
  if (!analysis) return;
  const existingPack = getPacks().find((pack) => pack.name.toLowerCase() === String(analysis.packName || "").toLowerCase()) || null;
  const newName = getUniquePackName(analysis.packName);
  const total = analysis.existing.length + analysis.fresh.length;
  const needsCategory = analysis.needsCategory || [];

  $("pack-import-name").textContent = "Pack « " + analysis.packName + " »";
  $("pack-import-total").textContent = total + " carte" + (total > 1 ? "s" : "") + " dans le fichier";
  $("pack-import-existing").textContent = analysis.existing.length;
  $("pack-import-fresh").textContent = analysis.fresh.length;
  $("pack-import-category-fix").classList.toggle("hidden", needsCategory.length === 0);
  $("pack-import-category-message").textContent = needsCategory.length
    ? needsCategory.length + " nouvelle(s) carte(s) n'ont pas de vraie catégorie. Choisis une catégorie avant d'importer."
    : "";
  $("pack-import-category-cards").textContent = needsCategory
    .slice(0, 10)
    .map(fullWord)
    .join(", ") + (needsCategory.length > 10 ? "…" : "");
  $("pack-import-category-select").innerHTML =
    '<option value="">Choisir une catégorie</option>' +
    (analysis.availableCategories || []).map((category) => '<option value="' + escapeHTML(category) + '">' + escapeHTML(category) + "</option>").join("") +
    '<option value="__new__">Nouvelle catégorie…</option>';
  $("pack-import-category-new").value = "";
  $("pack-import-category-new").classList.add("hidden");
  $("pack-import-choice").classList.toggle("hidden", !existingPack);
  $("pack-import-new-name").textContent = newName;
  const mergeChoice = document.querySelector('input[name="pack-import-mode"][value="merge"]');
  if (mergeChoice) mergeChoice.checked = true;
  syncPackImportConfirmState();
}

function closePackImportModal() {
  hideModal("pack-import-modal");
  pendingPackImportFile = null;
  pendingPackImportData = null;
  pendingPackImportAnalysis = null;
  $("pack-import-file").value = "";
}

function getPackImportAssignedCategory() {
  const needsCategory = pendingPackImportAnalysis?.needsCategory || [];
  if (!needsCategory.length) return "";
  const selected = $("pack-import-category-select").value;
  if (selected === "__new__") return $("pack-import-category-new").value.trim();
  return selected.trim();
}

function syncPackImportConfirmState() {
  const needsCategory = pendingPackImportAnalysis?.needsCategory || [];
  const wantsNew = $("pack-import-category-select").value === "__new__";
  $("pack-import-category-new").classList.toggle("hidden", !wantsNew);
  const assigned = getPackImportAssignedCategory();
  const blocked = needsCategory.length > 0 && isInvalidPackCategory(assigned, pendingPackImportAnalysis?.packName);
  $("btn-confirm-pack-import").disabled = blocked;
}

async function confirmPackImport() {
  const data = pendingPackImportData;
  const analysis = pendingPackImportAnalysis;
  if (!data || !analysis) {
    toast("Aucun pack prêt à importer.");
    return;
  }

  try {
    const cardsNeedingCategory = analysis.needsCategory || [];
    const assignedCategory = getPackImportAssignedCategory();
    if (cardsNeedingCategory.length && isInvalidPackCategory(assignedCategory, analysis.packName)) {
      toast("Choisis une vraie catégorie avant d'importer.");
      return;
    }
    cardsNeedingCategory.forEach((card) => { card.category = assignedCategory; });

    const existingPack = getPacks().find((pack) => pack.name.toLowerCase() === String(analysis.packName || "").toLowerCase()) || null;
    const selectedMode = document.querySelector('input[name="pack-import-mode"]:checked')?.value || "merge";
    let targetPack = existingPack && selectedMode === "merge" ? existingPack : null;
    if (!targetPack) {
      targetPack = createPack(existingPack ? getUniquePackName(analysis.packName) : analysis.packName, analysis.packColor);
    }
    if (!targetPack) {
      targetPack = createPack(getUniquePackName(analysis.packName), analysis.packColor);
    }
    if (!targetPack) {
      toast("Impossible de créer ce pack.");
      return;
    }

    const imageById = new Map((data.images || []).filter((image) => image?.id && image?.data).map((image) => [String(image.id), image]));
    const importedImageIds = new Map();
    const existingIds = analysis.existing.map((card) => card.id);
    const newIds = [];
    let createdCount = 0;

    for (const sourceCard of analysis.fresh) {
      const oldImageId = sourceCard.imageId ? String(sourceCard.imageId) : "";
      let nextImageId = null;
      if (oldImageId && imageById.has(oldImageId)) {
        if (!importedImageIds.has(oldImageId)) {
          const nextId = uniqueId("img");
          try {
            await saveImage(nextId, base64ToBlob(imageById.get(oldImageId).data));
            importedImageIds.set(oldImageId, nextId);
          } catch (error) {
            console.warn("Image de pack ignorée pendant l'import :", oldImageId, error);
            importedImageIds.set(oldImageId, null);
          }
        }
        nextImageId = importedImageIds.get(oldImageId);
      }

      const nextCard = normalizeCard({
        ...sourceCard,
        id: uniqueId("card"),
        imageId: nextImageId,
        srs: normalizeSrs(sourceCard.srs),
      });
      await saveCard(nextCard);
      newIds.push(nextCard.id);
      createdCount++;
    }

    addCardsToPack(targetPack.id, [...existingIds, ...newIds]);
    purgePackCardIds(await getAllCards());
    clearImageUrlCache();

    const packName = targetPack.name;
    const existingCount = analysis.existing.length;
    closePackImportModal();
    toast("Pack « " + packName + " » importé · " + createdCount + " carte(s) créée(s), " + existingCount + " déjà présente(s).");
    renderPacksPageIfVisible();
    refreshDashboard();
    renderLibraryIfVisible();
    renderReviewHubIfVisible();
    renderDeckDetailIfVisible();
    refreshCategorySuggestions();
    refreshSubcategorySuggestions();
  } catch (error) {
    console.error("Import pack impossible :", error);
    toast("Impossible d'importer ce pack.");
  }
}

async function readImportFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  const kind = detectImportKind(data);

  if (kind === "pack") {
    throw new Error("PACK_FILE_IN_BACKUP_IMPORT");
  }

  if (kind !== "backup" && !isCompleteBackupLikeFile(data)) {
    throw new Error("Format de fichier invalide");
  }

  if (!data || !Array.isArray(data.cards)) {
    throw new Error("Format de fichier invalide");
  }

  return {
    kind: "backup",
    version: data.version || "",
    exportedAt: data.exportedAt || "",
    cards: data.cards,
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    images: Array.isArray(data.images) ? data.images : [],
    customDecks: Array.isArray(data.customDecks) ? data.customDecks : [],
    packs: Array.isArray(data.packs) ? data.packs : [],
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
    totalPacksInFile: data.packs.length,
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
    if (data?.kind === "pack") {
      toast("Ce fichier est un pack. Utilise Mes packs → Importer un pack.");
      return;
    }

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
      mergePacks(Array.isArray(data.packs) ? data.packs : [], true);
      mergeCustomSubcategories(Array.isArray(data.customSubcategories) ? data.customSubcategories : [], true);
      if (editingCard) resetCardForm();
    } else if (Array.isArray(data.customDecks)) {
      mergeCustomDecks(data.customDecks, false);
    }
    if (mode !== "replace" && Array.isArray(data.packs)) {
      mergePacks(data.packs, false);
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
    await repairPackCategorySeparationData();
    purgePackCardIds(await getAllCards());

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
      if (isSessionRunning()) startReviewSession();
      else renderReviewHub();
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
    showModal("import-preview-modal");
  } catch (error) {
    console.error("Prévisualisation import impossible :", error);
    closeImportPreviewModal();
    if (error.message === "PACK_FILE_IN_BACKUP_IMPORT") {
      await previewPackImportFile(file);
    } else {
      toast("Fichier invalide : impossible de prévisualiser cet import.");
    }
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
    importPreviewStatHTML("Packs", analysis.totalPacksInFile) +
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
  hideModal("import-preview-modal");
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
  if ($("page-packs").classList.contains("active")) renderPacksPage();
  refreshCategorySuggestions();
  refreshSubcategorySuggestions();
  renderLibraryIfVisible();
  renderLearningIfVisible();
  renderDeckDetailIfVisible();
  renderMissingImagesIfVisible();
  if ($("page-grammaire").classList.contains("active")) renderGrammarPage();

  if ($("page-revision").classList.contains("active")) {
    if (isSessionRunning()) startReviewSession();
    else renderReviewHub();
  }
}

function dangerCounts(cards = null) {
  const allCards = cards || [];
  const deckNames = new Set();
  getCustomDecks().forEach((deck) => {
    if (deck.name) deckNames.add(deck.name);
  });
  allCards.forEach((card) => {
    const category = cardDeckName(card);
    if (isPreferredDeckCategory(category)) deckNames.add(category);
  });
  return {
    cards: allCards.length,
    packs: getPacks().length,
    decks: deckNames.size,
  };
}

function countLabel(count, singular, plural = singular + "s") {
  return count + " " + (count > 1 ? plural : singular);
}

function clearAppLocalStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("dfs_"))
    .forEach((key) => localStorage.removeItem(key));
}

function resetRuntimeStateAfterDangerAction() {
  currentReviewMode = "classic";
  reviewSessionType = "due";
  pendingSessionType = "due";
  pendingStudyScope = null;
  pendingLearningCategory = null;
  currentLearningScope = null;
  currentReviewCategory = null;
  reviewQueue = [];
  currentCard = null;
  reviewSessionStats = null;
  currentDeckDetailCategory = null;
  currentDeckDetailPackId = null;
  deckDetailSearch = "";
  deckDetailSubcategoryFilter = "";
  deckDetailLevelFilter = "";
  deckDetailSelectionMode = false;
  librarySelectionMode = false;
  deckGridSelectionMode = false;
  selectedDeckCardIds.clear();
  selectedLibraryCardIds.clear();
  selectedDeckNames.clear();
  currentCardDetailId = null;
  cardDetailDirty = false;
  difficultManageCards = [];
  pendingDifficultCardId = null;
  libraryOnlyFavorites = false;
  libraryOnlyNoImage = false;
  libraryOnlyDue = false;
  libraryFiltersOpen = false;
  deckDetailFiltersOpen = false;
  learningOnlyNew = true;
  currentLearningIndex = 0;
  selectedGrammarVerb = null;
  grammarVerbQuery = "";
  grammarVerbFilter = "all";
  grammarVerbSort = "alpha";
  selectedGrammarLevel = "A1";
  skippedMissingImageIds.clear();
  if (editingCard) resetCardForm();
  clearImageUrlCache();
  syncSelectionModeClass();
}

async function deleteAllCardsAndImagesFromBackupPage() {
  const counts = dangerCounts(await getAllCards());
  const firstConfirm = confirm(
    "Supprimer " + countLabel(counts.cards, "carte") + " et leurs images ?\n\nLes jeux et packs resteront mais seront vides. L'historique de révision sera aussi supprimé. Cette action est irréversible."
  );
  if (!firstConfirm) return;

  const secondConfirm = confirm(
    "Dernière confirmation : " + countLabel(counts.cards, "carte") + ", les images associées et l'historique vont être supprimés. Confirmer ?"
  );
  if (!secondConfirm) return;

  try {
    await clearStore("cards");
    await clearStore("images");
    await clearStore("reviews");
    purgePackCardIds([]);

    clearImageUrlCache();
    if (editingCard) resetCardForm();

    toast(countLabel(counts.cards, "carte") + " supprimée" + (counts.cards > 1 ? "s" : "") + ". Jeux et packs conservés.");
    refreshAfterDangerAction();
  } catch (error) {
    console.error("Échec de suppression des cartes et images :", error);
    toast("Impossible de supprimer les cartes et images.");
  }
}

async function deleteAllPacks() {
  const counts = dangerCounts(await getAllCards());
  const confirmed = confirm(
    "Tes " + countLabel(counts.packs, "pack") + " seront supprimés. Les cartes qu'ils contiennent ne sont pas touchées."
  );
  if (!confirmed) return;

  localStorage.removeItem(LS_PACKS);
  currentDeckDetailPackId = null;
  if (isPackScope(currentReviewCategory)) currentReviewCategory = null;

  toast(countLabel(counts.packs, "pack") + " supprimé" + (counts.packs > 1 ? "s" : "") + ".");
  refreshAfterDangerAction();
}

async function deleteAllDecks() {
  const cards = await getAllCards();
  const counts = dangerCounts(cards);
  const firstConfirm = confirm(
    "Supprimer " + countLabel(counts.decks, "jeu", "jeux") + " et leurs sous-catégories personnalisées ?\n\nTu peux garder " + countLabel(counts.cards, "carte") + " : elles seront placées dans Général. Tu peux aussi supprimer les cartes avec les jeux."
  );
  if (!firstConfirm) return;

  const choice = prompt(
    "Dernière confirmation.\n\nTape GARDER pour supprimer " + countLabel(counts.decks, "jeu", "jeux") + " et placer " + countLabel(counts.cards, "carte") + " dans Général.\nTape SUPPRIMER pour supprimer les jeux, " + countLabel(counts.cards, "carte") + ", les images et l'historique."
  );
  if (choice === null) return;

  const normalizedChoice = choice.trim().toUpperCase();
  if (normalizedChoice !== "GARDER" && normalizedChoice !== "SUPPRIMER") {
    toast("Action annulée : choix non reconnu.");
    return;
  }

  try {
    localStorage.removeItem(LS_DECKS);
    localStorage.removeItem(LS_SUBCATEGORIES);
    selectedDeckNames.clear();
    deckGridSelectionMode = false;
    syncSelectionModeClass();
    currentDeckDetailCategory = null;
    currentDeckDetailPackId = null;

    if (normalizedChoice === "SUPPRIMER") {
      await clearStore("cards");
      await clearStore("images");
      await clearStore("reviews");
      purgePackCardIds([]);
      clearImageUrlCache();
      if (editingCard) resetCardForm();
      toast(countLabel(counts.decks, "jeu", "jeux") + " et " + countLabel(counts.cards, "carte") + " supprimés.");
    } else {
      for (const card of cards) {
        card.category = "Général";
        card.subcategory = "";
        card.updatedAt = todayISO();
        await saveCard(normalizeCard(card));
      }
      toast(countLabel(counts.decks, "jeu", "jeux") + " supprimés. Les cartes sont maintenant dans Général.");
    }

    refreshAfterDangerAction();
  } catch (error) {
    console.error("Échec de suppression des jeux :", error);
    toast("Impossible de supprimer les jeux.");
  }
}

async function resetAppFromBackupPage() {
  const counts = dangerCounts(await getAllCards());
  const firstConfirm = confirm(
    "Tout remettre à zéro ?\n\nCela supprimera " +
    countLabel(counts.cards, "carte") + ", " +
    countLabel(counts.packs, "pack") + ", " +
    countLabel(counts.decks, "jeu", "jeux") +
    ", les images, l'historique et les réglages locaux de l'app."
  );
  if (!firstConfirm) return;

  const typed = prompt("Confirmation renforcée : tape SUPPRIMER pour remettre l'application à zéro.");
  if (typed === null) return;
  if (typed.trim().toUpperCase() !== "SUPPRIMER") {
    toast("Remise à zéro annulée : confirmation incorrecte.");
    return;
  }

  try {
    await clearStore("cards");
    await clearStore("images");
    await clearStore("reviews");
    clearAppLocalStorage();
    resetRuntimeStateAfterDangerAction();
    toast("Application remise à zéro.");
    refreshAfterDangerAction();
  } catch (error) {
    console.error("Échec de remise à zéro :", error);
    toast("Impossible de remettre l'application à zéro.");
  }
}

function setupBackupPage() {
  $("btn-export").addEventListener("click", exportData);
  $("btn-force-update").addEventListener("click", forceUpdateAppCache);
  $("btn-delete-all-data").addEventListener("click", deleteAllCardsAndImagesFromBackupPage);
  $("btn-delete-all-packs").addEventListener("click", deleteAllPacks);
  $("btn-delete-all-decks").addEventListener("click", deleteAllDecks);
  $("btn-reset-app").addEventListener("click", resetAppFromBackupPage);
  $("btn-toggle-danger-zone").addEventListener("click", () => {
    const hidden = $("danger-zone-content").classList.toggle("hidden");
    $("btn-toggle-danger-zone").textContent = hidden ? "Afficher les actions" : "Masquer les actions";
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

async function forceUpdateAppCache() {
  const confirmed = confirm(
    "Recharger l'application proprement ?\n\nTes cartes ne sont pas touchées."
  );
  if (!confirmed) return;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn("Nettoyage du cache incomplet :", error);
  }
  window.location.reload();
}

function setupServiceWorkerUpdates() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./sw.js").then((registration) => {
    registration.update();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) registration.update();
    });

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          toast("Nouvelle version disponible. Relance l'app pour l'appliquer.");
        }
      });
    });
  }).catch((error) => console.warn("Service worker non enregistré :", error));

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

function cleanupObsoleteLocalStorage() {
  OBSOLETE_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}


/* =========================================================
   13. DÉMARRAGE DE L'APPLICATION
   ========================================================= */

async function startApp() {
  function runSetup(name, fn) {
    try {
      fn();
    } catch (error) {
      console.error("Échec du setup « " + name + " » :", error);
    }
  }

  resetModalScrollLockState();

  try {
    cleanupObsoleteLocalStorage();
    await initDB();
    requestPersistentStorage();
    await seedIfEmpty();
    await runPackCategorySeparationMigration();
    await runVerbSubcategoryMigration();
    await runGovernedCaseMigration();
  } catch (error) {
    console.error("Échec du démarrage :", error);
    toast("Erreur au démarrage. Certaines données peuvent être indisponibles.");
  }

  runSetup("navigation", setupNavigation);
  runSetup("modalScrollLock", setupModalScrollLock);
  runSetup("learning", setupLearningPage);
  runSetup("review", setupReviewPage);
  runSetup("addForm", setupAddForm);
  runSetup("library", setupLibraryPage);
  runSetup("grammar", setupGrammarPage);
  runSetup("backup", setupBackupPage);
  runSetup("imagePicker", setupImagePicker);
  runSetup("serviceWorker", setupServiceWorkerUpdates);
  runSetup("voices", warmUpVoices);
  runSetup("mobileViewportReflow", setupMobileViewportReflow);

  try {
    resetModalScrollLockState();
    showPage("dashboard");
    forceMobileViewportReflow(true);
  } catch (error) {
    console.error("Échec de l'affichage initial :", error);
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    $("page-dashboard").classList.add("active");
    forceMobileViewportReflow(true);
    toast("Erreur d'affichage. Retour aux jeux.");
  }
}

// On attend que le HTML soit chargé avant de démarrer
document.addEventListener("DOMContentLoaded", startApp);
