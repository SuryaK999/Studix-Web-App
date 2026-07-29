<p align="center">
  <img src="https://img.shields.io/github/v/release/SuryaK999/Studix-Web-App?style=for-the-badge&label=release&labelColor=0d0d0d&color=7e56f0" alt="Release" />
  <img src="https://img.shields.io/github/stars/SuryaK999/Studix-Web-App?style=for-the-badge&label=stars&labelColor=0d0d0d&color=ffb86b" alt="Stars" />
  <img src="https://img.shields.io/github/forks/SuryaK999/Studix-Web-App?style=for-the-badge&label=forks&labelColor=0d0d0d&color=60a5fa" alt="Forks" />
  <img src="https://img.shields.io/github/issues/SuryaK999/Studix-Web-App?style=for-the-badge&label=open%20issues&labelColor=0d0d0d&color=f97316" alt="Open Issues" />
  <img src="https://img.shields.io/github/issues-pr/SuryaK999/Studix-Web-App?style=for-the-badge&label=open%20PRs&labelColor=0d0d0d&color=ff7ab6" alt="Open PRs" />
  <img src="https://img.shields.io/badge/PRs-Welcome-f97316?style=for-the-badge&labelColor=0d0d0d" alt="PRs Welcome" />
  <img src="https://img.shields.io/github/license/SuryaK999/Studix-Web-App?style=for-the-badge&label=license&labelColor=0d0d0d&color=10b981" alt="License" />
  <img src="https://img.shields.io/github/last-commit/SuryaK999/Studix-Web-App?style=for-the-badge&label=last%20commit&labelColor=0d0d0d&color=34d399" alt="Last Commit" />
  <img src="https://img.shields.io/github/languages/top/SuryaK999/Studix-Web-App?style=for-the-badge&label=top%20language&labelColor=0d0d0d&color=7c3aed" alt="Top Language" />
  <img src="https://img.shields.io/github/repo-size/SuryaK999/Studix-Web-App?style=for-the-badge&label=repo%20size&labelColor=0d0d0d&color=64748b" alt="Repo Size" />
</p>

<h1 align="center">
  🎓 Studix
</h1>

<p align="center">
  <strong>The Next-Generation Real-Time Collaborative Study Workspace</strong>
</p>

<p align="center">
  A high-performance, <em>Discord-grade</em> academic platform unifying real-time chat, collaborative notes, AI tutoring, voice channels, and task management into one cinematic experience — buil[...] 
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-security">Security</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Real-Time Event System](#-real-time-event-system)
- [API Reference](#-api-reference)
- [Firebase Security Rules](#-firebase-security-rules)
- [Security](#-security)
- [Deployment](#-deployment)
- [Performance Optimizations](#-performance-optimizations)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🔍 Problem Statement

Modern students are trapped in a fragmented digital ecosystem:

| Pain Point | Description |
|---|---|
| **Tool Fragmentation** | Juggling Discord for chat, Google Docs for notes, Notion for tasks, and ChatGPT for help — context switching kills productivity |
| **Sync Delays** | Most web apps lack true real-time feedback like ghost cursors and typing indicators |
| **Merge Conflicts** | Simultaneous document edits often overwrite each other, causing data loss |
| **Poor UX** | Educational tools are "functional but boring" — failing to engage digital-native students |
| **Cognitive Overhead** | Switching between 4–5 tabs per study session creates unnecessary mental load |

**Studix eliminates these friction points by providing a single, vertically integrated "Study Room" with sub-millisecond sync.**

---

## ✨ Features

### 🏠 Study Rooms & Channels
- Create and join dedicated rooms organized by subject, project, or study group
- Discord-style channel architecture for focused collaboration
- Room discovery via explore panel — browse and join public rooms
- Owner controls: manage members, permissions, and room settings

### 💬 Real-Time Messaging
- Instant messaging powered by **Socket.IO** WebSockets
- Message reactions with emoji support
- Context menus for copy, delete, and AI-powered actions
- Voice messages with inline playback
- Typing indicators and read receipts
- Message history persisted to **MongoDB Atlas**

### 📝 Collaborative Notes Editor
- **Google Docs-style** simultaneous editing with zero merge conflicts
- Powered by **Yjs** (CRDT — Conflict-free Replicated Data Types) + **TipTap**
- Rich text formatting: headings, lists, code blocks, and more
- Changes broadcast as binary chunks via WebSockets for minimal bandwidth

### 🤖 AI Study Buddy
- Integrated AI tutor for on-demand academic assistance
- Ask questions, summarize notes, get code explanations — all without leaving the room
- Context-aware responses within the study session
- Append-only chat history stored in **Firebase Firestore**

### 🎙️ Voice Channels (WebRTC)
- **Peer-to-peer** voice communication via WebRTC
- Ultra-low latency with UDP protocol and Opus codec
- Built-in echo cancellation and noise suppression
- Socket.IO-based signaling for SDP/ICE exchange
- Floating voice panel for multitasking

### ✅ Real-Time Task Management
- Collaborative checklist / task board synchronized in real-time
- Powered by **Firebase Firestore** for millisecond-level update propagation
- Create, assign, complete, and delete tasks — updates appear instantly for all members

### 👥 Live Presence System
- Real-time "Green Dot" online indicators via **Upstash Redis**
- See exactly who is online and active in each room
- Idle detection and status messages
- Typing speed indicators

### 🎨 Cinematic Design
- **Glassmorphism** aesthetic with frosted-glass surfaces
- Floating gradient backgrounds and liquid animations
- Physics-based micro-interactions via **Framer Motion**
- Custom radial context menu for power-user workflows
- Particle effects with **tsparticles**
- Premium typography with **Archivo** from Google Fonts

### 📁 Cloud File Storage
- Upload PDFs, images, and profile photos
- Powered by **Supabase Storage** (S3-compatible)
- Automatic image compression via `browser-image-compression`
- Support for Cloudflare R2 as an alternative storage backend

### 📊 Analytics Dashboard
- Visual overview of room activity and collaboration metrics
- Charts powered by **Recharts**

---

## 🏗 Architecture

Studix employs a **"Best-of-Breed" hybrid architecture**, selecting specialized tools for each concern:

```
┌────────────────────────────────────────────────────────────────[...]
│                        CLIENT  (Browser)                           │
│                                                                    │
│   React 19 + Vite 7  ──  Zustand  ──  Framer Motion  ──  TipTap  │
│         │                    │                │                     │
│         │    Socket.IO       │    WebRTC      │    Yjs (CRDT)      │
│         │    Client          │    P2P Audio   │    Sync Engine     │
└────┬────┴────────────────────┴────────────────┴────────────────[...]
     │  HTTPS / WSS

┌────┴───────────────────────────────────────────────────────────[...]
│                     BACKEND  (Node.js + Express)                   │
│                                                                    │
│   REST API ── Auth Middleware ── Socket.IO Server ── Redis Adapter │
│       │              │                │                    │       │
│       ▼              ▼                ▼                    ▼       │
│   Mongoose       Firebase          Socket           Upstash Redis  │
│   (MongoDB)      Admin SDK        Handlers          (Presence)     │
└────┬──────────────┬───────────────┬────────────────┬───────────[...]
     │              │               │                │
     ▼              ▼               ▼                ▼
┌─────────┐  ┌───────────┐  ┌────────────┐  ┌──────────────┐
│ MongoDB │  │ Firebase   │  │ Supabase   │  │ Upstash      │
│ Atlas   │  │ Auth +     │  │ Storage    │  │ Redis        │
│         │  │ Firestore  │  │            │  │              │
│ Users   │  │ Tasks      │  │ PDFs       │  │ Online       │
│ Rooms   │  │ AI Chat    │  │ Images     │  │ Status       │
│ Messages│  │ Auth       │  │ Profiles   │  │ Presence     │
│ Notes   │  │ Typing     │  │            │  │              │
└─────────┘  └───────────┘  └────────────┘  └──────────────┘
```

### Data Flow Philosophy

| Data Type | Storage | Why |
|---|---|---|
| **Users, Rooms, Messages, Notes** | MongoDB Atlas | High-volume, structured persistence with flexible NoSQL schemas |
| **Tasks, AI Chat History** | Firebase Firestore | Low-latency real-time sync with built-in listeners |
| **Authentication** | Firebase Auth | Industry-standard JWT tokens with Google SSO |
| **Presence (Who's Online)** | Upstash Redis | In-memory store for ultra-fast status checks (RAM speed) |
| **File Uploads** | Supabase Storage | S3-compatible cloud storage, offloads server load |
| **Real-Time Events** | Socket.IO + Redis Adapter | Persistent WebSocket tunnel for instant broadcast |
| **Voice Communication** | WebRTC (P2P) | Direct peer connection — no server routing overhead |
| **Collaborative Editing** | Yjs (CRDT) over Socket.IO | Mathematical conflict resolution — no data loss |

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | Component-based reactive UI framework |
| **Vite 7** | Lightning-fast HMR build tool (10x faster than CRA) |
| **Tailwind CSS 3** | Utility-first CSS framework for glassmorphic design |
| **Framer Motion** | Physics-based animations and page transitions |
| **Zustand** | Lightweight state management (simpler than Redux) |
| **Radix UI** | Accessible, unstyled headless UI primitives |
| **shadcn/ui** | Pre-built components on top of Radix + Tailwind |
| **TipTap** | Headless rich-text editor framework |
| **Yjs** | CRDT engine for conflict-free collaborative editing |
| **Socket.IO Client** | WebSocket client for real-time communication |
| **Recharts** | Composable chart library for analytics |
| **tsparticles** | Canvas particle effects for ambient animations |
| **Lucide React** | Beautiful, consistent icon system |
| **React Router v7** | Client-side routing for SPA navigation |
| **React Hook Form + Zod** | Form handling with schema-based validation |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | Asynchronous, event-driven JavaScript runtime |
| **Express 5** | Web framework for REST API and middleware |
| **Socket.IO** | Bi-directional WebSocket server for real-time events |
| **Mongoose** | MongoDB ODM for schema validation and queries |
| **Firebase Admin SDK** | Server-side auth verification and Firestore access |
| **ioredis** | Redis client for presence management |
| **@socket.io/redis-adapter** | Scale Socket.IO across multiple server instances |
| **Helmet** | HTTP security headers middleware |
| **xss** | XSS sanitization for user-generated content |
| **Multer** | Multipart file upload handling |
| **CORS** | Cross-Origin Resource Sharing configuration |

### Cloud Infrastructure

| Service | Purpose |
|---|---|
| **MongoDB Atlas** | Managed NoSQL database cluster |
| **Firebase (Auth + Firestore)** | Authentication and real-time task sync |
| **Upstash Redis** | Serverless Redis for presence tracking |
| **Supabase Storage** | S3-compatible file storage |
| **Cloudflare R2** *(optional)* | Alternative storage backend |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

| Tool | Minimum Version | Download |
|---|---|---|
| **Node.js** | `v18.0.0+` | [nodejs.org](https://nodejs.org/) |
| **npm** | `v9.0.0+` | Bundled with Node.js |
| **Git** | `v2.30+` | [git-scm.com](https://git-scm.com/) |

You will also need accounts on:
- [Firebase Console](https://console.firebase.google.com/) — Auth + Firestore
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Database cluster
- [Upstash](https://upstash.com/) — Redis instance
- [Supabase](https://supabase.com/) — Storage bucket

### Installation

**1. Clone the Repository**

```bash
git clone https://github.com/your-username/studix.git
cd studix
```

**2. Install Frontend Dependencies**

```bash
cd app
npm install
```

**3. Install Backend Dependencies**

```bash
cd app/server
npm install
```

**4. Configure Environment Variables**

```bash
# Frontend environment
cp app/.env.example app/.env

# Backend environment
cp app/server/.env.example app/server/.env   # create from template below
```

Fill in your credentials — see the [Environment Variables](#-environment-variables) section for full details.

**5. Set Up Firebase**

- Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
- Enable **Authentication** → Sign-in Methods → Email/Password + Google
- Create a **Firestore Database** in production mode
- Download `serviceAccountKey.json` and place it in `app/server/`
- Deploy security rules from [`firebase-rules.md`](firebase-rules.md)

**6. Set Up MongoDB Atlas**

- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Whitelist your IP address (or `0.0.0.0/0` for development)
- Create a database user and copy the connection string

**7. Set Up Upstash Redis**

- Create a Redis database at [Upstash Console](https://console.upstash.com/)
- Copy the `UPSTASH_REDIS_URL` from the dashboard

### Running Locally

Open **two terminal windows**:

**Terminal 1 — Start the Backend Server** (Port 4000)

```bash
cd app/server
npm run dev
```

**Terminal 2 — Start the Frontend Dev Server** (Port 5173)

```bash
cd app
npm run dev
```

The application will be available at **`http://localhost:5173`**.

> **💡 Tip:** The backend runs with `--watch` flag for auto-restart on file changes.

---

## 📁 Project Structure

```
studix/
├── 📄 README.md                          # ← You are here
├── 📄 .gitignore                         # Git ignore rules
├── 📄 firebase-rules.md                  # Production Firestore & RTDB rules
│
├── 📂 app/                               # Application root
│   ├── 📄 index.html                     # HTML entry point
│   ├── 📄 package.json                   # Frontend dependencies & scripts
│   ├── 📄 vite.config.js                 # Vite build configuration
│   ├── 📄 tailwind.config.js             # Tailwind CSS customization
│   ├── 📄 postcss.config.js              # PostCSS plugins
│   ├── 📄 eslint.config.js               # ESLint rules
│   ├── 📄 components.json                # shadcn/ui configuration
│   ├── 📄 .env.example                   # Environment template
│   │
│   ├── 📂 public/                        # Static assets
│   │   └── 📄 manifest.json              # PWA manifest
│   │
│   ├── 📂 src/                           # Frontend source code
│   │   ├── 📄 main.jsx                   # React entry point
│   │   ├── 📄 App.jsx                    # Root component + routing
│   │   ├── 📄 App.css                    # App-level styles
│   │   ├── 📄 index.css                  # Global styles + Tailwind directives
│   │   │
│   │   ├── 📂 components/                # React components
│   │   │   ├── 📄 Dashboard.jsx          # Main dashboard view
│   │   │   ├── 📄 Sidebar.jsx            # Navigation sidebar
│   │   │   ├── 📄 ErrorBoundary.jsx      # Error boundary wrapper
│   │   │   │
│   │   │   ├── 📂 auth/                  # Authentication
│   │   │   │   ├── 📄 LoginForm.jsx
│   │   │   │   └── 📄 SignUpForm.jsx
│   │   │   │
│   │   │   ├── 📂 room/                  # Room management
│   │   │   │   ├── 📄 StudyRoom.jsx      # Main room view
│   │   │   │   ├── 📄 RoomList.jsx       # Room listing
│   │   │   │   ├── 📄 CreateRoom.jsx     # Room creation form
│   │   │   │   └── 📄 JoinRoom.jsx       # Room join dialog
│   │   │   │
│   │   │   ├── 📂 chat/                  # Messaging system
│   │   │   │   ├── 📄 ChatPanel.jsx      # Chat container
│ (rest of file unchanged)
