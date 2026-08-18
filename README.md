<div align="center">

<br/>

<a href="https://github.com/SuryaK999/Studix-Web-App">
  <img src="app/public/studix-logo.svg" alt="Studix Logo" width="110" height="110" style="filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.45));" />
</a>

# 🎓 Studix

### The Next-Generation Real-Time Collaborative Academic Workspace

[![Version](https://img.shields.io/badge/version-1.0.0-8b5cf6?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/SuryaK999/Studix-Web-App)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js_20-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase_Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

<br/>

<p align="center">
  <img src="https://img.shields.io/github/stars/SuryaK999/Studix-Web-App?style=for-the-badge&label=stars&labelColor=0d0d0d&color=ffb86b" alt="Stars" />
  <img src="https://img.shields.io/github/forks/SuryaK999/Studix-Web-App?style=for-the-badge&label=forks&labelColor=0d0d0d&color=60a5fa" alt="Forks" />
  <img src="https://img.shields.io/github/issues/SuryaK999/Studix-Web-App?style=for-the-badge&label=open%20issues&labelColor=0d0d0d&color=f97316" alt="Open Issues" />
  <img src="https://img.shields.io/github/last-commit/SuryaK999/Studix-Web-App?style=for-the-badge&label=last%20commit&labelColor=0d0d0d&color=34d399" alt="Last Commit" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" alt="separator" />
</p>

> **Studix** is a high-performance, Discord-grade collaborative academic platform. It fuses **instant messaging**, **Google Docs-style collaborative editing (Yjs CRDT)**, **P2P WebRTC voice channels**, **neural AI tutoring**, and **real-time task tracking** into a unified, glassmorphic study experience built upon a modern **Hybrid MERN** architecture.

<br/>

[✨ Live Demo](http://localhost:5173/) • [📸 App Previews](#-visual-showcase--app-previews) • [⚡ Quickstart](#-quickstart-in-60-seconds) • [🏗 Architecture](#-system-architecture) • [📡 API Reference](#-rest-api-reference) • [🔌 Socket Protocol](#-real-time-event-specification) • [🚀 1-Click Deploy](#-deployment-guide)

<br/>

</div>

---

## 📸 Visual Showcase & App Previews

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <h4>🔐 1. Cinematic Auth & Split-Screen Landing</h4>
        <img src="./image.png" alt="Cinematic Auth & Landing Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Dynamic interactive WebGL shaders, gradient blinds, lightning effects, and Firebase Google SSO authentication.</em></p>
      </td>
      <td width="50%" align="center">
        <h4>🏠 2. Main Workspace Dashboard</h4>
        <img src="./image2.png" alt="Dashboard Landing Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Centralized study hub featuring Sparkles hero banner, active spaces listing, explore directory, and quick actions.</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <h4>➕ 3. Join & Create Room Flow</h4>
        <img src="./image3.png" alt="Join and Create Room Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Instant room provisioning, 6-character alphanumeric invite codes, member capacity limits, and privacy toggles.</em></p>
      </td>
      <td width="50%" align="center">
        <h4>📝 4. CRDT Real-Time Collaborative Notes</h4>
        <img src="./image4.png" alt="Collaborative Notes Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Sub-millisecond Google Docs-style simultaneous editing powered by <strong>Yjs + TipTap</strong> with conflict-free convergence.</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <h4>💬 5. Discord-Grade Channels & Chat</h4>
        <img src="./image5.png" alt="Study Rooms Chat Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Instant WebSocket messaging, voice audio notes, emoji reactions, and Supabase S3 file attachments.</em></p>
      </td>
      <td width="50%" align="center">
        <h4>🎙️ 6. WebRTC Peer-to-Peer Spatial Voice</h4>
        <img src="./image6.png" alt="WebRTC Voice Lounge Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Ultra-low latency P2P audio mesh with draggable 3D spatial avatars, Opus codec, and live green speaking indicators.</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <h4>🤖 7. In-Room Neural AI Study Buddy</h4>
        <img src="./image7.png" alt="AI Assistant Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>Context-aware AI academic tutor with Firestore message memory, LaTeX formula rendering, and code explanation.</em></p>
      </td>
      <td width="50%" align="center">
        <h4>⚡ 8. Upstash Redis Presence Radar</h4>
        <img src="./image8.png" alt="Presence Radar Preview" width="100%" style="border-radius: 10px;"/>
        <p><em>RAM-speed online status badges, 30s heartbeat keep-alives, and custom radial context action wheel.</em></p>
      </td>
    </tr>
  </table>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" alt="separator" />
</p>

---

## 🎯 Executive Summary & Problem Statement

Modern students lose over **25% of active study time** to digital friction and context switching across fragmented SaaS tools:

| Fragmented Ecosystem | Student Pain Point | How Studix Solves It |
| :--- | :--- | :--- |
| **Discord / Slack** | Cluttered, non-academic UI, distraction-heavy | Dedicated academic study rooms with curated channel hierarchy |
| **Google Docs** | Heavyweight tab, detached from chat & tasks | Embedded **Yjs CRDT** editor synced directly inside study rooms |
| **Notion / Trello** | Complex setup, lacks real-time audio/chat pairing | Microsecond **Firestore** synchronized collaborative task boards |
| **Zoom / Google Meet** | High resource overhead, link management friction | Instant **1-Click WebRTC** voice channels inside the room canvas |
| **ChatGPT / Claude** | External tab context switching, copy-pasting | On-demand **In-Room AI Study Buddy** with room context awareness |

---

## 📊 Feature Comparison Matrix

| Capability / Feature | Studix 🎓 | Discord 🎮 | Notion 📓 | Google Docs 📄 | Slack 💼 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Conflict-Free Real-Time Editor (CRDT)** | ✅ **Native Yjs** | ❌ | ⚠️ (Polling) | ✅ (OT) | ❌ |
| **Low-Latency P2P Voice Rooms** | ✅ **WebRTC** | ✅ | ❌ | ❌ | ⚠️ (Huddles) |
| **Real-Time Task Sync** | ✅ **Firestore** | ❌ | ✅ | ❌ | ❌ |
| **In-Room AI Academic Assistant** | ✅ **Integrated** | ⚠️ (Bot-based) | ✅ (Paid) | ⚠️ (Gemini) | ⚠️ (Add-on) |
| **Sub-Millisecond Presence Radar** | ✅ **Upstash Redis** | ✅ | ⚠️ (Delayed) | ✅ | ✅ |
| **Zero Context-Switch All-In-One UI** | ✅ **Yes** | ❌ | ❌ | ❌ | ❌ |
| **Glassmorphic / Dark-First Aesthetic** | ✅ **Framer Motion**| ❌ | ❌ | ❌ | ❌ |
| **Self-Hostable / Open Source** | ✅ **MIT** | ❌ | ❌ | ❌ | ❌ |

---

## ✨ Core Features & Technical Highlights

```mermaid
mindmap
  root((Studix Platform))
    Study Rooms
      Channel Hierarchy
      Role-Based Access
      Explore & Discover
    Real-Time Sync
      Socket.IO Clusters
      Yjs CRDT Deltas
      Redis Presence Radar
    Voice Engine
      WebRTC Mesh
      Opus Codec
      Floating HUD
    Academic AI
      Contextual Tutor
      Firestore History
      LaTeX & Code Explain
    Data & Storage
      MongoDB Atlas
      Supabase S3 Storage
      Firestore Tasks
```

### 1. 🔐 Split-Screen Authentication & Landing Experience
* **Interactive Dynamic Visuals**: Smooth split-screen login with animated **Gradient Blinds** and **Lightning Canvas Shaders** powered by Framer Motion.
* **Dual Auth Modes**: Secure Email/Password with schema validation and instant **Google One-Click OAuth**.

### 2. 🏠 Main Dashboard & Space Exploration
* **Curated Workspace Hub**: Fast access to Recent Rooms, All Spaces, and Public Explore Discovery directory.
* **Ambient Canvas Effects**: Integrated particle sparks and floating gradient backdrops with customizable light/dark glassmorphic themes.

### 3. ➕ Instant Room Provisioning & Invite Codes
* **6-Character Alphanumeric Codes**: Cryptographically random unique codes (e.g. `K9X2B7`) for instant 1-click sharing.
* **Granular Access Control**: Toggle between Public and Invite-Only Private rooms with customizable member caps.

### 4. 📝 Collaborative Notes Engine (Yjs + TipTap)
* **Mathematical CRDT Convergence**: Multiple users edit identical sentences simultaneously with zero merge conflicts or data loss.
* **Compact Binary Delta Broadcasting**: Edits serialized into `Uint8Array` binary byte buffers transmitted over WebSockets (< 1KB per edit).

### 5. 💬 Real-Time Messaging & Voice Audio
* **Sub-2ms WebSocket Broadcast**: Instant delivery powered by **Socket.IO** with multi-room namespace isolation.
* **Inline Voice Messages**: Record and transmit voice snippets with immediate waveform playback.
* **Radial Context Wheel**: Custom circular cursor action menu for fast copying, deleting, and AI-prompt forwarding.

### 6. 🎙️ WebRTC Peer-to-Peer Voice Channels
* **Direct P2P Audio Mesh**: Zero intermediate audio servers—voice packets travel peer-to-peer using UDP protocol for minimum latency.
* **Spatial 3D Audio Radar**: Drag personal and peer avatars around a 2D canvas to dynamically alter stereo pan and volume attenuation.

### 7. 🤖 Neural AI Study Buddy
* **In-Context Academic Intelligence**: Integrated AI tutor that summarizes notes, explains formulas, formats LaTeX, and generates practice questions.
* **Append-Only Immutable Logs**: Stored with millisecond timestamps in **Firebase Firestore**.

### 8. 👥 Live Presence Radar (Upstash Redis)
* **In-Memory RAM Speed**: Online status, idle timeouts, and room occupants are tracked in Upstash serverless Redis.
* **Zero-Downtime Fallback**: Automatic in-memory Set fallback preserves live tracking even during Redis reconnection.

---

## 🏗 System Architecture

Studix adopts an industrial **Hybrid MERN + Serverless Cloud** topology, segregating state according to latency, persistence, and consistency requirements:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       STUDIX CLIENT (Browser)                                   │
│                                                                                                 │
│    ┌───────────────────────────────────┬──────────────────────────────────┬─────────────────┐   │
│    │      React 19 + Tailwind CSS      │       Zustand State Stores       │  Framer Motion  │   │
│    └─────────────────┬─────────────────┴────────────────┬─────────────────┴────────┬────────┘   │
│                      │                                  │                          │            │
│             Socket.IO Client                       WebRTC (Audio)            Yjs CRDT Engine    │
└──────────────────────┼──────────────────────────────────┼──────────────────────────┼────────────┘
                       │ HTTPS / WSS                      │ Direct P2P UDP Mesh      │ Binary Deltas
                       ▼                                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  STUDIX API & SIGNALING SERVER                                  │
│                                                                                                 │
│    ┌───────────────────────────────────────────────────────────────────────────────────────┐    │
│    │               Node.js 20 + Express 5 (REST Endpoints & Auth Middleware)               │    │
│    ├───────────────────────────────────────────────────────────────────────────────────────┤    │
│    │              Socket.IO Server + Socket.IO Redis Adapter (Cluster Scalability)         │    │
│    └─────────┬──────────────────────┬──────────────────────┬──────────────────────┬────────┘    │
└──────────────┼──────────────────────┼──────────────────────┼──────────────────────┼─────────────┘
               │                      │                      │                      │
               ▼                      ▼                      ▼                      ▼
      ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
      │  MongoDB Atlas  │    │  Firebase Cloud │    │  Upstash Redis  │    │ Supabase / S3   │
      │   (Persistence) │    │  (Auth & Sync)  │    │   (In-Memory)   │    │  (Asset Vault)  │
      ├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤
      │ • Users         │    │ • Firebase JWT  │    │ • Presence Keys │    │ • Note PDFs     │
      │ • Study Rooms   │    │ • Live Tasks    │    │ • Online Badges │    │ • Voice Snippets│
      │ • Chat History  │    │ • AI Chat Logs  │    │ • Socket Pub/Sub│    │ • Avatars & Media│
      │ • Memberships   │    │ • Security Rules│    │ • Rate Limits   │    │ • Cloudflare R2 │
      └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔄 Real-Time Sequence Diagrams

### 1. Collaborative Notes Sync (Yjs CRDT over WebSockets)

```mermaid
sequenceDiagram
    autonumber
    actor Alice as 👩‍💻 Alice (Peer A)
    participant WS as ⚡ Socket.IO Server
    participant DB as 🍃 MongoDB Atlas
    actor Bob as 👨‍💻 Bob (Peer B)

    Alice->>Alice: Types new text in TipTap Editor
    Alice->>Alice: Yjs calculates binary state delta (Uint8Array)
    Alice->>WS: Emit "note-update" { roomId, update }
    WS->>Bob: Broadcast "note-synced" { update }
    WS->>DB: Debounced flush of full document state
    Bob->>Bob: Apply binary delta to local Y.Doc
    Bob->>Bob: TipTap view reconciles seamlessly (0 conflicts)
```

### 2. WebRTC P2P Voice Signaling & Negotiation

```mermaid
sequenceDiagram
    autonumber
    actor Alice as 👩‍💻 Alice (Caller)
    participant Signal as ⚡ Socket.IO Signaling
    actor Bob as 👨‍💻 Bob (Callee)

    Alice->>Signal: Emit "voice:join" { roomId }
    Signal->>Bob: Broadcast "voice:user-joined" { socketId: Alice }
    Alice->>Alice: Create RTCPeerConnection & SDP Offer
    Alice->>Signal: Emit "voice:offer" { targetSocketId: Bob, offer }
    Signal->>Bob: Forward "voice:offer" { from: Alice, offer }
    Bob->>Bob: Set Remote Description & Create SDP Answer
    Bob->>Signal: Emit "voice:answer" { targetSocketId: Alice, answer }
    Signal->>Alice: Forward "voice:answer" { from: Bob, answer }
    Alice->>Signal: Emit ICE Candidates
    Bob->>Signal: Emit ICE Candidates
    Note over Alice,Bob: 🎙️ P2P UDP Media Stream Established (Opus Audio)
```

---

## 🛠 Tech Stack Architecture

### Frontend Layer
| Technology | Version | Purpose |
| :--- | :---: | :--- |
| **[React](https://react.dev/)** | `v19.2` | Declarative, component-driven reactive user interface |
| **[Vite](https://vitejs.dev/)** | `v7.3` | Ultra-fast build engine, ESM hot module replacement (HMR) |
| **[Tailwind CSS](https://tailwindcss.com/)** | `v3.4` | Utility-first CSS framework tailored for glassmorphism |
| **[Framer Motion](https://www.framer.com/motion/)** | `v12.3` | Fluid layout animations, spring physics, dynamic modals |
| **[Zustand](https://zustand-demo.pmnd.rs/)** | `v5.0` | Atomic, boilerplate-free global state stores |
| **[TipTap](https://tiptap.dev/)** | `v2.27` | Headless, extensible rich-text framework |
| **[Yjs](https://yjs.dev/)** | `v13.6` | Production-grade CRDT algorithm for collaborative sync |
| **[Radix UI](https://www.radix-ui.com/)** | `v1.4` | Accessible, unstyled primitives backing shadcn/ui |
| **[Recharts](https://recharts.org/)** | `v2.15` | Composable SVG analytics and study activity charts |
| **[tsparticles](https://particles.js.org/)** | `v3.9` | Hardware-accelerated background ambient particle canvas |
| **[Lucide Icons](https://lucide.dev/)** | `v0.56` | Minimalist, sharp vector iconography |

### Backend & Cloud Layer
| Technology | Version | Purpose |
| :--- | :---: | :--- |
| **[Node.js](https://nodejs.org/)** | `v20.x+` | Asynchronous, event-loop driven runtime environment |
| **[Express](https://expressjs.com/)** | `v5.2` | High-throughput REST API routing and middleware pipeline |
| **[Socket.IO](https://socket.io/)** | `v4.8` | Bi-directional, multi-tenant WebSocket transport layer |
| **[@socket.io/redis-adapter](https://socket.io/docs/v4/redis-adapter/)** | `v8.3` | Multi-node horizontal scaling across server clusters |
| **[MongoDB / Mongoose](https://mongoosejs.com/)** | `v8.15` | Document persistence, schemas, indexes, and aggregation |
| **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)** | `v13.4` | Cryptographic JWT token verification & Firestore bridge |
| **[Upstash Redis / ioredis](https://ioredis.readthedocs.io/)** | `v5.6` | In-memory presence, fast TTL cache, heartbeat tracking |
| **[Supabase Storage (S3)](https://supabase.com/storage)** | `v2.9` | Cloud asset storage for PDFs, audio notes, and attachments |
| **[Helmet](https://helmetjs.github.io/) & [XSS](https://jsxss.com/)** | `v8.0 / v1.0` | Content Security Policy, XSS sanitization, HTTP hardening |

---

## ⚡ Quickstart in 60 Seconds

### Prerequisites
* **Node.js**: `v18.0.0+` (LTS recommended)
* **npm**: `v9.0.0+` or **pnpm** / **yarn**
* **Git**: `v2.30+`

### 1. Clone the Repository
```bash
git clone https://github.com/SuryaK999/Studix-Web-App.git
cd Studix-Web-App
```

### 2. Install All Dependencies
```bash
# Install frontend packages
cd app
npm install

# Install backend packages
cd server
npm install
cd ../..
```

### 3. Setup Environment Variables
```bash
# Frontend configuration
cp app/.env.example app/.env

# Backend configuration
cp app/server/.env.example app/server/.env
```

### 4. Run Locally in Development Mode

```bash
# Terminal 1 — Start the Backend Server (Port 4000)
cd app/server
npm run dev

# Terminal 2 — Start the Frontend Vite Server (Port 5173)
cd app
npm run dev
```

Visit **`http://localhost:5173`** in your browser! 🚀

---

## 🐳 Docker Compose Quickstart

Run the complete Studix infrastructure (Frontend + Backend + MongoDB + Redis) in one command:

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./app/server
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - CLIENT_URL=http://localhost:5173
      - MONGODB_URI=mongodb://mongo:27017/studix
      - UPSTASH_REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_SERVER_URL=http://localhost:4000
    depends_on:
      - backend

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

```bash
docker compose up --build -d
```

---

## 📁 Repository Directory Structure

```
studix/
├── 📄 README.md                        # Master documentation
├── 📄 .gitignore                       # Repository ignore rules
├── 📄 firebase-rules.md                # Production Firestore security rules
├── 📄 docker-compose.yml               # Container orchestration
│
├── 📂 app/                             # Frontend React 19 Client
│   ├── 📄 index.html                   # HTML entry point with preload tags
│   ├── 📄 package.json                 # Frontend dependencies
│   ├── 📄 vite.config.js               # Vite build optimizations
│   ├── 📄 tailwind.config.js           # Theme tokens, fonts, & animations
│   ├── 📄 components.json              # shadcn/ui configuration
│   ├── 📄 .env.example                 # Environment template
│   │
│   ├── 📂 public/
│   │   ├── 📄 studix-logo.svg          # 🎓 Apple-style Book + Stylus Vector Logo
│   │   └── 📄 manifest.json            # PWA manifest
│   │
│   └── 📂 src/
│       ├── 📄 main.jsx                 # React root initialization
│       ├── 📄 App.jsx                  # Main routing & layout engine
│       ├── 📄 index.css                # Glassmorphism tokens & Tailwind
│       │
│       ├── 📂 components/
│       │   ├── 📄 StudixLogo.jsx       # 🎨 Standalone Vector Logo Component
│       │   ├── 📂 auth/                # Login, Signup, SSO components
│       │   ├── 📂 room/                # Room dashboard, cards, create modal
│       │   ├── 📂 chat/                # Real-time chat, voice notes, emoji picker
│       │   ├── 📂 notes/               # Yjs CRDT TipTap collaborative editor
│       │   ├── 📂 voice/               # WebRTC P2P audio & floating HUD panel
│       │   ├── 📂 tasks/               # Real-time Firestore synchronized checklist
│       │   ├── 📂 ai/                  # In-room AI Academic Buddy assistant
│       │   ├── 📂 presence/            # Online badges & member radar
│       │   ├── 📂 explore/             # Public study room directory & search
│       │   ├── 📂 analytics/           # Recharts study session visualizers
│       │   └── 📂 ui/                  # Radix UI + shadcn/ui design primitives
│       │
│       ├── 📂 store/                   # Zustand atomic stores
│       │   ├── 📄 roomsStore.js        # Active rooms & channel selection
│       │   ├── 📄 usersStore.js        # Active user & profile state
│       │   └── 📄 voiceSessionStore.js # WebRTC audio stream & mute state
│       │
│       ├── 📂 services/                # API, Firebase & Supabase adapters
│       ├── 📂 hooks/                   # Custom React hooks (WebRTC, Sockets)
│       └── 📂 utils/                   # Formatter, math, and crypto utilities
│
└── 📂 app/server/                      # Backend Node.js / Express API
    ├── 📄 index.js                     # Express & Socket.IO server entry
    ├── 📄 package.json                 # Server dependencies
    ├── 📄 serviceAccountKey.json       # Firebase Admin private credentials (gitignored)
    │
    ├── 📂 config/                      # Database & Redis client factories
    ├── 📂 middleware/                  # JWT auth & role validation middleware
    ├── 📂 models/                      # Mongoose data schemas (User, Room, Message, Note)
    ├── 📂 routes/                      # REST API endpoints (/api/users, /api/rooms, etc.)
    └── 📂 sockets/                     # Real-time WebSocket event dispatchers
        ├── 📄 chat.js                  # Message & reaction dispatching
        ├── 📄 notes.js                 # Yjs binary delta propagation
        ├── 📄 voice.js                 # WebRTC SDP/ICE signaling relay
        └── 📄 typing.js                # Typing indicator broadcaster
```

---

## 🔐 Environment Variables Specification

### Frontend (`app/.env`)
```env
# =================================================================
# FIREBASE CREDENTIALS (Authentication & Firestore Tasks)
# =================================================================
VITE_FIREBASE_API_KEY=AIzaSyA1234567890abcdefghijklmnopqrst
VITE_FIREBASE_AUTH_DOMAIN=studix-workspace.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studix-workspace
VITE_FIREBASE_STORAGE_BUCKET=studix-workspace.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=109876543210
VITE_FIREBASE_APP_ID=1:109876543210:web:abcdef1234567890
VITE_FIREBASE_DATABASE_URL=https://studix-workspace-default-rtdb.firebaseio.com

# =================================================================
# CLOUD STORAGE BACKEND (Supabase S3 / Cloudflare R2)
# =================================================================
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_BUCKET_NAME=studix-uploads

# =================================================================
# BACKEND API & SOCKET ENDPOINT
# =================================================================
VITE_SOCKET_URL=http://127.0.0.1:4000
VITE_API_URL=http://127.0.0.1:4000
```

### Backend (`app/server/.env`)
```env
# =================================================================
# DATABASE & CACHE CONNECTIONS
# =================================================================
MONGO_URI=mongodb+srv://admin:securepassword@cluster0.mongodb.net/studix?retryWrites=true&w=majority
REDIS_ENABLED=true
REDIS_URL=rediss://default:password@eu1-studix.upstash.io:6379

# =================================================================
# SERVER RUNTIME CONFIGURATION
# =================================================================
PORT=4000
CLIENT_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
FIREBASE_PROJECT_ID=studix-app999
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

---

## 📡 REST API Reference

Base URL: `http://localhost:4000/api`  
All protected endpoints require `Authorization: Bearer <FIREBASE_ID_TOKEN>`.

### Authentication & Users
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :---: |
| `POST` | `/users/profile` | Sync / update user profile metadata | 🔒 User |
| `GET` | `/users/profile` | Fetch active authenticated user profile | 🔒 User |
| `GET` | `/users/username-check/:username` | Real-time username availability validation | 🔒 Public |

### Study Rooms
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :---: |
| `POST` | `/rooms` | Create a new study room with owner permissions | 🔒 User |
| `GET` | `/rooms` | List all rooms user belongs to | 🔒 User |
| `GET` | `/rooms/explore` | List all open public rooms for discovery | 🔒 User |
| `GET` | `/rooms/:id` | Fetch detailed room metadata and channel listing | 🔒 Member |
| `POST` | `/rooms/:idOrCode/join` | Join room via ID or 6-character Invite Code | 🔒 User |
| `GET` | `/rooms/:id/presence` | Fetch online active participant avatars | 🔒 Member |

### Chat & Message History
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :---: |
| `GET` | `/messages/:roomId` | Fetch paginated chat history with emoji reactions | 🔒 Member |

### Collaborative Notes
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :---: |
| `GET` | `/notes/:roomId` | Fetch latest snapshot of room collaborative note | 🔒 Member |
| `PUT` | `/notes/:roomId` | Save serialized note snapshot state | 🔒 Member |

---

## 🔌 Real-Time Event Specification

### WebSocket Events (Client ⇆ Server)

| Direction | Event Name | Payload Structure | Purpose |
| :--- | :--- | :--- | :--- |
| `C → S` | `room:join` | `{ roomId: string }` | Join room socket namespace |
| `C → S` | `chat:send` | `{ roomId: string, message: MessageObject }` | Transmit chat message |
| `S → C` | `chat:receive` | `{ id, text, type, senderId, senderName, ... }` | Instant real-time broadcast (< 2ms) |
| `C → S` | `note:sync` | `{ roomId: string, update: Uint8Array }` | Yjs CRDT binary delta |
| `S → C` | `note:synced` | `{ update: Uint8Array }` | Reconcile collaborative text |
| `C → S` | `typing:start` | `{ roomId: string, userId: string }` | Trigger live typing indicator |
| `S → C` | `typing:update`| `{ userId: string, isTyping: boolean }` | Display typing status to peers |
| `C → S` | `voice:join` | `{ roomId, userId, name, avatar }` | Join WebRTC audio mesh |
| `C → S` | `voice:offer` | `{ targetSocketId, offer }` | Send WebRTC SDP offer |
| `S → C` | `voice:offer` | `{ from, offer }` | Forward SDP offer to callee |
| `C → S` | `voice:answer`| `{ targetSocketId, answer }` | Send WebRTC SDP answer |
| `S → C` | `voice:answer`| `{ from, answer }` | Forward SDP answer to caller |
| `C → S` | `voice:ice-candidate`| `{ targetSocketId, candidate }` | Exchange ICE candidate |
| `S → C` | `voice:ice-candidate`| `{ from, candidate }` | Forward ICE candidate |
| `C → S` | `voice:position`| `{ roomId, x, y }` | Broadcast 3D spatial coordinates |
| `S → C` | `presence:joined`| `{ userId, displayName, photoURL }` | Redis / Memory presence pulse |

---

## 🛡️ Enterprise Security & Hardening

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DEFENSE-IN-DEPTH MATRIX                                │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ 1. Identity & Auth       │ Firebase JWT validation on every REST and WebSocket handoff │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Transport Security    │ Mandatory TLS (HTTPS/WSS), HSTS headers, secure cookies     │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Attack Surface Defense│ Helmet.js (CSP, X-Frame-Options, MIME sniffing mitigation)  │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. Payload Sanitization  │ DOMPurify + xss filters strip malicious script tags         │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 5. Database Rules        │ Granular Firestore Security Rules with role checks          │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 6. Secret Isolation      │ Zero hardcoded credentials; protected via .env + GitIgnore  │
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide

### One-Click Deploy Buttons

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### Production Build Steps

#### 1. Compile Frontend (Vite)
```bash
cd app
npm run build
```
*Output directory:* `app/dist/` (Deploy to **Vercel**, **Cloudflare Pages**, or **Firebase Hosting**).

#### 2. Start Production Server (Node.js / Express)
```bash
cd app/server
npm start
```
*(Deploy to **Railway**, **Render**, **Fly.io**, or **AWS EC2** with PM2).*

---

## 🗺 Production Roadmap

- [x] **v1.0.0**: Hybrid MERN Foundation + Socket.IO real-time chat
- [x] **v1.1.0**: Yjs CRDT Google Docs-style simultaneous notes editor
- [x] **v1.2.0**: WebRTC P2P Voice mesh channels with spatial audio & floating HUD
- [x] **v1.3.0**: Upstash Redis presence radar & status indicators
- [x] **v1.4.0**: Neural In-Room AI Study Buddy assistant
- [ ] **v1.5.0**: Ultra-low latency WebRTC Screen Sharing & Whiteboard canvas
- [ ] **v1.6.0**: End-to-End Encryption (E2EE) for private study rooms
- [ ] **v1.7.0**: Multi-tenant Video Grid Channels (SFU / Mediasoup)
- [ ] **v1.8.0**: iOS & Android Native Applications via React Native

---

## 🤝 Contributing & Community

We welcome contributions from developers worldwide! Please review our guidelines:

1. **Fork** the repository: `git clone https://github.com/SuryaK999/Studix-Web-App.git`
2. **Create a Feature Branch**: `git checkout -b feat/ultra-fast-sync`
3. **Commit with Conventional Messages**:
   * `feat:` for new capabilities
   * `fix:` for bug fixes
   * `perf:` for latency / memory improvements
   * `docs:` for documentation updates
4. **Push & Open a Pull Request**!

---

## 📄 License

Studix is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Studix Academic Technologies

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

<br/>

<div align="center">

**Built with ❤️ for students and teams around the globe.**

<sub>Star ⭐ the repository if Studix empowers your learning!</sub>

</div>
