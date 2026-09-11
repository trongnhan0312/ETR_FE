# ETR — Use Case Specification per Actor

Product: AeroMetric Aviation Systems — ETR Platform · Version 1.0

## Actor Overview

| Actor | Type | Portal | Goal summary |
| --- | --- | --- | --- |
| Academic Staff | Primary | `/academic` | Owns the training structure and pushes ETRs into verification |
| Instructor | Primary | `/instructor` | Runs classes: attendance, scores, evidence |
| QA Staff | Primary | `/qa` | Quality gate: verifies evidence and ETRs |
| Training Manager | Primary | `/trainingmanager` | Final authority: signs off / locks ETRs |
| Admin | Primary | `/admin` (+ TM portal) | System administration; exceptional reopen |
| Student (Learner) | Primary | `/student` | Read-only self-service on own records |
| Auditor | Primary | `/auditor` | Independent read-only compliance oversight |
| Cloudinary | Secondary (system) | external | Stores evidence files |
| Email Service | Secondary (system) | external | Delivers account/expiry notifications |
| Scheduler | Secondary (system) | backend job | Fires certificate-expiry checks (3d/7d/1mo) |

Notation: `«include»` = always executed as part of the base UC · `«extend»` = optional branch.

---

## 1. Academic Staff

### UC01 — Authenticate (shared by all human actors) «abstract»
**Actor:** any · **Precondition:** valid account exists
**Main flow:** 1) Open login page → 2) enter username/password → 3) submit → 4) system validates against API → 5) token stored → 6) redirect to role portal.
**Extensions:** 2a. invalid credentials → error shown, stay on page · 3a. timeout/unreachable → connection error · 5a. token expired later → auto sign-out (see UC54).

### UC02 — Manage learner records
**Actor:** Academic Staff
**Main flow:** 1) Open Learners → 2) search/filter → 3) create or edit learner → 4) save.
**Extensions:** 3a. duplicate name/code/email → friendly business-error shown (BR-116) · 4a. view profile → navigates to dossier with classes + ETR/certificate history.
**«include»** UC53 (CRUD feedback toast).

### UC03 — Define course structure
**Actor:** Academic Staff
**Main flow:** create/edit courses; attach subjects (each subject once per course); set passing scores, hours.
**Extensions:** duplicate course code rejected (BR-024) · re-assigning an existing subject blocked (BR-025) · changing ValidityMonths bumps course version (BR-026).
**«include»** UC53.

### UC04 — Open a class and enroll learners
**Actor:** Academic Staff
**Main flow:** 1) Courses & Classes → 2) create class (code, name, course, dates, capacity) → 3) save → 4) enroll learner(s) → 5) system auto-generates ETR per enrollment (BR-015).
**Extensions:** duplicate class code blocked at FE pre-check and BE (BR-020) · blank dates defaulted today/+30 (BR-027) · enrollment blocked if learner has ongoing ETR for that course (BR-012), incomplete profile (BR-010), course without subjects (BR-013) · deleting an enrollment whose ETR is locked refused (BR-014).

### UC05 — Assign instructor to class-subject
**Actor:** Academic Staff
**Main flow:** edit class → pick instructor per subject → save (BR-022/023).

### UC06 — Manage ETR evidence (Academic side)
**Actor:** Academic Staff
**Main flow:** open ETR Management → Evidence sub-view → filter/preview/download/upload/delete pending files.
**Extensions:** upload follows UC-E-01 (Cloudinary flow) · verified files cannot be deleted (BR-074) · no `/Evidences` read permission → warning banner instead of silent failure.

### UC07 — Submit ETR to QA
**Actor:** Academic Staff
**Precondition:** 4-step checklist green (attendance ≥80% everywhere BR-081; all subjects signed-off BR-082; all evidence Verified BR-083; mandatory subjects Passed/Exempted BR-084).
**Main flow:** 1) select record → 2) SUBMIT ETR enabled → 3) confirm → 4) status → Submitted; new ApprovalRequest created (BR-101).
**Extensions:** checklist incomplete → button disabled with tooltip ("Chưa thể gửi ETR") · resubmission after return creates a fresh request.

### UC08 — Track expiring certificates
**Actor:** Academic Staff
**Main flow:** open Expiring Students → review list of learners whose certificates expire within window → contact/plan retake.

### UC09 — View academic dashboard
**Actor:** Academic Staff — KPIs, funnel chart, low-attendance watchlist (live data only, RULE-5).

---

## 2. Instructor

### UC10 — Review teaching schedule and classes
**Actor:** Instructor — dashboard shows today's sessions, class cards, roster sizes; empty state when unassigned.

### UC11 — Mark attendance
**Actor:** Instructor
**Precondition:** session not confirmed (BR-051) and within 48h grace window (BR-050).
**Main flow:** 1) Attendance → select class/session → 2) toggle Present/Absent per learner → 3) Save.
**Extensions:** past grace period → BE rejects, instructs to contact Academic Staff · duplicate record attempt rejected (BR-052) · non-enrolled student impossible (BR-053) · Excel import variant with partial-skip warning.

### UC12 — Finalize attendance session («chốt»)
**Actor:** Instructor
**Main flow:** confirm publish → session locks permanently (BR-051).
**Extensions:** already-confirmed sessions reject further marking/deletion.

### UC13 — Record assessment scores
**Actor:** Instructor
**Main flow:** Assessments → choose subject → enter scores → save.
**Extensions:** graded against PassingScoreSnapshot (BR-030) · some learners fail → partial warning naming them · >3rd attempt rejected (BR-040/BR-002) · learner not in course-class rejected (BR-042).

### UC14 — Sign off scores («chốt điểm»)
**Actor:** Instructor
**Precondition:** results entered; requirements met.
**Main flow:** sign off subject → `isPublished = true`; results become immutable (BR-033).
**Extensions:** requirements unmet → blocking warning explains why.

### UC15 — Request score unlock / amendment
**Actor:** Instructor
**Main flow:** locked result needs change → request unlock/amendment **with mandatory reason** → routed to Training Manager (UC31) (BR-061/065).
**Extensions:** unsigned result → told to edit directly (BR-062) · ETR already Completed → told to use Admin Reopen path · duplicate pending amendment blocked (BR-063).

### UC16 — Upload learner evidence
**Actor:** Instructor — same flow as UC-E-01; must select class + learner + type; learner accountId taken from enrollment (never the instructor's).

### UC17 — Remove superseded evidence
**Actor:** Instructor — delete allowed only while Pending/Rejected (BR-074); rejection reason displayed to guide re-upload.

---

## 3. QA Staff

### UC18 — Verify individual evidence
**Actor:** QA Staff
**Main flow:** 1) Verify Evidence queue → 2) Review opens full-screen modal (preview + metadata) → 3) click Verify.
**Postcondition:** evidence `Verified`; immutable thereafter (BR-074).

### UC19 — Reject evidence with reason
**Actor:** QA Staff
**Main flow:** Reject → PromptModal demands reason → submit.
**Postcondition:** status `Rejected`; uploader sees comment (BR-076).
**Extensions:** empty reason blocks submission · evidence on locked ETR hidden from action ("🔒 ETR Locked", BR-075).

### UC20 — Work the ETR review queue
**Actor:** QA Staff — lists all Submitted ETRs; selecting reveals actions (details / verify / return); refresh supported.

### UC21 — Inspect full ETR sheet
**Actor:** QA Staff — 4-step checklist, per-subject breakdown, published flags, evidence states, approval history.

### UC22 — Verify ETR
**Actor:** QA Staff
**Precondition:** ETR in `Submitted` (BR-100).
**Main flow:** confirm Verify → status `Verified`; moves to Training Manager queue.

### UC23 — Return ETR for correction
**Actor:** QA Staff
**Main flow:** Return → pick common-reason chip or type custom reason → Send Back (comment mandatory, BR-102).
**Postcondition:** status `ReturnedForCorrection`; returns to training team; resubmission creates new ApprovalRequest (RULE-4).

### UC24 — Search records & export
**Actor:** QA Staff — advanced filters; PDF/CSV export.

### UC25 — Consult audit trail / retake history
**Actor:** QA Staff — append-only logs (RULE-3); retake history per learner/subject.

---

## 4. Training Manager

### UC26 — Monitor approval analytics
**Actor:** Training Manager — funnel/KPIs/submission-progress from live endpoint only (RULE-5); graceful zero-state on failure.

### UC27 — Review final-approval registry
**Actor:** Training Manager — tabs Pending/Approved/Returned with live counts; metric row (avg processing time etc.).

### UC28 — Inspect ETR before signing
**Actor:** Training Manager — HISTORY modal: trainee info, assessment scores, QA log (QA STAMPED), return/approved logs; transcript view with timeline + verified documents.

### UC29 — Give final approval (sign off)
**Actor:** Training Manager
**Precondition:** ETR `Verified`.
**Main flow:** 1) APPROVE ETR → 2) Sign Off & Approve confirmation → 3) `POST /Approvals/{id}/process?action=Approve`.
**Postcondition:** ETR Completed + locked (BR-103); certificate stamped; audit logged.
**Extensions:** failure → "Phê duyệt thất bại" toast, state unchanged.

### UC30 — Monitor class status
**Actor:** Training Manager — class progress board; create class (shares BR-020 duplicates rules).

### UC31 — Adjudicate score-unlock / amendment requests
**Actor:** Training Manager
**Main flow:** open request → review instructor reason → approve (result editable again) or reject with mandatory comment (BR-064).
**Extensions:** decided requests are terminal (BR-064).

### UC32 — Watch expiring certificates
**Actor:** Training Manager — expiring-students report (shared screen with Academic).

---

## 5. Admin

### UC33 — Manage user accounts
**Actor:** Admin — create/edit users, assign roles/departments; duplicate username/email surfaces friendly error (BR-110/116); creation triggers welcome email that never fails the account (BR-113).
**Extensions:** soft delete → hard delete ladder; status Active/Inactive toggles.

### UC34 — Protect own account
**Actor:** Admin — attempts to disable/delete self blocked with explicit message (BR-111).

### UC35 — Manage departments
**Actor:** Admin — CRUD; names reusable after soft-delete; duplicates get friendly errors.

### UC36 — Audit log review
**Actor:** Admin — global trail: actor, action, entity, old→new, timestamp.

### UC37 — System configuration
**Actor:** Admin — pass scores, validity days, thresholds; changes apply platform-wide (respecting snapshot rules BR-030/026 for enrolled learners).

### UC38 — Reopen completed ETR
**Actor:** Admin (exclusively, BR-104)
**Main flow:** TM portal → Approved tab → REOPEN → mandatory reason (PromptModal) → confirm.
**Postcondition:** ETR back to in-progress; reason recorded in audit trail.
**Extensions:** non-admin sees no REOPEN control (RULE-11) · unlocked record rejected ("ETR is not locked").

### UC39 — Act as Training Manager
**Actor:** Admin — full TM portal access incl. UC29 approvals.

---

## 6. Student (Learner) — read-only portal

### UC40 — View personal progress dashboard
**Actor:** Student — enrolled classes, ETR status donut, recent records, certificate summary (live data only).

### UC41 — List my ETRs
**Actor:** Student — statuses (Đang đào tạo/Đã nộp/Đã thẩm định/Hoàn thành/Trả lại); search filter.

### UC42 — Open ETR detail
**Actor:** Student — issue/expiry dates, subject results table (LT/TH/attendance/PASS-FAIL), carry-over badges (`GIỮ NGUYÊN` vs `CẦN HỌC LẠI`, RTK-02), evidence chips, audit trail.
**Extensions:** legacy payload without flag → badges omitted gracefully.

### UC43 — View training-history timeline
**Actor:** Student — chronological ETR chain linked by PreviousRecordId (BR-122); newest completed labelled current certificate.

### UC44 — Check certificate validity
**Actor:** Student — Valid/ExpiringSoon/Expired tabs; expiry emails arrive via Scheduler+Email service (BR-121).

### UC45 — Maintain profile & password
**Actor:** Student — edit profile; change password with client-side validation (mismatch/short blocked).

---

## 7. Auditor — independent read-only oversight

### UC46 — View compliance dashboard
**Actor:** Auditor — locked-record counts, compliance rate, recent events (live data only).

### UC47 — Browse locked-ETR repository
**Actor:** Auditor — only `IsLocked = true` records; text search + department chips; pagination (BR-130).

### UC48 — Run advanced compliance search
**Actor:** Auditor — multi-parameter query + reset.

### UC49 — Inspect six-tab ETR dossier
**Actor:** Auditor — Learner Info / Attendance / Assessment Results / Evidence (SHA-256 VERIFIED MATCH) / Approval History (hashed timeline) / Audit Trail; Export Dossier PDF.

### UC50 — Verify approval chain
**Actor:** Auditor — 5-step banner Academic → QA → Training Manager → System Locked → Audited with signatures/timestamps.

### UC51 — Inspect audit logs
**Actor:** Auditor — module chips; FORBIDDEN attempts highlighted (BR-132).

### UC52 — Generate export packages
**Actor:** Auditor
**Main flow:** choose type (PDF dossier / Evidence ZIP / CAA-EASA package / signature manifest `.p7b`) → generate → download from history.
**Extensions:** ZIP fetches evidence from Cloudinary; missing files skipped with warnings, never failing the export (BR-077).

---

## Cross-cutting Use Cases (X)

### UC53 — Receive CRUD outcome feedback «include from all mutating UCs»
Every successful create/update/delete announces exactly `"name" has added/updated/deleted <entity>` (EN) / `"tên" đã thêm/cập nhật/xóa <entity>` (VI); failures surface the backend's verbatim friendly message — never generic "thất bại" (RULE-14/15).

### UC54 — Session lifecycle «include from UC01»
Token checked every 5s/on focus; expiry or 401 clears credentials → `/login`; role-scoped routing redirects unauthorized navigation to own portal (RULE-12/13).

### UC55 — Switch language
Any human actor toggles VN↔EN instantly; preference persists across sessions (RULE-17).

### UC56 — Review personal activity feed
Bell dropdown lists last ≤50 write operations per account (method, endpoint, status, time) (RULE-19).

---

## System-Actor Flows

### UC57 — Certificate-expiry sweep
**Primary actor:** Scheduler · **Support:** Email Service
Daily scan → for each certificate hitting 3-day/7-day/1-month thresholds → send notification email to the learner (BR-121). Failures isolated per email.

### UC58 — Store evidence file
**Primary actor:** Instructor/Academic · **Support:** Cloudinary
FE uploads bytes directly to Cloudinary (unsigned preset) → receives secure_url/public_id → posts JSON metadata to backend (RULE-7/8/9). Backend never touches bytes.

### UC59 — Package compliance export
**Primary actor:** Auditor · **Support:** Cloudinary
Backend builds requested package, streaming evidence from Cloudinary URLs into the artifact; missing sources skipped-with-warning (BR-077).

---

## Traceability

- Each UC maps to stories in `docs/USER_STORIES.md` (epics 01–11) and rules in `docs/BUSINESS_RULES.md` (BR-xxx cited inline).
- Automated tests cover UC26 dashboards loading (`DashboardsData.test.jsx`) and UC16 evidence contract + UC42 badges (`CloudinaryEvidence.test.jsx`).

