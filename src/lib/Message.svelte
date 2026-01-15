<script lang="ts">
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

  let formattedText = $derived(linkify(text));
</script>

<div class="message" class:own={isOwn} class:system={isSystem}>
  {#if !isSystem && showSender}
    <div class="sender">{sender}</div>
  {/if}
  <div class="text">
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
    display: inline-block;
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

  .message.system {
    text-align: center;
  }

  .message.system .text {
    background: #e3f2fd;
    color: #1976d2;
    font-size: 13px;
    font-style: italic;
  }
</style>
