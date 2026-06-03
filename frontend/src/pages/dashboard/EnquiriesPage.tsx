import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEnquiries, updateEnquiryStatus } from '../../api/enquiryApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { EnquiryStatus } from '../../types/enquiry';

const statuses: EnquiryStatus[] = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'];

export function EnquiriesPage() {
  const queryClient = useQueryClient();
  const enquiries = useQuery({ queryKey: ['enquiries'], queryFn: listEnquiries });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) => updateEnquiryStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground sm:mb-8 sm:text-3xl">Enquiries</h1>
      <ErrorAlert className="mb-6" error={enquiries.error} fallback="Could not load enquiries. Please refresh the page." />
      <ErrorAlert className="mb-6" error={update.error} fallback="Could not update the enquiry status. Please try again." />
      {enquiries.data?.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Icon name="mail" className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium text-foreground">No enquiries yet</h3>
          <p className="text-muted-foreground">When parents send you enquiries through your public profile, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.data?.map((enquiry) => (
            <article key={enquiry.id} className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{enquiry.parentName}</h2>
                    <StatusBadge status={enquiry.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">Received {new Date(enquiry.createdAt).toLocaleDateString('en-AU')}</p>
                </div>
                <select
                  aria-label={`Update ${enquiry.parentName} enquiry status`}
                  className="input !w-full shrink-0 px-3 py-2 text-xs sm:!w-28 sm:text-sm"
                  value={enquiry.status}
                  disabled={update.isPending}
                  onChange={(event) => update.mutate({ id: enquiry.id, status: event.target.value as EnquiryStatus })}
                >
                  {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </div>

              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ContactLine icon="mail" href={`mailto:${enquiry.parentEmail}`} text={enquiry.parentEmail} highlight />
                {enquiry.parentPhone && <ContactLine icon="phone" href={`tel:${enquiry.parentPhone}`} text={enquiry.parentPhone} />}
                {enquiry.studentYear && <ContactLine icon="user" text={enquiry.studentYear} />}
              </div>

              {enquiry.subject && (
                <p className="mb-3 text-sm text-foreground">
                  <span className="font-medium">Subject: </span>
                  {enquiry.subject}
                </p>
              )}
              {enquiry.message && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{enquiry.message}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactLine({ icon, text, href, highlight = false }: { icon: 'mail' | 'phone' | 'user'; text: string; href?: string; highlight?: boolean }) {
  const content = <span className={highlight ? 'text-primary hover:underline' : 'text-foreground'}>{text}</span>;
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-sm">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
      {href ? <a className="min-w-0 break-all" href={href}>{content}</a> : content}
    </div>
  );
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const styles: Record<EnquiryStatus, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    CONTACTED: 'bg-yellow-100 text-yellow-800',
    CONVERTED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };
  return <span className={`rounded px-2 py-1 text-[11px] font-medium leading-none ${styles[status]}`}>{statusLabel(status)}</span>;
}

function statusLabel(status: string) {
  return status.toLowerCase().replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}
