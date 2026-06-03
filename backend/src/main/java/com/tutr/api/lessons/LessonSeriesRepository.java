package com.tutr.api.lessons;

import com.tutr.api.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonSeriesRepository extends JpaRepository<LessonSeries, UUID> {
    List<LessonSeries> findByTutorOrderByFirstLessonDateDesc(User tutor);
}
