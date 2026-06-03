package com.tutr.api.tutors;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public final class TutorDtos {
    private TutorDtos() {
    }

    public record TutorProfileRequest(
            @NotBlank String displayName,
            @NotBlank String slug,
            String headline,
            String bio,
            String location,
            boolean online,
            BigDecimal hourlyRateMin,
            BigDecimal hourlyRateMax,
            String university,
            String degree,
            String atar,
            String profileImageUrl,
            @JsonProperty("isPublic")
            boolean isPublic
    ) {
    }

    public record TutorProfileResponse(
            UUID id,
            String displayName,
            String slug,
            String headline,
            String bio,
            String location,
            boolean online,
            BigDecimal hourlyRateMin,
            BigDecimal hourlyRateMax,
            String university,
            String degree,
            String atar,
            String profileImageUrl,
            @JsonProperty("isPublic")
            boolean isPublic
    ) {
        static TutorProfileResponse from(TutorProfile profile) {
            return new TutorProfileResponse(
                    profile.getId(),
                    profile.getDisplayName(),
                    profile.getSlug(),
                    profile.getHeadline(),
                    profile.getBio(),
                    profile.getLocation(),
                    profile.isOnline(),
                    profile.getHourlyRateMin(),
                    profile.getHourlyRateMax(),
                    profile.getUniversity(),
                    profile.getDegree(),
                    profile.getAtar(),
                    profile.getProfileImageUrl(),
                    profile.isPublic()
            );
        }
    }
}
