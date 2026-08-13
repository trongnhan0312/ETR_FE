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

/**
 * GET /api/Dashboard/my-dashboard — role-aware payload from the backend
 * (DashboardService). Every field is nullable and only the subset relevant to
 * the caller's role is populated. This helper normalizes whichever casing the
 * deployment returns (PascalCase vs camelCase) into one stable camelCase shape:
 *
 * - Admin/TrainingManager/Academic/ManagementViewer/Audit: overview, statusFunnel, actionItems
 * - Instructor: myClasses, lowAttendanceStudents
 * - QA: pendingVerificationEtrIds, actionItems
 * - Student: myEtrs
 */
export const fetchMyDashboard = async (options = {}) => {
  const data = await api.get('/Dashboard/my-dashboard', options).catch(() => null);
  if (!data || typeof data !== 'object') return null;

  const overview = pick(data, 'overview', 'Overview');
  const funnel = pick(data, 'statusFunnel', 'StatusFunnel');
  const actionItems = pick(data, 'actionItems', 'ActionItems');

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
  };
};