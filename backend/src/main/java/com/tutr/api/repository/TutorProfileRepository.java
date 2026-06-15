package com.tutr.api.repository;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.User;
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
