import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { createEnquiry, getPublicTutor } from '../../api/tutorApi';
import { Avatar } from '../../components/ui/Avatar';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { EnquiryPayload, PreferredMode } from '../../types/enquiry';
import type { TutorProfile } from '../../types/tutor';

export function TutorProfilePage() {
  const { slug = '' } = useParams();
  const tutor = useQuery({ queryKey: ['tutor', slug], queryFn: () => getPublicTutor(slug), enabled: Boolean(slug) });
  const enquiry = useMutation({ mutationFn: (payload: EnquiryPayload) => createEnquiry(slug, payload) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    enquiry.mutate({
      parentName: String(data.get('parentName')),
      parentEmail: String(data.get('parentEmail')),
      parentPhone: String(data.get('parentPhone')),
      studentYear: String(data.get('studentYear')),
      subject: String(data.get('subject')),
      message: String(data.get('message')),
      preferredLocation: String(data.get('preferredLocation')),
      preferredMode: String(data.get('preferredMode')) as PreferredMode,
    }, { onSuccess: () => form.reset() });
  }

  if (tutor.isLoading) return <div className="px-4 py-8 text-muted-foreground">Loading profile...</div>;
  if (tutor.isError) return <ErrorAlert className="m-4 sm:m-8" error={tutor.error} fallback="Could not load this tutor profile. Please try again." />;
  if (!tutor.data) return <div className="px-4 py-8 text-muted-foreground">Tutor profile not found.</div>;
  const imageUrl = assetUrl(tutor.data.profileImageUrl);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar
                name={tutor.data.displayName}
                src={imageUrl}
                className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold"
              />
              <div className="flex-1">
                <h1 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">{tutor.data.displayName}</h1>
                <p className="mb-3 text-lg text-muted-foreground">{tutor.data.headline || 'Independent tutor on Tutr'}</p>
                <div className="flex flex-wrap gap-3">
                  {tutor.data.location && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Icon name="mapPin" className="h-4 w-4" />
                      {tutor.data.location}
                    </div>
                  )}
                  {tutor.data.online && (
                    <div className="inline-flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-sm text-accent-foreground">
                      <Icon name="globe" className="h-4 w-4" />
                      Online lessons available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <ProfileSection title="About">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {tutor.data.bio || 'This tutor is still filling out their profile.'}
                </p>
              </ProfileSection>
              <ProfileSection title="Education">
                <div className="flex items-start gap-3">
                  <Icon name="graduation" className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{tutor.data.university || 'Education details coming soon'}</p>
                    {tutor.data.degree && <p className="text-muted-foreground">{tutor.data.degree}</p>}
                    {tutor.data.atar && <p className="mt-1 text-sm text-muted-foreground">ATAR: {tutor.data.atar}</p>}
                  </div>
                </div>
              </ProfileSection>
              <ProfileSection title="Hourly rate">
                <div className="flex items-center gap-2">
                  <Icon name="dollar" className="h-5 w-5 text-primary" />
                  <span className="text-lg font-medium text-foreground">{rateLabel(tutor.data)}</span>
                </div>
              </ProfileSection>
            </div>
          </div>
        </section>

        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
            {enquiry.isSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="check" className="h-8 w-8" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">Enquiry sent!</h3>
                <p className="text-sm text-muted-foreground">{tutor.data.displayName} will get back to you soon.</p>
              </div>
            ) : (
              <>
                <h2 className="mb-4 text-xl font-semibold text-foreground">Send enquiry</h2>
                <form onSubmit={submit} className="space-y-4">
                  <ErrorAlert error={enquiry.error} fallback="Could not send your enquiry. Please try again." />
                  <FormField label="Parent name *"><input className="input" name="parentName" required /></FormField>
                  <FormField label="Parent email *"><input className="input" name="parentEmail" type="email" required /></FormField>
                  <FormField label="Phone"><input className="input" name="parentPhone" /></FormField>
                  <FormField label="Student year"><input className="input" name="studentYear" placeholder="e.g. Year 11" /></FormField>
                  <FormField label="Subject"><input className="input" name="subject" placeholder="e.g. VCE Maths Methods" /></FormField>
                  <FormField label="Preferred location"><input className="input" name="preferredLocation" placeholder="e.g. Carlton, VIC" /></FormField>
                  <FormField label="Preferred mode">
                    <select className="input" name="preferredMode" defaultValue="BOTH">
                      <option value="ONLINE">Online</option>
                      <option value="IN_PERSON">In person</option>
                      <option value="BOTH">Either</option>
                    </select>
                  </FormField>
                  <FormField label="Message"><textarea className="input min-h-28 resize-none" name="message" placeholder="Tell us about your learning goals..." /></FormField>
                  <button className="button w-full py-2.5" disabled={enquiry.isPending}>Send enquiry</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function rateLabel(tutor: TutorProfile) {
  if (tutor.hourlyRateMin && tutor.hourlyRateMax) return `$${tutor.hourlyRateMin}-${tutor.hourlyRateMax} per hour`;
  if (tutor.hourlyRateMin) return `From $${tutor.hourlyRateMin} per hour`;
  if (tutor.hourlyRateMax) return `Up to $${tutor.hourlyRateMax} per hour`;
  return 'Rate on enquiry';
}
