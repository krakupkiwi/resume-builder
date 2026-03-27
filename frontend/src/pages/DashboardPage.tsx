import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Briefcase, User, Upload, ArrowRight, Sparkles } from 'lucide-react'
import { useProfileStore } from '@/store/useProfileStore'
import { profilesApi } from '@/api/profiles'
import { LinkedInImportDialog } from '@/components/import/LinkedInImportDialog'
import { ResumeUploadDialog } from '@/components/import/ResumeUploadDialog'
import { useState } from 'react'

export function DashboardPage() {
  const navigate = useNavigate()
  const { profiles, activeProfileId, setProfiles, setActiveProfile } = useProfileStore()
  const [showLinkedIn, setShowLinkedIn] = useState(false)
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)

  useEffect(() => {
    profilesApi.list().then((data) => {
      setProfiles(data)
    })
  }, [])

  const activeProfile = profiles.find(p => p.id === activeProfileId)

  const createProfile = async () => {
    setCreatingProfile(true)
    try {
      const profile = await profilesApi.create({ full_name: 'My Profile' })
      setProfiles([...profiles, profile])
      setActiveProfile(profile.id)
      navigate('/profile')
    } finally {
      setCreatingProfile(false)
    }
  }

  if (!activeProfile && profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="font-display text-3xl text-cream-100 mb-2">Welcome to Résumé Builder</h1>
          <p className="text-cream-400 mb-8 leading-relaxed">
            Build tailored resumes for every job you want. Import your data or start fresh.
          </p>

          <div className="flex flex-col gap-3">
            <button onClick={() => setShowLinkedIn(true)} className="btn-primary justify-center py-3 text-base">
              <Upload className="w-4 h-4" />
              Import LinkedIn Export (.zip)
            </button>
            <button onClick={() => setShowResumeUpload(true)} className="btn-ghost justify-center py-3 text-base border border-forest-500">
              <FileText className="w-4 h-4" />
              Upload Existing Resume (PDF/DOCX)
            </button>
            <button onClick={createProfile} disabled={creatingProfile} className="btn-ghost justify-center py-3 text-base">
              <Plus className="w-4 h-4" />
              Create Profile Manually
            </button>
          </div>
        </div>
        {showLinkedIn && <LinkedInImportDialog onClose={() => setShowLinkedIn(false)} />}
        {showResumeUpload && <ResumeUploadDialog onClose={() => setShowResumeUpload(false)} />}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="font-display text-2xl text-cream-100">
          {activeProfile ? `Welcome back, ${activeProfile.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: FileText,
            title: 'New Résumé',
            desc: 'Tailor a resume for a specific job',
            action: () => navigate('/resume'),
            accent: 'gold',
          },
          {
            icon: Briefcase,
            title: 'Track Application',
            desc: 'Add a job to your pipeline',
            action: () => navigate('/jobs'),
            accent: 'blue',
          },
          {
            icon: User,
            title: 'Edit Profile',
            desc: 'Update your experience & skills',
            action: () => navigate('/profile'),
            accent: 'green',
          },
        ].map(({ icon: Icon, title, desc, action, accent }) => (
          <button
            key={title}
            onClick={action}
            className="group panel rounded-lg p-4 text-left hover:border-forest-400 hover:bg-forest-800 transition-all duration-150"
          >
            <Icon className={`w-5 h-5 mb-3 ${accent === 'gold' ? 'text-gold-400' : accent === 'blue' ? 'text-blue-400' : 'text-green-400'}`} />
            <p className="font-500 text-cream-200 text-sm mb-1">{title}</p>
            <p className="text-xs text-cream-500">{desc}</p>
            <ArrowRight className="w-3.5 h-3.5 text-cream-500 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      {/* Import options */}
      <div className="space-y-2">
        <div className="panel rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-4 h-4 text-cream-400" />
            <div>
              <p className="text-sm font-500 text-cream-200">Import LinkedIn data</p>
              <p className="text-xs text-cream-500">Upload your LinkedIn export .zip file</p>
            </div>
          </div>
          <button onClick={() => setShowLinkedIn(true)} className="btn-ghost text-xs">
            Import <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="panel rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-cream-400" />
            <div>
              <p className="text-sm font-500 text-cream-200">Upload existing resume</p>
              <p className="text-xs text-cream-500">AI extracts your work history from PDF or DOCX</p>
            </div>
          </div>
          <button onClick={() => setShowResumeUpload(true)} className="btn-ghost text-xs">
            Upload <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showLinkedIn && <LinkedInImportDialog onClose={() => setShowLinkedIn(false)} />}
      {showResumeUpload && <ResumeUploadDialog onClose={() => setShowResumeUpload(false)} />}
    </div>
  )
}
