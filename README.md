# Engineering Exploration Project Voting App

React + Vite voting application with Supabase (PostgreSQL) backend.

## Features

- **5-star voting** for student project booths
- **QR code flow**: booth QR links to `/vote?group=team-slug`
- **Email sign-in** restricted to `@mymail.nyp.edu.sg` and `@nyp.edu.sg`
- **3 votes per voter** (same group or different groups)
- **IP address** recorded on sign-in and each vote
- **Device fingerprint** blocks the same phone/device from voting again with a different email
- **Leaderboard** at `/results` showing top 20 teams (auto-refreshes every 15s)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the full script in [`supabase/schema.sql`](supabase/schema.sql)
3. Copy your project URL and anon key from **Settings → API**

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Routes

| Route | Purpose |
|-------|---------|
| `/` or `/vote` | Voting page (requires sign-in) |
| `/vote?group=team-alpha` | Vote for a specific team (from QR scan) |
| `/login` | NYP email sign-in |
| `/results` | Top 20 teams leaderboard |

## Adding teams / booth QR codes

Insert teams in Supabase **Table Editor → groups** or via SQL:

```sql
INSERT INTO groups (name, slug, booth_number)
VALUES ('Team Delta', 'team-delta', 'C1');
```

Generate a QR code pointing to:

```
https://YOUR-DEPLOYED-URL/vote?group=team-delta
```

Use any free QR generator (e.g. qr-code-generator.com).

## Anti-fraud

| Check | How |
|-------|-----|
| Email domain | Only NYP emails accepted |
| 3 votes per email | Enforced in `submit_vote` RPC |
| 3 votes per device | Device fingerprint stored; new emails blocked once device used 3 votes |
| IP logging | Recorded on sign-in and each vote |

> **Note:** Device fingerprinting reduces same-phone / multi-email abuse but is not foolproof. For stronger protection, consider Supabase Auth with email OTP verification.

## Deploy

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static host. Set the same `VITE_*` env vars in your host.

## Tech stack

- React 19 + TypeScript + Vite
- React Router
- Supabase (PostgreSQL + RPC functions + RLS)
