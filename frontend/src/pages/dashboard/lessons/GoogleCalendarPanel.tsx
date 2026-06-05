import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export function GoogleCalendarPanel({
  configured,
  connected,
  email,
  onConnect,
  isConnecting,
  onSyncDeletions,
  isSyncingDeletions,
}: {
  configured: boolean;
  connected: boolean;
  email?: string | null;
  onConnect: () => void;
  isConnecting: boolean;
  onSyncDeletions: () => void;
  isSyncingDeletions: boolean;
}) {
  const panelTone = connected
    ? { borderColor: '#bbf7d0', bgcolor: '#f0fdf4', color: '#14532d' }
    : configured
      ? { borderColor: '#fde68a', bgcolor: '#fefce8', color: '#713f12' }
      : { borderColor: '#fecaca', bgcolor: '#fef2f2', color: '#7f1d1d' };

  return (
    <Paper component="section" variant="outlined" sx={{ ...panelTone, mb: 3, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Google Calendar</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {!configured ? 'Add Google OAuth env vars to enable calendar sync.' : connected ? `Connected${email ? ` as ${email}` : ''}.` : 'Connect Google Calendar to sync lessons when you create them.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {connected && (
            <Button variant="outlined" color="success" onClick={onSyncDeletions} disabled={isSyncingDeletions} sx={{ bgcolor: 'rgba(255,255,255,0.72)' }}>
            Sync deletions
            </Button>
          )}
          <Button variant={connected ? 'contained' : 'outlined'} color="success" onClick={onConnect} disabled={!configured || connected || isConnecting}>
            {connected ? 'Connected' : 'Connect Google Calendar'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
