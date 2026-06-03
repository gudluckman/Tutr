package com.tutr.api.enquiries;

import com.tutr.api.tutors.TutorProfile;
import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnquiryRepository extends JpaRepository<Enquiry, UUID> {
    List<Enquiry> findByTutorProfileOrderByCreatedAtDesc(TutorProfile tutorProfile);
    Optional<Enquiry> findByIdAndTutorProfileUser(UUID id, User tutor);
}

