export interface UserProfile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  website_url: string | null
  professional_summary: string | null
  created_at: string
  updated_at: string
}

export interface BulletEntry {
  id: string
  text: string
  is_quantified: boolean
  tags: string[]
  source: 'original' | 'ai_suggested' | 'user_edited'
}

export interface ExperienceEntry {
  id: string
  profile_id: string
  company_name: string
  job_title: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  location: string | null
  employment_type: string | null
  raw_description: string | null
  bullets: BulletEntry[]
  skills_demonstrated: string[]
  industries: string[]
  impact_metrics: Record<string, unknown> | null
  source: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StyleConfig {
  accent_color?: string   // hex e.g. '#0f3d66'
  font?: 'serif' | 'sans' | 'humanist' | 'mono'
  spacing?: 'compact' | 'normal' | 'spacious'
  name_size?: number      // pt
}

export interface StylePreset extends StyleConfig {
  name: string
  description: string
  vibe: string
  template_name: string
}

export interface ResumeVersion {
  id: string
  profile_id: string
  name: string
  job_title_target: string | null
  job_description: string | null
  template_name: string
  sections_order: string[]
  sections_config: Record<string, { visible: boolean; title?: string }>
  selected_experience_ids: string[]
  custom_summary: string | null
  skills_selection: { selected?: string[]; order?: string[] }
  gap_analysis_result: GapAnalysisResult | null
  style_config: StyleConfig
  is_base: boolean
  created_at: string
  updated_at: string
}

export interface ResumeBullet {
  id: string
  resume_version_id: string
  experience_entry_id: string
  original_bullet_id: string
  display_text: string
  is_ai_rewritten: boolean
  ai_rationale: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  profile_id: string
  resume_version_id: string | null
  company_name: string
  job_title: string
  job_url: string | null
  job_description: string | null
  salary_range: string | null
  location: string | null
  remote_type: string | null
  status: JobStatus
  status_history: StatusHistoryEntry[]
  applied_at: string | null
  notes: string | null
  contacts: JobContact[]
  created_at: string
  updated_at: string
}

export type JobStatus = 'saved' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected' | 'withdrawn'

export interface StatusHistoryEntry {
  status: JobStatus
  timestamp: string
  notes: string | null
}

export interface JobContact {
  name: string
  role: string
  email?: string
  linkedin?: string
}

export interface CoverLetter {
  id: string
  job_application_id: string
  resume_version_id: string | null
  body_html: string
  body_plain: string
  tone: string
  is_ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface GapItem {
  requirement: string
  confidence: 'DIRECT' | 'TRANSFERABLE' | 'ADJACENT' | 'WEAK' | 'GAP'
  score: number
  matched_experience_ids: string[]
  evidence?: string
  suggestion?: string | null
}

export interface GapAnalysisResult {
  overall_match_score: number
  top_strengths: string[]
  key_gaps: string[]
  gaps: GapItem[]
}

export interface TaskStatus {
  task_id: string
  status: 'pending' | 'started' | 'success' | 'failure'
  result: unknown | null
  error: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface LinkedInImportPreview {
  full_name: string
  email: string | null
  location: string | null
  headline: string | null
  summary: string | null
  experience_count: number
  education_count: number
  skills_count: number
  raw_data: Record<string, unknown>
}
