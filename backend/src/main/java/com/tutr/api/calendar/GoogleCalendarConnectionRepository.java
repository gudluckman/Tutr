package com.tutr.api.calendar;

import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GoogleCalendarConnectionRepository extends JpaRepository<GoogleCalendarConnection, UUID> {
    Optional<GoogleCalendarConnection> findByTutor(User tutor);
}
