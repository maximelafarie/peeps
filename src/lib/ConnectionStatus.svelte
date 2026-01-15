<script lang="ts">
  import { t } from "../i18n";
  import type { Status } from "../types";

  interface Props {
    status: Status;
  }

  let { status }: Props = $props();
</script>

<div
  class="connection-status"
  class:connected={status === "connected"}
  class:connecting={status === "connecting"}
  class:reconnecting={status === "reconnecting"}
  class:error={status === "error" ||
    status === "failed" ||
    status === "disconnected"}
>
  {#if status === "connected"}
    {$t("chat.connected")}
  {:else if status === "connecting"}
    {$t("chat.connecting")}
  {:else if status === "reconnecting"}
    {$t("chat.reconnecting")}
  {:else if status === "error" || status === "failed"}
    {$t("chat.connectionError")}
  {:else if status === "disconnected"}
    {$t("chat.disconnected")}
  {/if}
</div>

<style>
  .connection-status {
    display: inline-flex;
    font-size: 0.85em;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .connection-status.connected {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .connection-status.connecting,
  .connection-status.reconnecting {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }

  .connection-status.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
</style>
