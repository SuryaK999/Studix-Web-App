<p align="center">
  <img src="https://img.shields.io/badge/Studix-v1.0.0-7e56f0?style=for-the-badge&labelColor=0d0d0d" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge&labelColor=0d0d0d" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-f97316?style=for-the-badge&labelColor=0d0d0d" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/Build-Production-22d3ee?style=for-the-badge&labelColor=0d0d0d" alt="Build" />
</p>

<h1 align="center">
  🎓 Studix
</h1>

<p align="center">
  <strong>The Next-Generation Real-Time Collaborative Study Workspace</strong>
</p>

<p align="center">
  A high-performance, <em>Discord-grade</em> academic platform unifying real-time chat, collaborative notes, AI tutoring, voice channels, and task management into one cinematic experience — built on a <strong>Hybrid MERN</strong> stack.
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
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT  (Browser)                           │
│                                                                    │
│   React 19 + Vite 7  ──  Zustand  ──  Framer Motion  ──  TipTap  │
│         │                    │                │                     │
│         │    Socket.IO       │    WebRTC      │    Yjs (CRDT)      │
│         │    Client          │    P2P Audio   │    Sync Engine     │
└────┬────┴────────────────────┴────────────────┴────────────────────┘
     │  HTTPS / WSS
     │
┌────┴───────────────────────────────────────────────────────────────┐
│                     BACKEND  (Node.js + Express)                   │
│                                                                    │
│   REST API ── Auth Middleware ── Socket.IO Server ── Redis Adapter │
│       │              │                │                    │       │
│       ▼              ▼                ▼                    ▼       │
│   Mongoose       Firebase          Socket           Upstash Redis  │
│   (MongoDB)      Admin SDK        Handlers          (Presence)     │
└────┬──────────────┬───────────────┬────────────────┬──────────────┘
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
│   │   │   │   ├── 📄 MessageItem.jsx    # Individual message
│   │   │   │   ├── 📄 MessageReactions.jsx
│   │   │   │   ├── 📄 MessageContextMenu.jsx
│   │   │   │   ├── 📄 TypingIndicator.jsx
│   │   │   │   └── 📄 VoiceMessage.jsx
│   │   │   │
│   │   │   ├── 📂 notes/                 # Collaborative editor
│   │   │   │   └── 📄 NotesEditor.jsx    # Yjs + TipTap editor
│   │   │   │
│   │   │   ├── 📂 tasks/                 # Task management
│   │   │   │   └── 📄 TaskChecklist.jsx  # Real-time task list
│   │   │   │
│   │   │   ├── 📂 ai/                    # AI integration
│   │   │   │   └── 📄 AiStudyBuddy.jsx  # AI chat interface
│   │   │   │
│   │   │   ├── 📂 voice/                 # Voice channels
│   │   │   │   ├── 📄 VoiceChat.jsx      # WebRTC voice logic
│   │   │   │   ├── 📄 VoiceFloatingPanel.jsx
│   │   │   │   └── 📄 voiceFloat.css
│   │   │   │
│   │   │   ├── 📂 presence/              # Online status
│   │   │   ├── 📂 analytics/             # Dashboard analytics
│   │   │   ├── 📂 explore/               # Room discovery
│   │   │   ├── 📂 settings/              # User settings
│   │   │   ├── 📂 room-intro/            # Room onboarding
│   │   │   ├── 📂 ui/                    # shadcn/ui primitives
│   │   │   ├── 📂 magicui/               # Custom animated components
│   │   │   └── 📂 animate-ui/            # Animation components
│   │   │
│   │   ├── 📂 pages/                     # Page-level components
│   │   │   ├── 📄 AllRooms.jsx
│   │   │   └── 📄 RecentRooms.jsx
│   │   │
│   │   ├── 📂 store/                     # Zustand state stores
│   │   │   ├── 📄 roomsStore.js          # Room state management
│   │   │   ├── 📄 usersStore.js          # User state management
│   │   │   ├── 📄 voiceSessionStore.js   # Voice session state
│   │   │   ├── 📄 globalRoomSearchStore.js
│   │   │   └── 📄 exploreDialogStore.js
│   │   │
│   │   ├── 📂 services/                  # API & service layer
│   │   │   ├── 📄 api.js                 # Axios/Fetch API client
│   │   │   ├── 📄 firebase.js            # Firebase client init
│   │   │   └── 📄 voiceStorageService.js
│   │   │
│   │   ├── 📂 realtime/                  # Real-time listeners
│   │   │   └── 📄 globalRoomsListener.js
│   │   │
│   │   ├── 📂 context/                   # React context providers
│   │   ├── 📂 hooks/                     # Custom React hooks
│   │   ├── 📂 lib/                       # Utility libraries
│   │   ├── 📂 types/                     # Type definitions
│   │   └── 📂 utils/                     # Helper functions
│   │
│   └── 📂 server/                        # Backend server
│       ├── 📄 index.js                   # Express + Socket.IO entry
│       ├── 📄 package.json               # Backend dependencies
│       ├── 📄 serviceAccountKey.json     # 🔒 Firebase admin key (gitignored)
│       │
│       ├── 📂 config/                    # Server configuration
│       ├── 📂 middleware/                 # Express middleware
│       │   ├── 📄 auth.js                # Firebase JWT verification
│       │   └── 📄 permissions.js         # Role-based access control
│       │
│       ├── 📂 models/                    # Mongoose schemas
│       │   ├── 📄 User.js                # User profile schema
│       │   ├── 📄 Room.js                # Study room schema
│       │   ├── 📄 Message.js             # Chat message schema
│       │   ├── 📄 Membership.js          # Room membership schema
│       │   └── 📄 Note.js                # Notes schema
│       │
│       ├── 📂 routes/                    # REST API routes
│       │   ├── 📄 users.js               # User CRUD endpoints
│       │   ├── 📄 rooms.js               # Room management endpoints
│       │   ├── 📄 messages.js            # Message endpoints
│       │   └── 📄 notes.js               # Notes endpoints
│       │
│       ├── 📂 sockets/                   # Socket.IO event handlers
│       │   ├── 📄 index.js               # Socket initialization
│       │   ├── 📄 chat.js                # Chat socket events
│       │   ├── 📄 notes.js               # Notes sync events
│       │   ├── 📄 typing.js              # Typing indicator events
│       │   └── 📄 voice.js               # Voice signaling events
│       │
│       ├── 📂 services/                  # Business logic layer
│       └── 📂 uploads/                   # Temporary file uploads
```

---

## 🔐 Environment Variables

### Frontend (`app/.env`)

```env
# ============================================
# FIREBASE CONFIGURATION (REQUIRED)
# ============================================
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxxxxxxx
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# ============================================
# STORAGE PROVIDER (REQUIRED — choose one)
# ============================================
VITE_STORAGE_PROVIDER=supabase          # 'supabase' or 'r2'

# Option A: Supabase Storage
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_BUCKET_NAME=studix-uploads

# Option B: Cloudflare R2 (alternative)
VITE_R2_ACCOUNT_ID=your_cloudflare_account_id
VITE_R2_ACCESS_KEY_ID=your_r2_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
VITE_R2_BUCKET_NAME=studix-uploads
VITE_R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# ============================================
# AI FEATURES (OPTIONAL)
# ============================================
# VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Backend (`app/server/.env`)

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/studix

# Upstash Redis URL
UPSTASH_REDIS_URL=rediss://default:password@endpoint.upstash.io:6379

# Server configuration
PORT=4000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> **⚠️ Warning:** Never commit `.env` files or `serviceAccountKey.json` to version control. Both are listed in `.gitignore`.

---

## 🗄 Database Schema

### MongoDB Collections (via Mongoose)

#### `User`
```javascript
{
  firebaseUid: String,       // Firebase Auth UID (unique)
  displayName: String,       // User display name
  email: String,             // Email address
  photoURL: String,          // Profile image URL
  createdAt: Date            // Account creation timestamp
}
```

#### `Room`
```javascript
{
  name: String,              // Room name (2-50 chars)
  description: String,       // Room description
  ownerId: String,           // Firebase UID of creator
  members: [String],         // Array of member UIDs
  createdAt: Date
}
```

#### `Message`
```javascript
{
  roomId: ObjectId,          // Reference to Room
  senderId: String,          // Firebase UID
  senderName: String,        // Display name at send time
  text: String,              // Message content (max 5000 chars)
  type: String,              // 'text' | 'voice' | 'system'
  attachments: [Object],     // File attachments
  reactions: Object,         // Emoji reactions map
  createdAt: Date
}
```

#### `Note`
```javascript
{
  roomId: ObjectId,          // Reference to Room
  content: String,           // Note content (max 100KB)
  lastEditedBy: String,      // Last editor UID
  updatedAt: Date
}
```

#### `Membership`
```javascript
{
  userId: String,            // Firebase UID
  roomId: ObjectId,          // Reference to Room
  role: String,              // 'owner' | 'member'
  joinedAt: Date
}
```

### Firebase Firestore Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `rooms/{roomId}/tasks` | Real-time task sync | `text`, `completed`, `createdBy`, `createdAt` |
| `rooms/{roomId}/ai-chat` | AI conversation history | `content`, `role`, `timestamp` |
| `rooms/{roomId}/typing` | Typing indicators | `userId`, `isTyping` |
| `users/{userId}` | User profiles (mirror) | `displayName`, `photoURL` |

---

## ⚡ Real-Time Event System

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, userId }` | Join a study room |
| `leave-room` | `{ roomId, userId }` | Leave a study room |
| `send-message` | `{ roomId, text, type }` | Send a chat message |
| `typing-start` | `{ roomId, userId }` | User started typing |
| `typing-stop` | `{ roomId, userId }` | User stopped typing |
| `note-update` | `{ roomId, update }` | Yjs binary update |
| `voice-offer` | `{ targetId, sdp }` | WebRTC SDP offer |
| `voice-answer` | `{ targetId, sdp }` | WebRTC SDP answer |
| `ice-candidate` | `{ targetId, candidate }` | ICE candidate exchange |
| `join-voice` | `{ roomId }` | Join voice channel |
| `leave-voice` | `{ roomId }` | Leave voice channel |

#### Server → Client

| Event | Payload | Description |
|---|---|---|
| `new-message` | `{ message }` | New message received |
| `user-joined` | `{ userId, roomId }` | A user joined the room |
| `user-left` | `{ userId, roomId }` | A user left the room |
| `typing-update` | `{ userId, isTyping }` | Typing status change |
| `note-synced` | `{ update }` | Yjs document update |
| `presence-update` | `{ onlineUsers }` | Online status refresh |
| `voice-offer` | `{ fromId, sdp }` | Incoming voice offer |
| `voice-answer` | `{ fromId, sdp }` | Voice answer received |
| `ice-candidate` | `{ fromId, candidate }` | ICE candidate received |

---

## 📡 API Reference

### Base URL

```
http://localhost:4000/api
```

All protected routes require a Firebase JWT token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

### Endpoints

#### Users

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/users` | Create or update user profile | ✅ |
| `GET` | `/api/users/:uid` | Get user by Firebase UID | ✅ |
| `GET` | `/api/users` | List all users | ✅ |

#### Rooms

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/rooms` | Create a new study room | ✅ |
| `GET` | `/api/rooms` | Get rooms for current user | ✅ |
| `GET` | `/api/rooms/:id` | Get room details by ID | ✅ |
| `PUT` | `/api/rooms/:id` | Update room settings | ✅ |
| `DELETE` | `/api/rooms/:id` | Delete room (owner only) | ✅ |
| `POST` | `/api/rooms/:id/join` | Join a room | ✅ |
| `POST` | `/api/rooms/:id/leave` | Leave a room | ✅ |

#### Messages

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/messages/:roomId` | Get message history | ✅ |
| `POST` | `/api/messages` | Send a message | ✅ |

#### Notes

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/notes/:roomId` | Get room notes | ✅ |
| `PUT` | `/api/notes/:roomId` | Update room notes | ✅ |

---

## 🛡 Firebase Security Rules

Studix uses comprehensive Firestore and Realtime Database security rules. Key principles:

- ✅ **Authentication required** for all operations
- ✅ **Membership checks** — only room members can read/write room data
- ✅ **Owner-only deletes** — only room owners can delete rooms
- ✅ **Sender verification** — messages can only be sent by the authenticated user
- ✅ **Size limits** — messages capped at 5,000 chars, notes at 100KB
- ✅ **Append-only AI chat** — AI conversation history cannot be edited or deleted
- ✅ **Default deny** — everything not explicitly allowed is denied

Full rules are documented in [`firebase-rules.md`](firebase-rules.md).

---

## 🔒 Security

| Layer | Implementation |
|---|---|
| **Authentication** | Firebase Auth with JWT tokens — email/password + Google OAuth |
| **Authorization** | Server-side middleware verifies tokens via Firebase Admin SDK |
| **HTTP Headers** | Helmet.js sets security headers (CSP, HSTS, X-Frame-Options) |
| **XSS Protection** | `xss` library sanitizes all user-generated content |
| **CORS** | Strict origin allowlist — only the frontend domain is permitted |
| **Firestore Rules** | Role-based access with membership verification |
| **Environment Secrets** | All API keys stored in `.env` files, never committed to Git |
| **Service Account** | `serviceAccountKey.json` is gitignored and server-only |

---

## 🌐 Deployment

### Frontend (Static Hosting)

**Build for production:**

```bash
cd app
npm run build
```

The optimized output is generated in `app/dist/`. Deploy to any static hosting:

| Platform | Command / Method |
|---|---|
| **Vercel** | `vercel --prod` or connect GitHub repo |
| **Netlify** | Drag & drop `dist/` or connect repo |
| **Firebase Hosting** | `firebase deploy --only hosting` |
| **Cloudflare Pages** | Connect repo → Build command: `npm run build` |

### Backend (Server Hosting)

Deploy the `app/server/` directory to any Node.js hosting:

| Platform | Notes |
|---|---|
| **Railway** | Connect repo, set root to `app/server` |
| **Render** | Set build command: `npm install`, start: `npm start` |
| **Fly.io** | Add `fly.toml`, run `fly deploy` |
| **DigitalOcean App Platform** | Connect repo, configure env vars |
| **AWS EC2 / Lightsail** | Manual setup with PM2 process manager |

### Environment Variables

Set all variables from the [Environment Variables](#-environment-variables) section in your hosting provider's dashboard. Update `CLIENT_URL` to your production frontend URL.

### Firebase Rules Deployment

```bash
firebase deploy --only firestore:rules,database
```

---

## ⚡ Performance Optimizations

| Optimization | Implementation |
|---|---|
| **Vite + ESBuild** | Near-instant HMR and optimized production bundles |
| **Code Splitting** | React Router lazy loading for route-level splitting |
| **Redis Caching** | Presence checks bypass database entirely (RAM-speed) |
| **Binary CRDT Sync** | Yjs updates are compressed binary chunks, not full documents |
| **WebRTC P2P** | Voice data never touches the server — direct peer streams |
| **Image Compression** | Client-side compression before upload via `browser-image-compression` |
| **Virtual Lists** | `react-virtual` for rendering large message histories |
| **Skeleton Loading** | Inline skeleton in `index.html` for instant perceived load |
| **Font Preconnect** | Google Fonts preconnect hints for faster typography loading |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Description |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation change |
| `style:` | Code style (formatting, semicolons) |
| `refactor:` | Code restructure without behavior change |
| `perf:` | Performance improvement |
| `test:` | Adding or updating tests |
| `chore:` | Build process or tooling changes |

### Code Style

- **Linting:** Run `npm run lint` before committing
- **Components:** Use functional components with hooks
- **State:** Use Zustand stores for global state, `useState` for local
- **Naming:** PascalCase for components, camelCase for functions/variables

---

## 🔧 Troubleshooting

<details>
<summary><strong>❌ MongoDB connection refused</strong></summary>

- Verify your `MONGODB_URI` is correct in `app/server/.env`
- Ensure your IP is whitelisted in MongoDB Atlas → Network Access
- Check that the database user has read/write permissions
</details>

<details>
<summary><strong>❌ Firebase Auth errors</strong></summary>

- Confirm `serviceAccountKey.json` is in `app/server/`
- Verify all `VITE_FIREBASE_*` variables match your Firebase project
- Ensure Authentication is enabled in Firebase Console
</details>

<details>
<summary><strong>❌ Socket.IO connection failing</strong></summary>

- Ensure the backend server is running on port 4000
- Check CORS configuration in `app/server/index.js`
- Verify `CLIENT_URL` matches your frontend URL exactly
</details>

<details>
<summary><strong>❌ Redis connection timeout</strong></summary>

- Verify `UPSTASH_REDIS_URL` in the server `.env`
- Ensure the Redis instance is active in the Upstash dashboard
- Check that the URL includes the `rediss://` protocol (with double 's' for TLS)
</details>

<details>
<summary><strong>❌ File uploads not working</strong></summary>

- Verify Supabase URL and anon key in `app/.env`
- Ensure the storage bucket `studix-uploads` exists in Supabase
- Check bucket policies allow public read access
</details>

<details>
<summary><strong>❌ Voice channel no audio</strong></summary>

- WebRTC requires HTTPS in production (localhost is exempt)
- Check browser microphone permissions
- Ensure no firewall is blocking UDP traffic
</details>

---

## 🗺 Roadmap

- [x] Real-time chat with Socket.IO
- [x] Collaborative notes with Yjs + TipTap
- [x] AI Study Buddy integration
- [x] Voice channels via WebRTC
- [x] Presence tracking with Redis
- [x] Task management with Firestore
- [x] File uploads (Supabase Storage)
- [x] Glassmorphic UI with Framer Motion
- [ ] Screen sharing in voice channels
- [ ] End-to-end encryption for messages
- [ ] Mobile-responsive PWA
- [ ] Push notifications
- [ ] Room templates and study schedules
- [ ] Plugin / extension system
- [ ] Video channels (WebRTC + SFU)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Studix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgements

- [React](https://react.dev/) — UI framework
- [Vite](https://vitejs.dev/) — Next-gen build tool
- [Socket.IO](https://socket.io/) — Real-time engine
- [Yjs](https://yjs.dev/) — CRDT framework for collaborative editing
- [TipTap](https://tiptap.dev/) — Headless editor framework
- [Firebase](https://firebase.google.com/) — Auth, Firestore, and Realtime Database
- [MongoDB](https://www.mongodb.com/) — NoSQL database
- [Upstash](https://upstash.com/) — Serverless Redis
- [Supabase](https://supabase.com/) — Open-source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [shadcn/ui](https://ui.shadcn.com/) — Beautifully designed components
- [Zustand](https://zustand.docs.pmnd.rs/) — State management
- [Recharts](https://recharts.org/) — Charting library

---

<p align="center">
  <strong>Built with ❤️ for students, by students.</strong>
</p>

<p align="center">
  <sub>If Studix helped you, consider giving it a ⭐ on GitHub!</sub>
</p>
