const REFRESH_MS = 4 * 60 * 1000;

export function buildQrPayload(phone: string, now = Date.now()): string {
  return JSON.stringify({
    ver: 1,
    typ: "client_id",
    phone,
    ts: Math.floor(now / 1000),
  });
}

export function qrRefreshIntervalMs(): number {
  return REFRESH_MS;
}
