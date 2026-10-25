const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface VoiceQuestion {
  id: string;
  field_key: string;
  prompt_hi: string;
  prompt_en: string;
  expected_type: string;
}

export interface SchemeInfo {
  id: string;
  title_hi: string;
  title_en: string;
  status: string;
  source_url: string;
  required_documents: string[];
}

export interface SessionResponse {
  session_id: string;
  scheme: SchemeInfo;
  current_question: VoiceQuestion | null;
  total_questions: number;
}

export interface VoiceAnswerResponse {
  success: boolean;
  transcript: string;
  parsed_value: any;
  display_value: string;
  confirmation_hi: string;
  confirmation_en: string;
  message_hi?: string;
  message_en?: string;
}

export interface VoiceConfirmResponse {
  status: "ACCEPTED" | "RETRY";
  saved_field?: string;
  value?: any;
  has_next_question: boolean;
  next_question?: VoiceQuestion;
  message_hi: string;
  message_en: string;
}

export interface RuleResultItem {
  rule_id: string;
  status: "PASS" | "FIX" | "COULD_NOT_VERIFY";
  quoted_text?: string;
  message_hi: string;
  message_en: string;
  fix_hi?: string;
  fix_en?: string;
  rule_type: string;
  field?: string;
}

export interface PreCheckReportResponse {
  session_id: string;
  scheme: string;
  status_summary: "READY_TO_APPLY" | "FIXES_REQUIRED";
  can_submit: boolean;
  results: RuleResultItem[];
  total_checks: number;
  pass_count: number;
  fix_count: number;
  unverified_count: number;
  summary_hi: string;
  summary_en: string;
}

export async function createSession(schemeId: string = "mp_post_matric_scholarship"): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheme_id: schemeId })
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
  return res.json();
}

export async function submitVoiceAnswer(
  sessionId: string,
  questionId: string,
  audioBlob: Blob,
  languageCode: string = "hi-IN"
): Promise<VoiceAnswerResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("question_id", questionId);
  formData.append("language_code", languageCode);
  formData.append("audio_file", audioBlob, "answer.wav");

  const res = await fetch(`${API_BASE}/api/voice/answer`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to process voice answer: ${res.statusText}`);
  return res.json();
}

export async function confirmVoiceAnswer(
  sessionId: string,
  decision?: string,
  audioBlob?: Blob,
  languageCode: string = "hi-IN"
): Promise<VoiceConfirmResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("language_code", languageCode);
  if (decision) formData.append("decision", decision);
  if (audioBlob) formData.append("audio_file", audioBlob, "confirm.wav");

  const res = await fetch(`${API_BASE}/api/voice/confirm`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to confirm voice answer: ${res.statusText}`);
  return res.json();
}

export async function uploadDocument(
  sessionId: string,
  docType: string,
  file: File | Blob,
  filename: string = "doc.jpg"
): Promise<any> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("doc_type", docType);
  formData.append("file", file, filename);

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to upload document: ${res.statusText}`);
  return res.json();
}

export async function runPrecheck(sessionId: string): Promise<PreCheckReportResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/api/check`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to run precheck: ${res.statusText}`);
  return res.json();
}

export async function fetchSpokenAudio(
  text: string,
  language: string = "hi-IN",
  voice: string = "Nalini"
): Promise<Blob> {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("language", language);
  formData.append("voice", voice);

  const res = await fetch(`${API_BASE}/api/speak`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to synthesize speech: ${res.statusText}`);
  return res.blob();
}

export async function purgeSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error(`Failed to purge session: ${res.statusText}`);
  return res.json();
}
