import { query } from "@/lib/db/pool";
import { suggestPostFits, type PostFitCandidate } from "./brainstorm-post-fit";
import { brainstormDay, shiftBrainstormDay } from "./brainstorm-sources";

type ReviewIdea = { id: string; format: string; source_date: string | null };
type Recommendation = { ideaId: string; postId: string };

export function weeklyRecommendations(ideas: ReviewIdea[], posts: PostFitCandidate[], today: string) {
  const available = posts.slice();
  const recommendations: Recommendation[] = [];
  for (const idea of ideas) {
    const match = suggestPostFits(available, idea, today)[0]?.post;
    if (!match) continue;
    recommendations.push({ ideaId: idea.id, postId: match.id });
    available.splice(available.indexOf(match), 1);
    if (recommendations.length === 5) break;
  }
  return recommendations;
}

function weekStart(today: string) {
  const weekday = new Date(today + "T00:00:00Z").getUTCDay();
  return shiftBrainstormDay(today, -((weekday + 6) % 7));
}

export async function buildWeeklyReview(clientId?: string) {
  const today = brainstormDay();
  const start = weekStart(today);
  const { rows } = await query<{ client_id: string; posts: PostFitCandidate[] | null; ideas: ReviewIdea[] | null }>(
    `SELECT c.id AS client_id, slots.posts, backlog.ideas
       FROM clients c
       CROSS JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object('id', p.id, 'format', p.format,
                  'scheduledDate', p.scheduled_date, 'availableForIdea', true)) AS posts
         FROM content_calendar_items p JOIN projects pr ON pr.id = p.project_id AND pr.client_id = c.id
         WHERE p.client_id = c.id AND p.archived_at IS NULL AND pr.archived_at IS NULL
           AND p.content_type = 'SOCIAL_MEDIA' AND p.status = 'PLANNED'
           AND p.scheduled_date BETWEEN $2::date AND $3::date
           AND NULLIF(btrim(p.central_idea), '') IS NULL
           AND NOT EXISTS (SELECT 1 FROM headline_workspaces w WHERE w.content_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM content_brainstorm_ideas i WHERE i.content_id = p.id)
       ) slots
       CROSS JOIN LATERAL (
         SELECT jsonb_agg(to_jsonb(idea) ORDER BY (idea.source_date IS NOT NULL) DESC,
           (idea.status = 'SAVED_FOR_LATER') DESC, idea.created_at DESC, idea.id) AS ideas FROM (
           SELECT i.id, i.format, i.source_date, i.status, i.created_at FROM content_brainstorm_ideas i
           WHERE i.client_id = c.id AND i.content_id IS NULL AND i.status IN ('IDEA', 'SAVED_FOR_LATER')
             AND (i.source_date IS NULL OR i.source_date BETWEEN $2::date AND $3::date)
           ORDER BY (i.source_date IS NOT NULL) DESC, (i.status = 'SAVED_FOR_LATER') DESC, i.created_at DESC, i.id
           LIMIT 60
         ) idea
       ) backlog
       WHERE c.archived_at IS NULL AND ($1::uuid IS NULL OR c.id = $1)
         AND ($1::uuid IS NOT NULL OR slots.posts IS NOT NULL)`,
    [clientId || null, today, shiftBrainstormDay(start, 6)],
  );
  if (!rows.length) return 0;
  const reviews = rows.map(row => ({ client_id: row.client_id, recommendations: weeklyRecommendations(row.ideas || [], row.posts || [], today) }));
  await query(
    `INSERT INTO content_brainstorm_weekly_reviews (client_id, week_start, recommendations)
     SELECT client_id, $2::date, recommendations FROM jsonb_to_recordset($1::jsonb)
       AS review(client_id uuid, recommendations jsonb)
     ON CONFLICT (client_id, week_start) DO UPDATE SET recommendations = EXCLUDED.recommendations`,
    [JSON.stringify(reviews), start],
  );
  return reviews.length;
}

export async function getWeeklyReview(clientId: string) {
  const { rows } = await query<{ recommendations: Recommendation[]; tokens: number | null; adopted: number }>(
    `SELECT review.recommendations, usage.tokens, usage.adopted
       FROM (SELECT $1::uuid AS id) client
       LEFT JOIN content_brainstorm_weekly_reviews review ON review.client_id = client.id AND review.week_start = $2::date
       CROSS JOIN LATERAL (
         SELECT sum(g.tokens)::float8 AS tokens, COALESCE(sum(used.adopted), 0)::int AS adopted
         FROM content_brainstorm_generations g
         JOIN content_brainstorm_searches s ON s.id = g.search_id AND s.client_id = client.id
         CROSS JOIN LATERAL (
           SELECT count(*) AS adopted FROM content_brainstorm_ideas i
           JOIN content_calendar_items p ON p.id = i.content_id AND p.archived_at IS NULL
           WHERE i.generation_id = g.id
         ) used
       ) usage`,
    [clientId, weekStart(brainstormDay())],
  );
  const review = rows[0];
  return {
    recommendations: review?.recommendations || [],
    tokens: review?.tokens ?? null,
    adopted: review?.adopted ?? 0,
    tokensPerAdopted: review?.adopted && review.tokens != null ? Math.round(review.tokens / review.adopted) : null,
  };
}
