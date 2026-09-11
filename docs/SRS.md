# Software Requirements Specification (SRS)

**ETR — Aviation Training Record Management System**
AeroMetric Aviation Systems · Version 1.0 · Status: Approved baseline

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Traceability](#6-traceability)

<a id="1-introduction"></a>
## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of the **ETR (Electronic Training Record)** platform — a web application that digitalizes the full lifecycle of aviation training records: enrollment → evidence collection → quality-assurance verification → final management sign-off → locked compliance archive.

Audience: developers, testers, reviewers and stakeholders of the ETR project.

### 1.2 Scope
**In scope**
- Seven role-based portals (Admin, Academic, Instructor, QA, Training Manager, Student, Auditor).
- ETR workflow engine with status transitions, approval requests and record locking.
- Evidence collection with direct-to-Cloudinary storage.
- Retake management with carry-over of passed subjects.
- Certificate issuance tracking with expiry notifications.
- Read-only compliance repository with export packages for auditors.
- Bilingual interface (Vietnamese/English).

**Out of scope**
- Backend service internals (documented separately in `ETR_Record_BE/docs`).
- Native mobile applications.
- Offline synchronisation.

### 1.3 Definitions & Acronyms

| Term | Meaning |
| --- | --- |
| ETR | Electronic Training Record — the digital dossier of one learner's training on one course |
| Carry-over | A previously Passed/Exempted subject retained (not re-studied) in a retake enrollment |
| Chốt điểm | Score sign-off by an instructor that publishes results immutably |
| ApprovalRequest | Workflow entity created each time an ETR is submitted for review/approval |
| Locked | Terminal state (`IsLocked = true`) after final approval; content can never change |
| QA | Quality Assurance staff role |

### 1.4 References
- `docs/BUSINESS_RULES.md` — domain rule catalogue (BR-xxx)
- `docs/USER_STORIES.md` — epics, stories, acceptance criteria (RULE-xx invariants)
- `docs/USE_CASES.md` — use case model UC01–UC59
- `docs/USER_GUIDE.md` — installation and user manual
- Backend module specs: `ETR_Record_BE/docs/final/1–8`

<a id="2-overall-description"></a>
## 2. Overall Description

### 2.1 Product Perspective
A single-page React application consuming a deployed REST API (DEPLOY-ONLY mode — the frontend always calls exactly one configured backend base URL; there is no local/offline fallback). Evidence binaries are stored in Cloudinary; the API handles metadata only.

### 2.2 Product Functions (high level)
Authentication & RBAC · learner/course/class/subject administration · enrollment with automatic ETR generation · attendance & assessment capture with instructor sign-off · evidence upload/verification · ETR submission, QA review, return-for-correction · final approval with certificate issuance and locking · admin reopen · retake registration with carry-over · student self-service · auditor repository/search/export · notifications (in-app toasts, activity feed, e-mail).

### 2.3 User Characteristics

| Actor | Frequency | Training need | Portal |
| --- | --- | --- | --- |
| Admin | Occasional | Low | `/admin`, plus TM portal |
| Academic Staff | Daily | Medium | `/academic` |
| Instructor | Daily | Low | `/instructor` |
| QA Staff | Daily | Medium | `/qa` |
| Training Manager | Weekly | Low | `/trainingmanager` |
| Student | Occasional | Minimal | `/student` (read-only) |
| Auditor | Periodic audits | Low | `/auditor` (read-only) |

### 2.4 Constraints
- C-1: Frontend runs DEPLOY-ONLY against one Azure-hosted API base URL (`VITE_API_URL_DEPLOY`).
- C-2: Authentication state lives in `localStorage`; no server-side session.
- C-3: Evidence binaries never transit the backend — uploads go browser → Cloudinary (unsigned preset); backend stores metadata/URL only.
- C-4: No demo/seed accounts in production code paths; all data comes from the real API.
- C-5: Node.js `^20.19 || >=22.12`; evergreen browsers only (ESM bundle).

### 2.5 Assumptions & Dependencies
- Cloudinary account provides an unsigned upload preset restricted to the evidence whitelist.
- Backend enforces authorisation (RBAC), business rules and audit logging; the frontend provides defence-in-depth pre-checks.
- SMTP (Gmail) available for notification e-mails.

<a id="3-functional-requirements"></a>
## 3. Functional Requirements

Priority: **H** = Must-have · **M** = Should-have · **L** = Nice-to-have.
Each requirement lists its use cases (UC) and business rules (BR) for traceability.

### 3.1 Authentication & Session

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-01 | The system shall authenticate users via username/password (`POST /auth/login`) and store the returned JWT + profile client-side. | H | UC01 |
| FR-02 | The system shall validate inputs client-side (username ≥ 3 chars, password ≥ 6 chars) before calling the API. | M | UC01 |
| FR-03 | After login the system shall redirect each role to its own portal (Admin→/admin, Instructor→/instructor, QA→/qa, Academic→/academic, TrainingManager→/trainingmanager, Student→/student, Auditor→/auditor). | H | UC01, BR-115 |
| FR-04 | The system shall support "Remember me" (pre-fill username on next visit). | L | UC01 |
| FR-05 | The system shall provide forgot-password flow via `POST /auth/forgot-password` with inline success/failure feedback. | M | UC02? n/a — see USE_CASES §1 |
| FR-06 | The system shall terminate sessions automatically when the JWT expires (checked every 5 s and on window focus) or on any 401, clearing stored credentials and returning to `/login`. | H | UC54, RULE-13 |
| FR-07 | The system shall enforce role-scoped routing: navigation into another role's protected route redirects to the user's own portal home. | H | RULE-12 |
| FR-08 | The system shall allow any authenticated user to sign out explicitly, clearing credentials. | H | UC-A sidebars |

### 3.2 Administration (Admin)

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-10 | Admin shall create/edit/disable/delete user accounts and assign roles and departments, with search/filter. | H | UC33 |
| FR-11 | The system shall prevent an admin from disabling/deleting their own account. | H | UC34, BR-111 |
| FR-12 | Account creation shall trigger a welcome e-mail to the new user; e-mail failure must not fail or roll back account creation. | M | UC33, BR-113 |
| FR-13 | Admin shall manage departments (CRUD) with unique-name enforcement that permits reuse after soft delete. | M | UC35, BR-116 |
| FR-14 | Admin shall view a global append-only audit log (actor, action, entity, old→new value, timestamp). | H | UC36, RULE-3 |
| FR-15 | Admin shall configure platform settings (pass scores, ETR validity days, thresholds) that take effect system-wide without retroactively altering already-enrolled learners (snapshot semantics). | M | UC37, BR-026/030 |
| FR-16 | Only Admin may reopen a completed ETR, supplying a mandatory recorded reason. | H | UC38, BR-104 |

### 3.3 Training Structure & Enrollment (Academic)

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-20 | Academic shall manage learners (create/edit/search/view profile with classes and ETR/certificate history). | H | UC02 |
| FR-21 | Academic shall manage courses and attach subjects (each subject once per course), defining passing scores and hours. | H | UC03, BR-024/025 |
| FR-22 | Academic shall open classes (unique code; mandatory start/end dates with today/+30 fallback) and update status — completion blocked while unconfirmed sessions exist. | H | UC04, BR-020/021/027 |
| FR-23 | Academic shall enroll learners into classes; each successful enrollment shall cause the backend to auto-generate the learner's ETR. | H | UC04, BR-015 |
| FR-24 | The system shall reject enrollment when: profile incomplete; duplicate exact class; learner has an ongoing ETR for the same course; course has no subjects. | H | BR-010–013 |
| FR-25 | Academic shall assign instructors per class-subject (Instructor-role accounts only). | H | UC05, BR-022/023 |
| FR-26 | Deleting an enrollment whose ETR is Completed/locked shall be refused. | M | BR-014 |

### 3.4 Instructor Operations

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-30 | Instructor shall view assigned classes with rosters and shortcuts, plus teaching schedule and today's sessions; empty states when unassigned. | H | UC10 |
| FR-31 | Instructor shall mark attendance Present/Absent per learner per session and save; records unique per (session, enrollment); marking allowed only within 48 h after session date and only for enrolled students. | H | UC11, BR-050–053 |
| FR-32 | Instructor shall finalize («chốt») a session's attendance; finalized sessions become read-only. | H | UC12, BR-051 |
| FR-33 | Instructor shall import attendance from Excel with per-row skip reporting. | M | UC11 ext |
| FR-34 | Instructor shall enter assessment/practical-checklist scores graded against the PassingScoreSnapshot captured at enrollment; attempts limited to 3. | H | UC13, BR-002/030/040 |
| FR-35 | A score-recording account different from the recorder shall authorize retakes (segregation of duties). | H | BR-041 |
| FR-36 | Instructor shall sign off («chốt điểm») subject results, publishing them immutably; sign-off blocked until entry requirements are met. | H | UC14, BR-033/060 |
| FR-37 | Instructor shall request unlock/amendment of signed-off results with mandatory reason; routed to the Training Manager; one pending amendment per result; rejection requires comment. | M | UC15, BR-061–064 |
| FR-38 | Learners below the attendance threshold (80%) shall surface automatically in watchlists on relevant dashboards. | M | BR-054 |

### 3.5 Evidence Management

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-40 | Instructor/Academic shall upload evidence (jpg/jpeg/png/gif/webp/pdf) by sending the file directly to Cloudinary, then registering JSON metadata (`fileUrl`, `publicId`, `fileName`, `mimeType`, `fileSize`, type/account/subject-result ids) with the backend. No multipart bytes shall be sent to the backend. | H | UC16/58, RULE-7/8 |
| FR-41 | The frontend shall reject non-whitelisted formats/mime types locally before any network call. | H | RULE-8 |
| FR-42 | Stored evidence URLs must be absolute HTTPS; Cloudinary misconfiguration shall produce a clear configuration error. | H | BR-072 |
| FR-43 | Users shall browse, filter (category/filename), preview, and download evidence; downloads follow the backend's HTTP redirect to Cloudinary transparently. | H | UC06, BR-077 |
| FR-44 | Verified evidence shall not be deletable; Pending/Rejected evidence may be deleted by its owners; rejected files display the QA reason. | H | BR-074/076 |

### 3.6 QA Verification

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-50 | QA shall view a pending-evidence queue with learner/file/status/actions and a full-screen review modal (preview + metadata). | H | UC18 |
| FR-51 | QA shall Verify evidence, or Reject it with a mandatory reason; decided items leave the queue. | H | UC18/19, BR-076 |
| FR-52 | Evidence belonging to locked ETRs shall show a locked indicator and hide verification actions. | H | BR-075 |
| FR-53 | QA shall work a Submitted-ETR review queue and inspect the full ETR sheet (checklist, per-subject breakdown, published flags, evidence statuses, approval history). | H | UC20/21 |
| FR-54 | QA shall Verify a Submitted ETR (status → Verified) or Return it for Correction with mandatory reason (status → ReturnedForCorrection). Invalid transitions rejected. | H | UC22/23, BR-100 |
| FR-55 | Each ETR submission shall create a new ApprovalRequest; historical requests remain immutable. | H | BR-101, RULE-4 |
| FR-56 | QA shall search all ETRs and export results (PDF/CSV). | M | UC24 |
| FR-57 | QA shall consult the immutable audit trail and retake histories. | M | UC25 |

### 3.7 Final Approval (Training Manager / Admin)

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-60 | TM dashboard shall render KPIs, funnel and trend charts exclusively from `GET /Dashboard/my-dashboard`; on failure it degrades to zeros/dashes without crashing. Fabricated/hardcoded metrics are prohibited. | H | UC26, RULE-5 |
| FR-61 | TM shall review the approval registry via tabs (Pending/Approved/Returned) with live counts and operational metrics. | H | UC27 |
| FR-62 | TM shall inspect a record's history/transcript (trainee info, scores, QA stamp, timeline, verified documents) before deciding. | H | UC28 |
| FR-63 | TM shall give final approval via the ApprovalRequest process endpoint; success sets Completed + IsLocked, stamps the certificate and writes audit entries. Failure leaves state unchanged with an error toast. | H | UC29, BR-103 |
| FR-64 | TM shall monitor class status board and expiring-certificate report (shared screen with Academic). | M | UC30/32 |

### 3.8 Retake & Carry-Over

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-70 | Retake enrollment shall require re-study only for subjects not yet Passed; Passed/Exempted subjects carry over (`isCarriedOver = true`). | H | RTK-01 |
| FR-71 | The student ETR detail shall visually distinguish carried-over vs retake-required subjects (badges + legend) and degrade gracefully when the flag is absent. | H | UC42, RTK-02 |

### 3.9 Student Self-Service (read-only)

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-80 | Student shall view personal progress dashboard, ETR list with status badges, searchable. | H | UC40/41 |
| FR-81 | Student shall open an ETR dossier: issue/expiry dates, subject results (theory/practical/attendance/PASS-FAIL), evidence chips, carry-over badges, audit trail; Completed records marked permanently locked. | H | UC42 |
| FR-82 | Student shall view training-history timeline linked by previous-record id, newest completed labelled current certificate. | M | UC43 |
| FR-83 | Student shall check certificate validity (Valid/ExpiringSoon/Expired with tab filters) and receive backend-driven expiry notifications at 3 days/7 days/1 month. | M | UC44/57 |
| FR-84 | Student shall maintain profile and change password with client-side validation. | M | UC45 |

### 3.10 Audit & Export (Auditor, read-only)

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-90 | The Auditor portal shall expose zero write operations across all screens. | H | UC46–52, RULE-10 |
| FR-91 | Auditor shall browse locked-ETR repository (`IsLocked = true` only) with text search, department chips and pagination. | H | UC47 |
| FR-92 | Auditor shall run multi-parameter advanced search with reset. | M | UC48 |
| FR-93 | Auditor shall inspect a six-tab dossier including evidence integrity (SHA-256 VERIFIED MATCH) and hashed approval timeline (5-step chain). | H | UC49/50 |
| FR-94 | Auditor shall filter audit logs by module with FORBIDDEN attempts highlighted. | M | UC51 |
| FR-95 | Auditor shall generate/download export packages (PDF dossier, Evidence ZIP, CAA-EASA package, signature manifest); ZIP builds fetch evidence from Cloudinary and tolerate missing files (skip-with-warning). | H | UC52, BR-077 |

### 3.11 Cross-Cutting UX

| ID | Requirement | Priority | Ref |
| --- | --- | --- | --- |
| FR-100 | Every successful CRUD operation announces exactly `"name" has added/updated/deleted <entity>` (EN/VN equivalents) via toast. | H | UC53, RULE-14 |
| FR-101 | Every failed operation surfaces the backend's verbatim friendly business message (duplicates, rule violations) — never generic failure text or raw exceptions. | H | RULE-15 |
| FR-102 | Irreversible/destructive operations require explicit confirmation or reason prompt before execution. | H | RULE-16 |
| FR-103 | Users shall toggle the entire UI between Vietnamese and English instantly; preference persists across sessions. Untranslated strings fall back to source text. | H | UC55, RULE-17/18 |
| FR-104 | Users shall review their own last ≤50 write operations in a notifications dropdown. | L | UC56, RULE-19 |

<a id="4-external-interface-requirements"></a>
## 4. External Interface Requirements

### 4.1 User Interfaces
- Shared shell: sidebar navigation (role-specific), top bar (back, breadcrumb, notifications bell, language switcher), content area, sidebar footer (profile + sign-out).
- Responsive grids at 640 px / 1024 px breakpoints; evergreen-browser targets.
- Feedback: toasts for outcomes; modals for confirmations/reasons; empty/loading/error states required on all lists.

### 4.2 Hardware Interfaces
None beyond standard client devices (desktop/laptop browsers).

### 4.3 Software Interfaces

| Interface | Protocol | Notes |
| --- | --- | --- |
| Backend REST API | HTTPS/JSON, Bearer JWT | Single deployed base URL; 20 s request timeout (12 s login); 401/403 handling per FR-06 |
| Cloudinary Upload API | HTTPS multipart (browser-direct) | Unsigned preset; returns `secure_url`, `public_id` |
| SMTP (Gmail) | TLS | Account-created and certificate-expiry mails (backend-side) |

### 4.4 Communications
HTTPS everywhere; Authorization header attached to API calls and stripped automatically on cross-origin redirects (Cloudinary downloads).

<a id="5-non-functional-requirements"></a>
## 5. Non-Functional Requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Any API call aborts at 20 s (12 s for auth); lists paginate rather than rendering unbounded rows. |
| NFR-02 | Performance | Dashboards render from a single aggregated endpoint call (`my-dashboard`) per load — no N+1 lookup storms from the client. |
| NFR-03 | Security | JWT Bearer authentication; role-based route guards client-side plus backend authorisation as source of truth. |
| NFR-04 | Security | No secrets committed: only public `VITE_*` values (API URL, Cloudinary cloud/preset names) live in frontend env files. |
| NFR-05 | Security | Auditor portal is structurally read-only; destructive actions always behind confirmation gates. |
| NFR-06 | Reliability | Every list/dashboard defines loading, empty and error states; API failures degrade gracefully (zeros/dashes/banners), never blank screens or crashes. |
| NFR-07 | Reliability | Notification-e-mail failures never break primary flows (account creation, exports skip missing evidence). |
| NFR-08 | Usability | All outcomes announced per FR-100/101; consistent Vietnamese-first source strings with full EN dictionary coverage for common flows. |
| NFR-09 | Accessibility | Interactive controls are real buttons/links with labels; icon buttons expose aria-labels. |
| NFR-10 | Portability | Runs on any evergreen browser; build output is static (Vercel SPA rewrite for deep links). |
| NFR-11 | Maintainability | Code organised per-role modules with shared utilities (`api.js`, `crudNotify.js`, `cloudinary.js`); ESLint enforced; unit/integration tests runnable via `npx vitest run`. |
| NFR-12 | Auditability | Append-only audit trail platform-wide; FORBIDDEN access attempts flagged; locked records cryptographically sealed for auditor inspection (SHA-256 manifests). |
| NFR-13 | Data integrity | Snapshot semantics guarantee configuration changes never retroactively alter enrolled learners' grading basis (BR-026/030/031). |
| NFR-14 | Localisation | Default language English with persisted preference; document `lang` attribute updated on switch. |

<a id="6-traceability"></a>
## 6. Traceability

| SRS artifact | Companion documents |
| --- | --- |
| Functional requirements (FR-xx) | Use cases UC01–UC59 (`USE_CASES.md`), Business rules BR-xxx (`BUSINESS_RULES.md`) |
| Invariants referenced above | RULE-xx acceptance invariants (`USER_STORIES.md` §Rules & Constraints) |
| Automated verification | `DashboardsData.test.jsx` (FR-60 family), `CloudinaryEvidence.test.jsx` (FR-40–44, FR-71), legacy suites; manual UAT per `USER_GUIDE.md` workflows |

> Suggested reading order for reviewers: §2.3 actors → §3 module tables → companion UC diagram (`USE_CASES.md` §7).
