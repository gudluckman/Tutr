package com.tutr.api.calendar;

import com.tutr.api.common.BaseEntity;
import com.tutr.api.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "google_calendar_connections")
public class GoogleCalendarConnection extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    private String googleAccountEmail;

    @Column(nullable = false)
    private String accessToken;

    private String refreshToken;
    private Instant accessTokenExpiresAt;

    @Column(nullable = false)
    private String calendarId = "primary";

    private boolean syncEnabled = true;
}
