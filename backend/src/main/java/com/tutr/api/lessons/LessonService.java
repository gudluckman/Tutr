package com.tutr.api.lessons;

import com.tutr.api.calendar.GoogleCalendarSyncService;
import com.tutr.api.students.StudentService;
import com.tutr.api.users.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.tutr.api.lessons.LessonDtos.*;

@Service
@RequiredArgsConstructor
public class LessonService {
    private final LessonRepository lessons;
    private final LessonSeriesRepository lessonSeries;
    private final StudentService students;
    private final GoogleCalendarSyncService googleCalendar;

    public List<LessonResponse> list(User tutor) {
        return lessons.findByTutorOrderByLessonDateDesc(tutor).stream().map(LessonResponse::from).toList();
    }

    public LessonResponse get(User tutor, UUID id) {
        return LessonResponse.from(lessonFor(tutor, id));
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
        Lesson lesson = lessonFor(tutor, id);
        CalendarDetails previousCalendarDetails = CalendarDetails.from(lesson);
        apply(tutor, lesson, request);
        if (!previousCalendarDetails.equals(CalendarDetails.from(lesson))) {
            googleCalendar.syncLesson(lesson);
        }
        return LessonResponse.from(lesson);
    }

    @Transactional
    public LessonResponse updateStatuses(User tutor, UUID id, LessonStatusRequest request) {
        if (request.status() == null && request.paymentStatus() == null) {
            throw new IllegalArgumentException("Provide a lesson status or payment status");
        }
        Lesson lesson = lessonFor(tutor, id);
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
        series.setMiroBoardUrl(request.miroBoardUrl());
        series.setInviteEmail(inviteEmail(request.inviteEmail(), series.getStudent().getParentEmail()));
        series.setGoogleSyncEnabled(Boolean.TRUE.equals(request.syncToGoogle()));
        series.setRecurrenceRule(googleCalendar.rrule(series));
        lessonSeries.save(series);

        List<Lesson> created = new ArrayList<>();
        for (Instant occurrence : occurrences(series)) {
            Lesson lesson = new Lesson();
            lesson.setTutor(tutor);
            lesson.setStudent(series.getStudent());
            lesson.setLessonSeries(series);
            lesson.setTitle(series.getTitle());
            lesson.setLessonDate(occurrence);
            lesson.setDurationMinutes(series.getDurationMinutes());
            lesson.setHourlyRate(series.getHourlyRate());
            lesson.setStatus(LessonStatus.SCHEDULED);
            lesson.setPaymentStatus(PaymentStatus.UNPAID);
            lesson.setLessonNotes(request.lessonNotes());
            lesson.setHomework(request.homework());
            lesson.setMiroBoardUrl(request.miroBoardUrl());
            lesson.setInviteEmail(series.getInviteEmail());
            lesson.setGoogleSyncEnabled(false);
            created.add(lesson);
        }
        lessons.saveAll(created);
        googleCalendar.syncSeries(series);
        return RecurringLessonResponse.from(series, created);
    }

    @Transactional
    public void delete(User tutor, UUID id) {
        Lesson lesson = lessonFor(tutor, id);
        googleCalendar.deleteLessonEvent(lesson);
        lessons.delete(lesson);
    }

    public Lesson lessonFor(User tutor, UUID id) {
        return lessons.findByIdAndTutor(id, tutor).orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
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
        lesson.setMiroBoardUrl(request.miroBoardUrl());
        lesson.setInviteEmail(inviteEmail(request.inviteEmail(), lesson.getStudent().getParentEmail()));
        lesson.setGoogleSyncEnabled(Boolean.TRUE.equals(request.syncToGoogle()));
    }

    private String inviteEmail(String requestedEmail, String studentEmail) {
        if (requestedEmail != null && !requestedEmail.isBlank()) {
            return requestedEmail;
        }
        return studentEmail;
    }

    private List<Instant> occurrences(LessonSeries series) {
        int count = series.getOccurrenceCount() == null ? 12 : Math.min(series.getOccurrenceCount(), 52);
        List<Instant> dates = new ArrayList<>();
        Instant current = series.getFirstLessonDate();
        for (int i = 0; i < count; i++) {
            if (series.getRecurrenceUntil() != null && current.isAfter(series.getRecurrenceUntil())) {
                break;
            }
            dates.add(current);
            current = current.plus(7L * series.getIntervalCount(), ChronoUnit.DAYS);
        }
        return dates;
    }

    private record CalendarDetails(
            UUID studentId,
            String title,
            Instant lessonDate,
            Integer durationMinutes,
            String lessonNotes,
            String homework,
            String miroBoardUrl,
            String inviteEmail,
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
                    lesson.getInviteEmail(),
                    lesson.isGoogleSyncEnabled()
            );
        }
    }
}
