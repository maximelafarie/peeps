<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n";
  import logo from '/logo.svg';

  interface Props {
    oncreateRoom: (_username: string) => void;
    onjoinRoom: (_data: { username: string; roomId: string }) => void;
  }

  let { oncreateRoom, onjoinRoom }: Props = $props();

  let username = $state("");
  let roomId = $state("");
  let statusMessage = $state("");
  let statusType = $state<"info" | "success" | "error" | "">("");
  let statusTimeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get("room");

    if (roomIdFromUrl) {
      roomId = roomIdFromUrl;
      showStatus($t("setup.roomDetected"), "info");
    }
  });

  function showStatus(message: string, type: "info" | "success" | "error") {
    statusMessage = message;
    statusType = type;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusMessage = "";
      statusType = "";
    }, 5000);
  }

  function handleCreateRoom() {
    if (!username.trim()) {
      showStatus($t("setup.errorUsername"), "error");
      return;
    }

    oncreateRoom(username.trim());
  }

  function handleJoinRoom() {
    if (!username.trim() || !roomId.trim()) {
      showStatus($t("setup.errorFields"), "error");
      return;
    }

    onjoinRoom({ username: username.trim(), roomId: roomId.trim() });
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      if (!roomId.trim()) {
        handleCreateRoom();
      } else {
        handleJoinRoom();
      }
    }
  }
</script>

<div class="container">
  <div class="header">
    <img width={64} alt="The project logo" src={logo} />
    <h1>{$t("global.title")}</h1>
    <p class="subtitle">{$t("setup.subtitle")}</p>
  </div>

  <div class="setup">
    <div class="input-group">
      <label for="pseudo">{$t("setup.username")}</label>
      <input
        id="pseudo"
        type="text"
        bind:value={username}
        onkeypress={handleKeyPress}
        placeholder={$t("setup.usernamePlaceholder")}
        maxlength="20"
      />
    </div>

    <div class="input-group">
      <label for="roomId">{$t("setup.roomId")}</label>
      <input
        id="roomId"
        type="text"
        bind:value={roomId}
        placeholder={$t("setup.roomIdPlaceholder")}
        maxlength="20"
      />
    </div>

    <div class="btn-group">
      <button class="btn btn-secondary" onclick={handleCreateRoom}>
        {$t("setup.createRoom")}
      </button>

      <button class="btn btn-primary" onclick={handleJoinRoom}>
        {$t("setup.joinRoom")}
      </button>
    </div>

    {#if statusMessage}
      <div class="status {statusType}">
        {statusMessage}
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 600px;
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

  .subtitle {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .setup {
    padding: 30px;
  }

  .input-group {
    margin-bottom: 20px;
  }

  .input-group label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
  }

  .input-group input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s;
    box-sizing: border-box;
  }

  .input-group input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-group {
    display: flex;
    gap: 10px;
  }

  .btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    margin-bottom: 10px;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
  }

  .status {
    padding: 10px;
    border-radius: 8px;
    margin-top: 20px;
    font-size: 14px;
    text-align: center;
  }

  .status.info {
    background: #e3f2fd;
    color: #1976d2;
  }

  .status.success {
    background: #e8f5e9;
    color: #388e3c;
  }

  .status.error {
    background: #ffebee;
    color: #d32f2f;
  }

  @media (max-width: 40rem) {
    .container {
      border-radius: 0;
      box-shadow: none;
      height: 100vh;
    }

    .btn-group {
      flex-direction: column;
      gap: inherit;
    }
  }
</style>
