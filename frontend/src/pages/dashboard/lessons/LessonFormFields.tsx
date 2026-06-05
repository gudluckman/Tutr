import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '../../../components/ui/Icon';
import type { LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../../types/lesson';
import type { Student } from '../../../types/student';
import { googleCalendarColors, googleReminderOptions } from './constants';
import { lessonTitle, statusLabel } from './lessonUtils';

export function SingleLessonFields({ form, setForm, students, googleConnected }: { form: LessonPayload; setForm: (form: LessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  return (
    <>
      <StudentSelect value={form.studentId} onChange={(student) => setForm({
        ...form,
        studentId: student?.id ?? '',
        title: student ? lessonTitle(student) : '',
        hourlyRate: student?.hourlyRate ?? 0,
        inviteEmail: student?.parentEmail ?? '',
      })} students={students} />
      <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
      <FormInput label="Date and time *" type="datetime-local" value={form.lessonDate} onChange={(value) => setForm({ ...form, lessonDate: value })} required />
      <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
      <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      <SelectField label="Lesson status *" value={form.status} onChange={(value) => setForm({ ...form, status: value as LessonStatus })} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']} />
      <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
        <SelectField label="Payment status *" value={form.paymentStatus} onChange={(value) => setForm({ ...form, paymentStatus: value as PaymentStatus })} options={['UNPAID', 'PAID', 'PARTIAL']} />
        <GoogleNotifications value={form.googleExtraReminderMinutes ?? null} disabled={!googleConnected || !form.syncToGoogle} onChange={(googleExtraReminderMinutes) => setForm({ ...form, googleExtraReminderMinutes })} />
      </div>
      <CalendarSyncFields
        boardLink={form.miroBoardUrl ?? ''}
        inviteEmail={form.inviteEmail ?? ''}
        googleColorId={form.googleColorId ?? ''}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onBoardLinkChange={(miroBoardUrl) => setForm({ ...form, miroBoardUrl })}
        onInviteEmailChange={(inviteEmail) => setForm({ ...form, inviteEmail })}
        onSyncChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })}
        onColorChange={(googleColorId) => setForm({ ...form, googleColorId })}
      />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

export function RecurringFields({ form, setForm, students, googleConnected }: { form: RecurringLessonPayload; setForm: (form: RecurringLessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  return (
    <>
      <StudentSelect value={form.studentId} onChange={(student) => setForm({
        ...form,
        studentId: student?.id ?? '',
        title: student ? lessonTitle(student) : '',
        hourlyRate: student?.hourlyRate ?? 0,
        inviteEmail: student?.parentEmail ?? '',
      })} students={students} />
      <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
      <FormInput label="First lesson date and time *" type="datetime-local" value={form.firstLessonDate} onChange={(value) => setForm({ ...form, firstLessonDate: value })} required />
      <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
      <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      <FormInput label="Repeat every weeks" type="number" value={String(form.intervalCount ?? '')} onChange={(value) => setForm({ ...form, intervalCount: value ? Number(value) : undefined })} />
      <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
        <FormInput label="Repeat until" type="datetime-local" value={form.recurrenceUntil ?? ''} onChange={(value) => setForm({ ...form, recurrenceUntil: value || undefined })} />
        <GoogleNotifications value={form.googleExtraReminderMinutes ?? null} disabled={!googleConnected || !form.syncToGoogle} onChange={(googleExtraReminderMinutes) => setForm({ ...form, googleExtraReminderMinutes })} />
      </div>
      <CalendarSyncFields
        boardLink={form.miroBoardUrl ?? ''}
        inviteEmail={form.inviteEmail ?? ''}
        googleColorId={form.googleColorId ?? ''}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onBoardLinkChange={(miroBoardUrl) => setForm({ ...form, miroBoardUrl })}
        onInviteEmailChange={(inviteEmail) => setForm({ ...form, inviteEmail })}
        onSyncChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })}
        onColorChange={(googleColorId) => setForm({ ...form, googleColorId })}
      />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

function StudentSelect({ value, onChange, students }: { value: string; onChange: (student?: Student) => void; students: Student[] }) {
  return (
    <FormControl size="small" required fullWidth>
      <InputLabel>Student</InputLabel>
      <Select
        label="Student"
        value={value}
        onChange={(event) => {
          const student = students.find((item) => item.id === event.target.value);
          onChange(student);
        }}
      >
        <MenuItem value="">Select student</MenuItem>
        {students.map((student) => <MenuItem key={student.id} value={student.id}>{student.name}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function FormInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <TextField label={label.replace(' *', '')} size="small" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} fullWidth slotProps={type.includes('date') ? { inputLabel: { shrink: true } } : undefined} />;
}

function SelectField({ label, value, onChange, options }: { label: string; value?: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label.replace(' *', '')}</InputLabel>
      <Select label={label.replace(' *', '')} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <MenuItem key={option} value={option}>{statusLabel(option)}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function SyncToggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <FormControlLabel
      control={<Checkbox color="success" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />}
      label="Add to Google Calendar"
    />
  );
}

function CalendarSyncFields({
  boardLink,
  inviteEmail,
  googleColorId,
  syncToGoogle,
  googleConnected,
  onBoardLinkChange,
  onInviteEmailChange,
  onSyncChange,
  onColorChange,
}: {
  boardLink: string;
  inviteEmail: string;
  googleColorId: string;
  syncToGoogle: boolean;
  googleConnected: boolean;
  onBoardLinkChange: (value: string) => void;
  onInviteEmailChange: (value: string) => void;
  onSyncChange: (value: boolean) => void;
  onColorChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <FormInput label="Board link" type="url" value={boardLink} onChange={onBoardLinkChange} />
      <FormInput label="Invite email" type="email" value={inviteEmail} onChange={onInviteEmailChange} />
      <div className="md:max-w-[240px]">
        <GoogleColorSelect value={googleColorId} disabled={!googleConnected || !syncToGoogle} onChange={onColorChange} />
      </div>
      <div className="flex items-end">
        <SyncToggle checked={syncToGoogle} disabled={!googleConnected} onChange={onSyncChange} />
      </div>
    </div>
  );
}

function GoogleColorSelect({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = googleCalendarColors.find((color) => color.id === value) ?? googleCalendarColors[0];
  return (
    <Box sx={{ position: 'relative', opacity: disabled ? 0.6 : 1 }}>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>Google event color</Typography>
      <Button
        type="button"
        variant="outlined"
        color="inherit"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        fullWidth
        onClick={() => setOpen((current) => !current)}
        sx={{ height: 40, justifyContent: 'space-between', textTransform: 'none' }}
      >
        <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: selected.swatch }} aria-hidden="true" />
          <Typography variant="body2" noWrap>{selected.label}</Typography>
        </Stack>
        <Icon name="arrowRight" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </Button>
      {open && !disabled && (
        <Paper sx={{ position: 'absolute', zIndex: 20, mt: 0.5, maxHeight: 256, width: '100%', overflowY: 'auto', p: 0.5 }} role="listbox">
          {googleCalendarColors.map((color) => (
            <Button
              key={color.id || 'default'}
              type="button"
              color="inherit"
              fullWidth
              role="option"
              aria-selected={color.id === value}
              onClick={() => {
                onChange(color.id);
                setOpen(false);
              }}
              sx={{ justifyContent: 'flex-start', gap: 1, textTransform: 'none', bgcolor: color.id === value ? 'action.selected' : undefined }}
            >
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: color.swatch }} aria-hidden="true" />
              {color.label}
            </Button>
          ))}
        </Paper>
      )}
    </Box>
  );
}

function GoogleNotifications({ value, disabled, onChange }: { value: number | null; disabled: boolean; onChange: (value: number | null) => void }) {
  const extra = value == null ? null : reminderOption(value);
  const [expanded, setExpanded] = useState(Boolean(extra));

  useEffect(() => {
    if (extra) {
      setExpanded(true);
    }
  }, [extra?.minutes]);

  return (
    <Box sx={{ opacity: disabled ? 0.6 : 1 }}>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>Notifications</Typography>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Button
          type="button"
          color="inherit"
          disabled={disabled}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          fullWidth
          sx={{ minHeight: 36, justifyContent: 'space-between', textTransform: 'none', px: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
            <Icon name="alert" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Box sx={{ minWidth: 0, textAlign: 'left' }}>
              <Typography variant="body2" noWrap>1 hour before</Typography>
              {extra && !expanded && <Typography variant="caption" color="text.secondary" noWrap>Also {reminderLabel(extra.minutes)}</Typography>}
            </Box>
          </Stack>
          <Icon name="chevronDown" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
        {expanded && extra ? (
          <Box sx={{ mt: 1 }}>
            <GoogleNotificationRow minutes={extra.minutes} disabled={disabled} onChange={onChange} onRemove={() => onChange(null)} />
          </Box>
        ) : expanded ? (
          <Button type="button" color="inherit" disabled={disabled} onClick={() => onChange(10)} startIcon={<Icon name="plus" className="h-4 w-4" />} sx={{ mt: 1, textTransform: 'none' }}>
            Add notification
          </Button>
        ) : null}
      </Paper>
    </Box>
  );
}

function GoogleNotificationRow({ minutes, disabled = false, onChange, onRemove }: { minutes: number; disabled?: boolean; onChange?: (value: number) => void; onRemove?: () => void }) {
  const selected = reminderOption(minutes);
  const unitOptions = googleReminderOptions.map((option) => option.unit);
  const selectedUnit = googleReminderOptions.find((option) => option.unit === selected.unit) ?? googleReminderOptions[0];
  return (
    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '90px minmax(110px, 1fr) 40px' } }}>
      <TextField
        size="small"
        type="number"
        value={selected.amount}
        disabled={disabled}
        onChange={(event) => {
          const amount = clampReminderAmount(Number(event.target.value), selectedUnit);
          onChange?.(amount * selectedUnit.multiplier);
        }}
        slotProps={{ htmlInput: { min: selectedUnit.min, max: selectedUnit.max } }}
      />
      <Select
        size="small"
        value={selected.unit}
        disabled={disabled}
        onChange={(event) => {
          const next = googleReminderOptions.find((option) => option.unit === event.target.value);
          if (next) onChange?.(clampReminderAmount(selected.amount, next) * next.multiplier);
        }}
      >
        {unitOptions.map((unit) => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
      </Select>
      <IconButton
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Remove notification"
        title="Remove notification"
      >
        <Icon name="x" className="h-4 w-4" />
      </IconButton>
    </Box>
  );
}

function reminderOption(minutes: number) {
  const exactUnit = googleReminderOptions.find((option) => minutes % option.multiplier === 0 && minutes / option.multiplier >= option.min && minutes / option.multiplier <= option.max);
  const unit = exactUnit ?? googleReminderOptions[0];
  return {
    amount: clampReminderAmount(Math.round(minutes / unit.multiplier), unit),
    unit: unit.unit,
    minutes: clampReminderAmount(Math.round(minutes / unit.multiplier), unit) * unit.multiplier,
  };
}

function reminderLabel(minutes: number) {
  const option = reminderOption(minutes);
  const unit = option.amount === 1 ? option.unit.replace(/s$/, '') : option.unit;
  return `${option.amount} ${unit} before`;
}

function clampReminderAmount(amount: number, unit: { min: number; max: number }) {
  if (!Number.isFinite(amount)) {
    return unit.min;
  }
  return Math.max(unit.min, Math.min(unit.max, Math.round(amount)));
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <TextField label={label} value={value} onChange={(event) => onChange(event.target.value)} multiline minRows={3} fullWidth sx={{ gridColumn: { md: 'span 2' } }} />;
}
