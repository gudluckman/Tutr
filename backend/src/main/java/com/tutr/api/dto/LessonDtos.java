package com.tutr.api.dto;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class LessonDtos {
    private LessonDtos() {
    }

    public record LessonRequest(
            @NotNull UUID studentId,
            @NotBlank String title,
            @NotNull Instant lessonDate,
            @Positive Integer durationMinutes,
            @NotNull BigDecimal hourlyRate,
            LessonStatus status,
            PaymentStatus paymentStatus,
            String lessonNotes,
            String homework,
            String miroBoardUrl,
            List<LessonLink> lessonLinks,
            String inviteEmail,
            String googleColorId,
            Integer googleExtraReminderMinutes,
            Boolean syncToGoogle
    ) {
    }

    public record LessonStatusRequest(
            LessonStatus status,
            PaymentStatus paymentStatus
    ) {
    }

    public record RecurringLessonRequest(
            @NotNull UUID studentId,
            @NotBlank String title,
            @NotNull Instant firstLessonDate,
            @Positive Integer durationMinutes,
            @NotNull BigDecimal hourlyRate,
            RecurringFrequency frequency,
            @Positive Integer intervalCount,
            @Positive Integer occurrenceCount,
            Instant recurrenceUntil,
            String lessonNotes,
            String homework,
            String miroBoardUrl,
            List<LessonLink> lessonLinks,
            String inviteEmail,
            String googleColorId,
            Integer googleExtraReminderMinutes,
            Boolean syncToGoogle
    ) {
    }

    public record LessonResponse(
            UUID id,
            UUID lessonSeriesId,
            UUID studentId,
            String studentName,
            String title,
            Instant lessonDate,
            Integer durationMinutes,
            BigDecimal hourlyRate,
            LessonStatus status,
            PaymentStatus paymentStatus,
            String lessonNotes,
            String homework,
            String miroBoardUrl,
            List<LessonLink> lessonLinks,
            String inviteEmail,
            String googleColorId,
            Integer googleExtraReminderMinutes,
            Boolean googleSyncEnabled,
            String googleMeetLink,
            GoogleSyncStatus googleSyncStatus,
            String googleSyncError,
            Instant createdAt
    ) {
        static LessonResponse from(Lesson lesson) {
            return new LessonResponse(
                    lesson.getId(),
                    lesson.getLessonSeries() == null ? null : lesson.getLessonSeries().getId(),
                    lesson.getStudent().getId(),
                    lesson.getStudent().getName(),
                    lesson.getTitle(),
                    lesson.getLessonDate(),
                    lesson.getDurationMinutes(),
                    lesson.getHourlyRate(),
                    lesson.getStatus(),
                    lesson.getPaymentStatus(),
                    lesson.getLessonNotes(),
                    lesson.getHomework(),
                    lesson.getMiroBoardUrl(),
                    lesson.getLessonLinks(),
                    lesson.getInviteEmail(),
                    lesson.getGoogleColorId(),
                    lesson.getGoogleExtraReminderMinutes(),
                    lesson.isGoogleSyncEnabled(),
                    lesson.getGoogleMeetLink(),
                    lesson.getGoogleSyncStatus(),
                    lesson.getGoogleSyncError(),
                    lesson.getCreatedAt()
            );
        }
    }

    public record RecurringLessonResponse(
            UUID seriesId,
            String recurrenceRule,
            GoogleSyncStatus googleSyncStatus,
            String googleSyncError,
            List<LessonResponse> lessons
    ) {
        static RecurringLessonResponse from(LessonSeries series, List<Lesson> lessons) {
            return new RecurringLessonResponse(
                    series.getId(),
                    series.getRecurrenceRule(),
                    series.getGoogleSyncStatus(),
                    series.getGoogleSyncError(),
                    lessons.stream().map(LessonResponse::from).toList()
            );
        }
    }
}
