import { anilist, ok } from "../../lib/anilist.js";

export default async function handler(req, res) {
  try {
    const idRaw = (req.query.id || "").toString();
    if (!idRaw) return res.status(400).json({ success: false, error: "id required" });
    const numId = parseInt(idRaw.replace(/^anilist-/, "").replace(/[^0-9]/g, ""));
    if (!numId) return res.status(400).json({ success: false, error: "invalid id" });

    const data = await anilist(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id episodes nextAiringEpisode { episode }
          streamingEpisodes { title thumbnail url site }
        }
      }
    `, { id: numId });

    const m = data.Media;
    if (!m) return res.status(404).json({ success: false, error: "not found" });

    const aired = m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes || 0);
    const total = aired || m.episodes || 12;
    const streamMap = new Map();
    for (const s of (m.streamingEpisodes || [])) {
      const match = s.title?.match(/Episode\s+(\d+)/i);
      if (match) streamMap.set(parseInt(match[1]), s);
    }

    const episodes = Array.from({ length: total }, (_, i) => {
      const epNo = i + 1;
      const stream = streamMap.get(epNo);
      return {
        episode_no: epNo,
        id: `anilist-${m.id}?ep=${epNo}`,
        title: stream?.title?.replace(/^Episode\s+\d+\s*-\s*/i, "") || `Episode ${epNo}`,
        japanese_title: undefined,
        filler: false,
      };
    });

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    res.status(200).json(ok({ totalEpisodes: total, episodes }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
