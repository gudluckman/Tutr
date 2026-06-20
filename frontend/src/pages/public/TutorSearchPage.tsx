import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { searchTutors } from '../../api/tutorApi';
import { apiErrorMessage, assetUrl } from '../../api/client';
import { initials } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { Link as RouterLink } from 'react-router-dom';
import type { TutorProfile } from '../../types/tutor';
import { teachingYearLabel } from '../dashboard/profileTeachingOptions';

export function TutorSearchPage() {
  const [filters, setFilters] = useState({ subject: '', location: '', tutorYear: '', online: false });
  const [submittedFilters, setSubmittedFilters] = useState(filters);
  const tutors = useQuery({
    queryKey: ['tutors', submittedFilters],
    queryFn: () => searchTutors({
      subject: submittedFilters.subject || undefined,
      location: submittedFilters.location || undefined,
      tutorYear: submittedFilters.tutorYear || undefined,
      online: submittedFilters.online || undefined,
    }),
  });

  return (
    <Box sx={{ bgcolor: 'rgb(var(--background))', minHeight: '100vh', py: { xs: 3, sm: 5 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 600, mb: { xs: 3, sm: 4 } }}>Find a tutor</Typography>

        <Paper
          component="form"
          variant="outlined"
          sx={{ bgcolor: 'rgb(var(--card))', mb: 4, p: { xs: 2, sm: 2.25 } }}
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedFilters(filters);
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: { xs: 'wrap', md: 'nowrap' },
              gap: 1.5,
              width: '100%',
            }}
          >
            <SearchTextField
              label="Subject"
              placeholder="e.g. Maths, English"
              value={filters.subject}
              onChange={(value) => setFilters({ ...filters, subject: value })}
              sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: { md: 0 } }}
            />
            <SearchTextField
              label="Location"
              placeholder="e.g. Sydney, Melbourne"
              value={filters.location}
              onChange={(value) => setFilters({ ...filters, location: value })}
              sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: { md: 0 } }}
            />
            <SearchTextField
              label="Student year level"
              placeholder="e.g. Year 10 or Primary"
              value={filters.tutorYear}
              onChange={(value) => setFilters({ ...filters, tutorYear: value })}
              sx={{ flex: { xs: '1 1 100%', md: '0.75 1 0' }, minWidth: { md: 0 } }}
            />
            <Box sx={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', flexShrink: 0, justifyContent: 'flex-end' }}>
              <Box sx={{ display: { xs: 'none', md: 'block' }, height: 28 }} />
              <FormControlLabel
                control={<Checkbox checked={filters.online} onChange={(event) => setFilters({ ...filters, online: event.target.checked })} />}
                label="Online"
              sx={{ height: 48, m: 0, whiteSpace: 'nowrap' }}
              />
            </Box>
            <Box sx={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', flexShrink: 0, justifyContent: 'flex-end' }}>
              <Box sx={{ display: { xs: 'none', md: 'block' }, height: 28 }} />
              <Button
                type="submit"
                variant="contained"
                size="medium"
                startIcon={<Icon name="search" className="h-4 w-4" />}
                sx={{ height: 48, minWidth: { sm: 96 }, px: 1.75, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
              >
                Search
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {tutors.data?.map((tutor) => <TutorResultCard key={tutor.id} tutor={tutor} />)}
        </Box>
        {tutors.error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {apiErrorMessage(tutors.error, 'Could not load tutors. Please try again.')}
          </Alert>
        )}
        {tutors.isLoading && <Typography color="text.secondary">Loading tutors...</Typography>}
        {tutors.data?.length === 0 && <Typography color="text.secondary">No public tutors yet.</Typography>}
      </Container>
    </Box>
  );
}

function SearchTextField({
  label,
  placeholder,
  value,
  onChange,
  sx,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  sx?: object;
}) {
  return (
    <Box sx={sx}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>{label}</Typography>
      <TextField
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': label } }}
        sx={{ '& .MuiInputBase-root': { height: 48 } }}
        fullWidth
      />
    </Box>
  );
}

function TutorResultCard({ tutor }: { tutor: TutorProfile }) {
  const imageUrl = assetUrl(tutor.profileImageUrl);
  const teachingOfferings = tutor.teachingOfferings ?? [];
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{ p: 3, transition: 'box-shadow 160ms ease, transform 160ms ease', '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' } }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', mb: 2 }}>
        <Avatar
          src={imageUrl}
          alt={tutor.displayName}
          sx={{ width: 56, height: 56, bgcolor: '#eef2ff', color: 'primary.main', fontWeight: 600 }}
        >
          {initials(tutor.displayName)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>{tutor.displayName}</Typography>
          {tutor.location && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, color: 'text.secondary' }}>
              <Icon name="mapPin" className="h-4 w-4" />
              <Typography variant="body2">{tutor.location}</Typography>
            </Stack>
          )}
        </Box>
      </Stack>
      {(tutor.online || tutor.tutorYear || teachingOfferings.length > 0) && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {tutor.online && (
            <Chip
              icon={<Icon name="globe" className="h-3.5 w-3.5" />}
              label="Online lessons"
              size="small"
              sx={{ bgcolor: 'rgba(22, 163, 74, 0.1)', color: 'success.dark' }}
            />
          )}
          {teachingOfferings.slice(0, 4).map((offering) => (
            <Chip key={`${offering.tutorYear}-${offering.subject}`} label={`${teachingYearLabel(offering.tutorYear)} - ${offering.subject}`} size="small" sx={{ bgcolor: '#f5f5f5', color: 'text.secondary' }} />
          ))}
          {teachingOfferings.length === 0 && tutor.tutorYear && <Chip label={teachingYearLabel(tutor.tutorYear)} size="small" sx={{ bgcolor: '#f5f5f5', color: 'text.secondary' }} />}
          {teachingOfferings.length > 4 && <Chip label={`+${teachingOfferings.length - 4} more`} size="small" sx={{ bgcolor: '#f5f5f5', color: 'text.secondary' }} />}
        </Stack>
      )}
      <Typography variant="body2" sx={{ mb: 1.5 }}>{tutor.headline || 'Independent tutor on Tutr'}</Typography>
      <Stack spacing={0.5} sx={{ mb: 2, minHeight: 40 }}>
        {tutor.university && <Typography variant="body2" color="text.secondary">{tutor.university}</Typography>}
        {tutor.degree && <Typography variant="body2" color="text.secondary">{tutor.degree}</Typography>}
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', pt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{rateLabel(tutor)}</Typography>
        <Button component={RouterLink} to={`/tutors/${tutor.slug}`} variant="contained" size="small">View profile</Button>
      </Stack>
    </Paper>
  );
}

function rateLabel(tutor: TutorProfile) {
  if (tutor.hourlyRateMin && tutor.hourlyRateMax) return `$${tutor.hourlyRateMin}-${tutor.hourlyRateMax}/hr`;
  if (tutor.hourlyRateMin) return `From $${tutor.hourlyRateMin}/hr`;
  if (tutor.hourlyRateMax) return `Up to $${tutor.hourlyRateMax}/hr`;
  return 'Rate on enquiry';
}
