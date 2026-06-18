import { ArrowDown, ArrowUp, Clipboard, FileJson, GitBranch, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  createSession,
  Finding,
  Gate,
  listSessions,
  PatchOp,
  patchSession,
  readSession,
  SessionDetail,
  SessionListItem,
  TrustBoundary,
  validateTarget,
} from './api';
import { clearHistory, PromptHistoryEntry, readHistory, recordPrompt } from './promptHistory';

const PHASES = ['intake', 'domain', 'verification', 'reporting', 'indexing'];

export function App() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [newEngagementId, setNewEngagementId] = useState('');
  const [newTargetPath, setNewTargetPath] = useState('');
  const [targetHint, setTargetHint] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

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
      setHistory([]);
      return;
    }

    setHistory(readHistory(selectedPath));
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
    const targetPath = newTargetPath.trim();
    if (!engagementId) return;
    setError(null);
    setTargetHint(null);
    try {
      let validatedTarget: string | undefined;
      if (targetPath) {
        const validation = await validateTarget(targetPath);
        validatedTarget = validation.path;
        if (!validation.looks_like_rust) {
          setTargetHint('No Cargo.toml found in this folder. Confirm it is the right Rust target.');
        }
      }
      const created = await createSession(engagementId, validatedTarget);
      setNewEngagementId('');
      setNewTargetPath('');
      await refreshSessions(created.session_path);
      setDetail(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSaveStatus() {
    if (!selectedFinding?.id || !statusDraft.trim()) return;
    await applyPatch([{ kind: 'update_finding_status', finding_id: selectedFinding.id, status: statusDraft.trim() }]);
  }

  async function applyPatch(operations: PatchOp[]) {
    if (!detail) return;
    setError(null);
    try {
      const updated = await patchSession(detail.session_path, detail.mtime_ns, operations);
      setDetail(updated);
      const nextFindings = getFindings(updated);
      setSelectedFindingId((current) =>
        current && nextFindings.some((finding) => finding.id === current) ? current : (nextFindings[0]?.id ?? null),
      );
      await refreshSessions(updated.session_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function copyPrompt(prompt: string | null | undefined, source: string) {
    if (!prompt || !detail) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setHistory(recordPrompt(detail.session_path, prompt, source));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleClearHistory() {
    if (!detail) return;
    clearHistory(detail.session_path);
    setHistory([]);
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
          <div className="inline-form stacked">
            <input
              id="engagement-id"
              value={newEngagementId}
              onChange={(event) => setNewEngagementId(event.target.value)}
              placeholder="halo2-gadgets-2026-06-12"
            />
            <input
              value={newTargetPath}
              onChange={(event) => setNewTargetPath(event.target.value)}
              placeholder="/absolute/path/to/rust/crate"
            />
            <div className="form-footer">
              {targetHint ? <p className="hint-note">{targetHint}</p> : <span />}
              <button className="icon-button strong" aria-label="Create engagement" onClick={() => void handleCreateSession()}>
                <Plus size={18} />
              </button>
            </div>
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
              <TargetsPanel
                targets={getTargets(detail)}
                onPatch={(operations) => void applyPatch(operations)}
                onValidateTarget={validateTarget}
                setError={setError}
              />
            </section>

            <section className="section-block">
              <FindingMatrix
                detail={detail}
                findings={findings}
                selectedFinding={selectedFinding}
                onSelect={setSelectedFindingId}
                onPatch={(operations) => void applyPatch(operations)}
              />
            </section>

            <section className="section-block split">
              <TrustBoundaryPanel boundaries={getTrustBoundaries(detail)} onPatch={(operations) => void applyPatch(operations)} />
              <NextStepsPanel steps={detail.session.next_steps ?? []} onPatch={(operations) => void applyPatch(operations)} />
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
          <GateList gates={selectedGates} onCopy={(gate) => void copyPrompt(gate.prompt, gate.gate)} />
        </section>

        <section className="panel-section prompt-panel">
          <div className="section-title">
            <h3>Next Prompt</h3>
            <button
              className="text-button"
              onClick={() => void copyPrompt(detail?.derived.next_action?.prompt, 'next action')}
            >
              <Clipboard size={16} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre>{detail?.derived.next_action?.prompt ?? 'Select a session to generate the next Codex prompt.'}</pre>
        </section>

        {detail ? <PromptHistoryPanel history={history} onClear={handleClearHistory} /> : null}
      </aside>
    </main>
  );
}

function PromptHistoryPanel({ history, onClear }: { history: PromptHistoryEntry[]; onClear: () => void }) {
  if (history.length === 0) return null;
  return (
    <section className="panel-section">
      <div className="section-title">
        <h3>Prompt History</h3>
        <button className="text-button ghost" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="history-list">
        {history.map((entry) => (
          <div className="history-entry" key={`${entry.at}-${entry.source}`}>
            <small>{entry.source}</small>
            <pre>{entry.prompt}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}

function getFindings(detail: SessionDetail): Finding[] {
  return [...(detail.session?.open_findings ?? []), ...(detail.session?.verified_findings ?? [])];
}

function getTargets(detail: SessionDetail): string[] {
  const value = detail.session?.targets;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getTrustBoundaries(detail: SessionDetail): TrustBoundary[] {
  const value = detail.session?.trust_boundaries;
  return Array.isArray(value) ? value.filter((item): item is TrustBoundary => Boolean(item) && typeof item === 'object') : [];
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

function TargetsPanel({
  targets,
  onPatch,
  onValidateTarget,
  setError,
}: {
  targets: string[];
  onPatch: (operations: PatchOp[]) => void;
  onValidateTarget: typeof validateTarget;
  setError: (message: string | null) => void;
}) {
  const [newTarget, setNewTarget] = useState('');
  const [editing, setEditing] = useState<Record<number, string>>({});

  async function validate(raw: string): Promise<string | null> {
    const target = raw.trim();
    if (!target) return null;
    try {
      const validation = await onValidateTarget(target);
      if (!validation.looks_like_rust) {
        setError('No Cargo.toml found for that target. It was accepted, but confirm the path is intentional.');
      }
      return validation.path;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async function addTarget() {
    const path = await validate(newTarget);
    if (!path) return;
    onPatch([{ kind: 'add_target', value: path }]);
    setNewTarget('');
  }

  async function saveTarget(index: number) {
    const path = await validate(editing[index] ?? targets[index] ?? '');
    if (!path) return;
    onPatch([{ kind: 'edit_target', index, value: path }]);
  }

  return (
    <div>
      <div className="section-title">
        <h3>Targets</h3>
        <span>{targets.length}</span>
      </div>
      <div className="edit-list">
        {targets.length === 0 ? <p className="muted">No target paths recorded.</p> : null}
        {targets.map((target, index) => (
          <div className="edit-row target-row" key={`${target}-${index}`}>
            <input
              value={editing[index] ?? target}
              onChange={(event) => setEditing((current) => ({ ...current, [index]: event.target.value }))}
            />
            <button className="icon-button" aria-label="Save target" onClick={() => void saveTarget(index)}>
              <Save size={16} />
            </button>
            <button className="icon-button danger" aria-label="Remove target" onClick={() => onPatch([{ kind: 'remove_target', index }])}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="edit-row target-row">
          <input value={newTarget} onChange={(event) => setNewTarget(event.target.value)} placeholder="/absolute/path/to/target" />
          <button className="icon-button strong" aria-label="Add target" onClick={() => void addTarget()}>
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FindingMatrix({
  detail,
  findings,
  selectedFinding,
  onSelect,
  onPatch,
}: {
  detail: SessionDetail;
  findings: Finding[];
  selectedFinding: Finding | null;
  onSelect: (findingId: string | null) => void;
  onPatch: (operations: PatchOp[]) => void;
}) {
  const [draft, setDraft] = useState({ id: '', status: 'unverified', summary: '' });
  const canAdd = Boolean(draft.id.trim());

  function addFinding() {
    if (!canAdd) return;
    onPatch([{ kind: 'add_finding', finding: cleanFinding(draft) }]);
    setDraft({ id: '', status: 'unverified', summary: '' });
  }

  return (
    <>
      <div className="section-title">
        <h3>Finding Candidate Matrix</h3>
        <span>{findings.length} findings</span>
      </div>
      <div className="finding-add-row">
        <input value={draft.id} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} placeholder="F-01" />
        <input
          value={draft.status}
          onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
          placeholder="unverified"
        />
        <input
          value={draft.summary}
          onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
          placeholder="Candidate finding summary"
        />
        <button className="icon-button strong" aria-label="Add finding" disabled={!canAdd} onClick={addFinding}>
          <Plus size={16} />
        </button>
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
            <span />
          </div>
          {findings.map((finding) => (
            <div className={`finding-row ${selectedFinding?.id === finding.id ? 'active' : ''}`} key={`${finding.id}-${finding.title ?? finding.summary}`}>
              <button className="row-select" onClick={() => onSelect(finding.id ?? null)}>
                <span>{finding.id ?? 'unknown'}</span>
                <Disposition finding={finding} detail={detail} />
                <strong>{finding.title ?? finding.summary ?? finding.description ?? 'No summary'}</strong>
                <span>{finding.owner_skill ?? String(finding.routing ?? 'unassigned')}</span>
              </button>
              <button
                className="icon-button danger"
                aria-label="Remove finding"
                disabled={!finding.id || !detail.session?.open_findings?.some((item) => item.id === finding.id)}
                onClick={() => finding.id && onPatch([{ kind: 'remove_finding', finding_id: finding.id }])}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TrustBoundaryPanel({
  boundaries,
  onPatch,
}: {
  boundaries: TrustBoundary[];
  onPatch: (operations: PatchOp[]) => void;
}) {
  const [draft, setDraft] = useState({ name: '', assumption: '', evidence: '' });
  const [edits, setEdits] = useState<Record<number, { name: string; assumption: string; evidence: string }>>({});

  function editFor(boundary: TrustBoundary, index: number) {
    return (
      edits[index] ?? {
        name: String(boundary.name ?? ''),
        assumption: String(boundary.assumption ?? boundary.description ?? ''),
        evidence: String(boundary.evidence ?? ''),
      }
    );
  }

  function setEdit(index: number, field: 'name' | 'assumption' | 'evidence', value: string) {
    setEdits((current) => ({ ...current, [index]: { ...editFor(boundaries[index] ?? {}, index), [field]: value } }));
  }

  function addBoundary() {
    if (!draft.name.trim()) return;
    onPatch([{ kind: 'add_trust_boundary', boundary: cleanBoundary(draft) }]);
    setDraft({ name: '', assumption: '', evidence: '' });
  }

  return (
    <div>
      <div className="section-title">
        <h3>Trust Boundaries</h3>
        <span>{boundaries.length}</span>
      </div>
      <div className="edit-list">
        {boundaries.length === 0 ? <p className="muted">No trust boundaries recorded.</p> : null}
        {boundaries.map((boundary, index) => {
          const edit = editFor(boundary, index);
          return (
            <div className="edit-card" key={`${edit.name}-${index}`}>
              <input value={edit.name} onChange={(event) => setEdit(index, 'name', event.target.value)} placeholder="Boundary name" />
              <textarea
                value={edit.assumption}
                onChange={(event) => setEdit(index, 'assumption', event.target.value)}
                placeholder="Assumption"
              />
              <textarea value={edit.evidence} onChange={(event) => setEdit(index, 'evidence', event.target.value)} placeholder="Evidence" />
              <div className="row-actions">
                <button className="icon-button" aria-label="Save trust boundary" onClick={() => onPatch([{ kind: 'edit_trust_boundary', index, boundary: cleanBoundary(edit) }])}>
                  <Save size={16} />
                </button>
                <button className="icon-button danger" aria-label="Remove trust boundary" onClick={() => onPatch([{ kind: 'remove_trust_boundary', index }])}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        <div className="edit-card">
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Boundary name" />
          <textarea
            value={draft.assumption}
            onChange={(event) => setDraft((current) => ({ ...current, assumption: event.target.value }))}
            placeholder="Assumption"
          />
          <textarea
            value={draft.evidence}
            onChange={(event) => setDraft((current) => ({ ...current, evidence: event.target.value }))}
            placeholder="Evidence"
          />
          <div className="row-actions">
            <button className="icon-button strong" aria-label="Add trust boundary" onClick={addBoundary}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanBoundary(boundary: { name: string; assumption: string; evidence: string }): Record<string, string> {
  return cleanFields(boundary);
}

function cleanFinding(finding: { id: string; status: string; summary: string }): Record<string, string> {
  return { ...cleanFields(finding), id: finding.id.trim() };
}

function cleanFields(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
}

function NextStepsPanel({ steps, onPatch }: { steps: string[]; onPatch: (operations: PatchOp[]) => void }) {
  const [draft, setDraft] = useState('');
  const [edits, setEdits] = useState<Record<number, string>>({});

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const order = steps.map((_, itemIndex) => itemIndex);
    [order[index], order[target]] = [order[target], order[index]];
    onPatch([{ kind: 'reorder_next_steps', order }]);
  }

  return (
    <div>
      <div className="section-title">
        <h3>Next Steps</h3>
        <span>{steps.length}</span>
      </div>
      <div className="edit-list">
        {steps.length === 0 ? <p className="muted">No next steps recorded.</p> : null}
        {steps.map((step, index) => (
          <div className="edit-row step-row" key={`${step}-${index}`}>
            <input value={edits[index] ?? step} onChange={(event) => setEdits((current) => ({ ...current, [index]: event.target.value }))} />
            <button className="icon-button" aria-label="Move step up" disabled={index === 0} onClick={() => moveStep(index, -1)}>
              <ArrowUp size={16} />
            </button>
            <button className="icon-button" aria-label="Move step down" disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}>
              <ArrowDown size={16} />
            </button>
            <button className="icon-button" aria-label="Save next step" onClick={() => onPatch([{ kind: 'edit_next_step', index, value: (edits[index] ?? step).trim() }])}>
              <Save size={16} />
            </button>
            <button className="icon-button danger" aria-label="Remove next step" onClick={() => onPatch([{ kind: 'remove_next_step', index }])}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="edit-row step-row add-row">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Next action to preserve in session state" />
          <button
            className="icon-button strong"
            aria-label="Add next step"
            onClick={() => {
              if (!draft.trim()) return;
              onPatch([{ kind: 'append_next_step', text: draft.trim() }]);
              setDraft('');
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function GateList({ gates, onCopy }: { gates: Gate[]; onCopy: (gate: Gate) => void }) {
  if (gates.length === 0) {
    return <p className="muted">No gates are attached to the selected finding.</p>;
  }
  return (
    <div className="gate-list">
      {gates.map((gate) => (
        <div className="gate-row" key={`${gate.gate}-${gate.finding_id ?? 'session'}`}>
          <div className="gate-row-head">
            <span className={`gate-status ${gate.status}`}>{gate.status.replaceAll('_', ' ')}</span>
            {gate.prompt ? (
              <button className="icon-button" aria-label="Copy gate prompt" onClick={() => onCopy(gate)}>
                <Clipboard size={15} />
              </button>
            ) : null}
          </div>
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
