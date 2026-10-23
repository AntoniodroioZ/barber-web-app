import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, getBranchBarbers, getLoyalty, getStation } from "../api/client";
import { subscribeStatus } from "../api/status-stream";
import type { BarberStatus, BranchBarber, LoyaltyCard, PublicStation } from "../api/types";
import { BarberPicker } from "../components/BarberPicker";
import { BookingFlow } from "../components/BookingFlow";
import { BranchMap } from "../components/BranchMap";
import { BrandedQr } from "../components/BrandedQr";
import { SocialLinks } from "../components/SocialLinks";
import { dayRows, initials, mapsUrl, statusLabel, statusTone } from "../lib/labels";
import {
  clearStoredPhone,
  digitsOnly,
  formatPhone,
  readStoredPhone,
  storePhone,
  toMexicoE164,
} from "../lib/phone";
import { buildQrPayload, qrRefreshIntervalMs } from "../lib/qr-payload";

export function StationPage() {
  const { barberId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branchId = searchParams.get("branch_id")?.trim() ?? "";

  const [station, setStation] = useState<PublicStation | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [loadingStation, setLoadingStation] = useState(Boolean(branchId));

  const [barbers, setBarbers] = useState<BranchBarber[]>([]);

  const [status, setStatus] = useState<BarberStatus | null>(null);
  const [live, setLive] = useState(false);

  const [phone, setPhone] = useState<string | null>(() => readStoredPhone());
  const [digits, setDigits] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [loyalty, setLoyalty] = useState<LoyaltyCard | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);

  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    if (!barberId || !branchId) {
      setLoadingStation(false);
      return;
    }

    let cancelled = false;
    setLoadingStation(true);
    setStation(null);
    setStationError(null);
    setBarbers([]);
    setStatus(null);
    setLive(false);

    getStation(barberId, branchId)
      .then((data) => {
        if (!cancelled) setStation(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setStationError("Esta estación no está disponible.");
          return;
        }
        setStationError(error instanceof ApiError ? error.message : "No se pudo cargar la estación.");
      })
      .finally(() => {
        if (!cancelled) setLoadingStation(false);
      });

    getBranchBarbers(barberId, branchId)
      .then((data) => {
        if (!cancelled) setBarbers(data.barbers ?? []);
      })
      .catch(() => {
        if (!cancelled) setBarbers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [barberId, branchId]);

  useEffect(() => {
    if (!station?.capabilities.walk_in) {
      setLive(false);
      return;
    }
    setStatus(station.current_status);
    return subscribeStatus(
      station.barber_id,
      station.branch_id,
      (update) => {
        setStatus(update.status);
        setBarbers((prev) =>
          prev.map((barber) =>
            barber.user_id === station.barber_id
              ? { ...barber, current_status: update.status, status_updated_at: update.updated_at }
              : barber,
          ),
        );
      },
      setLive,
    );
  }, [station]);

  useEffect(() => {
    if (!station || !phone) return;

    let cancelled = false;
    setLoadingLoyalty(true);
    setLoyalty(null);
    setLoyaltyError(null);

    getLoyalty(station.barber_id, station.branch_id, phone)
      .then((card) => {
        if (!cancelled) setLoyalty(card);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoyaltyError(error instanceof ApiError ? error.message : "No se pudo cargar la racha.");
      })
      .finally(() => {
        if (!cancelled) setLoadingLoyalty(false);
      });

    return () => {
      cancelled = true;
    };
  }, [station, phone]);

  useEffect(() => {
    if (!phone) {
      setQrValue("");
      return;
    }
    const refresh = () => setQrValue(buildQrPayload(phone));
    refresh();
    const timer = window.setInterval(refresh, qrRefreshIntervalMs());
    return () => window.clearInterval(timer);
  }, [phone]);

  if (!branchId) {
    return (
      <main className="page">
        <section className="card empty">
          <h1>Enlace incompleto</h1>
          <p className="error">Falta la sucursal en el enlace.</p>
        </section>
      </main>
    );
  }

  if (loadingStation) {
    return (
      <main className="page">
        <section className="card empty">
          <p className="muted">Cargando estación…</p>
        </section>
      </main>
    );
  }

  if (!station) {
    return (
      <main className="page">
        <section className="card empty">
          <h1>Estación no disponible</h1>
          <p className="error">{stationError ?? "Esta estación no está disponible."}</p>
        </section>
      </main>
    );
  }

  const walkIn = station.capabilities.walk_in;
  const publicBooking = station.capabilities.public_booking;
  const currentStatus = status ?? station.current_status;
  const tone = statusTone(currentStatus);
  const portrait = station.barber_avatar_url ?? station.organization_logo_url;
  const links = [...station.branch_links, ...station.barber_links].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const hasPin = station.branch_latitude != null && station.branch_longitude != null;
  const streakRatio =
    loyalty && loyalty.target_haircut_count > 0
      ? Math.min(100, (loyalty.current_streak / loyalty.target_haircut_count) * 100)
      : 0;

  function submitPhone(event: FormEvent) {
    event.preventDefault();
    const next = toMexicoE164(digits);
    if (!next) {
      setFormError("Ingresa los 10 dígitos de tu celular.");
      return;
    }
    storePhone(next);
    setFormError(null);
    setDigits("");
    setPhone(next);
  }

  function changePhone() {
    clearStoredPhone();
    setPhone(null);
    setLoyalty(null);
    setLoyaltyError(null);
    setDigits("");
    setFormError(null);
  }

  function selectBarber(nextBarberId: string) {
    if (nextBarberId === barberId) return;
    navigate(`/b/${encodeURIComponent(nextBarberId)}?branch_id=${encodeURIComponent(branchId)}`);
  }

  return (
    <main className="page">
      <header className="hero">
        {portrait ? (
          <img src={portrait} alt="" className="avatar" />
        ) : (
          <span className="avatar avatar-fallback" aria-hidden="true">
            {initials(station.barber_name)}
          </span>
        )}
        <div>
          <p className="eyebrow">{station.organization_name}</p>
          <h1>{station.barber_name}</h1>
          <p className="subtitle">{station.branch_name}</p>
        </div>
      </header>

      {station.barber_bio ? <p className="bio">{station.barber_bio}</p> : null}

      <BarberPicker
        barbers={barbers}
        selectedId={station.barber_id}
        showStatus={walkIn}
        onSelect={selectBarber}
      />

      {walkIn ? (
        <section className="card" aria-live="polite">
          <h2>Estado</h2>
          <div className={`status-pill ${tone}`}>
            <p className="status-copy">
              <span className="dot" aria-hidden="true" />
              {statusLabel(currentStatus)}
            </p>
            <span className="live-label">{live ? "En vivo" : "Actualizando"}</span>
          </div>
        </section>
      ) : null}

      {publicBooking ? (
        <BookingFlow
          barberId={station.barber_id}
          branchId={station.branch_id}
          timezone={station.branch_timezone || "America/Mexico_City"}
          barberName={station.barber_name}
        />
      ) : null}

      <section className="card">
        <h2>Tu código</h2>
        {phone && qrValue ? (
          <>
            <div className="qr-wrap">
              <BrandedQr value={qrValue} size={220} title="Código QR del cliente" />
            </div>
            <p className="muted">Muéstralo al barbero al llegar.</p>
            <p className="phone-line">
              Teléfono <strong>{formatPhone(phone)}</strong>
            </p>
            {loadingLoyalty ? <p className="muted">Cargando racha…</p> : null}
            {loyaltyError ? <p className="error">{loyaltyError}</p> : null}
            {loyalty ? (
              <div className="streak">
                <div className="streak-head">
                  <span>Racha</span>
                  <strong>
                    {loyalty.current_streak}/{loyalty.target_haircut_count}
                  </strong>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${streakRatio}%` }} />
                </div>
                {loyalty.reward_banner ? <p className="banner">{loyalty.reward_banner}</p> : null}
                {loyalty.reward_description ? (
                  <p className="muted">{loyalty.reward_description}</p>
                ) : null}
              </div>
            ) : null}
            <button type="button" className="text-button" onClick={changePhone}>
              Cambiar número
            </button>
          </>
        ) : (
          <form onSubmit={submitPhone}>
            <label htmlFor="phone">Celular</label>
            <div className="phone-field">
              <span className="prefix">+52</span>
              <input
                id="phone"
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                enterKeyHint="done"
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
            <button type="submit">Continuar</button>
          </form>
        )}
      </section>

      {links.length > 0 ? (
        <section className="card social-card">
          <h2>Redes sociales</h2>
          <SocialLinks links={links} />
        </section>
      ) : null}

      <section className="card">
        <h2>Barbería</h2>
        {station.branch_address ? <p>{station.branch_address}</p> : null}
        {station.branch_phone_number ? (
          <a className="meta-row" href={`tel:${station.branch_phone_number}`}>
            <span>Llamar</span>
            <span className="value">{formatPhone(station.branch_phone_number)}</span>
          </a>
        ) : null}
        {hasPin ? (
          <>
            <BranchMap
              latitude={station.branch_latitude as number}
              longitude={station.branch_longitude as number}
              label={station.branch_name}
            />
            <a
              className="meta-row"
              href={mapsUrl(station.branch_latitude as number, station.branch_longitude as number)}
              target="_blank"
              rel="noreferrer"
            >
              <span>Cómo llegar</span>
              <span className="value">Abrir mapa</span>
            </a>
          </>
        ) : null}
        {station.opening_hours ? (
          <ul className="hours">
            {dayRows(station.opening_hours).map((day) => (
              <li key={day.label}>
                <span>{day.label}</span>
                <span>{day.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin horario publicado</p>
        )}
      </section>

      {station.portfolio.length > 0 ? (
        <section className="card">
          <h2>Trabajos</h2>
          <ul className="portfolio">
            {station.portfolio.map((item) => (
              <li key={item.id}>
                <img src={item.photo_url} alt={item.title} />
                <p className="piece-title">{item.title}</p>
                {item.description ? <p className="muted">{item.description}</p> : null}
                {item.tags.length > 0 ? (
                  <div className="tags">
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
