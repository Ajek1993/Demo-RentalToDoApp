import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "../lib/supabase";
import Modal from "./Modal";
import { getPeriods, filterByPeriod } from "../lib/periods";
import { calculatePrice } from "../lib/priceCalculator";

export default function KursyList({ currentUser, profile, onClose }) {
  const [kursy, setKursy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editMarka, setEditMarka] = useState("");
  const [editKwota, setEditKwota] = useState("");
  const [saving, setSaving] = useState(false);
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
      const { data, error } = await supabase
        .from("kursy")
        .select("*")
        .eq("wykonawca_id", currentUser.id)
        .order("data", { ascending: false });

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
    setEditMarka(kurs.marka || "");
    setEditKwota(kurs.kwota || "0");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("kursy")
      .update({
        marka: editMarka,
        kwota: parseFloat(editKwota) || 0,
      })
      .eq("id", editing.id)
      .select()
      .single();

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
      <button type="button" className="panel-close" onClick={onClose}>
        X
      </button>

      <div className="kursy-header">
        <h2>
          Kursy <span className="beta-badge">Beta</span>
        </h2>
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
            onClick={() => setFilterDisplay((d) => !d)}
            style={{ marginBottom: "12px" }}
          >
            {filterDisplay ? "Ukryj filtry" : "Pokaż filtry"}
          </button>

          {filterDisplay && (
            <div className="extra-filters" style={{ display: "flex" }}>
              <label>
                Data:
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="extra-filter-input"
                />
              </label>
              <label>
                Nr rejestracyjny:
                <input
                  type="text"
                  value={filterNr}
                  onChange={(e) => setFilterNr(e.target.value)}
                  placeholder="np. KR12345"
                  className="extra-filter-input"
                />
              </label>
              <label>
                Marka:
                <input
                  type="text"
                  value={filterMarka}
                  onChange={(e) => setFilterMarka(e.target.value)}
                  placeholder="np. Opel"
                  className="extra-filter-input"
                />
              </label>
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
        <Modal onClose={() => setEditing(null)}>
          <div className="kurs-form">
            <button type="button" className="panel-close" onClick={() => setEditing(null)}>
              X
            </button>
            <h3>Edytuj kurs</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", marginBottom: "1rem" }}>
              {editing.data} | {editing.nr_rej} | {editing.adres}
            </p>
            <label>
              Marka:
              <input
                type="text"
                value={editMarka}
                onChange={(e) => setEditMarka(e.target.value)}
                placeholder="np. Opel Astra"
              />
            </label>
            <label>
              Kwota (zl):
              <input
                type="number"
                min="0"
                step="1"
                value={editKwota}
                onChange={(e) => setEditKwota(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const result = calculatePrice(editing.adres);
                setEditKwota(String(result.price));
              }}
              style={{ marginBottom: "8px" }}
            >
              Oblicz automatycznie
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
