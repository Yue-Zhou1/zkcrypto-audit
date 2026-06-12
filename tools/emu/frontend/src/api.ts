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

export type Gate = {
  gate: string;
  status: string;
  finding_id: string | null;
  message: string;
  reads: string[];
};

export type SessionDetail = {
  session_path: string;
  session: {
    engagement_id?: string;
    targets?: unknown;
    target_scope?: unknown;
    scope?: unknown;
    trust_boundaries?: unknown;
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

export async function readSession(sessionPath: string): Promise<SessionDetail> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionPath).replace(/%2F/g, '/')}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createSession(engagementId: string): Promise<SessionDetail> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engagement_id: engagementId }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function patchFindingStatus(
  sessionPath: string,
  baseMtimeNs: number,
  findingId: string,
  status: string,
): Promise<SessionDetail> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionPath).replace(/%2F/g, '/')}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_mtime_ns: baseMtimeNs,
      operations: [{ kind: 'update_finding_status', finding_id: findingId, status }],
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
