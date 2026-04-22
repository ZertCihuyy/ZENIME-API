import { anilist, MEDIA_FIELDS, mediaToCard, ok } from "../lib/anilist.js";

export default async function handler(req, res) {
  try {
    const keyword = (req.query.keyword || "").toString().trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    if (!keyword) return res.status(400).json({ success: false, error: "keyword required" });

    const data = await anilist(`
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          pageInfo { total lastPage hasNextPage }
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
        }
      }
    `, { search: keyword, page });

    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    res.status(200).json(ok({
      data: (data.Page?.media || []).map(m => mediaToCard(m)).filter(Boolean),
      totalPage: data.Page?.pageInfo?.lastPage || 1,
    }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
