import { anilist, MEDIA_FIELDS, mediaToCard, ok } from "../../lib/anilist.js";

export default async function handler(req, res) {
  try {
    const genreRaw = (req.query.genre || "").toString();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    if (!genreRaw) return res.status(400).json({ success: false, error: "genre required" });
    const genre = genreRaw
      .replace(/-/g, " ")
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    const data = await anilist(`
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          pageInfo { lastPage }
          media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
        }
      }
    `, { genre, page });

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    res.status(200).json(ok({
      data: (data.Page?.media || []).map(m => mediaToCard(m)).filter(Boolean),
      totalPage: data.Page?.pageInfo?.lastPage || 1,
    }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
