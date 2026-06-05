import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
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
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: { xs: 3, sm: 4 }, fontWeight: 600 }}>Enquiries</Typography>
      <ErrorAlert className="mb-6" error={enquiries.error} fallback="Could not load enquiries. Please refresh the page." />
      <ErrorAlert className="mb-6" error={update.error} fallback="Could not update the enquiry status. Please try again." />
      <ErrorAlert className="mb-6" error={convert.error} fallback="Could not convert this enquiry. Please check the student details and try again." />

      {enquiries.data?.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Icon name="mail" className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>No enquiries yet</Typography>
          <Typography color="text.secondary">When parents send you enquiries through your public profile, they will appear here.</Typography>
        </Paper>
      ) : (
        <Stack sx={{ gap: 2 }}>
          {enquiries.data?.map((enquiry) => (
            <Paper key={enquiry.id} component="article" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
                <Box>
                  <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{enquiry.parentName}</Typography>
                    <StatusBadge status={enquiry.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Received {new Date(enquiry.createdAt).toLocaleDateString('en-AU')}</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, minWidth: { sm: 260 } }}>
                  {enquiry.status !== 'CONVERTED' && (
                    <Button
                      type="button"
                      variant="contained"
                      size="small"
                      startIcon={<Icon name="plus" className="h-4 w-4" />}
                      onClick={() => setConversion({ enquiry, studentName: '', hourlyRate: '', notes: '' })}
                    >
                      Convert
                    </Button>
                  )}
                  <FormControl size="small" fullWidth>
                    <InputLabel id={`enquiry-status-${enquiry.id}`}>Status</InputLabel>
                    <Select
                      labelId={`enquiry-status-${enquiry.id}`}
                      label="Status"
                      value={enquiry.status}
                      disabled={update.isPending}
                      onChange={(event) => update.mutate({ id: enquiry.id, status: event.target.value as EnquiryStatus })}
                    >
                      {statuses.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
                <ContactLine icon="mail" href={`mailto:${enquiry.parentEmail}`} text={enquiry.parentEmail} highlight />
                {enquiry.parentPhone && <ContactLine icon="phone" href={`tel:${enquiry.parentPhone}`} text={enquiry.parentPhone} />}
                {enquiry.studentYear && <ContactLine icon="user" text={enquiry.studentYear} />}
              </Box>

              {enquiry.subject && (
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>Subject: </Box>
                  {enquiry.subject}
                </Typography>
              )}
              {enquiry.message && (
                <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{enquiry.message}</Typography>
                </Paper>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(conversion)} onClose={() => setConversion(null)} fullWidth maxWidth="sm" aria-labelledby="convert-enquiry-title">
        {conversion && (
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              component="form"
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
              <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography id="convert-enquiry-title" variant="h6" sx={{ fontWeight: 600 }}>Convert to student</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{conversion.enquiry.parentName}</Typography>
                </Box>
                <IconButton type="button" onClick={() => setConversion(null)} aria-label="Close conversion form">
                  <Icon name="x" className="h-4 w-4" />
                </IconButton>
              </Stack>

              <Stack sx={{ gap: 2 }}>
                <TextField
                  label="Student name"
                  required
                  value={conversion.studentName}
                  onChange={(event) => setConversion((current) => current && { ...current, studentName: event.target.value })}
                />
                <TextField
                  label="Hourly rate"
                  type="number"
                  value={conversion.hourlyRate}
                  onChange={(event) => setConversion((current) => current && { ...current, hourlyRate: event.target.value })}
                  slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                />
                <TextField
                  label="Notes"
                  multiline
                  minRows={3}
                  value={conversion.notes}
                  onChange={(event) => setConversion((current) => current && { ...current, notes: event.target.value })}
                />
              </Stack>

              <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                <Button type="button" variant="outlined" onClick={() => setConversion(null)}>Cancel</Button>
                <Button type="submit" variant="contained" startIcon={<Icon name="check" className="h-4 w-4" />} disabled={convert.isPending}>
                  {convert.isPending ? 'Converting...' : 'Create student'}
                </Button>
              </Stack>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}

function ContactLine({ icon, text, href, highlight = false }: { icon: 'mail' | 'phone' | 'user'; text: string; href?: string; highlight?: boolean }) {
  const content = highlight ? (
    <Link color="primary" underline="hover">{text}</Link>
  ) : (
    <Typography variant="body2">{text}</Typography>
  );
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Icon name={icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
      {href ? <Link href={href} underline="hover" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{content}</Link> : content}
    </Stack>
  );
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const colors: Record<EnquiryStatus, 'default' | 'primary' | 'success' | 'warning'> = {
    NEW: 'primary',
    CONTACTED: 'warning',
    CONVERTED: 'success',
    CLOSED: 'default',
  };
  return <Chip size="small" color={colors[status]} label={statusLabel(status)} />;
}

function statusLabel(status: string) {
  return status.toLowerCase().replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}
