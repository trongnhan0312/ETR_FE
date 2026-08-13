# FE API CONTRACT TEST REPORT

- Date: 2026-08-13T12:07:21.386Z
- Base: `https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api`
- Mode: read-only (no writes)
- Probes: 71
- Result: {"FAIL":2,"OK":69}

## ❌ FAILURES / MISSING
| kind | probe | detail |
|---|---|---|
| FAIL | REF GET /ReportSummary | unable to load ref data → 404 |
| FAIL | READ GET /Reports/summary | summary → ENDPOINT MISSING  |

## ✅ PASS
- `READ GET /Courses` list → 200
- `READ GET /Subjects` list → 200
- `READ GET /Classes` list → 200
- `READ GET /Sessions` list → 200
- `READ GET /Enrollments` list → 200
- `READ GET /Etr` list → 200
- `READ GET /Etr/my-etr` my-etr → 200
- `READ GET /Etr/student/5/history` student history → 200
- `READ GET /Etr/student/5/current-status` student status → 200
- `READ GET /Evidences` list → 200
- `READ GET /EvidenceTypes` list → 200
- `READ GET /AssessmentResults` list → 200
- `READ GET /Assessments` list → 200
- `READ GET /PracticalChecklists` list → 200
- `READ GET /PracticalChecklistResults` list → 200
- `READ GET /Attendance` list → 200
- `READ GET /Approvals` list → 200
- `READ GET /Accounts` list → 200
- `READ GET /UserProfiles` list → 200
- `READ GET /UserProfiles/learners` list → 200
- `READ GET /UserProfiles/me` me → 200
- `READ GET /auth/me` me → 200
- `READ GET /Dashboard/stats` stats → 200
- `READ GET /RetakeHistory?page=1&pageSize=100` retake → 200
- `READ GET /Departments` list → 200
- `READ GET /Audit?page=1&pageSize=100` page → 200
- `READ GET /Courses/1` course detail → 200
- `READ GET /Classes/1` class detail → 200
- `READ GET /Sessions/1` session detail → 200
- `READ GET /Etr/1` etr detail → 200
- `READ GET /Audit/27` audit detail → 200
- `READ GET /Dashboard/my-dashboard (admin)` role dashboard → 200
- `my-dashboard.overview (admin)` populated
- `my-dashboard.statusFunnel (admin)` populated
- `my-dashboard.actionItems (admin)` populated
- `READ GET /Dashboard/my-dashboard (manager)` role dashboard → 200
- `my-dashboard.overview (manager)` populated
- `my-dashboard.statusFunnel (manager)` populated
- `my-dashboard.actionItems (manager)` populated
- `READ GET /Dashboard/my-dashboard (academic)` role dashboard → 200
- `my-dashboard.overview (academic)` populated
- `my-dashboard.statusFunnel (academic)` populated
- `my-dashboard.actionItems (academic)` populated
- `READ GET /Dashboard/my-dashboard (audit)` role dashboard → 200
- `my-dashboard.overview (audit)` populated
- `my-dashboard.statusFunnel (audit)` populated
- `my-dashboard.actionItems (audit)` populated
- `READ GET /Dashboard/my-dashboard (instructor)` role dashboard → 200
- `my-dashboard.myClasses (instructor)` populated
- `my-dashboard.lowAttendanceStudents (instructor)` populated
- `READ GET /Dashboard/my-dashboard (qa)` role dashboard → 200
- `my-dashboard.pendingVerificationEtrIds (qa)` populated
- `my-dashboard.actionItems (qa)` populated
- `READ GET /Dashboard/my-dashboard (student)` role dashboard → 200
- `my-dashboard.myEtrs (student)` populated
- `RBAC GET /Dashboard/stats (admin)` allowed → 200
- `RBAC GET /Dashboard/stats (manager)` allowed → 200
- `RBAC GET /Dashboard/stats (academic)` allowed → 200
- `RBAC GET /Dashboard/stats (audit)` allowed → 200
- `RBAC GET /Dashboard/stats (instructor)` 403 as expected (role-locked)
- `RBAC GET /Dashboard/stats (qa)` 403 as expected (role-locked)
- `RBAC GET /Dashboard/stats (student)` 403 as expected (role-locked)
- `RBAC GET /Dashboard/action-items (admin)` allowed → 200
- `RBAC GET /Dashboard/action-items (manager)` allowed → 200
- `RBAC GET /Dashboard/action-items (academic)` allowed → 200
- `RBAC GET /Dashboard/action-items (audit)` allowed → 200
- `RBAC GET /Dashboard/action-items (instructor)` 403 as expected (role-locked)
- `RBAC GET /Dashboard/action-items (qa)` 403 as expected (role-locked)
- `RBAC GET /Dashboard/action-items (student)` 403 as expected (role-locked)
