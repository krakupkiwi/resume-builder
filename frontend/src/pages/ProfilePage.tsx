import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { useProfileStore } from '@/store/useProfileStore'
import { profilesApi, experienceApi } from '@/api/profiles'
import { LinkedInImportDialog } from '@/components/import/LinkedInImportDialog'
import type { ExperienceEntry, BulletEntry } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function ProfileForm() {
  const { profiles, activeProfileId, updateProfile } = useProfileStore()
  const profile = profiles.find(p => p.id === activeProfileId)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', location: '', linkedin_url: '', professional_summary: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      location: profile.location || '',
      linkedin_url: profile.linkedin_url || '',
      professional_summary: profile.professional_summary || '',
    })
  }, [profile?.id])

  if (!profile) return null

  const save = async () => {
    setSaving(true)
    try {
      const updated = await profilesApi.update(profile.id, form)
      updateProfile(updated)
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel rounded-lg p-5 mb-6">
      <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-4">Identity</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Full Name</label>
          <input className="input-field" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input-field" placeholder="City, Country" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div>
          <label className="label">LinkedIn URL</label>
          <input className="input-field" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="label">Professional Summary</label>
          <textarea className="textarea-field h-24" placeholder="Brief summary of your professional background..." value={form.professional_summary} onChange={e => setForm(f => ({ ...f, professional_summary: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={save} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

function BulletEditor({ bullets, onChange }: { bullets: BulletEntry[], onChange: (bullets: BulletEntry[]) => void }) {
  const addBullet = () => {
    onChange([...bullets, { id: crypto.randomUUID(), text: '', is_quantified: false, tags: [], source: 'original' }])
  }
  const updateBullet = (id: string, text: string) => {
    onChange(bullets.map(b => b.id === id ? { ...b, text } : b))
  }
  const removeBullet = (id: string) => {
    onChange(bullets.filter(b => b.id !== id))
  }

  return (
    <div className="space-y-1.5">
      {bullets.map(b => (
        <div key={b.id} className="flex gap-2 items-start">
          <span className="text-forest-300 mt-2 text-xs">•</span>
          <input
            className="input-field flex-1 text-xs py-1.5"
            value={b.text}
            onChange={e => updateBullet(b.id, e.target.value)}
            placeholder="Describe an achievement or responsibility..."
          />
          <button onClick={() => removeBullet(b.id)} className="btn-danger p-1 mt-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button onClick={addBullet} className="btn-ghost text-xs mt-1">
        <Plus className="w-3 h-3" /> Add bullet
      </button>
    </div>
  )
}

function ExperienceCard({ entry, profileId }: { entry: ExperienceEntry, profileId: string }) {
  const { updateExperience, removeExperience } = useProfileStore()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...entry })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await experienceApi.update(profileId, entry.id, form)
      updateExperience(updated)
      setEditing(false)
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Remove "${entry.job_title} at ${entry.company_name}"?`)) return
    await experienceApi.delete(profileId, entry.id)
    removeExperience(entry.id)
  }

  return (
    <div className="panel rounded-lg overflow-hidden animate-fade-in">
      <div
        className="flex items-start justify-between px-4 py-3 cursor-pointer hover:bg-forest-800 transition-colors"
        onClick={() => !editing && setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-500 text-cream-200 text-sm">{entry.job_title}</span>
            <span className="text-gold-500 text-xs">@</span>
            <span className="text-gold-400 text-sm">{entry.company_name}</span>
            {entry.source === 'linkedin' && <span className="badge badge-gold">LinkedIn</span>}
            {entry.source === 'interview' && <span className="badge badge-green">Discovered</span>}
          </div>
          <p className="text-xs text-cream-500 mt-0.5">
            {entry.start_date} {entry.start_date && '–'} {entry.end_date || (entry.is_current ? 'Present' : '')}
            {entry.location && ` · ${entry.location}`}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button onClick={e => { e.stopPropagation(); setEditing(true); setExpanded(true) }} className="btn-ghost p-1.5">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); remove() }} className="btn-danger p-1.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-cream-500" /> : <ChevronDown className="w-3.5 h-3.5 text-cream-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-forest-500 pt-3">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Job Title</label>
                  <input className="input-field text-xs" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Company</label>
                  <input className="input-field text-xs" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input className="input-field text-xs" placeholder="YYYY-MM" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input className="input-field text-xs" placeholder="YYYY-MM or leave blank if current" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input-field text-xs" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Employment Type</label>
                  <select className="input-field text-xs" value={form.employment_type || ''} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Bullets / Achievements</label>
                <BulletEditor bullets={form.bullets} onChange={bullets => setForm(f => ({ ...f, bullets }))} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditing(false)} className="btn-ghost text-xs">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary text-xs">
                  {saving ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {entry.bullets.length > 0 ? (
                <ul className="space-y-1">
                  {entry.bullets.map(b => (
                    <li key={b.id} className="text-xs text-cream-300 flex gap-2">
                      <span className="text-forest-300 mt-0.5">•</span>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-cream-500 italic">No bullet points. Click edit to add achievements.</p>
              )}
              {entry.skills_demonstrated.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.skills_demonstrated.map(s => (
                    <span key={s} className="badge badge-slate">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddExperienceForm({ profileId, onAdded }: { profileId: string, onAdded: (e: ExperienceEntry) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ company_name: '', job_title: '', start_date: '', end_date: '', location: '', bullets: [] as BulletEntry[] })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.company_name || !form.job_title) { toast.error('Company and title are required'); return }
    setSaving(true)
    try {
      const entry = await experienceApi.create(profileId, { ...form, is_current: !form.end_date, source: 'manual' })
      onAdded(entry)
      setOpen(false)
      setForm({ company_name: '', job_title: '', start_date: '', end_date: '', location: '', bullets: [] })
      toast.success('Experience added')
    } catch {
      toast.error('Failed to add experience')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost border border-dashed border-forest-400 w-full justify-center py-3 text-sm">
        <Plus className="w-4 h-4" /> Add Experience
      </button>
    )
  }

  return (
    <div className="panel rounded-lg p-4 animate-fade-in">
      <h3 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-3">New Experience</h3>
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
          <label className="label">Start Date</label>
          <input className="input-field text-xs" placeholder="YYYY-MM" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label className="label">End Date (blank = current)</label>
          <input className="input-field text-xs" placeholder="YYYY-MM" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
        </div>
      </div>
      <div className="mb-3">
        <label className="label">Bullet Points</label>
        <BulletEditor bullets={form.bullets} onChange={bullets => setForm(f => ({ ...f, bullets }))} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary text-xs">
          {saving ? 'Adding...' : 'Add Experience'}
        </button>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { profiles, activeProfileId, experiences, setExperiences, addExperience } = useProfileStore()
  const [showImport, setShowImport] = useState(false)

  const profile = profiles.find(p => p.id === activeProfileId)

  useEffect(() => {
    if (!activeProfileId) return
    experienceApi.list(activeProfileId).then(setExperiences)
  }, [activeProfileId])

  if (!profile) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-cream-500 text-sm">No profile selected. <a href="/" className="text-gold-400 underline">Go to dashboard</a></p>
    </div>
  )

  return (
    <div className="h-full overflow-auto p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Profile</p>
            <h1 className="font-display text-2xl text-cream-100">{profile.full_name}</h1>
          </div>
          <button onClick={() => setShowImport(true)} className="btn-ghost text-sm border border-forest-500">
            <Upload className="w-3.5 h-3.5" /> Import LinkedIn
          </button>
        </div>

        <ProfileForm />

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider">
            Experience Library <span className="text-forest-300 ml-1">({experiences.length})</span>
          </h2>
        </div>

        <div className="space-y-2 mb-4">
          {experiences.map(exp => (
            <ExperienceCard key={exp.id} entry={exp} profileId={profile.id} />
          ))}
        </div>

        <AddExperienceForm profileId={profile.id} onAdded={addExperience} />
      </div>

      {showImport && <LinkedInImportDialog onClose={() => setShowImport(false)} />}
    </div>
  )
}
