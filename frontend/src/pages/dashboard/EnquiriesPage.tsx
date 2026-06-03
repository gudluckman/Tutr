import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convertEnquiryToStudent, listEnquiries, updateEnquiryStatus } from '../../api/enquiryApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Enquiry, EnquiryStatus } from '../../types/enquiry';

const statuses: EnquiryStatus[] = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'];

export function EnquiriesPage() {
  const queryClient = useQueryClient();
  const [conversion, setConversion] = useState<{ enquiry: Enquiry; studentName: string; hourlyRate: string; notes: string } | null>(null);
  const enquiries = useQuery({ queryKey: ['enquiries'], queryFn: listEnquiries });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) => updateEnquiryStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
  });
  const convert = useMutation({
    mutationFn: ({ id, studentName, hourlyRate, notes }: { id: string; studentName: string; hourlyRate: string; notes: string }) => convertEnquiryToStudent(id, {
      studentName,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      setConversion(null);
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground sm:mb-8 sm:text-3xl">Enquiries</h1>
      <ErrorAlert className="mb-6" error={enquiries.error} fallback="Could not load enquiries. Please refresh the page." />
      <ErrorAlert className="mb-6" error={update.error} fallback="Could not update the enquiry status. Please try again." />
      <ErrorAlert className="mb-6" error={convert.error} fallback="Could not convert this enquiry. Please check the student details and try again." />
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
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {enquiry.status !== 'CONVERTED' && (
                    <button
                      type="button"
                      className="button min-h-10 gap-2 px-3 py-2 text-xs sm:text-sm"
                      onClick={() => setConversion({ enquiry, studentName: '', hourlyRate: '', notes: '' })}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Convert
                    </button>
                  )}
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
      {conversion && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="convert-enquiry-title">
          <form
            className="w-full rounded-t-lg border border-border bg-card p-5 shadow-xl sm:mx-auto sm:max-w-lg sm:rounded-lg"
            onSubmit={(event) => {
              event.preventDefault();
              convert.mutate({
                id: conversion.enquiry.id,
                studentName: conversion.studentName,
                hourlyRate: conversion.hourlyRate,
                notes: conversion.notes,
              });
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="convert-enquiry-title" className="text-lg font-semibold text-foreground">Convert to student</h2>
                <p className="mt-1 text-sm text-muted-foreground">{conversion.enquiry.parentName}</p>
              </div>
              <button type="button" className="button-secondary h-9 w-9 p-0" onClick={() => setConversion(null)} aria-label="Close conversion form">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">Student name</span>
                <input
                  className="input"
                  required
                  value={conversion.studentName}
                  onChange={(event) => setConversion((current) => current && { ...current, studentName: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">Hourly rate</span>
                <input
                  className="input"
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={conversion.hourlyRate}
                  onChange={(event) => setConversion((current) => current && { ...current, hourlyRate: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">Notes</span>
                <textarea
                  className="input min-h-24 resize-y"
                  value={conversion.notes}
                  onChange={(event) => setConversion((current) => current && { ...current, notes: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="button-secondary" onClick={() => setConversion(null)}>Cancel</button>
              <button type="submit" className="button gap-2" disabled={convert.isPending}>
                <Icon name="check" className="h-4 w-4" />
                {convert.isPending ? 'Converting...' : 'Create student'}
              </button>
            </div>
          </form>
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
