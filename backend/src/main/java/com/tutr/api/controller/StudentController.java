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

import static com.tutr.api.dto.StudentDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/students")
public class StudentController {
    private final StudentService service;

    @GetMapping
    List<StudentResponse> list(@AuthenticationPrincipal User user) {
        return service.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    StudentResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody StudentRequest request) {
        return service.create(user, request);
    }

    @GetMapping("/{id}")
    StudentResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return service.get(user, id);
    }

    @PutMapping("/{id}")
    StudentResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody StudentRequest request) {
        return service.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.delete(user, id);
    }
}

