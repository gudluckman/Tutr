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

public interface LessonSeriesRepository extends JpaRepository<LessonSeries, UUID> {
    List<LessonSeries> findByTutorOrderByFirstLessonDateDesc(User tutor);

    List<LessonSeries> findByTutorAndGoogleEventIdIsNotNull(User tutor);

    Optional<LessonSeries> findByIdAndTutor(UUID id, User tutor);
}
