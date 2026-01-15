import { writable, derived } from "svelte/store";

export type Language = "fr" | "en";

const translations = {
  fr: {
    //Global
    "global.title": "Peeps",

    // App
    "app.roomCreated": "Room créée avec le code",
    "app.hasLeft": "a quitté la room",
    "app.hasJoined": "a rejoint la room",
    "app.connectionFailed": "Échec de connexion - réessayez plus tard",

    // ChatSetup
    "setup.subtitle": "Chat décentralisé sans serveur",
    "setup.username": "Votre pseudo",
    "setup.usernamePlaceholder": "Entrez votre pseudo",
    "setup.roomId": "Code de la room",
    "setup.roomIdPlaceholder": "ex: abc123",
    "setup.joinRoom": "Rejoindre la room",
    "setup.createRoom": "Créer une nouvelle room",
    "setup.roomDetected": "Room détectée dans l'URL",
    "setup.errorUsername": "Veuillez entrer un pseudo",
    "setup.errorFields": "Veuillez remplir tous les champs",

    // Chat
    "chat.room": "Room",
    "chat.you": "Vous",
    "chat.participants": "Participants",
    "chat.messagePlaceholder": "Écrivez votre message...",
    "chat.send": "Envoyer",
    "chat.newMessages": "nouveau",
    "chat.newMessagesPlural": "nouveaux",
    "chat.message": "message",
    "chat.messagePlural": "messages",
    "chat.linkCopied": "Copié !",
    "chat.linkCopyError": "Erreur lors de la copie",
    "chat.copyLink": "Copier le lien de partage",
    "chat.connected": "Connecté",
    "chat.connecting": "Connexion...",
    "chat.reconnecting": "Reconnexion...",
    "chat.connectionError": "Erreur de connexion",
    "chat.disconnected": "Déconnecté",
  },
  en: {
    //Global
    "global.title": "Peeps",

    // App
    "app.roomCreated": "Room created with code",
    "app.hasLeft": "has left the room",
    "app.hasJoined": "has joined the room",
    "app.connectionFailed": "Connection failed - try again later",

    // Setup
    "setup.subtitle": "Decentralized chat without server",
    "setup.username": "Your username",
    "setup.usernamePlaceholder": "Enter your username",
    "setup.roomId": "Room code",
    "setup.roomIdPlaceholder": "e.g. abc123",
    "setup.joinRoom": "Join room",
    "setup.createRoom": "Create new room",
    "setup.roomDetected": "Room detected in URL",
    "setup.errorUsername": "Please enter a username",
    "setup.errorFields": "Please fill all fields",

    // Chat
    "chat.room": "Room",
    "chat.you": "You",
    "chat.participants": "Participants",
    "chat.messagePlaceholder": "Write your message...",
    "chat.send": "Send",
    "chat.newMessages": "new",
    "chat.newMessagesPlural": "new",
    "chat.message": "message",
    "chat.messagePlural": "messages",
    "chat.linkCopied": "Copied!",
    "chat.linkCopyError": "Error copying link",
    "chat.copyLink": "Copy share link",
    "chat.connected": "Connected",
    "chat.connecting": "Connecting...",
    "chat.reconnecting": "Reconnecting...",
    "chat.connectionError": "Connection error",
    "chat.disconnected": "Disconnected",
  },
} as const;

type TranslationKey = keyof typeof translations.fr;

// Detect browser language
const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem("language") as Language | null;
  if (saved && (saved === "fr" || saved === "en")) return saved;

  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("fr") ? "fr" : "en";
};

export const currentLanguage = writable<Language>(getInitialLanguage());

export const t = derived(currentLanguage, ($lang) => {
  return (key: TranslationKey): string => {
    return translations[$lang][key] || key;
  };
});

export function setLanguage(lang: Language) {
  currentLanguage.set(lang);
  localStorage.setItem("language", lang);
}
