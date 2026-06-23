import { useState } from "react";
import EditLearner from "./EditLearner";

const initialLearners = [
  {
    code: "AM-2409-001",
    fullName: "Nguyễn Văn A",
    dob: "2000-08-15",
    gender: "Nam",
    phone: "0987 654 321",
    email: "vana.nguyen@example.com",
    cccd: "012345678901",
    organization: "Vietnam Airlines",
    learnerType: "Kỹ thuật viên",
    address: "123 Đường Láng, Quận Đống Đa, TP. Hà Nội",
    className: "AERO-B1-2024",
    status: "ĐANG HỌC",
    isActive: true,
  },
  {
    code: "AM-2409-002",
    fullName: "Trần Thị B",
    dob: "2002-05-20",
    gender: "Nữ",
    phone: "0912 345 678",
    email: "thib.tran@example.com",
    cccd: "098765432109",
    organization: "Bamboo Airways",
    learnerType: "Tiếp viên",
    address: "456 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
    className: "",
    status: "CHỜ GHI DANH",
    isActive: false,
  },
  {
    code: "AM-2409-003",
    fullName: "Lê Hoàng C",
    dob: "1998-11-30",
    gender: "Nam",
    phone: "0909 888 777",
    email: "hoangc.le@example.com",
    cccd: "055201004567",
    organization: "Vietjet Air",
    learnerType: "Phi công",
    address: "789 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng",
    className: "AERO-A2-2024",
    status: "ĐANG HỌC",
    isActive: true,
  },
];

const LearnerManagement = () => {
  const [learners, setLearners] = useState(initialLearners);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState(null);
  const [enrollingLearner, setEnrollingLearner] = useState(null);

  // Form states for creating new learner
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Nam");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cccd, setCccd] = useState("");
  const [organization, setOrganization] = useState("");
  const [learnerType, setLearnerType] = useState("Kỹ thuật viên");
  const [address, setAddress] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("ĐANG HỌC");

  // Form states for enrolling learner
  const [enrollClass, setEnrollClass] = useState("AERO-B1-2024");
  const [enrollDate, setEnrollDate] = useState("2026-06-23");

  const handleOpenCreateModal = () => {
    // Preset next auto code but user can edit it
    const nextNum = learners.length + 1;
    const formattedNum = String(nextNum).padStart(3, "0");
    setCode(`AM-2409-${formattedNum}`);

    // Clear form states
    setFullName("");
    setDob("");
    setGender("Nam");
    setPhone("");
    setEmail("");
    setCccd("");
    setOrganization("");
    setLearnerType("Kỹ thuật viên");
    setAddress("");
    setClassName("");
    setStatus("ĐANG HỌC");

    setIsModalOpen(true);
  };

  const handleCreateLearner = (e) => {
    e.preventDefault();

    const newLearner = {
      code: code || `AM-2409-${String(learners.length + 1).padStart(3, "0")}`,
      fullName,
      dob,
      gender,
      phone,
      email,
      cccd,
      organization,
      learnerType,
      address: address || "123 Đường Láng, Quận Đống Đa, TP. Hà Nội",
      className,
      status,
      isActive: status === "ĐANG HỌC",
    };

    setLearners([...learners, newLearner]);
    setIsModalOpen(false);
  };

  const handleSaveLearner = (updatedLearner) => {
    setLearners(
      learners.map((l) =>
        l.code === updatedLearner.code ? updatedLearner : l,
      ),
    );
    setEditingLearner(null);
  };

  const handleConfirmEnroll = (e) => {
    e.preventDefault();
    if (!enrollingLearner) return;

    const updatedLearner = {
      ...enrollingLearner,
      className: enrollClass,
      status: "ĐANG HỌC",
      isActive: true,
    };

    setLearners(
      learners.map((l) =>
        l.code === enrollingLearner.code ? updatedLearner : l,
      ),
    );
    setEnrollingLearner(null);
  };

  // If in edit mode, render the EditLearner component
  if (editingLearner) {
    return (
      <EditLearner
        learner={editingLearner}
        onSave={handleSaveLearner}
        onCancel={() => setEditingLearner(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Content Header Section */}
      <section className="content-header">
        <div className="header-left">
          <h1>Danh sách Học viên</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Quản lý hồ sơ và quy trình ghi danh học viên vào các chương trình
            đào tạo hàng không cao cấp.
          </p>
        </div>

        <button
          className="create-btn"
          type="button"
          onClick={handleOpenCreateModal}
        >
          <svg
            width="19"
            height="14"
            viewBox="0 0 19 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.1667 8.33333V5.83333H11.6667V4.16667H14.1667V1.66667H15.8333V4.16667H18.3333V5.83333H15.8333V8.33333H14.1667ZM6.66667 6.66667C5.75 6.66667 4.96528 6.34028 4.3125 5.6875C3.65972 5.03472 3.33333 4.25 3.33333 3.33333C3.33333 2.41667 3.65972 1.63194 4.3125 0.979167C4.96528 0.326389 5.75 0 6.66667 0C7.58333 0 8.36806 0.326389 9.02083 0.979167C9.67361 1.63194 10 2.41667 10 3.33333C10 4.25 9.67361 5.03472 9.02083 5.6875C8.36806 6.34028 7.58333 6.66667 6.66667 6.66667ZM0 13.3333V11C0 10.5278 0.121528 10.0938 0.364583 9.69792C0.607639 9.30208 0.930556 9 1.33333 8.79167C2.19444 8.36111 3.06944 8.03819 3.95833 7.82292C4.84722 7.60764 5.75 7.5 6.66667 7.5C7.58333 7.5 8.48611 7.60764 9.375 7.82292C10.2639 8.03819 11.1389 8.36111 12 8.79167C12.4028 9 12.7257 9.30208 12.9688 9.69792C13.2118 10.0938 13.3333 10.5278 13.3333 11V13.3333H0ZM1.66667 11.6667H11.6667V11C11.6667 10.8472 11.6285 10.7083 11.5521 10.5833C11.4757 10.4583 11.375 10.3611 11.25 10.2917C10.5 9.91667 9.74306 9.63542 8.97917 9.44792C8.21528 9.26042 7.44444 9.16667 6.66667 9.16667C5.88889 9.16667 5.11806 9.26042 4.35417 9.44792C3.59028 9.63542 2.83333 9.91667 2.08333 10.2917C1.95833 10.3611 1.85764 10.4583 1.78125 10.5833C1.70486 10.7083 1.66667 10.8472 1.66667 11V11.6667ZM6.66667 5C7.125 5 7.51736 4.83681 7.84375 4.51042C8.17014 4.18403 8.33333 3.79167 8.33333 3.33333C8.33333 2.875 8.17014 2.48264 7.84375 2.15625C7.51736 1.82986 7.125 1.66667 6.66667 1.66667C6.20833 1.66667 5.81597 1.82986 5.48958 2.15625C5.16319 2.48264 5 2.875 5 3.33333C5 3.79167 5.16319 4.18403 5.48958 4.51042C5.81597 4.83681 6.20833 5 6.66667 5Z"
              fill="currentColor"
            />
          </svg>
          <span>TẠO HỒ SƠ HỌC VIÊN</span>
        </button>
      </section>

      {/* Table Section */}
      <section className="table-card">
        <div className="table-header data-table-layout">
          <div>Mã học viên</div>
          <div>Họ và tên</div>
          <div>Email</div>
          <div>CCCD/ID</div>
          <div>Lớp</div>
          <div>Trạng thái</div>
          <div style={{ textAlign: "right" }}>Hành động</div>
        </div>

        <div className="table-body">
          {learners.map((learner) => (
            <div key={learner.code} className="table-row data-table-layout">
              <div className="col-id" data-label="Mã học viên">
                {learner.code}
              </div>
              <div className="col-name" data-label="Họ và tên">
                {learner.fullName}
              </div>
              <div className="col-email" data-label="Email">
                {learner.email}
              </div>
              <div className="col-cccd" data-label="CCCD/ID">
                {learner.cccd}
              </div>
              <div className="col-class" data-label="Lớp">
                {learner.className ? (
                  <span className="class-badge">{learner.className}</span>
                ) : (
                  <span className="no-class">Chưa ghi danh</span>
                )}
              </div>
              <div className="col-status" data-label="Trạng thái">
                <span
                  className={`status-indicator ${learner.isActive ? "active" : "pending"}`}
                />
                <span
                  className={`status-text ${learner.isActive ? "active" : "pending"}`}
                >
                  {learner.status}
                </span>
              </div>
              <div className="col-actions" data-label="Hành động">
                <button
                  className="edit-icon-btn"
                  type="button"
                  aria-label="Sửa học viên"
                  onClick={() => setEditingLearner(learner)}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.66667 13.3333H2.85417L11 5.1875L9.8125 4L1.66667 12.1458V13.3333ZM0 15V11.4583L11 0.479167C11.1667 0.326389 11.3507 0.208333 11.5521 0.125C11.7535 0.0416667 11.9653 0 12.1875 0C12.4097 0 12.625 0.0416667 12.8333 0.125C13.0417 0.208333 13.2222 0.333333 13.375 0.5L14.5208 1.66667C14.6875 1.81944 14.809 2 14.8854 2.20833C14.9618 2.41667 15 2.625 15 2.83333C15 3.05556 14.9618 3.26736 14.8854 3.46875C14.809 3.67014 14.6875 3.85417 14.5208 4.02083L3.54167 15H0ZM13.3333 2.83333L12.1667 1.66667L13.3333 2.83333ZM10.3958 4.60417L9.8125 4L11 5.1875L10.3958 4.60417Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  className="enroll-btn"
                  type="button"
                  onClick={() => {
                    setEnrollingLearner(learner);
                    setEnrollClass(learner.className || "AERO-B1-2024");
                  }}
                >
                  Ghi danh
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Table Footer / Pagination */}
        <div className="table-footer">
          <span className="footer-info">
            Hiển thị {learners.length} trên 128 học viên
          </span>
          <div className="pagination">
            <button
              className="page-arrow"
              type="button"
              aria-label="Trang trước"
              disabled
            >
              <svg
                width="7"
                height="10"
                viewBox="0 0 7 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 10L0 5L5 0L6.16667 1.16667L2.33333 5L6.16667 8.83333L5 10Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button className="page-num active" type="button">
              1
            </button>
            <button className="page-num" type="button">
              2
            </button>
            <button className="page-arrow" type="button" aria-label="Trang sau">
              <svg
                width="7"
                height="10"
                viewBox="0 0 7 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.83333 5L0 1.16667L1.16667 0L6.16667 5L1.16667 10L0 8.83333L3.83333 5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Modal - Tạo hồ sơ học viên */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: "700px" }}>
            <header className="modal-header">
              <h2>Tạo hồ sơ học viên</h2>
              <button
                className="close-btn"
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleCreateLearner}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="learner-code">Mã học viên</label>
                    <input
                      id="learner-code"
                      type="text"
                      placeholder="Mã học viên (ví dụ: AM-2409-004)"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="learner-name">Họ và tên</label>
                    <input
                      id="learner-name"
                      type="text"
                      placeholder="Nhập họ và tên học viên"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="learner-dob">Ngày sinh</label>
                    <input
                      id="learner-dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="learner-gender">Giới tính</label>
                    <select
                      id="learner-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="learner-phone">Số điện thoại</label>
                    <input
                      id="learner-phone"
                      type="text"
                      placeholder="Nhập số điện thoại"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="learner-email">Email</label>
                    <input
                      id="learner-email"
                      type="email"
                      placeholder="Nhập email học viên"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="learner-cccd">Số CCCD</label>
                    <input
                      id="learner-cccd"
                      type="text"
                      placeholder="Nhập số CCCD"
                      value={cccd}
                      onChange={(e) => setCccd(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="learner-org">Cơ quan / Tổ chức</label>
                    <input
                      id="learner-org"
                      type="text"
                      placeholder="Nhập tên cơ quan/tổ chức"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="learner-type">Loại học viên</label>
                    <select
                      id="learner-type"
                      value={learnerType}
                      onChange={(e) => setLearnerType(e.target.value)}
                      required
                    >
                      <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                      <option value="Phi công">Phi công</option>
                      <option value="Tiếp viên">Tiếp viên</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  {/* <div className="form-group">
                    <label htmlFor="learner-class">Lớp học ban đầu</label>
                    <select
                      id="learner-class"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    >
                      <option value="">Chưa ghi danh</option>
                      <option value="AERO-B1-2024">AERO-B1-2024</option>
                      <option value="AERO-A2-2024">AERO-A2-2024</option>
                    </select>
                  </div> */}
                </div>

                <div className="form-row">
                  {/* <div className="form-group">
                    <label htmlFor="learner-status">Trạng thái học vụ</label>
                    <select
                      id="learner-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="ĐANG HỌC">Đang học</option>
                      <option value="CHỜ GHI DANH">Chờ ghi danh</option>
                    </select>
                  </div> */}

                  {/* <div className="form-group">
                    <label htmlFor="learner-address">Địa chỉ thường trú</label>
                    <input
                      id="learner-address"
                      type="text"
                      placeholder="Nhập địa chỉ thường trú học viên"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div> */}
                </div>
              </div>

              <footer className="modal-footer">
                <button
                  className="modal-cancel-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button className="modal-submit-btn" type="submit">
                  Tạo hồ sơ
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Ghi danh học viên */}
      {enrollingLearner && (
        <div className="modal-overlay">
          <div className="modal-container">
            <header className="modal-header">
              <h2>Ghi danh học viên</h2>
              <button
                className="close-btn"
                type="button"
                onClick={() => setEnrollingLearner(null)}
                aria-label="Đóng"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleConfirmEnroll}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Thông tin học viên</label>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#002147",
                      fontSize: "14px",
                      backgroundColor: "#f4f7fa",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e4e9",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div>
                      Họ và tên:{" "}
                      <span style={{ color: "#c5a059" }}>
                        {enrollingLearner.fullName}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(0, 33, 71, 0.6)",
                        fontWeight: 600,
                      }}
                    >
                      Mã số: {enrollingLearner.code} | Email:{" "}
                      {enrollingLearner.email}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="enroll-class-select">
                    Chọn lớp học đăng ký
                  </label>
                  <select
                    id="enroll-class-select"
                    value={enrollClass}
                    onChange={(e) => setEnrollClass(e.target.value)}
                    required
                  >
                    <option value="AERO-B1-2024">
                      AERO-B1-2024 - Kỹ thuật Hàng không Cơ bản (B1)
                    </option>
                    <option value="AERO-A2-2024">
                      AERO-A2-2024 - Thiết kế Động cơ phản lực (A2)
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="enroll-date-input">
                    Ngày ghi danh vào lớp
                  </label>
                  <input
                    id="enroll-date-input"
                    type="date"
                    value={enrollDate}
                    onChange={(e) => setEnrollDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <footer className="modal-footer">
                <button
                  className="modal-cancel-btn"
                  type="button"
                  onClick={() => setEnrollingLearner(null)}
                >
                  Hủy bỏ
                </button>
                <button className="modal-submit-btn" type="submit">
                  Xác nhận ghi danh
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerManagement;
