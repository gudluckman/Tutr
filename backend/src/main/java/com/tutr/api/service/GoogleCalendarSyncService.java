package com.tutr.api.service;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.enums.GoogleSyncStatus;
import com.tutr.api.entity.Lesson;
import com.tutr.api.entity.LessonLink;
import com.tutr.api.repository.LessonRepository;
import com.tutr.api.entity.LessonSeries;
import com.tutr.api.repository.LessonSeriesRepository;
import com.tutr.api.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.tutr.api.dto.GoogleCalendarDtos.GoogleCalendarSyncResponse;

@Service
@RequiredArgsConstructor
public class GoogleCalendarSyncService {
    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarSyncService.class);
    private static final String CALENDAR_SCOPE = "openid email profile https://www.googleapis.com/auth/calendar.events";
    private static final DateTimeFormatter GOOGLE_EXDATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private final GoogleCalendarConnectionRepository connections;
    private final LessonRepository lessons;
    private final LessonSeriesRepository lessonSeries;
    private final RestClient restClient = RestClient.create();

    @Value("${app.google-calendar.client-id:}")
    private String clientId;

    @Value("${app.google-calendar.client-secret:}")
    private String clientSecret;

    @Value("${app.google-calendar.redirect-uri:http://localhost:8080/api/v1/calendar/google/callback}")
    private String redirectUri;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isConfigured() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    public Optional<GoogleCalendarConnection> connectionFor(User tutor) {
        return connections.findByTutor(tutor).filter(GoogleCalendarConnection::isSyncEnabled);
    }

    public String authUrl(String stateToken) {
        String encodedRedirect = encode(redirectUri);
        String encodedScope = encode(CALENDAR_SCOPE);
        String encodedState = encode(stateToken);
        return "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encodedRedirect
                + "&response_type=code"
                + "&scope=" + encodedScope
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + encodedState;
    }

    @SuppressWarnings("unchecked")
    public void connect(User tutor, String code) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");

        Map<String, Object> token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        String accessToken = String.valueOf(token.get("access_token"));
        String refreshToken = token.get("refresh_token") == null ? null : String.valueOf(token.get("refresh_token"));
        Number expiresIn = token.get("expires_in") instanceof Number number ? number : null;
        GoogleCalendarConnection connection = connections.findByTutor(tutor).orElseGet(GoogleCalendarConnection::new);
        connection.setTutor(tutor);
        connection.setAccessToken(accessToken);
        if (refreshToken != null) {
            connection.setRefreshToken(refreshToken);
        }
        if (expiresIn != null) {
            connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(expiresIn.longValue()));
        }
        connection.setGoogleAccountEmail(googleAccountEmail(accessToken).orElse(tutor.getEmail()));
        connection.setCalendarId("primary");
        connection.setSyncEnabled(true);
        connections.save(connection);
    }

    public String frontendRedirect() {
        return frontendUrl + "/dashboard/lessons?calendar=connected";
    }

    @SuppressWarnings("unchecked")
    public void syncLesson(Lesson lesson) {
        syncLesson(lesson, null);
    }

    @SuppressWarnings("unchecked")
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
            Map<String, Object> event = eventBody(
                    lesson.getTitle() == null || lesson.getTitle().isBlank() ? "Tutoring lesson" : lesson.getTitle(),
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
            if (lesson.getGoogleEventId() == null || lesson.getGoogleEventId().isBlank()) {
                response = restClient.post()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?conferenceDataVersion=1&sendUpdates=all", connection.get().getCalendarId())
                        .header("Authorization", "Bearer " + accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            } else {
                response = restClient.put()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?conferenceDataVersion=1&sendUpdates=all", connection.get().getCalendarId(), lesson.getGoogleEventId())
                        .header("Authorization", "Bearer " + accessToken(connection.get()))
                        .body(event)
                        .retrieve()
                        .body(Map.class);
            }
            lesson.setGoogleEventId(response == null ? lesson.getGoogleEventId() : String.valueOf(response.get("id")));
            lesson.setGoogleMeetLink(response == null ? lesson.getGoogleMeetLink() : googleMeetLink(response).orElse(lesson.getGoogleMeetLink()));
            lesson.setGoogleCalendarId(connection.get().getCalendarId());
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync lesson {} to Google Calendar", lesson.getId(), ex);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            lesson.setGoogleSyncError(ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void syncSeriesOccurrence(Lesson lesson, Instant previousLessonDate) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || series.getGoogleEventId() == null || series.getGoogleEventId().isBlank()) {
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
            String eventId = lesson.getGoogleEventId();
            if (eventId == null || eventId.isBlank()) {
                eventId = seriesInstanceEventId(connection.get(), series, previousLessonDate, lesson.getLessonDate())
                        .orElseThrow(() -> new IllegalStateException("Could not find this recurring lesson in Google Calendar."));
            }
            Map<String, Object> event = eventBody(
                    lesson.getTitle() == null || lesson.getTitle().isBlank() ? "Tutoring lesson" : lesson.getTitle(),
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
            Map<String, Object> response = restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?conferenceDataVersion=1&sendUpdates=all", connection.get().getCalendarId(), eventId)
                    .header("Authorization", "Bearer " + accessToken(connection.get()))
                    .body(event)
                    .retrieve()
                    .body(Map.class);
            lesson.setGoogleEventId(response == null ? eventId : String.valueOf(response.get("id")));
            lesson.setGoogleCalendarId(connection.get().getCalendarId());
            lesson.setGoogleMeetLink(response == null ? lesson.getGoogleMeetLink() : googleMeetLink(response).orElse(lesson.getGoogleMeetLink()));
            lesson.setGoogleSyncEnabled(true);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync recurring lesson occurrence {} to Google Calendar", lesson.getId(), ex);
            lesson.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            lesson.setGoogleSyncError(ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
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
            Map<String, Object> event = eventBody(
                    series.getTitle() == null || series.getTitle().isBlank() ? "Recurring tutoring lesson" : series.getTitle(),
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
            event.put("recurrence", List.of(series.getRecurrenceRule()));
            Map<String, Object> response = restClient.post()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?conferenceDataVersion=1&sendUpdates=all", connection.get().getCalendarId())
                    .header("Authorization", "Bearer " + accessToken(connection.get()))
                    .body(event)
                    .retrieve()
                    .body(Map.class);
            series.setGoogleEventId(response == null ? null : String.valueOf(response.get("id")));
            series.setGoogleMeetLink(response == null ? null : googleMeetLink(response).orElse(null));
            series.setGoogleCalendarId(connection.get().getCalendarId());
            series.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            series.setGoogleSyncError(null);
        } catch (RuntimeException ex) {
            log.warn("Failed to sync recurring lesson series {} to Google Calendar", series.getId(), ex);
            series.setGoogleSyncStatus(GoogleSyncStatus.FAILED);
            series.setGoogleSyncError(ex.getMessage());
        }
    }

    public void deleteLessonEvent(Lesson lesson) {
        if (lesson.getGoogleEventId() == null || lesson.getGoogleEventId().isBlank()) {
            return;
        }
        GoogleCalendarConnection connection = connectionFor(lesson.getTutor())
                .orElseThrow(() -> new IllegalStateException("Connect Google Calendar before deleting synced lessons."));
        deleteEvent(connection, lesson.getGoogleEventId(), "lesson " + lesson.getId());
    }

    public void deleteSeriesEvent(LessonSeries series) {
        if (series.getGoogleEventId() == null || series.getGoogleEventId().isBlank()) {
            return;
        }
        GoogleCalendarConnection connection = connectionFor(series.getTutor())
                .orElseThrow(() -> new IllegalStateException("Connect Google Calendar before deleting synced recurring lessons."));
        deleteEvent(connection, series.getGoogleEventId(), "recurring lesson series " + series.getId());
    }

    public void endSeriesBefore(Lesson lesson, List<Lesson> followingLessons) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || series.getGoogleEventId() == null || series.getGoogleEventId().isBlank()) {
            return;
        }
        GoogleCalendarConnection connection = connectionFor(series.getTutor())
                .orElseThrow(() -> new IllegalStateException("Connect Google Calendar before deleting synced recurring lessons."));
        List<String> futureInstanceIds = futureSeriesInstanceEventIds(connection, series, lesson.getLessonDate());
        series.setOccurrenceCount(null);
        series.setRecurrenceUntil(lesson.getLessonDate().minusSeconds(1));
        series.setRecurrenceRule(rrule(series));
        try {
            restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all", connection.getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .body(Map.of("recurrence", List.of(series.getRecurrenceRule())))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ex) {
            log.warn("Failed to end recurring lesson series {} in Google Calendar", series.getId(), ex);
            throw new IllegalStateException("Could not update Google Calendar recurring lesson. Try again before deleting local lessons.", ex);
        }

        Set<String> expectedFutureIds = new HashSet<>();
        for (Lesson followingLesson : followingLessons) {
            if (followingLesson.getGoogleEventId() != null && !followingLesson.getGoogleEventId().isBlank()) {
                expectedFutureIds.add(followingLesson.getGoogleEventId());
            }
        }
        expectedFutureIds.addAll(futureInstanceIds);
        expectedFutureIds.remove(series.getGoogleEventId());
        for (String eventId : expectedFutureIds) {
            deleteEventIfPresent(connection, eventId, "future recurring lesson occurrence");
        }
    }

    public void excludeSeriesOccurrence(Lesson lesson) {
        LessonSeries series = lesson.getLessonSeries();
        if (series == null || series.getGoogleEventId() == null || series.getGoogleEventId().isBlank()) {
            return;
        }
        GoogleCalendarConnection connection = connectionFor(series.getTutor())
                .orElseThrow(() -> new IllegalStateException("Connect Google Calendar before deleting synced recurring lessons."));
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = restClient.get()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}", connection.getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .retrieve()
                    .body(Map.class);
            List<String> recurrence = recurrenceWithExdate(event, series.getRecurrenceRule(), lesson.getLessonDate());
            restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all", connection.getCalendarId(), series.getGoogleEventId())
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .body(Map.of("recurrence", recurrence))
                    .retrieve()
                    .toBodilessEntity();
            if (lesson.getGoogleEventId() != null && !lesson.getGoogleEventId().isBlank()) {
                deleteEvent(connection, lesson.getGoogleEventId(), "recurring lesson occurrence " + lesson.getId());
            }
        } catch (RuntimeException ex) {
            log.warn("Failed to exclude recurring lesson occurrence {} from Google Calendar", lesson.getId(), ex);
            throw new IllegalStateException("Could not update Google Calendar recurring lesson. Try again before deleting local lessons.", ex);
        }
    }

    private void deleteEvent(GoogleCalendarConnection connection, String eventId, String label) {
        if (eventId == null || eventId.isBlank()) {
            return;
        }
        try {
            restClient.delete()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all", connection.getCalendarId(), eventId)
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone ignored) {
            log.info("Google Calendar event {} for {} was already gone", eventId, label);
        } catch (RuntimeException ex) {
            log.warn("Failed to delete Google Calendar event {} for {}", eventId, label, ex);
            throw new IllegalStateException("Could not delete Google Calendar event. Try again before deleting local lessons.", ex);
        }
    }

    private List<String> recurrenceWithExdate(Map<String, Object> event, String fallbackRule, Instant occurrence) {
        List<String> recurrence = new ArrayList<>();
        Object existing = event == null ? null : event.get("recurrence");
        if (existing instanceof List<?> existingRecurrence) {
            for (Object entry : existingRecurrence) {
                if (entry != null) {
                    recurrence.add(String.valueOf(entry));
                }
            }
        }
        if (recurrence.isEmpty() && fallbackRule != null && !fallbackRule.isBlank()) {
            recurrence.add(fallbackRule);
        }
        String exdate = "EXDATE:" + GOOGLE_EXDATE_FORMATTER.format(occurrence);
        if (!recurrence.contains(exdate)) {
            recurrence.add(exdate);
        }
        return recurrence;
    }

    @SuppressWarnings("unchecked")
    private List<String> futureSeriesInstanceEventIds(GoogleCalendarConnection connection, LessonSeries series, Instant cutoff) {
        List<String> eventIds = new ArrayList<>();
        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", false)
                        .queryParam("timeMin", cutoff.toString())
                        .queryParam("maxResults", 2500);
                if (pageToken != null && !pageToken.isBlank()) {
                    uri.queryParam("pageToken", pageToken);
                }
                Map<String, Object> response = restClient.get()
                        .uri(uri.build(connection.getCalendarId(), series.getGoogleEventId()))
                        .header("Authorization", "Bearer " + accessToken(connection))
                        .retrieve()
                        .body(Map.class);
                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (!(item instanceof Map<?, ?> event) || event.get("id") == null) {
                            continue;
                        }
                        Instant comparableStart = googleStartTime(event.get("originalStartTime"))
                                .or(() -> googleStartTime(event.get("start")))
                                .orElse(null);
                        if (comparableStart != null && !comparableStart.isBefore(cutoff)) {
                            eventIds.add(String.valueOf(event.get("id")));
                        }
                    }
                }
                pageToken = response == null || response.get("nextPageToken") == null
                        ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not list future Google Calendar occurrences for series {}", series.getId(), ex);
                return List.of();
            }
        } while (pageToken != null);
        return eventIds;
    }

    private void deleteEventIfPresent(GoogleCalendarConnection connection, String eventId, String label) {
        try {
            deleteEvent(connection, eventId, label);
        } catch (IllegalStateException ex) {
            log.warn("Could not delete optional Google Calendar event {} for {}", eventId, label, ex);
        }
    }

    @Transactional
    public int syncDeletedLessons(User tutor) {
        return syncCalendarChanges(tutor).deletedLessons();
    }

    @Transactional
    public GoogleCalendarSyncResponse syncCalendarChanges(User tutor) {
        Optional<GoogleCalendarConnection> connection = connectionFor(tutor);
        if (connection.isEmpty()) {
            return new GoogleCalendarSyncResponse(0, 0);
        }

        int deleted = 0;
        int updated = 0;
        for (Lesson lesson : lessons.findByTutorAndGoogleEventIdIsNotNull(tutor)) {
            Optional<Map<String, Object>> event = googleEvent(connection.get(), lesson.getGoogleEventId());
            if (event.isEmpty()) {
                lessons.delete(lesson);
                deleted++;
            } else if (syncLessonFromGoogleEvent(lesson, event.get())) {
                updated++;
            }
        }
        for (LessonSeries series : lessonSeries.findByTutorAndGoogleEventIdIsNotNull(tutor)) {
            Optional<Map<String, Object>> seriesEvent = googleEvent(connection.get(), series.getGoogleEventId());
            if (seriesEvent.isEmpty()) {
                List<Lesson> seriesLessons = lessons.findByLessonSeriesOrderByLessonDateAsc(series);
                deleted += seriesLessons.size();
                lessons.deleteByLessonSeries(series);
                lessonSeries.delete(series);
                continue;
            }
            if (syncSeriesFromGoogleEvent(series, seriesEvent.get())) {
                updated++;
            }
            SeriesSyncResult result = syncSeriesInstances(connection.get(), series);
            updated += result.updatedLessons();
            deleted += result.deletedLessons();
        }
        return new GoogleCalendarSyncResponse(updated, deleted);
    }

    private Optional<Map<String, Object>> googleEvent(GoogleCalendarConnection connection, String eventId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = restClient.get()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}", connection.getCalendarId(), eventId)
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .retrieve()
                    .body(Map.class);
            if (event == null || "cancelled".equals(event.get("status"))) {
                return Optional.empty();
            }
            return Optional.of(event);
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone ex) {
            return Optional.empty();
        } catch (RuntimeException ex) {
            log.warn("Could not verify Google Calendar event {}", eventId, ex);
            return Optional.of(Map.of());
        }
    }

    @SuppressWarnings("unchecked")
    private SeriesSyncResult syncSeriesInstances(GoogleCalendarConnection connection, LessonSeries series) {
        List<Lesson> seriesLessons = lessons.findByLessonSeriesOrderByLessonDateAsc(series);
        if (seriesLessons.isEmpty()) {
            return new SeriesSyncResult(0, 0);
        }
        Instant localWindowStart = seriesLessons.getFirst().getLessonDate().minus(1, ChronoUnit.DAYS);
        Lesson lastLocalLesson = seriesLessons.getLast();
        Instant localWindowEnd = lastLocalLesson.getLessonDate()
                .plusSeconds(lastLocalLesson.getDurationMinutes() * 60L)
                .plus(1, ChronoUnit.DAYS);
        Map<Instant, Lesson> lessonsByStart = new HashMap<>();
        Map<String, Lesson> lessonsByGoogleEventId = new HashMap<>();
        for (Lesson lesson : seriesLessons) {
            lessonsByStart.put(lesson.getLessonDate(), lesson);
            if (lesson.getGoogleEventId() != null && !lesson.getGoogleEventId().isBlank()) {
                lessonsByGoogleEventId.put(lesson.getGoogleEventId(), lesson);
            }
        }

        Set<Lesson> matchedLessons = new HashSet<>();
        List<Map<String, Object>> unmatchedActiveEvents = new ArrayList<>();
        int updated = 0;
        int deleted = 0;
        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", true)
                        .queryParam("timeMin", localWindowStart.toString())
                        .queryParam("timeMax", localWindowEnd.toString())
                        .queryParam("maxResults", 2500);
                if (pageToken != null && !pageToken.isBlank()) {
                    uri.queryParam("pageToken", pageToken);
                }
                Map<String, Object> response = restClient.get()
                        .uri(uri.build(connection.getCalendarId(), series.getGoogleEventId()))
                        .header("Authorization", "Bearer " + accessToken(connection))
                        .retrieve()
                        .body(Map.class);
                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (!(item instanceof Map<?, ?> rawEvent)) {
                            continue;
                        }
                        Map<String, Object> event = (Map<String, Object>) rawEvent;
                        Optional<Instant> originalStart = googleStartTime(event.get("originalStartTime"))
                                .or(() -> googleStartTime(event.get("start")));
                        if (originalStart.isEmpty()) {
                            continue;
                        }
                        String eventId = event.get("id") == null ? null : String.valueOf(event.get("id"));
                        Lesson lesson = eventId == null ? null : lessonsByGoogleEventId.get(eventId);
                        if (lesson == null) {
                            lesson = lessonsByStart.get(originalStart.get());
                        }
                        if (lesson == null) {
                            lesson = googleStartTime(event.get("start"))
                                    .map(lessonsByStart::get)
                                    .orElse(null);
                        }
                        if (lesson == null) {
                            if (!"cancelled".equals(event.get("status"))) {
                                unmatchedActiveEvents.add(event);
                            }
                            continue;
                        }
                        matchedLessons.add(lesson);
                        if ("cancelled".equals(event.get("status"))) {
                            lessons.delete(lesson);
                            lessonsByStart.remove(lesson.getLessonDate());
                            deleted++;
                        } else {
                            Instant previousStart = lesson.getLessonDate();
                            if (!syncLessonFromGoogleEvent(lesson, event)) {
                                continue;
                            }
                            if (eventId != null && !eventId.isBlank()) {
                                lesson.setGoogleEventId(eventId);
                                lessonsByGoogleEventId.put(eventId, lesson);
                            }
                            lesson.setGoogleCalendarId(connection.getCalendarId());
                            lesson.setGoogleSyncEnabled(true);
                            lessonsByStart.remove(originalStart.get());
                            lessonsByStart.remove(previousStart);
                            lessonsByStart.put(lesson.getLessonDate(), lesson);
                            updated++;
                        }
                    }
                }
                pageToken = response == null || response.get("nextPageToken") == null
                        ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not sync Google Calendar occurrences for series {}", series.getId(), ex);
                return new SeriesSyncResult(updated, deleted);
            }
        } while (pageToken != null);

        List<Lesson> unmatchedLessons = seriesLessons.stream()
                .filter(lesson -> !matchedLessons.contains(lesson))
                .filter(lesson -> lessonsByStart.containsKey(lesson.getLessonDate()))
                .toList();
        unmatchedActiveEvents.sort((a, b) -> googleComparableStart(a).compareTo(googleComparableStart(b)));
        for (int index = 0; index < unmatchedActiveEvents.size() && index < unmatchedLessons.size(); index++) {
            Map<String, Object> event = unmatchedActiveEvents.get(index);
            Lesson lesson = unmatchedLessons.get(index);
            String eventId = event.get("id") == null ? null : String.valueOf(event.get("id"));
            matchedLessons.add(lesson);
            if (!syncLessonFromGoogleEvent(lesson, event)) {
                continue;
            }
            if (eventId != null && !eventId.isBlank()) {
                lesson.setGoogleEventId(eventId);
            }
            lesson.setGoogleCalendarId(connection.getCalendarId());
            lesson.setGoogleSyncEnabled(true);
            updated++;
        }
        List<Lesson> removedFromGoogle = seriesLessons.stream()
                .filter(lesson -> !matchedLessons.contains(lesson))
                .filter(lesson -> lessonsByStart.containsKey(lesson.getLessonDate()))
                .toList();
        for (Lesson removedLesson : removedFromGoogle) {
            lessons.delete(removedLesson);
            deleted++;
        }
        return new SeriesSyncResult(updated, deleted);
    }

    private Instant googleComparableStart(Map<String, Object> event) {
        return googleStartTime(event.get("originalStartTime"))
                .or(() -> googleStartTime(event.get("start")))
                .orElse(Instant.MAX);
    }

    @SuppressWarnings("unchecked")
    private Optional<String> seriesInstanceEventId(GoogleCalendarConnection connection, LessonSeries series, Instant previousLessonDate, Instant lessonDate) {
        List<Instant> candidateStarts = new ArrayList<>();
        if (previousLessonDate != null) {
            candidateStarts.add(previousLessonDate);
        }
        candidateStarts.add(lessonDate);
        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", false)
                        .queryParam("maxResults", 2500);
                if (pageToken != null && !pageToken.isBlank()) {
                    uri.queryParam("pageToken", pageToken);
                }
                Map<String, Object> response = restClient.get()
                        .uri(uri.build(connection.getCalendarId(), series.getGoogleEventId()))
                        .header("Authorization", "Bearer " + accessToken(connection))
                        .retrieve()
                        .body(Map.class);
                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (!(item instanceof Map<?, ?> rawEvent) || rawEvent.get("id") == null) {
                            continue;
                        }
                        Map<String, Object> event = (Map<String, Object>) rawEvent;
                        Optional<Instant> originalStart = googleStartTime(event.get("originalStartTime"));
                        Optional<Instant> start = googleStartTime(event.get("start"));
                        if (candidateStarts.stream().anyMatch(candidate -> originalStart.filter(candidate::equals).isPresent() || start.filter(candidate::equals).isPresent())) {
                            return Optional.of(String.valueOf(event.get("id")));
                        }
                    }
                }
                pageToken = response == null || response.get("nextPageToken") == null
                        ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not find Google Calendar occurrence for lesson {}", lessonDate, ex);
                return Optional.empty();
            }
        } while (pageToken != null);
        return Optional.empty();
    }

    private boolean syncLessonFromGoogleEvent(Lesson lesson, Map<String, Object> event) {
        Optional<Instant> start = googleStartTime(event.get("start"));
        Optional<Instant> end = googleStartTime(event.get("end"));
        if (start.isEmpty() || end.isEmpty() || !end.get().isAfter(start.get())) {
            return false;
        }

        boolean changed = false;
        int durationMinutes = Math.toIntExact(ChronoUnit.MINUTES.between(start.get(), end.get()));
        if (!Objects.equals(lesson.getLessonDate(), start.get())) {
            lesson.setLessonDate(start.get());
            changed = true;
        }
        if (!Objects.equals(lesson.getDurationMinutes(), durationMinutes)) {
            lesson.setDurationMinutes(durationMinutes);
            changed = true;
        }
        Object summary = event.get("summary");
        if (summary != null && !String.valueOf(summary).isBlank() && !Objects.equals(lesson.getTitle(), String.valueOf(summary))) {
            lesson.setTitle(String.valueOf(summary));
            changed = true;
        }
        Optional<String> meetLink = googleMeetLink(event);
        if (meetLink.isPresent() && !Objects.equals(lesson.getGoogleMeetLink(), meetLink.get())) {
            lesson.setGoogleMeetLink(meetLink.get());
            changed = true;
        }
        if (changed) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        }
        return changed;
    }

    private boolean syncSeriesFromGoogleEvent(LessonSeries series, Map<String, Object> event) {
        if (event.isEmpty()) {
            return false;
        }
        boolean changed = false;
        Object summary = event.get("summary");
        if (summary != null && !String.valueOf(summary).isBlank() && !Objects.equals(series.getTitle(), String.valueOf(summary))) {
            series.setTitle(String.valueOf(summary));
            changed = true;
        }
        Object recurrence = event.get("recurrence");
        if (recurrence instanceof List<?> recurrenceEntries) {
            Optional<String> rule = recurrenceEntries.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .filter(entry -> entry.startsWith("RRULE:"))
                    .findFirst();
            if (rule.isPresent() && !Objects.equals(series.getRecurrenceRule(), rule.get())) {
                series.setRecurrenceRule(rule.get());
                changed = true;
            }
        }
        Optional<String> meetLink = googleMeetLink(event);
        if (meetLink.isPresent() && !Objects.equals(series.getGoogleMeetLink(), meetLink.get())) {
            series.setGoogleMeetLink(meetLink.get());
            changed = true;
        }
        Object colorId = event.get("colorId");
        if (colorId != null && !Objects.equals(series.getGoogleColorId(), String.valueOf(colorId))) {
            series.setGoogleColorId(String.valueOf(colorId));
            changed = true;
        }
        if (changed) {
            series.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            series.setGoogleSyncError(null);
        }
        return changed;
    }

    private record SeriesSyncResult(int updatedLessons, int deletedLessons) {
    }

    @SuppressWarnings("unchecked")
    private Set<Instant> deletedSeriesOccurrenceStarts(GoogleCalendarConnection connection, String eventId) {
        Set<Instant> deletedStarts = new HashSet<>();
        String pageToken = null;
        do {
            try {
                UriComponentsBuilder uri = UriComponentsBuilder
                        .fromUriString("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}/instances")
                        .queryParam("showDeleted", true)
                        .queryParam("maxResults", 2500);
                if (pageToken != null && !pageToken.isBlank()) {
                    uri.queryParam("pageToken", pageToken);
                }
                Map<String, Object> response = restClient.get()
                        .uri(uri.build(connection.getCalendarId(), eventId))
                        .header("Authorization", "Bearer " + accessToken(connection))
                        .retrieve()
                        .body(Map.class);
                Object items = response == null ? null : response.get("items");
                if (items instanceof List<?> events) {
                    for (Object item : events) {
                        if (item instanceof Map<?, ?> event && "cancelled".equals(event.get("status"))) {
                            googleStartTime(event.get("originalStartTime")).ifPresent(deletedStarts::add);
                        }
                    }
                }
                pageToken = response == null || response.get("nextPageToken") == null
                        ? null
                        : String.valueOf(response.get("nextPageToken"));
            } catch (RuntimeException ex) {
                log.warn("Could not verify deleted Google Calendar occurrences for series {}", eventId, ex);
                return Set.of();
            }
        } while (pageToken != null);
        return deletedStarts;
    }

    private Optional<Instant> googleStartTime(Object value) {
        if (!(value instanceof Map<?, ?> start)) {
            return Optional.empty();
        }
        Object dateTime = start.get("dateTime");
        if (dateTime == null) {
            return Optional.empty();
        }
        return Optional.of(OffsetDateTime.parse(String.valueOf(dateTime)).toInstant());
    }

    private Map<String, Object> eventBody(String summary, String start, String end, String studentName, String boardUrl, List<LessonLink> lessonLinks, String lessonNotes, String homework, String attendeeEmail, String colorId, Integer extraReminderMinutes) {
        Map<String, Object> event = new HashMap<>();
        event.put("summary", summary);
        event.put("description", eventDescription(studentName, boardUrl, lessonLinks, lessonNotes, homework));
        event.put("start", Map.of("dateTime", start, "timeZone", "UTC"));
        event.put("end", Map.of("dateTime", end, "timeZone", "UTC"));
        event.put("conferenceData", Map.of(
                "createRequest", Map.of(
                        "requestId", UUID.randomUUID().toString(),
                        "conferenceSolutionKey", Map.of("type", "hangoutsMeet")
                )
        ));
        event.put("reminders", Map.of("useDefault", false, "overrides", reminderOverrides(extraReminderMinutes)));
        if (attendeeEmail != null && !attendeeEmail.isBlank()) {
            event.put("attendees", List.of(Map.of("email", attendeeEmail)));
        }
        if (colorId != null && !colorId.isBlank()) {
            event.put("colorId", colorId);
        }
        return event;
    }

    private List<Map<String, Object>> reminderOverrides(Integer extraReminderMinutes) {
        List<Map<String, Object>> reminders = new java.util.ArrayList<>();
        reminders.add(Map.of("method", "popup", "minutes", 60));
        if (extraReminderMinutes != null && extraReminderMinutes != 60) {
            reminders.add(Map.of("method", "popup", "minutes", extraReminderMinutes));
        }
        return reminders;
    }

    private String eventDescription(String studentName, String boardUrl, List<LessonLink> lessonLinks, String lessonNotes, String homework) {
        StringBuilder description = new StringBuilder("Student: ").append(studentName);
        if (lessonNotes != null && !lessonNotes.isBlank()) {
            description.append("\n\nLesson notes:\n").append(lessonNotes);
        }
        if (homework != null && !homework.isBlank()) {
            description.append("\n\nHomework:\n").append(homework);
        }
        List<LessonLink> links = lessonLinks == null || lessonLinks.isEmpty()
                ? legacyBoardLink(boardUrl)
                : lessonLinks;
        if (!links.isEmpty()) {
            description.append("\n\nLinks:");
            for (LessonLink link : links) {
                if (link.url() != null && !link.url().isBlank()) {
                    String label = link.label() == null || link.label().isBlank() ? "Link" : link.label();
                    description.append("\n").append(label).append(": ").append(link.url());
                }
            }
        }
        return description.toString();
    }

    private List<LessonLink> legacyBoardLink(String boardUrl) {
        if (boardUrl == null || boardUrl.isBlank()) {
            return List.of();
        }
        return List.of(new LessonLink("Board", boardUrl));
    }

    @SuppressWarnings("unchecked")
    private Optional<String> googleMeetLink(Map<String, Object> response) {
        if (response.get("hangoutLink") != null) {
            return Optional.of(String.valueOf(response.get("hangoutLink")));
        }
        if (response.get("conferenceData") instanceof Map<?, ?> conferenceData
                && conferenceData.get("entryPoints") instanceof List<?> entryPoints) {
            return entryPoints.stream()
                    .filter(Map.class::isInstance)
                    .map(entry -> (Map<String, Object>) entry)
                    .filter(entry -> "video".equals(entry.get("entryPointType")) && entry.get("uri") != null)
                    .map(entry -> String.valueOf(entry.get("uri")))
                    .findFirst();
        }
        return Optional.empty();
    }

    public String rrule(LessonSeries series) {
        StringBuilder rule = new StringBuilder("RRULE:FREQ=WEEKLY;INTERVAL=").append(series.getIntervalCount());
        if (series.getOccurrenceCount() != null) {
            rule.append(";COUNT=").append(series.getOccurrenceCount());
        } else if (series.getRecurrenceUntil() != null) {
            rule.append(";UNTIL=").append(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
                    .withZone(ZoneOffset.UTC)
                    .format(series.getRecurrenceUntil()));
        }
        return rule.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unchecked")
    private Optional<String> googleAccountEmail(String accessToken) {
        try {
            Map<String, Object> userInfo = restClient.get()
                    .uri("https://www.googleapis.com/oauth2/v2/userinfo")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
            if (userInfo == null || userInfo.get("email") == null) {
                return Optional.empty();
            }
            return Optional.of(String.valueOf(userInfo.get("email")));
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private String accessToken(GoogleCalendarConnection connection) {
        if (connection.getAccessTokenExpiresAt() == null
                || connection.getAccessTokenExpiresAt().isAfter(Instant.now().plusSeconds(60))
                || connection.getRefreshToken() == null
                || connection.getRefreshToken().isBlank()) {
            return connection.getAccessToken();
        }

        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", connection.getRefreshToken());
        form.add("grant_type", "refresh_token");

        Map<String, Object> token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        String accessToken = String.valueOf(token.get("access_token"));
        Number expiresIn = token.get("expires_in") instanceof Number number ? number : null;
        connection.setAccessToken(accessToken);
        if (expiresIn != null) {
            connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(expiresIn.longValue()));
        }
        connections.save(connection);
        return accessToken;
    }
}
