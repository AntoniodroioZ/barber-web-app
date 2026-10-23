import type { BranchBarber } from "../api/types";
import { initials, statusLabel, statusTone } from "../lib/labels";

type Props = {
  barbers: BranchBarber[];
  selectedId: string;
  showStatus: boolean;
  onSelect: (barberId: string) => void;
};

export function BarberPicker({ barbers, selectedId, showStatus, onSelect }: Props) {
  if (barbers.length <= 1) return null;

  return (
    <section className="card">
      <h2>Barberos</h2>
      <ul className="barber-picker" role="list">
        {barbers.map((barber) => {
          const selected = barber.user_id === selectedId;
          const tone = statusTone(barber.current_status);
          return (
            <li key={barber.user_id}>
              <button
                type="button"
                className={`barber-chip${selected ? " selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onSelect(barber.user_id)}
              >
                {barber.avatar_url ? (
                  <img src={barber.avatar_url} alt="" className="barber-chip-avatar" />
                ) : (
                  <span className="barber-chip-avatar fallback" aria-hidden="true">
                    {initials(barber.full_name)}
                  </span>
                )}
                <span className="barber-chip-body">
                  <span className="barber-chip-name">{barber.full_name}</span>
                  {showStatus ? (
                    <span className={`barber-chip-status ${tone}`}>
                      {statusLabel(barber.current_status)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
