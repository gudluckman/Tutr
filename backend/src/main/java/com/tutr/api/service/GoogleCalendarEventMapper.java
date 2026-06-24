package com.tutr.api.service;

import com.tutr.api.entity.Lesson;
import com.tutr.api.entity.LessonLink;
import com.tutr.api.entity.LessonSeries;
import com.tutr.api.enums.GoogleSyncStatus;
import com.tutr.api.enums.RecurringFrequency;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class GoogleCalendarEventMapper {
    private static final DateTimeFormatter GOOGLE_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    public Map<String, Object> eventBody(
            String summary,
            String start,
            String end,
            String studentName,
            String boardUrl,
            List<LessonLink> lessonLinks,
            String lessonNotes,
            String homework,
            String attendeeEmail,
            String colorId,
            Integer extraReminderMinutes
    ) {
        Map<String, Object> event = new HashMap<>();
        event.put("summary", summary);
        event.put("description", eventDescription(
                studentName, boardUrl, lessonLinks, lessonNotes, homework));
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
                "overrides", reminderOverrides(extraReminderMinutes)));
        if (!isBlank(attendeeEmail)) {
            event.put("attendees", List.of(Map.of("email", attendeeEmail)));
        }
        if (!isBlank(colorId)) {
            event.put("colorId", colorId);
        }
        return event;
    }

    public String rrule(LessonSeries series) {
        RecurringFrequency frequency = series.getFrequency() == null
                ? RecurringFrequency.WEEKLY
                : series.getFrequency();
        String googleFrequency = switch (frequency) {
            case WEEKLY -> "WEEKLY";
        };
        StringBuilder rule = new StringBuilder("RRULE:FREQ=")
                .append(googleFrequency)
                .append(";INTERVAL=")
                .append(series.getIntervalCount());
        if (series.getOccurrenceCount() != null) {
            rule.append(";COUNT=").append(series.getOccurrenceCount());
        } else if (series.getRecurrenceUntil() != null) {
            rule.append(";UNTIL=").append(formatDate(series.getRecurrenceUntil()));
        }
        return rule.toString();
    }

    public List<String> recurrenceFor(LessonSeries series) {
        List<String> recurrence = new ArrayList<>();
        recurrence.add(series.getRecurrenceRule());
        if (series.getExcludedLessonDates() != null) {
            series.getExcludedLessonDates().stream()
                    .map(date -> "EXDATE:" + formatDate(date))
                    .forEach(recurrence::add);
        }
        return recurrence;
    }

    public List<String> recurrenceWithExdate(
            Map<String, Object> event,
            String fallbackRule,
            Instant occurrence
    ) {
        List<String> recurrence = new ArrayList<>();
        Object existing = event == null ? null : event.get("recurrence");
        if (existing instanceof List<?> existingRecurrence) {
            for (Object entry : existingRecurrence) {
                if (entry != null) {
                    recurrence.add(String.valueOf(entry));
                }
            }
        }
        if (recurrence.isEmpty() && !isBlank(fallbackRule)) {
            recurrence.add(fallbackRule);
        }
        if (recurrence.stream().noneMatch(entry -> entry.startsWith("RRULE:"))) {
            throw new IllegalStateException("Could not find the Google Calendar recurrence rule.");
        }
        String exdate = "EXDATE:" + formatDate(occurrence);
        if (!recurrence.contains(exdate)) {
            recurrence.add(exdate);
        }
        return recurrence;
    }

    public Optional<Instant> startTime(Object value) {
        if (!(value instanceof Map<?, ?> start)) {
            return Optional.empty();
        }
        Object dateTime = start.get("dateTime");
        if (dateTime == null) {
            return Optional.empty();
        }
        return Optional.of(OffsetDateTime.parse(String.valueOf(dateTime)).toInstant());
    }

    @SuppressWarnings("unchecked")
    public Optional<String> meetLink(Map<String, Object> response) {
        if (response.get("hangoutLink") != null) {
            return Optional.of(String.valueOf(response.get("hangoutLink")));
        }
        if (response.get("conferenceData") instanceof Map<?, ?> conferenceData
                && conferenceData.get("entryPoints") instanceof List<?> entryPoints) {
            return entryPoints.stream()
                    .filter(Map.class::isInstance)
                    .map(entry -> (Map<String, Object>) entry)
                    .filter(entry -> "video".equals(entry.get("entryPointType"))
                            && entry.get("uri") != null)
                    .map(entry -> String.valueOf(entry.get("uri")))
                    .findFirst();
        }
        return Optional.empty();
    }

    public boolean applyToLesson(Lesson lesson, Map<String, Object> event) {
        Optional<Instant> start = startTime(event.get("start"));
        Optional<Instant> end = startTime(event.get("end"));
        if (start.isEmpty() || end.isEmpty() || !end.get().isAfter(start.get())) {
            return false;
        }

        boolean changed = false;
        int durationMinutes = Math.toIntExact(
                ChronoUnit.MINUTES.between(start.get(), end.get()));
        if (!Objects.equals(lesson.getLessonDate(), start.get())) {
            lesson.setLessonDate(start.get());
            changed = true;
        }
        if (!Objects.equals(lesson.getDurationMinutes(), durationMinutes)) {
            lesson.setDurationMinutes(durationMinutes);
            changed = true;
        }

        Object summary = event.get("summary");
        if (summary != null && !String.valueOf(summary).isBlank()
                && !Objects.equals(lesson.getTitle(), String.valueOf(summary))) {
            lesson.setTitle(String.valueOf(summary));
            changed = true;
        }

        Optional<String> meetLink = meetLink(event);
        if (meetLink.isPresent()
                && !Objects.equals(lesson.getGoogleMeetLink(), meetLink.get())) {
            lesson.setGoogleMeetLink(meetLink.get());
            changed = true;
        }
        if (changed) {
            lesson.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            lesson.setGoogleSyncError(null);
        }
        return changed;
    }

    public boolean applyToSeries(LessonSeries series, Map<String, Object> event) {
        if (event.isEmpty()) {
            return false;
        }
        boolean changed = false;
        Object summary = event.get("summary");
        if (summary != null && !String.valueOf(summary).isBlank()
                && !Objects.equals(series.getTitle(), String.valueOf(summary))) {
            series.setTitle(String.valueOf(summary));
            changed = true;
        }

        Optional<Instant> start = startTime(event.get("start"));
        Optional<Instant> end = startTime(event.get("end"));
        if (start.isPresent() && !Objects.equals(series.getFirstLessonDate(), start.get())) {
            series.setFirstLessonDate(start.get());
            changed = true;
        }
        if (start.isPresent() && end.isPresent() && end.get().isAfter(start.get())) {
            int durationMinutes = Math.toIntExact(
                    ChronoUnit.MINUTES.between(start.get(), end.get()));
            if (!Objects.equals(series.getDurationMinutes(), durationMinutes)) {
                series.setDurationMinutes(durationMinutes);
                changed = true;
            }
        }

        Object recurrence = event.get("recurrence");
        if (recurrence instanceof List<?> entries) {
            Optional<String> rule = entries.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .filter(entry -> entry.startsWith("RRULE:"))
                    .findFirst();
            if (rule.isPresent() && !Objects.equals(series.getRecurrenceRule(), rule.get())) {
                series.setRecurrenceRule(rule.get());
                changed = true;
            }
        }

        Optional<String> meetLink = meetLink(event);
        if (meetLink.isPresent()
                && !Objects.equals(series.getGoogleMeetLink(), meetLink.get())) {
            series.setGoogleMeetLink(meetLink.get());
            changed = true;
        }
        Object colorId = event.get("colorId");
        if (colorId != null
                && !Objects.equals(series.getGoogleColorId(), String.valueOf(colorId))) {
            series.setGoogleColorId(String.valueOf(colorId));
            changed = true;
        }
        if (changed) {
            series.setGoogleSyncStatus(GoogleSyncStatus.SYNCED);
            series.setGoogleSyncError(null);
        }
        return changed;
    }

    private List<Map<String, Object>> reminderOverrides(Integer extraReminderMinutes) {
        List<Map<String, Object>> reminders = new ArrayList<>();
        reminders.add(Map.of("method", "popup", "minutes", 60));
        if (extraReminderMinutes != null && extraReminderMinutes != 60) {
            reminders.add(Map.of("method", "popup", "minutes", extraReminderMinutes));
        }
        return reminders;
    }

    private String eventDescription(
            String studentName,
            String boardUrl,
            List<LessonLink> lessonLinks,
            String lessonNotes,
            String homework
    ) {
        StringBuilder description = new StringBuilder("Student: ").append(studentName);
        if (!isBlank(lessonNotes)) {
            description.append("\n\nLesson notes:\n").append(lessonNotes);
        }
        if (!isBlank(homework)) {
            description.append("\n\nHomework:\n").append(homework);
        }
        List<LessonLink> links = lessonLinks == null || lessonLinks.isEmpty()
                ? legacyBoardLink(boardUrl)
                : lessonLinks;
        if (!links.isEmpty()) {
            description.append("\n\nLinks:");
            for (LessonLink link : links) {
                if (!isBlank(link.url())) {
                    String label = isBlank(link.label()) ? "Link" : link.label();
                    description.append("\n").append(label).append(": ").append(link.url());
                }
            }
        }
        return description.toString();
    }

    private List<LessonLink> legacyBoardLink(String boardUrl) {
        return isBlank(boardUrl)
                ? List.of()
                : List.of(new LessonLink("Board", boardUrl));
    }

    private String formatDate(Instant instant) {
        return GOOGLE_DATE_FORMATTER.format(instant);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
