import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, getLogbook } from "../api/client";
import type { PublicLogbook } from "../api/types";

const NOT_FOUND = "No se encontró la bitácora.";

export function LogbookPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [logbook, setLogbook] = useState<PublicLogbook | null>(null);
  const [error, setError] = useState<string | null>(token ? null : NOT_FOUND);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLogbook(null);

    getLogbook(token)
      .then((data) => {
        if (!cancelled) setLogbook(data);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        if (reason instanceof ApiError && (reason.status === 404 || reason.status === 400)) {
          setError(NOT_FOUND);
          return;
        }
        setError(reason instanceof ApiError ? reason.message : NOT_FOUND);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const streakRatio =
    logbook && logbook.target_haircut_count > 0
      ? Math.min(100, (logbook.current_streak / logbook.target_haircut_count) * 100)
      : 0;

  if (!token || error) {
    return (
      <main className="page">
        <section className="card empty">
          <h1>Bitácora</h1>
          <p className="error">{error ?? NOT_FOUND}</p>
        </section>
      </main>
    );
  }

  if (loading || !logbook) {
    return (
      <main className="page">
        <section className="card empty">
          <p className="muted">Cargando bitácora…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <span className="avatar avatar-fallback" aria-hidden="true">
          {logbook.alias_name.slice(0, 1).toUpperCase() || "?"}
        </span>
        <div>
          <p className="eyebrow">{logbook.organization_name}</p>
          <h1>{logbook.alias_name}</h1>
          <p className="subtitle">Tu bitácora</p>
        </div>
      </header>

      <section className="card">
        <h2>Racha</h2>
        <div className="streak">
          <div className="streak-head">
            <span>Cortes</span>
            <strong>
              {logbook.current_streak}/{logbook.target_haircut_count}
            </strong>
          </div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${streakRatio}%` }} />
          </div>
          {logbook.reward_banner ? <p className="banner">{logbook.reward_banner}</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Historial</h2>
        {logbook.history.length === 0 ? (
          <p className="muted">Sin cortes registrados.</p>
        ) : (
          <ul className="history">
            {logbook.history.map((entry) => (
              <li key={`${entry.completed_at}-${entry.barber_name}`}>
                <p className="piece-title">
                  {new Date(entry.completed_at).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="muted">{entry.barber_name}</p>
                {entry.photo_urls.length > 0 ? (
                  <div className="photos">
                    {entry.photo_urls.map((url) => (
                      <img key={url} src={url} alt="" />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
