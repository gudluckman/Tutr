import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { searchTutors } from '../../api/tutorApi';
import { assetUrl } from '../../api/client';
import { Avatar } from '../../components/ui/Avatar';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import { Link } from 'react-router-dom';
import type { TutorProfile } from '../../types/tutor';

export function TutorSearchPage() {
  const [filters, setFilters] = useState({ subject: '', location: '', online: false });
  const [submittedFilters, setSubmittedFilters] = useState(filters);
  const tutors = useQuery({
    queryKey: ['tutors', submittedFilters],
    queryFn: () => searchTutors({
      subject: submittedFilters.subject || undefined,
      location: submittedFilters.location || undefined,
      online: submittedFilters.online || undefined,
    }),
  });

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-semibold text-foreground sm:mb-8 sm:text-4xl">Find a tutor</h1>

        <form
          className="mb-8 rounded-lg border border-border bg-card p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedFilters(filters);
          }}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Subject</span>
              <input className="input" placeholder="e.g. Maths, English" value={filters.subject} onChange={(event) => setFilters({ ...filters, subject: event.target.value })} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Location</span>
              <input className="input" placeholder="e.g. Sydney, Melbourne" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} />
            </label>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={filters.online} onChange={(event) => setFilters({ ...filters, online: event.target.checked })} className="h-4 w-4 rounded border-input text-neutral-700 focus:ring-2 focus:ring-neutral-200" />
                <span className="text-sm text-foreground">Online lessons only</span>
              </label>
            </div>
            <div className="flex items-end">
              <button className="button w-full gap-2" type="submit">
                <Icon name="search" className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </form>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tutors.data?.map((tutor) => <TutorResultCard key={tutor.id} tutor={tutor} />)}
        </div>
        <ErrorAlert className="mt-6" error={tutors.error} fallback="Could not load tutors. Please try again." />
        {tutors.isLoading && <p className="text-muted-foreground">Loading tutors...</p>}
        {tutors.data?.length === 0 && <p className="text-muted-foreground">No public tutors yet.</p>}
      </div>
    </div>
  );
}

function TutorResultCard({ tutor }: { tutor: TutorProfile }) {
  const imageUrl = assetUrl(tutor.profileImageUrl);
  return (
    <article className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex items-start gap-4">
        <Avatar
          name={tutor.displayName}
          src={imageUrl}
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{tutor.displayName}</h3>
          {tutor.location && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="mapPin" className="h-4 w-4" />
              {tutor.location}
            </div>
          )}
        </div>
      </div>
      {tutor.online && (
        <div className="mb-3 inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
          <Icon name="globe" className="h-3 w-3" />
          Online lessons
        </div>
      )}
      <p className="mb-3 text-sm text-foreground">{tutor.headline || 'Independent tutor on Tutr'}</p>
      <div className="mb-4 space-y-1">
        {tutor.university && <p className="text-sm text-muted-foreground">{tutor.university}</p>}
        {tutor.degree && <p className="text-sm text-muted-foreground">{tutor.degree}</p>}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-medium text-foreground">{rateLabel(tutor)}</span>
        <Link className="button px-3 py-1.5" to={`/tutors/${tutor.slug}`}>View profile</Link>
      </div>
    </article>
  );
}

function rateLabel(tutor: TutorProfile) {
  if (tutor.hourlyRateMin && tutor.hourlyRateMax) return `$${tutor.hourlyRateMin}-${tutor.hourlyRateMax}/hr`;
  if (tutor.hourlyRateMin) return `From $${tutor.hourlyRateMin}/hr`;
  if (tutor.hourlyRateMax) return `Up to $${tutor.hourlyRateMax}/hr`;
  return 'Rate on enquiry';
}
