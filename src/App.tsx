import { Route, Routes } from "react-router-dom";
import { LogbookPage } from "./pages/LogbookPage";
import { StationPage } from "./pages/StationPage";

export function App() {
  return (
    <Routes>
      <Route path="/b/:barberId" element={<StationPage />} />
      <Route path="/logbook" element={<LogbookPage />} />
      <Route
        path="*"
        element={
          <main className="page">
            <section className="card empty">
              <p className="eyebrow">Espejo</p>
              <h1>Abre el enlace de tu barbero</h1>
              <p className="muted">
                Este sitio vive en el teléfono. Escanea el QR del espejo para ver su estado, tu código y tu racha.
              </p>
            </section>
          </main>
        }
      />
    </Routes>
  );
}
