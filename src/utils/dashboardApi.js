import { api } from './api';

const pick = (src, ...keys) => {
  if (!src || typeof src !== 'object') return undefined;
  for (const k of keys) {
    if (src[k] !== undefined && src[k] !== null) return src[k];
  }
  return undefined;
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const idList = (v) =>
  Array.isArray(v) ? v.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [];

const list = (v) => (Array.isArray(v) ? v : []);

const str = (v, fallback = '') => (v === undefined || v === null ? fallback : String(v));

/**
 * GET /api/Dashboard/my-dashboard — role-aware payload from the backend
 * (DashboardService). Every field is nullable and only the subset relevant to
 * the caller's role is populated. This helper normalizes whichever casing the
 * deployment returns (PascalCase vs camelCase) into one stable camelCase shape:
 *
 * - Admin: overview, statusFunnel, actionItems, systemStats
 * - TrainingManager: overview, statusFunnel, actionItems, monthlyTrend
 * - Academic: overview, statusFunnel, actionItems, lowAttendanceStudents, expiringStudentsCount
 * - Audit: overview, statusFunnel, actionItems, lockedRecords, monthlyTrend,
 *   recentLockedEtrs, recentAuditLogs, recentExportJobs
 * - QA: pendingVerificationEtrIds, actionItems, evidenceSummary, reviewedToday, recentEvidenceFiles
 * - Instructor: myClasses (+attendanceRate/sessionCount), lowAttendanceStudents,
 *   todaySessions, pendingSignoffs
 * - Student: myEtrs, profile, certificateSummary
 */
export const fetchMyDashboard = async (options = {}) => {
  const data = await api.get('/Dashboard/my-dashboard', options).catch(() => null);
  if (!data || typeof data !== 'object') return null;

  const overview = pick(data, 'overview', 'Overview');
  const funnel = pick(data, 'statusFunnel', 'StatusFunnel');
  const actionItems = pick(data, 'actionItems', 'ActionItems');

  const systemStats = pick(data, 'systemStats', 'SystemStats');
  const monthlyTrend = pick(data, 'monthlyTrend', 'MonthlyTrend');
  const lockedRecords = pick(data, 'lockedRecords', 'LockedRecords');
  const evidenceSummary = pick(data, 'evidenceSummary', 'EvidenceSummary');
  const profile = pick(data, 'profile', 'Profile');
  const certificateSummary = pick(data, 'certificateSummary', 'CertificateSummary');

  return {
    role: pick(data, 'role', 'Role'),
    generatedAt: pick(data, 'generatedAt', 'GeneratedAt'),
    overview: overview
      ? {
          totalEtrs: num(pick(overview, 'totalEtrs', 'TotalEtrs')),
          completedCount: num(pick(overview, 'completedCount', 'CompletedCount')),
          completionRatePercent: num(pick(overview, 'completionRatePercent', 'CompletionRatePercent')),
          pendingApprovalCount: num(pick(overview, 'pendingApprovalCount', 'PendingApprovalCount')),
          rejectedCount: num(pick(overview, 'rejectedCount', 'RejectedCount')),
          returnedForCorrectionCount: num(pick(overview, 'returnedForCorrectionCount', 'ReturnedForCorrectionCount')),
          missingEvidenceCount: num(pick(overview, 'missingEvidenceCount', 'MissingEvidenceCount')),
        }
      : null,
    funnel: funnel
      ? {
          draft: num(pick(funnel, 'draft', 'Draft')),
          inProgress: num(pick(funnel, 'inProgress', 'InProgress')),
          submitted: num(pick(funnel, 'submitted', 'Submitted')),
          verified: num(pick(funnel, 'verified', 'Verified')),
          completed: num(pick(funnel, 'completed', 'Completed')),
          returnedForCorrection: num(pick(funnel, 'returnedForCorrection', 'ReturnedForCorrection')),
          cancelled: num(pick(funnel, 'cancelled', 'Cancelled')),
        }
      : null,
    actionItems: actionItems
      ? {
          pendingApprovalEtrIds: idList(pick(actionItems, 'pendingApprovalEtrIds', 'PendingApprovalEtrIds')),
          rejectedEtrIds: idList(pick(actionItems, 'rejectedEtrIds', 'RejectedEtrIds')),
          returnedForCorrectionEtrIds: idList(pick(actionItems, 'returnedForCorrectionEtrIds', 'ReturnedForCorrectionEtrIds')),
          missingEvidenceEtrIds: idList(pick(actionItems, 'missingEvidenceEtrIds', 'MissingEvidenceEtrIds')),
        }
      : null,
    myClasses: list(pick(data, 'myClasses', 'MyClasses')).map((c) => ({
      classId: c.classId ?? c.ClassId,
      classCode: c.classCode ?? c.ClassCode,
      className: c.className ?? c.ClassName,
      studentCount: num(c.studentCount ?? c.StudentCount),
      attendanceRate: num(c.attendanceRate ?? c.AttendanceRate),
      sessionCount: num(c.sessionCount ?? c.SessionCount),
    })),
    lowAttendanceStudents: list(pick(data, 'lowAttendanceStudents', 'LowAttendanceStudents')).map(
      (s) => ({
        accountId: s.accountId ?? s.AccountId,
        userCode: s.userCode ?? s.UserCode,
        fullName: s.fullName ?? s.FullName,
        classId: s.classId ?? s.ClassId,
        classCode: s.classCode ?? s.ClassCode,
        subjectId: s.subjectId ?? s.SubjectId,
        subjectCode: s.subjectCode ?? s.SubjectCode,
        attendanceRate: num(s.attendanceRate ?? s.AttendanceRate),
        thresholdPercent: num(s.thresholdPercent ?? s.ThresholdPercent),
      }),
    ),
    pendingVerificationEtrIds: idList(pick(data, 'pendingVerificationEtrIds', 'PendingVerificationEtrIds')),
    myEtrs: list(pick(data, 'myEtrs', 'MyEtrs')).map((e) => ({
      etrCourseRecordId: e.etrCourseRecordId ?? e.ETRCourseRecordId,
      status: e.status ?? e.Status,
      percentComplete: num(e.percentComplete ?? e.PercentComplete),
      expiryDate: e.expiryDate ?? e.ExpiryDate ?? null,
    })),

    // ── Admin ──
    systemStats: systemStats
      ? {
          totalUsers: num(pick(systemStats, 'totalUsers', 'TotalUsers')),
          totalLearners: num(pick(systemStats, 'totalLearners', 'TotalLearners')),
          totalInstructors: num(pick(systemStats, 'totalInstructors', 'TotalInstructors')),
          totalCourses: num(pick(systemStats, 'totalCourses', 'TotalCourses')),
          totalClasses: num(pick(systemStats, 'totalClasses', 'TotalClasses')),
          activeAccounts: num(pick(systemStats, 'activeAccounts', 'ActiveAccounts')),
          newUsersThisMonth: num(pick(systemStats, 'newUsersThisMonth', 'NewUsersThisMonth')),
        }
      : null,

    // ── TrainingManager / Audit ──
    monthlyTrend: monthlyTrend
      ? {
          months: list(pick(monthlyTrend, 'months', 'Months')).map((m) => str(m)),
          locked: list(pick(monthlyTrend, 'locked', 'Locked')).map((v) => num(v)),
          returned: list(pick(monthlyTrend, 'returned', 'Returned')).map((v) => num(v)),
        }
      : null,

    // ── Academic ──
    expiringStudentsCount: num(pick(data, 'expiringStudentsCount', 'ExpiringStudentsCount')),

    // ── Audit ──
    lockedRecords: lockedRecords
      ? {
          totalLocked: num(pick(lockedRecords, 'totalLocked', 'TotalLocked')),
          complianceRate: num(pick(lockedRecords, 'complianceRate', 'ComplianceRate')),
        }
      : null,
    recentLockedEtrs: list(pick(data, 'recentLockedEtrs', 'RecentLockedEtrs')).map((r) => ({
      etrCourseRecordId: r.etrCourseRecordId ?? r.ETRCourseRecordId,
      learnerName: str(r.learnerName ?? r.LearnerName, '—'),
      courseName: str(r.courseName ?? r.CourseName, '—'),
      approvedBy: r.approvedBy ?? r.ApprovedBy ?? null,
      completedAt: r.completedAt ?? r.CompletedAt ?? null,
    })),
    recentAuditLogs: list(pick(data, 'recentAuditLogs', 'RecentAuditLogs')).map((l) => ({
      id: l.auditLogId ?? l.AuditLogId,
      accountId: l.accountId ?? l.AccountId ?? null,
      etrRecordId: l.etrRecordId ?? l.ETRRecordId ?? null,
      actionType: str(l.actionType ?? l.ActionType, '—'),
      entityName: str(l.entityName ?? l.EntityName, '—'),
      recordId: l.recordId ?? l.RecordId ?? null,
      oldValue: l.oldValue ?? l.OldValue ?? null,
      newValue: l.newValue ?? l.NewValue ?? null,
      description: str(l.description ?? l.Description, ''),
      ipAddress: l.ipAddress ?? l.IPAddress ?? null,
      createdAt: l.createdAt ?? l.CreatedAt ?? null,
    })),
    recentExportJobs: list(pick(data, 'recentExportJobs', 'RecentExportJobs')).map((j) => ({
      id: j.exportJobId ?? j.ExportJobId,
      requestedByAccountId: j.requestedByAccountId ?? j.RequestedByAccountId ?? null,
      exportType: str(j.exportType ?? j.ExportType, '—'),
      fileName: str(j.fileName ?? j.FileName, '—'),
      filePath: j.filePath ?? j.FilePath ?? null,
      status: str(j.status ?? j.Status, '—'),
      requestedAt: j.requestedAt ?? j.RequestedAt ?? null,
      completedAt: j.completedAt ?? j.CompletedAt ?? null,
      etrCourseRecordId: j.etrCourseRecordId ?? j.ETRCourseRecordId ?? null,
    })),

    // ── QA ──
    evidenceSummary: evidenceSummary
      ? {
          total: num(pick(evidenceSummary, 'total', 'Total')),
          verified: num(pick(evidenceSummary, 'verified', 'Verified')),
          pending: num(pick(evidenceSummary, 'pending', 'Pending')),
          rejected: num(pick(evidenceSummary, 'rejected', 'Rejected')),
        }
      : null,
    reviewedToday: num(pick(data, 'reviewedToday', 'ReviewedToday')),
    recentEvidenceFiles: list(pick(data, 'recentEvidenceFiles', 'RecentEvidenceFiles')).map((f) => ({
      evidenceFileId: f.evidenceFileId ?? f.EvidenceFileId,
      fileName: str(f.fileName ?? f.FileName, 'File'),
      learnerName: str(f.learnerName ?? f.LearnerName, '—'),
      verificationStatus: str(f.verificationStatus ?? f.VerificationStatus, 'Pending'),
      uploadedAt: f.uploadedAt ?? f.UploadedAt ?? null,
    })),

    // ── Instructor ──
    todaySessions: list(pick(data, 'todaySessions', 'TodaySessions')).map((s) => ({
      sessionId: s.sessionId ?? s.SessionId,
      sessionTitle: str(s.sessionTitle ?? s.SessionTitle, '—'),
      classId: s.classId ?? s.ClassId,
      classCode: str(s.classCode ?? s.ClassCode, '—'),
      sessionDate: s.sessionDate ?? s.SessionDate ?? null,
      isConfirmed: Boolean(s.isConfirmed ?? s.IsConfirmed),
    })),
    pendingSignoffs: num(pick(data, 'pendingSignoffs', 'PendingSignoffs')),

    // ── Student ──
    profile: profile
      ? {
          fullName: str(pick(profile, 'fullName', 'FullName'), ''),
          username: str(pick(profile, 'username', 'Username'), ''),
          userCode: str(pick(profile, 'userCode', 'UserCode'), ''),
        }
      : null,
    certificateSummary: certificateSummary
      ? {
          total: num(pick(certificateSummary, 'total', 'Total')),
          valid: num(pick(certificateSummary, 'valid', 'Valid')),
          expiringSoon: num(pick(certificateSummary, 'expiringSoon', 'ExpiringSoon')),
          expired: num(pick(certificateSummary, 'expired', 'Expired')),
          recent: list(pick(certificateSummary, 'recent', 'Recent')).map((e) => ({
            etrCourseRecordId: e.etrCourseRecordId ?? e.ETRCourseRecordId,
            status: e.status ?? e.Status,
            percentComplete: num(e.percentComplete ?? e.PercentComplete),
            expiryDate: e.expiryDate ?? e.ExpiryDate ?? null,
          })),
        }
      : null,
  };
};
