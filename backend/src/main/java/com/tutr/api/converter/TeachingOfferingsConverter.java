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
public class TeachingOfferingsConverter implements AttributeConverter<List<TeachingOffering>, String> {
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final TypeReference<List<TeachingOffering>> OFFERINGS = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<TeachingOffering> offerings) {
        if (offerings == null || offerings.isEmpty()) {
            return null;
        }
        try {
            return mapper.writeValueAsString(offerings);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Could not save teaching offerings", ex);
        }
    }

    @Override
    public List<TeachingOffering> convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return mapper.readValue(value, OFFERINGS);
        } catch (Exception ex) {
            return List.of();
        }
    }
}
