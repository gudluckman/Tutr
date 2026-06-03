package com.tutr.api.analytics;

import com.tutr.api.users.User;
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
