package com.tutr.api.service;

import com.tutr.api.entity.GoogleCalendarConnection;
import com.tutr.api.entity.User;
import com.tutr.api.repository.GoogleCalendarConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GoogleCalendarConnectionService {
    private static final String CALENDAR_SCOPE =
            "openid email profile https://www.googleapis.com/auth/calendar.events";

    private final GoogleCalendarConnectionRepository connections;
    private final RestClient restClient = RestClient.create();

    @Value("${app.google-calendar.client-id:}")
    private String clientId;

    @Value("${app.google-calendar.client-secret:}")
    private String clientSecret;

    @Value("${app.google-calendar.redirect-uri:http://localhost:8080/api/v1/calendar/google/callback}")
    private String redirectUri;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isConfigured() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    public Optional<GoogleCalendarConnection> connectionFor(User tutor) {
        return connections.findByTutor(tutor).filter(GoogleCalendarConnection::isSyncEnabled);
    }

    public String authUrl(String stateToken) {
        return "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode(CALENDAR_SCOPE)
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + encode(stateToken);
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public void connect(User tutor, String code) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");

        Map<String, Object> token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        String accessToken = String.valueOf(token.get("access_token"));
        String refreshToken = token.get("refresh_token") == null
                ? null
                : String.valueOf(token.get("refresh_token"));
        Number expiresIn = token.get("expires_in") instanceof Number number ? number : null;

        GoogleCalendarConnection connection = connections.findByTutor(tutor)
                .orElseGet(GoogleCalendarConnection::new);
        connection.setTutor(tutor);
        connection.setAccessToken(accessToken);
        if (refreshToken != null) {
            connection.setRefreshToken(refreshToken);
        }
        if (expiresIn != null) {
            connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(expiresIn.longValue()));
        }
        connection.setGoogleAccountEmail(googleAccountEmail(accessToken).orElse(tutor.getEmail()));
        connection.setCalendarId("primary");
        connection.setSyncEnabled(true);
        connections.save(connection);
    }

    public String frontendRedirect() {
        return frontendUrl + "/dashboard/profile?calendar=connected";
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public String accessToken(GoogleCalendarConnection connection) {
        if (connection.getAccessTokenExpiresAt() == null
                || connection.getAccessTokenExpiresAt().isAfter(Instant.now().plusSeconds(60))
                || isBlank(connection.getRefreshToken())) {
            return connection.getAccessToken();
        }

        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", connection.getRefreshToken());
        form.add("grant_type", "refresh_token");

        Map<String, Object> token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        String accessToken = String.valueOf(token.get("access_token"));
        Number expiresIn = token.get("expires_in") instanceof Number number ? number : null;
        connection.setAccessToken(accessToken);
        if (expiresIn != null) {
            connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(expiresIn.longValue()));
        }
        connections.save(connection);
        return accessToken;
    }

    @SuppressWarnings("unchecked")
    private Optional<String> googleAccountEmail(String accessToken) {
        try {
            Map<String, Object> userInfo = restClient.get()
                    .uri("https://www.googleapis.com/oauth2/v2/userinfo")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
            if (userInfo == null || userInfo.get("email") == null) {
                return Optional.empty();
            }
            return Optional.of(String.valueOf(userInfo.get("email")));
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
