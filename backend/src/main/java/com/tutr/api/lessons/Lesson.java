package com.tutr.api.lessons;

import com.tutr.api.common.BaseEntity;
import com.tutr.api.students.Student;
import com.tutr.api.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "lessons")
public class Lesson extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_series_id")
    private LessonSeries lessonSeries;

    private String title;

    @Column(nullable = false)
    private Instant lessonDate;

    @Column(nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private BigDecimal hourlyRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonStatus status = LessonStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    private String lessonNotes;
    private String homework;
    private String miroBoardUrl;
    private String inviteEmail;

    private String googleEventId;
    private String googleCalendarId;
    private String googleMeetLink;
    private boolean googleSyncEnabled;

    @Enumerated(EnumType.STRING)
    private GoogleSyncStatus googleSyncStatus = GoogleSyncStatus.NOT_REQUESTED;

    private String googleSyncError;
}
