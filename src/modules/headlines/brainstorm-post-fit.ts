import type { PlannedProjectPost } from "@/components/content-studio/project-post-picker";

export type PostFitCandidate = Pick<PlannedProjectPost, "id" | "format" | "scheduledDate" | "availableForIdea"> &
  { projectId?: string };

export function suggestPostFits<T extends PostFitCandidate>(
  posts: T[],
  idea: { format?: string; source_date?: string | null },
  today: string,
  preferredProjectId?: string,
) {
  const sourceDate = idea.source_date?.slice(0, 10);
  const targetDate = sourceDate && sourceDate > today ? sourceDate : today;
  const targetTime = Date.parse(targetDate);
  return posts.filter(post =>
    post.availableForIdea && post.scheduledDate && post.scheduledDate >= today &&
    (!preferredProjectId || post.projectId === preferredProjectId),
  ).map(post => ({
    post,
    sameFormat: !!idea.format && post.format === idea.format,
    distance: Math.abs(Date.parse(post.scheduledDate!) - targetTime),
  })).sort((a, b) => Number(b.sameFormat) - Number(a.sameFormat) ||
    a.distance - b.distance || a.post.id.localeCompare(b.post.id)).slice(0, 3);
}
