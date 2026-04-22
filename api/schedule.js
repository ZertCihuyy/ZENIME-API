import { anilist, ok } from "../lib/anilist.js";

export default async function handler(req, res) {
  try {
    const dateStr = (req.query.date || "").toString(); // YYYY-MM-DD
    if (!dateStr) return res.status(400).json({ success: false, error: "date required" });
    const d = new Date(dateStr + "T00:00:00Z");
    if (isNaN(d)) return res.status(400).json({ success: false, error: "invalid date" });
    const start = Math.floor(d.getTime() / 1000);
    const end = start + 86400;

    const data = await anilist(`
      query ($start: Int, $end: Int) {
        Page(perPage: 50) {
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            episode airingAt
            media {
              id idMal
              title { romaji english native }
              format episodes
            }
          }
        }
      }
    `, { start, end });

    const items = (data.Page?.airingSchedules || []).map(s => {
      const m = s.media || {};
      const title = m.title?.english || m.title?.romaji || "Unknown";
      const time = new Date(s.airingAt * 1000).toISOString().substring(11, 16); // HH:MM UTC
      return {
        id: `anilist-${m.id}`,
        data_id: m.id,
        title,
        japanese_title: m.title?.native || undefined,
        releaseDate: dateStr,
        time,
        episode_no: s.episode,
        tvInfo: {
          showType: m.format || undefined,
          sub: s.episode,
          dub: null,
          eps: m.episodes ?? null,
        },
      };
    });

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    res.status(200).json(ok(items));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
