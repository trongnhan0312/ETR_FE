# ETR — Aviation Training Record Management System

**User Stories & Acceptance Criteria**

Product: AeroMetric Aviation Systems — ETR (Electronic Training Record) Platform
Version: 1.1 · Format: Epic → User Story → Scenario-style Acceptance Criteria (Given/When/Then)
Invariants live in the dedicated **[Rules & Constraints](#rules--constraints-invariants)** section (RULE-xx) and are referenced from stories as `(→ RULE-nn)`.

---

## Epic Overview

| Epic | Role | Scope |
| --- | --- | --- |
| EPIC-01 Authentication & Session | All roles | Login, forgot password, role-based redirect, session expiry |
| EPIC-02 Learner & Course Management | Academic | Learners, courses, classes, subjects, enrollments |
| EPIC-03 Instructor Operations | Instructor | Classes, attendance, assessments, score sign-off |
| EPIC-04 Evidence Collection (Cloudinary) | Instructor / Academic | Upload, delete, download evidence |
| EPIC-05 QA Verification | QA | Evidence verification, ETR review queue, return for correction |
| EPIC-06 Final Approval & Locking | Training Manager / Admin | Sign-off, certificate issuance, reopen |
| EPIC-07 Retake & Carry-Over | Academic / Student | Only non-passed subjects retaken; carried results visible |
| EPIC-08 Student Self-Service | Student | Own ETR dossier, certificates, profile |
| EPIC-09 Compliance & Audit | Auditor | Locked ETR repository, advanced search, export packages |
| EPIC-10 System Administration | Admin | Users, departments, audit log, system configuration |
| EPIC-11 Notifications & UX | All roles | CRUD feedback toasts, bilingual UI |

---

## EPIC-01 — Authentication & Session

### AUTH-01 — Login with role-based redirect
**As a** registered user of any role,
**I want** to log in with my username and password,
**so that** I land directly in my own portal.

**Acceptance Criteria (Scenarios)**
1. **Given** valid credentials (username ≥ 3 chars, password ≥ 6 chars), **when** I submit the login form, **then** the system calls `POST /auth/login`, stores the JWT + profile, and redirects me to my role's portal:
   - `Admin` → `/admin` · `Instructor` → `/instructor` · `QA` → `/qa` · `Academic` → `/academic` · `TrainingManager` → `/trainingmanager` · `Student` → `/student` · `Auditor` → `/auditor`
2. **Given** wrong credentials (401 response), **when** I submit, **then** an error message displays under the form and I stay on `/login`.
3. **Given** the backend is unreachable, **when** I submit, **then** a connection-error message shows within 12 seconds (request timeout).
4. **Given** the server returns 200 but no token, **when** the response arrives, **then** login aborts with "invalid server response" and nothing is stored.
5. **Given** I tick "Remember me", **when** I log out and return to `/login`, **then** my username is pre-filled.

### AUTH-02 — Forgot password
**As** a user who forgot their password,
**I want** to request a reset link by email,
**so that** I can regain access to my account.

**Acceptance Criteria (Scenarios)**
1. **Given** a registered email, **when** I submit the forgot-password form, **then** the system calls `POST /auth/forgot-password` and shows an inline success/failure message.
2. **Given** an empty email field, **when** I submit, **then** validation blocks submission with "please enter your email".
3. **Given** a successful request, **when** the email is sent by the backend, **then** I receive a reset email at that address.

### AUTH-03 — Automatic session expiry
**As** any logged-in user,
**I want** my expired session to be terminated automatically,
**so that** no one can use my browser after the token expires.

**Acceptance Criteria (Scenarios)**
1. **Given** an expired JWT, **when** the periodic expiry check runs, **then** token/user are cleared and I am redirected to `/login`.
2. **Given** any API call returns 401 while I work, **when** the response arrives, **then** my session is cleared and I am sent to `/login` (unless suppressed for background downloads).
3. **Given** I navigate to another role's route, **when** the route guard evaluates, **then** I land on my own portal home (no forbidden page shown).

---

## EPIC-02 — Learner & Course Management (Academic)

### ACM-01 — Manage learners
**As** Academic staff,
**I want** to create, edit, search and view learners,
**so that** training records are attached to the right people.

**Acceptance Criteria (Scenarios)**
1. **Given** the learner list, **when** I type in the search box or filter by status/class, **then** only matching learners remain visible.
2. **Given** a completed create/edit form, **when** I submit, **then** a success toast appears: `"username" has added/updated Học viên`.
3. **Given** a duplicate name/code/email, **when** I submit, **then** the backend's clear duplicate error surfaces verbatim in form/toast `(→ RULE-15)`.
4. **Given** a learner row action "view profile", **when** clicked, **then** the profile page shows personal info, enrolled classes, and ETR/certificate history.

### ACM-02 — Create course, class and subject structure
**As** Academic staff,
**I want** to define courses, subjects and open classes,
**so that** enrollments and ETRs can be generated against a valid training structure.

**Acceptance Criteria (Scenarios)**
1. **Given** a new class form missing required fields (class code/name/course), **when** I submit, **then** a warning toast blocks creation.
2. **Given** a duplicate class code, **when** I submit (TM Class Status or Academic Courses screen), **then** a clear duplicate message ("Mã lớp học đã tồn tại…") or the backend duplicate error shows — never a generic failure `(→ RULE-15)`.
3. **Given** a valid class payload, **when** creation succeeds, **then** a success toast `"username" has added Lớp học` fires and the list refreshes showing the new class.
4. **Given** a subject form with min sessions > max sessions, **when** I submit, **then** client-side validation blocks submission with a descriptive message.
5. **Given** a course with duplicate code/name, **when** I save, **then** the backend duplicate message displays via toast/form error `(→ RULE-15)`.

### ACM-03 — Enroll learners into classes (ETR auto-generation)
**As** Academic staff,
**I want** to enroll a learner into a class,
**so that** the backend auto-generates their ETR for that course.

**Acceptance Criteria (Scenarios)**
1. **Given** a learner not yet in a class, **when** enrollment succeeds, **then** a success toast fires (`"username" has added Ghi danh`) and the class assignment list updates.
2. **Given** a learner already enrolled in an active class of the same course (ongoing ETR), **when** I try to enroll again, **then** the aviation business-rule violation error shows clearly `(→ RULE-15)`.
3. **Given** an enrollment deletion confirmed, **when** processed, **then** a `"username" has deleted Ghi danh` toast fires and the learner's class list updates.
4. **Given** a newly created enrollment, **when** the ETR list refreshes, **then** a corresponding ETR exists (auto-generated by the backend).

### ACM-04 — Submit ETR to QA
**As** Academic staff,
**I want** to submit a completed ETR to QA,
**so that** it enters the verification workflow.

**Acceptance Criteria (Scenarios)**
1. **Given** an ETR whose 4-step checklist passes (personal info ✓, every subject attendance ≥ 80%, all assessment/practical results published, all evidence Verified), **when** I click SUBMIT ETR, **then** status becomes `Submitted` ("PENDING QA") and an Approval Request is created.
2. **Given** any checklist item incomplete, **when** I view the record, **then** SUBMIT ETR is disabled with an explanatory tooltip ("Chưa thể gửi ETR").
3. **Given** a returned-for-correction ETR that has been fixed, **when** I resubmit, **then** a new Approval Request replaces the old state `(→ RULE-4)`.
4. **Given** each checklist step, **when** I select a record, **then** the progress card shows which steps are complete/incomplete.

---

## EPIC-03 — Instructor Operations

### INS-01 — View assigned classes and schedule
**As** an instructor,
**I want** to see my classes, rosters and teaching schedule,
**so that** I know where and when I teach.

**Acceptance Criteria (Scenarios)**
1. **Given** my account has assigned classes, **when** I open My Classes, **then** each class shows roster size, attendance rate, and shortcuts to Attendance/Assessments/Evidence.
2. **Given** no assignments, **when** I open the dashboard/classes, **then** an empty state is shown instead of an error.
3. **Given** today's sessions exist, **when** I open the dashboard, **then** they are listed under "Buổi học hôm nay" with confirmation status.

### INS-02 — Mark attendance
**As** an instructor,
**I want** to mark learners present/absent per session and finalize the session,
**so that** attendance rates flow into each learner's ETR.

**Acceptance Criteria (Scenarios)**
1. **Given** an unconfirmed session, **when** I toggle statuses and click Save, **then** records persist via API, a success toast fires (`"username" has updated Điểm danh`), and records reload with fresh IDs.
2. **Given** a save failure, **when** the API errors, **then** the parsed backend error is toasted `(→ RULE-15)`.
3. **Given** a finalized ("chốt") session ready to publish, **when** I confirm, **then** the session locks, a success toast fires, and local state marks it confirmed.
4. **Given** attendance saved dropping any learner below 80% for a subject, **when** rates compute, **then** that learner appears in the low-attendance lists (dashboard + Academic dashboard).
5. **Given** an Excel import file, **when** uploaded, **then** rows import with a summary toast; skipped rows produce a partial-warning.

### INS-03 — Enter and publish scores
**As** an instructor,
**I want** to record assessment and practical-checklist scores, then lock ("chốt điểm") them,
**so that** the ETR results step completes and QA can rely on signed-off results.

**Acceptance Criteria (Scenarios)**
1. **Given** editable scores saved with some learners failing, **when** the save completes, **then** a partial-failure warning names affected learners; successful saves fire the success toast.
2. **Given** all scores entered, **when** I sign off a subject, **then** results become published (`isPublished = true`) and a success toast fires.
3. **Given** sign-off attempted while requirements are unmet, **when** I click sign-off, **then** a warning explains why it is blocked.
4. **Given** a locked result needing correction, **when** I request unlock, **then** the request goes to the Training Manager and a success toast confirms submission.
5. **Given** an Excel score template, **when** downloaded/imported, **then** the template downloads successfully and imported scores follow rule 1 of INS-02.

### INS-04 — Upload learner evidence (Cloudinary)
**As** an instructor,
**I want** to attach evidence files to a learner's subject result,
**so that** QA can verify the training happened.

**Acceptance Criteria (Scenarios)**
1. **Given** class + learner + evidence type selected and a valid file, **when** I drop or pick the file, **then** it uploads directly to Cloudinary first, then metadata JSON goes to `POST /Evidences/upload` `(→ RULE-7)`.
2. **Given** an invalid format (e.g., DOCX/EXE), **when** I attempt upload, **then** it is blocked immediately with a whitelist message — before any network call `(→ RULE-8)`.
3. **Given** a successful upload, **when** complete, **then** a success toast fires and the file appears in the left panel with status Pending.
4. **Given** rejected evidence with a QA comment, **when** I view the list, **then** the rejection reason is visible so I can fix and re-upload.
5. **Given** Verified evidence, **when** I attempt delete, **then** deletion is blocked with an explanation `(→ RULE-2)`.
6. **Given** Cloudinary not configured (missing env vars), **when** I attempt upload, **then** a clear configuration error shows.

---

## EPIC-04 — Evidence Collection (Academic)

### ACM-05 — Manage ETR evidence
**As** Academic staff,
**I want** to browse, preview, download, replace and delete evidence on any ETR,
**so that** records are complete before submission.

**Acceptance Criteria (Scenarios)**
1. **Given** an evidence sub-view, **when** I filter by category (Images/PDF/Signature) or filename, **then** only matching files show.
2. **Given** a file row, **when** I click preview/download, **then** the file opens/downloads correctly (download follows the backend redirect to Cloudinary transparently).
3. **Given** a delete of non-Verified evidence confirmed, **when** processed, **then** a `"username" has deleted Minh chứng` toast fires and the list updates `(→ RULE-2)`.
4. **Given** my account lacks `/Evidences` read permission, **when** the view loads, **then** a warning banner explains the limitation instead of failing silently.

---

## EPIC-05 — QA Verification

### QA-01 — Verify individual evidence
**As** QA staff,
**I want** to review each pending evidence file and verify/reject it with a reason,
**so that** only authentic evidence supports an ETR submission.

**Acceptance Criteria (Scenarios)**
1. **Given** the pending-evidence queue loading, **when** data arrives, **then** each row shows learner, file name, upload time, status, and Review/Verify/Reject/Download actions.
2. **Given** the full-screen review modal opened, **then** the image/PDF preview plus metadata (learner, file, size, type, subject result) render.
3. **Given** a Reject action with empty reason, **when** submitted, **then** it is blocked until a reason is provided.
4. **Given** a verify/reject decision applied, **when** processed, **then** status changes accordingly and queues update.
5. **Given** evidence belonging to a Completed/locked ETR listed, **when** rendered, **then** it shows "🔒 ETR Locked" and Verify/Reject actions are hidden `(→ RULE-1)`.

### QA-02 — Review submitted ETRs
**As** QA staff,
**I want** to inspect the full ETR sheet and either verify it or return it for correction,
**so that** only compliant records reach final approval.

**Acceptance Criteria (Scenarios)**
1. **Given** the review queue loaded, **then** all `Submitted` ETRs appear with course, learner and submitted chip.
2. **Given** View Details opened, **then** the sheet shows the 4-step checklist, per-subject breakdown (attendance, published results, evidence status) and approval history.
3. **Given** Verify ETR confirmed, **when** processed, **then** status becomes `Verified` ("QA VERIFIED") and the record moves to the Training Manager queue.
4. **Given** Return for Correction with reason provided and sent, **when** processed, **then** status becomes `ReturnedForCorrection` and the record returns to the training team.
5. **Given** the Review History section expanded, **then** past outcomes (Approved/Rejected/Returned/Verified/Submitted) with inline approval history are visible and searchable.

### QA-03 — Return records via dedicated flow
**As** QA staff,
**I want** a guided return flow with common reasons,
**so that** returns are consistent and fast.

**Acceptance Criteria (Scenarios)**
1. **Given** the Return page open, **when** selecting an ETR, **then** only Submitted/Draft records are eligible.
2. **Given** common reason chips (Missing evidence / Incomplete attendance / Assessment missing / Wrong learner details) or custom text chosen, **when** Send Back is clicked, **then** the return applies with the chosen reason.
3. **Given** empty message and no chip selected, **when** Send Back is clicked, **then** submission is blocked with a prompt for the reason.

### QA-04 — Search records and consult audit trail
**As** QA staff,
**I want** advanced ETR search with export and an immutable audit trail,
**so that** I can trace every historical decision.

**Acceptance Criteria (Scenarios)**
1. **Given** search criteria applied, **then** matching ETRs list and can be exported (PDF/CSV).
2. **Given** the audit trail page opened, **then** who verified/rejected what and when is visible `(→ RULE-3)`.

---

## EPIC-06 — Final Approval & Locking (Training Manager)

### TM-01 — Monitor approval funnel
**As** a Training Manager,
**I want** an analytics dashboard fed exclusively by live data,
**so that** I can see the true state of approvals at a glance.

**Acceptance Criteria (Scenarios)**
1. **Given** the dashboard loaded successfully, **then** KPIs (Total ETRs, pending approvals, completion rate, certifications due) render from `GET /Dashboard/my-dashboard` `(→ RULE-5)`.
2. **Given** the SUBMISSION PROGRESS chart rendered, **then** values derive from the status funnel.
3. **Given** a backend failure during load, **then** the dashboard degrades gracefully (zeros/dashes) without crashing `(→ RULE-5)`.

### TM-02 — Final sign-off on QA-verified ETRs
**As** a Training Manager,
**I want** to inspect a QA-verified ETR and give final approval,
**so that** the certificate is issued and the record is permanently locked.

**Acceptance Criteria (Scenarios)**
1. **Given** the ETR Final Approval registry filtered by tabs, **then** Pending/Approved/Returned counts match the underlying records.
2. **Given** HISTORY opened on a record, **then** trainee info, assessment scores, QA verification log (QA STAMPED) and any return/approved logs display.
3. **Given** APPROVE ETR clicked and Confirm Sign Off given, **when** processed, **then** the system calls the Approval Request process endpoint, the record becomes `Completed`/"APPROVED" with `IsLocked = true`, the certificate is stamped, and the audit log updates `(→ RULE-1)`.
4. **Given** a failed approve call, **then** "Phê duyệt thất bại" is toasted and state remains unchanged.

### TM-03 — Reopen a locked record (Admin)
**As** an Admin,
**I want** to reopen a completed ETR with a mandatory reason,
**so that** exceptional corrections remain possible but auditable.

**Acceptance Criteria (Scenarios)**
1. **Given** the Approved tab as Admin, **when** REOPEN is clicked, **then** a modal requires a non-empty reason.
2. **Given** a confirmed reopen with reason, **when** processed, **then** the ETR returns to in-progress, a toast confirms, and the action lands in the audit trail.
3. **Given** a non-admin (Training Manager) account viewing the Approved tab, **then** REOPEN is not available `(→ RULE-11)`.

---

## EPIC-07 — Retake & Carry-Over

### RTK-01 — Register retake only for failed subjects
**As** Academic staff,
**I want** retake registration to force re-study only for subjects not yet Passed,
**so that** passed/exempted results are preserved.

**Acceptance Criteria (Scenarios)**
1. **Given** a learner retaking a course enrolled, **when** the new ETR generates, **then** only Failed/not-Pass subjects require retake; Passed/Exempted subjects carry over (`CarriedOverFromSubjectResultId` set, `isCarriedOver = true`).
2. **Given** carried-over subjects in the new ETR, **when** completion computes, **then** prior results count without re-assessment.

### RTK-02 — Student sees carry-over vs retake subjects
**As** a student,
**I want** to see which subjects are carried over and which I must retake in my ETR detail,
**so that** I know exactly what remains to pass.

**Acceptance Criteria (Scenarios)**
1. **Given** my ETR detail page with subject results loaded, **then** each subject shows a badge: green `GIỮ NGUYÊN` (carried over) or amber `CẦN HỌC LẠI` (retake required).
2. **Given** the legend above the table, **then** both states are explained in plain language.
3. **Given** a legacy payload without the flag, **when** rendered, **then** badges simply do not appear (graceful degradation, no crash).

---

## EPIC-08 — Student Self-Service

### STU-01 — Track my ETRs
**As** a student,
**I want** a read-only view of my ETR list and per-record detail,
**so that** I always know my training progress.

**Acceptance Criteria (Scenarios)**
1. **Given** the My ETR page loaded, **then** my records list with status badges (Đang đào tạo / Đã nộp / Đã thẩm định / Hoàn thành / Trả lại).
2. **Given** Chi tiết clicked on a record, **then** issue/expiry dates, subject results (theory/practical/attendance/PASS-FAIL), evidence chips and audit trail display.
3. **Given** a Completed record viewed, **then** it is marked completed & permanently locked `(→ RULE-1)`.
4. **Given** text typed into the search box, **then** the list filters by id/enrollment number.

### STU-02 — Training history timeline
**As** a student,
**I want** a chronological history of all my enrollments and certificates,
**so that** I can present my full training record.

**Acceptance Criteria (Scenarios)**
1. **Given** the History tab loaded, **then** a vertical timeline lists every ETR with issued/expiry dates and links between consecutive records.
2. **Given** the newest completed record rendered, **then** it is labelled as the current certificate.

### STU-03 — Certificates and profile
**As** a student,
**I want** to check certificate validity and manage my profile/password,
**so that** I stay informed about expiries and account security.

**Acceptance Criteria (Scenarios)**
1. **Given** the certificates page loaded, **then** each certificate shows Valid / ExpiringSoon / Expired status and tabs filter by these states.
2. **Given** mismatched or short passwords on change-password, **when** submitted, **then** client-side validation blocks; success/failure is toasted otherwise.
3. **Given** expiry approaching (3 days / 7 days / 1 month), **when** the backend job runs, **then** I receive a notification email (backend-driven; FE surfaces current validity state).

---

## EPIC-09 — Compliance & Audit (Auditor, read-only)

### AUD-01 — Browse locked ETR repository
**As** an auditor,
**I want** to browse finalized/locked ETRs with category filters,
**so that** I can verify regulatory compliance without write access.

**Acceptance Criteria (Scenarios)**
1. **Given** the Locked ETR Records page loaded, **then** only records with `IsLocked = true` appear with lock status "Locked & Compliant" `(→ RULE-1)`.
2. **Given** search text combined with department chips (Line Maintenance / Flight Ops / QA / Base Maintenance), **then** results filter accordingly with pagination.

### AUD-02 — Advanced compliance search & dossier
**As** an auditor,
**I want** multi-parameter search and a six-tab ETR dossier,
**so that** I can inspect any record in depth.

**Acceptance Criteria (Scenarios)**
1. **Given** combined criteria (learner, course, class, ETR ID, dates, lock status), **when** searching, **then** matching records return; Reset clears all fields.
2. **Given** the ETR details dossier opened, **then** tabs show Learner Info, Attendance, Assessment Results, Training Evidence (SHA-256 VERIFIED MATCH), Approval History (timeline with hashes), Audit Trail.
3. **Given** Export Dossier PDF clicked, **when** generation finishes, **then** a printable dossier downloads successfully.

### AUD-03 — Verify approval chain
**As** an auditor,
**I want** the 5-step approval sequence with signatures,
**so that** I can prove chain-of-custody.

**Acceptance Criteria (Scenarios)**
1. **Given** Approval History opened with a locked ETR selected, **then** the banner shows Academic → QA → Training Manager → System Locked → Audited.
2. **Given** the execution log expanded, **then** each step shows timestamps and cryptographic signatures.

### AUD-04 — Export packages
**As** an auditor,
**I want** to generate and download export packages (PDF dossier, evidence ZIP, CAA-EASA package, signature manifest),
**so that** regulators receive self-contained evidence.

**Acceptance Criteria (Scenarios)**
1. **Given** an export type generated, **then** the job completes and appears in export history with download.
2. **Given** the ZIP package built by the backend, **then** evidence files fetch from Cloudinary URLs `(→ RULE-7)`; unavailable files are skipped with warnings without failing the export.
3. **Given** the audit logs page filtered by module chips, **then** module-specific events show, with FORBIDDEN attempts highlighted.

---

## EPIC-10 — System Administration

### ADM-01 — User management
**As** an Admin,
**I want** full CRUD over accounts with role/department assignment and safe deletes,
**so that** access matches organisational reality.

**Acceptance Criteria (Scenarios)**
1. **Given** the users page searched/filtered, **then** the list narrows accordingly.
2. **Given** a create/edit form submitted with duplicate email/code, **then** the backend's clear duplicate error displays in the form `(→ RULE-15)`.
3. **Given** a successful create/edit, **then** a success toast fires (`"username" has added/updated Tài khoản`) and an account-creation email goes to the new user (backend-driven).
4. **Given** soft delete/hard delete/status toggle initiated, **then** appropriate confirmations run first and toasts reflect the outcome; self-delete/self-deactivate attempts are blocked with a specific message `(→ RULE-16)`.
5. **Given** department reassignment inside edit failing, **then** a distinct error is toasted while the overall edit result still reports accurately.

### ADM-02 — Department management
**As** an Admin,
**I want** CRUD over departments with reusable names after soft-delete,
**so that** organisational changes don't hit unique-index conflicts.

**Acceptance Criteria (Scenarios)**
1. **Given** a department name previously soft-deleted, **when** I create a new department with the same name, **then** creation succeeds.
2. **Given** a genuinely conflicting duplicate submitted, **then** a friendly Vietnamese duplicate error appears at form level — not a raw DbUpdateException dump `(→ RULE-15)`.
3. **Given** create/update/delete successes, **then** toasts announce each action.

### ADM-03 — Audit log & system configuration
**As** an Admin,
**I want** a global audit trail and central configuration,
**so that** governance thresholds are controlled in one place.

**Acceptance Criteria (Scenarios)**
1. **Given** the audit page browsed/searched, **then** every significant action (actor, action, timestamp, entity, old→new value) is listed.
2. **Given** System Config values changed (pass score, ETR validity days, thresholds), **then** they persist and take effect platform-wide.

---

## EPIC-11 — Notifications, UX & i18n

### UX-01 — Every CRUD announces its outcome
**As** any user performing create/edit/delete,
**I want** immediate feedback naming me and the entity,
**so that** I always know whether my action succeeded.

**Acceptance Criteria (Scenarios)**
1. **Given** any successful CRUD action completing, **then** a toast appears: EN `"John Doe" has added Course` / VI `"Nguyễn Văn A" đã thêm Khóa học` `(→ RULE-14)`.
2. **Given** a failed CRUD action returning a business error (duplicate name/code/email, rule violation), **then** that exact friendly message surfaces via toast or inline form error `(→ RULE-15)`.

### UX-02 — Bilingual interface
**As** a Vietnamese or English-speaking user,
**I want** to switch language anywhere,
**so that** I can work in my preferred language.

**Acceptance Criteria (Scenarios)**
1. **Given** the top-bar switcher toggled, **then** the entire portal switches VN↔EN instantly and the choice persists across sessions `(→ RULE-17)`.

### UX-03 — Notifications bell
**As** any user,
**I want** a personal activity feed of my write operations,
**so that** I can review what I changed recently.

**Acceptance Criteria (Scenarios)**
1. **Given** performed POST/PUT/DELETE operations, **when** opening the bell dropdown, **then** recent operations (method badge, endpoint, status, time, success/fail) list per account `(→ RULE-19)`.
2. **Given** the dropdown open, **when** clicking outside or pressing Escape, **then** it closes; Clear History empties it.

---

## Rules & Constraints (Invariants)

These statements must hold **at all times**, independent of any specific user journey.
Each rule groups one or more scenario checks used to verify it.

| ID | Theme | Rule (invariant) | Verify by |
| --- | --- | --- | --- |
| **RULE-1** | Record immutability | An ETR with `IsLocked = true` can never be modified through the UI by any role; related evidence verification controls are disabled/hidden. | Attempt edits on Completed records across QA/TM/Academic portals; all paths must be absent or rejected. |
| **RULE-2** | Evidence immutability | Evidence with `verificationStatus = Verified` cannot be deleted or replaced by any role (Instructor, Academic, QA). | Delete attempts on verified files must be absent/blocked everywhere. |
| **RULE-3** | Audit immutability | Audit trails and approval histories are append-only; no UI offers edit/delete of past entries in any portal. | Inspect QA/Admin/Auditor log views for mutation affordances. |
| **RULE-4** | Approval versioning | Each ETR submission creates a **new** ApprovalRequest; existing requests are never mutated. Resubmission after return always yields a fresh request. | Submit → return → resubmit; assert two distinct requests exist. |
| **RULE-5** | Live-data-only dashboards | All dashboard KPIs/charts derive exclusively from `GET /Dashboard/my-dashboard`. Fabricated/hardcoded metrics are prohibited. On API failure, dashboards degrade to zeros/dashes without crashing. | Code inspection + kill the API and reload each dashboard. |
| **RULE-6** | No mock data anywhere | Public marketing pages render real backend stats only; failures show empty states, never placeholder/demo numbers. | Inspect public pages with API unreachable. |
| **RULE-7** | Bytes never touch the API | File uploads go browser → Cloudinary directly; the backend receives JSON metadata (URL + fields) only — no multipart bytes on any evidence endpoint. | Network inspection: no `multipart/form-data` to `/Evidences/*`. |
| **RULE-8** | Attachment whitelist | Only `.jpg .jpeg .png .gif .webp .pdf` (with matching MIME) may attach as evidence; the FE must block violations **before** any network call. | Attempt DOCX/EXE uploads; observe instant client-side rejection. |
| **RULE-9** | Secure storage URLs | Stored evidence URLs must be absolute HTTPS. | Inspect payloads/API errors for non-https URLs. |
| **RULE-10** | Auditor read-only | The Auditor portal exposes zero write operations (create/update/delete) — GET-only guarantee. | Enumerate all auditor routes/actions; attempt writes → impossible/403. |
| **RULE-11** | Privileged actions gated | Reopening a completed ETR is available to Admin only; the action always demands a recorded reason. | Check Approved tab as TM vs Admin; try empty reason. |
| **RULE-12** | Role-scoped routing | Every protected route enforces role membership; unauthorized navigation redirects to the user's own portal home (never a shared forbidden page). | Deep-link cross-role URLs per role. |
| **RULE-13** | Session safety | JWT expiry is checked every 5 s and on window focus; expiry or any 401 clears credentials and returns to `/login` (background downloads may suppress redirect). | Wait for expiry / force 401; observe cleanup. |
| **RULE-14** | Success announcement format | Every successful CRUD operation announces exactly: EN `"name" has added/has updated/has deleted <entity>` · VI `"tên" đã thêm/đã cập nhật/đã xóa <entity>`. | Trigger each CRUD across modules; compare toast text. |
| **RULE-15** | Friendly business errors | Backend business errors (duplicates, aviation business rules) surface verbatim as friendly messages — never generic "thất bại", never raw exception/stack text. | Force duplicates/rule violations on all 9 managed modules. |
| **RULE-16** | Confirmation before destruction | Irreversible/destructive actions (delete, soft delete, finalize, sign-off, reopen) require an explicit confirmation step or reason prompt first. | Attempt each destructive action; confirm dialog must precede the call. |
| **RULE-17** | Persistent bilingual UI | The language toggle switches the entire portal VN↔EN instantly; preference persists in `localStorage.app_language` across sessions. | Toggle + reload; check all portals. |
| **RULE-18** | Translation fallback | Untranslated strings fall back to their source text without breaking layout. | Switch language on rarely-used screens. |
| **RULE-19** | Local activity cap | Per-account client activity log stores at most 50 entries (localStorage) and feeds the notifications bell. | Exceed 50 writes; assert oldest entries evicted. |

---

## Traceability Notes

- Stories derive from implemented behaviour in the codebase (routes in `App.jsx`, screens under `src/<Role>/`, API layer `src/utils/api.js`, notification helper `src/utils/crudNotify.js`, Cloudinary integration `src/utils/cloudinary.js`).
- Automated coverage exists for dashboards data-loading (`src/test/DashboardsData.test.jsx`), Cloudinary evidence + carry-over (`src/test/CloudinaryEvidence.test.jsx`), and prior suites — see `npx vitest run`.
- RULE-5, RULE-7/8 and RTK badges have direct automated tests; other rules are verified manually per the "Verify by" column.
