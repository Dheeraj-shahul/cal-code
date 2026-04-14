# CalClone — Scheduling Platform

A full-stack scheduling/booking web application built as a Cal.com clone. Users can create event types, set availability, and share a public booking page where others can book time slots.

## 🚀 Live Demo
- **Frontend**: _Coming soon (Vercel)_
- **Backend API**: _Coming soon (Render)_

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (via Neon.tech) |
| ORM | Prisma |
| Styling | Vanilla CSS |

## ✨ Features
- **Event Types** — Create, edit, delete; each has a unique public booking URL
- **Availability Settings** — Set weekday hours and timezone
- **Public Booking Page** — Calendar date picker → available time slots → booking form
- **Double-booking Prevention** — Enforced at DB query level before insert
- **Bookings Dashboard** — Upcoming / Past / Cancelled tabs with cancel action
- **Seed Data** — Pre-seeded default user, 3 event types, sample bookings

## 📦 Local Setup

### Prerequisites
- Node.js ≥ 18
- A PostgreSQL database (free: [neon.tech](https://neon.tech))

### 1. Clone the repository
```bash
git clone https://github.com/Dheeraj-shahul/cal-code.git
cd cal-code
```

### 2. Set up the backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your DATABASE_URL from Neon.tech
```

### 3. Run database migrations and seed
```bash
npx prisma migrate dev --name init
npm run seed
```

### 4. Start the backend server
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 5. Set up and start the frontend
```bash
cd ../client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## 🔑 Environment Variables

### `server/.env`
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
PORT=5000
CLIENT_URL=http://localhost:5173
```

### `client/.env` (only needed for production)
```
VITE_API_URL=https://your-render-backend-url.onrender.com/api
```

## 📝 Assumptions
- A single default user (`admin@calclone.com`) is pre-seeded — no authentication required
- The admin side (dashboard, event types, availability, bookings) assumes this user is logged in
- The public booking page (`/book/:slug`) is accessible without login
- All booking times are stored as UTC in the database

## 🗃️ Database Schema
```
User → EventType (one-to-many)
User → Availability (one-to-one)
Availability → AvailabilitySlot (one-to-many, weekly schedule)
EventType → Booking (one-to-many)
```
