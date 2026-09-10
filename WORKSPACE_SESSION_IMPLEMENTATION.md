# Workspace Session Implementation — Backend Changes

Implements the design in
`../Authentication & Workspace Session Architecture — Final Summary.md`:
one parent device session, one current workspace session per device, and a
short-lived one-time handoff token that carries the user from the root origin
to a workspace origin.

Everything below lives in the API gateway unless stated otherwise.

---

## Redis model

| Key | Type | Fields | TTL |
|---|---|---|---|
| `deviceId:{deviceId}` | hash | `userId`, `workspaceId?`, `permission?` (JSON), `workspaceSessionId?` | `SESSION_TTL` (default 3600s) |
| `workspaceSession:{sessionId}` | hash | `deviceId`, `workspaceId` | inherits the parent's **remaining** TTL (`PTTL`) |
| `auth-handoff:{sha256(token)}` | string | JSON `{ deviceId, workspaceId }` | `HANDOFF_TOKEN_TTL` (default 30s) |

### Deviation from the design doc

The doc keys the workspace session as `workspaceSession:{deviceId}`. The
implementation keys it by its own random `sessionId` and stores a pointer to
it on the parent (`workspaceSessionId`). The **workspace cookie holds that
`sessionId`, never the `deviceId`**, so a workspace domain (and later a
customer custom domain) never learns the long-lived parent id.

Every guarantee from the doc is preserved:

- exactly one workspace session per device — creating a new one deletes the
  old one in the same `MULTI`, and `attachWorkspaceToSession` drops the old one
  when a new workspace is selected;
- the workspace session can never outlive the parent (TTL is copied from the
  parent's `PTTL`, and `createWorkspaceSession` throws if the parent is gone);
- logout removes the parent and the workspace session it points at;
- a workspace session whose parent has moved to a different workspace is
  treated as dead and cleaned up on the next request.

---

## HTTP endpoints (gateway)

| Method | Path | Body | Auth | Returns |
|---|---|---|---|---|
| `POST` | `/select-workspace` | `{ workspaceId }` (nanoId) | parent **or** workspace cookie | `{ token, workspaceId }` |
| `POST` | `/auth/consume` | `{ token }` | none — must come from the matching workspace `Origin` | `{ workspaceId }` + sets `workspaceSessionId` cookie |
| `GET` | `/user/me` | — | either cookie | `{ userId, workspaceId, permission }` (unchanged shape) |
| `POST` | `/user/logout` | — | either cookie | clears both cookies, deletes both keys |

Existing `/user/login` and proxied `/user/*`, `/org/*` routes are unchanged
in contract, with one addition:

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/org/workspace/current` | either cookie | public details of the workspace the session points at (`name`, `nanoId`, `description`, `ownerId`, `logo`); `400` if no workspace is selected |

### Organization service (service-to-service only)

| Method | Path | Header | Returns |
|---|---|---|---|
| `GET` | `/internal/permission/:workspaceNanoId` | `x-user-id`, `x-gateway-token` | the user's active `Permission` document, or `403` |

"Active" means `isDeleted: false` and `invite.status` in
`[Accepted, NotRequired]`.

The gateway refuses `/org/internal/*` before the proxy, so this route is not
reachable from a browser.

---

## Flow

### 1. Select workspace — `POST /select-workspace`

1. `resolveSession` → parent session (works from the root origin via the
   `deviceId` cookie **and** from a workspace origin via the workspace cookie,
   so switching from inside a workspace works).
2. Validate `workspaceId` against the nanoid alphabet.
3. `GET {ORG_SERVICE_URL}/internal/permission/{workspaceId}` → permission or
   `403`.
4. `attachWorkspaceToSession` — one `MULTI`:
   - `HSET deviceId:{id} workspaceId permission`
   - `HDEL deviceId:{id} workspaceSessionId`
   - `DEL workspaceSession:{old}` if one existed
5. `createHandoffToken` — 32 random bytes (`base64url`), stored as
   `SET auth-handoff:{sha256} … EX 30 NX`. The raw token is returned once and
   never persisted.

The frontend then navigates to
`http://company.{workspaceId}.localhost:3000/auth/consume?token=…`.

### 2. Consume — `POST /auth/consume`

1. `Origin` header must match `WORKSPACE_ORIGIN_TEMPLATE`; the workspace id
   embedded in it is extracted.
2. `GETDEL auth-handoff:{sha256(token)}` — atomic, so a token succeeds at most
   once. Missing/expired/replayed → `401`.
3. The token's `workspaceId` must equal the id from the `Origin` (a token
   minted for workspace A cannot be redeemed on workspace B's origin).

   > Workspace ids become DNS labels, and **browsers lowercase hostnames**, so
   > an id containing uppercase never survives the round trip: `kJqUAr` comes
   > back as `company.kjquar.localhost` and fails this check. Ids are therefore
   > minted lowercase `a-z0-9` (`createHostSafeId`), and `[a-z0-9]` is the only
   > shape treated as a valid id. Any workspace created before that change is
   > unreachable and must be migrated.
4. Parent must still exist **and** its current `workspaceId` must equal the
   token's (a token from an abandoned selection cannot re-open the workspace
   the user already left).
5. `createWorkspaceSession` — one `MULTI`:
   - `HSET workspaceSession:{new} deviceId workspaceId`
   - `PEXPIRE workspaceSession:{new} <parent PTTL>`
   - `HSET deviceId:{id} workspaceSessionId {new}`
   - `DEL workspaceSession:{old}` if one existed
6. Set the `workspaceSessionId` cookie (HttpOnly, Path=/, Secure + SameSite=None
   in production, Lax otherwise).

### 3. Any authenticated request — `resolveSession`

```
workspaceSessionId cookie
        ↓
workspaceSession:{sessionId}  →  deviceId, workspaceId
        ↓
deviceId:{deviceId}           →  userId, permission
        ↓  (parent.workspaceId must equal the workspace session's)
authorised
```

If no workspace cookie is present (root origin) the `deviceId` cookie is
resolved directly. If the workspace cookie is present but dead (parent gone,
or parent switched workspace), the key is deleted and the cookie cleared, then
the `deviceId` cookie is tried.

`authGate` uses the same resolver and forwards `x-user-id`,
`x-workspace-nano-id`, `x-workspace-permission` to the services. It now also
strips all three headers (plus the gateway token) from incoming requests
before setting them, so none can be spoofed.

### 4. Logout — `POST /user/logout`

`resolveSession` → `removeUserSession(deviceId)` (deletes the parent and the
workspace session it points at) → clear both cookies. Works from either
origin.

---

## Files changed

### API gateway — `apps/api-gateway/src`

| File | Change |
|---|---|
| `utils/redis.ts` | **Rewritten.** Parent session helpers (`getUserSession`, `storeUserSession`, `attachWorkspaceToSession`, `removeUserSession`), workspace session helpers (`getWorkspaceSession`, `createWorkspaceSession`, `removeWorkspaceSession`), handoff helpers (`createHandoffToken`, `consumeHandoffToken`), and both cookies (`setSessionCookie`/`clearSessionCookie`, `setWorkspaceCookie`/`clearWorkspaceCookie`). Session hash fields are now `userId` / `workspaceId` / `permission` / `workspaceSessionId` instead of the header-name keys. Key prefix fixed from `"deviceId:- "` (with a space) to `"deviceId:"` — **existing dev sessions need a re-login**. `switchWorkspaceSession` was replaced by `attachWorkspaceToSession`. |
| `auth/resolveSession.ts` | **New.** Single resolver described above; returns `{ deviceId, userId, workspaceId, permission, via }` or `null`. |
| `auth/origins.ts` | **New.** `isTrustedOrigin`, `workspaceIdFromOrigin`, `workspaceOriginFor`, `isValidWorkspaceId`, built from `APP_ORIGIN` and `WORKSPACE_ORIGIN_TEMPLATE`. |
| `utils/orgClient.ts` | **New.** `getWorkspacePermission({ userId, workspaceId })` — signed internal call to the org service. |
| `controller/authController.ts` | Added `selectWorkspace` and `consumeHandoff`. `me` and `logout` now use `resolveSession`; `logout` clears both cookies. `login` unchanged. |
| `middleware/authGate.ts` | Uses `resolveSession`; strips workspace/permission headers as well as the user-id header. |
| `index.ts` | CORS `origin` is now a function accepting the root origin and any workspace origin. Registered `POST /select-workspace` and `POST /auth/consume`. |
| `proxies/index.ts` | Blocks `/org/internal/*` with a 404 before the org proxy. |

### Organization service — `apps/organization/src`

| File | Change |
|---|---|
| `controllers/permission/service.ts` | Added `getActivePermission({ userId, workspaceNanoId })`. Fixed `createPermission`: it used `find()` (an array, always truthy) so every create reported "already a part of this workspace", and it dropped `workspaceId`, which the schema requires — creating a workspace never actually succeeded. Errors are now thrown as `OperationalError` instead of writing a response and continuing. |
| `controllers/permission/permission.ts` | Added the `getActivePermission` handler (`403` when no active permission). |
| `controllers/workspace/service.ts` | Errors are thrown as `OperationalError` (the previous `errorResponse` + fall-through sent two responses, and `getWorkspace` dereferenced a null). |
| `controllers/workspace/workspace.ts` | Added `getCurrentWorkspace` (reads the workspace id from the gateway header). |
| `routes/workspaceRoute.ts` | Added `GET /current`, registered before `/:workspaceId`. |
| `routes/internalRoute.ts` | **New.** `GET /permission/:workspaceNanoId`. |
| `routes/index.ts` | Mounts `/internal`. |

### Shared package — `packages/src`

| File | Change |
|---|---|
| `utility/nanoId.ts` | Added `createHostSafeId(size = 8)` — lowercase `a-z0-9` via nanoid's `customAlphabet`. Used for workspace ids because they become DNS labels; the default alphabet is mixed case with `_`/`-`, and browsers lowercase hostnames, which broke the consume step's origin check. `createNanoId` is unchanged and still used elsewhere. |

### Environment — `.env`, `.env.example`

```dotenv
# Sessions (seconds)
SESSION_TTL=3600
HANDOFF_TOKEN_TTL=30

# Browser origins the gateway trusts. {workspaceId} is substituted per workspace.
APP_ORIGIN=http://localhost:3000
WORKSPACE_ORIGIN_TEMPLATE=http://company.{workspaceId}.localhost:3000
```

All four have code defaults matching these values. Requires Redis ≥ 6.2 for
`GETDEL` (dev is on 7.4).

---

## Verification

- `tsc --noEmit` passes for `api-gateway`, `organization`, `user-service`.
- A smoke script against the live Redis confirmed: the raw token is never a
  key (only its hash), handoff TTL is 30s, a consumed token cannot be replayed,
  the workspace session's TTL is bounded by the parent's, selecting a new
  workspace removes the old workspace session, only one workspace session
  exists per device after repeated consumes, logout removes both keys, and a
  workspace session cannot be created for a missing parent.

- An HTTP end-to-end run against the live gateway, org and user services
  (two cookie jars standing in for the two browser origins) confirmed:
  register → login → create workspace → list → select (unknown workspace
  `403`) → consume (`401` on the wrong workspace origin, `403` on an untrusted
  origin, `200` sets only `workspaceSessionId` — never `deviceId` — and a
  replay is `401`) → `/user/me` and `/org/workspace/current` via the workspace
  cookie → `/org/internal/*` is `404` → logout from the workspace origin clears
  its cookie and kills the root `deviceId` session too.

Not yet exercised: the same flow driven from a real browser.

---

## Security checklist (from the design doc)

| Requirement | Where |
|---|---|
| Cryptographically secure random token | `randomBytes(32)` in `createHandoffToken` |
| Short-lived | `EX 30` |
| Single-use | `GETDEL` in `consumeHandoffToken` |
| Stored hashed | key is `sha256(token)`; raw token is never written |
| Atomically consumed | `GETDEL` |
| Never exposes the `deviceId` | token is random; workspace cookie holds `sessionId`, not `deviceId` |
| Removed from the URL after use | frontend `ConsumeToken.tsx` (`history.replaceState`) |
| Workspace cookie HttpOnly / Secure / SameSite / Path=/ | `cookieOptions()` in `utils/redis.ts` |
| CORS limited to trusted origins | `isTrustedOrigin` in `index.ts` |
| Origin bound to the token's workspace | `consumeHandoff` |

---

## Open items / follow-ups

1. **Cookie topology (resolved on the frontend).** Every origin used to call
   the same gateway host (`localhost:7000`), so both cookies landed on
   `localhost` and `SameSite=Lax` would not send them cross-site from
   `company.<id>.localhost:3000`. `frontend/src/utility/origin.ts` now points
   the API at the page's own hostname whenever the configured API host equals
   the root app host, so each origin carries its own cookie to
   `<its host>:7000`. `SESSION_COOKIE_DOMAIN=.localhost` in `.env` is unused
   and can be removed — browsers reject `Domain=localhost`, and the design
   intentionally does not share cookies across domains.
2. `validateBody` in `packages` calls `next()` twice on failure; body
   validation in the new endpoints is done inline for that reason.
3. Session TTL is fixed at login (no sliding refresh). If a sliding window is
   wanted, refresh both `deviceId:{id}` and `workspaceSession:{id}` together in
   `resolveSession`.
4. `createWorkspace` inserts the workspace before its owner permission; if the
   second write fails the workspace is orphaned. A Mongo transaction (or
   deleting the workspace on failure) would close that gap.
