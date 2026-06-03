package com.tutr.api.lessons;

import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    @EntityGraph(attributePaths = "student")
    List<Lesson> findByTutorOrderByLessonDateDesc(User tutor);

    @EntityGraph(attributePaths = "student")
    List<Lesson> findByTutorAndGoogleEventIdIsNotNull(User tutor);

    List<Lesson> findByLessonSeriesOrderByLessonDateAsc(LessonSeries lessonSeries);

    @EntityGraph(attributePaths = "student")
    Optional<Lesson> findByIdAndTutor(UUID id, User tutor);
}
