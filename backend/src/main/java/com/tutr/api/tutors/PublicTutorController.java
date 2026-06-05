package com.tutr.api.tutors;

import com.tutr.api.enquiries.EnquiryDtos.EnquiryRequest;
import com.tutr.api.enquiries.EnquiryDtos.EnquiryResponse;
import com.tutr.api.enquiries.EnquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.tutr.api.tutors.TutorDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/tutors")
public class PublicTutorController {
    private final TutorProfileService tutorProfiles;
    private final EnquiryService enquiries;

    @GetMapping
    List<TutorProfileResponse> search(@RequestParam(required = false) String subject,
                                      @RequestParam(required = false) String location,
                                      @RequestParam(required = false) String tutorYear,
                                      @RequestParam(required = false) Boolean online) {
        return tutorProfiles.searchPublic(subject, location, tutorYear, online);
    }

    @GetMapping("/{slug}")
    TutorProfileResponse bySlug(@PathVariable String slug) {
        return tutorProfiles.publicBySlug(slug);
    }

    @PostMapping("/{slug}/enquiries")
    EnquiryResponse createEnquiry(@PathVariable String slug, @Valid @RequestBody EnquiryRequest request) {
        return enquiries.createPublic(slug, request);
    }
}
