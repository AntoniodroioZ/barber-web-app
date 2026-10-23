import type {
  BranchBarber,
  LoyaltyCard,
  PublicAppointmentCreated,
  PublicLogbook,
  PublicService,
  PublicStation,
  SlotDay,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiOrigin(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  return (configured || "http://localhost:8080").replace(/\/$/, "");
}

function stationBase(barberId: string, branchId: string): string {
  return `/api/v1/public/stations/${encodeURIComponent(barberId)}/branches/${encodeURIComponent(branchId)}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Error ${response.status}`;
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Keep the status message when the body is not JSON.
  }
  return new ApiError(response.status, message);
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`);
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getStation(barberId: string, branchId: string): Promise<PublicStation> {
  return getJson(stationBase(barberId, branchId));
}

export function getBranchBarbers(
  barberId: string,
  branchId: string,
): Promise<{ barbers: BranchBarber[] }> {
  return getJson(`${stationBase(barberId, branchId)}/barbers`);
}

export function getPublicServices(
  barberId: string,
  branchId: string,
): Promise<{ services: PublicService[] }> {
  return getJson(`${stationBase(barberId, branchId)}/services`);
}

export function getPublicSlots(
  barberId: string,
  branchId: string,
  serviceId: string,
  date: string,
): Promise<SlotDay> {
  const query = new URLSearchParams({ service_id: serviceId, date });
  return getJson(`${stationBase(barberId, branchId)}/slots?${query}`);
}

export function createPublicAppointment(
  barberId: string,
  branchId: string,
  body: {
    service_id: string;
    starts_at: string;
    phone_number: string;
    full_name: string;
  },
): Promise<PublicAppointmentCreated> {
  return postJson(`${stationBase(barberId, branchId)}/appointments`, body);
}

export function cancelPublicAppointment(
  manageToken: string,
): Promise<{ status: string }> {
  return postJson("/api/v1/public/appointments/cancel", {
    manage_token: manageToken,
  });
}

export function getLoyalty(
  barberId: string,
  branchId: string,
  phone: string,
): Promise<LoyaltyCard> {
  const query = new URLSearchParams({ phone });
  return getJson(`${stationBase(barberId, branchId)}/loyalty?${query}`);
}

export function getLogbook(token: string): Promise<PublicLogbook> {
  const query = new URLSearchParams({ token });
  return getJson(`/api/v1/public/logbook?${query}`);
}
