import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { Icon } from '../../../components/ui/Icon';
import type { LessonUpdateScope } from './types';

export function UpdateRecurringLessonDialog({
  open,
  isUpdating,
  onClose,
  onConfirm,
}: {
  open: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: (scope: LessonUpdateScope) => void;
}) {
  const [scope, setScope] = useState<LessonUpdateScope>('SINGLE');

  useEffect(() => {
    if (open) setScope('SINGLE');
  }, [open]);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      onClose={isUpdating ? undefined : onClose}
      aria-labelledby="update-recurring-lesson-title"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle id="update-recurring-lesson-title" sx={{ pb: 0.75, pr: 6, fontSize: 20, fontWeight: 600 }}>
        Update recurring lesson?
        <IconButton
          aria-label="Close update dialog"
          disabled={isUpdating}
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <Icon name="x" className="h-5 w-5" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Choose which lessons should receive these changes.
        </Typography>
        <RadioGroup value={scope} onChange={(event) => setScope(event.target.value as LessonUpdateScope)}>
          <FormControlLabel value="SINGLE" disabled={isUpdating} control={<Radio color="success" />} label="This event" />
          <FormControlLabel value="FOLLOWING" disabled={isUpdating} control={<Radio color="success" />} label="This and following events" />
          <FormControlLabel value="SERIES" disabled={isUpdating} control={<Radio color="success" />} label="All events" />
        </RadioGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={isUpdating} onClick={onClose}>Cancel</Button>
        <Button disabled={isUpdating} variant="contained" onClick={() => onConfirm(scope)}>
          {isUpdating ? 'Updating...' : 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
