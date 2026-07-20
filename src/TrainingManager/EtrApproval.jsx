import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../utils/api";
import "./training-manager.scss";

const EtrApproval = () => {
  const { searchQuery } = useOutletContext();
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, APPROVED, RETURNED
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [showActionModal, setShowActionModal] = useState(null); // 'APPROVE' or 'RETURN'
  const [returnComment, setReturnComment] = useState("");
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [loadingEtrs, setLoadingEtrs] = useState(false);

  // Load ETRs from API on mount
  useEffect(() => {
    loadEtrsFromApi();
  }, []);

  const loadEtrsFromApi = async () => {
    setLoadingEtrs(true);
    try {
      const [etrData, enrollmentsData, profilesData] = await Promise.all([
        api.get("/Etr").catch(() => []),
        api.get("/Enrollments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
      ]);

      const etrsArr = Array.isArray(etrData) ? etrData : [];
      const enrollmentsArr = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      const profilesArr = Array.isArray(profilesData) ? profilesData : [];

      const mapped = etrsArr
        .filter((e) => e.status === "Verified" || e.status === "Completed")
        .map((etr) => {
          const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;
          return {
            id: `#ETR-${String(etrId).padStart(4, "0")}`,
            etrId,
            traineeName: profile?.fullName || `Học viên #${enrollment?.accountId || ""}`,
            traineeCode: `ID: ${profile?.employeeCode || `AV-${enrollment?.accountId || ""}`}`,
            initials: (profile?.fullName || "XX").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "XX",
            className: `Lớp #${enrollment?.classId || ""}`,
            avgScore: 0,
            qaVerified: true,
            qaVerifier: "QA Staff",
            submissionDate: etr.submittedAt
              ? new Date(etr.submittedAt).toISOString().split("T")[0]
              : "",
            status: etr.status === "Completed" ? "APPROVED" : "PENDING",
            approvedBy: etr.approvedBy || "",
            approvalDate: etr.completedAt
              ? new Date(etr.completedAt).toISOString().split("T")[0]
              : "",
            instructor: "",
            assessments: [],
          };
        });

      setEtrs(mapped);
    } catch (err) {
      console.error("Lỗi tải ETR:", err);
    } finally {
      setLoadingEtrs(false);
    }
  };

  const [etrs, setEtrs] = useState([]);

  const showAlert = (message, type = "success") => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => {
      setAlertInfo({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const handleApprove = async (etrId) => {
    try {
      await api.post(`/Etr/${etrId}/complete`, {});
      await loadEtrsFromApi();
      setShowActionModal(null);
      setSelectedEtr(null);
      showAlert(
        `ETR ${etrId} APPROVED SUCCESSFULLY & SYNCED TO THE AVIATION REGISTRY.`,
      );
    } catch (err) {
      showAlert(`APPROVAL FAILED: ${err.message}`, "error");
    }
  };

  const handleReturn = (etrId) => {
    if (!returnComment.trim()) {
      alert("Please specify a return reason.");
      return;
    }
    setEtrs(
      etrs.map((item) =>
        item.id === etrId
          ? {
              ...item,
              status: "RETURNED",
              returnedBy: "Capt. Henderson",
              returnDate: new Date().toISOString().split("T")[0],
              returnReason: returnComment,
            }
          : item,
      ),
    );
    setShowActionModal(null);
    setSelectedEtr(null);
    setReturnComment("");
    showAlert(`ETR ${etrId} RETURNED FOR CORRECTION WITH FEEDBACK.`, "warning");
  };

  // Filter records
  const filteredEtrs = etrs.filter((item) => {
    const matchesSearch =
      item.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.traineeCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = item.status === activeTab;

    return matchesSearch && matchesStatus;
  });

  if (viewingHistory) {
    return (
      <div className="tm-transcript-container">
        {/* SUB TOPBAR / TABS */}
        <div className="tm-transcript-sub-topbar">
          <div className="brand-text">
            Digital <span>Transcript Vault</span>
          </div>
          <div className="sub-tabs">
            <span className="sub-tab">Profile</span>
            <span className="sub-tab">Activity</span>
            <span className="sub-tab active">Documents</span>
            <span className="sub-tab">Compliance</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => showAlert("NOTIFICATIONS INITIALIZED.")}>
              <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                <path d="M0 14.1667V12.5H1.66667V6.66667C1.66667 5.51389 2.01389 4.48958 2.70833 3.59375C3.40278 2.69792 4.30556 2.11111 5.41667 1.83333V1.25C5.41667 0.902778 5.53819 0.607639 5.78125 0.364583C6.02431 0.121528 6.31944 0 6.66667 0C7.01389 0 7.30903 0.121528 7.55208 0.364583C7.79514 0.607639 7.91667 0.902778 7.91667 1.25V1.83333C9.02778 2.11111 9.93056 2.69792 10.625 3.59375C11.3194 4.48958 11.6667 5.51389 11.6667 6.66667V12.5H13.3333V14.1667H0ZM6.66667 16.6667C6.20833 16.6667 5.81597 16.5035 5.48958 16.1771C5.16319 15.8507 5 15.4583 5 15H8.33333C8.33333 15.4583 8.17014 15.8507 7.84375 16.1771C7.51736 16.5035 7.125 16.6667 6.66667 16.6667ZM3.33333 12.5H10V6.66667C10 5.75 9.67361 4.96528 9.02083 4.3125C8.36806 3.65972 7.58333 3.33333 6.66667 3.33333C5.75 3.33333 4.96528 3.65972 4.3125 4.3125C3.65972 4.96528 3.33333 5.75 3.33333 6.66667V12.5Z" fill="#64748B" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => showAlert("TRANSCRIPTION EXPORT LOGGED.")}>
              <svg width={17} height={15} viewBox="0 0 17 15" fill="none">
                <path d="M11.6667 4.16667V1.66667H5V4.16667H3.33333V0H13.3333V4.16667H11.6667ZM1.66667 5.83333C1.66667 5.83333 1.74653 5.83333 1.90625 5.83333C2.06597 5.83333 2.26389 5.83333 2.5 5.83333H14.1667C14.4028 5.83333 14.6007 5.83333 14.7604 5.83333C14.9201 5.83333 15 5.83333 15 5.83333H13.3333H3.33333H1.66667ZM13.3333 7.91667C13.5694 7.91667 13.7674 7.83681 13.9271 7.67708C14.0868 7.51736 14.1667 7.31944 14.1667 7.08333C14.1667 6.84722 14.0868 6.64931 13.9271 6.48958C13.7674 6.32986 13.5694 6.25 13.3333 6.25C13.0972 6.25 12.8993 6.32986 12.7396 6.48958C12.5799 6.64931 12.5 7.08333 12.5 7.08333C12.5 7.31944 12.5799 7.51736 12.7396 7.67708C12.8993 7.83681 13.0972 7.91667 13.3333 7.91667ZM11.6667 13.3333V10H5V13.3333H11.6667ZM13.3333 15H3.33333V11.6667H0V6.66667C0 5.95833 0.243056 5.36458 0.729167 4.88542C1.21528 4.40625 1.80556 4.16667 2.5 4.16667H14.1667C14.875 4.16667 15.4688 4.40625 15.9479 4.88542C16.4271 5.36458 16.6667 5.95833 16.6667 6.66667V11.6667H13.3333V15ZM15 10V6.66667C15 6.43056 14.9201 6.23264 14.7604 6.07292C14.6007 5.91319 14.4028 5.83333 14.1667 5.83333H2.5C2.26389 5.83333 2.06597 5.91319 1.90625 6.07292C1.74653 6.23264 1.66667 6.43056 1.66667 6.66667V10H3.33333V8.33333H13.3333V10H15Z" fill="#64748B" />
              </svg>
            </button>
            <button className="grant-cert-btn" onClick={() => showAlert("CERTIFICATE RENEWAL SUCCESSFUL.")}>
              Grant Certification
            </button>
            <div className="user-avatar">{viewingHistory.initials}</div>
          </div>
        </div>

        {/* HEADER INFORMATION */}
        <div className="tm-transcript-header">
          <div className="header-left">
            <span className="record-label">EXECUTIVE PERSONNEL RECORD</span>
            <div className="title-group">
              <h2>Learner Transcript: {viewingHistory.traineeName}</h2>
              <span className="id-badge">#{viewingHistory.traineeCode.replace("ID: ", "")}</span>
            </div>
            <div className="progress-bar-group">
              <div className="class-badge">
                <svg width={17} height={12} viewBox="0 0 17 12" fill="none">
                  <path d="M0 12V9.9C0 9.475 0.109375 9.08437 0.328125 8.72812C0.546875 8.37187 0.8375 8.1 1.2 7.9125C1.975 7.525 2.7625 7.23438 3.5625 7.04063C4.3625 6.84688 5.175 6.75 6 6.75C6.825 6.75 7.6375 6.84688 8.4375 7.04063C9.2375 7.23438 10.025 7.525 10.8 7.9125C11.1625 8.1 11.4531 8.37187 11.6719 8.72812C11.8906 9.08437 12 9.475 12 9.9V12H0ZM13.5 12V9.75C13.5 9.2 13.3469 8.67188 13.0406 8.16562C12.7344 7.65937 12.3 7.225 11.7375 6.8625C12.375 6.9375 12.975 7.06562 13.5375 7.24687C14.1 7.42812 14.625 7.65 15.1125 7.9125C15.5625 8.1625 15.9062 8.44063 16.1437 8.74687C16.3812 9.05312 16.5 9.3875 16.5 9.75V12H13.5ZM6 6C5.175 6 4.46875 5.70625 3.88125 5.11875C3.29375 4.53125 3 3.825 3 3C3 2.175 3.29375 1.46875 3.88125 0.88125C4.46875 0.29375 5.175 0 6 0C6.825 0 7.53125 0.29375 8.11875 0.88125C8.70625 1.46875 9 2.175 9 3C9 3.825 8.70625 4.53125 8.11875 5.11875C7.53125 5.70625 6.825 6 6 6ZM13.5 3C13.5 3.825 13.2062 4.53125 12.6187 5.11875C12.0312 5.70625 11.325 6 10.5 6C10.3625 6 10.1875 5.98438 9.975 5.95312C9.7625 5.92188 9.5875 5.8875 9.45 5.85C9.7875 5.45 10.0469 5.00625 10.2281 4.51875C10.4094 4.03125 10.5 3.525 10.5 3C10.5 2.475 10.4094 1.96875 10.2281 1.48125C10.0469 0.99375 9.7875 0.55 9.45 0.15C9.625 0.0875 9.8 0.046875 9.975 0.028125C10.15 0.009375 10.325 0 10.5 0C11.325 0 12.0312 0.29375 12.6187 0.88125C13.2062 1.46875 13.5 2.175 13.5 3ZM1.5 10.5H10.5V9.9C10.5 9.7625 10.4656 9.6375 10.3969 9.525C10.3281 9.4125 10.2375 9.325 10.125 9.2625C9.45 8.925 8.76875 8.67188 8.08125 8.50313C7.39375 8.33438 6.7 8.25 6 8.25C5.3 8.25 4.60625 8.33438 3.91875 8.50313C3.23125 8.67188 2.55 8.925 1.875 9.2625C1.7625 9.325 1.67188 9.4125 1.60312 9.525C1.53437 9.6375 1.5 9.7625 1.5 9.9V10.5ZM6 4.5C6.4125 4.5 6.76562 4.35312 7.05937 4.05937C7.35312 3.76562 7.5 3.4125 7.5 3C7.5 2.5875 7.35312 2.23438 7.05937 1.94062C6.76562 1.64687 6.4125 1.5 6 1.5C5.5875 1.5 5.23438 1.64687 4.94063 1.94062C4.64688 2.23438 4.5 2.5875 4.5 3C4.5 3.4125 4.64688 3.76562 4.94063 4.05937C5.23438 4.35312 5.5875 4.5 6 4.5Z" fill="#C5A059" />
                </svg>
                <span>CLASS {viewingHistory.className.split(" - ")[0]}: <span className="gold-text">85% COMPLETE</span></span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-close-detail" onClick={() => setViewingHistory(null)}>
              Close Detail
            </button>
            <button className="btn-export-transcript" onClick={() => showAlert("OFFICIAL TRANSCRIPT EXPORTED SUCCESSFULLY.")}>
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <path d="M6 9L2.25 5.25L3.3 4.1625L5.25 6.1125V0H6.75V6.1125L8.7 4.1625L9.75 5.25L6 9ZM1.5 12C1.0875 12 0.734375 11.8531 0.440625 11.5594C0.146875 11.2656 0 10.9125 0 10.5V8.25H1.5V10.5H10.5V8.25H12V10.5C12 10.9125 11.8531 11.2656 11.5594 11.5594C11.2656 11.8531 10.9125 12 10.5 12H1.5Z" fill="currentColor" />
              </svg>
              Export Official Transcript
            </button>
          </div>
        </div>

        {/* PROFILE + MAIN GRID CONTENT */}
        <div className="tm-transcript-grid">
          {/* LEFT SIDEBAR: PROFILE CARD */}
          <div className="tm-transcript-profile-card">
            <div className="profile-avatar-circle">
              {viewingHistory.initials}
            </div>
            <h3 className="profile-name">{viewingHistory.traineeName}</h3>
            <span className="profile-badge-role">Senior First Officer</span>

            <div className="profile-details-divider" />

            <div className="profile-info-grid">
              <div className="info-item">
                <span className="info-label">Employee ID</span>
                <span className="info-value">#{viewingHistory.traineeCode.replace("ID: ", "")}-EXEC</span>
              </div>
              <div className="info-item">
                <span className="info-label">Flight Hours</span>
                <span className="info-value">4,280.5 Hrs</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <div className="info-status">
                  <span className="dot" />
                  <span>Active Service</span>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Home Base</span>
                <span className="info-value">VVDN (Da Nang)</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANELS */}
          <div className="tm-transcript-right-content">
            {/* Certifications row */}
            <div className="tm-grid-cols-3">
              {/* Card 1: A320 Type Rating */}
              <div className="tm-cert-card border-gold">
                <div className="cert-header">
                  <div className="icon-wrapper">
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <span className="status-badge emerald">Active</span>
                </div>
                <div className="cert-title-group">
                  <h4>A320 Type Rating</h4>
                  <p>Full Unrestricted Command</p>
                </div>
                <div className="cert-footer">
                  <span className="footer-label">Expiry Date</span>
                  <span className="footer-value">12 NOV 2025</span>
                </div>
              </div>

              {/* Card 2: CAT II/III ILS */}
              <div className="tm-cert-card border-amber">
                <div className="cert-header">
                  <div className="icon-wrapper">
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <span className="status-badge gold">Renewing</span>
                </div>
                <div className="cert-title-group">
                  <h4>CAT II/III ILS</h4>
                  <p>Low Visibility Operations</p>
                </div>
                <div className="cert-footer">
                  <span className="footer-label">Expiry Date</span>
                  <span className="footer-value">28 FEB 2025</span>
                </div>
              </div>

              {/* Card 3: ELP Level 5 */}
              <div className="tm-cert-card border-emerald">
                <div className="cert-header">
                  <div className="icon-wrapper">
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <span className="status-badge emerald">Active</span>
                </div>
                <div className="cert-title-group">
                  <h4>ELP Level 5</h4>
                  <p>English Language Proficiency</p>
                </div>
                <div className="cert-footer">
                  <span className="footer-label">Review Date</span>
                  <span className="footer-value">Permanent</span>
                </div>
              </div>
            </div>

            {/* Training Timeline */}
            <div className="tm-timeline-container-card">
              <h3 className="section-title">Training Timeline (2022-2024)</h3>

              <div className="tm-timeline-vertical">
                {/* Timeline Item 1 */}
                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-card">
                    <div className="card-info">
                      <span className="date">Oct 14, 2024</span>
                      <h4 className="title">B737 to A320 Conversion</h4>
                      <p className="desc">Intensive aircraft transition training program - Grade A-</p>
                    </div>
                    <div className="card-progress">
                      <div className="status-group">
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: "100%" }} />
                        </div>
                        <span className="status-label">Completed</span>
                      </div>
                      <div className="doc-icon">
                        <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                          <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-card">
                    <div className="card-info">
                      <span className="date">May 22, 2023</span>
                      <h4 className="title">Simulator Checkride</h4>
                      <p className="desc">Annual recurrent training & emergency procedure validation</p>
                    </div>
                    <div className="card-progress">
                      <div className="status-group">
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: "100%" }} />
                        </div>
                        <span className="status-label">Completed</span>
                      </div>
                      <div className="doc-icon">
                        <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                          <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 3 */}
                <div className="timeline-item">
                  <div className="timeline-dot blue-dot" />
                  <div className="timeline-card">
                    <div className="card-info">
                      <span className="date">Jan 05, 2022</span>
                      <h4 className="title">Safety Management System (SMS)</h4>
                      <p className="desc">Corporate executive safety protocols and risk mitigation certification</p>
                    </div>
                    <div className="card-progress">
                      <div className="status-group">
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: "100%" }} />
                        </div>
                        <span className="status-label">Completed</span>
                      </div>
                      <div className="doc-icon">
                        <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                          <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Documents */}
            <div className="tm-documents-section-card">
              <div className="section-header">
                <div className="title-group">
                  <h3>Verified Documents</h3>
                </div>
                <button className="filter-btn" onClick={() => showAlert("FILTERS APPLIED.")}>
                  <svg width={11} height={7} viewBox="0 0 11 7" fill="none" style={{ marginRight: "4px" }}>
                    <path d="M4.08333 7V5.83333H6.41667V7H4.08333ZM1.75 4.08333V2.91667H8.75V4.08333H1.75ZM0 1.16667V0H10.5V1.16667H0Z" fill="currentColor" />
                  </svg>
                  Filter Records
                </button>
              </div>

              <div className="tm-documents-grid">
                {/* Doc 1 */}
                <div className="tm-document-card" onClick={() => showAlert("Checkride_Logs_V5.pdf downloaded.")}>
                  <div className="pdf-icon-box">
                    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                      <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="doc-info">
                    <span className="name">Checkride_Logs_V5.pdf</span>
                    <span className="meta">1.8 MB • Verified Log</span>
                  </div>
                  <div className="download-btn">
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <path d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>

                {/* Doc 2 */}
                <div className="tm-document-card" onClick={() => showAlert("Medical_Class1_2024.pdf downloaded.")}>
                  <div className="pdf-icon-box">
                    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                      <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="doc-info">
                    <span className="name">Medical_Class1_2024.pdf</span>
                    <span className="meta">0.9 MB • Health Cert</span>
                  </div>
                  <div className="download-btn">
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <path d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>

                {/* Doc 3 */}
                <div className="tm-document-card" onClick={() => showAlert("SMS_Security_Cert.pdf downloaded.")}>
                  <div className="pdf-icon-box">
                    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                      <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="doc-info">
                    <span className="name">SMS_Security_Cert.pdf</span>
                    <span className="meta">3.1 MB • Security Clear</span>
                  </div>
                  <div className="download-btn">
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <path d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SIGNATURE SECTION */}
        <div className="tm-footer-signature-line">
          <span className="line" />
          <span className="text">Aeronaut Executive Redesign</span>
          <span className="line" />
        </div>
      </div>
    );
  }

  return (
    <div className="tm-dashboard-container">
      {/* ALERT BANNER */}
      {alertInfo.show && (
        <div className={`tm-alert-banner ${alertInfo.type}`}>
          <div className="alert-left">
            <span className="alert-dot" />
            <p>{alertInfo.message}</p>
          </div>
          <button
            onClick={() =>
              setAlertInfo({ show: false, message: "", type: "success" })
            }
            className="close-alert-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="tm-dashboard-header">
        <div className="tm-header-title">
          <h1 style={{ fontSize: "32px", color: "#002147", fontWeight: 600 }}>
            ETR Final Approval
          </h1>
          <p
            style={{
              color: "#545f71",
              fontSize: "15px",
              maxWidth: "768px",
              margin: "7px 0 0 0",
            }}
          >
            Verification queue for QA-validated records awaiting final authority
            signature. High-precision screening required for regulatory
            compliance.
          </p>
        </div>

        <div className="tm-filter-bar border-bottom-layout">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`tab-btn${activeTab === "PENDING" ? " active" : ""}`}
          >
            Pending Review ({etrs.filter((e) => e.status === "PENDING").length})
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`tab-btn${activeTab === "APPROVED" ? " active" : ""}`}
          >
            Approved ({etrs.filter((e) => e.status === "APPROVED").length})
          </button>
          <button
            onClick={() => setActiveTab("RETURNED")}
            className={`tab-btn${activeTab === "RETURNED" ? " active" : ""}`}
          >
            Returned ({etrs.filter((e) => e.status === "RETURNED").length})
          </button>
        </div>
      </div>

      {/* OPERATIONAL SUMMARY ROW */}
      <div className="tm-metrics-grid" style={{ minHeight: "181px" }}>
        {/* TOTAL PENDING */}
        <div
          className="tm-metric-card"
          style={{
            borderRadius: "12px",
            border: "1px solid #e1e4e8",
            padding: "24px",
          }}
        >
          <span className="tm-card-label" style={{ color: "#545f71" }}>
            TOTAL PENDING
          </span>
          <p
            style={{
              fontSize: "44px",
              color: "#002147",
              margin: "8px 0",
              fontWeight: "400",
            }}
          >
            12
          </p>
          <div className="tm-zulu-badge" style={{ marginTop: "auto" }}>
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <path
                d="M5.25 12V2.86875L1.05 7.06875L0 6L6 0L12 6L10.95 7.06875L6.75 2.86875V12H5.25Z"
                fill="#D4AF37"
              />
            </svg>
            <span>+2 since 08:00 Zulu</span>
          </div>
        </div>

        {/* AVG PROCESSING TIME */}
        <div
          className="tm-metric-card"
          style={{
            borderRadius: "12px",
            border: "1px solid #e1e4e8",
            borderTop: "4px solid #c5a059",
            padding: "24px",
          }}
        >
          <span className="tm-card-label" style={{ color: "#545f71" }}>
            AVG. PROCESSING TIME
          </span>
          <p
            style={{
              fontSize: "44px",
              color: "#002147",
              margin: "8px 0",
              fontWeight: "400",
            }}
          >
            4.2h
          </p>
          <div className="tm-gradient-bar-gold" style={{ marginTop: "auto" }} />
        </div>

        {/* SECURITY STATUS */}
        <div className="tm-vault-card tm-col-span-2">
          <div className="tm-vault-icon-bg">
            <svg width={52} height={61} viewBox="0 0 52 61" fill="none">
              <path
                d="M28.9583 56.4583L52.5 32.9167L46.5625 26.9792L28.9583 44.5833L20.2083 35.8333L14.2708 41.7708L28.9583 56.4583ZM33.3333 83.3333C23.6806 80.9028 15.7118 75.3646 9.42708 66.7188C3.14236 58.0729 0 48.4722 0 37.9167V12.5L33.3333 0L66.6667 12.5V37.9167C66.6667 48.4722 63.5243 58.0729 57.2396 66.7188C50.9549 75.3646 42.9861 80.9028 33.3333 83.3333ZM33.3333 74.5833C40.5556 72.2917 46.5278 67.7083 51.25 60.8333C55.9722 53.9583 58.3333 46.3194 58.3333 37.9167V18.2292L33.3333 8.85417L8.33333 18.2292V37.9167C8.33333 46.3194 10.6944 53.9583 15.4167 60.8333C20.1389 67.7083 26.1111 72.2917 33.3333 74.5833Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="tm-vault-label">SECURITY STATUS</span>
          <h2 className="tm-vault-title">AeroVault™ Protocol Active</h2>
          <p className="tm-vault-desc">
            Cryptographic seals are initialized and ready for deployment on
            verified records.
          </p>
        </div>
      </div>

      {/* OPERATIONAL CLASS ANALYTICS ROW */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "4px",
              backgroundColor: "#d4af37",
              borderRadius: "9999px",
            }}
          />
          <h3
            style={{
              fontSize: "20px",
              color: "#002147",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Operational Class Analytics
          </h3>
        </div>

        <div className="tm-grid-cols-3" style={{ minHeight: "145.5px" }}>
          {/* Active Classes */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              ACTIVE CLASSES
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              24
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "auto",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                }}
              />
              <span
                style={{ fontSize: "11px", color: "#545f71", fontWeight: 500 }}
              >
                Live Sessions In Progress
              </span>
            </div>
          </div>

          {/* Avg Attendance */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              AVG. ATTENDANCE
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              94.2%
            </p>
            <div
              className="tm-progress-bar"
              style={{
                marginTop: "auto",
                backgroundColor: "#f4f7fa",
                borderRadius: "9999px",
              }}
            >
              <div
                className="tm-progress-fill"
                style={{
                  width: "94.2%",
                  backgroundColor: "#002147",
                  borderRadius: "9999px",
                }}
              />
            </div>
          </div>

          {/* Near Completion */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              NEAR COMPLETION
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              08
            </p>
            <span
              style={{
                fontSize: "11px",
                color: "#545f71",
                fontWeight: 500,
                marginTop: "auto",
              }}
            >
              Final exams scheduled within 48h
            </span>
          </div>
        </div>
      </div>

      {/* REGISTRY TABLE CARD */}
      <div
        className="tm-table-card"
        style={{
          borderRadius: "12px",
          border: "1px solid #e1e4e8",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        {/* Table Header actions */}
        <div
          className="table-header-bar"
          style={{
            backgroundColor: "#f4f7fa",
            padding: "16px 24px",
            borderBottom: "1px solid #e1e4e8",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "center",
              flex: 1,
            }}
          >
            <div className="tm-search-box" style={{ width: "380px" }}>
              <input
                type="text"
                placeholder="Filter by Student Name, ID or ETR..."
                className="w-full bg-white border border-[#e1e4e8] pl-10 pr-6 py-2 text-sm rounded-lg text-gray-700"
                style={{ width: "380px", borderRadius: "8px" }}
              />
              <div className="tm-search-icon" style={{ left: "12px" }}>
                <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                  <path
                    d="M13.8333 15L8.58333 9.75C8.16667 10.0833 7.6875 10.3472 7.14583 10.5417C6.60417 10.7361 6.02778 10.8333 5.41667 10.8333C3.90278 10.8333 2.62153 10.309 1.57292 9.26042C0.524305 8.21181 0 6.93056 0 5.41667C0 3.90278 0.524305 2.62153 1.57292 1.57292C2.62153 0.524305 3.90278 0 5.41667 0C6.93056 0 8.21181 0.524305 9.26042 1.57292C10.309 2.62153 10.8333 3.90278 10.8333 5.41667C10.8333 6.02778 10.7361 6.60417 10.5417 7.14583C10.3472 7.6875 10.0833 8.16667 9.75 8.58333L15 13.8333L13.8333 15ZM5.41667 9.16667C6.45833 9.16667 7.34375 8.80208 8.07292 8.07292C8.80208 7.34375 9.16667 6.45833 9.16667 5.41667C9.16667 4.375 8.80208 3.48958 8.07292 2.76042C7.34375 2.03125 6.45833 1.66667 5.41667 1.66667C4.375 1.66667 3.48958 2.03125 2.76042 2.76042C2.03125 3.48958 1.66667 4.375 1.66667 5.41667C1.66667 6.45833 2.03125 7.34375 2.76042 8.07292C3.48958 8.80208 4.375 9.16667 5.41667 9.16667Z"
                    fill="#545F71"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <button
              className="tm-btn-secondary"
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            >
              <svg width={14} height={9} viewBox="0 0 14 9" fill="none">
                <path
                  d="M5.25 9V7.5H8.25V9H5.25ZM2.25 5.25V3.75H11.25V5.25H2.25ZM0 1.5V0H13.5V1.5H0Z"
                  fill="#002147"
                />
              </svg>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#002147",
                }}
              >
                FILTER
              </span>
            </button>
            <button
              className="tm-btn-secondary"
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            >
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 9L2.25 5.25L3.3 4.1625L5.25 6.1125V0H6.75V6.1125L8.7 4.1625L9.75 5.25L6 9ZM1.5 12C1.0875 12 0.734375 11.8531 0.440625 11.5594C0.146875 11.2656 0 10.9125 0 10.5V8.25H1.5V10.5H10.5V8.25H12V10.5C12 10.9125 11.8531 11.2656 11.5594 11.5594C11.2656 11.8531 10.9125 12 10.5 12H1.5Z"
                  fill="#002147"
                />
              </svg>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#002147",
                }}
              >
                EXPORT
              </span>
            </button>
          </div>
        </div>

        {/* Navy Header Bar */}
        <div className="tm-table-header-blue">
          <span>AWAITING VERIFICATION REGISTRY</span>
        </div>

        {/* Table Structure */}
        <div className="tm-table-wrapper">
          <table className="tm-table">
            <thead>
              <tr style={{ backgroundColor: "#ffffff" }}>
                <th style={{ padding: "23px 24px", width: "12%" }}>ETR ID</th>
                <th style={{ padding: "23px 24px", width: "22%" }}>
                  PERSONNEL DETAILS
                </th>
                <th style={{ padding: "23px 24px", width: "26%" }}>
                  COURSE MODULE
                </th>
                <th
                  style={{
                    padding: "23px 24px",
                    textAlign: "center",
                    width: "12%",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "23px 24px",
                    textAlign: "right",
                    width: "28%",
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEtrs.length > 0 ? (
                filteredEtrs.map((etr) => (
                  <tr key={etr.id} style={{ borderTop: "1px solid #e1e4e8" }}>
                    <td style={{ padding: "20px 24px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#002147",
                          fontWeight: 600,
                          display: "block",
                          lineHeight: "1.4",
                        }}
                      >
                        {etr.id}
                      </span>
                    </td>
                    <td style={{ padding: "20px 24px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div className="tm-avatar-initials">{etr.initials}</div>
                        <div className="tm-td-name-col">
                          <span className="name">{etr.traineeName}</span>
                          <span
                            className="sub"
                            style={{ fontSize: "10px", color: "#545f71" }}
                          >
                            {etr.traineeCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "20px 24px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#545f71",
                          fontWeight: 500,
                        }}
                      >
                        {etr.className}
                      </span>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          justifyContent: "center",
                        }}
                      >
                        {etr.status === "PENDING" ? (
                          <div className="tm-badge-verified">
                            <svg
                              width={13}
                              height={13}
                              viewBox="0 0 13 13"
                              fill="none"
                            >
                              <path
                                d="M4.43333 12.25L3.325 10.3833L1.225 9.91667L1.42917 7.75833L0 6.125L1.42917 4.49167L1.225 2.33333L3.325 1.86667L4.43333 0L6.41667 0.845833L8.4 0L9.50833 1.86667L11.6083 2.33333L11.4042 4.49167L12.8333 6.125L11.4042 7.75833L11.6083 9.91667L9.50833 10.3833L8.4 12.25L6.41667 11.4042L4.43333 12.25ZM5.80417 8.19583L9.1 4.9L8.28333 4.05417L5.80417 6.53333L4.55 5.30833L3.73333 6.125L5.80417 8.19583Z"
                                fill="#15803D"
                              />
                            </svg>
                            <span>VERIFIED</span>
                          </div>
                        ) : etr.status === "APPROVED" ? (
                          <span className="tm-status-tag active">APPROVED</span>
                        ) : (
                          <span
                            className="tm-status-tag"
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b00020",
                              border: "1px solid #fee2e2",
                            }}
                          >
                            RETURNED
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "right" }}>
                      <div
                        className="tm-action-cell"
                        style={{ alignItems: "center" }}
                      >
                        <button
                          onClick={() => setViewingHistory(etr)}
                          className="tm-btn-secondary"
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            padding: "12px 16px",
                            borderRadius: "4px",
                            border: "1px solid rgba(0,33,71,0.2)",
                          }}
                        >
                          <svg
                            width={11}
                            height={11}
                            viewBox="0 0 11 11"
                            fill="none"
                          >
                            <path
                              d="M5.25 10.5C3.90833 10.5 2.73924 10.0552 1.74271 9.16562C0.746181 8.27604 0.175 7.16528 0.0291667 5.83333H1.225C1.36111 6.84444 1.81076 7.68056 2.57396 8.34167C3.33715 9.00278 4.22917 9.33333 5.25 9.33333C6.3875 9.33333 7.35243 8.93715 8.14479 8.14479C8.93715 7.35243 9.33333 6.3875 9.33333 5.25C9.33333 4.1125 8.93715 3.14757 8.14479 2.35521C7.35243 1.56285 6.3875 1.16667 5.25 1.16667C4.57917 1.16667 3.95208 1.32222 3.36875 1.63333C2.78542 1.94444 2.29444 2.37222 1.89583 2.91667H3.5V4.08333H0V0.583333H1.16667V1.95417C1.6625 1.33194 2.26771 0.850694 2.98229 0.510417C3.69688 0.170139 4.45278 0 5.25 0C5.97917 0 6.66215 0.138542 7.29896 0.415625C7.93576 0.692708 8.48993 1.06701 8.96146 1.53854C9.43299 2.01007 9.80729 2.56424 10.0844 3.20104C10.3615 3.83785 10.5 4.52083 10.5 5.25C10.5 5.97917 10.3615 6.66215 10.0844 7.29896C9.80729 7.93576 9.43299 8.48993 8.96146 8.96146C8.48993 9.43299 7.93576 9.80729 7.29896 10.0844C6.66215 10.3615 5.97917 10.5 5.25 10.5ZM6.88333 7.7L4.66667 5.48333V2.33333H5.83333V5.01667L7.7 6.88333L6.88333 7.7Z"
                              fill="#002147"
                            />
                          </svg>
                          <span>HISTORY</span>
                        </button>
                        {activeTab === "PENDING" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEtr(etr);
                                setShowActionModal("RETURN");
                              }}
                              className="tm-btn-secondary"
                              style={{
                                padding: "15px 16px",
                                color: "#b00020",
                                border: "1px solid rgba(176,0,32,0.2)",
                              }}
                            >
                              REJECT
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEtr(etr);
                                setShowActionModal("APPROVE");
                              }}
                              className="tm-btn-approve-etr"
                            >
                              APPROVE ETR
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "#9ca3af",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            backgroundColor: "rgba(244,247,250,0.5)",
            borderTop: "1px solid #e1e4e8",
          }}
        >
          <div>
            <span style={{ fontSize: "12px", color: "#545f71" }}>
              Showing {filteredEtrs.length} of{" "}
              {etrs.filter((e) => e.status === activeTab).length} pending
              approvals in registry
            </span>
          </div>
          <div className="tm-pagination">
            <button className="page-btn disabled" disabled>
              <svg width={7} height={10} viewBox="0 0 7 10" fill="none">
                <path
                  d="M5 10L0 5L5 0L6.16667 1.16667L2.33333 5L6.16667 8.83333L5 10Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`page-btn${currentPage === 1 ? " active" : ""}`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`page-btn${currentPage === 2 ? " active" : ""}`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`page-btn${currentPage === 3 ? " active" : ""}`}
            >
              3
            </button>
            <button className="page-btn" onClick={() => setCurrentPage(2)}>
              <svg
                width={7}
                height={10}
                viewBox="0 0 7 10"
                fill="none"
                style={{ transform: "rotate(180deg)" }}
              >
                <path
                  d="M5 10L0 5L5 0L6.16667 1.16667L2.33333 5L6.16667 8.83333L5 10Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Authorized Security Compliance Footer */}
        <div className="tm-compliance-footer">
          <svg width={15} height={17} viewBox="0 0 15 17" fill="none">
            <path
              d="M10.5 12.75C10.8125 12.75 11.0781 12.6406 11.2969 12.4219C11.5156 12.2031 11.625 11.9375 11.625 11.625C11.625 11.3125 11.5156 11.0469 11.2969 10.8281C11.0781 10.6094 10.8125 10.5 10.5 10.5C10.1875 10.5 9.92188 10.6094 9.70312 10.8281C9.48438 11.0469 9.375 11.3125 9.375 11.625C9.375 11.9375 9.48438 12.2031 9.70312 12.4219C9.92188 12.6406 10.1875 12.75 10.5 12.75ZM10.5 15C10.875 15 11.225 14.9125 11.55 14.7375C11.875 14.5625 12.1438 14.3188 12.3562 14.0063C12.0687 13.8313 11.7688 13.7031 11.4563 13.6219C11.1438 13.5406 10.825 13.5 10.5 13.5C10.175 13.5 9.85625 13.5406 9.54375 13.6219C9.23125 13.7031 8.93125 13.8313 8.64375 14.0063C8.85625 14.3188 9.125 14.5625 9.45 14.7375C9.775 14.9125 10.125 15 10.5 15ZM3.75 5.25H8.25V3.75C8.25 3.125 8.03125 2.59375 7.59375 2.15625C7.15625 1.71875 6.625 1.5 6 1.5C5.375 1.5 4.84375 1.71875 4.40625 2.15625C3.96875 2.59375 3.75 3.125 3.75 3.75V5.25ZM6.1875 15.75H1.5C1.0875 15.75 0.734375 15.6031 0.440625 15.3094C0.146875 15.0156 0 14.6625 0 14.25V6.75C0 6.3375 0.146875 5.98438 0.440625 5.69063C0.734375 5.39688 1.0875 5.25 1.5 5.25H2.25V3.75C2.25 2.7125 2.61562 1.82812 3.34687 1.09687C4.07812 0.365625 4.9625 0 6 0C7.0375 0 7.92188 0.365625 8.65312 1.09687C9.38437 1.82812 9.75 2.7125 9.75 3.75V5.25H10.5C10.9125 5.25 11.2656 5.39688 11.5594 5.69063C11.8531 5.98438 12 6.3375 12 6.75V7.725C11.775 7.65 11.5406 7.59375 11.2969 7.55625C11.0531 7.51875 10.7875 7.5 10.5 7.5V6.75H1.5V14.25H5.475C5.575 14.55 5.675 14.8094 5.775 15.0281C5.875 15.2469 6.0125 15.4875 6.1875 15.75ZM10.5 16.5C9.4625 16.5 8.57812 16.1344 7.84688 15.4031C7.11563 14.6719 6.75 13.7875 6.75 12.75C6.75 11.7125 7.11563 10.8281 7.84688 10.0969C8.57812 9.36563 9.4625 9 10.5 9C11.5375 9 12.4219 9.36563 13.1531 10.0969C13.8844 10.8281 14.25 11.7125 14.25 12.75C14.25 13.7875 13.8844 14.6719 13.1531 15.4031C12.4219 16.1344 11.5375 16.5 10.5 16.5ZM1.5 6.75C1.5 6.75 1.5 7.11875 1.5 7.85625C1.5 8.59375 1.5 9.41562 1.5 10.3219C1.5 11.2281 1.5 12.0813 1.5 12.8813C1.5 13.6813 1.5 14.1375 1.5 14.25V6.75Z"
              fill="#1A1C1E"
            />
          </svg>
          <p style={{ textTransform: "uppercase", color: "#1a1c1e" }}>
            AUTHORIZED ACCESS ONLY • AVIATION SECURITY PROTOCOL 12-B COMPLIANT •
            SESSION LOGGED
          </p>
        </div>
      </div>

      {/* INSPECT ETR DETAIL MODAL */}
      {selectedEtr && !showActionModal && (
        <div className="tm-modal-overlay">
          <div className="tm-modal-card max-w-2xl">
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3>Inspect Training Record</h3>
                <p className="modal-subtitle">
                  Record ID: {selectedEtr.id} • Status: {selectedEtr.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedEtr(null)}
                className="close-btn"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Trainee Card Info */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#002147",
                      margin: 0,
                    }}
                  >
                    {selectedEtr.traineeName}
                  </h4>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
                    Trainee Code: {selectedEtr.traineeCode}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "block",
                    }}
                  >
                    Class name
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#002147",
                    }}
                  >
                    {selectedEtr.className}
                  </span>
                </div>
              </div>

              {/* Assessment Breakdown List */}
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  Syllabus assessment scores
                </span>
                <div className="tm-assessment-list">
                  {selectedEtr.assessments.map((a, idx) => (
                    <div key={idx} className="row">
                      <div className="title-group">
                        <span className="title">{a.name}</span>
                        <span className="sub">Assessed on {a.date}</span>
                      </div>
                      <div className="score-group">
                        <div className="bar">
                          <div
                            className="fill"
                            style={{ width: `${a.score}%` }}
                          />
                        </div>
                        <span className="value">{a.score}%</span>
                      </div>
                    </div>
                  ))}
                  <div className="summary-row">
                    <span className="label">Overall Average Score</span>
                    <span className="value">{selectedEtr.avgScore}%</span>
                  </div>
                </div>
              </div>

              {/* QA Verification Log */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    QA Verification Log
                  </span>
                  <span style={{ fontSize: "12px", color: "#4b5563" }}>
                    Verified by{" "}
                    <span style={{ fontWeight: 600, color: "#002147" }}>
                      {selectedEtr.qaVerifier}
                    </span>{" "}
                    on {selectedEtr.submissionDate}
                  </span>
                </div>
                <div>
                  <span className="tm-status-tag verified">QA STAMPED</span>
                </div>
              </div>

              {/* Show Returned Feedback if Status is Returned */}
              {selectedEtr.status === "RETURNED" && (
                <div className="tm-feedback-alert">
                  <span className="label">Return Feedback reason</span>
                  <p>
                    {selectedEtr.returnedBy} ({selectedEtr.returnDate}): "
                    {selectedEtr.returnReason}"
                  </p>
                </div>
              )}

              {/* Show Approved Log if Status is Approved */}
              {selectedEtr.status === "APPROVED" && (
                <div className="tm-approved-alert">
                  <div>
                    <span className="label">Approved Log</span>
                    <p>
                      Approved by {selectedEtr.approvedBy} on{" "}
                      {selectedEtr.approvalDate}
                    </p>
                  </div>
                  <span className="stamp">ARCHIVED</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="modal-footer">
              <button
                onClick={() => setSelectedEtr(null)}
                className="tm-btn-secondary"
              >
                Close
              </button>
              {selectedEtr.status === "PENDING" && (
                <>
                  <button
                    onClick={() => setShowActionModal("RETURN")}
                    className="tm-btn-danger"
                  >
                    Return for Correction
                  </button>
                  <button
                    onClick={() => setShowActionModal("APPROVE")}
                    className="tm-btn-success"
                  >
                    Sign off & Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION / INPUT ACTION MODAL */}
      {showActionModal && selectedEtr && (
        <div className="tm-modal-overlay">
          <div className="tm-modal-card max-w-md">
            <div className="modal-header">
              <h3>
                {showActionModal === "APPROVE"
                  ? "Sign Off & Approve ETR"
                  : "Return ETR for Correction"}
              </h3>
            </div>

            <div className="modal-body">
              {showActionModal === "APPROVE" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#4b5563",
                      lineHeight: "1.5",
                      margin: 0,
                    }}
                  >
                    You are signing off on ETR{" "}
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {selectedEtr.id}
                    </span>{" "}
                    for{" "}
                    <span style={{ fontWeight: 600 }}>
                      {selectedEtr.traineeName}
                    </span>
                    .
                  </p>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #dbeafe",
                      fontSize: "11px",
                      color: "#1e40af",
                      lineHeight: "1.4",
                    }}
                  >
                    This action will stamp the training certificate, issue the
                    final approval key, and update the audit log registry
                    permanently.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>
                    Please specify the reason for returning ETR{" "}
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {selectedEtr.id}
                    </span>{" "}
                    to the Instructor/Academic staff.
                  </p>
                  <div className="tm-input-group">
                    <label>Correction Feedback</label>
                    <textarea
                      placeholder="E.g., Missing simulator log signature on page 4, or assessment score mismatch on ground school module."
                      value={returnComment}
                      onChange={(e) => setReturnComment(e.target.value)}
                      rows="4"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowActionModal(null)}
                className="tm-btn-secondary"
              >
                Cancel
              </button>
              {showActionModal === "APPROVE" ? (
                <button
                  onClick={() => handleApprove(selectedEtr.id)}
                  className="tm-btn-success"
                >
                  Confirm Sign Off
                </button>
              ) : (
                <button
                  onClick={() => handleReturn(selectedEtr.id)}
                  className="tm-btn-danger"
                >
                  Send Feedback
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EtrApproval;
