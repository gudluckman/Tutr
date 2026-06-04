import { Link } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { Avatar } from '../ui/Avatar';
import type { TutorProfile } from '../../types/tutor';

export function TutorCard({ tutor }: { tutor: TutorProfile }) {
  const imageUrl = assetUrl(tutor.profileImageUrl);

  return (
    <article className="panel flex flex-col gap-3">
      <Avatar
        name={tutor.displayName}
        src={imageUrl}
        className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-stone-100 text-3xl font-semibold"
        fallbackClassName="text-stone-400"
      />
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
