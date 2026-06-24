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

import static com.tutr.api.dto.LessonDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/lessons")
public class LessonController {
    private final LessonService service;

    @GetMapping
    List<LessonResponse> list(@AuthenticationPrincipal User user) {
        return service.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    LessonResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody LessonRequest request) {
        return service.create(user, request);
    }

    @PostMapping("/recurring")
    @ResponseStatus(HttpStatus.CREATED)
    RecurringLessonResponse createRecurring(@AuthenticationPrincipal User user, @Valid @RequestBody RecurringLessonRequest request) {
        return service.createRecurring(user, request);
    }

    @GetMapping("/{id}")
    LessonResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return service.get(user, id);
    }

    @PutMapping("/{id}")
    LessonResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody LessonRequest request) {
        return service.update(user, id, request);
    }

    @PutMapping("/{id}/following")
    LessonResponse updateFollowing(@AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody LessonRequest request) {
        return service.updateFollowing(user, id, request);
    }

    @PutMapping("/{id}/series")
    LessonResponse updateSeries(@AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody LessonRequest request) {
        return service.updateSeries(user, id, request);
    }

    @PutMapping("/{id}/statuses")
    LessonResponse updateStatuses(@AuthenticationPrincipal User user, @PathVariable UUID id, @RequestBody LessonStatusRequest request) {
        return service.updateStatuses(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.delete(user, id);
    }

    @DeleteMapping("/{id}/series")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteSeries(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.deleteSeries(user, id);
    }

    @DeleteMapping("/{id}/following")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteFollowing(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.deleteFollowing(user, id);
    }
}
