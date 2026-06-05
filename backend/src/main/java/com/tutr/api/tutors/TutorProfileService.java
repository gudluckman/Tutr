package com.tutr.api.tutors;

import com.tutr.api.users.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

import static com.tutr.api.tutors.TutorDtos.*;

@Service
@RequiredArgsConstructor
public class TutorProfileService {
    private final TutorProfileRepository profiles;

    public List<TutorProfileResponse> searchPublic(String subject, String location, String tutorYear, Boolean online) {
        return profiles.findByIsPublicTrue().stream()
                .filter(profile -> matchesSubject(profile, subject))
                .filter(profile -> matchesLocation(profile, location))
                .filter(profile -> matchesTutorYear(profile, tutorYear))
                .filter(profile -> online == null || profile.isOnline() == online)
                .map(TutorProfileResponse::from)
                .toList();
    }

    public TutorProfileResponse publicBySlug(String slug) {
        return TutorProfileResponse.from(publicProfileEntity(slug));
    }

    public TutorProfile publicProfileEntity(String slug) {
        return profiles.findBySlugAndIsPublicTrue(slug).orElseThrow(() -> new EntityNotFoundException("Tutor profile not found"));
    }

    public TutorProfileResponse currentProfile(User user) {
        return TutorProfileResponse.from(profileFor(user));
    }

    @Transactional
    public TutorProfileResponse updateCurrentProfileImage(User user, String profileImageUrl) {
        TutorProfile profile = profileFor(user);
        profile.setProfileImageUrl(profileImageUrl);
        return TutorProfileResponse.from(profile);
    }

    @Transactional
    public TutorProfileResponse updateCurrentProfile(User user, TutorProfileRequest request) {
        TutorProfile profile = profileFor(user);
        String slug = normaliseSlug(request.slug());
        profiles.findBySlug(slug)
                .filter(existing -> !existing.getId().equals(profile.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Slug is already in use");
                });

        profile.setDisplayName(request.displayName());
        profile.setSlug(slug);
        profile.setHeadline(request.headline());
        profile.setBio(request.bio());
        profile.setLocation(request.location());
        profile.setTutorYear(request.tutorYear());
        profile.setOnline(request.online());
        profile.setHourlyRateMin(request.hourlyRateMin());
        profile.setHourlyRateMax(request.hourlyRateMax());
        profile.setUniversity(request.university());
        profile.setDegree(request.degree());
        profile.setAtar(request.atar());
        profile.setProfileImageUrl(request.profileImageUrl());
        profile.setPublic(request.isPublic());
        return TutorProfileResponse.from(profile);
    }

    public TutorProfile profileFor(User user) {
        return profiles.findByUser(user).orElseThrow(() -> new EntityNotFoundException("Tutor profile not found"));
    }

    private String normaliseSlug(String slug) {
        String normalised = slug.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (normalised.isBlank()) {
            throw new IllegalArgumentException("Slug is required");
        }
        return normalised;
    }

    private boolean matchesSubject(TutorProfile profile, String subject) {
        if (subject == null || subject.isBlank()) {
            return true;
        }
        String term = subject.toLowerCase(Locale.ROOT);
        return contains(profile.getHeadline(), term) || contains(profile.getBio(), term);
    }

    private boolean matchesLocation(TutorProfile profile, String location) {
        if (location == null || location.isBlank()) {
            return true;
        }
        return contains(profile.getLocation(), location.toLowerCase(Locale.ROOT));
    }

    private boolean matchesTutorYear(TutorProfile profile, String tutorYear) {
        if (tutorYear == null || tutorYear.isBlank()) {
            return true;
        }
        return contains(profile.getTutorYear(), tutorYear.toLowerCase(Locale.ROOT));
    }

    private boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }
}
