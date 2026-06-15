package com.tutr.api.dto;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;
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
            String tutorYear,
            List<TeachingOffering> teachingOfferings,
            boolean online,
            BigDecimal hourlyRateMin,
            BigDecimal hourlyRateMax,
            String university,
            String degree,
            String highSchool,
            Integer highSchoolFinishedYear,
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
            String tutorYear,
            List<TeachingOffering> teachingOfferings,
            boolean online,
            BigDecimal hourlyRateMin,
            BigDecimal hourlyRateMax,
            String university,
            String degree,
            String highSchool,
            Integer highSchoolFinishedYear,
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
                    profile.getTutorYear(),
                    profile.getTeachingOfferings(),
                    profile.isOnline(),
                    profile.getHourlyRateMin(),
                    profile.getHourlyRateMax(),
                    profile.getUniversity(),
                    profile.getDegree(),
                    profile.getHighSchool(),
                    profile.getHighSchoolFinishedYear(),
                    profile.getAtar(),
                    profile.getProfileImageUrl(),
                    profile.isPublic()
            );
        }
    }
}
