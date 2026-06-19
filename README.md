# 🏛️ Gania (by Nditure)

[![License: MIT](https://shields.io)](https://opensource.org)
[![npm version](https://shields.io)](https://npmjs.com)
[![pnpm](https://shields.io)](https://pnpm.io)

**Gania** (derived from the Kĩkũyũ word *Magegania*, meaning "wonders") is a zero-config, type-safe, local-first data synchronization engine. It abstracts away complex offline states by wrapping the tools developers already love.

Instead of forcing you to learn a completely new database language or query syntax, Gania provides a familiar **Axios-like interface** that intercepts network requests automatically.

* **Reads (`GET`)**: Hit the server when online, save results locally, and instantly serve from the browser cache when offline (sub-5ms latency).
* **Writes (`POST/PUT/DELETE`)**: Fail-safe mutations. If a user is offline, updates are captured into an internal transactional queue and smoothly flushed to the server the second connection returns.

---

## 📦 Monorepo Architecture

Gania is built as a single unified repository containing specialized multi-platform packages under the `@nditure` namespace:

```text
gania/
├── packages/
│   ├── gania/           # Core frontend Axios/Fetch wrapper (@nditure/gania)
│   └── gania-express/   # Plug-and-play Express sync middleware (@nditure/gania-express)
```

---

## 🚀 Quick Start

### 1. Frontend Installation

Install the core client library directly into your frontend project:

```bash
pnpm add @nditure/gania axios
```

### 2. Frontend Usage

Write standard HTTP network calls exactly like you normally would. Gania handles all underlying cache checks and offline queue states silently.

```typescript
import { ganiaFetch } from '@nditure/gania';

interface Todo {
  id: string;
  task: string;
}

// 📥 Read Operation: Automatically uses local IndexedDB when offline
async function loadDashboard() {
  try {
    const response = await ganiaFetch.get<Todo[]>('/api/todos');
    console.log(`Loaded entries. From local cache: ${response.fromCache}`);
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}

// 📤 Write Operation: Instantly stores payload locally if internet drops
async function createTodo() {
  const response = await ganiaFetch.post('/api/todos', { 
    task: 'Build software libraries in founder mode' 
  });
  
  if (response.queuedOffline) {
    console.log("Device is offline! Changes stashed safely in background queue.");
  }
}
```

### 3. Backend Installation (Node/Express)

Install the server companion piece to intercept background sync requests:

```bash
pnpm add @nditure/gania-express
```

```typescript
import express from 'express';
import { ganiaSyncer } from '@nditure/gania-express';

const app = express();
app.use(express.json());

// Register the synchronization bridge middleware
app.use(ganiaSyncer({
  endpoint: '/_gania_sync',
  rules: {
    '/api/todos': {
      allow: (req) => !!req.user, // Add your authentication rules
      onSync: async (payload) => {
        // Run database operations here via Prisma / Mongoose / SQL
      }
    }
  }
}));
```

---

## 🛠️ Development & Contributing

This project is configured as a highly optimized monorepo managed with `pnpm`.

### Local Setup

```bash
# Clone the repository from the Nditure organization
git clone https://github.com/nditure/gania
cd gania

# Install all development dependencies globally
pnpm install

# Compile all typescript workspaces simultaneously 
pnpm run build
```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

Built with ⚡ by **Jeremiah Ndiritu** under [Nditure Labs](https://github.com/nditure).
