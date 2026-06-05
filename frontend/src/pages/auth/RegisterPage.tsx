import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { register } from '../../api/authApi';
import { apiErrorMessage } from '../../api/client';
import { Icon } from '../../components/ui/Icon';

export function RegisterPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate('/dashboard/profile'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      displayName: String(data.get('displayName')),
      email: String(data.get('email')),
      password: String(data.get('password')),
    });
  }

  return (
    <Box sx={{ alignItems: 'center', bgcolor: 'background.default', display: 'flex', minHeight: 'calc(100vh - 9rem)', px: 2, py: 6 }}>
      <Box sx={{ mx: 'auto', width: '100%', maxWidth: 448 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4, textAlign: 'center' }}>
          <Icon name="graduation" className="h-12 w-12 text-primary" />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>Create your account</Typography>
          <Typography color="text.secondary">Start tutoring with Tutr</Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack component="form" spacing={2.25} onSubmit={submit}>
            {mutation.error && (
              <Alert severity="error">
                {apiErrorMessage(mutation.error, 'Registration failed. Please check your details and try again.')}
              </Alert>
            )}
            <TextField name="displayName" label="Display name" placeholder="Your full name" required fullWidth />
            <TextField name="email" label="Email" type="email" placeholder="you@example.com" required fullWidth />
            <TextField
              name="password"
              label="Password"
              type="password"
              slotProps={{ htmlInput: { minLength: 8 } }}
              placeholder="At least 8 characters"
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={mutation.isPending} fullWidth>
              Register
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            After registering, you can complete your tutor profile and make it public.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
            Already registered?{' '}
            <Typography component={RouterLink} to="/login" variant="body2" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Login
            </Typography>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
