import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function ConfirmDeleteDialog({
  open,
  title,
  message,
  isDeleting,
  confirmLabel = 'Delete',
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  isDeleting: boolean;
  confirmLabel?: string;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby="confirm-delete-title"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle id="confirm-delete-title" sx={{ pb: 0.75, pr: 6, fontSize: 20, fontWeight: 600 }}>
        {title}
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
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={isDeleting} onClick={onClose}>Cancel</Button>
        <Button color="error" disabled={isDeleting} variant="contained" onClick={onConfirm}>
          {isDeleting ? 'Deleting...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
