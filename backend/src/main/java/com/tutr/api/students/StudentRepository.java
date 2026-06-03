package com.tutr.api.students;

import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    List<Student> findByTutorOrderByCreatedAtDesc(User tutor);
    Optional<Student> findByIdAndTutor(UUID id, User tutor);
}

