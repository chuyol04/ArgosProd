export const ACTIVE_CLIENT_COOKIE = "active_client_id";

export function parseActiveClientId(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const clientId = Number(value);
  return Number.isSafeInteger(clientId) && clientId > 0 ? clientId : undefined;
}
