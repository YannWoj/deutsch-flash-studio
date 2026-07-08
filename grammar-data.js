"use strict";

const GRAMMAR_CASES = {
  intro: "En allemand, l'article change selon le rôle du mot dans la phrase. Pour débuter, les 3 cas essentiels sont : nominatif, accusatif et datif.",
  genitiveNote: "Le génitif existe, mais tu peux le laisser pour plus tard.",
  accusativeNote: "À l'accusatif, seul le masculin change : der devient den.",
  mixedRule: "Prépositions mixtes : datif = position. Accusatif = mouvement.",
  definedArticles: [
    ["Nominatif", "der", "die", "das", "die"],
    ["Accusatif", "den", "die", "das", "die"],
    ["Datif", "dem", "der", "dem", "den (+n)"],
  ],
  indefiniteArticles: [
    ["Nominatif", "ein", "eine", "ein"],
    ["Accusatif", "einen", "eine", "ein"],
    ["Datif", "einem", "einer", "einem"],
  ],
  caseCards: [
    { title: "Nominatif = sujet", example: "Der Hund schläft.", fr: "Le chien dort." },
    { title: "Accusatif = COD", example: "Ich sehe den Hund.", fr: "Je vois le chien." },
    { title: "Datif = COI / à qui ?", example: "Ich helfe dem Mann.", fr: "J'aide l'homme." },
  ],
  prepositions: [
    { title: "Toujours datif", items: ["aus", "bei", "mit", "nach", "seit", "von", "zu"] },
    { title: "Toujours accusatif", items: ["durch", "für", "gegen", "ohne", "um"] },
    { title: "Prépositions mixtes", items: ["in", "an", "auf", "über", "unter", "vor", "hinter", "neben", "zwischen"] },
  ],
  mixedExamples: [
    { de: "Ich bin in der Stadt.", fr: "Je suis en ville." },
    { de: "Ich gehe in die Stadt.", fr: "Je vais en ville." },
  ],
  dativeVerbs: ["helfen", "danken", "gefallen", "gehören", "antworten"],
  dativeVerbExample: { de: "Kannst du mir helfen?", fr: "Peux-tu m'aider ?" },
  pronouns: [
    ["ich", "mich", "mir"],
    ["du", "dich", "dir"],
    ["er", "ihn", "ihm"],
    ["sie", "sie", "ihr"],
    ["es", "es", "ihm"],
    ["wir", "uns", "uns"],
    ["ihr", "euch", "euch"],
    ["sie", "sie", "ihnen"],
    ["Sie", "Sie", "Ihnen"],
  ],
};

const TENSE_GUIDE = {
  praesens: {
    title: "Präsens",
    description: "Le présent. Il sert aussi souvent pour le futur proche : Ich komme morgen."
  },
  perfekt: {
    title: "Perfekt",
    description: "Le passé le plus courant à l'oral. La plupart des verbes utilisent haben, mais les verbes de déplacement/changement d'état utilisent souvent sein."
  },
  praeteritum: {
    title: "Präteritum",
    description: "Passé surtout utilisé à l'écrit et dans les récits. Très important pour sein, haben et les verbes modaux."
  }
};

const IRREGULAR_VERBS = [
  { inf: "sein", fr: "être", praesens: ["bin","bist","ist","sind","seid","sind"], perfekt: "ist gewesen", praeteritum: "war", note: "Le verbe le plus important. Präteritum « war » très courant à l'oral." },
  { inf: "haben", fr: "avoir", praesens: ["habe","hast","hat","haben","habt","haben"], perfekt: "hat gehabt", praeteritum: "hatte", note: "Präteritum « hatte » très courant à l'oral." },
  { inf: "werden", fr: "devenir", praesens: ["werde","wirst","wird","werden","werdet","werden"], perfekt: "ist geworden", praeteritum: "wurde" },
  { inf: "können", fr: "pouvoir", praesens: ["kann","kannst","kann","können","könnt","können"], perfekt: "hat gekonnt", praeteritum: "konnte", note: "Modal : ich/er identiques, sans terminaison." },
  { inf: "müssen", fr: "devoir", praesens: ["muss","musst","muss","müssen","müsst","müssen"], perfekt: "hat gemusst", praeteritum: "musste" },
  { inf: "wollen", fr: "vouloir", praesens: ["will","willst","will","wollen","wollt","wollen"], perfekt: "hat gewollt", praeteritum: "wollte" },
  { inf: "sollen", fr: "devoir / être censé", praesens: ["soll","sollst","soll","sollen","sollt","sollen"], perfekt: "hat gesollt", praeteritum: "sollte" },
  { inf: "dürfen", fr: "avoir le droit", praesens: ["darf","darfst","darf","dürfen","dürft","dürfen"], perfekt: "hat gedurft", praeteritum: "durfte" },
  { inf: "mögen", fr: "aimer bien", praesens: ["mag","magst","mag","mögen","mögt","mögen"], perfekt: "hat gemocht", praeteritum: "mochte" },
  { inf: "wissen", fr: "savoir", praesens: ["weiß","weißt","weiß","wissen","wisst","wissen"], perfekt: "hat gewusst", praeteritum: "wusste" },
  { inf: "gehen", fr: "aller", praesens: null, perfekt: "ist gegangen", praeteritum: "ging" },
  { inf: "kommen", fr: "venir", praesens: null, perfekt: "ist gekommen", praeteritum: "kam" },
  { inf: "sehen", fr: "voir", praesens: ["sehe","siehst","sieht","sehen","seht","sehen"], perfekt: "hat gesehen", praeteritum: "sah" },
  { inf: "essen", fr: "manger", praesens: ["esse","isst","isst","essen","esst","essen"], perfekt: "hat gegessen", praeteritum: "aß" },
  { inf: "trinken", fr: "boire", praesens: null, perfekt: "hat getrunken", praeteritum: "trank" },
  { inf: "geben", fr: "donner", praesens: ["gebe","gibst","gibt","geben","gebt","geben"], perfekt: "hat gegeben", praeteritum: "gab" },
  { inf: "nehmen", fr: "prendre", praesens: ["nehme","nimmst","nimmt","nehmen","nehmt","nehmen"], perfekt: "hat genommen", praeteritum: "nahm" },
  { inf: "sprechen", fr: "parler", praesens: ["spreche","sprichst","spricht","sprechen","sprecht","sprechen"], perfekt: "hat gesprochen", praeteritum: "sprach" },
  { inf: "lesen", fr: "lire", praesens: ["lese","liest","liest","lesen","lest","lesen"], perfekt: "hat gelesen", praeteritum: "las" },
  { inf: "fahren", fr: "conduire / aller en véhicule", praesens: ["fahre","fährst","fährt","fahren","fahrt","fahren"], perfekt: "ist gefahren", praeteritum: "fuhr" },
  { inf: "laufen", fr: "courir / marcher", praesens: ["laufe","läufst","läuft","laufen","lauft","laufen"], perfekt: "ist gelaufen", praeteritum: "lief" },
  { inf: "schlafen", fr: "dormir", praesens: ["schlafe","schläfst","schläft","schlafen","schlaft","schlafen"], perfekt: "hat geschlafen", praeteritum: "schlief" },
  { inf: "helfen", fr: "aider (+ datif)", praesens: ["helfe","hilfst","hilft","helfen","helft","helfen"], perfekt: "hat geholfen", praeteritum: "half", note: "Toujours suivi du datif : Kannst du mir helfen ?" },
  { inf: "finden", fr: "trouver", praesens: null, perfekt: "hat gefunden", praeteritum: "fand", note: "Präsens régulier : du findest, er findet." },
  { inf: "bleiben", fr: "rester", praesens: null, perfekt: "ist geblieben", praeteritum: "blieb" },
  { inf: "stehen", fr: "être debout", praesens: null, perfekt: "hat gestanden", praeteritum: "stand" },
  { inf: "verstehen", fr: "comprendre", praesens: null, perfekt: "hat verstanden", praeteritum: "verstand", note: "ver + stehen : se conjugue comme stehen, sans ge- au Perfekt." },
  { inf: "tun", fr: "faire", praesens: ["tue","tust","tut","tun","tut","tun"], perfekt: "hat getan", praeteritum: "tat" },
  { inf: "heißen", fr: "s'appeler", praesens: ["heiße","heißt","heißt","heißen","heißt","heißen"], perfekt: "hat geheißen", praeteritum: "hieß" },
  { inf: "schreiben", fr: "écrire", praesens: null, perfekt: "hat geschrieben", praeteritum: "schrieb" }
];
