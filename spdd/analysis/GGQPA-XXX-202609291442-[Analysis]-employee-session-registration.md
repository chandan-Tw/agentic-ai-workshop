# SPDD Analysis: Employee Training Session Registration

## Original Business Requirement

**Trello Card:** https://trello.com/c/6fxz0dPu/87-wh-2-clone-chandanemployee-can-register-for-an-available-training-session

**Type:** Story  
**Status:** In Progress  
**Priority:** Medium

### Context
Employees can currently browse training sessions (WH-1). The next step is allowing them to register. Registration is the core transactional action of WorkshopHub — it increments the registered count on a session and records the employee's details.

This is a trainee exercise story. It is not implemented in the baseline template.

### Description
As an employee, I want to register for an available training session so that I can secure my place before it fills up.

An employee submits their name and email to register. The system confirms the registration and shows the updated capacity. If the session is full, the employee cannot register (see WH-3 for the waitlist).

### Acceptance Criteria

1. A register button or form is visible on each session card (or session detail page)
2. The employee provides their name and email to register
3. On success, the registered count increments by 1
4. On success, a confirmation message is shown to the employee
5. If registered >= capacity, the register button is disabled or hidden
6. POST /api/training-sessions/:id/registrations accepts { name, email } and returns HTTP 201 with registration details
7. Returns HTTP 400 if required fields are missing
8. Returns HTTP 409 if the session is full (see WH-3 for waitlist)
9. Returns HTTP 404 if the session does not exist

### Out of Scope
- Duplicate registration prevention
- Waitlist behaviour when full (WH-3)
- Cancellation (WH-4)
- Email notification (WH-8)
- Authentication or SSO

### Suggested Tests
- POST /api/training-sessions/1/registrations { name, email } → 201
- POST /api/training-sessions/1/registrations {} → 400, missing fields
- POST /api/training-sessions/999/registrations → 404
- POST when session is full → 409
- registered count increments after successful registration

### Notes
- The Registration model will need to be added to the Prisma schema. Consider whether registered count is stored on the session row or computed from the registrations table.
- Need to consider the race condition when creating a registration and incrementing the count.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **TrainingSession**: Core entity representing a training event with title, description, date, capacity, registered count, location, delivery mode, and status. Stored in SQLite via Prisma ORM. Has a `registered` field (Int, default 0) that tracks current registration count. — Parent concept that Registration belongs to.

- **Capacity Tracking**: The `TrainingSession.registered` field serves as a denormalized counter of total registrations. The frontend computes `spotsLeft = capacity - registered` to determine availability. — Governs registration availability logic.

- **Session Browsing (WH-1)**: Existing functionality allowing employees to view all training sessions via `GET /api/training-sessions` and `GET /api/training-sessions/:id`. Frontend renders session cards with capacity display. — Foundation that registration builds upon.

### New Concepts Required

- **Registration**: A new entity representing an employee's sign-up for a training session. Must store at minimum: employee name, email, reference to the training session, and timestamp. — Child of TrainingSession; each session has many registrations.

- **Registration Service**: Business logic layer handling the transactional operation of creating a registration, validating capacity, and incrementing the session's registered count. — Orchestrates the registration workflow.

- **Registration API Endpoint**: REST endpoint `POST /api/training-sessions/:id/registrations` accepting `{ name, email }` and returning appropriate HTTP status codes (201, 400, 404, 409). — Exposes registration capability to frontend.

- **Registration Form (Frontend)**: UI component on the session card or detail page allowing employees to input name and email and submit registration. — User interaction point for registration.

### Key Business Rules

- **Capacity Constraint**: A session cannot accept registrations when `registered >= capacity`. This is the core invariant governing the Registration → TrainingSession relationship.
- **Required Fields**: Both `name` and `email` are mandatory for registration. Missing either results in HTTP 400.
- **Session Existence**: Registration can only occur against an existing session. Non-existent session IDs return HTTP 404.
- **Count Increment**: Successful registration atomically increments `TrainingSession.registered` by 1.
- **No Duplicate Prevention**: Out of scope — the same employee can register multiple times for the same session.
- **No Authentication**: Out of scope — registration is anonymous (name + email only).

---

## Strategic Approach

### Solution Direction

Implement a transactional registration endpoint following the existing layered architecture (Route → Service → Prisma). The flow:

1. **Frontend**: Add a registration form to `TrainingSessionCard` (or a session detail view) with name/email inputs and a submit button. Disable/hide the form when `registered >= capacity`.
2. **API Route**: Add `POST /api/training-sessions/:id/registrations` to the existing `training-sessions.ts` router.
3. **Service Layer**: Create `registrationService.ts` with a `registerForSession` function that validates input, checks session existence, verifies capacity, creates the registration record, and increments the session's registered count — all within a database transaction.
4. **Prisma Schema**: Add a `Registration` model with fields for id, name, email, session relation, and createdAt. Keep `TrainingSession.registered` as a denormalized counter for fast reads.
5. **Error Handling**: Return appropriate HTTP status codes (201, 400, 404, 409) with descriptive error messages.

### Key Design Decisions

- **Denormalized counter vs. computed count**: Storing `registered` on the session row (current approach) vs. computing `COUNT(*)` from registrations table.
  - *Trade-offs*: Denormalized counter is faster for reads (O(1) vs O(n)) but requires careful transactional updates. Computed count is always accurate but slower and harder to use in capacity checks within transactions.
  - *Recommendation*: Keep the denormalized `registered` field on `TrainingSession` and update it transactionally with the registration creation. This matches the existing schema design and frontend expectations.

- **Transaction scope**: Use Prisma's interactive transaction (`prisma.$transaction`) to atomically create the registration and increment the count.
  - *Trade-offs*: Interactive transactions hold a connection longer but ensure atomicity. Without a transaction, a crash between insert and increment would corrupt the count.
  - *Recommendation*: Use `prisma.$transaction(async (tx) => { ... })` to wrap both operations.

- **Race condition handling**: Two concurrent registrations for the last spot could both pass the capacity check.
  - *Trade-offs*: Serializable isolation or atomic conditional update (`UPDATE ... SET registered = registered + 1 WHERE registered < capacity`) vs. optimistic locking with a version field.
  - *Recommendation*: Use an atomic conditional update: `UPDATE training_sessions SET registered = registered + 1 WHERE id = ? AND registered < capacity`. Check affected rows — if 0, the session is full. This is simpler than serializable isolation and works well with SQLite.

- **Registration model vs. inline storage**: Creating a separate `Registration` table vs. storing registrations as JSON on the session.
  - *Trade-offs*: Separate table is normalized, queryable, and extensible (for future features like cancellation, waitlist, email). JSON storage is simpler but not queryable and harder to migrate.
  - *Recommendation*: Create a proper `Registration` model. This aligns with the existing Prisma patterns and supports future WH stories (WH-3 waitlist, WH-4 cancellation, WH-8 email).

### Alternatives Considered

- **Computed count without stored counter**: Rejected because the frontend already relies on `session.registered` for display, and changing this would require frontend refactoring beyond the scope of this story.
- **Optimistic locking with version field**: Rejected as over-engineered for SQLite's single-writer model. The atomic conditional update is sufficient and simpler.
- **Storing registrations as JSON array on session**: Rejected because it doesn't scale, isn't queryable, and conflicts with Prisma's relational model approach.

---

## Risk & Gap Analysis

### Requirement Ambiguities

- **Email format validation**: The requirement says "email" but doesn't specify whether to validate email format. Should a malformed email return 400? *Assumption: Basic presence check only; format validation is out of scope unless specified.*
- **Name length constraints**: No maximum length specified for name. *Assumption: Use a reasonable default (e.g., 255 chars) consistent with database field limits.*
- **Session status check**: The `TrainingSession` has a `status` field (default "active"). Should registration be blocked for non-active sessions? *Assumption: Only check capacity; status filtering is out of scope for this story.*
- **Response body shape**: The requirement says "returns HTTP 201 with registration details" but doesn't specify the exact shape. *Assumption: Return the created Registration object with id, name, email, sessionId, and createdAt.*

### Edge Cases

- **Concurrent registration for last spot**: Two employees submit simultaneously when only 1 spot remains. *Mitigation: Atomic conditional update ensures only one succeeds; the other gets 409.*
- **Session deleted between page load and registration**: Employee loads page, session gets deleted by admin, employee submits registration. *Mitigation: 404 check inside the transaction handles this.*
- **Negative or zero capacity**: A session with capacity 0 or negative should never accept registrations. *Mitigation: The `registered < capacity` check naturally handles this (0 < 0 is false).*
- **Very long input values**: Extremely long name/email strings could cause database errors. *Mitigation: Add reasonable max length validation (e.g., 255 chars) returning 400.*
- **Duplicate email for same session**: Out of scope per requirements, but worth noting that the same email can register multiple times. *No mitigation needed for this story.*

### Technical Risks

- **SQLite transaction limitations**: SQLite has limited concurrency support. Long-running transactions could block other writers. *Mitigation: Keep transactions short — only the registration insert and count increment.*
- **Prisma interactive transaction compatibility**: Ensure the Prisma version supports interactive transactions with SQLite. *Mitigation: Verify Prisma version in package.json; interactive transactions are supported since Prisma 2.29+.*
- **Frontend state consistency**: After successful registration, the frontend must update the displayed count. *Mitigation: Return the updated session or registration with new count; frontend updates local state.*
- **Missing database migration**: Adding the Registration model requires a migration. *Mitigation: Run `pnpm exec prisma db push` to apply schema changes.*

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| 1 | Register button/form visible on session card | Yes | Frontend work needed on TrainingSessionCard |
| 2 | Employee provides name and email | Yes | Form inputs for both fields |
| 3 | Registered count increments by 1 on success | Yes | Atomic increment in transaction |
| 4 | Confirmation message shown | Yes | Frontend toast/alert on 201 response |
| 5 | Register button disabled/hidden when full | Yes | Already has `isFull` logic; extend to form |
| 6 | POST endpoint accepts {name, email}, returns 201 | Yes | New route + service |
| 7 | Returns 400 if required fields missing | Yes | Input validation in service |
| 8 | Returns 409 if session is full | Yes | Capacity check in transaction |
| 9 | Returns 404 if session does not exist | Yes | Session lookup in transaction |

**All 9 ACs are addressable with the proposed approach. No gaps identified.**

---

*Analysis generated: 2026-09-29 14:42*  
*Project: WorkshopHub (Express + Prisma + SQLite + React + Vite + TypeScript)*  
*Branch: wh-2-employee-can-register-for-an-available-training-session*