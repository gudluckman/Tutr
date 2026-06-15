package com.tutr.api.controller;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import static com.tutr.api.dto.TutorDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/tutor/profile")
public class TutorProfileController {
    private final TutorProfileService service;
    private final ProfileImageStorageService imageStorage;

    @GetMapping
    TutorProfileResponse get(@AuthenticationPrincipal User user) {
        return service.currentProfile(user);
    }

    @PutMapping
    TutorProfileResponse update(@AuthenticationPrincipal User user, @Valid @RequestBody TutorProfileRequest request) {
        return service.updateCurrentProfile(user, request);
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    TutorProfileResponse uploadImage(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        String profileImageUrl = imageStorage.store(file);
        return service.updateCurrentProfileImage(user, profileImageUrl);
    }
}
