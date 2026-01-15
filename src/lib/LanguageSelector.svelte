<script lang="ts">
  import { currentLanguage, setLanguage, type Language } from "../i18n";

  function selectLanguage(lang: Language) {
    setLanguage(lang);
  }
</script>

<div class="language-selector">
  <button
    class="lang-btn {$currentLanguage === 'fr' ? 'active' : ''}"
    onclick={() => selectLanguage("fr")}
    title="Français"
  >
    FR
  </button>
  <button
    class="lang-btn {$currentLanguage === 'en' ? 'active' : ''}"
    onclick={() => selectLanguage("en")}
    title="English"
  >
    EN
  </button>
</div>

<style>
  .language-selector {
    position: fixed;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 5px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .lang-btn {
    background: transparent;
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 15px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .lang-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .lang-btn.active {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .lang-btn:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
</style>
