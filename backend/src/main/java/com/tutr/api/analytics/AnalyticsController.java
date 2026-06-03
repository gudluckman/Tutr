package com.tutr.api.analytics;

import com.tutr.api.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
