export type PhaseInfo = {
  source: string;
  phase: string | null;
  runtime_phase: string | null;
};

export type SessionListItem = {
  session_path: string;
  engagement_id: string;
  phase: PhaseInfo;
  updated_at?: string;
  mtime_ns: number;
  targets_count: number;
  open_findings_count: number;
  verified_findings_count: number;
};

export type Finding = {
  id?: string;
  title?: string;
  status?: string;
  verdict?: string;
  severity?: string;
  severity_estimate?: string;
  summary?: string;
  description?: string;
  owner_skill?: string;
  report_ref?: string;
  [key: string]: unknown;
};

export type TrustBoundary = {
  name?: string;
  assumption?: string;
  evidence?: string;
  description?: string;
  [key: string]: unknown;
};

export type PatchOp = {
  kind: string;
  finding_id?: string;
  status?: string;
  summary?: string;
  text?: string;
  index?: number;
  value?: string;
  boundary?: Record<string, string>;
  finding?: Record<string, string>;
  order?: number[];
};

export type TargetValidation = {
  path: string;
  in_repo: boolean;
  looks_like_rust: boolean;
};

export type Gate = {
  gate: string;
  status: string;
  finding_id: string | null;
  message: string;
  reads: string[];
  prompt: string | null;
};

export type QuestionRecord = {
  id: string;
  text: string;
  source_ref?: string;
  source_hint?: { status?: string; mode?: string; path?: string; skipped_targets?: number };
  rationale?: string;
  status: string;
  routed_skill?: string;
  prompt?: string | null;
  evidence?: string;
  verdict?: string | null;
  finding_ref?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type QuestionList = {
  questions: QuestionRecord[];
  records?: QuestionRecord[];
  mtime_ns: number;
  diagnostics: Array<{ line?: number | null; message: string }>;
};

export type PendingRecord = {
  question_id: string;
  proposed: {
    summary?: string;
    severity?: string;
    owner_skill?: string;
    [key: string]: unknown;
  };
  imported?: boolean;
  finding_ref?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PendingList = {
  records: PendingRecord[];
  mtime_ns: number;
  diagnostics: Array<{ line?: number | null; message: string }>;
};

export type RouteSuggestion = {
  skill: string;
  rule_id?: string;
  matched_terms: string[];
  score: number;
  reason: string;
};

export type RouteSuggestResult = {
  suggestions: RouteSuggestion[];
  confidence: string;
};

export type CoverageResult = {
  questions: QuestionRecord[];
  summary: {
    asked: number;
    answered: number;
    findings: number;
    pending: number;
  };
};

export type SessionDetail = {
  session_path: string;
  session: {
    engagement_id?: string;
    targets?: unknown;
    target_scope?: unknown;
    scope?: unknown;
    trust_boundaries?: TrustBoundary[] | Record<string, unknown>;
    open_findings?: Finding[];
    verified_findings?: Finding[];
    next_steps?: string[];
    [key: string]: unknown;
  } | null;
  mtime_ns: number;
  diagnostics: {
    valid: boolean;
    errors: Array<{ path: string; message: string }>;
  };
  derived: {
    phase?: PhaseInfo;
    finding_groups?: Record<string, Finding[]>;
    finding_dispositions?: Record<string, string>;
    evidence_gates?: Gate[];
    next_action?: {
      next_skill: string;
      reason: string;
      finding_id: string | null;
      prompt: string;
      phase: PhaseInfo;
    };
  };
};

export async function listSessions(): Promise<SessionListItem[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.sessions;
}

// Encode each path segment but keep the slash separators literal: the backend
// route is {session_path:path}, which matches a slash-bearing tail.
function sessionUrl(sessionPath: string): string {
  const encoded = sessionPath.split('/').map(encodeURIComponent).join('/');
  return `/api/sessions/${encoded}`;
}

export async function readSession(sessionPath: string): Promise<SessionDetail> {
  const response = await fetch(sessionUrl(sessionPath));
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createSession(engagementId: string, firstTarget?: string): Promise<SessionDetail> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engagement_id: engagementId, first_target: firstTarget }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function validateTarget(path: string): Promise<TargetValidation> {
  const response = await fetch('/api/fs/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function patchSession(
  sessionPath: string,
  baseMtimeNs: number,
  operations: PatchOp[],
): Promise<SessionDetail> {
  const response = await fetch(sessionUrl(sessionPath), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_mtime_ns: baseMtimeNs, operations }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listQuestions(sessionPath: string): Promise<QuestionList> {
  const response = await fetch(`${sessionUrl(sessionPath)}/questions`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createQuestion(
  sessionPath: string,
  baseMtimeNs: number,
  payload: { text: string; source_ref?: string; rationale?: string; routed_skill?: string },
): Promise<QuestionList> {
  const response = await fetch(`${sessionUrl(sessionPath)}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_mtime_ns: baseMtimeNs, ...payload }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function patchQuestion(
  sessionPath: string,
  questionId: string,
  baseMtimeNs: number,
  updates: Record<string, unknown>,
): Promise<QuestionList> {
  const response = await fetch(`${sessionUrl(sessionPath)}/questions/${encodeURIComponent(questionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_mtime_ns: baseMtimeNs, updates }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function questionPrompt(sessionPath: string, questionId: string, chosenSkill?: string): Promise<{ prompt: string }> {
  const response = await fetch(`${sessionUrl(sessionPath)}/questions/${encodeURIComponent(questionId)}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chosen_skill: chosenSkill }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function suggestRoute(text: string): Promise<RouteSuggestResult> {
  const response = await fetch('/api/routing/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listPending(sessionPath: string): Promise<PendingList> {
  const response = await fetch(`${sessionUrl(sessionPath)}/pending`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function bufferCandidate(
  sessionPath: string,
  questionsMtimeNs: number,
  pendingMtimeNs: number,
  questionId: string,
  proposed: PendingRecord['proposed'],
): Promise<PendingList> {
  const response = await fetch(`${sessionUrl(sessionPath)}/pending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questions_mtime_ns: questionsMtimeNs,
      pending_mtime_ns: pendingMtimeNs,
      question_id: questionId,
      proposed,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function importPending(
  sessionPath: string,
  sessionMtimeNs: number,
  questionsMtimeNs: number,
  pendingMtimeNs: number,
  questionIds: string[],
): Promise<{ session: unknown; questions: QuestionList; pending: PendingList }> {
  const response = await fetch(`${sessionUrl(sessionPath)}/pending/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_mtime_ns: sessionMtimeNs,
      questions_mtime_ns: questionsMtimeNs,
      pending_mtime_ns: pendingMtimeNs,
      question_ids: questionIds,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function readCoverage(sessionPath: string): Promise<CoverageResult> {
  const response = await fetch(`${sessionUrl(sessionPath)}/coverage`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function exportCoverage(sessionPath: string): Promise<{ markdown: string }> {
  const response = await fetch(`${sessionUrl(sessionPath)}/coverage/export`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
