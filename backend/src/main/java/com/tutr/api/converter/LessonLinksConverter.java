package com.tutr.api.converter;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

@Converter
public class LessonLinksConverter implements AttributeConverter<List<LessonLink>, String> {
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final TypeReference<List<LessonLink>> LINKS = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<LessonLink> links) {
        if (links == null || links.isEmpty()) {
            return null;
        }
        try {
            return mapper.writeValueAsString(links);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Could not save lesson links", ex);
        }
    }

    @Override
    public List<LessonLink> convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return mapper.readValue(value, LINKS);
        } catch (Exception ex) {
            return List.of();
        }
    }
}
