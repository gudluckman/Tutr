package com.tutr.api.auth;

import com.tutr.api.users.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @Size(min = 8) String password,
            @NotBlank String displayName
    ) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record UserResponse(UUID id, String email, UserRole role) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }
}

