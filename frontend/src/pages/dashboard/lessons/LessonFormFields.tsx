import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, Checkbox, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '../../../components/ui/Icon';
import type { LessonLink, LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../../types/lesson';
import type { Student } from '../../../types/student';
import { googleCalendarColors, googleReminderOptions } from './constants';
import { lessonTitle, lessonTitleWithSubject, statusLabel, subjectOptionsForStudent } from './lessonUtils';

export function SingleLessonFields({ form, setForm, students, googleConnected }: { form: LessonPayload; setForm: (form: LessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  const setLessonLinks = (lessonLinks: LessonLink[]) => setForm({ ...form, lessonLinks, miroBoardUrl: boardUrlFromLinks(lessonLinks) });
  const selectedStudent = students.find((student) => student.id === form.studentId);
  const subjectOptions = subjectOptionsForStudent(selectedStudent);
  return (
    <>
      <FormRow columns={2}>
        <StudentSelect value={form.studentId} onChange={(student) => setForm({
          ...form,
          studentId: student?.id ?? '',
          title: student ? defaultLessonTitle(student) : '',
          hourlyRate: student?.hourlyRate ?? 0,
          inviteEmail: student?.parentEmail ?? '',
        })} students={students} />
        {subjectOptions.length > 1 ? (
          <SubjectSelect
            value={subjectFromGeneratedTitle(selectedStudent, form.title)}
            options={subjectOptions}
            onChange={(subject) => setForm({ ...form, title: selectedStudent ? subject ? lessonTitleWithSubject(selectedStudent, subject) : lessonTitle(selectedStudent) : form.title })}
          />
        ) : (
          <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
        )}
      </FormRow>
      {subjectOptions.length > 1 && (
        <FormRow columns={2}>
          <Box sx={{ gridColumn: { md: 'span 2' } }}>
            <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
          </Box>
        </FormRow>
      )}
      <FormRow columns={3}>
        <FormInput label="Date and time *" type="datetime-local" value={form.lessonDate} onChange={(value) => setForm({ ...form, lessonDate: value })} required />
        <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
        <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      </FormRow>
      <FormRow columns={3}>
        <SelectField label="Lesson status *" value={form.status} onChange={(value) => setForm({ ...form, status: value as LessonStatus })} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']} />
        <SelectField label="Payment status *" value={form.paymentStatus} onChange={(value) => setForm({ ...form, paymentStatus: value as PaymentStatus })} options={['UNPAID', 'PAID', 'PARTIAL']} />
        <FormInput label="Invite email" type="email" value={form.inviteEmail ?? ''} onChange={(inviteEmail) => setForm({ ...form, inviteEmail })} />
      </FormRow>
      <GoogleCalendarOptions
        googleColorId={form.googleColorId ?? ''}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onSyncChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })}
        onColorChange={(googleColorId) => setForm({ ...form, googleColorId })}
      />
      <CalendarExtrasFields
        lessonLinks={form.lessonLinks ?? []}
        googleExtraReminderMinutes={form.googleExtraReminderMinutes ?? null}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onLessonLinksChange={setLessonLinks}
        onReminderChange={(googleExtraReminderMinutes) => setForm({ ...form, googleExtraReminderMinutes })}
      />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

export function RecurringFields({ form, setForm, students, googleConnected }: { form: RecurringLessonPayload; setForm: (form: RecurringLessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  const setLessonLinks = (lessonLinks: LessonLink[]) => setForm({ ...form, lessonLinks, miroBoardUrl: boardUrlFromLinks(lessonLinks) });
  const selectedStudent = students.find((student) => student.id === form.studentId);
  const subjectOptions = subjectOptionsForStudent(selectedStudent);
  return (
    <>
      <FormRow columns={2}>
        <StudentSelect value={form.studentId} onChange={(student) => setForm({
          ...form,
          studentId: student?.id ?? '',
          title: student ? defaultLessonTitle(student) : '',
          hourlyRate: student?.hourlyRate ?? 0,
          inviteEmail: student?.parentEmail ?? '',
        })} students={students} />
        {subjectOptions.length > 1 ? (
          <SubjectSelect
            value={subjectFromGeneratedTitle(selectedStudent, form.title)}
            options={subjectOptions}
            onChange={(subject) => setForm({ ...form, title: selectedStudent ? subject ? lessonTitleWithSubject(selectedStudent, subject) : lessonTitle(selectedStudent) : form.title })}
          />
        ) : (
          <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
        )}
      </FormRow>
      {subjectOptions.length > 1 && (
        <FormRow columns={2}>
          <Box sx={{ gridColumn: { md: 'span 2' } }}>
            <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
          </Box>
        </FormRow>
      )}
      <FormRow columns={3}>
        <FormInput label="First lesson date and time *" type="datetime-local" value={form.firstLessonDate} onChange={(value) => setForm({ ...form, firstLessonDate: value })} required />
        <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
        <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      </FormRow>
      <FormRow columns={3}>
        <FormInput label="Repeat every weeks" type="number" value={String(form.intervalCount ?? '')} onChange={(value) => setForm({ ...form, intervalCount: value ? Number(value) : undefined })} />
        <FormInput label="Repeat until" type="datetime-local" value={form.recurrenceUntil ?? ''} onChange={(value) => setForm({ ...form, recurrenceUntil: value || undefined })} />
        <FormInput label="Invite email" type="email" value={form.inviteEmail ?? ''} onChange={(inviteEmail) => setForm({ ...form, inviteEmail })} />
      </FormRow>
      <GoogleCalendarOptions
        googleColorId={form.googleColorId ?? ''}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onSyncChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })}
        onColorChange={(googleColorId) => setForm({ ...form, googleColorId })}
      />
      <CalendarExtrasFields
        lessonLinks={form.lessonLinks ?? []}
        googleExtraReminderMinutes={form.googleExtraReminderMinutes ?? null}
        syncToGoogle={Boolean(form.syncToGoogle)}
        googleConnected={googleConnected}
        onLessonLinksChange={setLessonLinks}
        onReminderChange={(googleExtraReminderMinutes) => setForm({ ...form, googleExtraReminderMinutes })}
      />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

function SubjectSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>Lesson subject</InputLabel>
      <Select label="Lesson subject" value={value} onChange={(event) => onChange(event.target.value)}>
        <MenuItem value="">General lesson</MenuItem>
        {options.map((subject) => <MenuItem key={subject} value={subject}>{subject}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function defaultLessonTitle(student: Student) {
  const subjects = subjectOptionsForStudent(student);
  return subjects.length === 1 ? lessonTitleWithSubject(student, subjects[0]) : lessonTitle(student);
}

function subjectFromGeneratedTitle(student: Student | undefined, title?: string) {
  if (!student || !title) return '';
  return subjectOptionsForStudent(student).find((subject) => title === lessonTitleWithSubject(student, subject)) ?? '';
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

function FormRow({ children, columns }: { children: ReactNode; columns: 2 | 3 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridColumn: { md: 'span 2' },
        gridTemplateColumns: { xs: '1fr', md: `repeat(${columns}, minmax(0, 1fr))` },
        gap: 2,
        alignItems: 'start',
      }}
    >
      {children}
    </Box>
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

function LessonLinksEditor({ value, onChange }: { value: LessonLink[]; onChange: (links: LessonLink[]) => void }) {
  const links = value.length ? value : [];
  const updateLink = (index: number, patch: Partial<LessonLink>) => {
    onChange(links.map((link, linkIndex) => linkIndex === index ? { ...link, ...patch } : link));
  };
  const addLink = () => onChange([...links, { label: links.length === 0 ? 'Board' : '', url: '' }]);
  const removeLink = (index: number) => onChange(links.filter((_, linkIndex) => linkIndex !== index));

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>Lesson links</Typography>
      <Paper variant="outlined" sx={{ p: 1, minHeight: 54 }}>
        <Stack spacing={1}>
          {links.map((link, index) => (
            <Box key={index} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '110px minmax(0, 1fr) 40px' } }}>
              <TextField
                size="small"
                label="Name"
                value={link.label}
                placeholder="Board"
                onChange={(event) => updateLink(index, { label: event.target.value })}
              />
              <TextField
                size="small"
                label="URL"
                type="url"
                value={link.url}
                placeholder="https://..."
                onChange={(event) => updateLink(index, { url: event.target.value })}
              />
              <IconButton type="button" onClick={() => removeLink(index)} aria-label="Remove link" title="Remove link">
                <Icon name="x" className="h-4 w-4" />
              </IconButton>
            </Box>
          ))}
          <Button type="button" color="inherit" onClick={addLink} startIcon={<Icon name="plus" className="h-4 w-4" />} sx={{ minHeight: 36, alignSelf: 'flex-start', textTransform: 'none' }}>
            Add link
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function boardUrlFromLinks(links: LessonLink[]) {
  const board = links.find((link) => link.label.trim().toLowerCase() === 'board' && link.url.trim());
  const first = links.find((link) => link.url.trim());
  return (board ?? first)?.url.trim() ?? '';
}

function CalendarExtrasFields({
  lessonLinks,
  googleExtraReminderMinutes,
  syncToGoogle,
  googleConnected,
  onLessonLinksChange,
  onReminderChange,
}: {
  lessonLinks: LessonLink[];
  googleExtraReminderMinutes: number | null;
  syncToGoogle: boolean;
  googleConnected: boolean;
  onLessonLinksChange: (links: LessonLink[]) => void;
  onReminderChange: (value: number | null) => void;
}) {
  const googleDisabled = !googleConnected || !syncToGoogle;

  return (
    <Box sx={{ display: 'grid', gridColumn: { md: 'span 2' }, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
      <LessonLinksEditor value={lessonLinks} onChange={onLessonLinksChange} />
      <GoogleNotifications value={googleExtraReminderMinutes} disabled={googleDisabled} onChange={onReminderChange} />
    </Box>
  );
}

function GoogleCalendarOptions({
  googleColorId,
  syncToGoogle,
  googleConnected,
  onSyncChange,
  onColorChange,
}: {
  googleColorId: string;
  syncToGoogle: boolean;
  googleConnected: boolean;
  onSyncChange: (value: boolean) => void;
  onColorChange: (value: string) => void;
}) {
  const googleDisabled = !googleConnected || !syncToGoogle;
  return (
    <Box
      sx={{
        display: 'grid',
        gridColumn: { md: 'span 2' },
        gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 280px) minmax(0, 1fr)' },
        gap: { xs: 1.5, md: 2 },
        alignItems: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.5,
        bgcolor: '#fafafa',
      }}
    >
      <GoogleColorSelect value={googleColorId} disabled={googleDisabled} onChange={onColorChange} />
      <Box sx={{ pt: { md: 2.75 } }}>
        <SyncToggle checked={syncToGoogle} disabled={!googleConnected} onChange={onSyncChange} />
      </Box>
    </Box>
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
