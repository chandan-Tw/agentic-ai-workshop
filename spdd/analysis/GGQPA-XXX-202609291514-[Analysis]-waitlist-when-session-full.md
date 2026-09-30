# SPDD Analysis: Waitlist When Training Session Is Full

## Original Business Requirement

**Trello Card:** https://trello.com/c/UZAPsHQN/3-wh-3-waitlist-when-a-training-session-is-full

**Type:** Story  
**Priority:** Medium

### Context
After WH-2 is implemented, a session can fill up. When a session reaches capacity, subsequent employees who want to attend should be placed on a waitlist rather than being turned away. This ensures demand is captured and can be fulfilled if a registered employee cancels (WH-4 → WH-5).

This is a trainee exercise story. It is not implemented in the baseline template.

### Description
As an employee, I want to join a waitlist for a full training session so that I can attend if a place becomes available.

When a session is full, an employee can join the waitlist. The system records their position and informs them they are waitlisted, not confirmed.

### Acceptance Criteria

1. When registered >= capacity, new registrations are added to the waitlist
2. The waitlisted employee sees a message confirming they are waitlisted (not confirmed)
3. The session card shows a "Join Waitlist" option when the session is full
4. POST /api/training-sessions/:id/registrations returns HTTP 202 with { status: "waitlisted", position: N } when full
5. Waitlisted registrations have status waitlisted in the database
6. Confirmed registrations have status confirmed

### Out of Scope
- Promotion from waitlist (WH-5)
- Cancellation (WH-4)
- Email notification (WH-8)
- Maximum waitlist size

### Suggested Tests
- POST when session is full → 202 with status: "waitlisted"
- POST when session has space → 201 with status: "confirmed"
- Waitlisted count is tracked separately from registered count
- Position in waitlist is correct (1st, 2nd, etc.)

### Data Model Hint
The Registration model should include a status field: confirmed | waitlisted | cancelled.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **TrainingSession**: Core entity with `registered` counter and `capacity` field. The `registered >= capacity` check determines if a session is full. — Governs waitlist trigger condition.

- **Registration**: Employee sign-up record with id, name, email, sessionId, createdAt. Currently has no status field. — Must be extended to support waitlist status.

- **Registration Service**: Business logic handling validation, session lookup, capacity check, and atomic registration creation. Currently throws `ConflictError` when full. — Must be modified to create waitlisted registrations instead of rejecting.

- **Registration API**: `POST /api/training-sessions/:id/registrations` endpoint. Currently returns 201 for success, 409 for full. — Must return 202 for waitlisted registrations.

- **TrainingSessionCard**: Frontend component showing session details and registration form. Currently hides form when full. — Must show "Join Waitlist" option when full.

### New Concepts Required

- **Registration Status**: A new field on the Registration model with values: `confirmed`, `waitlisted`, `cancelled`. Defaults to `confirmed` for new registrations when capacity is available. — Extends Registration entity.

- **Waitlist Position**: A computed or stored value indicating the employee's position in the waitlist queue (1st, 2nd, etc.). Calculated as the count of existing waitlisted registrations for that session + 1. — Derived from Registration records with status `waitlisted`.

- **Waitlist Logic**: Business rule that determines whether a new registration is confirmed or waitlisted based on current capacity. When `registered < capacity`, status is `confirmed` and count increments. When `registered >= capacity`, status is `waitlisted` and count does not increment. — Core waitlist workflow.

### Key Business Rules

- **Capacity Threshold**: Registration is confirmed only when `registered < capacity`. When `registered >= capacity`, registration is waitlisted.
- **Status Persistence**: Each registration record stores its status (`confirmed` or `waitlisted`) in the database.
- **Position Ordering**: Waitlist position is determined by creation order (FIFO). The first waitlisted employee is position 1, second is position 2, etc.
- **No Count Increment for Waitlist**: Waitlisted registrations do not increment the `registered` counter on TrainingSession.
- **No Maximum Waitlist Size**: Out of scope — waitlist can grow indefinitely.
- **No Duplicate Prevention**: Out of scope — same employee can join waitlist multiple times.

---

## Strategic Approach

### Solution Direction

Modify the existing registration flow to support dual-mode operation (confirmed vs. waitlisted) based on session capacity. The flow:

1. **Prisma Schema**: Add `status` field to `Registration` model with default value `"confirmed"`. Add `waitlistedCount` field to `TrainingSession` for O(1) waitlist position calculation (optional — can also compute via query).

2. **Service Layer**: Modify `registerForSession` to:
   - Check capacity as before
   - If capacity available: create registration with status `confirmed`, increment `registered` count (existing behavior)
   - If full: create registration with status `waitlisted`, compute position as count of existing waitlisted registrations + 1, return with position

3. **API Route**: Modify response handling:
   - Return 201 with registration details when confirmed
   - Return 202 with `{ status: "waitlisted", position: N }` when waitlisted

4. **Frontend**: Modify `TrainingSessionCard` to:
   - Show "Join Waitlist" button when session is full (instead of hiding form)
   - Show "Register" button when session has space
   - Display appropriate message based on response status (201 vs 202)

### Key Design Decisions

- **Status field vs. separate waitlist table**: Adding a `status` field to the existing Registration model vs. creating a separate Waitlist model.
  - *Trade-offs*: Status field is simpler, requires no schema restructuring, and keeps all registrations in one table. Separate table would require joins and more complex queries.
  - *Recommendation*: Add `status` field to Registration model. This aligns with the data model hint and keeps the schema simple.

- **Waitlist position storage vs. computation**: Storing position on the registration record vs. computing it dynamically.
  - *Trade-offs*: Stored position is faster but can become stale if registrations are cancelled/removed. Computed position is always accurate but requires a COUNT query.
  - *Recommendation*: Compute position dynamically at registration time using `COUNT(*) WHERE sessionId = ? AND status = 'waitlisted'`. Store it on the registration record for reference, but it may not reflect current position after cancellations (out of scope for WH-5).

- **Waitlist counter on session vs. query**: Adding `waitlistedCount` to TrainingSession vs. querying the registrations table.
  - *Trade-offs*: Counter is O(1) but requires maintenance. Query is always accurate but O(n).
  - *Recommendation*: Compute via query for simplicity. The waitlist is expected to be small (trainee exercise), so performance is not a concern.

- **HTTP status code for waitlist**: Using 202 (Accepted) vs. 201 (Created) for waitlisted registrations.
  - *Trade-offs*: 202 semantically means "accepted for processing" which fits waitlist (not yet confirmed). 201 means "created" which is technically true but less semantically accurate.
  - *Recommendation*: Use 202 as specified in the acceptance criteria. This clearly distinguishes waitlisted from confirmed registrations.

### Alternatives Considerated

- **Separate waitlist endpoint**: `POST /api/training-sessions/:id/waitlist` — Rejected because the acceptance criteria specify using the same endpoint with different response codes.
- **Rejecting registration when full**: Current WH-2 behavior — Rejected because the requirement explicitly states employees should be waitlisted, not turned away.
- **Separate Waitlist model**: Rejected because it adds unnecessary complexity for a simple status distinction.

---

## Risk & Gap Analysis

### Requirement Ambiguities

- **Position calculation after cancellations**: If a waitlisted employee is promoted (WH-5) or cancelled (WH-4), do positions shift? *Assumption: Out of scope for WH-3. Position is computed at registration time and stored.*
- **Waitlist visibility**: Can employees see their current position after registering? *Assumption: Only the initial position is returned in the API response. Real-time position tracking is out of scope.*
- **Duplicate waitlist entries**: Can the same employee join the waitlist multiple times? *Assumption: Out of scope — no duplicate prevention.*
- **Session status interaction**: Should waitlisting be blocked for non-active sessions? *Assumption: Only check capacity; status filtering is out of scope.*

### Edge Cases

- **Simultaneous waitlist registrations**: Two employees join the waitlist at the same time. *Mitigation: Transaction ensures atomic COUNT + INSERT, but positions may be equal. Acceptable for trainee exercise.*
- **Session becomes full while form is open**: Employee opens registration form, session fills up, employee submits. *Mitigation: Server-side capacity check handles this — returns 202 waitlisted.*
- **Zero capacity session**: A session with capacity 0. *Mitigation: All registrations are waitlisted (registered < capacity is never true).*
- **Negative waitlist position**: Should not occur with proper COUNT logic. *Mitigation: COUNT always returns >= 0, so position >= 1.*

### Technical Risks

- **Schema migration**: Adding a `status` field to existing Registration table requires a migration. *Mitigation: `prisma db push` will add the column with default value.*
- **Existing registrations**: Regrations created before this change will have the default status `confirmed`. *Mitigation: Default value ensures backward compatibility.*
- **Frontend state handling**: Frontend must distinguish between 201 and 202 responses. *Mitigation: Check `response.status` and display appropriate message.*

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| 1 | When registered >= capacity, new registrations are added to waitlist | Yes | Service logic change |
| 2 | Waitlisted employee sees message confirming waitlisted status | Yes | Frontend message display |
| 3 | Session card shows "Join Waitlist" when full | Yes | Frontend button change |
| 4 | POST returns 202 with { status: "waitlisted", position: N } when full | Yes | Route response change |
| 5 | Waitlisted registrations have status waitlisted in database | Yes | Schema + service change |
| 6 | Confirmed registrations have status confirmed | Yes | Schema default value |

**All 6 ACs are addressable with the proposed approach. No gaps identified.**

---

*Analysis generated: 2026-09-29 15:14*  
*Project: WorkshopHub (Express + Prisma + SQLite + React + Vite + TypeScript)*  
*Depends on: WH-2 (Employee Registration)*