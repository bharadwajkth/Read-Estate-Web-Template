# Real Estate Agency Showcase & Management Template

A secure-by-default, full-stack web application and property management dashboard pre-configured with generic template defaults (**Meridian Industrial Realty**) so any real estate agency can adapt and deploy it cleanly.

## Key Capabilities

- **Public Property Portfolio**: Searchable and filterable catalog of warehouses, industrial plots, factory sheds, and commercial spaces with INR formatting (`L` / `Cr`), technical specifications, and site inspection booking.
- **Authenticated Agent Dashboard (`/admin`)**:
  - Salted `scrypt` password hashing and `HttpOnly` HMAC-SHA256 signed session cookies.
  - Full property CRUD (create, edit, quick status updates, delete confirmation).
  - Client inquiry pipeline with status tracking and internal broker notes.
  - Live **Template & Security** console to update agency branding, corridors, and verify `.gitignore` hygiene.

## Template & Security Setup

1. Copy `.env.example` to `.env` (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
2. Generate a strong `SESSION_SECRET` and set an initial admin password:
   ```bash
   openssl rand -hex 32
   ```
3. Keep sensitive data out of Git: `.gitignore` automatically excludes `.env*` (except `.env.example`), `data/`, `*.db`, `*.sqlite`, and `uploads/`.
4. Start the full-stack development server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   npm start
   ```
