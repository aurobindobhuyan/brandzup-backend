import {
  GATEWAY_HEADER_USER_ID,
  GATEWAY_TOKEN_HEADER,
  IPermission,
  OperationalError,
} from "packages";

import { createGatewayToken } from "@src/utils/gatewayToken";

const ORG_SERVICE_URL = process.env.ORG_SERVICE_URL!;

/**
 * Asks the organization service whether the user may enter the workspace and
 * returns their permission for it. Service-to-service only, signed with the
 * gateway token like the login call.
 */
export async function getWorkspacePermission({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<IPermission> {
  const upstream = await fetch(
    `${ORG_SERVICE_URL}/internal/permission/${encodeURIComponent(workspaceId)}`,
    {
      method: "GET",
      headers: {
        [GATEWAY_HEADER_USER_ID]: userId,
        [GATEWAY_TOKEN_HEADER]: createGatewayToken(),
      },
    },
  );

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok || !payload?.success) {
    throw new OperationalError(
      upstream.ok ? 403 : upstream.status,
      payload?.message ?? "You do not have access to this workspace",
    );
  }

  return payload.data as IPermission;
}
