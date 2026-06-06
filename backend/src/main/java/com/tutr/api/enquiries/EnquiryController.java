package com.tutr.api.enquiries;

import com.tutr.api.users.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.tutr.api.enquiries.EnquiryDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/enquiries")
public class EnquiryController {
    private final EnquiryService service;

    @GetMapping
    List<EnquiryResponse> list(@AuthenticationPrincipal User user) {
        return service.list(user);
    }

    @PutMapping("/{id}/status")
    EnquiryResponse updateStatus(@AuthenticationPrincipal User user,
                                 @PathVariable UUID id,
                                 @Valid @RequestBody UpdateStatusRequest request) {
        return service.updateStatus(user, id, request);
    }

    @PostMapping("/{id}/convert")
    ConvertToStudentResponse convertToStudent(@AuthenticationPrincipal User user,
                                              @PathVariable UUID id,
                                              @Valid @RequestBody ConvertToStudentRequest request) {
        return service.convertToStudent(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.delete(user, id);
    }
}
