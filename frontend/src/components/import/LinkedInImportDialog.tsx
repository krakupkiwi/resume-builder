import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useProfileStore } from '@/store/useProfileStore'
import { profilesApi } from '@/api/profiles'
import type { LinkedInImportPreview, UserProfile } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  profileId?: string
}

export function LinkedInImportDialog({ onClose, profileId }: Props) {
  const { profiles, activeProfileId, setProfiles, setActiveProfile, setExperiences } = useProfileStore()
  const [stage, setStage] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [preview, setPreview] = useState<LinkedInImportPreview | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setError(null)

    const formData = new FormData()
    formData.append('file', f)
    try {
      const res = await apiClient.post<LinkedInImportPreview>('/import/linkedin/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data)
      setStage('preview')
    } catch (err: any) {
      setError(err.message || 'Failed to parse file')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'application/json': ['.json'],
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
      const profileExists = targetProfileId && profiles.some(p => p.id === targetProfileId)

      if (profileExists) {
        const res = await apiClient.post<UserProfile>(`/import/linkedin/${targetProfileId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        result = res.data
      } else {
        const res = await apiClient.post<UserProfile>('/import/linkedin/new', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        result = res.data
      }

      const updated = await profilesApi.list()
      setProfiles(updated)
      setActiveProfile(result.id)

      toast.success('LinkedIn data imported successfully!')
      setStage('done')
      setTimeout(onClose, 1000)
    } catch (err: any) {
      setError(err.message || 'Import failed')
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
            <h2 className="font-display text-lg text-cream-100">LinkedIn Profile</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {stage === 'upload' && (
          <>
            <p className="text-xs text-cream-500 mb-4 leading-relaxed">
              Go to <strong className="text-cream-300">LinkedIn → Settings → Data Privacy → Get a copy of your data</strong>, select "Profile", and request the archive. Upload the <strong className="text-cream-300">.zip file</strong> LinkedIn emails you.
            </p>

            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-gold-500 bg-gold-500/5' : 'border-forest-400 hover:border-forest-300 hover:bg-forest-800'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-cream-400 mx-auto mb-3" />
              <p className="text-sm text-cream-300">Drop your LinkedIn export here</p>
              <p className="text-xs text-cream-500 mt-1">.zip file (or .json) · click to browse</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </>
        )}

        {stage === 'preview' && preview && (
          <>
            <div className="bg-forest-800 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cream-400">Name</span>
                <span className="text-cream-200 font-500">{preview.full_name}</span>
              </div>
              {preview.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Email</span>
                  <span className="text-cream-200">{preview.email}</span>
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
                <span className="text-cream-400">Skills</span>
                <span className="text-gold-400 font-mono">{preview.skills_count}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStage('upload')} className="btn-ghost flex-1 justify-center">Back</button>
              <button onClick={doImport} className="btn-primary flex-1 justify-center">
                Import Data
              </button>
            </div>
          </>
        )}

        {stage === 'importing' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-3" />
            <p className="text-cream-300 text-sm">Importing your LinkedIn data...</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-cream-200 text-sm">Import complete!</p>
          </div>
        )}
      </div>
    </div>
  )
}
