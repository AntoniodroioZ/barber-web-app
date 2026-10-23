import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  cancelPublicAppointment,
  createPublicAppointment,
  getPublicServices,
  getPublicSlots,
} from "../api/client";
import type { PublicAppointmentCreated, PublicService, TimeSlot } from "../api/types";
import {
  listAppointmentsForStation,
  removeAppointment,
  saveAppointment,
  type StoredAppointment,
} from "../lib/appointment-storage";
import {
  formatAppointmentWhen,
  formatDateChip,
  formatSlotTime,
  upcomingDates,
} from "../lib/datetime";
import {
  digitsOnly,
  formatPhone,
  readStoredPhone,
  storePhone,
  toMexicoE164,
} from "../lib/phone";

type Step = "services" | "date" | "slot" | "details" | "done";

type Props = {
  barberId: string;
  branchId: string;
  timezone: string;
  barberName: string;
};

function bookingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "No se pudo completar la reserva.";
  if (error.status === 409) {
    return "Ese horario ya no está disponible o ya tienes una cita activa.";
  }
  if (error.status === 404) {
    return "Las citas no están disponibles en este momento.";
  }
  if (error.status === 429) {
    return "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";
  }
  return error.message || "No se pudo completar la reserva.";
}

export function BookingFlow({ barberId, branchId, timezone, barberName }: Props) {
  const [step, setStep] = useState<Step>("services");
  const [services, setServices] = useState<PublicService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [service, setService] = useState<PublicService | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);

  const [fullName, setFullName] = useState("");
  const [digits, setDigits] = useState(() => {
    const stored = readStoredPhone();
    return stored ? stored.replace(/^\+52/, "") : "";
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [created, setCreated] = useState<PublicAppointmentCreated | null>(null);
  const [mine, setMine] = useState<StoredAppointment[]>(() =>
    listAppointmentsForStation(barberId, branchId),
  );
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const dates = upcomingDates(timezone, 14);
  const hasActiveAppointment = mine.length > 0;
  const canBook = !hasActiveAppointment;

  useEffect(() => {
    setMine(listAppointmentsForStation(barberId, branchId));
    setStep("services");
    setService(null);
    setDate(null);
    setSlot(null);
    setCreated(null);
    setSlots([]);
    setServicesError(null);
  }, [barberId, branchId]);

  useEffect(() => {
    if (!canBook) return;

    let cancelled = false;
    setLoadingServices(true);
    setServicesError(null);

    getPublicServices(barberId, branchId)
      .then((data) => {
        if (!cancelled) setServices(data.services ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setServicesError(bookingErrorMessage(error));
        setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });

    return () => {
      cancelled = true;
    };
  }, [barberId, branchId, canBook]);

  useEffect(() => {
    if (!canBook || !service || !date) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    setSlot(null);

    getPublicSlots(barberId, branchId, service.id, date)
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSlotsError(bookingErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [barberId, branchId, service, date, canBook]);

  function pickService(next: PublicService) {
    if (!canBook) return;
    setService(next);
    setDate(null);
    setSlot(null);
    setStep("date");
  }

  function pickDate(next: string) {
    if (!canBook) return;
    setDate(next);
    setSlot(null);
    setStep("slot");
  }

  function pickSlot(next: TimeSlot) {
    if (!canBook) return;
    setSlot(next);
    setStep("details");
  }

  function goBack() {
    setFormError(null);
    if (step === "date") {
      setService(null);
      setStep("services");
      return;
    }
    if (step === "slot") {
      setDate(null);
      setSlot(null);
      setStep("date");
      return;
    }
    if (step === "details") {
      setSlot(null);
      setStep("slot");
    }
  }

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    if (!canBook || !service || !slot) return;

    const name = fullName.trim();
    if (name.length < 2) {
      setFormError("Ingresa tu nombre.");
      return;
    }

    const phone = toMexicoE164(digits);
    if (!phone) {
      setFormError("Ingresa los 10 dígitos de tu celular.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const appointment = await createPublicAppointment(barberId, branchId, {
        service_id: service.id,
        starts_at: slot.starts_at,
        phone_number: phone,
        full_name: name,
      });
      storePhone(phone);
      const stored: StoredAppointment = {
        id: appointment.id,
        manage_token: appointment.manage_token,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        service_name: appointment.service_name,
        barber_name: appointment.barber_name,
        barber_id: barberId,
        branch_id: branchId,
      };
      saveAppointment(stored);
      setMine(listAppointmentsForStation(barberId, branchId));
      setCreated(appointment);
      setStep("done");
    } catch (error: unknown) {
      setFormError(bookingErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMine(item: StoredAppointment) {
    setCancelBusyId(item.id);
    setCancelError(null);
    try {
      await cancelPublicAppointment(item.manage_token);
      removeAppointment(item.id);
      const next = listAppointmentsForStation(barberId, branchId);
      setMine(next);
      setCreated(null);
      setService(null);
      setDate(null);
      setSlot(null);
      setStep("services");
    } catch (error: unknown) {
      setCancelError(bookingErrorMessage(error));
    } finally {
      setCancelBusyId(null);
    }
  }

  function renderActiveAppointments(options?: { highlightId?: string }) {
    return (
      <div className="booking-mine">
        <p className="booking-mine-title">
          {mine.length === 1 ? "Tu cita activa" : "Tus citas activas"}
        </p>
        <p className="muted booking-limit-hint">
          Cancela la cita actual si quieres agendar otra. Cuando se cumpla, podrás
          reservar de nuevo.
        </p>
        <ul>
          {mine.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.service_name}</strong>
                <p className="muted">
                  {formatAppointmentWhen(item.starts_at, timezone)} · {item.barber_name}
                </p>
              </div>
              <button
                type="button"
                className="text-button danger"
                disabled={cancelBusyId === item.id}
                onClick={() => cancelMine(item)}
              >
                {cancelBusyId === item.id ? "Cancelando…" : "Cancelar"}
              </button>
            </li>
          ))}
        </ul>
        {options?.highlightId && created?.id === options.highlightId ? (
          <p className="muted">
            Te avisamos con el teléfono {formatPhone(toMexicoE164(digits) ?? digits)}.
          </p>
        ) : null}
        {cancelError ? <p className="error">{cancelError}</p> : null}
      </div>
    );
  }

  return (
    <section className="card booking-card">
      <h2>{hasActiveAppointment ? "Tu cita" : "Agendar cita"}</h2>
      <p className="muted booking-with">Con {barberName}</p>

      {hasActiveAppointment ? (
        step === "done" && created ? (
          <div className="booking-done">
            <p className="banner">Cita confirmada</p>
            {renderActiveAppointments({ highlightId: created.id })}
          </div>
        ) : (
          renderActiveAppointments()
        )
      ) : null}

      {canBook && step === "services" ? (
        <>
          {loadingServices ? <p className="muted">Cargando servicios…</p> : null}
          {servicesError ? <p className="error">{servicesError}</p> : null}
          {!loadingServices && !servicesError && services.length === 0 ? (
            <p className="muted">No hay servicios disponibles.</p>
          ) : null}
          <ul className="booking-list">
            {services.map((item) => (
              <li key={item.id}>
                <button type="button" className="booking-option" onClick={() => pickService(item)}>
                  <span>{item.name}</span>
                  <span className="muted">{item.duration_minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {canBook && step === "date" && service ? (
        <>
          <button type="button" className="text-button" onClick={goBack}>
            ← {service.name}
          </button>
          <p className="booking-step-label">Elige el día</p>
          <ul className="booking-chips">
            {dates.map((day) => (
              <li key={day}>
                <button type="button" className="chip-button" onClick={() => pickDate(day)}>
                  {formatDateChip(day, timezone)}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {canBook && step === "slot" && service && date ? (
        <>
          <button type="button" className="text-button" onClick={goBack}>
            ← {formatDateChip(date, timezone)}
          </button>
          <p className="booking-step-label">Elige la hora</p>
          {loadingSlots ? <p className="muted">Buscando horarios…</p> : null}
          {slotsError ? <p className="error">{slotsError}</p> : null}
          {!loadingSlots && !slotsError && slots.length === 0 ? (
            <p className="muted">No hay horarios ese día. Prueba otra fecha.</p>
          ) : null}
          <ul className="booking-chips">
            {slots.map((item) => (
              <li key={item.starts_at}>
                <button type="button" className="chip-button" onClick={() => pickSlot(item)}>
                  {formatSlotTime(item.starts_at, timezone)}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {canBook && step === "details" && service && slot ? (
        <>
          <button type="button" className="text-button" onClick={goBack}>
            ← {formatSlotTime(slot.starts_at, timezone)}
          </button>
          <p className="booking-summary">
            {service.name} · {formatAppointmentWhen(slot.starts_at, timezone)}
          </p>
          <form onSubmit={submitBooking} className="booking-form">
            <label htmlFor="booking-name">Nombre</label>
            <input
              id="booking-name"
              name="full_name"
              autoComplete="name"
              maxLength={120}
              placeholder="Tu nombre"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setFormError(null);
              }}
            />
            <label htmlFor="booking-phone">Celular</label>
            <div className="phone-field">
              <span className="prefix">+52</span>
              <input
                id="booking-phone"
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10 dígitos"
                value={digits}
                onChange={(event) => {
                  setDigits(digitsOnly(event.target.value).slice(0, 10));
                  setFormError(null);
                }}
              />
            </div>
            {formError ? <p className="error">{formError}</p> : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Reservando…" : "Confirmar cita"}
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
