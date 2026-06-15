package com.tutr.api.repository;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportedEarningRepository extends JpaRepository<ImportedEarning, UUID> {
    List<ImportedEarning> findByTutorOrderByStartDateDesc(User tutor);

    Optional<ImportedEarning> findByTutorAndStartDateAndEndDate(User tutor, LocalDate startDate, LocalDate endDate);

    void deleteByTutor(User tutor);
}
