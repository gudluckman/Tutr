package com.tutr.api.service;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfileImageStorageService {
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif"
    );

    private final Path profileImageDir = Paths.get("uploads", "profile-images").toAbsolutePath().normalize();
    private final RestClient restClient = RestClient.create();

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.service-role-key:}")
    private String supabaseServiceRoleKey;

    @Value("${app.supabase.profile-image-bucket:profile-images}")
    private String profileImageBucket;

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Profile image is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Profile image must be 5MB or less");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new IllegalArgumentException("Profile image must be a JPG, PNG, WebP, or GIF");
        }

        if (isSupabaseConfigured()) {
            return storeInSupabase(file, contentType, extension);
        }
        return storeLocally(file, extension);
    }

    private boolean isSupabaseConfigured() {
        return !supabaseUrl.isBlank() && !supabaseServiceRoleKey.isBlank() && !profileImageBucket.isBlank();
    }

    private String storeInSupabase(MultipartFile file, String contentType, String extension) {
        String objectPath = "tutors/" + UUID.randomUUID() + extension;
        try {
            restClient.post()
                    .uri(supabaseUrlWithoutTrailingSlash() + "/storage/v1/object/" + profileImageBucket + "/" + objectPath)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("x-upsert", "true")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity();
            return supabaseUrlWithoutTrailingSlash() + "/storage/v1/object/public/" + profileImageBucket + "/" + objectPath;
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read profile image", ex);
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Could not store profile image in Supabase", ex);
        }
    }

    private String supabaseUrlWithoutTrailingSlash() {
        return supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
    }

    private String storeLocally(MultipartFile file, String extension) {
        try {
            Files.createDirectories(profileImageDir);
            String filename = UUID.randomUUID() + extension;
            Path destination = profileImageDir.resolve(filename).normalize();
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/profile-images/" + filename;
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store profile image", ex);
        }
    }
}
