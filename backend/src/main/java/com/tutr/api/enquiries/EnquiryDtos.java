package com.tutr.api.enquiries;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public final class EnquiryDtos {
    private EnquiryDtos() {
    }

    public record EnquiryRequest(
            @NotBlank String parentName,
            @Email @NotBlank String parentEmail,
            String parentPhone,
            String studentYear,
            String subject,
            String message,
            String preferredLocation,
            PreferredMode preferredMode
    ) {
    }

    public record UpdateStatusRequest(@NotNull EnquiryStatus status) {
    }

    public record EnquiryResponse(
            UUID id,
            String tutorSlug,
            String parentName,
            String parentEmail,
            String parentPhone,
            String studentYear,
            String subject,
            String message,
            String preferredLocation,
            PreferredMode preferredMode,
            EnquiryStatus status,
            Instant createdAt
    ) {
        public static EnquiryResponse from(Enquiry enquiry) {
            return new EnquiryResponse(
                    enquiry.getId(),
                    enquiry.getTutorProfile().getSlug(),
                    enquiry.getParentName(),
                    enquiry.getParentEmail(),
                    enquiry.getParentPhone(),
                    enquiry.getStudentYear(),
                    enquiry.getSubject(),
                    enquiry.getMessage(),
                    enquiry.getPreferredLocation(),
                    enquiry.getPreferredMode(),
                    enquiry.getStatus(),
                    enquiry.getCreatedAt()
            );
        }
    }
}

