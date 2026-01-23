<script lang="ts">
  import { ArrowUp, Copy, CopyCheck, FingerprintPattern } from "@lucide/svelte";
  import Message from "./Message.svelte";
  import EmojiPicker from "./EmojiPicker.svelte";
  import {
    replaceShortcodes,
    searchEmojis,
    detectShortcode,
  } from "../emojiUtils";
  import { t } from "../i18n";
  import logo from "/logo.svg";
  import GifPicker from "./GifPicker.svelte";
  import type { TenorResult } from "../types";

  interface Props {
    roomId: string;
    username: string;
    peers: Record<string, string>;
    messages: Array<{
      id: string;
      sender: string;
      text: string;
      isOwn: boolean;
      timestamp: number;
    }>;
    onsendMessage: (_text: string) => void;
    fingerprint: string;
    connectionStatus?: string;
  }

  let { roomId, username, peers, messages, onsendMessage, fingerprint }: Props =
    $props();

  let messageInput = $state("");
  let messagesContainer = $state<HTMLDivElement | undefined>(undefined);
  let textareaElement = $state<HTMLTextAreaElement | undefined>(undefined);
  let isAtBottom = $state(true);
  let unreadCount = $state(0);
  let lastReadIndex = $state(0);
  let copyFeedback = $state(false);

  // Emoji autocomplete
  let showAutocomplete = $state(false);
  let autocompleteResults = $state<Array<{ id: string; native: string }>>([]);
  let selectedAutocompleteIndex = $state(0);
  let autocompletePosition = $state({ startPos: 0, query: "" });

  function handleSendMessage() {
    const text = messageInput.trim();
    if (!text) return;

    // Convert shortcodes to emojis before sending
    const textWithEmojis = replaceShortcodes(text);

    onsendMessage(textWithEmojis);
    messageInput = "";
    showAutocomplete = false;
  }

  function handleSendGif(gifResult: TenorResult) {
    if (!gifResult || !gifResult.gif) return;

    onsendMessage(JSON.stringify({ type: "gif", content: gifResult }));
  }

  function handleKeyPress(event: KeyboardEvent) {
    // Handle keyboard navigation when autocomplete is shown
    if (showAutocomplete) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedAutocompleteIndex = Math.min(
          selectedAutocompleteIndex + 1,
          autocompleteResults.length - 1,
        );
        return;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, 0);
        return;
      } else if (event.key === "Tab" || event.key === "Enter") {
        if (autocompleteResults.length > 0) {
          event.preventDefault();
          insertEmoji(autocompleteResults[selectedAutocompleteIndex]);
          return;
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        showAutocomplete = false;
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey && !showAutocomplete) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function handleInput() {
    const cursorPos = textareaElement?.selectionStart || 0;
    const detection = detectShortcode(messageInput, cursorPos);

    if (detection) {
      const results = searchEmojis(detection.query);
      if (results.length > 0) {
        autocompleteResults = results;
        autocompletePosition = detection;
        showAutocomplete = true;
        selectedAutocompleteIndex = 0;
      } else {
        showAutocomplete = false;
      }
    } else {
      showAutocomplete = false;
    }
  }

  function insertEmoji(emoji: { id: string; native: string }) {
    const before = messageInput.substring(0, autocompletePosition.startPos);
    const after = messageInput.substring(
      textareaElement?.selectionStart || messageInput.length,
    );
    messageInput = before + emoji.native + after;
    showAutocomplete = false;

    // Refocus the input
    setTimeout(() => {
      textareaElement?.focus();
      const newPos = before.length + emoji.native.length;
      textareaElement?.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function handleEmojiSelect(emoji: string) {
    messageInput += emoji;
    textareaElement?.focus();
  }

  function checkIfAtBottom() {
    if (!messagesContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const threshold = 50;
    isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;

    if (isAtBottom) {
      unreadCount = 0;
      lastReadIndex = messages.length;
    }
  }

  function scrollToFirstUnread() {
    if (!messagesContainer || lastReadIndex >= messages.length) return;

    const messageElements = messagesContainer.querySelectorAll(".message");
    const firstUnread = messageElements[lastReadIndex];

    if (firstUnread) {
      firstUnread.scrollIntoView({ behavior: "smooth", block: "start" });
      unreadCount = 0;
      lastReadIndex = messages.length;
    }
  }

  async function copyRoomLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);

    try {
      await navigator.clipboard.writeText(url.toString());
      copyFeedback = true;
      setTimeout(() => {
        copyFeedback = false;
      }, 2000);
    } catch (err) {
      console.error($t("chat.linkCopyError"), err);
    }
  }

  $effect(() => {
    if (messagesContainer) {
      const previousLength = lastReadIndex;

      if (isAtBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        lastReadIndex = messages.length;
      } else if (messages.length > previousLength) {
        unreadCount = messages.length - lastReadIndex;
      }
    }
  });

  let peerNames = $derived(Object.values(peers).join(", ") || $t("chat.you"));
</script>

<div class="container">
  <div class="header">
    <img width={64} alt="The project logo" src={logo} />
    <h1>{$t("global.title")}</h1>
    <p class="room-info">
      {$t("chat.room")}:
      <span class="room-id-button-container">
        <button
          class="room-id-button"
          onclick={copyRoomLink}
          title={$t("chat.copyLink")}
        >
          {#if copyFeedback}
            {$t("chat.linkCopied")}
            <CopyCheck size={14} />
          {:else}
            {roomId}
            <Copy size={14} />
          {/if}
        </button>
      </span>
      | {$t("chat.you")}: {username}
    </p>
    {#if fingerprint}
      <p class="fingerprint"><FingerprintPattern size={14} /> {fingerprint}</p>
    {/if}
  </div>

  <div class="chat">
    <div class="peers-list">
      <strong>{$t("chat.participants")}:</strong>
      {peerNames}
    </div>

    <div class="messages-wrapper">
      <div
        class="messages"
        bind:this={messagesContainer}
        onscroll={checkIfAtBottom}
      >
        {#each messages as message, index (message.id)}
          <Message
            {...message}
            showSender={index === 0 ||
              messages[index - 1].sender !== message.sender}
          />
        {/each}
      </div>

      {#if !isAtBottom && unreadCount > 0}
        <button class="new-messages-indicator" onclick={scrollToFirstUnread}>
          {unreadCount}
          {unreadCount > 1
            ? $t("chat.newMessagesPlural")
            : $t("chat.newMessages")}
          {unreadCount > 1 ? $t("chat.messagePlural") : $t("chat.message")} ↓
        </button>
      {/if}
    </div>

    <div class="input-message">
      <textarea
        bind:value={messageInput}
        bind:this={textareaElement}
        oninput={handleInput}
        onkeydown={handleKeyPress}
        placeholder={$t("chat.messagePlaceholder")}
        rows="1"
      ></textarea>
      <div class="btn-group">
        <div class="emoji-container">
          <EmojiPicker onemojiSelect={handleEmojiSelect} />
        </div>
        <GifPicker onGifSelect={handleSendGif} />
        <button
          disabled={messageInput.trim() === ""}
          class="send-button"
          onclick={handleSendMessage}><ArrowUp /></button
        >
      </div>
    </div>

    {#if showAutocomplete && autocompleteResults.length > 0}
      <div class="autocomplete">
        {#each autocompleteResults as emoji, index}
          <button
            class="autocomplete-item"
            class:selected={index === selectedAutocompleteIndex}
            onclick={() => insertEmoji(emoji)}
            type="button"
          >
            <span class="emoji-preview">{emoji.native}</span>
            <span class="emoji-name">:{emoji.id}:</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @property --btnColor1 {
    syntax: "<color>";
    initial-value: #667eea;
    inherits: false;
  }

  @property --btnColor2 {
    syntax: "<color>";
    initial-value: #764ba2;
    inherits: false;
  }

  .container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 850px;
    overflow: hidden;
  }

  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    text-align: center;
  }

  .header h1 {
    font-size: 24px;
    margin: 0 0 5px 0;
  }

  .header > p:not(:last-child) {
    margin-bottom: 4px;
  }

  .room-info {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  .room-id-button-container {
    position: relative;
  }

  .room-id-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    padding: 2px 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
  }

  .room-id-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .fingerprint {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85em;
    border: solid 1px white;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.2);
  }

  .chat {
    padding: 30px;
    position: relative;
  }

  .peers-list {
    padding: 10px;
    background: #f0f0f0;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .peers-list strong {
    color: #667eea;
  }

  .messages-wrapper {
    position: relative;
    margin-bottom: 20px;
  }

  .messages {
    height: 400px;
    overflow-y: auto;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
  }

  .new-messages-indicator {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    z-index: 10;
  }

  .new-messages-indicator:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .input-message {
    display: flex;
    flex-direction: column;
    border-radius: 1.5rem;
    border: solid 1px #f0f0f0;
  }

  .btn-group {
    display: flex;
    gap: 4px;
    width: 100%;
    padding: 8px;
    margin-top: 12px;
  }

  .input-message textarea {
    display: flex;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    outline: none;
    border-style: none;
    min-height: 44px;
    max-height: 200px;
    resize: none;
    font-size: 16px;
    overflow-y: auto;
    padding: 12px 12px 16px;
    border-radius: 8px;
    box-sizing: border-box;
    background-color: transparent;
  }

  .input-message .send-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: linear-gradient(
      135deg,
      var(--btnColor1) 0%,
      var(--btnColor2) 100%
    );
    color: white;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    transition-property: transform, --btnColor1, --btnColor2;
    margin-left: auto;
  }

  .input-message .send-button:disabled {
    --btnColor1: #cccccc;
    --btnColor2: #cccccc;
    pointer-events: none;
  }

  .input-message .send-button:hover {
    transform: scale(1.05);
  }

  .autocomplete {
    position: absolute;
    bottom: 70px;
    left: 30px;
    right: 30px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
  }

  .autocomplete-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    border: none;
    background: white;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .autocomplete-item:hover,
  .autocomplete-item.selected {
    background: #f0f0ff;
  }

  .emoji-preview {
    font-size: 20px;
  }

  .emoji-name {
    color: #667eea;
    font-size: 14px;
    font-family: monospace;
  }

  @media (max-width: 40rem) {
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-radius: 0;
      box-shadow: none;
    }

    .peers-list {
      flex-shrink: 0;
      margin-bottom: 10px;
      white-space: nowrap;
      overflow-x: auto;
    }

    .chat {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      padding: 10px;
      min-height: 0;
    }

    .messages-wrapper {
      flex: 1 1 auto;
      overflow-y: auto;
      margin-bottom: 10px;
    }

    .messages {
      height: 100%;
    }

    .input-message {
      flex-shrink: 0;
    }

    .btn-group {
      margin-top: 0;
    }

    .input-message button {
      margin-left: auto;
    }

    .emoji-container {
      display: none;
    }
  }
</style>
