import { Clipboard, FileJson, GitBranch, Plus, RefreshCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  createSession,
  Finding,
  Gate,
  listSessions,
  patchFindingStatus,
  readSession,
  SessionDetail,
  SessionListItem,
} from './api';

const PHASES = ['intake', 'domain', 'verification', 'reporting', 'indexing'];

export function App() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [newEngagementId, setNewEngagementId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState('');

  async function refreshSessions(nextSelectedPath?: string) {
    setLoadingSessions(true);
    setError(null);
    try {
      const items = await listSessions();
      setSessions(items);
      const nextPath = nextSelectedPath ?? selectedPath ?? items[0]?.session_path ?? null;
      setSelectedPath(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    void refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }

    setLoadingDetail(true);
    setError(null);
    readSession(selectedPath)
      .then((nextDetail) => {
        setDetail(nextDetail);
        const firstFinding = getFindings(nextDetail)[0];
        setSelectedFindingId((current) => current ?? firstFinding?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingDetail(false));
  }, [selectedPath]);

  const findings = useMemo(() => (detail ? getFindings(detail) : []), [detail]);
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? findings[0] ?? null;
  const selectedGates = (detail?.derived.evidence_gates ?? []).filter(
    (gate) => !gate.finding_id || gate.finding_id === selectedFinding?.id,
  );

  useEffect(() => {
    setStatusDraft(String(selectedFinding?.status ?? selectedFinding?.verdict ?? ''));
  }, [selectedFinding?.id, selectedFinding?.status, selectedFinding?.verdict]);

  async function handleCreateSession() {
    const engagementId = newEngagementId.trim();
    if (!engagementId) return;
    setError(null);
    try {
      const created = await createSession(engagementId);
      setNewEngagementId('');
      await refreshSessions(created.session_path);
      setDetail(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSaveStatus() {
    if (!detail || !selectedFinding?.id || !statusDraft.trim()) return;
    setError(null);
    try {
      const updated = await patchFindingStatus(detail.session_path, detail.mtime_ns, selectedFinding.id, statusDraft.trim());
      setDetail(updated);
      await refreshSessions(updated.session_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCopyPrompt() {
    const prompt = detail?.derived.next_action?.prompt;
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
  }

  return (
    <main className="app-shell">
      <aside className="left-rail">
        <div className="brand-row">
          <div>
            <p className="eyebrow">Evidence Management UI</p>
            <h1>emu</h1>
          </div>
          <button className="icon-button" aria-label="Refresh sessions" onClick={() => void refreshSessions()}>
            <RefreshCcw size={17} />
          </button>
        </div>

        <section className="new-session">
          <label htmlFor="engagement-id">New engagement</label>
          <div className="inline-form">
            <input
              id="engagement-id"
              value={newEngagementId}
              onChange={(event) => setNewEngagementId(event.target.value)}
              placeholder="halo2-gadgets-2026-06-12"
            />
            <button className="icon-button strong" aria-label="Create engagement" onClick={() => void handleCreateSession()}>
              <Plus size={18} />
            </button>
          </div>
        </section>

        <section className="phase-list" aria-label="Audit phases">
          {PHASES.map((phase) => (
            <div
              className={`phase-item ${detail?.derived.phase?.runtime_phase === phase ? 'active' : ''}`}
              key={phase}
            >
              <GitBranch size={15} />
              <span>{phase}</span>
            </div>
          ))}
        </section>

        <section className="session-list" aria-label="Sessions">
          {loadingSessions ? <RailSkeleton /> : null}
          {!loadingSessions && sessions.length === 0 ? <p className="muted">No session JSON files found.</p> : null}
          {sessions.map((session) => (
            <button
              className={`session-row ${session.session_path === selectedPath ? 'active' : ''}`}
              key={session.session_path}
              onClick={() => {
                setSelectedPath(session.session_path);
                setSelectedFindingId(null);
              }}
            >
              <FileJson size={16} />
              <span>
                <strong>{session.engagement_id}</strong>
                <small>{session.session_path}</small>
              </span>
              <em>{session.open_findings_count + session.verified_findings_count}</em>
            </button>
          ))}
        </section>
      </aside>

      <section className="center-pane">
        {error ? <div className="error-strip">{error}</div> : null}
        {loadingDetail ? <DetailSkeleton /> : null}
        {!loadingDetail && !detail ? <EmptyState /> : null}
        {!loadingDetail && detail?.session ? (
          <>
            <header className="session-header">
              <div>
                <p className="eyebrow">Selected session</p>
                <h2>{detail.session.engagement_id}</h2>
                <p className="path-line">{detail.session_path}</p>
              </div>
              <ValidationBadge valid={detail.diagnostics.valid} count={detail.diagnostics.errors.length} />
            </header>

            <div className="summary-grid">
              <Metric label="Phase" value={detail.derived.phase?.phase ?? 'unresolved'} />
              <Metric label="Open" value={String(detail.session.open_findings?.length ?? 0)} />
              <Metric label="Verified" value={String(detail.session.verified_findings?.length ?? 0)} />
              <Metric label="Gates" value={String(detail.derived.evidence_gates?.length ?? 0)} />
            </div>

            <section className="section-block">
              <div className="section-title">
                <h3>Finding Candidate Matrix</h3>
                <span>{findings.length} findings</span>
              </div>
              {findings.length === 0 ? (
                <p className="muted">No open or verified findings are recorded in this session.</p>
              ) : (
                <div className="finding-table">
                  <div className="finding-table-head">
                    <span>ID</span>
                    <span>Disposition</span>
                    <span>Summary</span>
                    <span>Owner</span>
                  </div>
                  {findings.map((finding) => (
                    <button
                      className={`finding-row ${selectedFinding?.id === finding.id ? 'active' : ''}`}
                      key={`${finding.id}-${finding.title ?? finding.summary}`}
                      onClick={() => setSelectedFindingId(finding.id ?? null)}
                    >
                      <span>{finding.id ?? 'unknown'}</span>
                      <Disposition finding={finding} detail={detail} />
                      <strong>{finding.title ?? finding.summary ?? finding.description ?? 'No summary'}</strong>
                      <span>{finding.owner_skill ?? String(finding.routing ?? 'unassigned')}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="section-block split">
              <TrustBoundaryPanel value={detail.session.trust_boundaries} />
              <NextStepsPanel steps={detail.session.next_steps ?? []} />
            </section>

            {!detail.diagnostics.valid ? (
              <section className="section-block">
                <div className="section-title">
                  <h3>Schema Diagnostics</h3>
                  <span>advisory</span>
                </div>
                <ul className="diagnostic-list">
                  {detail.diagnostics.errors.slice(0, 8).map((item) => (
                    <li key={`${item.path}-${item.message}`}>
                      <code>{item.path || 'root'}</code>
                      <span>{item.message}</span>
                    </li>
                  ))}
                  {detail.diagnostics.errors.length > 8 ? (
                    <li className="muted">+{detail.diagnostics.errors.length - 8} more diagnostics</li>
                  ) : null}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </section>

      <aside className="right-panel">
        <section className="panel-section">
          <p className="eyebrow">Finding detail</p>
          {selectedFinding ? (
            <>
              <h2>{selectedFinding.id ?? 'unknown'}</h2>
              <p>{selectedFinding.title ?? selectedFinding.summary ?? selectedFinding.description ?? 'No summary recorded.'}</p>
              <label htmlFor="status-draft">Status</label>
              <div className="inline-form">
                <input
                  id="status-draft"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  placeholder="unverified"
                />
                <button className="icon-button strong" aria-label="Save status" onClick={() => void handleSaveStatus()}>
                  <Save size={17} />
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Select a finding to inspect its evidence gates.</p>
          )}
        </section>

        <section className="panel-section">
          <div className="section-title">
            <h3>Evidence Gates</h3>
            <span>{selectedGates.length}</span>
          </div>
          <GateList gates={selectedGates} />
        </section>

        <section className="panel-section prompt-panel">
          <div className="section-title">
            <h3>Next Prompt</h3>
            <button className="text-button" onClick={() => void handleCopyPrompt()}>
              <Clipboard size={16} />
              Copy
            </button>
          </div>
          <pre>{detail?.derived.next_action?.prompt ?? 'Select a session to generate the next Codex prompt.'}</pre>
        </section>
      </aside>
    </main>
  );
}

function getFindings(detail: SessionDetail): Finding[] {
  return [...(detail.session?.open_findings ?? []), ...(detail.session?.verified_findings ?? [])];
}

function Disposition({ finding, detail }: { finding: Finding; detail: SessionDetail }) {
  const dispositions = detail.derived.finding_dispositions ?? {};
  const disposition = (finding.id && dispositions[finding.id]) || 'unknown';
  return <span className={`pill ${disposition}`}>{disposition.replace('_', ' ')}</span>;
}

function ValidationBadge({ valid, count }: { valid: boolean; count: number }) {
  return <div className={`validation-badge ${valid ? 'valid' : 'invalid'}`}>{valid ? 'Schema valid' : `${count} diagnostics`}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrustBoundaryPanel({ value }: { value: unknown }) {
  const items = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.entries(value) : [];
  return (
    <div>
      <div className="section-title">
        <h3>Trust Boundaries</h3>
        <span>{Array.isArray(items) ? items.length : 0}</span>
      </div>
      <div className="compact-list">
        {Array.isArray(value)
          ? value.slice(0, 5).map((item, index) => (
              <div key={index}>
                <strong>{typeof item === 'object' && item !== null && 'name' in item ? String(item.name) : `Boundary ${index + 1}`}</strong>
                <p>{typeof item === 'object' && item !== null ? String(item.assumption ?? item.description ?? item.evidence ?? '') : String(item)}</p>
              </div>
            ))
          : Object.entries((value ?? {}) as Record<string, unknown>)
              .slice(0, 5)
              .map(([key, item]) => (
                <div key={key}>
                  <strong>{key}</strong>
                  <p>{Array.isArray(item) ? item.slice(0, 3).join('; ') : String(item)}</p>
                </div>
              ))}
        <MoreIndicator total={items.length} shown={5} noun="boundaries" />
      </div>
    </div>
  );
}

function MoreIndicator({ total, shown, noun }: { total: number; shown: number; noun: string }) {
  if (total <= shown) return null;
  return <p className="muted">+{total - shown} more {noun}</p>;
}

function NextStepsPanel({ steps }: { steps: string[] }) {
  return (
    <div>
      <div className="section-title">
        <h3>Next Steps</h3>
        <span>{steps.length}</span>
      </div>
      <div className="compact-list">
        {steps.slice(0, 5).map((step) => (
          <div key={step}>
            <p>{step}</p>
          </div>
        ))}
        <MoreIndicator total={steps.length} shown={5} noun="steps" />
      </div>
    </div>
  );
}

function GateList({ gates }: { gates: Gate[] }) {
  if (gates.length === 0) {
    return <p className="muted">No gates are attached to the selected finding.</p>;
  }
  return (
    <div className="gate-list">
      {gates.map((gate) => (
        <div className="gate-row" key={`${gate.gate}-${gate.finding_id ?? 'session'}`}>
          <span className={`gate-status ${gate.status}`}>{gate.status.replaceAll('_', ' ')}</span>
          <strong>{gate.gate.replaceAll('_', ' ')}</strong>
          <p>{gate.message}</p>
          <small>{gate.reads.join(', ')}</small>
        </div>
      ))}
    </div>
  );
}

function RailSkeleton() {
  return (
    <div className="skeleton-stack">
      <span />
      <span />
      <span />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-skeleton">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <FileJson size={32} />
      <h2>No session selected</h2>
      <p>Choose a session from the rail or create a new engagement.</p>
    </div>
  );
}
