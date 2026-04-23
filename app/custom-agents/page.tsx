'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  listCustomAgents,
  deleteCustomAgent as deleteAgent,
  createCustomAgent as createAgent,
  type CustomAgent,
  type CustomAgentTask as Task,
  type BaseDocument as BaseDoc,
} from '@/lib/client-store';

export default function CustomAgentsPage() {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadAgents() {
    setAgents(listCustomAgents());
    setLoading(false);
  }

  useEffect(() => { loadAgents(); }, []);

  function handleDelete(id: string) {
    if (!confirm('Delete this custom agent? This cannot be undone.')) return;
    deleteAgent(id);
    loadAgents();
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-thermax-navy">Custom Agent Builder</h1>
          <p className="text-thermax-slate text-sm mt-1">
            Create standalone AI agents with custom instructions, tasks, and file processing capabilities.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
            showForm
              ? 'bg-thermax-slate/10 text-thermax-slate hover:bg-thermax-slate/20'
              : 'bg-gradient-to-r from-thermax-navy to-thermax-navyDeep text-white hover:shadow-lg'
          }`}
        >
          {showForm ? '← Back to Agents' : '+ Create New Agent'}
        </button>
      </div>

      {showForm ? (
        <CreateAgentForm
          onCreated={() => { setShowForm(false); loadAgents(); }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <>
          {loading ? (
            <div className="text-center py-20 text-thermax-slate">Loading agents...</div>
          ) : agents.length === 0 ? (
            <EmptyState onCreateClick={() => setShowForm(true)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} onDelete={() => handleDelete(agent.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-thermax-line">
      <div className="text-5xl mb-4">🤖</div>
      <h2 className="text-lg font-bold text-thermax-navy mb-2">No Custom Agents Yet</h2>
      <p className="text-thermax-slate text-sm mb-6 max-w-md mx-auto">
        Create your first AI agent by defining its name, purpose, tasks, and what files it should process.
        Your agent will be ready to chat and analyze documents instantly.
      </p>
      <button
        onClick={onCreateClick}
        className="px-6 py-3 bg-gradient-to-r from-thermax-navy to-thermax-navyDeep text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition"
      >
        + Create Your First Agent
      </button>
    </div>
  );
}

function AgentCard({ agent, onDelete }: { agent: CustomAgent; onDelete: () => void }) {
  const timeAgo = getTimeAgo(agent.createdAt);

  return (
    <div className="bg-white rounded-2xl border border-thermax-line shadow-card overflow-hidden hover:shadow-lg transition group">
      <div className="h-24 relative" style={{ background: `linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)` }}>
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-xl border-4 border-white shadow-md overflow-hidden bg-thermax-mist">
            {agent.avatarUrl ? (
              <Image src={agent.avatarUrl} alt={agent.name} width={64} height={64} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-thermax-saffron to-thermax-saffronDeep text-white font-bold">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white font-medium">
            Custom Agent
          </span>
        </div>
      </div>

      <div className="pt-10 px-4 pb-4">
        <h3 className="font-bold text-thermax-navy text-sm truncate">{agent.name}</h3>
        <p className="text-[11px] text-thermax-slate mt-1 leading-snug line-clamp-2">{agent.description}</p>

        <div className="flex items-center gap-3 mt-3 text-[10px] text-thermax-slate">
          <span>{agent.tasks.length} task{agent.tasks.length !== 1 ? 's' : ''}</span>
          {agent.baseDocuments?.length > 0 && (<><span>·</span><span>{agent.baseDocuments.length} doc{agent.baseDocuments.length !== 1 ? 's' : ''}</span></>)}
          <span>·</span>
          <span>{agent.runCount} run{agent.runCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>

        {agent.tasks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.tasks.slice(0, 3).map(t => (
              <span key={t.id} className="px-2 py-0.5 bg-thermax-mist text-thermax-navy text-[10px] rounded-full font-medium truncate max-w-[140px]">
                {t.label}
              </span>
            ))}
            {agent.tasks.length > 3 && (
              <span className="px-2 py-0.5 bg-thermax-mist text-thermax-slate text-[10px] rounded-full">
                +{agent.tasks.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <Link
            href={`/custom-agents/${agent.id}`}
            className="flex-1 text-center py-2 bg-thermax-navy text-white text-xs font-semibold rounded-lg hover:bg-thermax-navyDeep transition"
          >
            Run Agent →
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAgentForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tasks, setTasks] = useState<Task[]>([{ id: '1', label: '', description: '' }]);
  const [acceptedFiles, setAcceptedFiles] = useState('');
  const [baseDocs, setBaseDocs] = useState<BaseDoc[]>([]);
  const [docUploadError, setDocUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Avatar must be under 5 MB'); return; }
    setAvatarPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
    };
    reader.onerror = () => setError('Failed to read avatar');
    reader.readAsDataURL(file);
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDocUploadError('');
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setDocUploadError(data.error ?? 'Upload failed'); return; }
      const newDocs: BaseDoc[] = (data.files ?? []).map((f: { filename: string; text: string; size: number }) => ({
        filename: f.filename, text: f.text, sizeKb: parseFloat((f.text.length / 1024).toFixed(1))
      }));
      setBaseDocs(prev => [...prev, ...newDocs]);
      if (data.errors?.length) setDocUploadError(data.errors.join('; '));
    } catch {
      setDocUploadError('Document upload failed');
    } finally {
      if (docInputRef.current) docInputRef.current.value = '';
    }
  }

  function addTask() {
    setTasks(prev => [...prev, { id: String(Date.now()), label: '', description: '' }]);
  }

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function updateTask(id: string, field: 'label' | 'description', value: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('Agent name is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!instructions.trim()) { setError('Instructions are required'); return; }

    setSaving(true);
    try {
      createAgent({
        name: name.trim(),
        avatarUrl,
        description: description.trim(),
        instructions: instructions.trim(),
        tasks: tasks.filter(t => t.label.trim()),
        baseDocuments: baseDocs,
        acceptedFiles: acceptedFiles.trim(),
      });
      onCreated();
    } catch {
      setError('Failed to create agent');
      setSaving(false);
    }
  }

  const totalSteps = 5;
  const canNext = step === 1
    ? name.trim().length > 0
    : step === 2
    ? description.trim().length > 0
    : step === 3
    ? instructions.trim().length > 0
    : true;

  const STEPS = [
    { n: 1, label: 'Identity' },
    { n: 2, label: 'Purpose' },
    { n: 3, label: 'Instructions' },
    { n: 4, label: 'Data & Files' },
    { n: 5, label: 'Review' }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-1.5 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1.5">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition ${
                s.n === step
                  ? 'bg-thermax-navy text-white'
                  : s.n < step
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer'
                  : 'bg-thermax-mist text-thermax-slate'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {s.n < step ? '✓' : s.n}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="text-thermax-slate/30 text-sm">—</span>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-thermax-line shadow-card p-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-thermax-navy">Step 1: Agent Identity</h2>
            <p className="text-sm text-thermax-slate">Give your agent a name and a human-like avatar to represent it.</p>
            <div>
              <label className="block text-xs font-semibold text-thermax-navy mb-1.5">Agent Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., Compliance Audit Agent, Customer Insights Analyst..."
                className="w-full px-4 py-2.5 border border-thermax-line rounded-xl text-sm focus:ring-2 focus:ring-thermax-navy/20 focus:border-thermax-navy outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-thermax-navy mb-1.5">Agent Avatar</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-thermax-line overflow-hidden bg-thermax-mist flex items-center justify-center cursor-pointer hover:border-thermax-navy/40 transition"
                  onClick={() => avatarInputRef.current?.click()}>
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <div className="text-center"><div className="text-2xl">📷</div><div className="text-[9px] text-thermax-slate mt-0.5">Upload</div></div>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <div className="text-xs text-thermax-slate">
                  <p>Upload a photo or image that represents your agent.</p>
                  <p className="mt-0.5 text-[10px]">JPEG, PNG, WebP, GIF · Max 5 MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-thermax-navy">Step 2: Purpose & Tasks</h2>
            <p className="text-sm text-thermax-slate">Define what your agent does and the specific tasks it should perform.</p>
            <div>
              <label className="block text-xs font-semibold text-thermax-navy mb-1.5">Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe the agent's purpose in plain English. e.g., 'This agent analyzes quarterly financial reports to identify cost-saving opportunities and revenue trends.'"
                className="w-full px-4 py-2.5 border border-thermax-line rounded-xl text-sm focus:ring-2 focus:ring-thermax-navy/20 focus:border-thermax-navy outline-none resize-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-thermax-navy">Tasks</label>
                <button onClick={addTask} className="text-xs text-thermax-navy font-semibold hover:underline">+ Add Task</button>
              </div>
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <div key={task.id} className="p-3 bg-thermax-mist rounded-xl border border-thermax-line">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-thermax-slate uppercase">Task {idx + 1}</span>
                      {tasks.length > 1 && (
                        <button onClick={() => removeTask(task.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">×</button>
                      )}
                    </div>
                    <input value={task.label} onChange={e => updateTask(task.id, 'label', e.target.value)}
                      placeholder="Task name (e.g., Analyze Revenue Trends)"
                      className="w-full px-3 py-2 border border-thermax-line rounded-lg text-xs mb-2 focus:ring-1 focus:ring-thermax-navy/20 outline-none" />
                    <input value={task.description} onChange={e => updateTask(task.id, 'description', e.target.value)}
                      placeholder="Brief description of what this task does"
                      className="w-full px-3 py-2 border border-thermax-line rounded-lg text-xs focus:ring-1 focus:ring-thermax-navy/20 outline-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-thermax-navy">Step 3: Instructions & Accepted File Types</h2>
            <p className="text-sm text-thermax-slate">Tell your agent exactly how to behave, what to focus on, and what files it should accept.</p>
            <div>
              <label className="block text-xs font-semibold text-thermax-navy mb-1.5">Detailed Instructions *</label>
              <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={8}
                placeholder={`Write your instructions in plain English. Be as specific as you need. For example:\n\n"When you receive financial data, focus on:\n1. Revenue growth trends quarter over quarter\n2. Top 5 cost categories and their % change\n3. Cash flow health indicators\n4. Flag any anomalies or outliers\n\nAlways present findings in tables with clear headers. Include a confidence score for each finding."`}
                className="w-full px-4 py-3 border border-thermax-line rounded-xl text-sm focus:ring-2 focus:ring-thermax-navy/20 focus:border-thermax-navy outline-none resize-none font-mono text-[12px] leading-relaxed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-thermax-navy mb-1.5">Accepted File Types</label>
              <textarea value={acceptedFiles} onChange={e => setAcceptedFiles(e.target.value)} rows={2}
                placeholder="e.g., Financial reports, P&L statements, balance sheets, budget spreadsheets, cost breakdowns"
                className="w-full px-4 py-2.5 border border-thermax-line rounded-xl text-sm focus:ring-2 focus:ring-thermax-navy/20 focus:border-thermax-navy outline-none resize-none" />
              <p className="text-[10px] text-thermax-slate mt-1">Describe the types of documents this agent should process. Unrelated files will be rejected.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-thermax-navy">Step 4: Upload Base Knowledge Documents</h2>
            <p className="text-sm text-thermax-slate">
              Upload data files that your agent should always have access to as its knowledge base.
              These files will be included every time you chat with the agent. You can also upload more files at runtime.
            </p>
            <div className="p-4 bg-thermax-mist rounded-xl border border-thermax-line">
              <input ref={docInputRef} type="file" multiple accept=".txt,.md,.csv,.tsv,.log" onChange={handleDocUpload}
                className="text-[12px] file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-thermax-navy file:text-white file:font-semibold hover:file:bg-thermax-navyDeep file:cursor-pointer w-full" />
              <p className="text-[11px] text-thermax-slate mt-2">Select one or more files (.txt, .md, .csv, .tsv, .log) · Max 200 KB per file · Up to 10 files</p>
            </div>
            {baseDocs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-thermax-navy">Uploaded Documents ({baseDocs.length})</div>
                {baseDocs.map((doc, idx) => (
                  <div key={`${doc.filename}-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-white border border-thermax-line rounded-xl">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-thermax-navy text-xs truncate">{doc.filename}</div>
                      <div className="text-[10px] text-thermax-slate">{doc.sizeKb} KB</div>
                    </div>
                    <button onClick={() => setBaseDocs(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 font-bold text-sm shrink-0" title="Remove">×</button>
                  </div>
                ))}
                <button onClick={() => setBaseDocs([])} className="text-[11px] text-thermax-saffronDeep font-semibold hover:underline">Remove all documents</button>
              </div>
            )}
            {baseDocs.length === 0 && (
              <div className="text-center py-6 text-thermax-slate text-xs">
                No documents uploaded yet. This step is optional — you can skip it and upload files when running the agent.
              </div>
            )}
            {docUploadError && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{docUploadError}</div>}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-thermax-navy">Step 5: Review & Create</h2>
            <p className="text-sm text-thermax-slate">Review your agent configuration before creating it.</p>
            <div className="bg-thermax-mist rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shadow-sm">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt={name} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-thermax-saffron to-thermax-saffronDeep text-white font-bold">
                      {name.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-thermax-navy">{name || 'Unnamed Agent'}</h3>
                  <p className="text-xs text-thermax-slate">Custom AI Agent</p>
                </div>
              </div>
              <ReviewField label="Description" value={description} />
              <ReviewField label="Instructions" value={instructions} mono />
              <ReviewField label="Accepted Files" value={acceptedFiles || 'Any text-based documents'} />
              {tasks.filter(t => t.label.trim()).length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-thermax-slate uppercase mb-1.5">Tasks ({tasks.filter(t => t.label.trim()).length})</div>
                  <div className="space-y-1">
                    {tasks.filter(t => t.label.trim()).map((t, i) => (
                      <div key={t.id} className="flex items-start gap-2 text-xs">
                        <span className="text-thermax-saffronDeep font-bold">{i + 1}.</span>
                        <span><strong className="text-thermax-navy">{t.label}</strong>{t.description && ` — ${t.description}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {baseDocs.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-thermax-slate uppercase mb-1.5">Knowledge Base ({baseDocs.length} document{baseDocs.length !== 1 ? 's' : ''})</div>
                  <div className="space-y-1">
                    {baseDocs.map((d, i) => (
                      <div key={i} className="text-xs text-thermax-navy">📄 {d.filename} ({d.sizeKb} KB)</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-thermax-line">
          <button onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
            className="px-4 py-2 text-sm text-thermax-slate hover:text-thermax-navy transition font-medium">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-thermax-slate">Step {step} of {totalSteps}</span>
            {step < totalSteps ? (
              <button onClick={() => setStep(step + 1)} disabled={!canNext}
                className="px-5 py-2 bg-thermax-navy text-white text-sm font-semibold rounded-xl hover:bg-thermax-navyDeep transition disabled:opacity-40 disabled:cursor-not-allowed">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-60">
                {saving ? 'Creating...' : '✓ Create Agent'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-thermax-slate uppercase mb-1">{label}</div>
      <div className={`text-xs text-thermax-navy leading-relaxed whitespace-pre-wrap ${mono ? 'font-mono text-[11px] bg-white p-2 rounded-lg border border-thermax-line' : ''}`}>
        {value || <span className="text-thermax-slate italic">Not specified</span>}
      </div>
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
