package com.tutr.api.students;

import com.tutr.api.common.BaseEntity;
import com.tutr.api.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "students")
public class Student extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @Column(nullable = false)
    private String name;

    private String parentName;
    private String parentEmail;
    private String parentPhone;
    private String schoolYear;
    private String subject;
    private BigDecimal hourlyRate;
    private String notes;
    private boolean active = true;
}

