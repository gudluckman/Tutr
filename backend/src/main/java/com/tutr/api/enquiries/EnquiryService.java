package com.tutr.api.enquiries;

import com.tutr.api.tutors.TutorProfile;
import com.tutr.api.tutors.TutorProfileService;
import com.tutr.api.users.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.tutr.api.enquiries.EnquiryDtos.*;

@Service
@RequiredArgsConstructor
public class EnquiryService {
    private final EnquiryRepository enquiries;
    private final TutorProfileService tutorProfiles;

    @Transactional
    public EnquiryResponse createPublic(String tutorSlug, EnquiryRequest request) {
        TutorProfile profile = tutorProfiles.publicProfileEntity(tutorSlug);
        Enquiry enquiry = new Enquiry();
        enquiry.setTutorProfile(profile);
        enquiry.setParentName(request.parentName());
        enquiry.setParentEmail(request.parentEmail());
        enquiry.setParentPhone(request.parentPhone());
        enquiry.setStudentYear(request.studentYear());
        enquiry.setSubject(request.subject());
        enquiry.setMessage(request.message());
        enquiry.setPreferredLocation(request.preferredLocation());
        enquiry.setPreferredMode(request.preferredMode());
        enquiry.setStatus(EnquiryStatus.NEW);
        return EnquiryResponse.from(enquiries.save(enquiry));
    }

    @Transactional(readOnly = true)
    public List<EnquiryResponse> list(User tutor) {
        return enquiries.findByTutorProfileOrderByCreatedAtDesc(tutorProfiles.profileFor(tutor)).stream()
                .map(EnquiryResponse::from)
                .toList();
    }

    @Transactional
    public EnquiryResponse updateStatus(User tutor, UUID id, UpdateStatusRequest request) {
        Enquiry enquiry = enquiries.findByIdAndTutorProfileUser(id, tutor)
                .orElseThrow(() -> new EntityNotFoundException("Enquiry not found"));
        enquiry.setStatus(request.status());
        return EnquiryResponse.from(enquiry);
    }
}
