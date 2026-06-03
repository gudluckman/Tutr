package com.tutr.api.tutors;

import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, UUID> {
    boolean existsBySlug(String slug);
    Optional<TutorProfile> findByUser(User user);
    Optional<TutorProfile> findBySlug(String slug);
    Optional<TutorProfile> findBySlugAndIsPublicTrue(String slug);
    List<TutorProfile> findByIsPublicTrue();
}
