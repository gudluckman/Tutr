package com.tutr.api.tutors;

import com.tutr.api.common.BaseEntity;
import com.tutr.api.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

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
    private boolean isOnline;
    private BigDecimal hourlyRateMin;
    private BigDecimal hourlyRateMax;
    private String university;
    private String degree;
    private String atar;
    private String profileImageUrl;
    private boolean isPublic;
}

