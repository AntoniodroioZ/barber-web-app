import { apiOrigin } from "./client";
import type { StatusUpdate } from "./types";

export function subscribeStatus(
  barberId: string,
  branchId: string,
  onUpdate: (update: StatusUpdate) => void,
  onConnection: (connected: boolean) => void,
): () => void {
  const url = `${apiOrigin()}/api/v1/public/barbers/${encodeURIComponent(barberId)}/branches/${encodeURIComponent(branchId)}/status/stream`;
  const source = new EventSource(url);

  source.addEventListener("status_update", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent<string>).data) as {
        status: StatusUpdate["status"];
        updated_at: string;
      };
      onUpdate({ status: data.status, updated_at: data.updated_at });
      onConnection(true);
    } catch {
      // Ignore a malformed event and keep the last known status.
    }
  });

  source.onopen = () => onConnection(true);
  source.onerror = () => onConnection(false);

  return () => source.close();
}
