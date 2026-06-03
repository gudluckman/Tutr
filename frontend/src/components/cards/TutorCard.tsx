import { Link } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import type { TutorProfile } from '../../types/tutor';

export function TutorCard({ tutor }: { tutor: TutorProfile }) {
  const imageUrl = assetUrl(tutor.profileImageUrl);
  const initials = tutor.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <article className="panel flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
        {imageUrl ? (
          <img className="h-full w-full object-cover" src={imageUrl} alt={tutor.displayName} />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-semibold text-stone-400">
            {initials || 'T'}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{tutor.displayName}</h2>
        <p className="text-sm text-stone-600">{tutor.headline || 'Private tutor'}</p>
      </div>
      <p className="line-clamp-3 text-sm text-stone-700">{tutor.bio || 'Profile details coming soon.'}</p>
      <div className="flex flex-wrap gap-2 text-xs text-stone-600">
        {tutor.location && <span className="rounded bg-stone-100 px-2 py-1">{tutor.location}</span>}
        {tutor.online && <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">Online</span>}
        {tutor.hourlyRateMin && <span className="rounded bg-stone-100 px-2 py-1">From ${tutor.hourlyRateMin}/hr</span>}
      </div>
      <Link to={`/tutors/${tutor.slug}`} className="button-secondary mt-auto">View profile</Link>
    </article>
  );
}
