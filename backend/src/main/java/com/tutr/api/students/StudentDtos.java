package com.tutr.api.students;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public final class StudentDtos {
    private StudentDtos() {
    }

    public record StudentRequest(
            @NotBlank String name,
            @NotBlank String parentName,
            @NotBlank String parentEmail,
            @NotBlank String parentPhone,
            @NotBlank String schoolYear,
            @NotBlank String subject,
            @NotNull @Positive BigDecimal hourlyRate,
            String notes,
            boolean active
    ) {
    }

    public record StudentResponse(
            UUID id,
            String name,
            String parentName,
            String parentEmail,
            String parentPhone,
            String schoolYear,
            String subject,
            BigDecimal hourlyRate,
            String notes,
            boolean active
    ) {
        public static StudentResponse from(Student student) {
            return new StudentResponse(
                    student.getId(),
                    student.getName(),
                    student.getParentName(),
                    student.getParentEmail(),
                    student.getParentPhone(),
                    student.getSchoolYear(),
                    student.getSubject(),
                    student.getHourlyRate(),
                    student.getNotes(),
                    student.isActive()
            );
        }
    }
}
