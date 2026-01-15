# 💬 Peeps

A fully decentralized, peer-to-peer chat application with no server-side storage. Connect with anyone using just a room code – simple, fast, and private.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://peeps.tooldeck.fr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔒 **Fully P2P**: Direct peer-to-peer communication with no message storage
- 🚀 **Zero Setup**: No account creation, no installation – just share a room code
- 🌐 **Serverless Chat**: Messages travel directly between participants using WebRTC
- 😀 **Rich Emoji Support**: Discord-style emoji autocomplete (`:fire:` → 🔥) + visual picker
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔔 **Smart Notifications**: Unread message indicator when scrolling through history
- 🌍 **Multilingual**: English and French interface (easily extensible)
- ⚡ **Instant Connection**: Real-time messaging with automatic peer discovery
- 🎨 **Modern UI**: Clean, gradient-based design with smooth animations

## 🛠️ Tech Stack

- **[Svelte 5](https://svelte.dev/)** - Reactive UI framework with runes
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool
- **[PeerJS](https://peerjs.com/)** - WebRTC wrapper for P2P connections
- **[emoji-mart](https://github.com/missive/emoji-mart)** - Emoji picker and autocomplete
- **CSS3** - Custom styling with gradients and animations

## 🔐 Security & Privacy

### End-to-End Encryption (E2EE)

Peeps implements **application-level end-to-end encryption** on top of WebRTC's transport-level encryption. This provides defense-in-depth security:

#### Technical Implementation

- **Key Exchange**: ECDH (Elliptic Curve Diffie-Hellman) with P-256 curve
- **Session Key Derivation**: HKDF-SHA256 for key expansion
- **Message Encryption**: AES-256-GCM for authenticated encryption
- **Group Key**: Single shared group key distributed by room host to all participants

#### Encryption Flow

All messages are encrypted before transmission. Only peers with the correct group key can decrypt.

```
Sender                                  Receiver
  │                                        │
  ├─ Generate plaintext message            │
  │  "Hello"                               │
  │                                        │
  ├─ Encrypt with group key (AES-GCM)      │
  │  → Ciphertext + IV                     │
  │                                        │
  ├─ Send encrypted_message ──────────────►├─ Receive encrypted_message
  │                                        │
  │                                        ├─ Decrypt with group key
  │                                        │
  │                                        ├─ Verify counter (replay protection)
  │                                        │
  │                                        ├─ Display "Hello"
```

#### Key Exchange Timeline

```
Host (A)                          PeerJS Signaling              Joiner (B)
   │                                   │                           │
   ├─ Generate ECDH keypair (P-256)    │                           │
   │  Generate group key (AES-256)     │                           │
   │                                   │                           │
   │                              B connects to room               │
   │                                   │                           │
   │                                   │◄──── key_exchange ────────┤
   │◄─ Receive B's public key ─────────┤  (B's ephemeral pubkey)   │
   │  (via DataChannel)                │                           │
   │                                   │                           │
   ├─ ECDH shared secret derivation    │                           │
   │  Salt = hash(sorted peer IDs)     │                           │
   │  Session key = HKDF(secret, salt) │                           │
   │                                   │                           │
   ├─ Encrypt group key with           │                           │
   │  session key (AES-GCM)            │                           │
   │                                   │                           │
   ├─ encrypted_group_key ─────────────┤──────────────────────────►│
   │  (group key encrypted)            │     (DataChannel)         │
   │                                   │                           │
   │                                   │                  B derives same
   │                                   │                  session key using
   │                                   │                  ECDH + HKDF
   │                                   │                           │
   │                                   │                  Decrypt group key
   │                                   │                           │
   │◄─ peer_join message ──────────────────────────────────────────┤
   │                                   │                           │
   ├─ All messages encrypted with      │                           │
   │  group key (AES-GCM)              │                           │
   │                                   │                           │
   ├─ encrypted_message ───────────────┤──────────────────────────►│
   │  (counter: 1)                     │     (DataChannel)         │
   │                                   │                  Decrypt & verify
   │                                   │                  counter
```

#### Security Features

**🔐 Confidentiality**

- Messages encrypted with AES-256-GCM before transmission
- Even if WebRTC stream is compromised, messages remain encrypted
- Network observers cannot read message content

**🛡️ Replay Attack Protection**

- Each message includes a monotonic counter per sender
- Receivers track the highest counter seen per peer
- Messages with counter ≤ last seen counter are rejected
- Prevents reinjection of old messages

**🔑 Key Authentication (Fingerprints)**

- Each peer's ephemeral public key has a SHA-256 fingerprint displayed in the UI
- Users can manually verify fingerprints to confirm they're talking to the right peers
- Fingerprint format: First 16 hex characters of SHA-256(public_key)
- Example: `E8ECF7D3E12C2F29` shown in room header

**📋 Perfect Forward Secrecy (Session Level)**

- Each peer connection has unique session keys
- If one session key is compromised, only that pair's messages are exposed
- New connections generate new keys
- Room host generates new group key each session (when room is created)

#### Algorithm Details

| Component | Algorithm | Details |
|-----------|-----------|---------|
| Key Exchange | ECDH P-256 | 256-bit ephemeral keys, 65-byte public keys |
| KDF | HKDF-SHA256 | Salt derived from sorted peer IDs (deterministic) |
| Encryption | AES-256-GCM | 256-bit keys, 12-byte random IV per message |
| Auth Tags | GCM | 128-bit authentication tags |
| Fingerprints | SHA-256 | First 8 bytes for short fingerprint display |

#### Encryption Status

✅ **Implemented in v1.0:**

- ECDH key exchange with P-256
- AES-256-GCM message encryption
- HKDF-based key derivation
- Replay attack protection with message counters
- Fingerprint-based peer authentication
- Group key distribution to room participants

### WebRTC Transport Security

- **DTLS 1.2+**: Automatically encrypts all WebRTC data channels
- **HTTPS**: When deployed on HTTPS, entire connection is encrypted end-to-end
- **Perfect Forward Secrecy**: WebRTC generates new DTLS keys for each connection

### Privacy Features

- **No User Accounts**: No registration, no email, no personal data collection
- **Ephemeral Rooms**: When all participants leave, all messages are permanently deleted
- **Signaling Only**: The PeerJS signaling server (0.peerjs.com) only facilitates initial peer discovery – it never sees your messages (encrypted messages bypass signaling)
- **Local-First**: All message history exists only in memory on participants' devices
- **No Logs**: No server-side message logging or retention

### Important Security Notes

⚠️ **Manual Fingerprint Verification**: For maximum security against MITM attacks, users should verify peer fingerprints out-of-band (phone call, in-person, etc.). Fingerprints are shown in the UI for this purpose.

⚠️ **Room Code Secrecy**: Room codes act as access control. Don't share codes publicly if you want private conversations – anyone with the code can join and will receive the group key.

⚠️ **Client-Side Security**: The application runs in the browser. Protect your browser from malicious extensions or scripts that could intercept keys or messages.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/maximelafarie/peeps.git
cd peeps

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

### Deploy to GitHub Pages

1. Update `vite.config.ts` with your repository name:

```typescript
export default defineConfig({
  base: '/peeps/', // Your repo name
  // ... rest of config
})
```

> [!TIP]
> If you are using a custom domaine name, please modify the values in the `Create CNAME` job at `.github/workflows/pr-check.yml`

1. Build and deploy:

```bash
npm run build
# Push the dist folder to gh-pages branch
```

## 📖 How to Use

1. **Create a Room**
   - Enter your username
   - Click "Create new room"
   - Share the generated room code with others

2. **Join a Room**
   - Enter your username
   - Enter the room code you received
   - Click "Join room"

3. **Chat Features**
   - Type messages and press Enter to send
   - Use `:emoji_name:` for emoji autocomplete (e.g., `:smile:` → 😀)
   - Click 😀 button for visual emoji picker
   - Arrow keys (↑↓) to navigate autocomplete
   - Tab or Enter to select emoji
   - Scroll up to read history – new message indicator appears automatically

## 🏗️ Architecture

```text
┌─────────────┐         ┌─────────────┐
│   Peer A    │◄───────►│   Peer B    │
│  (Browser)  │  WebRTC │  (Browser)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │    ┌─────────────┐    │
       └───►│  Signaling  │◄───┘
            │   Server    │
            │  (PeerJS)   │
            └─────────────┘
```

### Key Components

- **App.svelte**: Main application container, peer connection management, and E2EE orchestration
- **ChatSetup.svelte**: Room creation/joining interface
- **ChatRoom.svelte**: Main chat interface with emoji support and fingerprint display
- **Message.svelte**: Individual message component with link detection
- **EmojiPicker.svelte**: Visual emoji picker component
- **cryptoUtils.ts**: Encryption utilities (ECDH, AES-GCM, HKDF, key fingerprints)
- **emojiUtils.ts**: Emoji autocomplete and shortcode conversion

### WebRTC Flow

1. **Room Creation**: First peer (host) connects to signaling server with room ID and generates group key
2. **Key Generation**: All peers generate ephemeral ECDH (P-256) keypairs
3. **Key Exchange**: Peers exchange public keys via encrypted DataChannel
4. **Session Key Derivation**: Each pair derives identical session key using ECDH + HKDF (deterministic salt)
5. **Group Key Distribution**: Host encrypts group key with each peer's session key and sends it
6. **E2EE Ready**: All peers now have group key and can decrypt each other's messages
7. **Message Encryption**: Each message encrypted with group key before transmission
8. **Replay Protection**: Receivers verify monotonic message counter per sender
9. **Session End**: When all peers disconnect, keys are destroyed

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 Roadmap

- [x] E2E encryption layer (ECDH + AES-GCM)
- [x] Replay attack protection
- [x] Key fingerprint verification
- [ ] Key rotation policy (refresh group key periodically)
- [ ] Message reactions
- [ ] Typing indicators
- [ ] User presence indicators

## What peeps will never offer

- File sharing support
- Voice/video calls
- Message history export

## 📄 License

MIT License - see [LICENSE](./LICENCE) file for details

## 🙏 Acknowledgments

- [PeerJS](https://peerjs.com/) for simplifying WebRTC
- [emoji-mart](https://github.com/missive/emoji-mart) for emoji support
- [Svelte](https://svelte.dev/) for the amazing framework
- The WebRTC community for making P2P communication accessible

## 💡 Fun Fact

"Peeps" represents the people you're chatting with – your peers in the P2P network!

---

Made with ❤️ using Svelte and WebRTC

**Star ⭐ this repo if you find it useful!**
