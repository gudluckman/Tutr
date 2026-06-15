package com.tutr.api.service;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.Lesson;
import com.tutr.api.repository.LessonRepository;
import com.tutr.api.enums.LessonStatus;
import com.tutr.api.enums.PaymentStatus;
import com.tutr.api.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.tutr.api.dto.AnalyticsDtos.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private static final ZoneId ANALYTICS_TIME_ZONE = ZoneId.of("Australia/Sydney");
    private static final DateTimeFormatter IMPORT_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);
    private static final List<String> IMPORT_HEADERS = List.of("Start Date", "End Date", "Weekly Hours", "Weekly Income");
    private static final Pattern IMPORT_DECIMAL = Pattern.compile("\\d+(\\.\\d{1,2})?");
    private static final int MIN_IMPORT_YEAR = 2000;
    private static final BigDecimal MAX_WEEKLY_HOURS = BigDecimal.valueOf(168);
    private static final BigDecimal MAX_WEEKLY_INCOME = BigDecimal.valueOf(100_000);
    private static final int LAZY_RECURRING_LOOKBACK_DAYS = 180;
    private static final int LAZY_RECURRING_LOOKAHEAD_DAYS = 365;
    private static final int MAX_LAZY_OCCURRENCES_PER_SERIES = 104;

    private final LessonRepository lessons;
    private final LessonSeriesRepository lessonSeries;
    private final ImportedEarningRepository importedEarnings;

    @Transactional(readOnly = true)
    public AnalyticsSummary summary(User tutor, RevenuePeriod period) {
        List<AnalyticsLesson> all = analyticsLessons(tutor);
        LocalDate today = LocalDate.now(ANALYTICS_TIME_ZONE);

        Map<String, RevenueTotals> revenue = all.stream()
                .filter(this::isExpectedLesson)
                .collect(Collectors.groupingBy(
                        lesson -> revenueKey(lesson, period),
                        Collectors.mapping(this::revenueTotals, Collectors.reducing(RevenueTotals.ZERO, RevenueTotals::add))
                ));
        importedEarnings.findByTutorOrderByStartDateDesc(tutor).forEach(imported -> {
            String key = revenueKey(imported.getStartDate(), period);
            RevenueTotals importedTotals = new RevenueTotals(imported.getWeeklyIncome(), imported.getWeeklyIncome(), BigDecimal.ZERO);
            revenue.merge(key, importedTotals, RevenueTotals::add);
        });
        RevenueTotals currentPeriod = revenue.getOrDefault(revenueKey(today, period), RevenueTotals.ZERO);

        return new AnalyticsSummary(
                period,
                currentPeriod.expectedRevenue(),
                currentPeriod.paidRevenue(),
                currentPeriod.outstandingRevenue(),
                all.stream().filter(lesson -> lesson.status() == LessonStatus.COMPLETED).count(),
                all.stream().filter(lesson -> lesson.status() == LessonStatus.SCHEDULED).count(),
                all.stream().filter(lesson -> lesson.status() == LessonStatus.CANCELLED).count(),
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

    private List<AnalyticsLesson> analyticsLessons(User tutor) {
        List<Lesson> storedLessons = lessons.findByTutorOrderByLessonDateDesc(tutor);
        List<AnalyticsLesson> analyticsLessons = new ArrayList<>(
                storedLessons.stream().map(AnalyticsLesson::from).toList());

        Set<String> materializedOccurrences = new HashSet<>();
        for (Lesson lesson : storedLessons) {
            if (lesson.getLessonSeries() != null) {
                materializedOccurrences.add(occurrenceKey(lesson.getLessonSeries(), lesson.getLessonDate()));
            }
        }

        Instant now = Instant.now();
        Instant windowStart = now.minus(LAZY_RECURRING_LOOKBACK_DAYS, java.time.temporal.ChronoUnit.DAYS);
        Instant windowEnd = now.plus(LAZY_RECURRING_LOOKAHEAD_DAYS, java.time.temporal.ChronoUnit.DAYS);
        for (LessonSeries series : lessonSeries.findByTutorOrderByFirstLessonDateDesc(tutor)) {
            for (Instant occurrence : occurrencesBetween(series, windowStart, windowEnd)) {
                if (!materializedOccurrences.contains(occurrenceKey(series, occurrence))) {
                    analyticsLessons.add(AnalyticsLesson.from(series, occurrence));
                }
            }
        }
        return analyticsLessons;
    }

    public EarningsResponse earnings(User tutor, int requestedPage, int requestedPageSize, Integer requestedYear, Integer requestedMonth) {
        int pageSize = Math.max(1, Math.min(requestedPageSize, 52));
        List<WeeklyEarning> allWeeks = weeklyEarnings(tutor);
        List<Integer> availableYears = allWeeks.stream()
                .map(week -> week.weekStart().getYear())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();
        List<String> availableMonths = allWeeks.stream()
                .filter(week -> requestedYear == null || week.weekStart().getYear() == requestedYear)
                .map(week -> week.weekStart().withDayOfMonth(1).toString().substring(0, 7))
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();
        List<WeeklyEarning> filteredWeeks = filterWeeklyEarnings(allWeeks, requestedYear, requestedMonth);
        BigDecimal combinedTotalEarnings = filteredWeeks.stream()
                .map(WeeklyEarning::income)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal combinedTotalHours = filteredWeeks.stream()
                .map(WeeklyEarning::hours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal combinedAverageHourlyRate = combinedTotalHours.signum() == 0
                ? BigDecimal.ZERO
                : combinedTotalEarnings.divide(combinedTotalHours, 2, RoundingMode.HALF_UP);

        int totalPages = filteredWeeks.isEmpty() ? 0 : (filteredWeeks.size() + pageSize - 1) / pageSize;
        int page = totalPages == 0 ? 0 : Math.max(0, Math.min(requestedPage, totalPages - 1));
        int fromIndex = Math.min(page * pageSize, filteredWeeks.size());
        int toIndex = Math.min(fromIndex + pageSize, filteredWeeks.size());
        return new EarningsResponse(
                combinedTotalEarnings,
                combinedTotalHours,
                combinedAverageHourlyRate,
                filteredWeeks.subList(fromIndex, toIndex),
                availableYears,
                availableMonths,
                page,
                pageSize,
                totalPages,
                filteredWeeks.size()
        );
    }

    public String exportEarningsCsv(User tutor, Integer year, Integer month) {
        List<WeeklyEarning> weeks = filterWeeklyEarnings(weeklyEarnings(tutor), year, month);
        if (weeks.isEmpty()) {
            return "";
        }

        StringBuilder csv = new StringBuilder("Week Start,Week End,Total Hours,Total Income,Tutr Lesson Hours,Tutr Lesson Income,Imported Hours,Imported Income\n");
        weeks.forEach(week -> csv.append(csvValue(week.weekStart()))
                .append(',')
                .append(csvValue(week.weekEnd()))
                .append(',')
                .append(csvValue(week.hours()))
                .append(',')
                .append(csvValue(week.income()))
                .append(',')
                .append(csvValue(week.lessonHours()))
                .append(',')
                .append(csvValue(week.lessonIncome()))
                .append(',')
                .append(csvValue(week.importedHours()))
                .append(',')
                .append(csvValue(week.importedIncome()))
                .append('\n'));
        return csv.toString();
    }

    private List<WeeklyEarning> filterWeeklyEarnings(List<WeeklyEarning> weeks, Integer year, Integer month) {
        return weeks.stream()
                .filter(week -> year == null || week.weekStart().getYear() == year)
                .filter(week -> month == null || week.weekStart().getMonthValue() == month)
                .toList();
    }

    private List<WeeklyEarning> weeklyEarnings(User tutor) {
        List<Lesson> paidLessons = lessons.findByTutorOrderByLessonDateDesc(tutor).stream()
                .filter(this::isPaidLesson)
                .toList();
        Map<LocalDate, List<Lesson>> lessonsByWeek = paidLessons.stream()
                .collect(Collectors.groupingBy(
                        lesson -> lesson.getLessonDate().atZone(ANALYTICS_TIME_ZONE).toLocalDate()
                                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<LocalDate, WeeklyEarningTotals> weeklyTotals = new LinkedHashMap<>();
        lessonsByWeek.forEach((weekStart, weekLessons) -> {
            BigDecimal lessonHours = weekLessons.stream().map(this::lessonHours).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal lessonIncome = weekLessons.stream().map(this::lessonAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            weeklyTotals.computeIfAbsent(weekStart, WeeklyEarningTotals::new).addLessons(lessonHours, lessonIncome);
        });
        importedEarnings.findByTutorOrderByStartDateDesc(tutor).forEach(imported -> {
            LocalDate weekStart = imported.getStartDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            weeklyTotals.computeIfAbsent(weekStart, WeeklyEarningTotals::new)
                    .addImported(imported.getWeeklyHours(), imported.getWeeklyIncome());
        });

        return weeklyTotals.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, WeeklyEarningTotals>comparingByKey().reversed())
                .map(entry -> entry.getValue().toResponse())
                .toList();
    }

    @Transactional
    public ImportEarningsResponse importEarnings(User tutor, MultipartFile file, boolean replaceExisting) {
        if (file == null || file.isEmpty()) {
            return new ImportEarningsResponse(0, 0, List.of("Choose a CSV file to import."));
        }

        List<String> errors = new ArrayList<>();
        int importedRows = 0;
        int updatedRows = 0;
        Map<ImportedWeekKey, ParsedEarning> parsedRows = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null || !IMPORT_HEADERS.equals(parseCsvLine(stripBom(header)).stream().map(String::trim).toList())) {
                return new ImportEarningsResponse(0, 0, List.of("CSV headers must be: " + String.join(", ", IMPORT_HEADERS)));
            }

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> columns = parseCsvLine(line);
                if (columns.size() != IMPORT_HEADERS.size()) {
                    errors.add("Row \"" + csvSnippet(line) + "\": expected 4 columns.");
                    continue;
                }
                ParsedEarning parsed = parseEarning(columns, errors);
                if (parsed == null) {
                    continue;
                }
                ImportedWeekKey key = new ImportedWeekKey(parsed.startDate(), parsed.endDate());
                if (parsedRows.containsKey(key)) {
                    errors.add("Row \"" + csvSnippet(columns) + "\": duplicate week range. Remove or combine this week before uploading.");
                    continue;
                }
                parsedRows.put(key, parsed);
            }

            if (parsedRows.isEmpty()) {
                errors.add("CSV must include at least one earning row.");
            }

            if (!errors.isEmpty()) {
                errors.add("No imported earnings were changed. Fix the CSV and upload it again.");
                return new ImportEarningsResponse(0, 0, errors);
            }

            if (replaceExisting) {
                importedEarnings.deleteByTutor(tutor);
            }

            for (ParsedEarning parsed : parsedRows.values()) {
                ImportedEarning earning = importedEarnings
                        .findByTutorAndStartDateAndEndDate(tutor, parsed.startDate(), parsed.endDate())
                        .orElseGet(ImportedEarning::new);
                boolean existing = earning.getId() != null;
                earning.setTutor(tutor);
                earning.setStartDate(parsed.startDate());
                earning.setEndDate(parsed.endDate());
                earning.setWeeklyHours(parsed.weeklyHours());
                earning.setWeeklyIncome(parsed.weeklyIncome());
                earning.setSourceFilename(safeFilename(file.getOriginalFilename()));
                importedEarnings.save(earning);
                if (existing) {
                    updatedRows++;
                } else {
                    importedRows++;
                }
            }
        } catch (IOException ex) {
            return new ImportEarningsResponse(0, 0, List.of("Could not read the uploaded CSV file."));
        }
        return new ImportEarningsResponse(importedRows, updatedRows, errors);
    }

    private ParsedEarning parseEarning(List<String> columns, List<String> errors) {
        String rowSnippet = csvSnippet(columns);
        for (int i = 0; i < IMPORT_HEADERS.size(); i++) {
            if (columns.get(i).isBlank()) {
                errors.add("Row \"" + rowSnippet + "\": " + IMPORT_HEADERS.get(i) + " cannot be blank.");
            }
        }
        if (columns.stream().anyMatch(String::isBlank)) {
            return null;
        }

        LocalDate startDate = parseDate(rowSnippet, "Start Date", columns.get(0), errors);
        LocalDate endDate = parseDate(rowSnippet, "End Date", columns.get(1), errors);
        BigDecimal weeklyHours = parsePositiveDecimal(rowSnippet, "Weekly Hours", columns.get(2), MAX_WEEKLY_HOURS, errors);
        BigDecimal weeklyIncome = parsePositiveDecimal(rowSnippet, "Weekly Income", columns.get(3), MAX_WEEKLY_INCOME, errors);
        if (startDate == null || endDate == null || weeklyHours == null || weeklyIncome == null) {
            return null;
        }
        if (!endDate.isAfter(startDate)) {
            errors.add("Row \"" + rowSnippet + "\": End Date must be after Start Date.");
            return null;
        }
        if (startDate.getDayOfWeek() != DayOfWeek.MONDAY || endDate.getDayOfWeek() != DayOfWeek.SUNDAY) {
            errors.add("Row \"" + rowSnippet + "\": imported weeks must run Monday to Sunday.");
            return null;
        }
        if (!endDate.equals(startDate.plusDays(6))) {
            errors.add("Row \"" + rowSnippet + "\": End Date must be exactly 6 days after Start Date.");
            return null;
        }
        if (startDate.getYear() < MIN_IMPORT_YEAR) {
            errors.add("Row \"" + rowSnippet + "\": Start Date year must be " + MIN_IMPORT_YEAR + " or later.");
            return null;
        }
        if (endDate.isAfter(LocalDate.now(ANALYTICS_TIME_ZONE))) {
            errors.add("Row \"" + rowSnippet + "\": imported earning weeks cannot end in the future.");
            return null;
        }
        return new ParsedEarning(startDate, endDate, weeklyHours, weeklyIncome);
    }

    private LocalDate parseDate(String rowSnippet, String label, String value, List<String> errors) {
        try {
            return LocalDate.parse(value.trim(), IMPORT_DATE_FORMAT);
        } catch (DateTimeParseException ex) {
            errors.add("Row \"" + rowSnippet + "\": " + label + " must be a real date using dd/MM/yyyy.");
            return null;
        }
    }

    private BigDecimal parsePositiveDecimal(String rowSnippet, String label, String value, BigDecimal maximum, List<String> errors) {
        String trimmed = value.trim();
        if (!IMPORT_DECIMAL.matcher(trimmed).matches()) {
            errors.add("Row \"" + rowSnippet + "\": " + label + " must be a non-negative number with up to 2 decimal places.");
            return null;
        }
        try {
            BigDecimal decimal = new BigDecimal(trimmed);
            if (decimal.signum() < 0) {
                errors.add("Row \"" + rowSnippet + "\": " + label + " cannot be negative.");
                return null;
            }
            if (decimal.compareTo(maximum) > 0) {
                errors.add("Row \"" + rowSnippet + "\": " + label + " looks too high. Maximum allowed is " + maximum.toPlainString() + ".");
                return null;
            }
            return decimal.setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            errors.add("Row \"" + rowSnippet + "\": " + label + " must be a number.");
            return null;
        }
    }

    private String stripBom(String value) {
        return value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private String csvSnippet(List<String> values) {
        return csvSnippet(String.join(", ", values));
    }

    private String csvSnippet(String value) {
        String compact = value.replaceAll("\\s+", " ").trim();
        if (compact.length() <= 120) {
            return compact;
        }
        return compact.substring(0, 117) + "...";
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char value = line.charAt(i);
            if (value == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (value == ',' && !quoted) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(value);
            }
        }
        values.add(current.toString().trim());
        return values;
    }

    private String safeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        return Objects.requireNonNull(filename).replaceAll("[\\\\/]", "").trim();
    }

    private String csvValue(Object value) {
        String text = String.valueOf(value == null ? "" : value);
        if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    private boolean isPaidLesson(Lesson lesson) {
        return lesson.getPaymentStatus() == PaymentStatus.PAID;
    }

    private boolean isExpectedLesson(AnalyticsLesson lesson) {
        return lesson.status() != LessonStatus.CANCELLED || lesson.paymentStatus() == PaymentStatus.PAID;
    }

    private RevenueTotals revenueTotals(AnalyticsLesson lesson) {
        BigDecimal amount = lessonAmount(lesson);
        return lesson.paymentStatus() == PaymentStatus.PAID
                ? new RevenueTotals(amount, amount, BigDecimal.ZERO)
                : new RevenueTotals(amount, BigDecimal.ZERO, amount);
    }

    private String revenueKey(AnalyticsLesson lesson, RevenuePeriod period) {
        return revenueKey(lesson.lessonDate().atZone(ANALYTICS_TIME_ZONE).toLocalDate(), period);
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

    private BigDecimal lessonAmount(AnalyticsLesson lesson) {
        return lesson.hourlyRate()
                .multiply(BigDecimal.valueOf(lesson.durationMinutes()))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private List<Instant> occurrencesBetween(LessonSeries series, Instant windowStart, Instant windowEnd) {
        List<Instant> dates = new ArrayList<>();
        Set<Instant> excluded = new HashSet<>(series.getExcludedLessonDates() == null
                ? List.of()
                : series.getExcludedLessonDates());
        Instant current = series.getFirstLessonDate();
        int intervalWeeks = series.getIntervalCount() == null ? 1 : series.getIntervalCount();
        int index = 0;
        while (dates.size() < MAX_LAZY_OCCURRENCES_PER_SERIES) {
            if (series.getOccurrenceCount() != null && index >= series.getOccurrenceCount()) {
                break;
            }
            if (series.getRecurrenceUntil() != null && current.isAfter(series.getRecurrenceUntil())) {
                break;
            }
            if (current.isAfter(windowEnd)) {
                break;
            }
            if (!current.isBefore(windowStart) && !excluded.contains(current)) {
                dates.add(current);
            }
            current = current.plus(7L * intervalWeeks, java.time.temporal.ChronoUnit.DAYS);
            index++;
        }
        return dates;
    }

    private String occurrenceKey(LessonSeries series, Instant lessonDate) {
        return series.getId() + ":" + lessonDate;
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

    private record ImportedWeekKey(LocalDate startDate, LocalDate endDate) {
    }

    private record ParsedEarning(LocalDate startDate, LocalDate endDate, BigDecimal weeklyHours, BigDecimal weeklyIncome) {
    }

    private record AnalyticsLesson(
            Instant lessonDate,
            Integer durationMinutes,
            BigDecimal hourlyRate,
            LessonStatus status,
            PaymentStatus paymentStatus
    ) {
        private static AnalyticsLesson from(Lesson lesson) {
            return new AnalyticsLesson(
                    lesson.getLessonDate(),
                    lesson.getDurationMinutes(),
                    lesson.getHourlyRate(),
                    lesson.getStatus(),
                    lesson.getPaymentStatus()
            );
        }

        private static AnalyticsLesson from(LessonSeries series, Instant occurrenceDate) {
            return new AnalyticsLesson(
                    occurrenceDate,
                    series.getDurationMinutes(),
                    series.getHourlyRate(),
                    LessonStatus.SCHEDULED,
                    PaymentStatus.UNPAID
            );
        }
    }

    private static final class WeeklyEarningTotals {
        private final LocalDate weekStart;
        private BigDecimal lessonHours = BigDecimal.ZERO;
        private BigDecimal lessonIncome = BigDecimal.ZERO;
        private BigDecimal importedHours = BigDecimal.ZERO;
        private BigDecimal importedIncome = BigDecimal.ZERO;

        private WeeklyEarningTotals(LocalDate weekStart) {
            this.weekStart = weekStart;
        }

        private void addLessons(BigDecimal hours, BigDecimal income) {
            lessonHours = lessonHours.add(hours);
            lessonIncome = lessonIncome.add(income);
        }

        private void addImported(BigDecimal hours, BigDecimal income) {
            importedHours = importedHours.add(hours);
            importedIncome = importedIncome.add(income);
        }

        private BigDecimal importedHours() {
            return importedHours;
        }

        private BigDecimal importedIncome() {
            return importedIncome;
        }

        private WeeklyEarning toResponse() {
            return new WeeklyEarning(
                    weekStart,
                    weekStart.plusDays(6),
                    lessonHours.add(importedHours),
                    lessonIncome.add(importedIncome),
                    lessonHours,
                    lessonIncome,
                    importedHours,
                    importedIncome
            );
        }
    }
}
