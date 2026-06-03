import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Students</h1>
        <button className="button gap-2" onClick={() => setShowForm(true)}>
          <Icon name="plus" className="h-4 w-4" />
          Add student
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{editing ? 'Edit student' : 'Add new student'}</h2>
            <button className="icon-button" onClick={resetForm} type="button" aria-label="Close form">
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <ErrorAlert className="md:col-span-2" error={save.error} fallback="Could not save the student. Please try again." />
            <FormInput label="Student name *" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <FormInput label="Parent name *" value={form.parentName ?? ''} onChange={(value) => setForm({ ...form, parentName: value })} required />
            <FormInput label="Student/parent Gmail *" type="email" value={form.parentEmail ?? ''} onChange={(value) => setForm({ ...form, parentEmail: value })} required />
            <FormInput label="Subject *" value={form.subject ?? ''} onChange={(value) => setForm({ ...form, subject: value })} required />
            <FormInput label="Parent phone *" value={form.parentPhone ?? ''} onChange={(value) => setForm({ ...form, parentPhone: value })} required />
            <FormInput label="School year *" value={form.schoolYear ?? ''} onChange={(value) => setForm({ ...form, schoolYear: value })} required />
            <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate ?? 0)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
            <div className="flex items-center pt-7">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring" />
                <span className="text-sm text-foreground">Active student</span>
              </label>
            </div>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Notes</span>
              <textarea className="input min-h-24 resize-none" value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button className="button" disabled={save.isPending}>{editing ? 'Update student' : 'Add student'}</button>
              <button className="button-secondary" type="button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <ErrorAlert className="mb-6" error={students.error} fallback="Could not load students. Please refresh the page." />
      <ErrorAlert className="mb-6" error={remove.error} fallback="Could not delete the student. Please try again." />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-border bg-muted">
            <tr>
              <Th>Name</Th>
              <Th>Subject</Th>
              <Th>Parent</Th>
              <Th>Rate</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {students.data?.map((student) => (
              <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.schoolYear}</p>
                </td>
                <td className="px-6 py-4 text-foreground">{student.subject}</td>
                <td className="px-6 py-4">
                  <p className="text-foreground">{student.parentName}</p>
                  <p className="text-sm text-muted-foreground">{student.parentEmail}</p>
                </td>
                <td className="px-6 py-4 text-foreground">${student.hourlyRate ?? 0}/hr</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="icon-button" onClick={() => edit(student)} aria-label={`Edit ${student.name}`}>
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button className="icon-button hover:bg-destructive/10 hover:text-destructive" onClick={() => remove.mutate(student.id)} aria-label={`Delete ${student.name}`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.data?.length === 0 && <p className="p-6 text-muted-foreground">No students yet.</p>}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-6 py-3 text-sm font-medium text-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
