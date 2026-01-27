# IftarInUAE 🌙

A community-driven platform to share and discover Iftar spots in the UAE.

## 🌟 Overview

IftarInUAE is a web application designed to help the community in the UAE find and share recommended spots for Iftar during the holy month of Ramadan. Users can browse trusted locations, view details, and contribute by adding new spots they've discovered.

## ✨ Features

- **📍 Discover Spots**: Interactive list of Iftar locations across the UAE.
- **📝 Share Finds**: Community members can add new places with descriptions and locations.
- **⭐ Reviews & Ratings**: Share your experience and help others find the best spots.
- **🔐 Secure Auth**: Google Authentication via Firebase for a seamless experience.
- **📱 Responsive Design**: Optimized for both mobile and desktop browsing.

## 🛠️ Technology Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth)

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- A running PostgreSQL instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/iftarinuae.git
   cd iftarinuae
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**
   ```bash
   npm run db:push
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5001`.

