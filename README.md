# Z-Anime API 🎌

Standalone, drop-in replacement for the `aniwatchtv.to` scraper used by Z-Anime.
Powered by **AniList GraphQL** (free, official, 90 req/min) and optionally enriched
with **TMDB** for spotlight title logos.

Returns the **exact same JSON shape** as `hd1server.vercel.app/api`, so it works
seamlessly with the existing `src/lib/api.ts` in your Z-Anime project — just
swap the `BASE_URL`.

---

## ✨ Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api` | Full home bundle (spotlights, trending, top10, schedule, latest eps, etc.) |
| `GET /api/search?keyword=naruto&page=1` | Search results |
| `GET /api/info?id=anilist-21` | Anime details + recommendations + characters |
| `GET /api/episodes/anilist-21` | Episode list (synthetic, compatible with JustAnime/Pahe) |
| `GET /api/genre/action?page=1` | Browse by genre |
| `GET /api/schedule?date=2025-04-21` | Airing schedule for a date (UTC) |

All responses follow `{ success: true, results: ... }` shape.

---

## 🚀 Deploy to Vercel

### Option 1 — One-click via Vercel CLI
```bash
npm i -g vercel
cd zanime-api
vercel
vercel --prod
```

### Option 2 — Push to GitHub + Import on vercel.com
1. Create a new GitHub repo, push this folder
2. Go to https://vercel.com/new → import the repo
3. (Optional) Add env var `TMDB_API_KEY` for spotlight logos
4. Deploy

---

## 🔑 Environment Variables

| Variable | Required? | Purpose |
|---|---|---|
| `TMDB_API_KEY` | ❌ Optional | Enables transparent PNG title logos on spotlights. Get a free key at https://www.themoviedb.org/settings/api |

---

## 🔌 Wire it into Z-Anime

In your Z-Anime project, edit `src/lib/api.ts`:

```ts
// Before
const BASE_URL = _r(["aHR0cHM6Ly9oZDFz", "ZXJ2ZXIudmVyY2Vs", "LmFwcC9hcGk="]);

// After (your new Vercel URL)
const BASE_URL = "https://your-zanime-api.vercel.app/api";
```

That's it. Zero UI changes needed — every page, card, and section keeps working.

---

## 🧪 Local development

```bash
npm i -g vercel
vercel dev
# → http://localhost:3000/api
```

---

## 📊 What you gain vs the aniwatchtv.to scraper

✅ **Reliability** — official APIs, no Cloudflare 521s
✅ **Speed** — 1 batched GraphQL query for the whole home page
✅ **Accuracy** — official scores, banners, metadata
✅ **Real-time** — `latestEpisode` uses AniList's AiringSchedule (more accurate than scraped HTML)
✅ **Zero maintenance** — no scraper to fix when sites change their HTML

⚠️ **Tradeoffs**
- `tvInfo.dub` is always `null` (AniList has no dub data — your stream providers handle this)
- `tvInfo.quality` always `"HD"` (every modern stream is HD)
- `tvInfo.rating` derived from AniList `isAdult` (PG-13 / R+)
- Title logos require `TMDB_API_KEY` (optional)

---

## 📁 Project structure

```
zanime-api/
├── api/
│   ├── index.js              # GET /api  (home bundle)
│   ├── search.js             # GET /api/search
│   ├── info.js               # GET /api/info
│   ├── schedule.js           # GET /api/schedule
│   ├── episodes/[id].js      # GET /api/episodes/:id
│   └── genre/[genre].js      # GET /api/genre/:genre
├── lib/
│   ├── anilist.js            # GraphQL helper + shape mappers
│   └── tmdb.js               # Optional logo enrichment
├── package.json
├── vercel.json               # CORS + caching headers
└── .env.example
```

---

## 📜 License

MIT — do whatever you want.
# ZENIME-API
