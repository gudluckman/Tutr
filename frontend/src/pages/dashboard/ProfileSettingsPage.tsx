import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { assetUrl } from '../../api/client';
import { getTutorProfile, updateTutorProfile, uploadTutorProfileImage } from '../../api/tutorApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { TutorProfile } from '../../types/tutor';

export function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: getTutorProfile });
  const [form, setForm] = useState<TutorProfile | null>(null);
  const save = useMutation({
    mutationFn: (payload: TutorProfile) => updateTutorProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      setForm(data);
    },
  });
  const imageUpload = useMutation({
    mutationFn: (file: File) => uploadTutorProfileImage(file),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      setForm(data);
    },
  });

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form) save.mutate(form);
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) imageUpload.mutate(file);
    event.target.value = '';
  }

  if (profile.isError) return <ErrorAlert className="m-4 sm:m-8" error={profile.error} fallback="Could not load your profile. Please refresh the page." />;
  if (!form) return <div className="p-4 text-muted-foreground sm:p-8">Loading profile...</div>;

  const imageUrl = assetUrl(form.profileImageUrl);

  return (
    <div className="max-w-4xl p-4 sm:p-8">
      <h1 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">Profile settings</h1>
      <p className="mb-8 text-muted-foreground">Manage your public tutor profile and make it discoverable to parents and students.</p>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Profile image</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary">
              {imageUrl ? <img className="h-full w-full object-cover" src={imageUrl} alt={form.displayName} /> : initials(form.displayName)}
            </div>
            <div>
              <label className="button-secondary cursor-pointer gap-2">
                <Icon name="upload" className="h-4 w-4" />
                Upload image
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadImage} disabled={imageUpload.isPending} />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">Recommended: square image, at least 400x400px.</p>
              {imageUpload.isError && (
                <ErrorAlert className="mt-2" error={imageUpload.error} fallback="Upload failed. Please try again." />
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Basic information</h2>
          <FormInput label="Display name *" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} required />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Profile URL slug *</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">/tutors/</span>
              <input className="input flex-1" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            </div>
          </label>
          <FormInput label="Headline" value={form.headline ?? ''} placeholder="e.g. VCE Maths specialist | ATAR 99.5" onChange={(value) => setForm({ ...form, headline: value })} />
          <FormInput label="Location" value={form.location ?? ''} placeholder="e.g. Sydney, NSW" onChange={(value) => setForm({ ...form, location: value })} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Min hourly rate (AUD)" type="number" value={String(form.hourlyRateMin ?? 0)} onChange={(value) => setForm({ ...form, hourlyRateMin: Number(value) })} />
            <FormInput label="Max hourly rate (AUD)" type="number" value={String(form.hourlyRateMax ?? 0)} onChange={(value) => setForm({ ...form, hourlyRateMax: Number(value) })} />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Education</h2>
          <FormInput label="University" value={form.university ?? ''} onChange={(value) => setForm({ ...form, university: value })} />
          <FormInput label="Degree" value={form.degree ?? ''} onChange={(value) => setForm({ ...form, degree: value })} />
          <FormInput label="ATAR" value={form.atar ?? ''} placeholder="e.g. 99.5" onChange={(value) => setForm({ ...form, atar: value })} />
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.online} onChange={(event) => setForm({ ...form, online: event.target.checked })} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring" />
            <span className="text-sm text-foreground">Offers online lessons</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring" />
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Icon name="globe" className="h-4 w-4" />
              Make profile public and searchable
            </span>
          </label>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">About you</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Bio</span>
            <textarea className="input min-h-40 resize-none" value={form.bio ?? ''} placeholder="Tell parents and students about your teaching approach, experience, and what makes you a great tutor..." onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <button className="button px-6 py-2.5" disabled={save.isPending}>Save profile</button>
          {save.isSuccess && (
            <div className="flex items-center gap-2 text-primary">
              <Icon name="check" className="h-5 w-5" />
              <span className="text-sm">Profile saved successfully.</span>
            </div>
          )}
        </div>
        <ErrorAlert error={save.error} fallback="Could not save your profile. Please try again." />
      </form>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'T';
}
