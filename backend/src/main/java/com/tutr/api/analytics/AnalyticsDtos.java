package com.tutr.api.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class AnalyticsDtos {
    private AnalyticsDtos() {
    }

    public record RevenuePoint(
            String period,
            BigDecimal expectedRevenue,
            BigDecimal paidRevenue,
            BigDecimal outstandingRevenue
    ) {
    }

    public record AnalyticsSummary(
            RevenuePeriod revenuePeriod,
            BigDecimal periodExpectedRevenue,
            BigDecimal periodPaidRevenue,
            BigDecimal periodOutstandingRevenue,
            long completedLessons,
            long scheduledLessons,
            long cancelledLessons,
            List<RevenuePoint> revenue
    ) {
    }

    public record WeeklyEarning(
            LocalDate weekStart,
            LocalDate weekEnd,
            BigDecimal hours,
            BigDecimal income
    ) {
    }

    public record EarningsResponse(
            BigDecimal totalEarnings,
            BigDecimal totalHours,
            BigDecimal averageHourlyRate,
            List<WeeklyEarning> weeks,
            int page,
            int pageSize,
            int totalPages,
            long totalWeeks
    ) {
    }
}
