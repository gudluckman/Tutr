package com.tutr.api.dto;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

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
