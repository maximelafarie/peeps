<script lang="ts">
  import { ImagePlay } from "@lucide/svelte";
  import { search } from "svelte-tenor/api";
  import type { TenorResponse, TenorResult } from "../types";
  import { t } from "../i18n";
  import placeholder from "/img-placeholder.svg";

  interface Props {
    onGifSelect: (_gif: TenorResult) => void;
  }

  let { onGifSelect }: Props = $props();
  let wrapperElement = $state<HTMLDivElement | undefined>(undefined);
  let inputElement = $state<HTMLInputElement | undefined>(undefined);
  let showPicker = $state(false);

  let searchQuery = $state("");
  let debouncedQuery = $state("");
  let debounceTimeout: number | undefined = undefined;

  // Loaded GIFs set
  let loadedGifs = $state<Set<string>>(new Set());

  function debounceQuery(query: string) {
    if (debounceTimeout !== undefined) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      debouncedQuery = query;
    }, 400);
  }

  $effect(() => {
    if (!showPicker) return;

    // On open, focus and select the input
    if (inputElement) inputElement.select();

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

  const searchGifs = (searchQuery: string) =>
    search({
      key: "LIVDSRZULELA",
      q: searchQuery,
    }) as unknown as Promise<TenorResponse>;
</script>

<div class="gif-picker-wrapper" bind:this={wrapperElement}>
  <button
    class="gif-button"
    onclick={togglePicker}
    type="button"
    aria-label="Ouvrir le sélecteur de GIFs"
  >
    <ImagePlay />
  </button>

  {#if showPicker}
    <div class="picker-container animate-in" tabindex="-1">
      <input
        class="gif-search-input"
        type="text"
        bind:value={searchQuery}
        placeholder="🔍 {$t('gif.searchPlaceholder')}"
        aria-label={$t("gif.searchPlaceholder")}
        oninput={(e) => debounceQuery((e.target as HTMLInputElement)?.value)}
        bind:this={inputElement}
      />
      <div class="results">
        {#if debouncedQuery.trim() !== ""}
          {#await searchGifs(debouncedQuery)}
            <div class="loading">{$t("gif.loading")}</div>
          {:then response}
            {#if response.results.length === 0}
              <div class="no-results">{$t("gif.noResults")}</div>
            {:else}
              <div class="gif-grid">
                {#each response.results as result}
                  <button
                    class="gif-thumb-btn"
                    type="button"
                    aria-label={result.description || "GIF"}
                    title={result.description}
                    onclick={() => {
                      onGifSelect(result);
                      showPicker = false;
                    }}
                  >
                    <div class="gif-thumb-wrapper">
                      {#if !loadedGifs.has(result.gif)}
                        <div class="gif-placeholder">
                          <img
                            src={placeholder}
                            alt="Chargement..."
                            width="40"
                            height="40"
                          />
                        </div>
                      {/if}
                      <img
                        class="gif-thumb"
                        style={!loadedGifs.has(result.gif)
                          ? "display:none"
                          : ""}
                        width="80"
                        height="80"
                        onload={() => {
                          loadedGifs = new Set([...loadedGifs, result.gif]);
                        }}
                        src={result.gif}
                        alt={result.description}
                        draggable="false"
                      />
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          {:catch { message }}
            <div class="error">
              <strong>{$t("gif.error")}</strong>
              {message}
            </div>
          {/await}
        {:else}
          <div class="hint">{$t("gif.message")}</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .gif-picker-wrapper {
    position: relative;
  }

  .gif-button {
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

  .gif-button:hover {
    background: #ebebeb;
    border-color: #667eea;
  }

  .picker-container {
    position: absolute;
    left: 0;
    bottom: 60px;
    z-index: 1000;
    background: #fff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    border-radius: 16px;
    overflow: hidden;
    padding: 18px 18px 12px 18px;
    width: 390px;
    min-height: 320px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition:
      box-shadow 0.2s,
      transform 0.2s;
    animation: fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .picker-container.animate-in {
    animation: fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .gif-search-input {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    font-size: 1rem;
    margin-bottom: 8px;
    outline: none;
    transition: border-color 0.2s;
    background: #f8fafd;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .gif-search-input:focus {
    border-color: #667eea;
    background: #fff;
  }

  .results {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-height: 120px;
  }

  .gif-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 4px;
  }

  .gif-thumb-wrapper {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gif-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    transition:
      transform 0.13s,
      box-shadow 0.13s;
    background: #f5f5f5;
    display: block;
  }
  .gif-thumb:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.18);
    border: 2px solid #667eea;
  }

  .gif-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border-radius: 8px;
    z-index: 1;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
  }

  .loading,
  .no-results,
  .hint,
  .error {
    text-align: center;
    color: #888;
    font-size: 1rem;
    margin: 24px 0 0 0;
  }
  .error {
    color: #e53e3e;
  }

  .gif-thumb-btn {
    padding: 0;
    border: none;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    transition:
      box-shadow 0.13s,
      transform 0.13s;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gif-thumb-btn:focus {
    box-shadow: 0 0 0 2px #667eea;
    z-index: 1;
  }
  .gif-thumb-btn:active {
    transform: scale(0.97);
  }
</style>
