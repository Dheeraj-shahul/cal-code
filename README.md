# Cal-Clone

A full-stack scheduling and booking platform inspired by Cal.com. This application allows users to define meeting templates (Event Types), manage their availability, and handle public booking requests with built-in concurrency protection.

## Technical Stack

- **Frontend**: React (Vite), date-fns, Lucide React
- **Backend**: Node.js, Express.js, Prisma ORM
- **Database**: PostgreSQL (Hosted on Neon)
- **Styling**: Vanilla CSS (Custom design system)

## Core Features

- **Event Management**: Create, edit, and delete event types with custom durations and unique URL slugs.
- **Availability Engine**: Weekly schedule management with support for multiple time intervals per day.
- **Date Overrides**: Ability to block specific dates or set custom hours for one-off events.
- **Booking Flow**: Multi-step public booking process with real-time slot calculation.
- **Rescheduling**: Secure rescheduling flow for existing bookings via unique identifiers.
- **Dashboard**: Centralized view for upcoming, past, and cancelled meetings.

## Backend Implementation Details

### Concurrency & Data Integrity
To prevent double-bookings under high concurrent load, the system implements a two-layer defense:
1. **Pessimistic Locking**: Uses `SELECT ... FOR UPDATE` on the EventType row during the transaction to serialize booking attempts for the same meeting type.
2. **Database Constraints**: A partial unique index is enforced on `(eventTypeId, startTime)` for all non-cancelled bookings.

### Timezone Handling
All timestamps are stored in the database as UTC. The frontend dynamically converts these to the visitor's local timezone using the browser's `Intl` API and `date-fns-tz`.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL instance

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dheeraj-shahul/cal-code.git
   cd cal-code
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   # Create a .env file with your DATABASE_URL
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

## Assumptions & Assumptions
- **Authentication**: For the purpose of this assignment, a default admin user is pre-seeded. Authentication logic has been bypassed to allow immediate access to the dashboard.
- **Slot Calculation**: Slots are generated dynamically based on the intersection of the host's availability, existing bookings, and date overrides.
