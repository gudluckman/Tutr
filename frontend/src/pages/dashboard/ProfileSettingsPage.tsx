import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogContent, FormControlLabel, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { assetUrl } from '../../api/client';
import { getTutorProfile, updateTutorProfile, uploadTutorProfileImage } from '../../api/tutorApi';
import { Avatar } from '../../components/ui/Avatar';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { TutorProfile } from '../../types/tutor';
import { subjectGroupsForYear, teachingYearLabel, teachingYearOptions, type SubjectGroup } from './profileTeachingOptions';
import { australianUniversityOptions, otherUniversityOption } from './profileUniversityOptions';

type TeachingOfferingItem = NonNullable<TutorProfile['teachingOfferings']>[number];

export function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: getTutorProfile });
  const [form, setForm] = useState<TutorProfile | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [activeTeachingYear, setActiveTeachingYear] = useState('Year 12');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [universityOtherMode, setUniversityOtherMode] = useState(false);
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
    if (profile.data) {
      setForm(profile.data);
      setUniversityOtherMode(profile.data.university ? !australianUniversityOptions.includes(profile.data.university) : false);
    }
  }, [profile.data]);

  const displayedSubjectGroups = useMemo(() => matchingSubjectGroups(activeTeachingYear, subjectSearch), [activeTeachingYear, subjectSearch]);

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
  const teachingOfferings = validTeachingOfferings(form);
  const selectedUniversity = universitySelectValue(form.university, universityOtherMode);

  function toggleSubject(year: string, subject: string, checked: boolean) {
    setForm((current) => {
      if (!current) return current;
      const offerings = validTeachingOfferings(current);
      const exists = offerings.some((offering) => offering.tutorYear === year && offering.subject === subject);
      const nextOfferings = checked && !exists
        ? [...offerings, { tutorYear: year, subject }]
        : offerings.filter((offering) => offering.tutorYear !== year || offering.subject !== subject);
      return { ...current, teachingOfferings: sortTeachingOfferings(nextOfferings) };
    });
  }

  function toggleSubjectGroup(year: string, group: SubjectGroup, checked: boolean) {
    setForm((current) => {
      if (!current) return current;
      const offerings = validTeachingOfferings(current);
      const groupSubjects = new Set(group.subjects);
      const retained = offerings.filter((offering) => offering.tutorYear !== year || !groupSubjects.has(offering.subject));
      const nextOfferings = checked
        ? [...retained, ...group.subjects.map((subject) => ({ tutorYear: year, subject }))]
        : retained;
      return { ...current, teachingOfferings: sortTeachingOfferings(nextOfferings) };
    });
  }

  function removeOffering(year: string, subject: string) {
    setForm((current) => current ? {
      ...current,
      teachingOfferings: validTeachingOfferings(current).filter((offering) => offering.tutorYear !== year || offering.subject !== subject),
    } : current);
  }

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

        <SettingsPanel title="Year levels and subjects">
          <Stack sx={{ gap: 2 }}>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {teachingOfferings.map((offering) => (
                <Chip
                  key={teachingOfferingKey(offering.tutorYear, offering.subject)}
                  label={`${teachingYearLabel(offering.tutorYear)} - ${offering.subject}`}
                  onDelete={() => removeOffering(offering.tutorYear, offering.subject)}
                  sx={{ bgcolor: '#f5f5f5' }}
                />
              ))}
              {teachingOfferings.length === 0 && <Typography variant="body2" color="text.secondary">No years or subjects selected yet.</Typography>}
            </Stack>
            <Box>
              <Button type="button" variant="outlined" startIcon={<Icon name="plus" className="h-4 w-4" />} onClick={() => setSubjectModalOpen(true)}>
                Choose years and subjects
              </Button>
            </Box>
          </Stack>
        </SettingsPanel>

        <Dialog open={subjectModalOpen} onClose={() => setSubjectModalOpen(false)} fullWidth maxWidth="lg" aria-labelledby="teaching-subjects-title">
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <Box>
                <Typography id="teaching-subjects-title" variant="h5" sx={{ fontWeight: 700 }}>What subjects do you tutor?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Select a student year level, then tick every subject you teach for that level.
                </Typography>
              </Box>
              <Button type="button" variant="outlined" onClick={() => setSubjectModalOpen(false)}>Done</Button>
            </Stack>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 0.5, overflowX: 'auto' }}>
              {teachingYearOptions.map((year) => (
                <Button
                  key={year}
                  type="button"
                  color="inherit"
                  onClick={() => setActiveTeachingYear(year)}
                  sx={{
                    borderBottom: activeTeachingYear === year ? 2 : 0,
                    borderColor: 'primary.main',
                    borderRadius: 0,
                    color: activeTeachingYear === year ? 'text.primary' : 'text.secondary',
                    flexShrink: 0,
                    fontWeight: activeTeachingYear === year ? 600 : 400,
                    minWidth: 84,
                    px: 1.5,
                    textTransform: 'none',
                  }}
                >
                  {teachingYearLabel(year)}
                </Button>
              ))}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, pt: 2.5 }}>
              <TextField
                label="Search subjects or year levels"
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="e.g. Physics, Maths, Year 11"
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon name="search" className="h-4 w-4" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="button" variant="outlined" color="inherit" disabled={!subjectSearch} onClick={() => setSubjectSearch('')} sx={{ minHeight: 40, whiteSpace: 'nowrap' }}>
                Clear search
              </Button>
            </Stack>

            <Box sx={{ maxHeight: { xs: '58vh', sm: '62vh' }, overflowY: 'auto', pt: 3 }}>
              <Stack sx={{ gap: 3 }}>
                {displayedSubjectGroups.map(({ year, groups }) => (
                  <Box key={year}>
                    {subjectSearch.trim() && (
                      <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                        {teachingYearLabel(year)}
                      </Typography>
                    )}
                    <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 }, gridTemplateColumns: groups.length === 1 ? '1fr' : { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
                      {groups.map((group) => {
                        const allSelected = group.subjects.every((subject) => hasTeachingOffering(teachingOfferings, year, subject));
                        return (
                          <Box key={`${year}-${group.label}`}>
                            <FormControlLabel
                              control={<Checkbox checked={allSelected} onChange={(event) => toggleSubjectGroup(year, group, event.target.checked)} />}
                              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{group.label}</Typography>}
                              sx={{ m: 0 }}
                            />
                            <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(260px, 1fr))' }, mt: 0.5 }}>
                              {group.subjects.map((subject) => (
                                <FormControlLabel
                                  key={`${year}-${subject}`}
                                  control={<Checkbox checked={hasTeachingOffering(teachingOfferings, year, subject)} onChange={(event) => toggleSubject(year, subject, event.target.checked)} />}
                                  label={<Typography variant="body2">{subject}</Typography>}
                                  sx={{ m: 0, py: 0.25 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
                {displayedSubjectGroups.length === 0 && (
                  <Paper variant="outlined" sx={{ borderStyle: 'dashed', p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No subjects match your search.</Typography>
                  </Paper>
                )}
              </Stack>
            </Box>
          </DialogContent>
        </Dialog>

        <SettingsPanel title="Education">
          <Stack sx={{ gap: 2 }}>
            <Autocomplete
              options={australianUniversityOptions}
              value={selectedUniversity}
              onChange={(_, value) => {
                const isOther = value === otherUniversityOption;
                setUniversityOtherMode(isOther);
                setForm({ ...form, university: isOther ? '' : value ?? '' });
              }}
              renderInput={(params) => <TextField {...params} label="University" />}
            />
            {selectedUniversity === otherUniversityOption && (
              <ProfileTextField label="Other university or institution" value={form.university ?? ''} onChange={(value) => setForm({ ...form, university: value })} />
            )}
            <ProfileTextField label="Degree" value={form.degree ?? ''} onChange={(value) => setForm({ ...form, degree: value })} />
            <ProfileTextField label="High school" value={form.highSchool ?? ''} placeholder="e.g. North Sydney Boys High School" onChange={(value) => setForm({ ...form, highSchool: value })} />
            <ProfileTextField
              label="Year finished high school"
              type="number"
              value={String(form.highSchoolFinishedYear ?? '')}
              placeholder="e.g. 2024"
              onChange={(value) => setForm({ ...form, highSchoolFinishedYear: value ? Number(value) : null })}
            />
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

function validTeachingOfferings(profile: TutorProfile) {
  const offerings = profile.teachingOfferings?.length
    ? profile.teachingOfferings
    : profile.tutorYear
      ? [{ tutorYear: profile.tutorYear, subject: '' }]
      : [];
  return offerings.filter((offering) => offering.tutorYear?.trim() && offering.subject?.trim());
}

function sortTeachingOfferings(offerings: TeachingOfferingItem[]) {
  const unique = new Map<string, TeachingOfferingItem>();
  offerings
    .filter((offering) => offering.tutorYear.trim() && offering.subject.trim())
    .forEach((offering) => unique.set(teachingOfferingKey(offering.tutorYear, offering.subject), offering));
  return Array.from(unique.values()).sort((a, b) => (
    teachingYearSortIndex(a.tutorYear) - teachingYearSortIndex(b.tutorYear)
    || a.subject.localeCompare(b.subject)
  ));
}

function matchingSubjectGroups(activeTeachingYear: string, search: string) {
  const term = search.trim().toLowerCase();
  const years = term ? teachingYearOptions : [activeTeachingYear];

  return years
    .map((year) => {
      const yearMatches = teachingYearLabel(year).toLowerCase().includes(term) || year.toLowerCase().includes(term);
      const groups = subjectGroupsForYear(year)
        .map((group) => {
          const groupMatches = group.label.toLowerCase().includes(term);
          const subjects = term && !yearMatches && !groupMatches
            ? group.subjects.filter((subject) => subject.toLowerCase().includes(term))
            : group.subjects;
          return { ...group, subjects };
        })
        .filter((group) => group.subjects.length > 0);
      return { year, groups };
    })
    .filter(({ groups }) => groups.length > 0);
}

function hasTeachingOffering(offerings: TeachingOfferingItem[], tutorYear: string, subject: string) {
  return offerings.some((offering) => offering.tutorYear === tutorYear && offering.subject === subject);
}

function teachingOfferingKey(tutorYear: string, subject: string) {
  return `${tutorYear}:${subject}`;
}

function teachingYearSortIndex(tutorYear: string) {
  const index = teachingYearOptions.indexOf(tutorYear);
  return index === -1 ? teachingYearOptions.length : index;
}

function universitySelectValue(university: string | undefined, otherMode: boolean) {
  if (otherMode) return otherUniversityOption;
  if (!university) return null;
  return australianUniversityOptions.includes(university) ? university : otherUniversityOption;
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
