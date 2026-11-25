import type { PoolClient } from "pg";
import { projectPostSlots, type SocialMediaSchedule } from "./social-media-schedule";

export async function saveSocialMediaSchedule(db: PoolClient, projectId: string, schedule: SocialMediaSchedule) {
  await db.query(
    `INSERT INTO project_social_media_plans (project_id, posts_per_month, weekdays)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id) DO UPDATE
     SET posts_per_month = EXCLUDED.posts_per_month, weekdays = EXCLUDED.weekdays`,
    [projectId, schedule.postsPerMonth, schedule.weekdays],
  );
}

export async function createSocialMediaMonth(
  db: PoolClient,
  project: { id: string; clientId: string; company: string },
  month: string,
  schedule: SocialMediaSchedule,
) {
  const monthDate = month + "-01";
  const existing = await db.query(
    "SELECT 1 FROM project_social_media_months WHERE project_id = $1 AND month = $2",
    [project.id, monthDate],
  );
  if (existing.rows.length) return;

  const slots = projectPostSlots(month, schedule, project.company);
  await db.query("INSERT INTO project_social_media_months (project_id, month) VALUES ($1, $2)", [project.id, monthDate]);
  await db.query(
    `INSERT INTO content_calendar_items
       (project_id, project_month, project_post_number, client_id, scheduled_date, title, central_idea, status, content_type)
     SELECT $1, $2, slot.number, $3, slot.date, slot.title, '', 'PLANNED', 'SOCIAL_MEDIA'
     FROM unnest($4::integer[], $5::date[], $6::text[]) AS slot(number, date, title)`,
    [project.id, monthDate, project.clientId, slots.map(slot => slot.number), slots.map(slot => slot.date), slots.map(slot => slot.title)],
  );
}

export const SOCIAL_MEDIA_POST_FORMATS = ["Carrossel", "Reels", "Post estático", "Stories"] as const;

export type EditorialOption = {
  id: string;
  pillarId: string | null;
  pillarName: string;
  theme: string;
  preferredFormats?: string[];
};

export type AutoOrganizeAssignment = {
  postId: string;
  editorialLineId: string | null;
  offerName: string;
  format: string;
};

/**
 * Distributes editorial pillars/lines, offers/services, and post formats across planned posts,
 * rotating values so consecutive posts stay varied and aligned with each line's preferred formats.
 */
export function buildAutoOrganizedPostAssignments(params: {
  postIds: string[];
  editorialLines: EditorialOption[];
  offers: { name: string }[];
}): AutoOrganizeAssignment[] {
  const { postIds, editorialLines, offers } = params;
  const offerPool = offers.length > 0
    ? [...offers.map((o) => o.name), "Institucional / Marca"]
    : ["Institucional / Marca"];

  return postIds.map((postId, idx) => {
    const line = editorialLines.length > 0 ? editorialLines[idx % editorialLines.length] : null;
    const offerName = offerPool[idx % offerPool.length];
    const lineFormats = Array.isArray(line?.preferredFormats)
      ? line.preferredFormats.filter((f): f is string =>
          (SOCIAL_MEDIA_POST_FORMATS as readonly string[]).includes(f)
        )
      : [];
    const formatPool = lineFormats.length > 0 ? lineFormats : [...SOCIAL_MEDIA_POST_FORMATS];
    const format = formatPool[idx % formatPool.length];

    return {
      postId,
      editorialLineId: line?.id ?? null,
      offerName,
      format,
    };
  });
}
