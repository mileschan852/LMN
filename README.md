# LMN (LetsMeetNow)

Telegram bot backend for **LetsMeetNow** — a straight + lesbian dating Mini App.

## Related Repos

| Repo | Purpose |
|------|---------|
| [`dating-apps-project`](https://github.com/mileschan852/dating-apps-project) | Frontend monorepo (HKMOD + LMN Mini Apps) |
| [`dating-base`](https://github.com/mileschan852/dating-base) | Shared core types and components |
| [`HKMO_D_Bot`](https://github.com/mileschan852/HKMO_D_Bot) | HKMOD bot backend (gay) |

## What This Bot Does

- Serves the LMN Mini App via Telegram WebApp
- Handles user registration and profile setup
- Processes Telegram Stars payments
- Manages raffles and giveaways
- Sends broadcast messages to users
- Admin commands for user management

## Bot Details

| | |
|---|---|
| **Bot** | [@LetsMeetNow_Bot](https://t.me/LetsMeetNow_Bot) |
| **Channel** | [@LetsMeetNowApp](https://t.me/LetsMeetNowApp) |
| **Mini App** | `https://mileschan852.github.io/dating-apps-project/` |
| **Target** | Straight + Lesbian |
| **Brand color** | `#00D4AA` (teal) |

## Tech Stack

- **Runtime:** Node.js + Telegraf.js
- **Payments:** Telegram Stars API
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Cloudflare Workers (webhooks)

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Open Mini App or register |
| `/profile` | Edit your profile |
| `/invisible` | Toggle invisible mode |
| `/raffle` | Buy raffle ticket |
| `/help` | Show help |

## Admin Commands

| Command | Description |
|---------|-------------|
| `/broadcast <msg>` | Send to all users |
| `/stats` | Show user statistics |
| `/ban <user_id>` | Ban a user |
| `/unban <user_id>` | Unban a user |

## Environment Variables

```env
BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
WEBHOOK_URL=https://lmn.mileschan852.workers.dev
ADMIN_IDS=5202742795,725368127
```

## Deploy

```bash
# Set webhook
curl -F "url=https://lmn.mileschan852.workers.dev" \
  https://api.telegram.org/bot<BOT_TOKEN>/setWebhook

# Deploy worker
wrangler deploy
```

## License

Private — for Miles' dating apps only.
