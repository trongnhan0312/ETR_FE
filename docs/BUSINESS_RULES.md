# ETR — Business Rules Catalogue

**Source:** `ETR_Record_BE` (`BusinessRuleEngine.cs`, domain services) + frontend enforcement (`ETR_FE`)
Legend: **[BE]** enforced by backend · **[FE]** enforced by frontend · **[CFG]** configurable constant

---

## 1. Core Thresholds (BusinessRuleEngine)

| # | Rule | Value |
| --- | --- | --- |
| BR-001 | Minimum attendance rate per subject required for ETR submission | **80%** |
| BR-002 | Maximum attempts allowed per assessment (retakes) | **3** |
| BR-003 | Grace period for marking attendance after the session date | **48 hours** |

---

## 2. Enrollment Rules

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-010 | A learner **cannot enroll** without a complete user profile. | [BE] EnrollmentService |
| BR-011 | A learner cannot enroll in the **same class twice**. | [BE] |
| BR-012 | A learner can have only **one ongoing ETR per course** — enrollment is rejected if they are already in an active class of that course with an unfinished ETR. | [BE] (+ FE pre-check warning) |
| BR-013 | A course must have **at least one subject configured** before learners can enroll. | [BE] |
| BR-014 | An enrollment whose ETR is already **Completed/locked cannot be deleted**. | [BE] |
| BR-015 | Creating an enrollment **auto-generates the learner's ETR** (no manual creation path). | [BE] |

## 3. Class & Course Structure

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-020 | Class codes are **unique**; codes of soft-deleted classes become reusable. | [BE] unique index (+ FE pre-check) |
| BR-021 | A class **cannot be marked Completed** while it still has unconfirmed attendance sessions. | [BE] ClassService |
| BR-022 | An assigned `InstructorAccountId` must reference an account with the **Instructor role**. | [BE] |
| BR-023 | Instructors are assigned **per subject** within a class (`InstructorAssignments`), not per class. | [BE] contract |
| BR-024 | A course code is **unique**; soft-deleted codes reusable. | [BE] |
| BR-025 | A subject can be assigned to the **same course only once**. | [BE] |
| BR-026 | Changing a course's `ValidityMonths` **bumps `VersionNo`** so already-enrolled learners keep evaluating against the prior version. | [BE] CourseService |
| BR-027 | Class start/end dates are mandatory — FE defaults to today / today+30 when blank. | [FE] fallback |

## 4. Grading Snapshot Rules (fairness across config changes)

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-030 | A result is graded against the **`PassingScoreSnapshot` taken at enroll time**, NOT the current `CourseSubject.PassingScore`. Config changes never retroactively affect enrolled learners. | [BE] |
| BR-031 | The assessment **Weight** used for computation is likewise snapshotted when first recorded. | [BE] |
| BR-032 | Pass/Fail verdict = `score >= passingScore`; **Exempted** counts as satisfied for completion purposes. | [BE] |
| BR-033 | An **already-published** AssessmentResult cannot be updated or re-published. | [BE] |

## 5. Assessment Attempts & Segregation of Duties

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-040 | An assessment allows at most **3 attempts** (BR-002); further retakes are rejected. | [BE] |
| BR-041 | A retake must be **authorized by an account different from the one recording the score** (no self-authorization). | [BE] |
| BR-042 | Recording an assessment result requires the learner to be **enrolled in a class of that assessment's course**. | [BE] |

## 6. Attendance

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-050 | Attendance can only be marked within **48h after the session date** (BR-003); later marking requires Academic Staff intervention. | [BE] |
| BR-051 | A session's attendance, once **confirmed/chốt, becomes read-only** — records cannot be modified or deleted. | [BE] |
| BR-052 | Exactly **one attendance record per (session, enrollment)** — duplicates rejected. | [BE] |
| BR-053 | Attendance can only be recorded for a student **enrolled in that class**. | [BE] |
| BR-054 | Learners below the 80% threshold surface automatically in low-attendance watchlists (dashboards, Academic/TM views). | [BE+FE] |

## 7. Score Sign-off & Amendments

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-060 | Every subject result must be **signed off by the instructor** before its ETR can be submitted. | [BE] EtrService gate |
| BR-061 | An amendment (re-open a signed-off result) **requires a reason**. | [BE] AmendmentService |
| BR-062 | Amendments apply **only to already-signed-off results** (unsigned results are edited directly) and **only before the ETR is Completed** — completed records go through Admin Reopen instead. | [BE] |
| BR-063 | Only **one pending amendment per subject result** at a time. | [BE] |
| BR-064 | Rejecting an amendment request **requires a comment**; a decided request cannot change again. | [BE] |
| BR-065 | Unlock requests for published scores route to the Training Manager. | [FE→BE] |

## 8. Evidence & Attachments

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-070 | Evidence files upload **browser → Cloudinary directly**; the backend receives JSON metadata only (URL/publicId/fileName/mimeType/fileSize) — never file bytes. | [BE+FE] |
| BR-071 | Allowed formats only: `.jpg .jpeg .png .gif .webp .pdf` with matching MIME whitelist. FE blocks violations **before any network call**. | [BE+FE] |
| BR-072 | Stored `fileUrl` must be an **absolute HTTPS URL**. | [BE] |
| BR-073 | Evidence links to a learner through **`SubjectResultId`** (not the ETR id directly). | [BE] schema |
| BR-074 | **Verified evidence is immutable** — cannot be deleted by any role. | [BE+FE] |
| BR-075 | Evidence on a **locked (Completed) ETR** can no longer be Verified/Rejected ("🔒 ETR Locked"). | [BE+FE] |
| BR-076 | Rejecting evidence **requires a reason** (`VerificationComment`) which is shown to the uploader. | [BE+FE] |
| BR-077 | Downloads redirect to the Cloudinary URL; auditor ZIP exports fetch from Cloudinary and skip unavailable files with warnings instead of failing the export. | [BE] |

## 9. ETR Submission Gates (all must pass)

| ID | Gate | Failure message source |
| --- | --- | --- |
| BR-080 | Personal information complete | always ✓ (step 1) |
| BR-081 | **Every subject attendance ≥ 80%** (BR-001) | EtrService |
| BR-082 | **Every subject signed off** by instructor | EtrService |
| BR-083 | **All evidence files Verified** (≥1 linked, none pending) | EtrService |
| BR-084 | **All mandatory subjects Passed or Exempted** | EtrService |
| BR-085 | All mandatory practical checklists **signed off** and scored ≥ course-subject passing threshold | EtrService |
| BR-086 | Completion requirements engine: each named requirement met (attendance / mandatory subjects / checklists) | CompletionRequirementService |

## 10. ETR Lifecycle Transitions

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-100 | Valid transitions only: `Submitted → Verified` (verify), `Submitted → ReturnedForCorrection` (return), `Verified → Completed` (complete). Anything else is rejected ("Cannot verify ETR that is not in Submitted status", etc.). | [BE] |
| BR-101 | Each submission creates a **NEW ApprovalRequest**; existing ones are never mutated; only `Pending` requests can be updated/deleted. | [BE] ApprovalService |
| BR-102 | Rejecting or returning an ApprovalRequest **requires a comment**. | [BE] |
| BR-103 | On approval the ETR becomes `Completed`, **`IsLocked = true`**, certificate issued, audit log written. Locked ETRs reject all mutations ("ETR is locked"). | [BE] |
| BR-104 | **Only Admin** may Reopen a locked ETR, and only with a **recorded reason** (PromptModal FE). | [BE+FE] |
| BR-105 | Reopen applies to locked records only ("ETR is not locked"). | [BE] |

## 11. Accounts & Users

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-110 | Usernames are **unique**. | [BE] AccountService |
| BR-111 | Users **cannot disable or delete their own account** (soft or hard). | [BE+FE] |
| BR-112 | Assigned departments must exist. | [BE] |
| BR-113 | Account-creation emails fire after success; **email failure never rolls back or fails** the created account. | [BE] |
| BR-114 | Login validation: username ≥ 3 chars, password ≥ 6 chars; unknown/expired tokens clear the session. | [FE] |
| BR-115 | Role determines portal routing and permissions (Admin/TrainingManager share the TM portal; Auditor is GET-only). | [FE guards + BE policies] |
| BR-116 | Names/codes/emails are unique **per entity** among *active* records; values freed by soft-delete become reusable. | [BE] indexes |
| BR-117 | In User Management, an Admin **cannot edit their own account**, nor can they **edit another Admin account** (action disabled + frontend guard). Editing non-admin users is permitted. | [FE] |

## 12. Certificates & Expiry

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-120 | Completing an ETR issues a certificate with an expiry date derived from the course's validity (snapshot version). | [BE] |
| BR-121 | Certificate-expiry notifications are sent at **3 days / 7 days / 1 month** before expiry. | [BE job] |
| BR-122 | Successive certificates link via `PreviousRecordId`, forming a verifiable history timeline. | [BE+FE] |

## 13. Read-only & Governance Boundaries

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-130 | The Auditor portal exposes **zero write operations** (GET-only guarantee); exports fetch evidence from Cloudinary and tolerate missing files. | [BE+FE] |
| BR-131 | Destructive actions (delete, soft-delete, finalize, sign-off, reopen, return) require **explicit confirmation or reason prompt** before execution. | [FE] |
| BR-132 | All significant actions land in the **append-only audit trail** (actor, action, timestamps, old→new values); FORBIDDEN access attempts are flagged. | [BE] |
| BR-133 | Dashboards render **live API data only** — fabricated/hardcoded metrics prohibited; failures degrade to zeros/dashes. | [FE] |

---

### Quick constants reference

```
MinimumAttendanceThreshold = 80%
MaxAssessmentAttempts      = 3
AttendanceGracePeriodHours = 48
Expiry email schedule      = 3d / 7d / 1mo before certificate expiry
Default class capacity     = 15 (FE default)
Default class window       = today → today+30d (FE fallback)
```
