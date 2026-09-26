import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getActiveApiBaseUrl } from "../utils/api";

export default function DemoTools() {
  const [apiUrl, setApiUrl] = useState(() => getActiveApiBaseUrl() || "https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);

  // Form states
  const [selectedEtrId, setSelectedEtrId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [customCourseCode, setCustomCourseCode] = useState("");
  const [customClassName, setCustomClassName] = useState("");
  const [customStudentCount, setCustomStudentCount] = useState(3);

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, msg, type }, ...prev]);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${apiUrl}/demo/summary`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const normalizedData = {
        totalETRs: data.totalETRs ?? data.TotalETRs ?? 0,
        statusCounts: data.statusCounts ?? data.StatusCounts ?? [],
        recentETRs: data.recentETRs ?? data.RecentETRs ?? [],
        recentSessions: data.recentSessions ?? data.RecentSessions ?? [],
        recentAssessments: data.recentAssessments ?? data.RecentAssessments ?? [],
      };
      setSummary(normalizedData);
      if (normalizedData.recentETRs.length > 0 && (!selectedEtrId || !normalizedData.recentETRs.some(e => e.etrCourseRecordId == selectedEtrId))) {
        setSelectedEtrId(normalizedData.recentETRs[0].etrCourseRecordId);
      }
      if (normalizedData.recentSessions.length > 0 && (!selectedSessionId || !normalizedData.recentSessions.some(s => s.sessionId == selectedSessionId))) {
        setSelectedSessionId(normalizedData.recentSessions[0].sessionId);
      }
      if (normalizedData.recentAssessments.length > 0 && (!selectedAssessmentId || !normalizedData.recentAssessments.some(a => a.assessmentId == selectedAssessmentId))) {
        setSelectedAssessmentId(normalizedData.recentAssessments[0].assessmentId);
      }
      addLog("Đã cập nhật dữ liệu tổng quan ETR thành công!", "success");
    } catch (err) {
      addLog(`Lỗi kết nối Backend (${apiUrl}): ${err.message}`, "error");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [apiUrl]);

  // 1. Fast-forward ETR
  const handleFastForward = async (targetStatus) => {
    if (!selectedEtrId) return alert("Vui lòng chọn 1 hồ sơ ETR!");
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/demo/etr/${selectedEtrId}/fast-forward?targetStatus=${targetStatus}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi thao tác");
      addLog(`[Tua nhanh] ${data.message}`, "success");
      fetchSummary();
    } catch (err) {
      addLog(`[Lỗi tua nhanh] ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Reset ETR
  const handleResetEtr = async (toStatus) => {
    if (!selectedEtrId) return alert("Vui lòng chọn 1 hồ sơ ETR!");
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/demo/etr/${selectedEtrId}/reset?toStatus=${toStatus}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi thao tác");
      addLog(`[Gỡ khóa/Reset] ${data.message}`, "success");
      fetchSummary();
    } catch (err) {
      addLog(`[Lỗi reset] ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. Quick Random Cohort
  const handleQuickCohort = async () => {
    setLoading(true);
    try {
      const body = {
        courseCode: customCourseCode.trim() || null,
        className: customClassName.trim() || null,
        studentCount: parseInt(customStudentCount, 10) || 3,
      };
      const res = await fetch(`${apiUrl}/demo/cohort/quick-random`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi thao tác");
      addLog(`[Tạo lớp ngẫu nhiên] ${data.message}`, "success");
      fetchSummary();
    } catch (err) {
      addLog(`[Lỗi tạo lớp] ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 4. Quick Attendance
  const handleQuickAttendance = async () => {
    if (!selectedSessionId) return alert("Vui lòng chọn 1 buổi học!");
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/demo/session/${selectedSessionId}/quick-attendance`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi thao tác");
      addLog(`[Điểm danh 100%] ${data.message}`, "success");
      fetchSummary();
    } catch (err) {
      addLog(`[Lỗi điểm danh] ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 5. Quick Grade
  const handleQuickGrade = async () => {
    if (!selectedAssessmentId) return alert("Vui lòng chọn 1 bài kiểm tra!");
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/demo/assessment/${selectedAssessmentId}/quick-grade?score=88`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi thao tác");
      addLog(`[Chấm điểm đạt 88] ${data.message}`, "success");
      fetchSummary();
    } catch (err) {
      addLog(`[Lỗi chấm điểm] ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "Segoe UI, sans-serif", padding: "24px" }}>
      {/* Top Header */}
      <div style={{ maxWidth: "1280px", margin: "0 auto 24px auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#38bdf8" }}>⚡ ETR DEMO CONTROL CENTER (GOD MODE)</h1>
            <span style={{ backgroundColor: "#ef4444", color: "#ffffff", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>DEFENSE 1.1 HELPER</span>
          </div>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
            Bảng điều khiển đặc quyền: Bỏ qua các bước thao tác nhập liệu thủ công rườm rà, tua nhanh trạng thái ETR và sinh lớp ngẫu nhiên trong 1 giây.
          </p>
        </div>

        {/* Server Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#1e293b", padding: "8px 12px", borderRadius: "8px", border: "1px solid #475569" }}>
          <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Backend API:</span>
          <select
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{ backgroundColor: "#0f172a", color: "#38bdf8", border: "1px solid #38bdf8", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", outline: "none", cursor: "pointer" }}
          >
            <option value="http://localhost:5000/api">Localhost (http://localhost:5000/api)</option>
            <option value="https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api">Azure Cloud (Production BE)</option>
          </select>
          <button
            onClick={fetchSummary}
            style={{ backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
        {/* Left Column: Action Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Metric Badges */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
              <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Tổng ETR</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc" }}>{summary.totalETRs}</div>
              </div>
              {summary.statusCounts?.map((s) => {
                let badgeColor = "#94a3b8";
                if (s.status === "Draft") badgeColor = "#38bdf8";
                if (s.status === "Submitted") badgeColor = "#eab308";
                if (s.status === "Verified") badgeColor = "#f97316";
                if (s.status === "Completed") badgeColor = "#22c55e";
                return (
                  <div key={s.status} style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: badgeColor }}>{s.status}</div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc" }}>{s.count}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CARD 1: TUA NHANH ETR */}
          <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px" }}>⚡</span>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#f8fafc" }}>TUA NHANH QUY TRÌNH HỒ SƠ ETR (FAST-FORWARD)</h2>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: "1.4" }}>
              <strong>Khi nào nên dùng:</strong> Khi hội đồng yêu cầu xem ngay luồng Training Manager phê duyệt và khóa Deep Freeze, hoặc xem cổng Auditor mà không muốn mất 10 phút ngồi click từng buổi học để điểm danh, gõ điểm và duyệt minh chứng.
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>Chọn hồ sơ ETR mục tiêu:</label>
              <select
                value={selectedEtrId}
                onChange={(e) => setSelectedEtrId(e.target.value)}
                style={{ width: "100%", backgroundColor: "#0f172a", color: "#f8fafc", border: "1px solid #475569", padding: "8px", borderRadius: "6px", fontSize: "13px", outline: "none" }}
              >
                {summary?.recentETRs?.map((e) => (
                  <option key={e.etrCourseRecordId} value={e.etrCourseRecordId}>
                    #{e.etrCourseRecordId} - {e.studentName} ({e.userCode}) | Lớp: {e.classCode} | Trạng thái: [{e.status}] {e.isLocked ? "🔒 Locked" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <button
                disabled={loading}
                onClick={() => handleFastForward("Submitted")}
                style={{ backgroundColor: "#ca8a04", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
              >
                🟡 Tua đến 'Submitted'<br />
                <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.85 }}>(Điểm danh & Chấm điểm xong)</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleFastForward("Verified")}
                style={{ backgroundColor: "#ea580c", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
              >
                🟠 Tua đến 'Verified'<br />
                <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.85 }}>(QA duyệt xong, chờ Manager)</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleFastForward("Completed")}
                style={{ backgroundColor: "#16a34a", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
              >
                🟢 Tua đến 'Completed'<br />
                <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.85 }}>(Đã duyệt & Đóng băng Deep Freeze)</span>
              </button>
            </div>
          </div>

          {/* CARD 2: GỠ KHÓA & RESET ETR */}
          <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px" }}>🔓</span>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#f8fafc" }}>GỠ KHÓA DEEP FREEZE & KHÔI PHỤC ĐỂ DEMO LẠI (REPLAY)</h2>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: "1.4" }}>
              <strong>Khi nào nên dùng:</strong> Bạn vừa demo xong nút Phê duyệt của Training Manager và hồ sơ đã bị khóa cứng (IsLocked=true). Hội đồng bảo: <em>"Làm lại thao tác duyệt này một lần nữa cho thầy xem"</em>. Bấm nút này để gỡ cờ khóa và đưa hồ sơ về trạng thái chờ duyệt ngay lập tức.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                disabled={loading}
                onClick={() => handleResetEtr("Verified")}
                style={{ backgroundColor: "#3b82f6", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
              >
                ↩️ Đưa về 'Verified' (Để Manager bấm Duyệt lại)
              </button>

              <button
                disabled={loading}
                onClick={() => handleResetEtr("Draft")}
                style={{ backgroundColor: "#475569", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
              >
                🔄 Reset về 'Draft' (Làm lại toàn bộ quy trình)
              </button>
            </div>
          </div>

          {/* CARD 3: SINH LỚP HỌC NGẪU NHIÊN (NHÓM 5) */}
          <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #0284c7", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px" }}>🎲</span>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#38bdf8" }}>TỰ ĐỘNG TẠO LỚP HỌC & HỒ SƠ ETR NGẪU NHIÊN (1 CLICK)</h2>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 14px 0", lineHeight: "1.4" }}>
              <strong>Khi nào nên dùng:</strong> Khi muốn chứng minh tính năng tự động sinh ETR khi mở lớp mới từ con số 0. Hệ thống <strong>tự động sinh mã lớp ngẫu nhiên</strong> (ví dụ <code>SIM-LIVE-8291</code>), gán giảng viên, ghi danh học viên và tự sinh hồ sơ ETR ở trạng thái <code>Draft</code>. Bấm liên tục thoải mái không sợ trùng lặp!
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: "10px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Khóa học (bỏ trống = random):</label>
                <input
                  type="text"
                  placeholder="VD: A320-FAM hoặc B737-TR"
                  value={customCourseCode}
                  onChange={(e) => setCustomCourseCode(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#0f172a", color: "#fff", border: "1px solid #475569", padding: "6px 10px", borderRadius: "4px", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tên lớp (bỏ trống = random):</label>
                <input
                  type="text"
                  placeholder="VD: Lớp Demo Hội Đồng..."
                  value={customClassName}
                  onChange={(e) => setCustomClassName(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#0f172a", color: "#fff", border: "1px solid #475569", padding: "6px 10px", borderRadius: "4px", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Số học viên:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={customStudentCount}
                  onChange={(e) => setCustomStudentCount(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#0f172a", color: "#fff", border: "1px solid #475569", padding: "6px 10px", borderRadius: "4px", fontSize: "12px" }}
                />
              </div>
            </div>

            <button
              disabled={loading}
              onClick={handleQuickCohort}
              style={{ width: "100%", backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
            >
              🎲 TẠO NGAY 1 LỚP HỌC MỚI NGẪU NHIÊN KÈM ETR DRAFT (1 CLICK)
            </button>
          </div>

          {/* CARD 4: ĐIỂM DANH & CHẤM ĐIỂM NHANH */}
          <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px" }}>📝</span>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#f8fafc" }}>ĐIỂM DANH & CHẤM ĐIỂM NHANH BUỔI HỌC (QUICK ATTENDANCE & GRADE)</h2>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 14px 0", lineHeight: "1.4" }}>
              Điểm danh 100% Present cho toàn bộ học viên trong 1 buổi học hoặc chấm điểm đạt 88/100 cho 1 bài thi mà không cần gõ từng học viên.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Điểm danh */}
              <div>
                <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Chọn buổi học (Session):</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#0f172a", color: "#f8fafc", border: "1px solid #475569", padding: "6px", borderRadius: "4px", fontSize: "12px", marginBottom: "8px" }}
                >
                  {summary?.recentSessions?.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      #{s.sessionId} - {s.sessionTitle} ({s.classCode})
                    </option>
                  ))}
                </select>
                <button
                  disabled={loading}
                  onClick={handleQuickAttendance}
                  style={{ width: "100%", backgroundColor: "#059669", color: "#fff", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  ✓ Điểm danh 100% Present
                </button>
              </div>

              {/* Chấm điểm */}
              <div>
                <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Chọn bài kiểm tra (Assessment):</label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#0f172a", color: "#f8fafc", border: "1px solid #475569", padding: "6px", borderRadius: "4px", fontSize: "12px", marginBottom: "8px" }}
                >
                  {summary?.recentAssessments?.map((a) => (
                    <option key={a.assessmentId} value={a.assessmentId}>
                      #{a.assessmentId} - {a.assessmentName} ({a.subjectName})
                    </option>
                  ))}
                </select>
                <button
                  disabled={loading}
                  onClick={handleQuickGrade}
                  style={{ width: "100%", backgroundColor: "#7c3aed", color: "#fff", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  ✓ Chấm điểm 88 (Đạt) & Chốt điểm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Console / Execution Log */}
        <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155", padding: "16px", display: "flex", flexDirection: "column", height: "fit-content", position: "sticky", top: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#38bdf8" }}>🖥️ NHẬT KÝ THAO TÁC (LOG)</span>
            <button
              onClick={() => setLogs([])}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11px", cursor: "pointer" }}
            >
              Xóa log
            </button>
          </div>

          <div style={{ maxHeight: "560px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", fontFamily: "Consolas, monospace" }}>
            {logs.length === 0 ? (
              <div style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>Chưa có thao tác nào...</div>
            ) : (
              logs.map((log, idx) => {
                let color = "#94a3b8";
                if (log.type === "success") color = "#4ade80";
                if (log.type === "error") color = "#f87171";
                return (
                  <div key={idx} style={{ backgroundColor: "#0f172a", padding: "8px 10px", borderRadius: "4px", borderLeft: `3px solid ${color}`, lineHeight: "1.4" }}>
                    <span style={{ color: "#64748b", fontSize: "10px" }}>[{log.time}] </span>
                    <span style={{ color }}>{log.msg}</span>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: "16px", borderTop: "1px solid #334155", paddingTop: "12px", fontSize: "11px", color: "#94a3b8" }}>
            <strong>Đường dẫn truy cập:</strong><br />
            <code style={{ color: "#38bdf8" }}>http://localhost:5173/demo-tools</code><br />
            <div style={{ marginTop: "8px" }}>
              <Link to="/login" style={{ color: "#94a3b8", textDecoration: "underline", marginRight: "12px" }}>Về trang Đăng nhập</Link>
              <Link to="/" style={{ color: "#94a3b8", textDecoration: "underline" }}>Về trang chủ</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
