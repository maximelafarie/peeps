<script lang="ts">
  import { onDestroy } from "svelte";
  import Peer from "peerjs";
  import type { DataConnection } from "peerjs";
  import { t, currentLanguage, setLanguage, type Language } from "./i18n";
  import ChatSetup from "./lib/ChatSetup.svelte";
  import ChatRoom from "./lib/ChatRoom.svelte";
  import LanguageSelector from "./lib/LanguageSelector.svelte";
  import ConnectionStatus from "./lib/ConnectionStatus.svelte";
  import * as cryptoUtils from "./cryptoUtils";
  import type { Status } from "./types";

  interface Message {
    id: string;
    sender: string;
    text: string;
    isOwn: boolean;
    timestamp: number;
  }

  interface PeerData {
    type:
      | "peer_join"
      | "peer_info"
      | "message"
      | "key_exchange"
      | "encrypted_group_key"
      | "encrypted_message"
      | "ping"
      | "system_message";
    peerId?: string;
    username?: string;
    allPeers?: Record<string, string>;
    text?: string;
    publicKey?: string;
    encrypted?: { iv: number[]; ciphertext: number[] };
  }

  const commit: string | undefined = import.meta.env.VITE_COMMIT_SHA;

  let peer: Peer | null = null;
  let connections: Record<string, DataConnection> = {};
  let peers = $state<Record<string, string>>({});
  let username = $state("");
  let roomId = $state("");
  let myPeerId = "";
  let messages = $state<Message[]>([]);
  let isInChat = $state(false);
  let myKeyPair: cryptoUtils.KeyPair | null = null;
  let sessionKeys: cryptoUtils.SessionKeys = {};
  let groupKey: CryptoKey | null = null;
  let isHost = false;
  let fingerprint = $state("");
  let connectionStatus: Status = $state("connecting");
  let reconnectAttempts = $state(0);
  let messageCounter = $state(0);
  let lastCounters: Record<string, number> = {};
  let peersKnownViaDirectContact: Record<string, boolean> = {};

  function createRoom(usernameValue: string) {
    username = usernameValue;
    roomId = Math.random().toString(36).substring(2, 8);
    myPeerId = roomId;
    isHost = true;
    initPeer(myPeerId);

    setTimeout(() => {
      isInChat = true;
      addSystemMessage(`${$t("app.roomCreated")}: ${roomId}`);
    }, 1000);
  }

  function joinRoom(data: { username: string; roomId: string }) {
    username = data.username;
    roomId = data.roomId;
    myPeerId = roomId + "-" + Math.random().toString(36).substring(2, 8);
    isHost = false;
    initPeer(myPeerId);

    setTimeout(() => {
      isInChat = true;
    }, 1000);
  }

  function initPeer(peerId: string) {
    peer = new Peer(peerId, {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      config: {
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302"] },
          { urls: ["stun:stun1.l.google.com:19302"] },
          { urls: ["stun:stun2.l.google.com:19302"] },
          { urls: ["stun:stun3.l.google.com:19302"] },
        ],
      },
    });

    peer.on("open", async (id) => {
      console.info("My ID:", id);
      connectionStatus = "connected";
      reconnectAttempts = 0;
      peers[id] = username;

      // Generate crypto keys
      myKeyPair = await cryptoUtils.generateKeyPair();
      fingerprint = await cryptoUtils.computeFingerprint(myKeyPair.publicKey);
      if (isHost) {
        groupKey = await cryptoUtils.generateGroupKey();
      }

      if (id !== roomId) {
        setTimeout(() => connectToPeer(roomId), 1000);
      }
    });

    peer.on("connection", (conn) => {
      console.info("Incoming connection of:", conn.peer);
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("Peer error:", err);
      connectionStatus = "error";

      // Attempt reconnection for certain errors
      if (
        err.type === "peer-unavailable" ||
        err.type === "network" ||
        err.type === "server-error"
      ) {
        reconnectAttempts++;
        if (reconnectAttempts <= 3) {
          connectionStatus = "reconnecting";
          console.info(
            `Attempting to reconnect (attempt ${reconnectAttempts}/3) in 5 seconds...`,
          );

          setTimeout(() => {
            if (!peer?.open) {
              initPeer(myPeerId);
            }
          }, 5000);
        } else {
          connectionStatus = "failed";
          addSystemMessage($t("app.connectionFailed"));
        }
      }
    });

    peer.on("disconnected", () => {
      console.info("Peer disconnected from server");
      connectionStatus = "disconnected";
      // Try to reconnect
      setTimeout(() => {
        if (peer && !peer.open) {
          connectionStatus = "reconnecting";
          peer.reconnect();
        }
      }, 3000);
    });
  }

  function connectToPeer(peerId: string) {
    if (peerId === myPeerId || connections[peerId] || !peer) {
      return;
    }

    console.info("Trying to connect to:", peerId);
    const conn = peer.connect(peerId, { reliable: true });
    setupConnection(conn);
  }

  function setupConnection(conn: DataConnection) {
    const peerId = conn.peer;

    if (connections[peerId]) {
      console.info("Existing connection with", peerId);
      return;
    }

    connections[peerId] = conn;

    conn.on("open", async () => {
      console.info("Established connection with:", peerId);

      // Send my public key
      if (myKeyPair) {
        const publicKeyRaw = await cryptoUtils.exportPublicKey(
          myKeyPair.publicKey,
        );

        console.info("Sending publicKey length:", publicKeyRaw.length);

        const publicKeyB64 = btoa(String.fromCharCode(...publicKeyRaw));
        conn.send({
          type: "key_exchange",
          publicKey: publicKeyB64,
        });
      }

      conn.send({
        type: "peer_join",
        peerId: myPeerId,
        username: username,
        allPeers: peers,
      });

      // Start heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (conn.open) {
          conn.send({ type: "ping" });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send ping every 30 seconds
    });

    conn.on("data", (data: unknown) => {
      const peerData = data as PeerData;
      if (peerData.type === "ping") {
        // Ignore ping messages (just a keep-alive signal)
        return;
      }
      handleData(peerData, conn);
    });

    conn.on("close", () => {
      console.info("Closed connection with:", peerId);
      const departedUsername = peers[peerId];
      delete connections[peerId];
      delete peers[peerId];
      delete lastCounters[peerId];
      delete peersKnownViaDirectContact[peerId];
      delete sessionKeys[peerId];

      if (departedUsername) {
        addSystemMessage(`${departedUsername} ${$t("app.hasLeft")}`);
        broadcast({
          type: "system_message",
          text: `${departedUsername} ${$t("app.hasLeft")}`,
        });
      }
    });

    conn.on("error", (err) => {
      console.error("Error with connection to", peerId, err);
    });
  }

  async function handleData(data: PeerData, conn: DataConnection) {
    console.debug("Received data:", data.type, "from", conn.peer);

    if (data.type === "key_exchange") {
      if (data.publicKey && myKeyPair) {
        const publicKeyRaw = new Uint8Array(
          atob(data.publicKey)
            .split("")
            .map((c) => c.charCodeAt(0)),
        );

        const peerPublicKey = await cryptoUtils.importPublicKey(publicKeyRaw);
        const sharedSecret = await cryptoUtils.deriveSharedSecret(
          myKeyPair.privateKey,
          peerPublicKey,
        );

        // Derive deterministic salt from both peer IDs to ensure both sides use same salt
        const saltInput = new TextEncoder().encode(
          [myPeerId, conn.peer].sort().join("|"),
        );
        const saltHash = await crypto.subtle.digest("SHA-256", saltInput);
        const salt = new Uint8Array(saltHash).slice(0, 16);
        sessionKeys[conn.peer] = await cryptoUtils.deriveAESKey(
          sharedSecret,
          salt,
        );

        // If host, send encrypted group key
        if (isHost && groupKey) {
          const groupKeyRaw = await cryptoUtils.exportGroupKey(groupKey);
          const encryptedGroupKey = await cryptoUtils.encryptMessage(
            sessionKeys[conn.peer],
            JSON.stringify(Array.from(groupKeyRaw)),
          );
          conn.send({
            type: "encrypted_group_key",
            encrypted: {
              iv: Array.from(encryptedGroupKey.iv),
              ciphertext: Array.from(
                new Uint8Array(encryptedGroupKey.ciphertext),
              ),
            },
          });
        }
      }
    } else if (data.type === "encrypted_group_key") {
      if (data.encrypted && sessionKeys[conn.peer]) {
        const encrypted = {
          iv: new Uint8Array(data.encrypted.iv),
          ciphertext: new Uint8Array(data.encrypted.ciphertext)
            .buffer as ArrayBuffer,
        };
        try {
          const decrypted = await cryptoUtils.decryptMessage(
            sessionKeys[conn.peer],
            encrypted,
          );
          const groupKeyRaw = new Uint8Array(JSON.parse(decrypted));
          groupKey = await cryptoUtils.importGroupKey(groupKeyRaw);
        } catch (e) {
          console.error("Failed to decrypt group key:", e);
        }
      } else {
        console.warn(
          "Received encrypted_group_key but no session key available for",
          conn.peer,
        );
        // Retry after a short delay in case session key arrives later
        setTimeout(async () => {
          if (data.encrypted && sessionKeys[conn.peer] && !groupKey) {
            try {
              const encrypted = {
                iv: new Uint8Array(data.encrypted.iv),
                ciphertext: new Uint8Array(data.encrypted.ciphertext)
                  .buffer as ArrayBuffer,
              };
              const decrypted = await cryptoUtils.decryptMessage(
                sessionKeys[conn.peer],
                encrypted,
              );
              const groupKeyRaw = new Uint8Array(JSON.parse(decrypted));
              groupKey = await cryptoUtils.importGroupKey(groupKeyRaw);
            } catch (e) {
              console.error("Failed to decrypt group key (delayed):", e);
            }
          }
        }, 1000);
      }
    } else if (data.type === "peer_join") {
      peers[data.peerId!] = data.username!;
      peersKnownViaDirectContact[data.peerId!] = true;

      // Only the host displays "joined" message and broadcasts it to others
      if (isHost) {
        addSystemMessage(`${data.username} ${$t("app.hasJoined")}`);
        broadcast({
          type: "system_message",
          text: `${data.username} ${$t("app.hasJoined")}`,
        });
      }

      // Ensure group key is sent to the joining peer
      if (isHost && groupKey && sessionKeys[conn.peer]) {
        const groupKeyRaw = await cryptoUtils.exportGroupKey(groupKey);
        const encryptedGroupKey = await cryptoUtils.encryptMessage(
          sessionKeys[conn.peer],
          JSON.stringify(Array.from(groupKeyRaw)),
        );
        conn.send({
          type: "encrypted_group_key",
          encrypted: {
            iv: Array.from(encryptedGroupKey.iv),
            ciphertext: Array.from(
              new Uint8Array(encryptedGroupKey.ciphertext),
            ),
          },
        });
      }

      if (data.allPeers) {
        Object.keys(data.allPeers).forEach((pid) => {
          if (pid !== myPeerId && !peers[pid]) {
            peers[pid] = data.allPeers![pid];
            // Don't mark as known via direct contact yet - only when we get peer_join or peer_info from them
            connectToPeer(pid);
          }
        });
      }

      broadcast(
        {
          type: "peer_info",
          peerId: data.peerId,
          username: data.username,
        },
        conn.peer,
      );
    } else if (data.type === "peer_info") {
      if (data.peerId !== myPeerId && !peers[data.peerId!]) {
        peers[data.peerId!] = data.username!;
        peersKnownViaDirectContact[data.peerId!] = true;
        connectToPeer(data.peerId!);
      }
    } else if (data.type === "system_message") {
      if (data.text) {
        addSystemMessage(data.text);
      }
    } else if (data.type === "encrypted_message") {
      if (data.encrypted && groupKey && data.username) {
        const encrypted = {
          iv: new Uint8Array(data.encrypted.iv),
          ciphertext: new Uint8Array(data.encrypted.ciphertext)
            .buffer as ArrayBuffer,
        };

        try {
          const decryptedPayload = await cryptoUtils.decryptMessage(
            groupKey,
            encrypted,
          );

          const { counter, text } = JSON.parse(decryptedPayload);
          const lastCounter = lastCounters[data.username] || 0;

          // Check if this is our own message coming back via broadcast
          const isOwnMessage =
            data.username === username && counter === lastCounters[username];

          if (counter > lastCounter && !isOwnMessage) {
            lastCounters[data.username] = counter;
            addMessage(data.username, text, false);
            broadcast(data);
          } else if (isOwnMessage) {
            console.debug("Ignoring own message via broadcast");
          } else {
            console.warn("Replay attack detected for", data.username);
          }
        } catch (e) {
          console.error("Failed to decrypt message:", e);
        }
      } else {
        console.error("Missing encrypted data, groupKey, or username");
      }
    } else if (data.type === "message") {
      // Fallback for unencrypted messages (should not happen in E2EE mode)
      addMessage(data.username!, data.text!, false);
      broadcast(data, conn.peer);
    }
  }

  function broadcast(data: PeerData, excludePeer: string | null = null) {
    Object.keys(connections).forEach((peerId) => {
      if (peerId !== excludePeer && connections[peerId].open) {
        try {
          connections[peerId].send(data);
        } catch (e) {
          console.error("Error broadcasting to", peerId, e);
        }
      }
    });
  }

  async function sendMessage(text: string) {
    messageCounter++;
    const payload = JSON.stringify({ counter: messageCounter, text });

    if (groupKey) {
      const encrypted = await cryptoUtils.encryptMessage(groupKey, payload);
      // Update counter BEFORE broadcasting to avoid replay attack on own messages
      lastCounters[username] = messageCounter;
      addMessage(username, text, true);
      const data: PeerData = {
        type: "encrypted_message",
        username: username,
        encrypted: {
          iv: Array.from(encrypted.iv),
          ciphertext: Array.from(new Uint8Array(encrypted.ciphertext)),
        },
      };
      broadcast(data);
    } else {
      // Fallback if no group key yet
      const data: PeerData = {
        type: "message",
        username: username,
        text: text,
      };
      addMessage(username, text, true);
      broadcast(data);
    }
  }

  function addMessage(sender: string, text: string, isOwn: boolean) {
    messages = [
      ...messages,
      {
        id: Math.random().toString(36),
        sender,
        text,
        isOwn,
        timestamp: Date.now(),
      },
    ];
  }

  function addSystemMessage(text: string) {
    messages = [
      ...messages,
      {
        id: Math.random().toString(36),
        sender: "system",
        text,
        isOwn: false,
        timestamp: Date.now(),
      },
    ];
  }

  onDestroy(() => {
    if (peer) {
      peer.destroy();
    }
  });
</script>

<main>
  {#if isInChat}
    <div class="connection-status-container">
      <ConnectionStatus status={connectionStatus} />
    </div>
  {/if}

  <LanguageSelector />

  {#if !isInChat}
    <ChatSetup oncreateRoom={createRoom} onjoinRoom={joinRoom} />
  {:else}
    <ChatRoom
      {roomId}
      {username}
      {peers}
      {messages}
      onsendMessage={sendMessage}
      {fingerprint}
      {connectionStatus}
    />
  {/if}
  <section class="footer">
    <span>
      <a href="https://github.com/maximelafarie/peeps" target="_blank">GitHub</a
      >
    </span>
    {#if commit}
      <span>·</span>
      Version:
      <a
        href="https://github.com/maximelafarie/peeps/commit/{commit}"
        target="_blank"
      >
        {commit.slice(0, 7)}
      </a>
    {/if}
    <span>·</span>
    <span
      >Released under the <a
        href="https://github.com/maximelafarie/peeps/blob/main/LICENSE"
        target="_blank">MIT License</a
      >.</span
    >
  </section>
</main>

<style>
  .connection-status-container {
    position: fixed;
    top: 10px;
    left: 10px;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }

  .footer {
    margin-top: 10px;
    padding: 10px;
    font-size: 0.9em;
    color: #ffffffcc;
    text-align: center;
  }

  .footer a {
    color: #ffffffcc;
  }

  @media (max-width: 40rem) {
    main {
      padding: 0;
    }

    .footer {
      display: none;
    }
  }
</style>
