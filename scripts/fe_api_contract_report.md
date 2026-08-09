# FE API CONTRACT TEST REPORT

- Date: 2026-08-09T11:21:36.154Z
- Base: `https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api`
- Mode: full (temp writes + cleanup)
- Probes: 60
- Result: {"FAIL":2,"OK":57,"SKIP":1}

## ❌ FAILURES / MISSING
| kind | probe | detail |
|---|---|---|
| FAIL | REF GET /ReportSummary | unable to load ref data → 404 |
| FAIL | READ GET /Reports/summary | summary → ENDPOINT MISSING  |

## ⚠️ WARN / SKIP
- SKIP `WRITE POST /Accounts`: no id from {"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status": status=400

## ✅ PASS
- `READ GET /Courses` list → 200
- `READ GET /Subjects` list → 200
- `READ GET /Classes` list → 200
- `READ GET /Sessions` list → 200
- `READ GET /Enrollments` list → 200
- `READ GET /Etr` list → 200
- `READ GET /Etr/my-etr` my-etr → 200
- `READ GET /Etr/student/6/history` student history → 200
- `READ GET /Etr/student/6/current-status` student status → 200
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
- `READ GET /Audit/6` audit detail → 200
- `WRITE POST /Subjects` create → 201
- `WRITE PUT /Subjects/{id}` update → 200
- `WRITE DELETE /Subjects/{id}` delete → 204
- `WRITE POST /Courses` create → 201
- `WRITE PUT /Courses/{id}` update → 200
- `WRITE POST /Classes (InProgress)` create → 201
- `WRITE PUT /Classes/{id} (Planned)` update → 200
- `WRITE PUT /Classes status "Active" → 400 (contract)` 
- `WRITE POST /Classes (Planned)` create → 201
- `WRITE POST /Sessions` create → 201
- `WRITE PUT /Sessions/{id}` update → 200
- `WRITE POST /Assessments (Theory)` create → 201
- `WRITE POST /Assessments type=Quiz → 400 (contract)` 
- `WRITE PUT /Assessments/{id}` update → 200
- `WRITE DELETE /Assessments/{id}` delete → 204
- `WRITE POST /PracticalChecklists` create → 201
- `WRITE PUT /PracticalChecklists/{id}` update → 200
- `WRITE PUT /Evidences/{id}/verify` verify → 404
- `WRITE POST /Exports/dashboard` export → 200
- `WRITE POST /Exports/pdf` export → 400
- `WRITE POST /Exports/training-package` export → 400
- `WRITE POST /Exports/attendance` export → 200
- `WRITE POST /Exports/assessment` export → 200
- `WRITE POST /Exports/class-summary` export → 200
- `WRITE POST /auth/change-password` change-pwd → 200
- `WRITE cleanup` removed temp entities
