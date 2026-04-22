import { anilist, MEDIA_FIELDS, mediaToCard, mediaToSpotlight, ok } from "../lib/anilist.js";
import { getTitleLogo } from "../lib/tmdb.js";

// Helper: page-of-media query
const PAGE_QUERY = (sortAndFilter) => `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(${sortAndFilter}, type: ANIME) { ${MEDIA_FIELDS} }
    }
  }
`;

const SCHEDULE_QUERY = `
  query ($start: Int, $end: Int, $perPage: Int) {
    Page(perPage: $perPage) {
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME_DESC) {
        episode airingAt
        media { ${MEDIA_FIELDS} }
      }
    }
  }
`;

const GENRE_QUERY = `query { GenreCollection }`;

export default async function handler(req, res) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const dayAhead = now + 86400;

    // Fire all queries in parallel — AniList allows 90 req/min, this uses ~13
    const [
      spotlightsR, trendingR, topTodayR, topWeekR, topMonthR,
      topAiringR, mostPopularR, mostFavoriteR, latestCompletedR,
      topUpcomingR, recentlyAddedR, latestEpsR, todayScheduleR, genresR
    ] = await Promise.all([
      anilist(PAGE_QUERY("sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]"), { page: 1, perPage: 10 }),
      anilist(PAGE_QUERY("sort: TRENDING_DESC"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: TRENDING_DESC"), { page: 1, perPage: 10 }),
      anilist(PAGE_QUERY("sort: POPULARITY_DESC, status: RELEASING"), { page: 1, perPage: 10 }),
      anilist(PAGE_QUERY("sort: FAVOURITES_DESC"), { page: 1, perPage: 10 }),
      anilist(PAGE_QUERY("sort: POPULARITY_DESC, status: RELEASING"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: POPULARITY_DESC"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: FAVOURITES_DESC"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: END_DATE_DESC, status: FINISHED"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: POPULARITY_DESC, status: NOT_YET_RELEASED"), { page: 1, perPage: 24 }),
      anilist(PAGE_QUERY("sort: ID_DESC"), { page: 1, perPage: 24 }),
      anilist(SCHEDULE_QUERY, { start: dayAgo, end: now, perPage: 50 }),
      anilist(SCHEDULE_QUERY, { start: now, end: dayAhead, perPage: 50 }),
      anilist(GENRE_QUERY),
    ]);

    // Enrich top spotlights with TMDB logos (parallel)
    const spotlightsRaw = (spotlightsR.Page?.media || []).slice(0, 10);
    const spotlights = await Promise.all(
      spotlightsRaw.map(async (m, i) => {
        const sp = mediaToSpotlight(m, i + 1);
        if (sp) {
          const title = m.title?.english || m.title?.romaji;
          sp.titleLogo = await getTitleLogo(title, m.seasonYear);
        }
        return sp;
      })
    );

    // Dedupe latestEpisode by media id (most recent ep per show)
    const seen = new Set();
    const latestEpisode = [];
    for (const s of (latestEpsR.Page?.airingSchedules || [])) {
      if (!s.media || seen.has(s.media.id)) continue;
      seen.add(s.media.id);
      const card = mediaToCard(s.media);
      if (card) {
        card.tvInfo.sub = s.episode;
        latestEpisode.push(card);
      }
      if (latestEpisode.length >= 24) break;
    }

    const todaySeen = new Set();
    const todaySchedule = [];
    for (const s of (todayScheduleR.Page?.airingSchedules || [])) {
      if (!s.media || todaySeen.has(s.media.id)) continue;
      todaySeen.add(s.media.id);
      const card = mediaToCard(s.media);
      if (card) todaySchedule.push(card);
      if (todaySchedule.length >= 24) break;
    }

    const result = {
      spotlights: spotlights.filter(Boolean),
      trending: (trendingR.Page?.media || []).map((m, i) => mediaToCard(m, i + 1)).filter(Boolean),
      topTen: {
        today: (topTodayR.Page?.media || []).slice(0, 10).map((m, i) => mediaToCard(m, i + 1)).filter(Boolean),
        week:  (topWeekR.Page?.media  || []).slice(0, 10).map((m, i) => mediaToCard(m, i + 1)).filter(Boolean),
        month: (topMonthR.Page?.media || []).slice(0, 10).map((m, i) => mediaToCard(m, i + 1)).filter(Boolean),
      },
      today: { schedule: todaySchedule },
      topAiring:       (topAiringR.Page?.media       || []).map(m => mediaToCard(m)).filter(Boolean),
      mostPopular:     (mostPopularR.Page?.media     || []).map(m => mediaToCard(m)).filter(Boolean),
      mostFavorite:    (mostFavoriteR.Page?.media    || []).map(m => mediaToCard(m)).filter(Boolean),
      latestCompleted: (latestCompletedR.Page?.media || []).map(m => mediaToCard(m)).filter(Boolean),
      latestEpisode,
      topUpcoming:     (topUpcomingR.Page?.media     || []).map(m => mediaToCard(m)).filter(Boolean),
      recentlyAdded:   (recentlyAddedR.Page?.media   || []).map(m => mediaToCard(m)).filter(Boolean),
      genres: genresR.GenreCollection || [],
    };

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(ok(result));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
