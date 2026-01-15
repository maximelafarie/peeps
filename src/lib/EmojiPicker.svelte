<script lang="ts">
  import data from "@emoji-mart/data";
  import { Picker } from "emoji-mart";
  import { Smile } from "@lucide/svelte";
  import { currentLanguage } from "../i18n";

  interface Props {
    onemojiSelect: (_emoji: string) => void;
  }

  let { onemojiSelect }: Props = $props();
  let pickerContainer = $state<HTMLDivElement | undefined>(undefined);
  let wrapperElement = $state<HTMLDivElement | undefined>(undefined);
  let showPicker = $state(false);
  let picker: any;

  $effect(() => {
    if (!pickerContainer) return;

    picker = new Picker({
      data,
      onEmojiSelect: (emoji: any) => {
        onemojiSelect(emoji.native);
        showPicker = false;
      },
      theme: "light",
      locale: $currentLanguage,
      previewPosition: "none",
      skinTonePosition: "search",
    });

    pickerContainer.appendChild(picker as unknown as HTMLElement);

    return () => {
      picker = null;
    };
  });

  $effect(() => {
    if (!showPicker) return;

    function handleClickOutside(event: MouseEvent) {
      if (wrapperElement && !wrapperElement.contains(event.target as Node)) {
        showPicker = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        showPicker = false;
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  });

  function togglePicker() {
    showPicker = !showPicker;
  }
</script>

<div class="emoji-picker-wrapper" bind:this={wrapperElement}>
  <button class="emoji-button" onclick={togglePicker} type="button">
    <Smile />
  </button>
  {#if showPicker}
    <div class="picker-container" bind:this={pickerContainer}></div>
  {/if}
</div>

<style>
  .emoji-picker-wrapper {
    position: relative;
  }

  .emoji-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: #f5f5f5;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .emoji-button:hover {
    background: #ebebeb;
    border-color: #667eea;
  }

  .picker-container {
    position: absolute;
    bottom: 60px;
    z-index: 1000;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
  }

  :global(em-emoji-picker) {
    --rgb-background: 255, 255, 255;
    --rgb-input: 245, 245, 245;
    --rgb-color: 34, 34, 34;
  }
</style>
