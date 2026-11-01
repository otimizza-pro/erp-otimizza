export type KnowledgeInfoType = "DIRECTIVE" | "HYPOTHESIS" | "HISTORICAL";
export type KnowledgePageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface KnowledgePage {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  info_type: KnowledgeInfoType;
  status: KnowledgePageStatus;
  has_unpublished_changes: boolean;
  order_index: number;
  tags: string[];
  last_reviewed_at: string | null;
  next_review_at: string | null;
  draft_content_json: Record<string, unknown>;
  draft_content_html: string;
  draft_content_text: string;
  published_content_json: Record<string, unknown> | null;
  published_content_html: string | null;
  published_content_text: string | null;
  published_at: string | null;
  published_by: string | null;
  version_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Campos calculados para visualização hierárquica
  parent_title?: string | null;
  children_count?: number;
}

export interface KnowledgePageTreeNode extends KnowledgePage {
  children: KnowledgePageTreeNode[];
  depth: number;
  path: string[];
}

export interface KnowledgePageVersion {
  id: string;
  page_id: string;
  version_number: number;
  title: string;
  summary: string | null;
  info_type: KnowledgeInfoType;
  content_json: Record<string, unknown>;
  content_html: string;
  content_text: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  is_published_snapshot: boolean;
  change_summary: string | null;
}

export interface CreateKnowledgePageDTO {
  title: string;
  slug?: string;
  parent_id?: string | null;
  summary?: string | null;
  info_type?: KnowledgeInfoType;
  tags?: string[];
  order_index?: number;
  draft_content_json?: Record<string, unknown>;
  draft_content_html?: string;
  draft_content_text?: string;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
}

export interface UpdateKnowledgePageDTO {
  title?: string;
  slug?: string;
  parent_id?: string | null;
  summary?: string | null;
  info_type?: KnowledgeInfoType;
  tags?: string[];
  order_index?: number;
  draft_content_json?: Record<string, unknown>;
  draft_content_html?: string;
  draft_content_text?: string;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  expected_updated_at?: string; // Para controle de concorrência otimista
}

export interface PublicKnowledgePage {
  id: string;
  slug: string;
  parent_id: string | null;
  title: string;
  summary: string | null;
  info_type: KnowledgeInfoType;
  tags: string[];
  last_reviewed_at: string | null;
  next_review_at: string | null;
  content_html: string;
  published_at: string;
  updated_at: string;
  breadcrumbs: Array<{ slug: string; title: string }>;
  subpages: Array<{ slug: string; title: string; summary: string | null; info_type: KnowledgeInfoType }>;
}

export interface ConsolidatedKnowledgeDocument {
  generated_at: string;
  last_updated_at: string;
  pages_count: number;
  tree: KnowledgePageTreeNode[];
  all_published_pages: PublicKnowledgePage[];
}
