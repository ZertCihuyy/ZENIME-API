// AniList GraphQL helper
const ANILIST_URL = "https://graphql.anilist.co";

export async function anilist(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "AniList error");
  return json.data;
}

// Common media fragment
export const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native userPreferred }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  episodes
  duration
  status
  format
  genres
  averageScore
  popularity
  favourites
  trending
  season
  seasonYear
  isAdult
  startDate { year month day }
  endDate { year month day }
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
`;

// Map AniList media → AnimeCard (matches hd1server shape)
export function mediaToCard(m, rank) {
  if (!m) return null;
  const title = m.title?.english || m.title?.romaji || m.title?.userPreferred || "Unknown";
  return {
    id: `anilist-${m.id}`,
    title,
    japanese_title: m.title?.native || undefined,
    poster: m.coverImage?.extraLarge || m.coverImage?.large || "",
    duration: m.duration ? `${m.duration}m` : undefined,
    rank: rank || undefined,
    tvInfo: {
      showType: m.format || undefined,
      rating: m.isAdult ? "R+" : null,
      quality: "HD",
      sub: m.episodes ?? null,
      dub: null,
      eps: m.episodes ?? null,
    },
  };
}

// Map AniList media → SpotlightAnime
export function mediaToSpotlight(m, rank) {
  if (!m) return null;
  const title = m.title?.english || m.title?.romaji || m.title?.userPreferred || "Unknown";
  // Strip HTML from description
  const desc = (m.description || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    id: `anilist-${m.id}`,
    title,
    japanese_title: m.title?.native || undefined,
    poster: m.coverImage?.extraLarge || m.coverImage?.large || "",
    banner: m.bannerImage || m.coverImage?.extraLarge || "",
    titleLogo: undefined, // filled in by TMDB layer if available
    description: desc || undefined,
    rank: rank || undefined,
    tvInfo: {
      showType: m.format || undefined,
      sub: m.episodes ?? null,
      dub: null,
      eps: m.episodes ?? null,
      quality: "HD",
      duration: m.duration ? `${m.duration}m` : undefined,
    },
    anilistMeta: {
      season: m.season || null,
      seasonYear: m.seasonYear || null,
      status: m.status,
      episodes: m.episodes ?? null,
      duration: m.duration ?? null,
      format: m.format || null,
    },
  };
}

export function ok(data) {
  return { success: true, results: data };
}
