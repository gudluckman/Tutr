import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, Typography } from '@mui/material';
import { Icon } from '../../../components/ui/Icon';
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

  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby="delete-lesson-title"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle id="delete-lesson-title" sx={{ pb: 0.75, pr: 6, fontSize: 20, fontWeight: 600 }}>
        Delete lesson?
        <IconButton
          aria-label="Close delete dialog"
          disabled={isDeleting}
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <Icon name="x" className="h-5 w-5" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
          {lesson.title || 'Tutoring lesson'} with {lesson.studentName}
        </Typography>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="success" disabled={isDeleting} onClick={onClose}>Cancel</Button>
        <Button color="success" disabled={isDeleting} variant="contained" onClick={() => onConfirm(scope)}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
