package com.tutr.api.controller;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.service.JwtService;
import com.tutr.api.entity.User;
import com.tutr.api.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

import static com.tutr.api.dto.GoogleCalendarDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/calendar/google")
public class GoogleCalendarController {
    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarController.class);

    private final GoogleCalendarSyncService googleCalendar;
    private final JwtService jwtService;
    private final UserRepository users;

    @GetMapping("/ping")
    String ping() {
        return "ok";
    }

    @GetMapping("/status")
    GoogleCalendarStatusResponse status(@AuthenticationPrincipal User user) {
        return googleCalendar.connectionFor(user)
                .map(connection -> new GoogleCalendarStatusResponse(
                        googleCalendar.isConfigured(),
                        true,
                        connection.isSyncEnabled(),
                        connection.getGoogleAccountEmail(),
                        connection.getCalendarId()
                ))
                .orElseGet(() -> new GoogleCalendarStatusResponse(googleCalendar.isConfigured(), false, false, null, null));
    }

    @GetMapping("/auth-url")
    GoogleCalendarAuthUrlResponse authUrl(@AuthenticationPrincipal User user) {
        if (!googleCalendar.isConfigured()) {
            return new GoogleCalendarAuthUrlResponse(false, null);
        }
        return new GoogleCalendarAuthUrlResponse(true, googleCalendar.authUrl(jwtService.createToken(user)));
    }

    @PostMapping("/retry-failed")
    GoogleCalendarRetryResponse retryFailedSyncs(@AuthenticationPrincipal User user) {
        return googleCalendar.retryFailedSyncs(user);
    }

    @GetMapping("/callback")
    ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                  @RequestParam(required = false) String state,
                                  @RequestParam(required = false) String error) {
        if (error != null || code == null || state == null) {
            log.info("Google Calendar OAuth callback did not grant access. error={}, codePresent={}, statePresent={}",
                    error, code != null, state != null);
            return redirectWithCalendarError("oauth");
        }
        try {
            User user = users.findById(jwtService.userId(state)).orElseThrow(() -> new EntityNotFoundException("User not found"));
            googleCalendar.connect(user, code);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, URI.create(googleCalendar.frontendRedirect()).toString())
                    .build();
        } catch (RuntimeException ex) {
            log.warn("Google Calendar OAuth callback failed", ex);
            return redirectWithCalendarError("callback");
        }
    }

    private ResponseEntity<Void> redirectWithCalendarError(String error) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(googleCalendar.frontendRedirect() + "&calendarError=" + error).toString())
                .build();
    }
}
