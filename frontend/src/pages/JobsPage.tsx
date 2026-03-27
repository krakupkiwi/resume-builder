import { useEffect, useState } from 'react'
import { Plus, ExternalLink, ChevronDown, Trash2, FileText, Sparkles, X, Copy, Check, Pencil } from 'lucide-react'
import { useProfileStore } from '@/store/useProfileStore'
import { jobsApi, coverLettersApi } from '@/api/jobs'
import { cn } from '@/lib/utils'
import { pollTask } from '@/lib/utils'
import { toast } from 'sonner'
import type { JobApplication, JobStatus, CoverLetter } from '@/types'

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  saved:        { label: 'Saved',        color: 'badge-slate' },
  applied:      { label: 'Applied',      color: 'badge-gold' },
  phone_screen: { label: 'Phone Screen', color: 'bg-blue-900/30 border-blue-800/40 text-blue-400 badge' },
  interview:    { label: 'Interview',    color: 'bg-purple-900/30 border-purple-800/40 text-purple-400 badge' },
  offer:        { label: 'Offer',        color: 'badge-green' },
  rejected:     { label: 'Rejected',     color: 'badge-red' },
  withdrawn:    { label: 'Withdrawn',    color: 'badge-slate' },
}

const STATUS_ORDER: JobStatus[] = ['saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn']

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'concise', label: 'Concise' },
  { value: 'formal', label: 'Formal' },
]

function CoverLetterModal({ letter, onClose, onSave }: {
  letter: CoverLetter
  onClose: () => void
  onSave: (updated: CoverLetter) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(letter.body_plain)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = async () => {
    setSaving(true)
    try {
      const paragraphs = text.split('\n\n').filter(p => p.trim())
      const body_html = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
      const updated = await coverLettersApi.update(letter.id, { body_plain: text, body_html })
      onSave(updated)
      setEditing(false)
      toast.success('Cover letter saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-forest-900 border border-forest-400 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-forest-500">
          <div>
            <p className="text-xs font-mono text-gold-500 uppercase tracking-wider">Cover Letter</p>
            <p className="text-xs text-cream-500 mt-0.5">{letter.is_ai_generated ? 'AI Generated' : 'Manual'} · {letter.tone}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="btn-ghost text-xs px-2.5 py-1.5">
              {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-ghost text-xs px-2.5 py-1.5">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={onClose} className="text-cream-500 hover:text-cream-200 transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {editing ? (
            <textarea
              className="textarea-field w-full h-full min-h-[400px] text-sm font-document leading-relaxed resize-none"
              value={text}
              onChange={e => setText(e.target.value)}
              autoFocus
            />
          ) : (
            <div className="font-document text-sm text-cream-200 leading-loose whitespace-pre-wrap">
              {text}
            </div>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-forest-500">
            <button onClick={() => { setEditing(false); setText(letter.body_plain) }} className="btn-ghost text-xs">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function JobRow({ job, profileId, onUpdate, onDelete }: {
  job: JobApplication
  profileId: string
  onUpdate: (j: JobApplication) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [activeLetter, setActiveLetter] = useState<CoverLetter | null>(null)
  const [selectedTone, setSelectedTone] = useState('professional')
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.saved

  // Load cover letters when row is expanded
  useEffect(() => {
    if (expanded && coverLetters.length === 0) {
      coverLettersApi.listByJob(job.id).then(setCoverLetters).catch(() => {})
    }
  }, [expanded])

  const updateStatus = async (status: JobStatus) => {
    const updated = await jobsApi.updateStatus(profileId, job.id, status)
    onUpdate(updated)
  }

  const generateCoverLetter = async () => {
    setGeneratingCover(true)
    try {
      const task = await coverLettersApi.generate(job.id, job.resume_version_id || undefined, selectedTone)
      toast.info('Generating cover letter...')
      pollTask(task.task_id, async (result: any) => {
        if (result?.cover_letter_id) {
          const letter = await coverLettersApi.get(result.cover_letter_id)
          setCoverLetters(prev => [letter, ...prev])
          setActiveLetter(letter)
          toast.success('Cover letter ready!')
        }
        setGeneratingCover(false)
      }, (err) => {
        toast.error(err)
        setGeneratingCover(false)
      })
    } catch {
      toast.error('Failed to generate cover letter')
      setGeneratingCover(false)
    }
  }

  const deleteJob = async () => {
    if (!confirm(`Remove "${job.job_title} at ${job.company_name}"?`)) return
    await jobsApi.delete(profileId, job.id)
    onDelete(job.id)
  }

  return (
    <>
      <div className="panel rounded-lg overflow-hidden animate-fade-in">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-forest-800 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-500 text-cream-200 text-sm">{job.job_title}</span>
              <span className="text-gold-500 text-xs">@</span>
              <span className="text-gold-400 text-sm">{job.company_name}</span>
              {job.location && <span className="text-xs text-cream-500">· {job.location}</span>}
            </div>
            {job.applied_at && <p className="text-xs text-cream-500 mt-0.5">Applied {job.applied_at}</p>}
          </div>
          <span className={cfg.color}>{cfg.label}</span>
          {job.job_url && (
            <a href={job.job_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-cream-500 hover:text-gold-400">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={e => { e.stopPropagation(); deleteJob() }} className="btn-danger p-1.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={cn('w-3.5 h-3.5 text-cream-500 transition-transform', expanded && 'rotate-180')} />
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-forest-500 pt-3 space-y-4">
            {/* Status pipeline */}
            <div>
              <label className="label">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      job.status === s
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                        : 'border-forest-500 text-cream-500 hover:border-forest-400 hover:text-cream-300'
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            {job.notes && (
              <div>
                <label className="label">Notes</label>
                <p className="text-xs text-cream-400">{job.notes}</p>
              </div>
            )}

            {/* Cover letter */}
            <div>
              <label className="label">Cover Letter</label>
              {coverLetters.length > 0 ? (
                <div className="space-y-1.5 mb-2">
                  {coverLetters.map((letter, i) => (
                    <button
                      key={letter.id}
                      onClick={() => setActiveLetter(letter)}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded border border-forest-500 hover:border-forest-400 hover:bg-forest-800 transition-colors text-xs"
                    >
                      <span className="text-cream-300 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gold-400" />
                        Cover Letter {coverLetters.length > 1 ? `#${coverLetters.length - i}` : ''}
                        {letter.is_ai_generated && <span className="badge badge-gold">AI</span>}
                      </span>
                      <span className="text-cream-500">{letter.tone} →</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cream-500 italic mb-2">No cover letter yet</p>
              )}

              <div className="flex gap-2 items-center">
                <select
                  className="input-field text-xs py-1.5 flex-1"
                  value={selectedTone}
                  onChange={e => setSelectedTone(e.target.value)}
                >
                  {TONE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={generateCoverLetter}
                  disabled={generatingCover}
                  className="btn-ghost text-xs border border-forest-500 whitespace-nowrap"
                >
                  {generatingCover
                    ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" /> Generating...</>
                    : <><Sparkles className="w-3.5 h-3.5 text-gold-400" /> Generate</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeLetter && (
        <CoverLetterModal
          letter={activeLetter}
          onClose={() => setActiveLetter(null)}
          onSave={updated => {
            setCoverLetters(prev => prev.map(l => l.id === updated.id ? updated : l))
            setActiveLetter(updated)
          }}
        />
      )}
    </>
  )
}

function AddJobForm({ profileId, onAdded }: { profileId: string, onAdded: (j: JobApplication) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ company_name: '', job_title: '', job_url: '', job_description: '', location: '', remote_type: '', salary_range: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.company_name || !form.job_title) { toast.error('Company and title required'); return }
    setSaving(true)
    try {
      const job = await jobsApi.create(profileId, { ...form, status: 'saved' })
      onAdded(job)
      setOpen(false)
      setForm({ company_name: '', job_title: '', job_url: '', job_description: '', location: '', remote_type: '', salary_range: '', notes: '' })
      toast.success('Application added')
    } catch {
      toast.error('Failed to add')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-ghost border border-dashed border-forest-400 w-full justify-center py-3 text-sm">
      <Plus className="w-4 h-4" /> Add Job Application
    </button>
  )

  return (
    <div className="panel rounded-lg p-4 animate-fade-in">
      <h3 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-3">New Application</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Job Title *</label>
          <input className="input-field text-xs" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Company *</label>
          <input className="input-field text-xs" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Job URL</label>
          <input className="input-field text-xs" placeholder="https://..." value={form.job_url} onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input-field text-xs" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div>
          <label className="label">Remote Type</label>
          <select className="input-field text-xs" value={form.remote_type} onChange={e => setForm(f => ({ ...f, remote_type: e.target.value }))}>
            <option value="">Select...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label className="label">Salary Range</label>
          <input className="input-field text-xs" placeholder="e.g. $80k–$100k" value={form.salary_range} onChange={e => setForm(f => ({ ...f, salary_range: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="label">Job Description</label>
          <textarea className="textarea-field text-xs h-24" placeholder="Paste the full job description..." value={form.job_description} onChange={e => setForm(f => ({ ...f, job_description: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <input className="input-field text-xs" placeholder="Referral, interview notes, etc." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary text-xs">{saving ? 'Adding...' : 'Add Application'}</button>
      </div>
    </div>
  )
}

export function JobsPage() {
  const { activeProfileId } = useProfileStore()
  const [jobs, setJobs] = useState<JobApplication[]>([])

  useEffect(() => {
    if (!activeProfileId) return
    jobsApi.list(activeProfileId).then(setJobs)
  }, [activeProfileId])

  if (!activeProfileId) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-cream-500 text-sm">No profile selected</p>
    </div>
  )

  const active = jobs.filter(j => !['rejected', 'withdrawn'].includes(j.status))
  const archived = jobs.filter(j => ['rejected', 'withdrawn'].includes(j.status))

  return (
    <div className="h-full overflow-auto p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Applications</p>
          <h1 className="font-display text-2xl text-cream-100">Job Pipeline</h1>
          <p className="text-cream-500 text-sm mt-1">{active.length} active · {archived.length} archived</p>
        </div>

        <div className="space-y-2 mb-4">
          {active.map(job => (
            <JobRow
              key={job.id}
              job={job}
              profileId={activeProfileId}
              onUpdate={updated => setJobs(js => js.map(j => j.id === updated.id ? updated : j))}
              onDelete={id => setJobs(js => js.filter(j => j.id !== id))}
            />
          ))}
        </div>

        <AddJobForm profileId={activeProfileId} onAdded={j => setJobs(prev => [j, ...prev])} />

        {archived.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-mono text-cream-500 uppercase tracking-wider mb-3">Archived</h2>
            <div className="space-y-2 opacity-60">
              {archived.map(job => (
                <JobRow key={job.id} job={job} profileId={activeProfileId}
                  onUpdate={updated => setJobs(js => js.map(j => j.id === updated.id ? updated : j))}
                  onDelete={id => setJobs(js => js.filter(j => j.id !== id))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
