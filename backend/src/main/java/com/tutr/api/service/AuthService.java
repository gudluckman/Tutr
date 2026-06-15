package com.tutr.api.service;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.TutorProfile;
import com.tutr.api.repository.TutorProfileRepository;
import com.tutr.api.entity.User;
import com.tutr.api.repository.UserRepository;
import com.tutr.api.enums.UserRole;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

import static com.tutr.api.dto.AuthDtos.*;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final TutorProfileRepository tutorProfiles;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.TUTOR);
        users.save(user);

        TutorProfile profile = new TutorProfile();
        profile.setUser(user);
        profile.setDisplayName(request.displayName());
        profile.setSlug(uniqueSlug(request.displayName()));
        profile.setPublic(false);
        profile.setOnline(false);
        tutorProfiles.save(profile);

        return response(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return response(user);
    }

    public User currentUser(User principal) {
        return users.findById(principal.getId()).orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private AuthResponse response(User user) {
        return new AuthResponse(jwtService.createToken(user), new UserResponse(user.getId(), user.getEmail(), user.getRole()));
    }

    private String uniqueSlug(String displayName) {
        String base = displayName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) {
            base = "tutor";
        }
        String slug = base;
        int suffix = 2;
        while (tutorProfiles.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }
}

