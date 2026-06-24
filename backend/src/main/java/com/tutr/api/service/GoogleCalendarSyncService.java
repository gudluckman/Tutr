package com.tutr.api.service;

import com.tutr.api.enums.GoogleSyncStatus;
import com.tutr.api.enums.GoogleCalendarDeletionType;
import com.tutr.api.entity.GoogleCalendarConnection;
import com.tutr.api.entity.GoogleCalendarDeletion;
import com.tutr.api.entity.Lesson;
import com.tutr.api.entity.LessonSeries;
import com.tutr.api.entity.User;
import com.tutr.api.repository.GoogleCalendarDeletionRepository;
import com.tutr.api.repository.LessonRepository;
import com.tutr.api.repository.LessonSeriesRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static com.tutr.api.dto.GoogleCalendarDtos.GoogleCalendarRetryResponse;

@Service
@RequiredArgsConstructor
public class GoogleCalendarSyncService {
    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarSyncService.class);

    private final LessonRepository lessons;
    private final LessonSeriesRepository lessonSeries;
    private final GoogleCalendarDeletionRepository pendingDeletions;
    private final GoogleCalendarConnectionService connectionService;
    private final GoogleCalendarEventMapper eventMapper;
    private final RestClient restClient = RestClient.create();

    public boolean isConfigured() {
        return connectionService.isConfigured();
    }

    public Optional<GoogleCalendarConnection> connectionFor(User tutor) {
        return connectionService.connectionFor(tutor);
    }

    public String authUrl(String stateToken) {
        return connectionService.authUrl(stateToken);
    }

    @Transactional
    public void connect(User tutor, String code) {
        connectionService.connect(tutor, code);
        processPendingDeletions(tutor);
    }

    public String frontendRedirect() {
        return connectionService.frontendRedirect();
    }

    // -------------------------------------------------------------------------
    // Sync individual lesson (standalone)
    // -------------------------------------------------------------------------

    @Transactional
    public void syncLesson(Lesson lesson) {
        syncLesson(lesson, null);
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public void syncLesson(Lesson lesson, Instant previousLessonDate) {
        if (lesson.getLessonSeries() != null && lesson.getLessonSeries().isGoogleSyncEnabled()) {
            syncSeriesOccurrence(lesson, previousLessonDate);
            return;
        }
        if (!lesson.isGoogleSyncEnabled()) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.NOT_REQUESTED);
            return;
        }
        Optional<GoogleCalendarConnection> connection = connectionFor(lesson.getTutor());
        if (connection.isEmpty()) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.NOT_CONNECTED);
            lesson.setGoogleSyncError("Connect Google Calendar before syncing lessons.");
            return;
        }
        try {
            Map<String, Object> event = eventMapper.eventBody(
                    titleOrDefault(lesson.getTitle(), "Tutoring lesson"),
                    lesson.getLessonDate().toString(),
                    lesson.getLessonDate().plusSeconds(lesson.getDurationMinutes() * 60L).toString(),
                    lesson.getStudent().getName(),
                    lesson.getMiroBoardUrl(),
                    lesson.getLessonLinks(),
                    lesson.getLessonNotes(),
                    lesson.getHomework(),
                    lesson.getInviteEmail(),
                    lesson.getGoogleColorId(),
                    lesson.getGoogleExtraReminderMinutes()
            );

            Map<String, Object> response;
            if (isBlank(lesson.getGoogleEventId())) {
                response = restClient.post()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events"
                                + "?conferenceDataVersion=1&sendUpdates=all",
                                connection.get().getCalendarId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            } else {
                response = restClient.put()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                                + "?conferenceDataVersion=1&sendUpdates=all",
                                connection.get().getCalendarId(), lesson.getGoogleEventId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            }

            if (response != null) {
                lesson.setGoogleEventId(String.valueOf(response.get("id")));
                lesson.setGoogleMeetLink(eventMapper.meetLink(response).orElse(lesson.getGoogleMeetLink()));
            }
            lesson.setGoogleCalendarId(connection.get().getCalendarId());
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync lesson {} to Google Calendar", lesson.getId(), ex);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            lesson.setGoogleSyncError(ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Sync one occurrence inside a recurring series
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private void syncSeriesOccurrence(Lesson lesson, Instant previousLessonDate) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || isBlank(series.getGoogleEventId())) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.NOT_REQUESTED);
            return;
        }
        Optional<GoogleCalendarConnection> connection = connectionFor(lesson.getTutor());
        if (connection.isEmpty()) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.NOT_CONNECTED);
            lesson.setGoogleSyncError("Connect Google Calendar before syncing lessons.");
            return;
        }
        try {
            // Resolve the instance event-id if we don't already have it.
            String eventId = lesson.getGoogleEventId();
            if (isBlank(eventId)) {
                // FIX: search only a narrow time window so we don't page through all history.
                eventId = seriesInstanceEventId(
                        connection.get(), series,
                        previousLessonDate != null ? previousLessonDate : lesson.getLessonDate(),
                        lesson.getLessonDate())
                        .orElseThrow(() -> new IllegalStateException(
                                "Could not find this recurring lesson in Google Calendar."));
            }

            Map<String, Object> event = eventMapper.eventBody(
                    titleOrDefault(lesson.getTitle(), "Tutoring lesson"),
                    lesson.getLessonDate().toString(),
                    lesson.getLessonDate().plusSeconds(lesson.getDurationMinutes() * 60L).toString(),
                    lesson.getStudent().getName(),
                    lesson.getMiroBoardUrl(),
                    lesson.getLessonLinks(),
                    lesson.getLessonNotes(),
                    lesson.getHomework(),
                    lesson.getInviteEmail(),
                    lesson.getGoogleColorId(),
                    lesson.getGoogleExtraReminderMinutes()
            );

            // PATCH only the single occurrence (not PUT which would detach from series)
            Map<String, Object> response = restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                            + "?conferenceDataVersion=1&sendUpdates=all",
                            connection.get().getCalendarId(), eventId)
                    .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                    .body(event)
                    .retrieve()
                    .body(Map.class);

            lesson.setGoogleEventId(response == null ? eventId : String.valueOf(response.get("id")));
            lesson.setGoogleCalendarId(connection.get().getCalendarId());
            lesson.setGoogleMeetLink(response == null ? lesson.getGoogleMeetLink()
                    : eventMapper.meetLink(response).orElse(lesson.getGoogleMeetLink()));
            lesson.setGoogleSyncEnabled(true);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync recurring lesson occurrence {} to Google Calendar",
                    lesson.getId(), ex);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            lesson.setGoogleSyncError(ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Create / update the recurring series event
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Transactional
    public void syncSeries(LessonSeries series) {
        if (!series.isGoogleSyncEnabled()) {
            series.setGoogleSyncStatus(GoogleSyncStatus.NOT_REQUESTED);
            return;
        }
        Optional<GoogleCalendarConnection> connection = connectionFor(series.getTutor());
        if (connection.isEmpty()) {
            series.setGoogleSyncStatus(GoogleSyncStatus.NOT_CONNECTED);
            series.setGoogleSyncError("Connect Google Calendar before syncing recurring lessons.");
            return;
        }
        try {
            Map<String, Object> event = eventMapper.eventBody(
                    titleOrDefault(series.getTitle(), "Recurring tutoring lesson"),
                    series.getFirstLessonDate().toString(),
                    series.getFirstLessonDate().plusSeconds(series.getDurationMinutes() * 60L).toString(),
                    series.getStudent().getName(),
                    series.getMiroBoardUrl(),
                    series.getLessonLinks(),
                    null,
                    null,
                    series.getInviteEmail(),
                    series.getGoogleColorId(),
                    series.getGoogleExtraReminderMinutes()
            );
            // Always use the canonical RRULE and preserve locally excluded occurrences.
            event.put("recurrence", eventMapper.recurrenceFor(series));

            Map<String, Object> response;
            if (isBlank(series.getGoogleEventId())) {
                response = restClient.post()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events"
                                + "?conferenceDataVersion=1&sendUpdates=all",
                                connection.get().getCalendarId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            } else {
                // PUT replaces the entire series including all future occurrences.
                response = restClient.put()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                                + "?conferenceDataVersion=1&sendUpdates=all",
                                connection.get().getCalendarId(), series.getGoogleEventId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            }

            series.setGoogleEventId(response == null ? series.getGoogleEventId()
                    : String.valueOf(response.get("id")));
            series.setGoogleMeetLink(response == null ? series.getGoogleMeetLink()
                    : eventMapper.meetLink(response).orElse(series.getGoogleMeetLink()));
            series.setGoogleCalendarId(connection.get().getCalendarId());
            series.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            series.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync recurring lesson series {} to Google Calendar", series.getId(), ex);
            series.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            series.setGoogleSyncError(ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Delete helpers
    // -------------------------------------------------------------------------

    @Transactional
    public void deleteLessonEvent(Lesson lesson) {
        if (isBlank(lesson.getGoogleEventId())) return;
        Optional<GoogleCalendarConnection> connection = connectionFor(lesson.getTutor());
        if (connection.isEmpty()) {
            queueEventDeletion(lesson.getTutor(), lesson.getGoogleCalendarId(),
                    lesson.getGoogleEventId());
            return;
        }
        try {
            deleteEvent(connection.get(), lesson.getGoogleEventId(), "lesson " + lesson.getId());
        } catch (IllegalStateException ex) {
            queueEventDeletion(lesson.getTutor(), lesson.getGoogleCalendarId(),
                    lesson.getGoogleEventId());
        }
    }

    @Transactional
    public void deleteSeriesEvent(LessonSeries series) {
        if (isBlank(series.getGoogleEventId())) return;
        Optional<GoogleCalendarConnection> connection = connectionFor(series.getTutor());
        if (connection.isEmpty()) {
            queueEventDeletion(series.getTutor(), series.getGoogleCalendarId(),
                    series.getGoogleEventId());
            return;
        }
        try {
            deleteEvent(connection.get(), series.getGoogleEventId(),
                    "recurring lesson series " + series.getId());
        } catch (IllegalStateException ex) {
            queueEventDeletion(series.getTutor(), series.getGoogleCalendarId(),
                    series.getGoogleEventId());
        }
    }

    // -------------------------------------------------------------------------
    // Truncate a recurring series at a specific lesson
    // -------------------------------------------------------------------------

    @Transactional
    public void endSeriesBefore(Lesson lesson, List<Lesson> followingLessons) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null) return;

        Instant until = lesson.getLessonDate().minusSeconds(1);
        series.setOccurrenceCount(null);
        series.setRecurrenceUntil(until);
        series.setRecurrenceRule(eventMapper.rrule(series));

        if (isBlank(series.getGoogleEventId())) return;

        Optional<GoogleCalendarConnection> connection = connectionFor(series.getTutor());
        List<String> knownOverrides = followingLessons.stream()
                .map(Lesson::getGoogleEventId)
                .filter(eventId -> !isBlank(eventId))
                .toList();
        if (connection.isEmpty()) {
            queueSeriesTruncation(series, lesson.getLessonDate(), knownOverrides);
            return;
        }

        // Collect Google instance-event IDs that sit on or after the cut-off BEFORE we
        // truncate the series, so we don't lose them once Google hides future occurrences.
        List<String> futureInstanceIds = futureSeriesInstanceEventIds(
                connection.get(), series, lesson.getLessonDate());

        // Google treats RRULE UNTIL as inclusive, so put the boundary one second before
        // the first removed occurrence. These lessons are date-time events in UTC.
        try {
            restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                            + "?sendUpdates=all",
                            connection.get().getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                    .body(Map.of("recurrence", List.of(series.getRecurrenceRule())))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ex) {
            log.warn("Failed to end recurring lesson series {} in Google Calendar", series.getId(), ex);
            queueSeriesTruncation(series, lesson.getLessonDate(), knownOverrides);
            return;
        }

        // Clean up any individual occurrence overrides that Google retained after truncation.
        Set<String> toDelete = new HashSet<>();
        for (Lesson following : followingLessons) {
            if (!isBlank(following.getGoogleEventId())) {
                toDelete.add(following.getGoogleEventId());
            }
        }
        toDelete.addAll(futureInstanceIds);
        toDelete.remove(series.getGoogleEventId()); // never delete the parent
        try {
            for (String eventId : toDelete) {
                deleteEvent(connection.get(), eventId, "future recurring lesson occurrence");
            }
        } catch (IllegalStateException ex) {
            queueSeriesTruncation(series, lesson.getLessonDate(), new ArrayList<>(toDelete));
        }
    }

    // -------------------------------------------------------------------------
    // Exclude (cancel) a single occurrence from a recurring series
    // -------------------------------------------------------------------------

    @Transactional
    public void excludeSeriesOccurrence(Lesson lesson) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || isBlank(series.getGoogleEventId())) return;

        Optional<GoogleCalendarConnection> connection = connectionFor(series.getTutor());
        if (connection.isEmpty()) {
            queueOccurrenceExclusion(lesson);
            return;
        }
        try {
            // FIX: fetch the live recurrence list from Google so we don't clobber
            // EXDATE entries that were added outside this application.
            @SuppressWarnings("unchecked")
            Map<String, Object> event = restClient.get()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}",
                            connection.get().getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                    .retrieve()
                    .body(Map.class);
            if (event != null && !event.isEmpty()) {
                eventMapper.applyToSeries(series, event);
            }

            List<String> recurrence = eventMapper.recurrenceWithExdate(
                    event, series.getRecurrenceRule(), lesson.getLessonDate());

            restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                            + "?sendUpdates=all",
                            connection.get().getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + connectionService.accessToken(connection.get()))
                    .body(Map.of("recurrence", recurrence))
                    .retrieve()
                    .toBodilessEntity();

            // Also delete any override that was already created for this occurrence.
            if (!isBlank(lesson.getGoogleEventId())) {
                deleteEvent(connection.get(), lesson.getGoogleEventId(),
                        "recurring lesson occurrence " + lesson.getId());
            }
        } catch (RuntimeException ex) {
            log.warn("Failed to exclude recurring lesson occurrence {} from Google Calendar",
                    lesson.getId(), ex);
            queueOccurrenceExclusion(lesson);
        }
    }

    @Transactional
    public int processPendingDeletions(User tutor) {
        Optional<GoogleCalendarConnection> connection = connectionFor(tutor);
        if (connection.isEmpty()) {
            return 0;
        }

        int completed = 0;
        for (GoogleCalendarDeletion pending
                : pendingDeletions.findByTutorOrderByCreatedAtAsc(tutor)) {
            try {
                processPendingDeletion(connection.get(), pending);
                pendingDeletions.delete(pending);
                completed++;
            } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone ex) {
                pendingDeletions.delete(pending);
                completed++;
            } catch (RuntimeException ex) {
                log.warn("Could not replay pending Google Calendar deletion {}",
                        pending.getId(), ex);
                break;
            }
        }
        return completed;
    }

    @Transactional
    public GoogleCalendarRetryResponse retryFailedSyncs(User tutor) {
        int attempted = 0;
        int synced = 0;

        for (LessonSeries series : lessonSeries.findByTutorOrderByFirstLessonDateDesc(tutor)) {
            if (!series.isGoogleSyncEnabled() || !needsRetry(series.getGoogleSyncStatus())) {
                continue;
            }
            attempted++;
            syncSeries(series);
            if (series.getGoogleSyncStatus() == GoogleSyncStatus.SYNCED) {
                synced++;
            }
        }

        for (Lesson lesson : lessons.findByTutorOrderByLessonDateDesc(tutor)) {
            if (lesson.getLessonSeries() != null
                    || !lesson.isGoogleSyncEnabled()
                    || !needsRetry(lesson.getGoogleSyncStatus())) {
                continue;
            }
            attempted++;
            syncLesson(lesson);
            if (lesson.getGoogleSyncStatus() == GoogleSyncStatus.SYNCED) {
                synced++;
            }
        }

        return new GoogleCalendarRetryResponse(attempted, synced, attempted - synced);
    }

    // -------------------------------------------------------------------------
    // Private: find the instance event-id for a specific occurrence
    // FIX: narrow search window around the target date instead of
    //      paging through the entire series history.
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private Optional<String> seriesInstanceEventId(GoogleCalendarConnection connection,
                                                    LessonSeries series,
                                                    Instant windowAnchor,
                                                    Instant lessonDate) {
        // Candidate start times: the previous date (if rescheduled) and the current date.
        Set<Instant> candidateStarts = new HashSet<>();
        candidateStarts.add(lessonDate);
        if (windowAnchor != null && !windowAnchor.equals(lessonDate)) {
            candidateStarts.add(windowAnchor);
        }

        Instant earliest = candidateStarts.stream().min(Instant::compareTo).orElse(lessonDate);
        Instant latest = candidateStarts.stream().max(Instant::compareTo).orElse(lessonDate);
        Instant timeMin = earliest.minus(1, ChronoUnit.DAYS);
        Instant timeMax = latest.plus(2, ChronoUnit.DAYS);

        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars"
                                + "/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", false)
                        .queryParam("timeMin", timeMin.toString())
                        .queryParam("timeMax", timeMax.toString())
                        .queryParam("maxResults", 50); // small window, 50 is more than enough
                if (!isBlank(pageToken)) {
                    uri.queryParam("pageToken", pageToken);
                }

                Map<String, Object> response = restClient.get()
                        .uri(uri.build(connection.getCalendarId(), series.getGoogleEventId()))
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                        .retrieve()
                        .body(Map.class);

                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (!(item instanceof Map<?, ?> rawEvent) || rawEvent.get("id") == null) {
                            continue;
                        }
                        Map<String, Object> event = (Map<String, Object>) rawEvent;
                        Optional<Instant> originalStart =
                                eventMapper.startTime(event.get("originalStartTime"));
                        Optional<Instant> start = eventMapper.startTime(event.get("start"));
                        boolean matches = candidateStarts.stream().anyMatch(candidate ->
                                originalStart.filter(candidate::equals).isPresent()
                                        || start.filter(candidate::equals).isPresent());
                        if (matches) {
                            return Optional.of(String.valueOf(event.get("id")));
                        }
                    }
                }

                pageToken = (response == null || response.get("nextPageToken") == null) ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not find Google Calendar occurrence for lesson around {}",
                        lessonDate, ex);
                return Optional.empty();
            }
        } while (pageToken != null);

        return Optional.empty();
    }

    private void queueEventDeletion(User tutor, String calendarId, String eventId) {
        GoogleCalendarDeletion pending = new GoogleCalendarDeletion();
        pending.setTutor(tutor);
        pending.setDeletionType(GoogleCalendarDeletionType.DELETE_EVENT);
        pending.setCalendarId(calendarIdOrPrimary(calendarId));
        pending.setEventId(eventId);
        pendingDeletions.save(pending);
    }

    private void queueOccurrenceExclusion(Lesson lesson) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || isBlank(series.getGoogleEventId())) {
            return;
        }
        GoogleCalendarDeletion pending = new GoogleCalendarDeletion();
        pending.setTutor(series.getTutor());
        pending.setDeletionType(GoogleCalendarDeletionType.EXCLUDE_OCCURRENCE);
        pending.setCalendarId(calendarIdOrPrimary(series.getGoogleCalendarId()));
        pending.setEventId(series.getGoogleEventId());
        pending.setOccurrenceDate(lesson.getLessonDate());
        pending.setRecurrenceRule(series.getRecurrenceRule());
        pending.setRelatedEventIds(isBlank(lesson.getGoogleEventId())
                ? List.of()
                : List.of(lesson.getGoogleEventId()));
        pendingDeletions.save(pending);
    }

    private void queueSeriesTruncation(
            LessonSeries series,
            Instant cutoff,
            List<String> knownOverrides
    ) {
        GoogleCalendarDeletion pending = new GoogleCalendarDeletion();
        pending.setTutor(series.getTutor());
        pending.setDeletionType(GoogleCalendarDeletionType.TRUNCATE_SERIES);
        pending.setCalendarId(calendarIdOrPrimary(series.getGoogleCalendarId()));
        pending.setEventId(series.getGoogleEventId());
        pending.setOccurrenceDate(cutoff);
        pending.setRecurrenceRule(series.getRecurrenceRule());
        pending.setRelatedEventIds(knownOverrides);
        pendingDeletions.save(pending);
    }

    @SuppressWarnings("unchecked")
    private void processPendingDeletion(
            GoogleCalendarConnection connection,
            GoogleCalendarDeletion pending
    ) {
        switch (pending.getDeletionType()) {
            case DELETE_EVENT -> deleteEvent(
                    connection, pending.getCalendarId(), pending.getEventId(),
                    "pending calendar event");
            case EXCLUDE_OCCURRENCE -> {
                Map<String, Object> event = restClient.get()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}",
                                pending.getCalendarId(), pending.getEventId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                        .retrieve()
                        .body(Map.class);
                List<String> recurrence = eventMapper.recurrenceWithExdate(
                        event, pending.getRecurrenceRule(), pending.getOccurrenceDate());
                restClient.patch()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                                        + "?sendUpdates=all",
                                pending.getCalendarId(), pending.getEventId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                        .body(Map.of("recurrence", recurrence))
                        .retrieve()
                        .toBodilessEntity();
                for (String eventId : pending.getRelatedEventIds()) {
                    deleteEvent(connection, pending.getCalendarId(), eventId,
                            "pending recurring lesson occurrence");
                }
            }
            case TRUNCATE_SERIES -> {
                Set<String> occurrenceIds = new HashSet<>(pending.getRelatedEventIds());
                occurrenceIds.addAll(futureSeriesInstanceEventIds(
                        connection,
                        pending.getCalendarId(),
                        pending.getEventId(),
                        pending.getOccurrenceDate()));
                restClient.patch()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                                        + "?sendUpdates=all",
                                pending.getCalendarId(), pending.getEventId())
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                        .body(Map.of("recurrence", List.of(pending.getRecurrenceRule())))
                        .retrieve()
                        .toBodilessEntity();
                occurrenceIds.remove(pending.getEventId());
                for (String eventId : occurrenceIds) {
                    deleteEvent(connection, pending.getCalendarId(), eventId,
                            "pending future recurring lesson occurrence");
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private: delete helpers
    // -------------------------------------------------------------------------

    private void deleteEvent(GoogleCalendarConnection connection, String eventId, String label) {
        deleteEvent(connection, connection.getCalendarId(), eventId, label);
    }

    private void deleteEvent(
            GoogleCalendarConnection connection,
            String calendarId,
            String eventId,
            String label
    ) {
        if (isBlank(eventId)) return;
        try {
            restClient.delete()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}"
                            + "?sendUpdates=all",
                            calendarIdOrPrimary(calendarId), eventId)
                    .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone ignored) {
            log.info("Google Calendar event {} for {} was already gone", eventId, label);
        } catch (RuntimeException ex) {
            log.warn("Failed to delete Google Calendar event {} for {}", eventId, label, ex);
            throw new IllegalStateException(
                    "Could not delete Google Calendar event. Try again before deleting local lessons.",
                    ex);
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> futureSeriesInstanceEventIds(GoogleCalendarConnection connection,
                                                       LessonSeries series, Instant cutoff) {
        return futureSeriesInstanceEventIds(
                connection,
                calendarIdOrPrimary(series.getGoogleCalendarId()),
                series.getGoogleEventId(),
                cutoff);
    }

    @SuppressWarnings("unchecked")
    private List<String> futureSeriesInstanceEventIds(
            GoogleCalendarConnection connection,
            String calendarId,
            String seriesEventId,
            Instant cutoff
    ) {
        List<String> eventIds = new ArrayList<>();
        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars"
                                + "/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", false)
                        .queryParam("timeMin", cutoff.toString())
                        .queryParam("maxResults", 2500);
                if (!isBlank(pageToken)) {
                    uri.queryParam("pageToken", pageToken);
                }

                Map<String, Object> response = restClient.get()
                        .uri(uri.build(calendarId, seriesEventId))
                        .header("Authorization", "Bearer " + connectionService.accessToken(connection))
                        .retrieve()
                        .body(Map.class);

                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (!(item instanceof Map<?, ?> event) || event.get("id") == null) continue;
                        Instant comparableStart =
                                eventMapper.startTime(event.get("originalStartTime"))
                                        .or(() -> eventMapper.startTime(event.get("start")))
                                        .orElse(null);
                        if (comparableStart != null && !comparableStart.isBefore(cutoff)) {
                            eventIds.add(String.valueOf(event.get("id")));
                        }
                    }
                }

                pageToken = (response == null || response.get("nextPageToken") == null) ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not list future Google Calendar occurrences for series {}",
                        seriesEventId, ex);
                return List.of();
            }
        } while (pageToken != null);
        return eventIds;
    }

    public String rrule(LessonSeries series) {
        return eventMapper.rrule(series);
    }

    // -------------------------------------------------------------------------
    // Private: small utilities
    // -------------------------------------------------------------------------

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static boolean needsRetry(GoogleSyncStatus status) {
        return status == GoogleSyncStatus.FAILED || status == GoogleSyncStatus.NOT_CONNECTED;
    }

    private static String calendarIdOrPrimary(String calendarId) {
        return isBlank(calendarId) ? "primary" : calendarId;
    }

    private static String titleOrDefault(String title, String defaultTitle) {
        return isBlank(title) ? defaultTitle : title;
    }
}
