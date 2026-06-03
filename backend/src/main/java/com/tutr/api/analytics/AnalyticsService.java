package com.tutr.api.analytics;

import com.tutr.api.lessons.Lesson;
import com.tutr.api.lessons.LessonRepository;
import com.tutr.api.lessons.LessonStatus;
import com.tutr.api.lessons.PaymentStatus;
import com.tutr.api.users.User;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.tutr.api.analytics.AnalyticsDtos.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private static final ZoneId ANALYTICS_TIME_ZONE = ZoneId.of("Australia/Sydney");
    private static final DateTimeFormatter IMPORT_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final List<String> IMPORT_HEADERS = List.of("Start Date", "End Date", "Weekly Hours", "Weekly Income");

    private final LessonRepository lessons;
    private final ImportedEarningRepository importedEarnings;

    public AnalyticsSummary summary(User tutor, RevenuePeriod period) {
        List<Lesson> all = lessons.findByTutorOrderByLessonDateDesc(tutor);
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
        List<WeeklyEarning> allWeeks = weeklyEarnings(tutor);
        BigDecimal combinedTotalEarnings = allWeeks.stream()
                .map(WeeklyEarning::income)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal combinedTotalHours = allWeeks.stream()
                .map(WeeklyEarning::hours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal combinedAverageHourlyRate = combinedTotalHours.signum() == 0
                ? BigDecimal.ZERO
                : combinedTotalEarnings.divide(combinedTotalHours, 2, RoundingMode.HALF_UP);

        int totalPages = allWeeks.isEmpty() ? 0 : (allWeeks.size() + pageSize - 1) / pageSize;
        int page = totalPages == 0 ? 0 : Math.max(0, Math.min(requestedPage, totalPages - 1));
        int fromIndex = Math.min(page * pageSize, allWeeks.size());
        int toIndex = Math.min(fromIndex + pageSize, allWeeks.size());
        return new EarningsResponse(
                combinedTotalEarnings,
                combinedTotalHours,
                combinedAverageHourlyRate,
                allWeeks.subList(fromIndex, toIndex),
                page,
                pageSize,
                totalPages,
                allWeeks.size()
        );
    }

    public String exportEarningsCsv(User tutor) {
        List<WeeklyEarning> weeks = weeklyEarnings(tutor);
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
    public ImportEarningsResponse importEarnings(User tutor, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return new ImportEarningsResponse(0, 0, List.of("Choose a CSV file to import."));
        }

        List<String> errors = new ArrayList<>();
        int importedRows = 0;
        int updatedRows = 0;
        Map<ImportedWeekKey, ParsedEarning> parsedRows = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null || !IMPORT_HEADERS.equals(parseCsvLine(header).stream().map(String::trim).toList())) {
                return new ImportEarningsResponse(0, 0, List.of("CSV headers must be: " + String.join(", ", IMPORT_HEADERS)));
            }

            String line;
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) {
                    continue;
                }
                List<String> columns = parseCsvLine(line);
                if (columns.size() != IMPORT_HEADERS.size()) {
                    errors.add("Line " + lineNumber + ": expected 4 columns.");
                    continue;
                }
                ParsedEarning parsed = parseEarning(lineNumber, columns, errors);
                if (parsed == null) {
                    continue;
                }
                ImportedWeekKey key = new ImportedWeekKey(parsed.startDate(), parsed.endDate());
                if (parsedRows.containsKey(key)) {
                    errors.add("Line " + lineNumber + ": duplicate week range was merged with an earlier row.");
                }
                parsedRows.merge(key, parsed, ParsedEarning::add);
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

    private ParsedEarning parseEarning(int lineNumber, List<String> columns, List<String> errors) {
        LocalDate startDate = parseDate(lineNumber, "Start Date", columns.get(0), errors);
        LocalDate endDate = parseDate(lineNumber, "End Date", columns.get(1), errors);
        BigDecimal weeklyHours = parsePositiveDecimal(lineNumber, "Weekly Hours", columns.get(2), errors);
        BigDecimal weeklyIncome = parsePositiveDecimal(lineNumber, "Weekly Income", columns.get(3), errors);
        if (startDate == null || endDate == null || weeklyHours == null || weeklyIncome == null) {
            return null;
        }
        if (endDate.isBefore(startDate)) {
            errors.add("Line " + lineNumber + ": End Date must be on or after Start Date.");
            return null;
        }
        return new ParsedEarning(startDate, endDate, weeklyHours, weeklyIncome);
    }

    private LocalDate parseDate(int lineNumber, String label, String value, List<String> errors) {
        try {
            return LocalDate.parse(value.trim(), IMPORT_DATE_FORMAT);
        } catch (DateTimeParseException ex) {
            errors.add("Line " + lineNumber + ": " + label + " must use dd/MM/yyyy.");
            return null;
        }
    }

    private BigDecimal parsePositiveDecimal(int lineNumber, String label, String value, List<String> errors) {
        try {
            BigDecimal decimal = new BigDecimal(value.trim());
            if (decimal.signum() < 0) {
                errors.add("Line " + lineNumber + ": " + label + " cannot be negative.");
                return null;
            }
            return decimal.setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            errors.add("Line " + lineNumber + ": " + label + " must be a number.");
            return null;
        }
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

    private record ImportedWeekKey(LocalDate startDate, LocalDate endDate) {
    }

    private record ParsedEarning(LocalDate startDate, LocalDate endDate, BigDecimal weeklyHours, BigDecimal weeklyIncome) {
        private ParsedEarning add(ParsedEarning other) {
            return new ParsedEarning(
                    startDate,
                    endDate,
                    weeklyHours.add(other.weeklyHours),
                    weeklyIncome.add(other.weeklyIncome)
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
