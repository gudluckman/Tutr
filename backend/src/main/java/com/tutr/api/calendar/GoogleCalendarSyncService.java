package com.tutr.api.calendar;

import com.tutr.api.lessons.GoogleSyncStatus;
import com.tutr.api.lessons.Lesson;
import com.tutr.api.lessons.LessonRepository;
import com.tutr.api.lessons.LessonSeries;
import com.tutr.api.users.User;
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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GoogleCalendarSyncService {
    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarSyncService.class);
    private static final String CALENDAR_SCOPE = "openid email profile https://www.googleapis.com/auth/calendar.events";

    private final GoogleCalendarConnectionRepository connections;
    private final LessonRepository lessons;
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
                    lesson.getLessonNotes(),
                    lesson.getHomework(),
                    lesson.getInviteEmail()
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
                    null,
                    null,
                    series.getInviteEmail()
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
        connectionFor(lesson.getTutor()).ifPresent(connection -> {
            try {
                restClient.delete()
                        .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all", connection.getCalendarId(), lesson.getGoogleEventId())
                        .header("Authorization", "Bearer " + accessToken(connection))
                        .retrieve()
                        .toBodilessEntity();
            } catch (RuntimeException ignored) {
            }
        });
    }

    @Transactional
    public int syncDeletedLessons(User tutor) {
        Optional<GoogleCalendarConnection> connection = connectionFor(tutor);
        if (connection.isEmpty()) {
            return 0;
        }

        int deleted = 0;
        for (Lesson lesson : lessons.findByTutorAndGoogleEventIdIsNotNull(tutor)) {
            if (googleEventExists(connection.get(), lesson.getGoogleEventId())) {
                continue;
            }
            lessons.delete(lesson);
            deleted++;
        }
        return deleted;
    }

    private boolean googleEventExists(GoogleCalendarConnection connection, String eventId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = restClient.get()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}", connection.getCalendarId(), eventId)
                    .header("Authorization", "Bearer " + accessToken(connection))
                    .retrieve()
                    .body(Map.class);
            return event == null || !"cancelled".equals(event.get("status"));
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone ex) {
            return false;
        } catch (RuntimeException ex) {
            log.warn("Could not verify Google Calendar event {}", eventId, ex);
            return true;
        }
    }

    private Map<String, Object> eventBody(String summary, String start, String end, String studentName, String boardUrl, String lessonNotes, String homework, String attendeeEmail) {
        Map<String, Object> event = new HashMap<>();
        event.put("summary", summary);
        event.put("description", eventDescription(studentName, boardUrl, lessonNotes, homework));
        event.put("start", Map.of("dateTime", start, "timeZone", "UTC"));
        event.put("end", Map.of("dateTime", end, "timeZone", "UTC"));
        event.put("conferenceData", Map.of(
                "createRequest", Map.of(
                        "requestId", UUID.randomUUID().toString(),
                        "conferenceSolutionKey", Map.of("type", "hangoutsMeet")
                )
        ));
        event.put("reminders", Map.of(
                "useDefault", false,
                "overrides", List.of(Map.of("method", "popup", "minutes", 60))
        ));
        if (attendeeEmail != null && !attendeeEmail.isBlank()) {
            event.put("attendees", List.of(Map.of("email", attendeeEmail)));
        }
        return event;
    }

    private String eventDescription(String studentName, String boardUrl, String lessonNotes, String homework) {
        StringBuilder description = new StringBuilder("Student: ").append(studentName);
        if (lessonNotes != null && !lessonNotes.isBlank()) {
            description.append("\n\nLesson notes:\n").append(lessonNotes);
        }
        if (homework != null && !homework.isBlank()) {
            description.append("\n\nHomework:\n").append(homework);
        }
        if (boardUrl != null && !boardUrl.isBlank()) {
            description.append("\n\nBoard link: ").append(boardUrl);
        }
        return description.toString();
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
