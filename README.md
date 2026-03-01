# TimerDeep

A data-brutalist, local-first time-tracking application designed for high-performance "Deep Work" monitoring. TimerDeep uses a tactical terminal aesthetic to provide clear, zero-distraction feedback on your daily time distribution.

## Key Features

- **Tactical HUD:** A high-contrast terminal interface featuring a monospace grid, crosshairs, and real-time technical readouts (`MEM`, `VOLT`, `SYS`, `NET`) for a deep-system feel.
- **Vertical Time Collector (The Tank):** A vertical stacked bar chart that visually fills as you accumulate minutes in a 24-hour cycle.
- **3-Mode Time Machine:** A unified toggle for `DEEP_WORK`, `OFFICE`, and `FREE_TIME`. Time ticks by default as "Waste" unless a work mode is explicitly active.
- **Local-First Sync:** Built with **Dexie.js** for full offline capability. Data automatically syncs to a MongoDB cloud instance when connectivity is restored.
- **Horizontal Battery Dashboard:** A comprehensive 24-hour horizontal proportion bar showing productivity vs. idle distribution at a glance.
- **System Log:** A linear command-style feed of all state transitions and historical time logs.

## Tech Stack

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite + Bun
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Local Database:** Dexie.js (IndexedDB)
- **Icons:** Lucide React

### Backend
- **Runtime:** Bun
- **Framework:** Express 5
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT + Bcryptjs

---

## Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js 20+
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/timerDeep.git
cd timerDeep
```

### 2. Backend Setup
```bash
cd backend
bun install
cp .env.example .env
```
*Configure `MONGO_URI` and `JWT_SECRET` in `.env`.*

Start the backend:
```bash
bun dev
```

### 3. Frontend Setup
```bash
cd ../frontend
bun install
cp .env.example .env
```
*Set `VITE_API_URL` to your backend address (e.g., `http://localhost:5000/api`).*

Start the frontend:
```bash
bun dev
```

---

## Architecture Overview

### Data Flow
TimerDeep follows a **Local-First** synchronization pattern:
1. **Local Capture:** All timer logs are stored immediately in the browser's IndexedDB via **Dexie.js**.
2. **Background Sync:** The `useSync` hook monitors network status and background-syncs unsynced logs to the Express API every 2 minutes.
3. **Cloud Persistence:** The backend stores logs in **MongoDB** for cross-device availability.

### Directory Structure
```
├── root
│   ├── backend/          # Express API (Bun)
│   │   ├── src/
│   │   │   ├── models/   # Mongoose Schemas
│   │   │   ├── routes/   # Auth & Log endpoints
│   │   │   └── index.ts  # Entry point
│   ├── frontend/         # React Application (Vite)
│   │   ├── src/
│   │   │   ├── components/ # Tactical UI components (Tank, Controls, Battery)
│   │   │   ├── db/         # Dexie configuration
│   │   │   ├── hooks/      # useSync, useWakeLock
│   │   │   ├── store/      # Zustand store
│   │   │   └── App.tsx     # Main HUD & View routing
```

---

## Environment Variables

### Backend (`/backend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/timerdeep` |
| `JWT_SECRET` | Secret for token signing | `your_secret_key` |

### Frontend (`/frontend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API Endpoint | `http://localhost:5000/api` |

---

## Available Scripts

**In `/backend`:**
- `bun dev`: Start development server with watch mode.
- `bun start`: Start production server.

**In `/frontend`:**
- `bun dev`: Start Vite development server.
- `bun build`: Build for production.
- `bun preview`: Preview production build locally.

---

## Troubleshooting

### Sync Issues
- Ensure `VITE_API_URL` in the frontend matches the actual backend address.
- TimerDeep attempts to sync every 2 minutes or upon coming back online. Check the `OFFLINE_MODE` indicator in the header.

### Dock Mode
- Dock mode uses the Screen Wake Lock API to prevent the screen from dimming. Ensure your browser supports this feature if using a mobile device as a continuous HUD.
