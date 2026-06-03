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
            BigDecimal income,
            BigDecimal lessonHours,
            BigDecimal lessonIncome,
            BigDecimal importedHours,
            BigDecimal importedIncome
    ) {
    }

    public record ImportEarningsResponse(
            int importedRows,
            int updatedRows,
            List<String> errors
    ) {
    }

    public record EarningsResponse(
            BigDecimal totalEarnings,
            BigDecimal totalHours,
            BigDecimal averageHourlyRate,
            List<WeeklyEarning> weeks,
            List<Integer> availableYears,
            List<String> availableMonths,
            int page,
            int pageSize,
            int totalPages,
            long totalWeeks
    ) {
    }
}
