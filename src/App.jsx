import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  FileSpreadsheet,
  Filter,
  ImageDown,
  Plus,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import mxiaoLogoLockup from "./assets/brand/mxiao-logo-lockup.png";

const COURSE_GROUPS = [
  { id: "vo-long", label: "Vỡ lòng", range: "0 - HSK2", aliases: ["vo long", "vỡ lòng", "0-hsk2", "0 hsk2"] },
  { id: "tang-toc", label: "Tăng tốc", range: "HSK2 - HSK3", aliases: ["tang toc", "tăng tốc", "hsk2-3", "hsk2 3", "so cap", "sơ cấp", "hsk2"] },
  { id: "co-ban", label: "Cơ bản", range: "HSK3", aliases: ["co ban", "cơ bản", "hsk3"] },
  { id: "nang-cao", label: "Nâng cao", range: "HSK4", aliases: ["nang cao", "nâng cao", "hsk4"] },
  { id: "thanh-thao", label: "Thành thạo", range: "HSK5", aliases: ["thanh thao", "thành thạo", "hsk5"] },
];

const SAMPLE_ROWS = [
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "OFFLINE", className: "MXO6", teacher: "15 Vĩnh Hồ, Đống Đa", schedule: "3 - 5\n20:00 - 22:00", startDate: "16.4", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "OFFLINE", className: "MXO8", teacher: "15 Vĩnh Hồ, Đống Đa", schedule: "2 - 6\n18:00 - 20:00", startDate: "20.4", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "OFFLINE", className: "MXO9", teacher: "15 Vĩnh Hồ, Đống Đa", schedule: "3-5\n9:00-11:00", startDate: "23.4", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "OFFLINE", className: "MXO10", teacher: "15 Vĩnh Hồ, Đống Đa", schedule: "2 - 6\n20:00 - 22:00", startDate: "22.5", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "ONLINE", className: "MXA48", teacher: "", schedule: "3 - 5\n20:00 - 22:00", startDate: "21.4", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "ONLINE", className: "MXA49", teacher: "", schedule: "2 - 4 - 6\n20:00 - 22:00", startDate: "11.5", note: "Còn chỗ" },
  { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "ONLINE", className: "MXA50", teacher: "", schedule: "3 - 5\n20:00 - 22:00", startDate: "26.5", note: "Còn chỗ" },
];

const EXPORT_MODES = {
  all: "Full ONL + OFF",
  online: "ONL only",
  offline: "OFF only",
};

function stripMarks(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCourse(value) {
  const raw = String(value || "").trim();
  const plain = stripMarks(raw);
  const found = COURSE_GROUPS.find((group) => group.aliases.some((alias) => plain.includes(stripMarks(alias))));
  return found?.label || raw || "Vỡ lòng";
}

function normalizeMode(value) {
  const plain = stripMarks(value);
  if (plain.includes("offline") || plain.includes("off")) return "OFFLINE";
  if (plain.includes("online") || plain.includes("onl")) return "ONLINE";
  return "";
}

function getCell(row, indexes) {
  for (const index of indexes) {
    if (index >= 0 && row[index] !== undefined && String(row[index]).trim() !== "") {
      return String(row[index]).trim();
    }
  }
  return "";
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => String(cell).trim()));
}

function parseScheduleRows(rawRows) {
  let currentCourse = "Vỡ lòng";
  let currentMode = "ONLINE";

  const parsed = rawRows.reduce((items, sourceRow) => {
    const row = Array.from({ length: Math.max(6, sourceRow.length) }, (_, index) => sourceRow[index] ?? "");
    const joined = row.map((cell) => String(cell || "").trim()).filter(Boolean).join(" ");
    const joinedPlain = stripMarks(joined);
    const rowMode = normalizeMode(joined);
    const courseCandidate = row.find((cell) => {
      const value = stripMarks(cell);
      return COURSE_GROUPS.some((group) => group.aliases.some((alias) => value.includes(stripMarks(alias))));
    });

    if (courseCandidate) currentCourse = normalizeCourse(courseCandidate);
    if (rowMode && joinedPlain === stripMarks(rowMode)) {
      currentMode = rowMode;
      return items;
    }
    if (joinedPlain.includes("online") && row.filter(Boolean).length <= 2) {
      currentMode = "ONLINE";
      return items;
    }
    if (joinedPlain.includes("offline") && row.filter(Boolean).length <= 2) {
      currentMode = "OFFLINE";
      return items;
    }
    if (joinedPlain.includes("khoa hoc") || joinedPlain.includes("giao vien") || joinedPlain.includes("lich khai giang")) {
      return items;
    }

    const className = getCell(row, [1, 0]);
    const teacher = getCell(row, [2, 1]);
    const schedule = getCell(row, [3, 2]);
    const startDate = getCell(row, [4, 3]);

    if (!className || !/[a-z]{1,4}\d{1,4}/i.test(className)) return items;

    items.push({
      id: crypto.randomUUID(),
      course: currentCourse,
      mode: normalizeMode(row[0]) || normalizeMode(row[1]) || currentMode,
      className,
      teacher,
      schedule,
      startDate,
      note: getCell(row, [5, 6]),
    });
    return items;
  }, []);

  return parsed.length ? parsed : SAMPLE_ROWS;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function groupRows(rows) {
  return COURSE_GROUPS.map((group) => ({
    ...group,
    rows: rows.filter((row) => normalizeCourse(row.course) === group.label),
  })).filter((group) => group.rows.length);
}

function statusClass(value) {
  const plain = stripMarks(value);
  return plain.includes("sap het") || plain.includes("het cho") ? "urgent" : "open";
}

export function App() {
  const [rows, setRows] = useState(SAMPLE_ROWS);
  const [exportMode, setExportMode] = useState("all");
  const [monthTitle, setMonthTitle] = useState("4-5");
  const [posterSubtitle, setPosterSubtitle] = useState("Đầu vào: Chưa biết tiếng Trung - Đầu ra: HSK2");
  const [activeTab] = useState("schedule");
  const [fileName, setFileName] = useState("Dữ liệu mẫu MXiao");
  const previewRef = useRef(null);

  const visibleRows = useMemo(() => {
    if (exportMode === "online") return rows.filter((row) => row.mode === "ONLINE");
    if (exportMode === "offline") return rows.filter((row) => row.mode === "OFFLINE");
    return rows;
  }, [rows, exportMode]);

  const grouped = useMemo(() => groupRows(visibleRows), [visibleRows]);
  const stats = useMemo(() => ({
    total: rows.length,
    online: rows.filter((row) => row.mode === "ONLINE").length,
    offline: rows.filter((row) => row.mode === "OFFLINE").length,
  }), [rows]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv") {
      const text = await file.text();
      setRows(parseScheduleRows(parseCsv(text)));
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false, defval: "" });
    setRows(parseScheduleRows(raw));
  }

  function updateRow(id, key, value) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: crypto.randomUUID(), course: "Vỡ lòng", mode: "ONLINE", className: "MXA00", teacher: "", schedule: "", startDate: "", note: "Còn chỗ" },
    ]);
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function exportPng() {
    if (!previewRef.current) return;
    const dataUrl = await toPng(previewRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      style: { transform: "scale(1)", transformOrigin: "top left" },
    });
    downloadDataUrl(dataUrl, `mxiao-lich-khai-giang-${monthTitle}-${exportMode}.png`);
  }

  function printPreview() {
    window.print();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">MX</div>
          <div>
            <p>MXiao Chinese</p>
            <h1>MXiao Tool</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="MXiao tools">
          <button className={activeTab === "schedule" ? "active" : ""}>
            <CalendarDays size={18} />
            Xuất lịch khai giảng
          </button>
        </nav>

        <section className="side-panel">
          <p className="eyebrow">Nguồn dữ liệu</p>
          <strong>{fileName}</strong>
          <span>{stats.total} lớp · {stats.online} online · {stats.offline} offline</span>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Platform nội bộ</p>
            <h2>Xuất lịch khai giảng</h2>
          </div>
          <div className="topbar-actions">
            <label className="file-button">
              <Upload size={18} />
              Nhập Excel/CSV
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
            </label>
            <button className="ghost-button" onClick={printPreview}>
              <Printer size={18} />
              In / PDF
            </button>
            <button className="primary-button" onClick={exportPng}>
              <ImageDown size={18} />
              Xuất ảnh
            </button>
          </div>
        </header>

        <section className="controls-band">
          <div className="control-card">
            <label>Tháng khai giảng</label>
            <input value={monthTitle} onChange={(event) => setMonthTitle(event.target.value)} />
          </div>
          <div className="control-card subtitle-control">
            <label>Dòng mô tả</label>
            <input value={posterSubtitle} onChange={(event) => setPosterSubtitle(event.target.value)} />
          </div>
          <div className="control-card wide">
            <label><Filter size={16} /> Kiểu ảnh xuất</label>
            <div className="segmented">
              {Object.entries(EXPORT_MODES).map(([key, label]) => (
                <button key={key} className={exportMode === key ? "selected" : ""} onClick={() => setExportMode(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button className="add-button" onClick={addRow}>
            <Plus size={18} />
            Thêm lịch
          </button>
        </section>

        <section className="main-grid">
          <div className="editor-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Chỉnh sửa nhanh</p>
                <h3>Bảng lịch</h3>
              </div>
              <FileSpreadsheet size={22} />
            </div>

            <div className="editor-table-wrap">
              <table className="editor-table">
                <thead>
                  <tr>
                    <th>Khóa học</th>
                    <th>Hình thức</th>
                    <th>Lớp</th>
                    <th>Địa điểm / GV</th>
                    <th>Lịch học</th>
                    <th>Khai giảng</th>
                    <th>Tình trạng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <select value={normalizeCourse(row.course)} onChange={(event) => updateRow(row.id, "course", event.target.value)}>
                          {COURSE_GROUPS.map((group) => <option key={group.id}>{group.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={row.mode} onChange={(event) => updateRow(row.id, "mode", event.target.value)}>
                          <option>ONLINE</option>
                          <option>OFFLINE</option>
                        </select>
                      </td>
                      <td><input value={row.className} onChange={(event) => updateRow(row.id, "className", event.target.value)} /></td>
                      <td><input value={row.teacher} onChange={(event) => updateRow(row.id, "teacher", event.target.value)} /></td>
                      <td><textarea value={row.schedule} onChange={(event) => updateRow(row.id, "schedule", event.target.value)} /></td>
                      <td><input value={row.startDate} onChange={(event) => updateRow(row.id, "startDate", event.target.value)} /></td>
                      <td><input value={row.note} onChange={(event) => updateRow(row.id, "note", event.target.value)} /></td>
                      <td>
                        <button className="icon-button" onClick={() => removeRow(row.id)} aria-label="Xóa lịch">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="preview-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Preview ảnh</p>
                <h3>Lịch khai giảng {monthTitle}</h3>
              </div>
              <ImageDown size={22} />
            </div>

            <div className="poster-stage">
              <div className="poster-preview-frame">
                <div className="poster-scale">
                  <article className="poster square-poster" ref={previewRef}>
                    <div className="mountain-layer mountain-back" />
                    <div className="mountain-layer mountain-front" />
                    <div className="landmark pagoda" />
                    <div className="landmark gate" />
                    <div className="landmark pearl-tower" />
                    <div className="cloud-line cloud-left" />
                    <div className="cloud-line cloud-right" />

                    <img className="campaign-logo" src={mxiaoLogoLockup} alt="MXiao Chinese" />

                    <header className="campaign-title">
                      <h2>LỊCH KHAI GIẢNG THÁNG {monthTitle}</h2>
                      <p>{posterSubtitle}</p>
                    </header>

                    <section className="schedule-card">
                      <table className="campaign-table">
                        <thead>
                          <tr>
                            <th>TRÌNH ĐỘ</th>
                            <th>LỚP</th>
                            <th>HÌNH THỨC</th>
                            <th>LỊCH HỌC</th>
                            <th>KHAI GIẢNG</th>
                            <th>TÌNH TRẠNG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grouped.map((group) => group.rows.map((row, index) => (
                            <tr key={row.id}>
                              {index === 0 && (
                                <td className="level-cell" rowSpan={group.rows.length}>
                                  <strong>{group.label}</strong>
                                  <span>({group.range})</span>
                                </td>
                              )}
                              <td className="class-cell">{row.className}</td>
                              <td>
                                <span className={`mode-badge ${row.mode.toLowerCase()}`}>{row.mode}</span>
                                {row.mode === "OFFLINE" && (
                                  <small>{row.teacher || "15 Vĩnh Hồ, Đống Đa"}</small>
                                )}
                              </td>
                              <td className="schedule-cell">{row.schedule}</td>
                              <td className="date-cell">{row.startDate}</td>
                              <td>
                                <span className={`status-badge ${statusClass(row.note)}`}>{row.note || "Còn chỗ"}</span>
                              </td>
                            </tr>
                          )))}
                        </tbody>
                      </table>
                    </section>

                    <div className="register-button">ĐĂNG KÝ NGAY</div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
