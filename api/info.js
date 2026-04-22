import { anilist, MEDIA_FIELDS, mediaToCard, ok } from "../lib/anilist.js";

export default async function handler(req, res) {
  try {
    const idRaw = (req.query.id || "").toString();
    if (!idRaw) return res.status(400).json({ success: false, error: "id required" });
    const numId = parseInt(idRaw.replace(/^anilist-/, "").replace(/[^0-9]/g, ""));
    if (!numId) return res.status(400).json({ success: false, error: "invalid id" });

    const data = await anilist(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          synonyms
          source
          relations { edges { relationType node { ${MEDIA_FIELDS} } } }
          recommendations(perPage: 12, sort: RATING_DESC) {
            nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
          }
          characters(perPage: 12, sort: ROLE) {
            edges {
              role
              node { id name { full native } image { large } }
              voiceActors(language: JAPANESE) { id name { full native } image { large } }
            }
          }
        }
      }
    `, { id: numId });

    const m = data.Media;
    if (!m) return res.status(404).json({ success: false, error: "not found" });

    const title = m.title?.english || m.title?.romaji || "Unknown";
    const aired = [
      m.startDate?.year ? `${m.startDate.year}-${m.startDate.month || "??"}-${m.startDate.day || "??"}` : null,
      m.endDate?.year ? `${m.endDate.year}-${m.endDate.month || "??"}-${m.endDate.day || "??"}` : null,
    ].filter(Boolean).join(" to ");

    const result = {
      data: {
        adultContent: !!m.isAdult,
        data_id: String(m.id),
        id: `anilist-${m.id}`,
        anilistId: String(m.id),
        malId: m.idMal ? String(m.idMal) : undefined,
        title,
        japanese_title: m.title?.native || undefined,
        synonyms: (m.synonyms || []).join(", "),
        poster: m.coverImage?.extraLarge || m.coverImage?.large || "",
        showType: m.format,
        animeInfo: {
          Overview: (m.description || "").replace(/<[^>]+>/g, "").trim(),
          Japanese: m.title?.native || undefined,
          Synonyms: (m.synonyms || []).join(", "),
          Aired: aired || undefined,
          Premiered: m.season && m.seasonYear ? `${m.season} ${m.seasonYear}` : undefined,
          Duration: m.duration ? `${m.duration}m` : undefined,
          Status: m.status,
          "MAL Score": m.averageScore ? (m.averageScore / 10).toFixed(1) : undefined,
          Genres: m.genres || [],
          Studios: (m.studios?.nodes || []).map(s => s.name).join(", "),
          Producers: [],
          tvInfo: {
            rating: m.isAdult ? "R+" : "PG-13",
            quality: "HD",
            sub: String(m.episodes ?? ""),
            dub: "",
            showType: m.format,
            duration: m.duration ? `${m.duration}m` : undefined,
          },
        },
        charactersVoiceActors: (m.characters?.edges || []).map(e => ({
          character: { id: String(e.node?.id), name: e.node?.name?.full, poster: e.node?.image?.large, cast: e.role },
          voiceActors: (e.voiceActors || []).map(v => ({ id: String(v.id), name: v.name?.full, poster: v.image?.large, cast: "Japanese" })),
        })),
        recommended_data: (m.recommendations?.nodes || [])
          .map(n => mediaToCard(n.mediaRecommendation))
          .filter(Boolean),
        related_data: (m.relations?.edges || [])
          .map(e => mediaToCard(e.node))
          .filter(Boolean),
      },
    };

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
    res.status(200).json(ok(result));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
