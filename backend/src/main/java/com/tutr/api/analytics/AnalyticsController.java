package com.tutr.api.analytics;

import com.tutr.api.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import static com.tutr.api.analytics.AnalyticsDtos.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService service;

    @GetMapping("/summary")
    AnalyticsSummary summary(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "WEEKLY") RevenuePeriod period
    ) {
        return service.summary(user, period);
    }

    @GetMapping("/earnings")
    EarningsResponse earnings(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int pageSize
    ) {
        return service.earnings(user, page, pageSize);
    }

    @GetMapping(value = "/earnings/export", produces = "text/csv")
    ResponseEntity<String> exportEarnings(@AuthenticationPrincipal User user) {
        String csv = service.exportEarningsCsv(user);
        if (csv.isBlank()) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("tutr-earnings.csv")
                        .build()
                        .toString())
                .body(csv);
    }

    @PostMapping("/earnings/import")
    ImportEarningsResponse importEarnings(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        return service.importEarnings(user, file);
    }
}
