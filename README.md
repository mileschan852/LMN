# LMN — Let's Meet Now Dating App

Telegram Mini App for straight and lesbian dating. Teal brand (`#00D4AA`).

## What This Repo Is

This is the **LMN frontend app** — a standalone Vite + React project that imports shared packages from npm.

```
LMN/
├── src/
│   ├── App.tsx          ← Main app (uses hooks & components from @dating/core, @dating/ui)
│   ├── lib/
│   │   ├── i18n.ts      ← LMN-specific translations (en/tc/sc/ru)
│   │   ├── supabase.ts  ← Thin wrapper: binds TABLE='lmn_users' to @dating/core functions
│   │   └── utils.ts     ← LMN-specific helpers
│   ├── assets/          ← Logo, photos
│   └── ...
├── package.json         ← @dating/core ^1.0.0, @dating/ui ^1.0.0
├── vite.config.ts       ← base: '/LMN/'
└── .github/workflows/
    └── deploy.yml       → Deploys to mileschan852.github.io/LMN/
```

## Architecture

This app consumes shared packages. It does NOT contain core logic locally.

```
┌─────────────────┐
│  LMN App        │  ← This repo
│  (src/App.tsx)  │
└────────┬────────┘
         │ imports
    ┌────┴────┐
    ▼         ▼
@dating/core  @dating/ui  ← npm packages (published from dating-apps-project monorepo)
    │
    └── Types, hooks, i18n, Supabase, storage, payments
    └── BottomNav, ProfileGrid, StatsBar, TopBar, etc.
```

**@dating/core is a black box** — this repo cannot modify it. Core updates come via `npm update`.

## Shared Packages

| Package | Contents | Docs |
|---------|----------|------|
| `@dating/core` | Hooks, types, i18n, Supabase client, storage | [dating-apps-project](https://github.com/mileschan852/dating-apps-project) |
| `@dating/ui` | React components (BottomNav, ProfileGrid, etc.) | [dating-apps-project](https://github.com/mileschan852/dating-apps-project) |

## LMN-Specific Code

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app — branding, profile fields (gender, height, weight, seeking), grid, filters |
| `src/lib/i18n.ts` | Translations for LMN-specific terms |
| `src/lib/supabase.ts` | Binds `TABLE='lmn_users'` to @dating/core Supabase functions |
| `src/lib/utils.ts` | App-specific helpers |

## Quick Start

```bash
npm install       # Installs @dating/core, @dating/ui from npm
npm run dev       # Vite dev server on :3001
npm run build     # Production build → dist/
```

## Local Development with Unpublished Core

If you're working on `@dating/core` locally and need to test changes in this app:

```bash
# In the dating-apps-project monorepo
cd packages/@dating/core
npm link

# In this repo
npm link @dating/core
npm run dev
```

## Deployment

Push to `main` → GitHub Action deploys to:

```
https://mileschan852.github.io/LMN/
```

### Bot Configuration

In [@BotFather](https://t.me/BotFather), set the Mini App URL to:

```
https://mileschan852.github.io/LMN/
```

### Required Secrets (GitHub)

| Secret | Purpose |
|--------|---------|
| (none) | The Supabase URL/key is baked into @dating/core |

## Related Repos

| Repo | Purpose |
|------|---------|
| [`dating-apps-project`](https://github.com/mileschan852/dating-apps-project) | Shared packages (@dating/core, @dating/ui) + app template |
| [`HKMO_D_Bot`](https://github.com/mileschan852/HKMO_D_Bot) | Sister app — HKMOD (gay men dating) |

## License

Private — LMN only.
