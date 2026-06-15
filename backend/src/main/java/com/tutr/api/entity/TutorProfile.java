package com.tutr.api.entity;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

import com.tutr.api.entity.BaseEntity;
import com.tutr.api.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "tutor_profiles")
public class TutorProfile extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false, unique = true)
    private String slug;

    private String headline;
    private String bio;
    private String location;
    private String tutorYear;
    @Convert(converter = TeachingOfferingsConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<TeachingOffering> teachingOfferings = List.of();
    private boolean isOnline;
    private BigDecimal hourlyRateMin;
    private BigDecimal hourlyRateMax;
    private String university;
    private String degree;
    private String highSchool;
    private Integer highSchoolFinishedYear;
    private String atar;
    private String profileImageUrl;
    private boolean isPublic;
}
