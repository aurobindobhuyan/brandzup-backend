/**
 * Which browser origins may talk to the gateway, and which workspace an
 * origin belongs to. Both are driven by env so production hosts and, later,
 * customer custom domains can be added without touching code.
 *
 *   APP_ORIGIN                  http://localhost:3000
 *   WORKSPACE_ORIGIN_TEMPLATE   http://company.{workspaceId}.localhost:3000
 */

const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";

const WORKSPACE_ORIGIN_TEMPLATE =
  process.env.WORKSPACE_ORIGIN_TEMPLATE ??
  "http://company.{workspaceId}.localhost:3000";

// Workspace ids become DNS labels, so they are minted lowercase a-z0-9 by
// createHostSafeId. Browsers lowercase hostnames, so anything outside this
// set could not survive the round trip and is not a valid id.
const WORKSPACE_ID_PATTERN = "[a-z0-9]{1,32}";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const workspaceOriginRegex = new RegExp(
  `^${escapeRegExp(WORKSPACE_ORIGIN_TEMPLATE).replace(
    "\\{workspaceId\\}",
    `(${WORKSPACE_ID_PATTERN})`,
  )}$`,
);

export const isValidWorkspaceId = (value: unknown): value is string =>
  typeof value === "string" && new RegExp(`^${WORKSPACE_ID_PATTERN}$`).test(value);

/** The workspace id embedded in a workspace origin, or null for any other origin. */
export const workspaceIdFromOrigin = (origin: string): string | null =>
  workspaceOriginRegex.exec(origin)?.[1] ?? null;

export const workspaceOriginFor = (workspaceId: string) =>
  WORKSPACE_ORIGIN_TEMPLATE.replace("{workspaceId}", workspaceId);

/** Used by CORS: the root app origin or any well-formed workspace origin. */
export const isTrustedOrigin = (origin: string) =>
  origin === APP_ORIGIN || workspaceIdFromOrigin(origin) !== null;
