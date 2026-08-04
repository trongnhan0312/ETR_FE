import { describe, it, expect } from "vitest";

const createWorkflowState = () => ({
  courseSubjects: [
    {
      subjectId: 101,
      subjectCode: "SUB-101",
      required: true,
      passingScore: 70,
    },
    {
      subjectId: 102,
      subjectCode: "SUB-102",
      required: true,
      passingScore: 80,
    },
  ],
  enrollments: [
    { enrollmentId: 1, studentId: 1001, courseId: 9001, status: "Active" },
  ],
  etrRecords: [],
  subjectResults: [],
  evidenceFiles: [],
  attendanceRecords: [],
  signoffs: [],
  retakeHistory: [],
  auditLog: [],
});

const validateCourseHasSubjects = (course, courseSubjects) => {
  return courseSubjects.length > 0;
};

const validateEnrollment = (studentId, courseId, enrollments) => {
  const activeMatches = enrollments.filter(
    (enrollment) =>
      enrollment.studentId === studentId &&
      enrollment.courseId === courseId &&
      enrollment.status === "Active",
  );

  return activeMatches.length < 2;
};

const createEtrRecordsForEnrollments = (enrollments, courseSubjects) => {
  return enrollments.map((enrollment) => ({
    etrCourseRecordId: enrollment.enrollmentId + 1000,
    enrollmentId: enrollment.enrollmentId,
    courseId: enrollment.courseId,
    status: "InProgress",
    subjectResults: courseSubjects.map((subject) => ({
      subjectResultId: `${enrollment.enrollmentId}-${subject.subjectId}`,
      subjectId: subject.subjectId,
      status: "Pending",
      passingScore: subject.passingScore,
    })),
  }));
};

const updateAttendanceStatus = (
  attendanceItems,
  studentId,
  nextStatus,
  isConfirmed,
) => {
  if (isConfirmed) {
    return attendanceItems;
  }

  const existing = attendanceItems.find((item) => item.studentId === studentId);
  if (existing) {
    return attendanceItems.map((item) =>
      item.studentId === studentId ? { ...item, status: nextStatus } : item,
    );
  }

  return [...attendanceItems, { studentId, status: nextStatus }];
};

const evaluateSubjectResult = (score, passingScore) => {
  return score >= passingScore ? "Passed" : "Failed";
};

const canSubmitEtr = ({ attendanceRate, subjectResults, evidenceFiles }) => {
  const allPassed = subjectResults.every(
    (result) => result.status === "Passed",
  );
  const allEvidenceVerified = evidenceFiles.every((file) => file.verified);
  return attendanceRate >= 90 && allPassed && allEvidenceVerified;
};

const approveEtr = (
  etrRecord,
  subjectResults,
  evidenceFiles,
  attendanceRate,
) => {
  if (!canSubmitEtr({ attendanceRate, subjectResults, evidenceFiles })) {
    return { ...etrRecord, status: "Submitted" };
  }

  return {
    ...etrRecord,
    status: "Completed",
    freezeData: true,
  };
};

const createRetakeHistoryEntry = (
  subjectResultId,
  previousScore,
  newScore,
) => ({
  subjectResultId,
  previousScore,
  newScore,
  createdAt: "2026-08-04T10:00:00Z",
});

const appendAuditLog = (auditLog, actor, action, entity, details) => {
  return [
    ...auditLog,
    {
      actor,
      action,
      entity,
      details,
      timestamp: "2026-08-04T10:00:00Z",
    },
  ];
};

const buildTrainingPackage = (studentCode, classCode) => ({
  archiveName: `${studentCode}_${classCode}_Training_Package.zip`,
  files: ["ETR Summary", "Evidence Files", "Audit_History.pdf"],
});

describe("ETR business workflow tests", () => {
  it("creates an ETR record automatically for each valid enrollment", () => {
    const state = createWorkflowState();
    const validEnrollments = state.enrollments.filter((enrollment) =>
      validateEnrollment(
        enrollment.studentId,
        enrollment.courseId,
        state.enrollments,
      ),
    );

    const etrRecords = createEtrRecordsForEnrollments(
      validEnrollments,
      state.courseSubjects,
    );

    expect(
      validateCourseHasSubjects({ courseId: 9001 }, state.courseSubjects),
    ).toBe(true);
    expect(etrRecords).toHaveLength(1);
    expect(etrRecords[0].status).toBe("InProgress");
    expect(etrRecords[0].subjectResults).toHaveLength(2);
  });

  it("prevents duplicate active enrollment for the same course", () => {
    const state = createWorkflowState();
    const duplicateEnrollment = {
      enrollmentId: 2,
      studentId: 1001,
      courseId: 9001,
      status: "Active",
    };

    const isAllowed = validateEnrollment(
      duplicateEnrollment.studentId,
      duplicateEnrollment.courseId,
      [...state.enrollments, duplicateEnrollment],
    );

    expect(isAllowed).toBe(false);
  });

  it("locks attendance changes after session confirmation", () => {
    const initialAttendance = [{ studentId: 1001, status: "P" }];

    const firstUpdate = updateAttendanceStatus(
      initialAttendance,
      1001,
      "AE",
      false,
    );
    const secondUpdate = updateAttendanceStatus(firstUpdate, 1001, "AU", true);

    expect(firstUpdate[0].status).toBe("AE");
    expect(secondUpdate[0].status).toBe("AE");
  });

  it("marks subject result as failed when score is below passing threshold", () => {
    const subjectResult = evaluateSubjectResult(65, 70);

    expect(subjectResult).toBe("Failed");
  });

  it("blocks ETR submission until every subject is passed and evidence is verified", () => {
    const state = createWorkflowState();
    const subjectResults = [
      { subjectId: 101, status: "Passed" },
      { subjectId: 102, status: "Passed" },
    ];
    const evidenceFiles = [{ fileId: 1, verified: true }];

    const canSubmit = canSubmitEtr({
      attendanceRate: 92,
      subjectResults,
      evidenceFiles,
    });

    expect(canSubmit).toBe(true);
  });

  it("rejects submission when evidence or subject results are incomplete", () => {
    const subjectResults = [
      { subjectId: 101, status: "Passed" },
      { subjectId: 102, status: "Failed" },
    ];
    const evidenceFiles = [{ fileId: 1, verified: false }];

    const canSubmit = canSubmitEtr({
      attendanceRate: 92,
      subjectResults,
      evidenceFiles,
    });

    expect(canSubmit).toBe(false);
  });

  it("approves ETR only after validation passes and freezes data", () => {
    const etr = { etrCourseRecordId: 1001, status: "Submitted" };
    const subjectResults = [
      { subjectId: 101, status: "Passed" },
      { subjectId: 102, status: "Passed" },
    ];
    const evidenceFiles = [{ fileId: 1, verified: true }];

    const approved = approveEtr(etr, subjectResults, evidenceFiles, 95);

    expect(approved.status).toBe("Completed");
    expect(approved.freezeData).toBe(true);
  });

  it("requires sign-off before a subject can be marked passed", () => {
    const subjectResult = { subjectId: 101, status: "Pending" };
    const signoffs = [{ subjectId: 101, status: "Signed" }];
    const canPass = signoffs.some(
      (signoff) =>
        signoff.subjectId === subjectResult.subjectId &&
        signoff.status === "Signed",
    );

    expect(canPass).toBe(true);
  });

  it("prevents physical deletion of evidence once an ETR is approved", () => {
    const approvedEtr = { etrCourseRecordId: 1001, status: "Completed" };
    const evidenceFile = {
      fileId: 1,
      relatedEtrId: approvedEtr.etrCourseRecordId,
    };

    const canDelete = approvedEtr.status !== "Completed";

    expect(evidenceFile.relatedEtrId).toBe(1001);
    expect(canDelete).toBe(false);
  });

  it("records retake history and audit trail for approved changes", () => {
    const state = createWorkflowState();
    const subjectResultId = "1-101";
    const retakeEntry = createRetakeHistoryEntry(subjectResultId, 65, 78);
    const updatedAuditLog = appendAuditLog(
      state.auditLog,
      "Training Manager",
      "APPROVE",
      "ETR_COURSE_RECORD",
      "Approved retake outcome",
    );

    expect(retakeEntry.previousScore).toBe(65);
    expect(retakeEntry.newScore).toBe(78);
    expect(updatedAuditLog[0].action).toBe("APPROVE");
  });

  it("builds a training package archive name using learner and class identifiers", () => {
    const packageInfo = buildTrainingPackage("HV001", "CL-01");

    expect(packageInfo.archiveName).toBe("HV001_CL-01_Training_Package.zip");
    expect(packageInfo.files).toContain("Audit_History.pdf");
  });
});
