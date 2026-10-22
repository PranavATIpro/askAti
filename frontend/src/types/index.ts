export interface RunbookStep {
  id: string;
  runbook_id: string;
  step_number: number;
  step_title?: string | null;
  command?: string | null;
  instruction?: string | null;
  warning?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Runbook {
  id: string;
  title: string;
  description?: string | null;
  form_type?: string | null;
  ticket_type?: string | null;
  category?: string | null;
  product_area?: string | null;
  components?: string | null;
  source_type: string;
  source_page_id?: string | null;
  source_url?: string | null;
  content_hash?: string | null;
  created_at: string;
  updated_at: string;
  steps_count: number;
  steps?: RunbookStep[];
}

export interface RunbookListResponse {
  total: number;
  items: Runbook[];
  categories: string[];
  product_areas: string[];
  ticket_types: string[];
}

export interface ChatSourceItem {
  runbook_id: string;
  runbook_title: string;
  category?: string | null;
  product_area?: string | null;
  components?: string | null;
  step_numbers: number[];
  source_url?: string | null;
}

export interface CommandItem {
  step_number: number;
  title?: string | null;
  command: string;
  instruction?: string | null;
}

export interface TroubleshootingStep {
  step_number: number;
  step_title?: string | null;
  instruction?: string | null;
  command?: string | null;
  warning?: string | null;
  notes?: string | null;
  runbook_title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrieval_mode?: string;
  confidence?: number;
  sources?: ChatSourceItem[];
  steps?: TroubleshootingStep[];
  commands?: CommandItem[];
  warnings?: string[];
  suggested_followups?: string[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface IngestionPreviewRow {
  row_index: number;
  runbook_title: string;
  step_number?: number | null;
  step_title?: string | null;
  command_preview?: string | null;
  instruction_preview?: string | null;
  category?: string | null;
  product_area?: string | null;
  components?: string | null;
  status: 'valid' | 'warning' | 'skipped';
  message?: string | null;
}

export interface IngestionPreviewSummary {
  total_rows_parsed: number;
  valid_rows: number;
  skipped_rows: number;
  runbooks_identified: number;
  validation_issues: string[];
}

export interface IngestionPreviewResponse {
  success: boolean;
  summary: IngestionPreviewSummary;
  sample_rows: IngestionPreviewRow[];
  runbook_titles: string[];
}

export interface IngestionJob {
  id: string;
  source_type: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  error_summary?: string | null;
  details?: string | null;
}
