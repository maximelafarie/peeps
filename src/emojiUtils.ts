import data from "@emoji-mart/data";

// Creates a map of shortcodes to native emojis
const emojiMap = new Map<string, string>();

// Typage correct pour @emoji-mart/data
interface EmojiData {
  emojis: Record<
    string,
    {
      id: string;
      keywords?: string[];
      skins: Array<{ native: string }>;
    }
  >;
}

// Populate the emojiMap
const emojiData = data as unknown as EmojiData;
Object.values(emojiData.emojis).forEach((emoji) => {
  emojiMap.set(emoji.id, emoji.skins[0].native);
  // Add also the aliases
  if (emoji.keywords) {
    emoji.keywords.forEach((keyword) => {
      if (!emojiMap.has(keyword)) {
        emojiMap.set(keyword, emoji.skins[0].native);
      }
    });
  }
});

/**
 * Convert shortcodes in a text to native emojis
 * Example: "Hello :smile: world" -> "Hello 😀 world"
 */
export function replaceShortcodes(text: string): string {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, shortcode) => {
    const emoji = emojiMap.get(shortcode);
    return emoji || match; // Retourne l'emoji ou le texte original si non trouvé
  });
}

/**
 * Search emojis by shortcode (for autocompletion)
 */
export function searchEmojis(
  query: string,
  limit = 10
): Array<{ id: string; native: string }> {
  if (!query) return [];

  const results: Array<{ id: string; native: string }> = [];
  const lowerQuery = query.toLowerCase();

  for (const [id, native] of emojiMap.entries()) {
    if (id.includes(lowerQuery)) {
      results.push({ id, native });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Detects if the user is typing a shortcode
 * Returns the query and start position if found
 */
export function detectShortcode(
  text: string,
  cursorPos: number
): { query: string; startPos: number } | null {
  // Serching for the last ':' before the cursor
  const textBeforeCursor = text.substring(0, cursorPos);
  const lastColonIndex = textBeforeCursor.lastIndexOf(":");

  if (lastColonIndex === -1) return null;

  // Check if there is no space between ':' and the cursor
  const textAfterColon = textBeforeCursor.substring(lastColonIndex + 1);
  if (textAfterColon.includes(" ")) return null;

  return {
    query: textAfterColon,
    startPos: lastColonIndex,
  };
}
