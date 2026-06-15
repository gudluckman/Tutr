package com.tutr.api.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Converter
public class InstantListConverter implements AttributeConverter<List<Instant>, String> {
    @Override
    public String convertToDatabaseColumn(List<Instant> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "";
        }
        return String.join(",", attribute.stream().map(Instant::toString).toList());
    }

    @Override
    public List<Instant> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        return Arrays.stream(dbData.split(","))
                .filter(value -> value != null && !value.isBlank())
                .map(Instant::parse)
                .toList();
    }
}
