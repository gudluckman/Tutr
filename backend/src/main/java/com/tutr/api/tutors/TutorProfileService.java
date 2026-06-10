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
                .filter(profile -> matchesTeachingFilters(profile, subject, tutorYear))
                .filter(profile -> matchesLocation(profile, location))
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
        profile.setTeachingOfferings(teachingOfferings(request.teachingOfferings()));
        profile.setOnline(request.online());
        profile.setHourlyRateMin(request.hourlyRateMin());
        profile.setHourlyRateMax(request.hourlyRateMax());
        profile.setUniversity(request.university());
        profile.setDegree(request.degree());
        profile.setHighSchool(request.highSchool());
        profile.setHighSchoolFinishedYear(request.highSchoolFinishedYear());
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
        return hasMatchingOffering(profile, term, null) || contains(profile.getHeadline(), term) || contains(profile.getBio(), term);
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
        return hasMatchingOffering(profile, null, tutorYear.toLowerCase(Locale.ROOT))
                || contains(profile.getTutorYear(), tutorYear.toLowerCase(Locale.ROOT));
    }

    private boolean matchesTeachingFilters(TutorProfile profile, String subject, String tutorYear) {
        String subjectTerm = subject == null || subject.isBlank() ? null : subject.toLowerCase(Locale.ROOT);
        String yearTerm = tutorYear == null || tutorYear.isBlank() ? null : tutorYear.toLowerCase(Locale.ROOT);
        if (subjectTerm == null && yearTerm == null) {
            return true;
        }
        if (hasMatchingOffering(profile, subjectTerm, yearTerm)) {
            return true;
        }
        if (profile.getTeachingOfferings() != null && !profile.getTeachingOfferings().isEmpty()) {
            return false;
        }
        return matchesSubject(profile, subject) && matchesTutorYear(profile, tutorYear);
    }

    private boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }

    private List<TeachingOffering> teachingOfferings(List<TeachingOffering> requestedOfferings) {
        if (requestedOfferings == null) {
            return List.of();
        }
        return requestedOfferings.stream()
                .filter(offering -> offering != null && !isBlank(offering.tutorYear()) && !isBlank(offering.subject()))
                .map(offering -> new TeachingOffering(offering.tutorYear().trim(), offering.subject().trim()))
                .distinct()
                .limit(30)
                .toList();
    }

    private boolean hasMatchingOffering(TutorProfile profile, String subject, String tutorYear) {
        List<TeachingOffering> offerings = profile.getTeachingOfferings();
        if (offerings == null || offerings.isEmpty()) {
            return false;
        }
        return offerings.stream().anyMatch(offering -> {
            boolean subjectMatches = subject == null || contains(offering.subject(), subject);
            boolean yearMatches = tutorYear == null || contains(offering.tutorYear(), tutorYear);
            return subjectMatches && yearMatches;
        });
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
