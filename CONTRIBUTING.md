# Contributing to IftarInUAE 🌙

Thank you for your interest in contributing! This guide will help you get started quickly.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

### Prerequisites

- **Node.js** v20+
- **PostgreSQL** database (or a [Neon](https://neon.tech) serverless instance)
- **Firebase** project with Auth enabled
- **Git**

### Local Setup

1. **Fork & clone** the repository:
   ```bash
   git clone https://github.com/adilzubair/iftarinuae.git
   cd iftarinuae
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in your own values for all variables in `.env`. See `.env.example` for descriptions.

4. **Push the database schema:**
   ```bash
   npm run db:push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5001`.

---

## Project Structure

```
iftarinuae/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route-level page components
│       └── lib/          # Utilities and helpers
├── server/          # Express backend
│   ├── app.ts            # Express app setup (middleware, CORS, Helmet)
│   ├── routes.ts         # API route definitions
│   └── db.ts             # Drizzle ORM database connection
├── shared/          # Types and schemas shared between client & server
├── scripts/         # Utility/admin scripts (not committed to git)
├── .env.example     # Environment variable template
└── DEPLOYMENT.md    # Deployment instructions
```

---

## Development Workflow

1. **Create a branch** off `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use prefixes like `feature/`, `fix/`, or `chore/`.

2. **Make your changes** — keep them focused on a single concern per branch.

3. **Type-check** before committing:
   ```bash
   npm run check
   ```

4. **Commit** your changes following the [commit guidelines](#commit-guidelines) below.

5. **Push** your branch and open a Pull Request.

---

## Commit Guidelines

Use clear, descriptive commit messages in the imperative mood:

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Tooling, config, or dependency updates |
| `refactor:` | Code restructuring without behaviour change |
| `docs:` | Documentation only |
| `style:` | Formatting, whitespace |

**Examples:**
```
feat: add map picker to submission form
fix: resolve duplicate spot entries on refresh
docs: update CONTRIBUTING with project structure
```

---

## Pull Request Process

1. Ensure `npm run check` passes with no TypeScript errors.
2. Write a clear PR description explaining **what** changed and **why**.
3. Reference any related issues (e.g. `Closes #12`).
4. Request a review from a maintainer.
5. PRs are merged into `master` after approval.

---

## Code Style

- **TypeScript** is used throughout — avoid `any` types where possible.
- **React components** live in `client/src/components/` and follow PascalCase naming.
- **API routes** are defined in `server/routes.ts` — keep handlers thin and move logic to helper functions.
- **Shared types/schemas** (Zod + Drizzle) go in `shared/` so both client and server can import them.
- Use **Tailwind CSS** utility classes for styling; avoid inline styles.

---

## Reporting Issues

Found a bug or have a feature request?

1. Check if it's already been [reported](https://github.com/adilzubair/iftarinuae/issues).
2. If not, open a new issue with:
   - A clear title
   - Steps to reproduce (for bugs)
   - Expected vs. actual behaviour
   - Screenshots if relevant

---

> **Note:** Never commit your `.env` file. It is gitignored. Use `.env.example` as a template.
