import { describe, expect, it } from "vitest";
import type { PlannedProjectPost } from "@/components/content-studio/project-post-picker";
import { suggestPostFits } from "@/modules/headlines/brainstorm-post-fit";
import { weeklyRecommendations } from "@/modules/headlines/brainstorm-weekly";

function post(id: string, date: string, overrides: Partial<PlannedProjectPost> = {}): PlannedProjectPost {
  return { id, scheduledDate: date, title: id, clientId: "client", companyName: "Empresa",
    projectName: "Projeto", projectId: "project", workspaceId: null, availableForIdea: true, format: "Reels",
    ...overrides };
}

describe("suggestPostFits", () => {
  it("excludes occupied and past posts and ranks by format and proximity to the source date", () => {
    const ideas = suggestPostFits([
      post("occupied", "2026-12-25", { availableForIdea: false }),
      post("past", "2026-11-19"),
      post("different", "2026-12-25", { format: "Carrossel" }),
      post("same-far", "2026-12-01"),
      post("same-near", "2026-12-24"),
    ], { format: "Reels", source_date: "2026-12-25" }, "2026-11-20");
    expect(ideas.map(({ post }) => post.id)).toEqual(["same-near", "same-far", "different"]);
  });

  it("suggests only posts from the selected project", () => {
    const ideas = suggestPostFits([
      post("outside", "2026-11-20", { projectId: "another" }),
      post("inside", "2026-11-21"),
    ], { format: "Reels" }, "2026-11-20", "project");
    expect(ideas.map(({ post }) => post.id)).toEqual(["inside"]);
  });

  it("curates at most five distinct slots from the week", () => {
    const posts = Array.from({ length: 6 }, (_, index) => post("post-" + index, "2026-11-20"));
    const ideas = posts.map((_, index) => ({ id: "idea-" + index, format: "Reels", source_date: null }));
    const result = weeklyRecommendations(ideas, posts, "2026-11-20");
    expect(result).toHaveLength(5);
    expect(new Set(result.map(row => row.postId)).size).toBe(5);
  });
});
