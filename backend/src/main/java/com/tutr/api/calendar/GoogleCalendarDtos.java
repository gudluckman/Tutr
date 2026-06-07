package com.tutr.api.calendar;

public final class GoogleCalendarDtos {
    private GoogleCalendarDtos() {
    }

    public record GoogleCalendarStatusResponse(
            boolean configured,
            boolean connected,
            boolean syncEnabled,
            String googleAccountEmail,
            String calendarId
    ) {
    }

    public record GoogleCalendarAuthUrlResponse(
            boolean configured,
            String authUrl
    ) {
    }

    public record GoogleCalendarDeletionSyncResponse(
            int deletedLessons
    ) {
    }

    public record GoogleCalendarSyncResponse(
            int updatedLessons,
            int deletedLessons
    ) {
    }
}
