import { useState } from 'react';
import { FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { ConfirmDeleteDialog } from '../../../components/ui/ConfirmDeleteDialog';
import type { Lesson } from '../../../types/lesson';
import type { LessonDeleteScope } from './types';

type DeleteOption = {
  value: LessonDeleteScope;
  label: string;
};

export function DeleteLessonDialog({
  lesson,
  isDeleting,
  onClose,
  onConfirm,
}: {
  lesson: Lesson;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (scope: LessonDeleteScope) => void;
}) {
  const isRecurring = Boolean(lesson.lessonSeriesId);
  const [scope, setScope] = useState<LessonDeleteScope>('SINGLE');
  const options: DeleteOption[] = isRecurring
    ? [
        { value: 'SINGLE', label: 'This event' },
        { value: 'FOLLOWING', label: 'This and following events' },
        { value: 'SERIES', label: 'All events' },
      ]
    : [{ value: 'SINGLE', label: 'This lesson' }];

  const lessonLabel = lesson.title ? `${lesson.title} with ${lesson.studentName}` : `the lesson with ${lesson.studentName}`;

  return (
    <ConfirmDeleteDialog
      open
      title="Delete lesson?"
      message={`Are you sure you want to delete ${lessonLabel}? This cannot be undone.`}
      isDeleting={isDeleting}
      confirmLabel={isRecurring ? 'OK' : 'Delete'}
      onClose={onClose}
      onConfirm={() => onConfirm(scope)}
    >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {isRecurring
            ? 'Choose which recurring lessons to delete.'
            : 'This lesson and its synced Google Calendar event will be removed.'}
        </Typography>
        <RadioGroup value={scope} onChange={(event) => setScope(event.target.value as LessonDeleteScope)}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              disabled={isDeleting}
              control={<Radio color="success" />}
              label={option.label}
            />
          ))}
        </RadioGroup>
    </ConfirmDeleteDialog>
  );
}
