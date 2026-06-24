package com.tutr.api.repository;

import com.tutr.api.entity.GoogleCalendarDeletion;
import com.tutr.api.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GoogleCalendarDeletionRepository extends JpaRepository<GoogleCalendarDeletion, UUID> {
    @EntityGraph(attributePaths = "tutor")
    List<GoogleCalendarDeletion> findByTutorOrderByCreatedAtAsc(User tutor);
}
