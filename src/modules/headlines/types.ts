import type { HeadlineBrief } from "./schema";
import type { AiClientContext } from "@/lib/ai/client-context";
export type Context = AiClientContext;
export interface Workspace {id:string;client_id:string;content_id:string;offer_name?:string|null;editorial_line_id?:string|null;content_format?:string|null;brief:HeadlineBrief;revision:number;brainstorm:{ideas:Idea[];model:string;createdAt:string}[];selected_headline:string|null;selected_subheadline:string;headline_candidate_id:string|null;headline_content_stale:boolean;}
export interface Idea {idea:string;audience:string;pain:string;desire:string;goal:string;angle:string;format:string;rationale:string;repetition:string;}
export interface Round {id:string;brief:HeadlineBrief;prompt:string;created_at:string;style:{initial:boolean;version:number};}
export interface Run {id:string;round_id:string;team:"A"|"B";slot:number;mode:"PROMPT"|"STYLE";attempt:number;requested_model:string;actual_model:string|null;status:"PENDING"|"RUNNING"|"SUCCESS"|"ERROR";error:string|null;started_at:string|null;duration_ms:number|null;usage:{cost?:number}|null;}
export interface Candidate {id:string;round_id:string;run_id:string|null;headline:string;subheadline:string;source:"AI"|"HUMAN";rating:number;reason:string;presented_at:string|null;metadata:{structure?:string;angle?:string;triggers?:string[];rationale?:string;warnings?:string[];review?:Record<string,string>;scores?:Record<string,{score:number;reason:string}>};}
export interface WorkspaceState {workspace:Workspace;rounds:Round[];runs:Run[];candidates:Candidate[];}
export interface ModelSlot {slot:number;model:string;}
