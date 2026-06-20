package com.tutr.api.service;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.service.GoogleCalendarSyncService;
import com.tutr.api.service.StudentService;
import com.tutr.api.entity.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.tutr.api.dto.LessonDtos.*;

@Service
@RequiredArgsConstructor
public class LessonService {
    private static final List<String> GOOGLE_COLOR_IDS = List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");
    private static final int MAX_GOOGLE_EXTRA_REMINDER_MINUTES = 28 * 24 * 60;
    private static final int MAX_LESSON_LINKS = 10;
    private static final int LAZY_RECURRING_LOOKBACK_DAYS = 180;
    private static final int LAZY_RECURRING_LOOKAHEAD_DAYS = 365;
    private static final int MAX_LAZY_OCCURRENCES_PER_SERIES = 104;

    private final LessonRepository lessons;
    private final LessonSeriesRepository lessonSeries;
    private final StudentService students;
    private final GoogleCalendarSyncService googleCalendar;

    @Transactional(readOnly = true)
    public List<LessonResponse> list(User tutor) {
        List<Lesson> storedLessons = lessons.findByTutorOrderByLessonDateDesc(tutor);
        List<LessonResponse> responses = new ArrayList<>(
                storedLessons.stream().map(LessonResponse::from).toList());

        Set<String> materializedOccurrences = new HashSet<>();
        for (Lesson lesson : storedLessons) {
            if (lesson.getLessonSeries() != null) {
                materializedOccurrences.add(occurrenceKey(lesson.getLessonSeries(), lesson.getLessonDate()));
            }
        }

        Instant now = Instant.now();
        Instant windowStart = now.minus(LAZY_RECURRING_LOOKBACK_DAYS, ChronoUnit.DAYS);
        Instant windowEnd = now.plus(LAZY_RECURRING_LOOKAHEAD_DAYS, ChronoUnit.DAYS);
        for (LessonSeries series : lessonSeries.findByTutorOrderByFirstLessonDateDesc(tutor)) {
            responses.addAll(seriesOccurrenceResponses(series, windowStart, windowEnd, materializedOccurrences));
        }

        return responses.stream()
                .sorted(Comparator.comparing(LessonResponse::lessonDate).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse get(User tutor, UUID id) {
        Optional<Lesson> stored = lessons.findByIdAndTutor(id, tutor);
        if (stored.isPresent()) {
            return LessonResponse.from(stored.get());
        }
        VirtualOccurrence occurrence = virtualOccurrenceFor(tutor, id)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
        return LessonResponse.fromSeriesOccurrence(
                occurrence.series(), occurrence.lessonDate(), occurrenceId(occurrence.series(), occurrence.lessonDate()));
    }

    @Transactional
    public LessonResponse create(User tutor, LessonRequest request) {
        Lesson lesson = new Lesson();
        lesson.setTutor(tutor);
        apply(tutor, lesson, request);
        googleCalendar.syncLesson(lesson);
        return LessonResponse.from(lessons.save(lesson));
    }

    @Transactional
    public LessonResponse update(User tutor, UUID id, LessonRequest request) {
        Lesson lesson = materializedLessonFor(tutor, id);
        CalendarDetails previousCalendarDetails = CalendarDetails.from(lesson);
        apply(tutor, lesson, request);
        if (!previousCalendarDetails.equals(CalendarDetails.from(lesson))) {
            googleCalendar.syncLesson(lesson, previousCalendarDetails.lessonDate());
        }
        return LessonResponse.from(lesson);
    }

    @Transactional
    public LessonResponse updateStatuses(User tutor, UUID id, LessonStatusRequest request) {
        if (request.status() == null && request.paymentStatus() == null) {
            throw new IllegalArgumentException("Provide a lesson status or payment status");
        }
        Lesson lesson = materializedLessonFor(tutor, id);
        if (request.status() != null) {
            lesson.setStatus(request.status());
        }
        if (request.paymentStatus() != null) {
            lesson.setPaymentStatus(request.paymentStatus());
        }
        return LessonResponse.from(lesson);
    }

    @Transactional
    public RecurringLessonResponse createRecurring(User tutor, RecurringLessonRequest request) {
        LessonSeries series = new LessonSeries();
        series.setTutor(tutor);
        series.setStudent(students.studentFor(tutor, request.studentId()));
        series.setTitle(request.title());
        series.setFirstLessonDate(request.firstLessonDate());
        series.setDurationMinutes(request.durationMinutes());
        series.setHourlyRate(request.hourlyRate());
        series.setFrequency(request.frequency() == null ? RecurringFrequency.WEEKLY : request.frequency());
        series.setIntervalCount(request.intervalCount() == null ? 1 : request.intervalCount());
        series.setOccurrenceCount(request.occurrenceCount());
        series.setRecurrenceUntil(request.recurrenceUntil());
        series.setLessonNotes(request.lessonNotes());
        series.setHomework(request.homework());
        List<LessonLink> links = lessonLinks(request.lessonLinks(), request.miroBoardUrl());
        series.setLessonLinks(links);
        series.setMiroBoardUrl(boardUrl(links, request.miroBoardUrl()));
        series.setInviteEmail(inviteEmail(request.inviteEmail(), series.getStudent().getParentEmail()));
        series.setGoogleColorId(googleColorId(request.googleColorId()));
        series.setGoogleExtraReminderMinutes(googleExtraReminderMinutes(request.googleExtraReminderMinutes()));
        series.setGoogleSyncEnabled(Boolean.TRUE.equals(request.syncToGoogle()));
        series.setRecurrenceRule(googleCalendar.rrule(series));
        lessonSeries.save(series);

        googleCalendar.syncSeries(series);
        Instant previewEnd = series.getFirstLessonDate().plus(11L * 7L * series.getIntervalCount(), ChronoUnit.DAYS);
        return RecurringLessonResponse.fromResponses(
                series,
                seriesOccurrenceResponses(series, series.getFirstLessonDate(), previewEnd, Set.of()));
    }

    @Transactional
    public void delete(User tutor, UUID id) {
        Lesson lesson = lessons.findByIdAndTutor(id, tutor)
                .orElseGet(() -> virtualOccurrenceFor(tutor, id)
                        .map(this::transientLesson)
                        .orElseThrow(() -> new EntityNotFoundException("Lesson not found")));
        if (lesson.getLessonSeries() == null) {
            googleCalendar.deleteLessonEvent(lesson);
        } else {
            googleCalendar.excludeSeriesOccurrence(lesson);
            excludeOccurrence(lesson.getLessonSeries(), lesson.getLessonDate());
        }
        if (lesson.getId() != null && lessons.existsById(lesson.getId())) {
            lessons.delete(lesson);
        }
    }

    @Transactional
    public void deleteSeries(User tutor, UUID lessonId) {
        LessonSeries series = lessons.findByIdAndTutor(lessonId, tutor)
                .map(Lesson::getLessonSeries)
                .orElseGet(() -> virtualOccurrenceFor(tutor, lessonId)
                        .map(VirtualOccurrence::series)
                        .orElse(null));
        if (series == null) {
            delete(tutor, lessonId);
            return;
        }
        LessonSeries tutorSeries = lessonSeries.findByIdAndTutor(series.getId(), tutor)
                .orElseThrow(() -> new EntityNotFoundException("Lesson series not found"));
        googleCalendar.deleteSeriesEvent(tutorSeries);
        lessons.deleteByLessonSeries(tutorSeries);
        lessonSeries.delete(tutorSeries);
    }

    @Transactional
    public void deleteFollowing(User tutor, UUID lessonId) {
        Lesson lesson = lessons.findByIdAndTutor(lessonId, tutor)
                .orElseGet(() -> virtualOccurrenceFor(tutor, lessonId)
                        .map(this::transientLesson)
                        .orElseThrow(() -> new EntityNotFoundException("Lesson not found")));
        LessonSeries series = lesson.getLessonSeries();
        if (series == null) {
            delete(tutor, lessonId);
            return;
        }

        LessonSeries tutorSeries = lessonSeries.findByIdAndTutor(series.getId(), tutor)
                .orElseThrow(() -> new EntityNotFoundException("Lesson series not found"));
        List<Lesson> seriesLessons = lessons.findByLessonSeriesOrderByLessonDateAsc(tutorSeries);
        List<Lesson> followingLessons = seriesLessons.stream()
                .filter(seriesLesson -> !seriesLesson.getLessonDate().isBefore(lesson.getLessonDate()))
                .toList();
        if (!lesson.getLessonDate().isAfter(tutorSeries.getFirstLessonDate())) {
            googleCalendar.deleteSeriesEvent(tutorSeries);
            lessons.deleteByLessonSeries(tutorSeries);
            lessonSeries.delete(tutorSeries);
            return;
        }

        googleCalendar.endSeriesBefore(lesson, followingLessons);
        lessons.deleteAll(followingLessons);
    }

    public Lesson lessonFor(User tutor, UUID id) {
        return lessons.findByIdAndTutor(id, tutor).orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
    }

    private Lesson materializedLessonFor(User tutor, UUID id) {
        Optional<Lesson> stored = lessons.findByIdAndTutor(id, tutor);
        if (stored.isPresent()) {
            return stored.get();
        }
        VirtualOccurrence occurrence = virtualOccurrenceFor(tutor, id)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
        Lesson existing = lessons.findByLessonSeriesAndLessonDate(occurrence.series(), occurrence.lessonDate())
                .orElse(null);
        if (existing != null) {
            return existing;
        }
        return lessons.save(transientLesson(occurrence));
    }

    private Optional<VirtualOccurrence> virtualOccurrenceFor(User tutor, UUID id) {
        Instant now = Instant.now();
        Instant windowStart = now.minus(LAZY_RECURRING_LOOKBACK_DAYS, ChronoUnit.DAYS);
        Instant windowEnd = now.plus(LAZY_RECURRING_LOOKAHEAD_DAYS, ChronoUnit.DAYS);
        for (LessonSeries series : lessonSeries.findByTutorOrderByFirstLessonDateDesc(tutor)) {
            for (Instant occurrence : occurrencesBetween(series, windowStart, windowEnd, MAX_LAZY_OCCURRENCES_PER_SERIES)) {
                if (occurrenceId(series, occurrence).equals(id)) {
                    return Optional.of(new VirtualOccurrence(series, occurrence));
                }
            }
        }
        return Optional.empty();
    }

    private Lesson transientLesson(VirtualOccurrence occurrence) {
        LessonSeries series = occurrence.series();
        Lesson lesson = new Lesson();
        lesson.setTutor(series.getTutor());
        lesson.setStudent(series.getStudent());
        lesson.setLessonSeries(series);
        lesson.setTitle(series.getTitle());
        lesson.setLessonDate(occurrence.lessonDate());
        lesson.setDurationMinutes(series.getDurationMinutes());
        lesson.setHourlyRate(series.getHourlyRate());
        lesson.setStatus(LessonStatus.SCHEDULED);
        lesson.setPaymentStatus(PaymentStatus.UNPAID);
        lesson.setLessonNotes(series.getLessonNotes());
        lesson.setHomework(series.getHomework());
        lesson.setLessonLinks(series.getLessonLinks());
        lesson.setMiroBoardUrl(series.getMiroBoardUrl());
        lesson.setInviteEmail(series.getInviteEmail());
        lesson.setGoogleColorId(series.getGoogleColorId());
        lesson.setGoogleExtraReminderMinutes(series.getGoogleExtraReminderMinutes());
        lesson.setGoogleSyncEnabled(series.isGoogleSyncEnabled());
        lesson.setGoogleCalendarId(series.getGoogleCalendarId());
        lesson.setGoogleMeetLink(series.getGoogleMeetLink());
        lesson.setGoogleSyncStatus(series.getGoogleSyncStatus());
        lesson.setGoogleSyncError(series.getGoogleSyncError());
        lesson.setCreatedAt(series.getCreatedAt());
        lesson.setUpdatedAt(series.getUpdatedAt());
        return lesson;
    }

    private List<LessonResponse> seriesOccurrenceResponses(
            LessonSeries series,
            Instant windowStart,
            Instant windowEnd,
            Set<String> materializedOccurrences
    ) {
        return occurrencesBetween(series, windowStart, windowEnd, MAX_LAZY_OCCURRENCES_PER_SERIES).stream()
                .filter(occurrence -> !materializedOccurrences.contains(occurrenceKey(series, occurrence)))
                .map(occurrence -> LessonResponse.fromSeriesOccurrence(series, occurrence, occurrenceId(series, occurrence)))
                .toList();
    }

    private List<Instant> occurrencesBetween(
            LessonSeries series,
            Instant windowStart,
            Instant windowEnd,
            int maxOccurrences
    ) {
        List<Instant> dates = new ArrayList<>();
        Set<Instant> excluded = new HashSet<>(series.getExcludedLessonDates() == null
                ? List.of()
                : series.getExcludedLessonDates());
        Instant current = series.getFirstLessonDate();
        int intervalWeeks = series.getIntervalCount() == null ? 1 : series.getIntervalCount();
        int index = 0;
        while (dates.size() < maxOccurrences) {
            if (series.getOccurrenceCount() != null && index >= series.getOccurrenceCount()) {
                break;
            }
            if (series.getRecurrenceUntil() != null && current.isAfter(series.getRecurrenceUntil())) {
                break;
            }
            if (current.isAfter(windowEnd)) {
                break;
            }
            if (!current.isBefore(windowStart) && !excluded.contains(current)) {
                dates.add(current);
            }
            current = current.plus(7L * intervalWeeks, ChronoUnit.DAYS);
            index++;
        }
        return dates;
    }

    private void excludeOccurrence(LessonSeries series, Instant lessonDate) {
        List<Instant> excluded = new ArrayList<>(series.getExcludedLessonDates() == null
                ? List.of()
                : series.getExcludedLessonDates());
        if (!excluded.contains(lessonDate)) {
            excluded.add(lessonDate);
            excluded.sort(Instant::compareTo);
            series.setExcludedLessonDates(excluded);
        }
    }

    private UUID occurrenceId(LessonSeries series, Instant lessonDate) {
        return UUID.nameUUIDFromBytes(
                ("lesson-series:" + series.getId() + ":" + lessonDate).getBytes(StandardCharsets.UTF_8));
    }

    private String occurrenceKey(LessonSeries series, Instant lessonDate) {
        return series.getId() + ":" + lessonDate;
    }

    private void apply(User tutor, Lesson lesson, LessonRequest request) {
        lesson.setStudent(students.studentFor(tutor, request.studentId()));
        lesson.setTitle(request.title());
        lesson.setLessonDate(request.lessonDate());
        lesson.setDurationMinutes(request.durationMinutes());
        lesson.setHourlyRate(request.hourlyRate());
        lesson.setStatus(request.status() == null ? LessonStatus.SCHEDULED : request.status());
        lesson.setPaymentStatus(request.paymentStatus() == null ? PaymentStatus.UNPAID : request.paymentStatus());
        lesson.setLessonNotes(request.lessonNotes());
        lesson.setHomework(request.homework());
        List<LessonLink> links = lessonLinks(request.lessonLinks(), request.miroBoardUrl());
        lesson.setLessonLinks(links);
        lesson.setMiroBoardUrl(boardUrl(links, request.miroBoardUrl()));
        lesson.setInviteEmail(inviteEmail(request.inviteEmail(), lesson.getStudent().getParentEmail()));
        lesson.setGoogleColorId(googleColorId(request.googleColorId()));
        lesson.setGoogleExtraReminderMinutes(googleExtraReminderMinutes(request.googleExtraReminderMinutes()));
        lesson.setGoogleSyncEnabled(Boolean.TRUE.equals(request.syncToGoogle()));
    }

    private String googleColorId(String requestedColorId) {
        if (requestedColorId == null || requestedColorId.isBlank()) {
            return null;
        }
        String colorId = requestedColorId.trim();
        if (!GOOGLE_COLOR_IDS.contains(colorId)) {
            throw new IllegalArgumentException("Choose a valid Google Calendar color.");
        }
        return colorId;
    }

    private Integer googleExtraReminderMinutes(Integer requestedReminderMinutes) {
        if (requestedReminderMinutes == null) {
            return null;
        }
        if (requestedReminderMinutes < 1 || requestedReminderMinutes > MAX_GOOGLE_EXTRA_REMINDER_MINUTES) {
            throw new IllegalArgumentException("Choose a valid Google Calendar extra reminder.");
        }
        return requestedReminderMinutes;
    }

    private String inviteEmail(String requestedEmail, String studentEmail) {
        if (requestedEmail != null && !requestedEmail.isBlank()) {
            return requestedEmail;
        }
        return studentEmail;
    }

    private List<LessonLink> lessonLinks(List<LessonLink> requestedLinks, String legacyBoardUrl) {
        List<LessonLink> links = new ArrayList<>();
        if (requestedLinks != null) {
            for (LessonLink link : requestedLinks) {
                if (link == null || link.url() == null || link.url().isBlank()) {
                    continue;
                }
                String url = link.url().trim();
                String label = link.label() == null || link.label().isBlank() ? "Link" : link.label().trim();
                links.add(new LessonLink(label, url));
                if (links.size() == MAX_LESSON_LINKS) {
                    break;
                }
            }
        }
        if (links.isEmpty() && legacyBoardUrl != null && !legacyBoardUrl.isBlank()) {
            links.add(new LessonLink("Board", legacyBoardUrl.trim()));
        }
        return links;
    }

    private String boardUrl(List<LessonLink> links, String legacyBoardUrl) {
        return links.stream()
                .filter(link -> link.label() != null && link.label().equalsIgnoreCase("Board"))
                .map(LessonLink::url)
                .findFirst()
                .orElse(legacyBoardUrl == null || legacyBoardUrl.isBlank() ? null : legacyBoardUrl.trim());
    }

    private record CalendarDetails(
            UUID studentId,
            String title,
            Instant lessonDate,
            Integer durationMinutes,
            String lessonNotes,
            String homework,
            String miroBoardUrl,
            List<LessonLink> lessonLinks,
            String inviteEmail,
            String googleColorId,
            Integer googleExtraReminderMinutes,
            boolean googleSyncEnabled
    ) {
        static CalendarDetails from(Lesson lesson) {
            return new CalendarDetails(
                    lesson.getStudent().getId(),
                    lesson.getTitle(),
                    lesson.getLessonDate(),
                    lesson.getDurationMinutes(),
                    lesson.getLessonNotes(),
                    lesson.getHomework(),
                    lesson.getMiroBoardUrl(),
                    lesson.getLessonLinks(),
                    lesson.getInviteEmail(),
                    lesson.getGoogleColorId(),
                    lesson.getGoogleExtraReminderMinutes(),
                    lesson.isGoogleSyncEnabled()
            );
        }
    }

    private record VirtualOccurrence(LessonSeries series, Instant lessonDate) {
    }
}
