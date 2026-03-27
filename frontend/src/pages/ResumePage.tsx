import { useEffect, useState } from 'react'
import { Plus, Download, RefreshCw, FileText, Palette } from 'lucide-react'
import { useProfileStore } from '@/store/useProfileStore'
import { useResumeStore } from '@/store/useResumeStore'
import { useAIStore } from '@/store/useAIStore'
import { resumesApi } from '@/api/resumes'
import { aiApi, previewUrl } from '@/api/ai'
import { apiClient } from '@/api/client'
import { AIChatPanel } from '@/components/layout/AIChatPanel'
import { DocumentPreview } from '@/components/layout/DocumentPreview'
import { StylesModal } from '@/components/StylesModal'
import { cn } from '@/lib/utils'
import { pollTask } from '@/lib/utils'
import { toast } from 'sonner'
import type { ResumeVersion } from '@/types'

function SectionsSidebar({
  resume,
  onUpdate,
}: {
  resume: ResumeVersion
  onUpdate: (r: ResumeVersion) => void
}) {
  const { experiences } = useProfileStore()
  const { activeProfileId } = useProfileStore()
  const [jobDesc, setJobDesc] = useState(resume.job_description || '')
  const [analyzing, setAnalyzing] = useState(false)
  const { setGapAnalysis } = useAIStore()
  const [previewKey, setPreviewKey] = useState(0)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showStyles, setShowStyles] = useState(false)

  const selectedIds = resume.selected_experience_ids || []

  const toggleExp = async (id: string) => {
    if (togglingId) return
    setTogglingId(id)
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    if (!activeProfileId) { setTogglingId(null); return }
    try {
      const updated = await resumesApi.update(activeProfileId, resume.id, { selected_experience_ids: next })
      onUpdate(updated)
      setPreviewKey(k => k + 1)
    } finally {
      setTogglingId(null)
    }
  }

  const saveJobDesc = async () => {
    if (!activeProfileId) return
    const updated = await resumesApi.update(activeProfileId, resume.id, { job_description: jobDesc })
    onUpdate(updated)
  }

  const runAnalysis = async () => {
    if (!jobDesc.trim()) { toast.error('Paste a job description first'); return }
    await saveJobDesc()
    setAnalyzing(true)
    try {
      const task = await aiApi.runGapAnalysis(resume.id, jobDesc)
      toast.info('Gap analysis running...')
      const cancel = pollTask(
        task.task_id,
        (result) => {
          setGapAnalysis(result as any)
          toast.success('Gap analysis complete!')
          setAnalyzing(false)
        },
        (err) => {
          toast.error(err)
          setAnalyzing(false)
        }
      )
    } catch {
      toast.error('Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const exportDoc = async (format: 'docx' | 'pdf') => {
    try {
      const task = await apiClient.post('/documents/generate', {
        resume_version_id: resume.id,
        format,
        template_name: resume.template_name,
      }).then(r => r.data)

      toast.info(`Generating ${format.toUpperCase()}...`)
      pollTask(task.task_id, (result: any) => {
        window.open(`/api/v1/documents/${result.document_id}/download`, '_blank')
        toast.success(`${format.toUpperCase()} ready!`)
      }, (err) => toast.error(err))
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="w-[220px] shrink-0 flex flex-col bg-forest-900 border-r border-forest-500 overflow-hidden">
      {/* Resume name */}
      <div className="px-4 py-3 border-b border-forest-500 shrink-0">
        <p className="text-xs font-mono text-cream-500 uppercase tracking-wider mb-1">Résumé</p>
        <p className="font-display text-sm text-gold-400 truncate">{resume.name}</p>
      </div>

      {/* Styles modal */}
      {showStyles && (
        <StylesModal
          currentTemplateName={resume.template_name}
          currentStyleConfig={resume.style_config || {}}
          onApply={async (templateName, styleConfig) => {
            if (!activeProfileId) return
            const updated = await resumesApi.update(activeProfileId, resume.id, {
              template_name: templateName,
              style_config: styleConfig,
            })
            onUpdate(updated)
            setPreviewKey(k => k + 1)
            setShowStyles(false)
            toast.success('Style applied')
          }}
          onClose={() => setShowStyles(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Style */}
        <div>
          <label className="label">Style</label>
          <button
            onClick={() => setShowStyles(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded border border-forest-500 hover:border-forest-400 text-xs text-cream-400 hover:text-cream-200 transition-colors bg-forest-800/40"
          >
            <div className="flex items-center gap-2">
              {resume.style_config?.accent_color && (
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                  style={{ background: resume.style_config.accent_color }}
                />
              )}
              <span className="capitalize">
                {resume.template_name}
                {resume.style_config?.font ? ` · ${resume.style_config.font}` : ''}
              </span>
            </div>
            <Palette className="w-3.5 h-3.5 text-gold-400" />
          </button>
        </div>

        {/* Sections toggle */}
        <div>
          <label className="label">Sections</label>
          {['summary', 'experience', 'skills', 'education'].map(sec => {
            const cfg = resume.sections_config?.[sec] || {}
            const visible = cfg.visible !== false
            return (
              <div key={sec} className="flex items-center justify-between py-1.5 border-b border-forest-700 last:border-0">
                <span className="text-xs text-cream-300 capitalize">{cfg.title || sec}</span>
                <button
                  onClick={async () => {
                    if (!activeProfileId) return
                    const newCfg = { ...resume.sections_config, [sec]: { ...(resume.sections_config?.[sec] || {}), visible: !visible } }
                    const updated = await resumesApi.update(activeProfileId, resume.id, { sections_config: newCfg })
                    onUpdate(updated)
                    setPreviewKey(k => k + 1)
                  }}
                  className={cn('text-xs font-mono px-2 py-0.5 rounded', visible ? 'text-green-400 bg-green-900/30' : 'text-cream-500 bg-forest-700')}
                >
                  {visible ? 'ON' : 'OFF'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Experience selection */}
        <div>
          <label className="label">Experience ({selectedIds.length} selected)</label>
          <div className="space-y-1">
            {experiences.map(exp => (
              <button
                key={exp.id}
                onClick={() => toggleExp(exp.id)}
                disabled={togglingId !== null}
                className={cn(
                  'w-full text-left text-xs px-2.5 py-1.5 rounded border transition-colors',
                  selectedIds.includes(exp.id)
                    ? 'border-gold-500/50 bg-gold-500/10 text-cream-200'
                    : 'border-forest-500 text-cream-500 hover:border-forest-400',
                  togglingId === exp.id && 'opacity-60'
                )}
              >
                {togglingId === exp.id ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
                    <span>Updating...</span>
                  </span>
                ) : (
                  <>
                    <span className="font-500">{exp.job_title}</span>
                    <span className="text-cream-500"> @ {exp.company_name}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Job description */}
        <div>
          <label className="label">Job Description</label>
          <textarea
            className="textarea-field text-xs h-28"
            placeholder="Paste the job advertisement here..."
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
          />
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="btn-primary w-full justify-center text-xs mt-2"
          >
            {analyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysing...</> : <><RefreshCw className="w-3.5 h-3.5" /> Analyse Gap</>}
          </button>
        </div>

        {/* Export */}
        <div>
          <label className="label">Export</label>
          <div className="flex gap-2">
            <button onClick={() => exportDoc('docx')} className="btn-ghost flex-1 justify-center text-xs border border-forest-500 py-2">
              <FileText className="w-3.5 h-3.5" /> Word
            </button>
            <button onClick={() => exportDoc('pdf')} className="btn-ghost flex-1 justify-center text-xs border border-forest-500 py-2">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResumePage() {
  const { profiles, activeProfileId, experiences, setExperiences } = useProfileStore()
  const { resumes, activeResumeId, setResumes, setActiveResume, updateResume, addResume } = useResumeStore()
  const [previewKey, setPreviewKey] = useState(0)
  const [creating, setCreating] = useState(false)

  const profile = profiles.find(p => p.id === activeProfileId)
  const activeResume = resumes.find(r => r.id === activeResumeId)

  useEffect(() => {
    if (!activeProfileId) return
    resumesApi.list(activeProfileId).then(data => {
      setResumes(data)
      if (data.length > 0 && !activeResumeId) setActiveResume(data[0].id)
    })
  }, [activeProfileId])

  const createResume = async () => {
    if (!activeProfileId) return
    setCreating(true)
    try {
      const resume = await resumesApi.create(activeProfileId, {
        name: `Resume ${new Date().toLocaleDateString()}`,
        template_name: 'classic',
      })
      addResume(resume)
      setActiveResume(resume.id)
      toast.success('New résumé created')
    } finally {
      setCreating(false)
    }
  }

  if (!profile) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-cream-500 text-sm">No profile. <a href="/" className="text-gold-400 underline">Set up your profile first</a></p>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-forest-500 bg-forest-900 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-xs font-mono text-cream-500 uppercase tracking-wider">Résumé Builder</p>
          {resumes.length > 0 && (
            <select
              className="bg-forest-800 border border-forest-500 rounded text-sm text-cream-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold-500"
              value={activeResumeId || ''}
              onChange={e => setActiveResume(e.target.value)}
            >
              {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>
        <button onClick={createResume} disabled={creating} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> New Résumé
        </button>
      </div>

      {/* 3-panel layout */}
      {activeResume ? (
        <div className="flex-1 overflow-hidden min-h-0 flex">
          <SectionsSidebar resume={activeResume} onUpdate={r => { updateResume(r); setPreviewKey(k => k + 1) }} />
          <DocumentPreview resumeVersionId={activeResume.id} refreshKey={previewKey} />
          <AIChatPanel resumeVersionId={activeResume.id} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <FileText className="w-12 h-12 text-forest-400 mb-4" />
          <p className="font-display text-xl text-cream-300 mb-2">No résumés yet</p>
          <p className="text-cream-500 text-sm mb-6">Create your first tailored résumé version</p>
          <button onClick={createResume} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Résumé
          </button>
        </div>
      )}
    </div>
  )
}
