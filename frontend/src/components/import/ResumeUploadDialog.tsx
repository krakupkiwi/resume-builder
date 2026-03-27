import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useProfileStore } from '@/store/useProfileStore'
import { profilesApi } from '@/api/profiles'
import type { UserProfile } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ResumeImportPreview {
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  experience_count: number
  education_count: number
  skills_count: number
  raw_data: Record<string, unknown>
}

interface Props {
  onClose: () => void
  profileId?: string
}

export function ResumeUploadDialog({ onClose, profileId }: Props) {
  const { profiles, activeProfileId, setProfiles, setActiveProfile } = useProfileStore()
  const [stage, setStage] = useState<'upload' | 'parsing' | 'preview' | 'importing' | 'done'>('upload')
  const [preview, setPreview] = useState<ResumeImportPreview | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setError(null)
    setStage('parsing')

    const formData = new FormData()
    formData.append('file', f)
    try {
      const res = await apiClient.post<ResumeImportPreview>('/import/resume/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data)
      setStage('preview')
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to parse resume'
      setError(msg)
      setStage('upload')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  })

  const doImport = async () => {
    if (!file) return
    setStage('importing')
    const formData = new FormData()
    formData.append('file', file)

    try {
      let result: UserProfile
      const targetProfileId = profileId || activeProfileId

      if (targetProfileId) {
        const res = await apiClient.post<UserProfile>(`/import/resume/${targetProfileId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        result = res.data
        const updated = await profilesApi.list()
        setProfiles(updated)
        setActiveProfile(result.id)
      } else {
        const res = await apiClient.post<UserProfile>('/import/resume/new', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        result = res.data
        const updated = await profilesApi.list()
        setProfiles(updated)
        setActiveProfile(result.id)
      }

      toast.success('Resume imported successfully!')
      setStage('done')
      setTimeout(onClose, 1000)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Import failed'
      setError(msg)
      setStage('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-forest-900 border border-forest-500 rounded-xl w-full max-w-md p-6 shadow-2xl shadow-forest-950/80">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-0.5">Import</p>
            <h2 className="font-display text-lg text-cream-100">Upload Resume</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {stage === 'upload' && (
          <>
            <p className="text-xs text-cream-500 mb-4 leading-relaxed">
              Upload your existing resume and AI will extract your work history, skills, and education automatically.
            </p>

            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-gold-500 bg-gold-500/5' : 'border-forest-400 hover:border-forest-300 hover:bg-forest-800'
              )}
            >
              <input {...getInputProps()} />
              <FileText className="w-8 h-8 text-cream-400 mx-auto mb-3" />
              <p className="text-sm text-cream-300">Drop your resume here</p>
              <p className="text-xs text-cream-500 mt-1">PDF, DOCX, or TXT · click to browse</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 mt-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {stage === 'parsing' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-3" />
            <p className="text-cream-300 text-sm">Parsing your resume with AI…</p>
            <p className="text-cream-500 text-xs mt-1">This may take a few seconds</p>
          </div>
        )}

        {stage === 'preview' && preview && (
          <>
            <div className="bg-forest-800 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cream-400">Name</span>
                <span className="text-cream-200 font-500">{preview.full_name || '—'}</span>
              </div>
              {preview.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Email</span>
                  <span className="text-cream-200">{preview.email}</span>
                </div>
              )}
              {preview.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Phone</span>
                  <span className="text-cream-200">{preview.phone}</span>
                </div>
              )}
              {preview.location && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Location</span>
                  <span className="text-cream-200">{preview.location}</span>
                </div>
              )}
              <div className="section-divider" />
              <div className="flex justify-between text-sm">
                <span className="text-cream-400">Experience entries</span>
                <span className="text-gold-400 font-mono">{preview.experience_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cream-400">Education entries</span>
                <span className="text-gold-400 font-mono">{preview.education_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cream-400">Skills found</span>
                <span className="text-gold-400 font-mono">{preview.skills_count}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 mb-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setStage('upload'); setError(null) }} className="btn-ghost flex-1 justify-center">
                Back
              </button>
              <button onClick={doImport} className="btn-primary flex-1 justify-center">
                Import Data
              </button>
            </div>
          </>
        )}

        {stage === 'importing' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-3" />
            <p className="text-cream-300 text-sm">Importing your resume data…</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-cream-200 text-sm">Resume imported!</p>
          </div>
        )}
      </div>
    </div>
  )
}
