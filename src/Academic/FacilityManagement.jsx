import { useState, useEffect, useMemo } from "react";
import { api, parseApiError } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import { usePagination } from "../utils/usePagination";

const FacilityManagement = () => {
  const toast = useToast();
  const { tr } = useLanguage();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    facilityCode: "",
    facilityName: "",
    facilityType: "Classroom",
    capacity: 30,
    isActive: true,
    description: "",
    locationDetail: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirm Modal
  const [deletingFacility, setDeletingFacility] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const res = await api.get("/TrainingFacilities");
      setFacilities(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error("Error loading facilities:", err);
      toast.error(parseApiError(err, tr("Không thể tải danh sách cơ sở đào tạo")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchSearch =
        searchTerm === "" ||
        f.facilityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.facilityCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.locationDetail?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        typeFilter === "ALL" ||
        String(f.facilityType).toUpperCase() === typeFilter.toUpperCase();

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && f.isActive) ||
        (statusFilter === "INACTIVE" && !f.isActive);

      return matchSearch && matchType && matchStatus;
    });
  }, [facilities, searchTerm, typeFilter, statusFilter]);

  const {
    page: currentPage,
    setPage: setCurrentPage,
    pageCount: totalPages,
    pageItems: paginatedFacilities,
  } = usePagination(filteredFacilities, {
    pageSize: 10,
    resetKey: `${searchTerm}|${typeFilter}|${statusFilter}`,
  });

  // Statistics
  const stats = useMemo(() => {
    const list = Array.isArray(facilities) ? facilities : [];
    const total = list.length;
    const simCount = list.filter(
      (f) => String(f.facilityType).toUpperCase() === "SIMULATOR"
    ).length;
    const airfieldCount = list.filter(
      (f) => String(f.facilityType).toUpperCase() === "AIRFIELD"
    ).length;
    const classroomCount = list.filter(
      (f) => String(f.facilityType).toUpperCase() === "CLASSROOM"
    ).length;
    const workshopCount = list.filter(
      (f) => String(f.facilityType).toUpperCase() === "WORKSHOP"
    ).length;
    return { total, simCount, airfieldCount, classroomCount, workshopCount };
  }, [facilities]);

  const openCreateModal = () => {
    setEditingFacility(null);
    setFormData({
      facilityCode: "",
      facilityName: "",
      facilityType: "Classroom",
      capacity: 30,
      isActive: true,
      description: "",
      locationDetail: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (facility) => {
    setEditingFacility(facility);
    setFormData({
      facilityCode: facility.facilityCode || "",
      facilityName: facility.facilityName || "",
      facilityType: facility.facilityType || "Classroom",
      capacity: facility.capacity || 30,
      isActive: facility.isActive !== false,
      description: facility.description || "",
      locationDetail: facility.locationDetail || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.facilityCode.trim()) {
      setFormError(tr("Vui lòng nhập Mã cơ sở"));
      return;
    }
    if (!formData.facilityName.trim()) {
      setFormError(tr("Vui lòng nhập Tên cơ sở"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        facilityCode: formData.facilityCode.trim().toUpperCase(),
        facilityName: formData.facilityName.trim(),
        facilityType: formData.facilityType,
        capacity: Number(formData.capacity) || 30,
        isActive: formData.isActive,
        description: formData.description.trim() || null,
        locationDetail: formData.locationDetail.trim() || null,
      };

      if (editingFacility) {
        await api.put(`/TrainingFacilities/${editingFacility.facilityId}`, payload);
        toast.success(tr("Cập nhật cơ sở đào tạo thành công!"));
      } else {
        await api.post("/TrainingFacilities", payload);
        toast.success(tr("Thêm cơ sở đào tạo mới thành công!"));
      }

      setShowModal(false);
      await loadFacilities();
    } catch (err) {
      console.error("Save facility error:", err);
      setFormError(parseApiError(err, tr("Lưu cơ sở đào tạo thất bại")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFacility) return;
    setDeleting(true);
    try {
      await api.delete(`/TrainingFacilities/${deletingFacility.facilityId}`);
      toast.success(tr("Đã xóa cơ sở đào tạo!"));
      setDeletingFacility(null);
      await loadFacilities();
    } catch (err) {
      console.error("Delete facility error:", err);
      toast.error(parseApiError(err, tr("Xóa cơ sở đào tạo thất bại")));
    } finally {
      setDeleting(false);
    }
  };

  const renderTypeBadge = (type) => {
    const t = String(type).toUpperCase();
    if (t === "SIMULATOR") {
      return (
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "700",
            backgroundColor: "#f3e8ff",
            color: "#7e22ce",
            border: "1px solid #d8b4fe",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {tr("Mô phỏng (Simulator)")}
        </span>
      );
    }
    if (t === "AIRFIELD") {
      return (
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "700",
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
            border: "1px solid #bae6fd",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {tr("Sân bay / Căn cứ bay")}
        </span>
      );
    }
    if (t === "WORKSHOP") {
      return (
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "700",
            backgroundColor: "#fef3c7",
            color: "#b45309",
            border: "1px solid #fde68a",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {tr("Xưởng kỹ thuật / Cabin")}
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "3px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "700",
          backgroundColor: "#f1f5f9",
          color: "#475569",
          border: "1px solid #cbd5e1",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {tr("Phòng lý thuyết (Classroom)")}
      </span>
    );
  };

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#002147",
              margin: 0,
            }}
          >
            {tr("Cơ sở vật chất & Thiết bị đào tạo")}
          </h1>
          <div
            style={{
              width: "48px",
              height: "3px",
              backgroundColor: "#c5a059",
              margin: "8px 0 10px 0",
              borderRadius: "2px",
            }}
          />
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              margin: 0,
            }}
          >
            {tr(
              "Quản lý danh mục phòng học lý thuyết, buồng lái mô phỏng (FSTD/FFS/FNPT), xưởng kỹ thuật và căn cứ bay huấn luyện."
            )}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          type="button"
          style={{
            backgroundColor: "#002147",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0,33,71,0.2)",
            transition: "all 0.2s ease",
          }}
        >
          <span>+ {tr("THÊM CƠ SỞ MỚI")}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            {tr("Tổng cơ sở đào tạo")}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#002147", marginTop: "4px" }}>
            {stats.total}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#7e22ce", textTransform: "uppercase" }}>
            {tr("Buồng lái mô phỏng (SIM)")}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#7e22ce", marginTop: "4px" }}>
            {stats.simCount}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", textTransform: "uppercase" }}>
            {tr("Sân bay / Căn cứ bay")}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0369a1", marginTop: "4px" }}>
            {stats.airfieldCount}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
            {tr("Phòng học lý thuyết")}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#475569", marginTop: "4px" }}>
            {stats.classroomCount}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#b45309", textTransform: "uppercase" }}>
            {tr("Xưởng kỹ thuật / Cabin")}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#b45309", marginTop: "4px" }}>
            {stats.workshopCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "12px", flex: "1 1 300px", minWidth: "260px" }}>
          <input
            type="text"
            placeholder={tr("Tìm kiếm theo mã, tên hoặc địa điểm...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">{tr("Tất cả loại cơ sở")}</option>
            <option value="Simulator">{tr("Mô phỏng (Simulator)")}</option>
            <option value="Airfield">{tr("Sân bay / Căn cứ bay (Airfield)")}</option>
            <option value="Classroom">{tr("Phòng học lý thuyết (Classroom)")}</option>
            <option value="Workshop">{tr("Xưởng kỹ thuật / Cabin (Workshop)")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">{tr("Tất cả trạng thái")}</option>
            <option value="ACTIVE">{tr("Đang hoạt động")}</option>
            <option value="INACTIVE">{tr("Tạm ngừng hoạt động")}</option>
          </select>
        </div>
      </div>

      {/* Facilities Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>{tr("MÃ CƠ SỞ")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>{tr("TÊN CƠ SỞ ĐÀO TẠO")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>{tr("PHÂN LOẠI")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>{tr("ĐỊA ĐIỂM / VỊ TRÍ")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700", textAlign: "center" }}>{tr("SỨC CHỨA")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700", textAlign: "center" }}>{tr("TRẠNG THÁI")}</th>
              <th style={{ padding: "14px 18px", fontWeight: "700", textAlign: "right" }}>{tr("THAO TÁC")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  {tr("Đang tải danh sách cơ sở đào tạo...")}
                </td>
              </tr>
            ) : (!paginatedFacilities || paginatedFacilities.length === 0) ? (
              <tr>
                <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  {tr("Không tìm thấy cơ sở đào tạo phù hợp.")}
                </td>
              </tr>
            ) : (
              paginatedFacilities.map((fac) => (
                <tr
                  key={fac.facilityId}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "14px 18px", fontWeight: "700", color: "#002147" }}>
                    {fac.facilityCode}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: "600", color: "#1e293b" }}>{fac.facilityName}</div>
                    {fac.description && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {fac.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 18px" }}>{renderTypeBadge(fac.facilityType)}</td>
                  <td style={{ padding: "14px 18px", color: "#475569" }}>
                    {fac.locationDetail || "—"}
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: "600", color: "#475569" }}>
                    {fac.capacity} {tr("người")}
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "center" }}>
                    {fac.isActive ? (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                        }}
                      >
                        {tr("HOẠT ĐỘNG")}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                        }}
                      >
                        {tr("TẠM DỪNG")}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button
                        onClick={() => openEditModal(fac)}
                        type="button"
                        style={{
                          background: "none",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#002147",
                          cursor: "pointer",
                        }}
                      >
                        {tr("Sửa")}
                      </button>
                      <button
                        onClick={() => setDeletingFacility(fac)}
                        type="button"
                        style={{
                          background: "none",
                          border: "1px solid #fca5a5",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#dc2626",
                          cursor: "pointer",
                        }}
                      >
                        {tr("Xóa")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid #e2e8f0" }}>
            <Pagination
              page={currentPage}
              pageCount={totalPages}
              onChange={setCurrentPage}
              total={filteredFacilities.length}
              pageSize={10}
            />
          </div>
        )}
      </div>

      {/* Modal Thêm mới / Cập nhật Cơ sở */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#002147",
                  margin: 0,
                }}
              >
                {editingFacility
                  ? tr("Cập nhật cơ sở đào tạo")
                  : tr("Thêm cơ sở đào tạo mới")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ×
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.65)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr("Mã cơ sở (Code) *")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SIM-B787, CR-103"
                    value={formData.facilityCode}
                    onChange={(e) =>
                      setFormData({ ...formData, facilityCode: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.65)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr("Phân loại (Type) *")}
                  </label>
                  <select
                    value={formData.facilityType}
                    onChange={(e) =>
                      setFormData({ ...formData, facilityType: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="Classroom">{tr("Phòng lý thuyết (Classroom)")}</option>
                    <option value="Simulator">{tr("Mô phỏng (Simulator)")}</option>
                    <option value="Airfield">{tr("Sân bay / Căn cứ bay (Airfield)")}</option>
                    <option value="Workshop">{tr("Xưởng kỹ thuật / Cabin (Workshop)")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(0,33,71,0.65)",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  {tr("Tên cơ sở đào tạo *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thiết bị mô phỏng bay buồng lái Boeing 787 FSTD Level D"
                  value={formData.facilityName}
                  onChange={(e) =>
                    setFormData({ ...formData, facilityName: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.65)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr("Sức chứa tối đa (người)")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.65)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr("Địa điểm / Phòng / Tòa nhà")}
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Hangar B, Tầng 2"
                    value={formData.locationDetail}
                    onChange={(e) =>
                      setFormData({ ...formData, locationDetail: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(0,33,71,0.65)",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  {tr("Mô tả kỹ thuật")}
                </label>
                <textarea
                  rows="2"
                  placeholder="VD: Thiết bị buồng lái mô phỏng bay đạt chuẩn Level D được CAAV/EASA phê chuẩn..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="isActiveFacility"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label
                  htmlFor="isActiveFacility"
                  style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}
                >
                  {tr("Cơ sở đang hoạt động và sẵn sàng xếp lịch")}
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  {tr("Hủy")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#002147",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#ffffff",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(0,33,71,0.25)",
                  }}
                >
                  {saving ? tr("Đang lưu...") : editingFacility ? tr("Cập nhật") : tr("Tạo cơ sở")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingFacility && (
        <ConfirmModal
          isOpen={true}
          title={tr("Xóa cơ sở đào tạo")}
          message={`${tr("Bạn có chắc chắn muốn xóa cơ sở")} "${deletingFacility.facilityName}" (${deletingFacility.facilityCode})? ${tr("Các buổi học đang tham chiếu cơ sở này có thể cần được xếp lại.")}`}
          confirmText={deleting ? tr("Đang xóa...") : tr("Xác nhận xóa")}
          cancelText={tr("Hủy")}
          isDangerous={true}
          onConfirm={handleDelete}
          onCancel={() => setDeletingFacility(null)}
        />
      )}
    </div>
  );
};

export default FacilityManagement;
