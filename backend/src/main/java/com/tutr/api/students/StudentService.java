package com.tutr.api.students;

import com.tutr.api.users.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.tutr.api.students.StudentDtos.*;

@Service
@RequiredArgsConstructor
public class StudentService {
    private final StudentRepository students;

    public List<StudentResponse> list(User tutor) {
        return students.findByTutorOrderByCreatedAtDesc(tutor).stream().map(StudentResponse::from).toList();
    }

    public StudentResponse get(User tutor, UUID id) {
        return StudentResponse.from(studentFor(tutor, id));
    }

    @Transactional
    public StudentResponse create(User tutor, StudentRequest request) {
        Student student = new Student();
        student.setTutor(tutor);
        apply(student, request);
        return StudentResponse.from(students.save(student));
    }

    @Transactional
    public StudentResponse update(User tutor, UUID id, StudentRequest request) {
        Student student = studentFor(tutor, id);
        apply(student, request);
        return StudentResponse.from(student);
    }

    @Transactional
    public void delete(User tutor, UUID id) {
        students.delete(studentFor(tutor, id));
    }

    public Student studentFor(User tutor, UUID id) {
        return students.findByIdAndTutor(id, tutor).orElseThrow(() -> new EntityNotFoundException("Student not found"));
    }

    private void apply(Student student, StudentRequest request) {
        student.setName(request.name());
        student.setParentName(request.parentName());
        student.setParentEmail(request.parentEmail());
        student.setParentPhone(request.parentPhone());
        student.setSchoolYear(request.schoolYear());
        student.setSubject(request.subject());
        student.setHourlyRate(request.hourlyRate());
        student.setNotes(request.notes());
        student.setActive(request.active());
    }
}

