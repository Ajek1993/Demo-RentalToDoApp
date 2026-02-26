import { useEffect, useState, useCallback } from "react";
import ExcelJS from "exceljs";
import { supabase } from "../lib/supabase";
import Modal from "./Modal";
import { getPeriods, filterByPeriod } from "../lib/periods";
import { calculatePriceAsync } from "../lib/priceCalculator";
import { findVehicleByPlate } from "../lib/vehicleService";
import { useScrollLock } from "../hooks/useScrollLock";

export default function KursyList({ currentUser, profile, onClose }) {
  useScrollLock();
  const [kursy, setKursy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState("");
  const [editNrRej, setEditNrRej] = useState("");
  const [editMarka, setEditMarka] = useState("");
  const [editAdres, setEditAdres] = useState("");
  const [editKwota, setEditKwota] = useState("");
  const [saving, setSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [detectedCity, setDetectedCity] = useState(null);
  const [detectedDistance, setDetectedDistance] = useState(null);
  const [periods] = useState(getPeriods(12));
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  // Filtry
  const [filterDisplay, setFilterDisplay] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterNr, setFilterNr] = useState("");
  const [filterMarka, setFilterMarka] = useState("");

  useEffect(() => {
    async function fetchKursy() {
      setLoading(true);

      let query = supabase
        .from("kursy")
        .select("*")
        .order("data", { ascending: false });

      query = query.eq("wykonawca_id", currentUser.id);

      const { data, error } = await query;

      if (error) {
        console.error("Błąd pobierania kursów:", error);
        setLoading(false);
        return;
      }

      setKursy(data || []);
      setLoading(false);
    }
    fetchKursy();
  }, [currentUser.id]);

  async function handleExport() {
    const period = periods[selectedPeriod];
    const kursyDoExportu = filterByPeriod(kursy, period.start, period.end);

    try {
      const response = await fetch("/szablon.xlsx");
      if (!response.ok) {
        throw new Error(`Nie udało się pobrać szablonu: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        throw new Error("Szablon Excel nie zawiera arkusza");
      }

      const userName = profile?.name || "Nieznany";
      sheet.getCell("E1").value = `Zleceniobiorca: ${userName}`;

      kursyDoExportu.forEach((kurs, index) => {
        const row = 4 + index;
        sheet.getCell(`A${row}`).value = index + 1; // LP
        sheet.getCell(`B${row}`).value = kurs.data;
        sheet.getCell(`C${row}`).value = kurs.nr_rej;
        sheet.getCell(`D${row}`).value = kurs.marka || "";
        sheet.getCell(`E${row}`).value = kurs.adres;
        sheet.getCell(`F${row}`).value = parseFloat(kurs.kwota || 0);
        sheet.getCell(`I${row}`).value = "Kraków";
      });

      workbook.calcProperties.fullCalcOnLoad = true;

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kursy_${userName.replace(/\s+/g, "_")}_${period.start}_${period.end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Błąd eksportu:", err);
      alert("Błąd podczas generowania pliku Excel");
    }
  }

  function startEdit(kurs) {
    setEditing(kurs);
    setEditData(kurs.data || "");
    setEditNrRej(kurs.nr_rej || "");
    setEditMarka(kurs.marka || "");
    setEditAdres(kurs.adres || "");
    setEditKwota(kurs.kwota || "0");
    setEditErrors({});
    setDetectedCity(null);
    setDetectedDistance(null);
  }

  function validateEdit() {
    const errors = {};

    if (editNrRej.trim().length > 10) {
      errors.nr_rej = "Nr rejestracyjny max 10 znaków";
    }
    if (editAdres.trim().length > 200) {
      errors.adres = "Adres max 200 znaków";
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Autocomplete marki po zmianie nr rejestracyjnego
  const handleNrRejChange = useCallback(async (value) => {
    const uppercaseValue = value.toUpperCase().trim();
    setEditNrRej(uppercaseValue);
    if (uppercaseValue.length >= 3) {
      const marka = await findVehicleByPlate(uppercaseValue);
      if (marka) {
        setEditMarka(marka);
      }
    }
  }, []);


  async function handleSaveEdit() {
    if (!editing) return;
    if (!validateEdit()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("kursy")
      .update({
        data: editData,
        nr_rej: editNrRej,
        marka: editMarka,
        adres: editAdres,
        kwota: parseFloat(editKwota) || 0,
      })
      .eq("id", editing.id)
      .select()
      .single();

    // Zachowaj dane wykonawcy z edycji
    if (data) {
      data.wykonawca = editing.wykonawca;
    }

    // Synchronizacja Kurs → Order (jeśli istnieje powiązane zlecenie)
    if (data && editing.order_id) {
      // Pobierz stare dane zlecenia do historii zmian
      const { data: oldOrder } = await supabase
        .from("orders")
        .select("date, plate, location")
        .eq("id", editing.order_id)
        .single();

      // Aktualizuj zlecenie
      await supabase
        .from("orders")
        .update({
          date: editData,
          plate: editNrRej,
          location: editAdres,
        })
        .eq("id", editing.order_id);

      // Zapisz historię zmian (jeśli coś się zmieniło)
      if (oldOrder) {
        const changes = {};
        if (oldOrder.date !== editData) {
          changes.date = [oldOrder.date, editData];
        }
        if (oldOrder.plate !== editNrRej) {
          changes.plate = [oldOrder.plate, editNrRej];
        }
        if (oldOrder.location !== editAdres) {
          changes.location = [oldOrder.location, editAdres];
        }

        if (Object.keys(changes).length > 0) {
          await supabase.from("order_edits").insert({
            order_id: editing.order_id,
            edited_by: currentUser.id,
            changes,
          });
        }
      }
    }

    setSaving(false);

    if (error) {
      console.error("Błąd zapisu:", error);
      alert("Błąd zapisu");
      return;
    }

    setKursy((k) => k.map((kk) => (kk.id === data.id ? data : kk)));
    setEditing(null);
  }

  // Filtrowanie po okresie
  let filteredKursy =
    selectedPeriod !== null && periods[selectedPeriod]
      ? filterByPeriod(kursy, periods[selectedPeriod].start, periods[selectedPeriod].end)
      : kursy;

  // Dodatkowe filtry
  filteredKursy = filteredKursy.filter(
    (kurs) =>
      (!filterDate || kurs.data === filterDate) &&
      (!filterNr ||
        kurs.nr_rej?.toLowerCase().includes(filterNr.trim().toLowerCase())) &&
      (!filterMarka ||
        (kurs.marka || "").toLowerCase().includes(filterMarka.trim().toLowerCase()))
  );

  return (
    <div className="kursy-panel">
      <div className="kursy-header">
        <h2>
          Kursy <span className="beta-badge">Beta</span>
        </h2>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Zamknij panel kursów">
          ✕
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {/* Dropdown okresu rozliczeniowego */}
          <div className="period-selector">
            <label htmlFor="period-select">Okres rozliczeniowy:</label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="period-select"
            >
              {periods.map((period, index) => (
                <option key={period.id} value={index}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="button secondary"
            aria-expanded={filterDisplay}
            aria-controls="kurs-extra-filters"
            onClick={() => setFilterDisplay((d) => !d)}
            style={{ marginBottom: "12px" }}
          >
            {filterDisplay ? "Ukryj filtry" : "Pokaż filtry"}
          </button>

          {filterDisplay && (
            <div id="kurs-extra-filters" className="extra-filters" style={{ display: "flex" }}>
              <label htmlFor="kurs-filter-date">
                Data:
              </label>
              <input
                id="kurs-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="extra-filter-input"
              />
              <label htmlFor="kurs-filter-nr">
                Nr rejestracyjny:
              </label>
              <input
                id="kurs-filter-nr"
                type="text"
                value={filterNr}
                onChange={(e) => setFilterNr(e.target.value)}
                placeholder="np. KR12345"
                className="extra-filter-input"
              />
              <label htmlFor="kurs-filter-marka">
                Marka:
              </label>
              <input
                id="kurs-filter-marka"
                type="text"
                value={filterMarka}
                onChange={(e) => setFilterMarka(e.target.value)}
                placeholder="np. Opel"
                className="extra-filter-input"
              />
            </div>
          )}

          <div className="kursy-stats">
            Razem: <strong>{filteredKursy.length}</strong> kursow | Zarobek:{" "}
            <strong>
              {filteredKursy
                .reduce((sum, k) => sum + parseFloat(k.kwota || 0), 0)
                .toFixed(2)}{" "}
              zl
            </strong>
          </div>

          <button
            className="button"
            onClick={handleExport}
            style={{ marginTop: "12px" }}
          >
            Pobierz XLS
          </button>

          {filteredKursy.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "20px" }}>
              <p>Brak kursów w wybranym okresie</p>
            </div>
          ) : (
            <ul className="kursy-list">
              {filteredKursy
                .slice()
                .sort((a, b) => new Date(a.data) - new Date(b.data))
                .map((kurs) => (
                  <li key={kurs.id} className="kurs-item">
                    <div>
                      <b>{kurs.data}</b> | {kurs.nr_rej} | {kurs.marka || <em style={{ color: "var(--gray-400)" }}>brak marki</em>}
                    </div>
                    <div>
                      Adres: <span>{kurs.adres}</span>
                    </div>
                    <div>
                      Kwota: <span>{kurs.kwota || 0} zl</span>
                    </div>
                    <div className="kurs-actions">
                      <button className="button kurs-edit-btn" onClick={() => startEdit(kurs)}>
                        Edytuj
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} ariaLabel="Edytuj kurs">
          <div className="kurs-form">
            <button type="button" className="modal-close-btn" onClick={() => setEditing(null)} aria-label="Zamknij edycję kursu">
              ✕
            </button>
            <h3>Edytuj kurs</h3>
            <label htmlFor="kurs-edit-data">Data:</label>
            <input
              id="kurs-edit-data"
              type="date"
              value={editData}
              onChange={(e) => setEditData(e.target.value)}
            />
            <label htmlFor="kurs-edit-nrrej">Nr rejestracyjny:</label>
            <input
              id="kurs-edit-nrrej"
              type="text"
              value={editNrRej}
              onChange={(e) => handleNrRejChange(e.target.value)}
              placeholder="np. KR12345"
              maxLength={10}
            />
            {editErrors.nr_rej && <span className="error">{editErrors.nr_rej}</span>}
            <label htmlFor="kurs-edit-marka">Marka:</label>
            <input
              id="kurs-edit-marka"
              type="text"
              value={editMarka}
              onChange={(e) => setEditMarka(e.target.value)}
              placeholder="np. Opel Astra (auto-uzupełnienie z CSV)"
            />
            <label htmlFor="kurs-edit-adres">Adres (miejsce wydania):</label>
            <input
              id="kurs-edit-adres"
              type="text"
              value={editAdres}
              onChange={(e) => setEditAdres(e.target.value)}
              placeholder="np. wydanie Balice OC"
              maxLength={200}
            />
            {editErrors.adres && <span className="error">{editErrors.adres}</span>}
            {detectedCity && detectedDistance && (
              <span className="detected-marka">
                {detectedCity}: {detectedDistance} km
              </span>
            )}
            <label htmlFor="kurs-edit-kwota">Kwota (zl):</label>
            <input
              id="kurs-edit-kwota"
              type="number"
              min="0"
              step="1"
              value={editKwota}
              onChange={(e) => setEditKwota(e.target.value)}
            />
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                const result = await calculatePriceAsync(editAdres);
                setEditKwota(String(result.price));
                setDetectedCity(result.detectedCity);
                setDetectedDistance(result.distanceKm);
              }}
              style={{ marginBottom: "8px" }}
            >
              Przelicz ponownie
            </button>
            <button className="button" onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
