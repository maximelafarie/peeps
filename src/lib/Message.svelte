<script lang="ts">
  import type { RichMessage, TenorResult } from "../types";
  import emojiRegex from "emoji-regex-xs";

  interface Props {
    sender: string;
    text: string;
    isOwn: boolean;
    showSender: boolean;
  }

  let { sender, text, isOwn, showSender }: Props = $props();

  const isSystem = $derived(sender === "system");

  function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function linkify(text: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const escaped = escapeHtml(text);
    return escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  function getMessageType(message: string): "gif" | "text" {
    try {
      const obj = JSON.parse(message);
      if (
        obj &&
        obj.type === "gif" &&
        obj.content &&
        typeof obj.content.gif === "string"
      ) {
        return "gif";
      }
    } catch {
      // Not JSON, treat as text
    }
    return "text";
  }

  function renderMessage(message: string): string {
    const type = getMessageType(message);
    if (type === "gif") {
      try {
        const obj: RichMessage<TenorResult> = JSON.parse(message);
        const { gif, width, description } = obj.content || {};
        if (gif) {
          return `<img class="gif" src="${gif}" alt="${description || ""}" width="${width || ""}" />`;
        }
      } catch {
        // Invalid JSON, treat as text
      }
    }

    return linkify(message);
  }

  let formattedText = $derived(renderMessage(text));

  function isOnlyEmojis(text: string): boolean {
    // Remove spaces and check if all characters are emojis
    const cleaned = text.replace(/\s/g, '');
    if (cleaned.length === 0) return false;
    
    const regex = emojiRegex();
    const matches = cleaned.match(regex);
    
    // Check if all characters in cleaned text are emojis
    if (!matches) return false;
    
    // Count visual emojis (not UTF-16 code units)
    const emojiCount = matches.length;
    if (emojiCount > 3) return false;
    
    // Join all emoji matches and compare with cleaned text
    const emojiOnly = matches.join('');
    return emojiOnly === cleaned;
  }

  let isEmojiOnly = $derived(isSystem ? false : isOnlyEmojis(text));
</script>

<div class="message" class:own={isOwn} class:system={isSystem}>
  {#if !isSystem && showSender}
    <div class="sender">{sender}</div>
  {/if}
  <div class="text" class:emoji-only={isEmojiOnly}>
    {@html formattedText}
  </div>
</div>

<style>
  .message {
    margin-bottom: 15px;
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message .sender {
    font-weight: 600;
    color: #667eea;
    margin-bottom: 4px;
    font-size: 14px;
  }

  .message .text {
    background: white;
    padding: 10px 14px;
    border-radius: 12px;
    display: inline-flex;
    max-width: 80%;
    word-wrap: break-word;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .message.own {
    text-align: right;
  }

  .message.own .sender {
    color: #764ba2;
  }

  .message.own .text {
    background: #e8dff5;
  }

  .message .text :global(a) {
    color: #667eea;
    text-decoration: underline;
  }

  .message .text :global(a:hover) {
    color: #764ba2;
  }

  :global(.message .text:has(.gif)) {
    padding: 0;
    overflow: hidden;
  }

  .message.system {
    text-align: center;
  }

  .message.system .text {
    background: #e3f2fd;
    color: #1976d2;
    font-size: 13px;
    font-style: italic;
  }

  .message .text.emoji-only {
    font-size: 2.5em;
    padding: 15px 20px;
    line-height: 1;
  }
</style>
