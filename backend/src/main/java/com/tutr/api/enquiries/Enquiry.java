package com.tutr.api.enquiries;

import com.tutr.api.common.BaseEntity;
import com.tutr.api.tutors.TutorProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "enquiries")
public class Enquiry extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_profile_id", nullable = false)
    private TutorProfile tutorProfile;

    @Column(nullable = false)
    private String parentName;

    @Column(nullable = false)
    private String parentEmail;

    private String parentPhone;
    private String studentYear;
    private String subject;
    private String message;
    private String preferredLocation;

    @Enumerated(EnumType.STRING)
    private PreferredMode preferredMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnquiryStatus status = EnquiryStatus.NEW;
}

