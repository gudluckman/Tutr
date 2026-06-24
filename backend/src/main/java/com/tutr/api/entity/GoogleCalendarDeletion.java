package com.tutr.api.entity;

import com.tutr.api.converter.StringListConverter;
import com.tutr.api.enums.GoogleCalendarDeletionType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "google_calendar_deletions")
public class GoogleCalendarDeletion extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GoogleCalendarDeletionType deletionType;

    @Column(nullable = false)
    private String calendarId = "primary";

    @Column(nullable = false)
    private String eventId;

    private Instant occurrenceDate;

    @Column(columnDefinition = "TEXT")
    private String recurrenceRule;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> relatedEventIds = List.of();
}
