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
@Table(name = "lesson_series")
public class LessonSeries extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private String title;

    @Column(nullable = false)
    private Instant firstLessonDate;

    @Column(nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private BigDecimal hourlyRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurringFrequency frequency = RecurringFrequency.WEEKLY;

    @Column(nullable = false)
    private Integer intervalCount = 1;

    private Integer occurrenceCount;
    private Instant recurrenceUntil;
    private String miroBoardUrl;
    private String inviteEmail;

    @Column(nullable = false)
    private String recurrenceRule;

    private String googleEventId;
    private String googleCalendarId;
    private String googleMeetLink;
    private String googleColorId;
    private Integer googleExtraReminderMinutes;
    private boolean googleSyncEnabled;

    @Enumerated(EnumType.STRING)
    private GoogleSyncStatus googleSyncStatus = GoogleSyncStatus.NOT_REQUESTED;

    private String googleSyncError;
}
