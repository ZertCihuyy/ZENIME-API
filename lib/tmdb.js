// Optional TMDB enrichment for title logos
const TMDB_KEY = process.env.TMDB_API_KEY;

const logoCache = new Map();

export async function getTitleLogo(title, year) {
  if (!TMDB_KEY) return null;
  const cacheKey = `${title}::${year || ""}`;
  if (logoCache.has(cacheKey)) return logoCache.get(cacheKey);

  try {
    // Search TV first, then movie
    const search = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&include_adult=false`
    ).then(r => r.json());

    const hit = (search.results || []).find(
      r => (r.media_type === "tv" || r.media_type === "movie") && r.poster_path
    );
    if (!hit) { logoCache.set(cacheKey, null); return null; }

    const imgRes = await fetch(
      `https://api.themoviedb.org/3/${hit.media_type}/${hit.id}/images?api_key=${TMDB_KEY}&include_image_language=en,null`
    ).then(r => r.json());

    const logo = (imgRes.logos || []).find(l => l.iso_639_1 === "en") || (imgRes.logos || [])[0];
    const url = logo ? `https://image.tmdb.org/t/p/original${logo.file_path}` : null;
    logoCache.set(cacheKey, url);
    return url;
  } catch {
    logoCache.set(cacheKey, null);
    return null;
  }
}
