# MentorLagbe

**Smart Tuition & Mentorship Platform** — a role-based EdTech web app that connects verified tutors with students. Tutors post tuition batches, admins moderate listings, and students search, bookmark and apply for tuitions — with Stripe Pro subscriptions on top.

> Client (Next.js) repository. The Express + MongoDB + BetterAuth API lives in the companion `server/` repo.

## Live URL

<!-- Fill in after deploying -->
- **Live site:** `https://your-live-domain.vercel.app`
- **Client repo:** `https://github.com/your-username/mentorlagbe-client`
- **Server repo:** `https://github.com/your-username/mentorlagbe-server`

## Admin Credentials

<!-- Fill in after seeding production data -->
| Role  | Email               | Password    |
| ----- | ------------------- | ----------- |
| Admin | `admin@mentorlagbe.com` | `••••••••` |
| Tutor (demo) | `tutor@mentorlagbe.com` | `••••••••` |
| Student (demo) | `student@mentorlagbe.com` | `••••••••` |

## Purpose

Finding a verified tutor by subject, class level, mode (Online/Offline) and budget is painful in Bangladesh and beyond — while skilled tutors have no structured place to showcase batches and manage enrollments. MentorLagbe solves both sides in one ecosystem:

- **Students** search approved tuitions, save favorites, apply, and track application status.
- **Tutors** post tuition batches (ImgBB banner upload), manage applicants, and edit/delete listings.
- **Admins** approve or reject tuition posts, manage user roles, and track Stripe revenue.
- Everyone can upgrade to a **Pro plan** via Stripe Checkout ($15 tutor / $10 student).

## Key Features

### Public site
- Landing page: hero, 6 latest approved tuitions, pricing preview, how-it-works workflow, platform stats & testimonials — with scroll-reveal animations
- **Browse tuitions** with *server-side* search, subject / class-level / mode filters and pagination (Challenge 1)
- Tuition details page with role-restricted **Apply** form (students only, duplicate protection)
- Pricing page with Stripe Checkout for Free → Pro upgrades
- Sign up / sign in with role selection, form validation and toast feedback (BetterAuth)
- Navbar states for auth / unauth users (avatar, role badge, dashboard & sign-out), footer with the new **X logo**
- Dark / light **theme toggle** (no-flash inline script)
- Custom 404, error boundaries, and skeleton loading states on every route
- SEO: metadata, `robots.txt`, dynamic `sitemap.xml`, skip-to-content link

### Role-based dashboards (`/dashboard/...`)
| Student | Tutor | Admin |
| --- | --- | --- |
| Overview stats cards | Overview stats cards | Overview stats cards |
| My Applications (cancel pending) | Post a Tuition (ImgBB upload, free-plan limit of 2) | User management (role switching) |
| Saved Tuitions (bookmarks) | My Tuitions (edit, delete, active toggle) | Tuition approval flow (approve/reject) |
| Profile update (ImgBB upload) | Manage Applicants (accept/reject) | Stripe transactions table |

- Collapsible sidebar + responsive topbar, auth guard that keeps logged-in users on private routes across reloads
- Profile page for all roles: name, phone, bio, avatar upload via **ImgBB** (Challenge 3)
- Toast notifications (sonner) on every CRUD action, login/logout and error

### Engineering
- **JWT on every protected call (Challenge 2):** the client fetches a JWT from BetterAuth's `GET /token`, stores it, and sends `Authorization: Bearer …` through a shared `apiFetch` helper; the Express API enforces `verifyToken / verifyStudent / verifyTutor / verifyAdmin`
- Server Components with partial prerendering (Next.js 16 App Router, `cacheComponents`)
- Server-side data fetching for tuitions — filters hit the URL query string, so results are SEO-friendly and cacheable
- Responsive for mobile / tablet / desktop; `prefers-reduced-motion` respected

## Tech Stack & NPM Packages

**Runtime dependencies**

| Package | Version | Why |
| --- | --- | --- |
| `next` | 16.4.6 | App Router, Server Components, partial prerender |
| `react` / `react-dom` | 19.3.0 | UI runtime (React Compiler enabled) |
| `daisyui` | ^5.8.1 | Tailwind CSS component themes (custom `mentor` / `mentordark` themes) |
| `better-auth` | ^1.7.25 | Email/password auth + JWT token endpoint |
| `sonner` | ^2.0.8 | Toast notifications |
| `lucide-react` | ^1.75.0 | Icon set |

**Dev dependencies:** `tailwindcss` + `@tailwindcss/turbopack` (v4), `eslint` + `eslint-config-next`, `babel-plugin-react-compiler`

**External services:** Stripe Checkout (payments), ImgBB (image uploads), MongoDB (via Express API)

## Getting Started

```bash
# 1. Install
npm install

# 2. Configure frontend env keys
cp .env.example .env.local
#    NEXT_PUBLIC_API_URL        -> Express API base URL
#    NEXT_PUBLIC_BETTER_AUTH_URL-> BetterAuth endpoint on the API
#    NEXT_PUBLIC_IMGBB_API_KEY  -> https://api.imgbb.com
#    NEXT_PUBLIC_SITE_URL       -> deployed site URL

# 3. Run
npm run dev     # http://localhost:3000
npm run build   # production build
npx eslint src  # lint
```

> Backend secrets (MongoDB URI, JWT secret, Stripe keys, ImgBB key server-side) belong in the server's `.env`, never in this repo.

## Project Structure

```
src/
├── app/
│   ├── (marketing)/        # public pages: home, tuitions, pricing, auth, payment
│   ├── dashboard/          # guarded shell + student / tutor / admin routes
│   ├── layout.js           # root layout, fonts, providers, Toaster
│   ├── robots.js / sitemap.js
├── components/             # Navbar, Footer, TuitionCard, Skeletons, dashboard UI…
├── lib/                    # api (JWT fetch), authClient, constants, payload helpers
└── providers/              # AuthProvider, ThemeProvider
```

## Assignment

The original assignment brief (requirements, data design, challenges) is archived in [`docs/assignment-spec.md`](docs/assignment-spec.md).
