package com.tutr.api.analytics;

import com.tutr.api.lessons.Lesson;
import com.tutr.api.lessons.LessonRepository;
import com.tutr.api.lessons.LessonStatus;
import com.tutr.api.lessons.PaymentStatus;
import com.tutr.api.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.tutr.api.analytics.AnalyticsDtos.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private static final ZoneId ANALYTICS_TIME_ZONE = ZoneId.of("Australia/Sydney");

    private final LessonRepository lessons;

    public AnalyticsSummary summary(User tutor, RevenuePeriod period) {
        List<Lesson> all = lessons.findByTutorOrderByLessonDateDesc(tutor);
        LocalDate today = LocalDate.now(ANALYTICS_TIME_ZONE);

        Map<String, RevenueTotals> revenue = all.stream()
                .filter(this::isExpectedLesson)
                .collect(Collectors.groupingBy(
                        lesson -> revenueKey(lesson, period),
                        Collectors.mapping(this::revenueTotals, Collectors.reducing(RevenueTotals.ZERO, RevenueTotals::add))
                ));
        RevenueTotals currentPeriod = revenue.getOrDefault(revenueKey(today, period), RevenueTotals.ZERO);

        return new AnalyticsSummary(
                period,
                currentPeriod.expectedRevenue(),
                currentPeriod.paidRevenue(),
                currentPeriod.outstandingRevenue(),
                all.stream().filter(lesson -> lesson.getStatus() == LessonStatus.COMPLETED).count(),
                all.stream().filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED).count(),
                all.stream().filter(lesson -> lesson.getStatus() == LessonStatus.CANCELLED).count(),
                revenue.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey(Comparator.naturalOrder()))
                        .skip(Math.max(0, revenue.size() - 12L))
                        .map(entry -> new RevenuePoint(
                                entry.getKey(),
                                entry.getValue().expectedRevenue(),
                                entry.getValue().paidRevenue(),
                                entry.getValue().outstandingRevenue()
                        ))
                        .toList()
        );
    }

    public EarningsResponse earnings(User tutor, int requestedPage, int requestedPageSize) {
        int pageSize = Math.max(1, Math.min(requestedPageSize, 52));
        List<Lesson> paidLessons = lessons.findByTutorOrderByLessonDateDesc(tutor).stream()
                .filter(this::isPaidLesson)
                .toList();

        BigDecimal totalEarnings = paidLessons.stream()
                .map(this::lessonAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalHours = paidLessons.stream()
                .map(this::lessonHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageHourlyRate = totalHours.signum() == 0
                ? BigDecimal.ZERO
                : totalEarnings.divide(totalHours, 2, RoundingMode.HALF_UP);

        Map<LocalDate, List<Lesson>> lessonsByWeek = paidLessons.stream()
                .collect(Collectors.groupingBy(
                        lesson -> lesson.getLessonDate().atZone(ANALYTICS_TIME_ZONE).toLocalDate()
                                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<WeeklyEarning> allWeeks = lessonsByWeek.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, List<Lesson>>comparingByKey().reversed())
                .map(entry -> new WeeklyEarning(
                        entry.getKey(),
                        entry.getKey().plusDays(6),
                        entry.getValue().stream().map(this::lessonHours).reduce(BigDecimal.ZERO, BigDecimal::add),
                        entry.getValue().stream().map(this::lessonAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .toList();

        int totalPages = allWeeks.isEmpty() ? 0 : (allWeeks.size() + pageSize - 1) / pageSize;
        int page = totalPages == 0 ? 0 : Math.max(0, Math.min(requestedPage, totalPages - 1));
        int fromIndex = Math.min(page * pageSize, allWeeks.size());
        int toIndex = Math.min(fromIndex + pageSize, allWeeks.size());
        return new EarningsResponse(
                totalEarnings,
                totalHours,
                averageHourlyRate,
                allWeeks.subList(fromIndex, toIndex),
                page,
                pageSize,
                totalPages,
                allWeeks.size()
        );
    }

    private boolean isPaidLesson(Lesson lesson) {
        return lesson.getPaymentStatus() == PaymentStatus.PAID;
    }

    private boolean isExpectedLesson(Lesson lesson) {
        return lesson.getStatus() != LessonStatus.CANCELLED || isPaidLesson(lesson);
    }

    private RevenueTotals revenueTotals(Lesson lesson) {
        BigDecimal amount = lessonAmount(lesson);
        return isPaidLesson(lesson)
                ? new RevenueTotals(amount, amount, BigDecimal.ZERO)
                : new RevenueTotals(amount, BigDecimal.ZERO, amount);
    }

    private String revenueKey(Lesson lesson, RevenuePeriod period) {
        return revenueKey(lesson.getLessonDate().atZone(ANALYTICS_TIME_ZONE).toLocalDate(), period);
    }

    private String revenueKey(LocalDate date, RevenuePeriod period) {
        return switch (period) {
            case DAILY -> date.toString();
            case WEEKLY -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
            case MONTHLY -> date.toString().substring(0, 7);
            case YEARLY -> String.valueOf(date.getYear());
        };
    }

    private BigDecimal lessonHours(Lesson lesson) {
        return BigDecimal.valueOf(lesson.getDurationMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal lessonAmount(Lesson lesson) {
        return lesson.getHourlyRate()
                .multiply(BigDecimal.valueOf(lesson.getDurationMinutes()))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private record RevenueTotals(BigDecimal expectedRevenue, BigDecimal paidRevenue, BigDecimal outstandingRevenue) {
        private static final RevenueTotals ZERO = new RevenueTotals(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        private RevenueTotals add(RevenueTotals other) {
            return new RevenueTotals(
                    expectedRevenue.add(other.expectedRevenue),
                    paidRevenue.add(other.paidRevenue),
                    outstandingRevenue.add(other.outstandingRevenue)
            );
        }
    }
}
