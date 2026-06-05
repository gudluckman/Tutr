import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { FormEvent, useEffect, useState } from 'react';
import { assetUrl } from '../../api/client';
import { getTutorProfile, updateTutorProfile, uploadTutorProfileImage } from '../../api/tutorApi';
import { Avatar } from '../../components/ui/Avatar';
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
  if (!form) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 }, color: 'text.secondary' }}>
        <Typography variant="body2">Loading profile...</Typography>
      </Box>
    );
  }

  const imageUrl = assetUrl(form.profileImageUrl);

  return (
    <Box sx={{ maxWidth: 896, p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>Profile settings</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your public tutor profile and make it discoverable to parents and students.
      </Typography>

      <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 3 }}>
        <SettingsPanel title="Profile image">
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3 }}>
            <Avatar
              name={form.displayName}
              src={imageUrl}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold"
            />
            <Box>
              <Button component="label" variant="outlined" startIcon={<Icon name="upload" className="h-4 w-4" />} disabled={imageUpload.isPending}>
                Upload image
                <Box component="input" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadImage} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Recommended: square image, at least 400x400px.
              </Typography>
              {imageUpload.isError && (
                <ErrorAlert className="mt-2" error={imageUpload.error} fallback="Upload failed. Please try again." />
              )}
            </Box>
          </Stack>
        </SettingsPanel>

        <SettingsPanel title="Basic information">
          <Stack sx={{ gap: 2 }}>
            <ProfileTextField label="Display name" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} required />
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
              <TextField label="Profile URL slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required fullWidth />
            </Stack>
            <ProfileTextField label="Headline" value={form.headline ?? ''} placeholder="e.g. VCE Maths specialist | ATAR 99.5" onChange={(value) => setForm({ ...form, headline: value })} />
            <ProfileTextField label="Location" value={form.location ?? ''} placeholder="e.g. Sydney, NSW" onChange={(value) => setForm({ ...form, location: value })} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
              <ProfileTextField label="Min hourly rate (AUD)" type="number" value={String(form.hourlyRateMin ?? 0)} onChange={(value) => setForm({ ...form, hourlyRateMin: Number(value) })} />
              <ProfileTextField label="Max hourly rate (AUD)" type="number" value={String(form.hourlyRateMax ?? 0)} onChange={(value) => setForm({ ...form, hourlyRateMax: Number(value) })} />
            </Box>
          </Stack>
        </SettingsPanel>

        <SettingsPanel title="Education">
          <Stack sx={{ gap: 2 }}>
            <ProfileTextField label="University" value={form.university ?? ''} onChange={(value) => setForm({ ...form, university: value })} />
            <ProfileTextField label="Degree" value={form.degree ?? ''} onChange={(value) => setForm({ ...form, degree: value })} />
            <ProfileTextField label="ATAR" value={form.atar ?? ''} placeholder="e.g. 99.5" onChange={(value) => setForm({ ...form, atar: value })} />
          </Stack>
        </SettingsPanel>

        <SettingsPanel title="Settings">
          <Stack sx={{ gap: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={form.online} onChange={(event) => setForm({ ...form, online: event.target.checked })} />}
              label="Offers online lessons"
            />
            <FormControlLabel
              control={<Checkbox checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} />}
              label={(
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Icon name="globe" className="h-4 w-4" />
                  <span>Make profile public and searchable</span>
                </Stack>
              )}
            />
          </Stack>
        </SettingsPanel>

        <SettingsPanel title="About you">
          <TextField
            label="Bio"
            multiline
            minRows={6}
            fullWidth
            value={form.bio ?? ''}
            placeholder="Tell parents and students about your teaching approach, experience, and what makes you a great tutor..."
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
          />
        </SettingsPanel>

        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <Button variant="contained" type="submit" disabled={save.isPending}>Save profile</Button>
          {save.isSuccess && (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, color: 'primary.main' }}>
              <Icon name="check" className="h-5 w-5" />
              <Typography variant="body2">Profile saved successfully.</Typography>
            </Stack>
          )}
        </Stack>
        <ErrorAlert error={save.error} fallback="Could not save your profile. Please try again." />
      </Box>
    </Box>
  );
}

function SettingsPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

function ProfileTextField({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <TextField
      label={label}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      slotProps={type === 'number' ? { htmlInput: { min: 0, step: 1 } } : undefined}
    />
  );
}
