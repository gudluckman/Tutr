import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { FormEvent, useState } from 'react';
import { createStudent, deleteStudent, listStudents, updateStudent } from '../../api/studentApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Student, StudentPayload } from '../../types/student';

const emptyStudent: StudentPayload = { name: '', parentName: '', parentEmail: '', parentPhone: '', schoolYear: '', subject: '', hourlyRate: 0, notes: '', active: true };

export function StudentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentPayload>(emptyStudent);
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const save = useMutation({
    mutationFn: () => editing ? updateStudent(editing.id, form) : createStudent(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      resetForm();
    },
  });
  const remove = useMutation({ mutationFn: deleteStudent, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }) });

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  function edit(student: Student) {
    setEditing(student);
    setForm({ ...student });
    setShowForm(true);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyStudent);
    setShowForm(false);
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: { xs: 3, sm: 4 } }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Students</Typography>
        <Button variant="contained" startIcon={<Icon name="plus" className="h-4 w-4" />} onClick={() => setShowForm(true)}>
          Add student
        </Button>
      </Stack>

      {showForm && (
        <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{editing ? 'Edit student' : 'Add new student'}</Typography>
            <IconButton onClick={resetForm} type="button" aria-label="Close form">
              <Icon name="x" className="h-5 w-5" />
            </IconButton>
          </Stack>

          <Box component="form" onSubmit={submit} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>
              <ErrorAlert error={save.error} fallback="Could not save the student. Please try again." />
            </Box>
            <StudentTextField label="Student name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <StudentTextField label="Parent name" value={form.parentName ?? ''} onChange={(value) => setForm({ ...form, parentName: value })} required />
            <StudentTextField label="Student/parent Gmail" type="email" value={form.parentEmail ?? ''} onChange={(value) => setForm({ ...form, parentEmail: value })} required />
            <StudentTextField label="Subject" value={form.subject ?? ''} onChange={(value) => setForm({ ...form, subject: value })} required />
            <StudentTextField label="Parent phone" value={form.parentPhone ?? ''} onChange={(value) => setForm({ ...form, parentPhone: value })} required />
            <StudentTextField label="School year" value={form.schoolYear ?? ''} onChange={(value) => setForm({ ...form, schoolYear: value })} required />
            <StudentTextField label="Hourly rate" type="number" value={String(form.hourlyRate ?? 0)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
            <Stack sx={{ justifyContent: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />}
                label="Active student"
              />
            </Stack>
            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={form.notes ?? ''}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gridColumn: { md: '1 / -1' }, gap: 1.5 }}>
              <Button variant="contained" type="submit" disabled={save.isPending}>{editing ? 'Update student' : 'Add student'}</Button>
              <Button variant="outlined" type="button" onClick={resetForm}>Cancel</Button>
            </Stack>
          </Box>
        </Paper>
      )}

      <ErrorAlert className="mb-6" error={students.error} fallback="Could not load students. Please refresh the page." />
      <ErrorAlert className="mb-6" error={remove.error} fallback="Could not delete the student. Please try again." />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <HeaderCell>Name</HeaderCell>
              <HeaderCell>Subject</HeaderCell>
              <HeaderCell>Parent</HeaderCell>
              <HeaderCell>Rate</HeaderCell>
              <HeaderCell align="right">Actions</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.data?.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{student.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{student.schoolYear}</Typography>
                </TableCell>
                <TableCell>{student.subject}</TableCell>
                <TableCell>
                  <Typography variant="body2">{student.parentName}</Typography>
                  <Typography variant="body2" color="text.secondary">{student.parentEmail}</Typography>
                </TableCell>
                <TableCell>${student.hourlyRate ?? 0}/hr</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => edit(student)} aria-label={`Edit ${student.name}`}>
                    <Icon name="edit" className="h-4 w-4" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove.mutate(student.id)} aria-label={`Delete ${student.name}`}>
                    <Icon name="trash" className="h-4 w-4" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {students.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No students yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function StudentTextField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <TextField
      label={label}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      slotProps={type === 'number' ? { htmlInput: { min: 0, step: 1 } } : undefined}
    />
  );
}

function HeaderCell({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <TableCell align={align} sx={{ fontSize: 14, fontWeight: 500 }}>{children}</TableCell>;
}
