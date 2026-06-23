import { useState } from 'react';

const EditLearner = ({ learner, onSave, onCancel }) => {
  // Input states
  const [fullName, setFullName] = useState(learner.fullName || '');
  const [email, setEmail] = useState(learner.email || '');
  const [dob, setDob] = useState(learner.dob || '');
  const [gender, setGender] = useState(learner.gender || 'Nam');
  const [phone, setPhone] = useState(learner.phone || '0987 654 321');
  const [cccd, setCccd] = useState(learner.cccd || '001203004567');
  const [organization, setOrganization] = useState(learner.organization || '');
  const [learnerType, setLearnerType] = useState(learner.learnerType || 'Kỹ thuật viên');
  const [address, setAddress] = useState(learner.address || '123 Đường Láng, Quận Đống Đa, TP. Hà Nội');
  const [status, setStatus] = useState(learner.status || 'ĐANG HỌC');
  const [statusReason, setStatusReason] = useState('');

  // Class allocation state
  const getInitialClasses = () => {
    if (learner.code === 'AM-2409-001') {
      return [
        { code: 'ETR-2024-A1', name: 'Kỹ thuật Hàng không Cơ bản', instructor: 'TS. Trần Quang Hải' },
        { code: 'METRIC-09', name: 'Phân tích Chỉ số Hiệu năng', instructor: 'ThS. Lê Minh Tâm' },
      ];
    }
    if (learner.code === 'AM-2409-003') {
      return [
        { code: 'ETR-2024-A2', name: 'Thiết kế Cánh & Động cơ Phản lực', instructor: 'TS. Trần Quang Hải' },
      ];
    }
    return [];
  };

  const [assignedClasses, setAssignedClasses] = useState(getInitialClasses());

  const handleDeleteClass = (classCode) => {
    setAssignedClasses(assignedClasses.filter((c) => c.code !== classCode));
  };

  const handleAddClass = () => {
    // Add a mock new class for demonstration
    const newClass = {
      code: `ETR-2024-B${assignedClasses.length + 1}`,
      name: 'Khí động lực học ứng dụng',
      instructor: 'PGS. TS. Nguyễn Văn Dũng',
    };
    setAssignedClasses([...assignedClasses, newClass]);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updatedLearner = {
      ...learner,
      fullName,
      email,
      dob,
      gender,
      phone,
      cccd,
      organization,
      learnerType,
      address,
      status,
      isActive: status === 'ĐANG HỌC',
      className: status === 'ĐANG HỌC' ? (learner.className || 'AERO-B1-2024') : '',
    };
    onSave(updatedLearner);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb Area */}
      <nav className="breadcrumb-nav">
        <span className="breadcrumb-item" onClick={onCancel} style={{ cursor: 'pointer' }}>DASHBOARD</span>
        <svg width="4" height="6" viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" />
        </svg>
        <span className="breadcrumb-item" onClick={onCancel} style={{ cursor: 'pointer' }}>LEARNERS</span>
        <svg width="4" height="6" viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" />
        </svg>
        <span className="breadcrumb-item active">UPDATE PROFILE</span>
      </nav>

      {/* Page Title */}
      <div className="content-header" style={{ marginBottom: '12px' }}>
        <div className="header-left">
          <h1>Cập nhật hồ sơ & Trạng thái học viên</h1>
          <div className="divider-gold" />
        </div>
      </div>

      <form onSubmit={handleSave} className="edit-grid">
        {/* Left Column: Basic Info & Classes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="edit-card">
            <div className="card-top-accent" />
            
            <header className="edit-card-header">
              <div className="header-info-group">
                <div className="header-icon">
                  <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 20V16.5C0 15.7917 0.182292 15.1406 0.546875 14.5469C0.911458 13.9531 1.39583 13.5 2 13.1875C3.29167 12.5417 4.60417 12.0573 5.9375 11.7344C7.27083 11.4115 8.625 11.25 10 11.25C10.7708 11.25 11.5312 11.2969 12.2812 11.3906C13.0312 11.4844 13.7812 11.6354 14.5312 11.8438L12.4375 13.9688C12.0208 13.9062 11.6146 13.8542 11.2188 13.8125C10.8229 13.7708 10.4167 13.75 10 13.75C8.83333 13.75 7.67708 13.8906 6.53125 14.1719C5.38542 14.4531 4.25 14.875 3.125 15.4375C2.9375 15.5417 2.78646 15.6875 2.67188 15.875C2.55729 16.0625 2.5 16.2708 2.5 16.5V17.5H10V20H0ZM12.5 21.25V17.4062L19.4062 10.5312C19.5938 10.3438 19.8021 10.2083 20.0312 10.125C20.2604 10.0417 20.4896 10 20.7188 10C20.9688 10 21.2083 10.0469 21.4375 10.1406C21.6667 10.2344 21.875 10.375 22.0625 10.5625L23.2188 11.7188C23.3854 11.9062 23.5156 12.1146 23.6094 12.3438C23.7031 12.5729 23.75 12.8021 23.75 13.0312C23.75 13.2604 23.7083 13.4948 23.625 13.7344C23.5417 13.974 23.4062 14.1875 23.2188 14.375L16.3438 21.25H12.5ZM21.875 13.0312L20.7188 11.875L21.875 13.0312ZM14.375 19.375H15.5625L19.3438 15.5625L18.7812 14.9688L18.1875 14.4062L14.375 18.1875V19.375ZM18.7812 14.9688L18.1875 14.4062L19.3438 15.5625L18.7812 14.9688ZM10 10C8.625 10 7.44792 9.51042 6.46875 8.53125C5.48958 7.55208 5 6.375 5 5C5 3.625 5.48958 2.44792 6.46875 1.46875C7.44792 0.489583 8.625 0 10 0C11.375 0 12.5521 0.489583 13.5312 1.46875C14.5104 2.44792 15 3.625 15 5C15 6.375 14.5104 7.55208 13.5312 8.53125C12.5521 9.51042 11.375 10 10 10ZM10 7.5C10.6875 7.5 11.276 7.25521 11.7656 6.76562C12.2552 6.27604 12.5 5.6875 12.5 5C12.5 4.3125 12.2552 3.72396 11.7656 3.23438C11.276 2.74479 10.6875 2.5 10 2.5C9.3125 2.5 8.72396 2.74479 8.23438 3.23438C7.74479 3.72396 7.5 4.3125 7.5 5C7.5 5.6875 7.74479 6.27604 8.23438 6.76562C8.72396 7.25521 9.3125 7.5 10 7.5Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="header-text">
                  <h2>THÔNG TIN CƠ BẢN</h2>
                  <p>Định danh học viên trong hệ thống AeroMetric</p>
                </div>
              </div>

              <div className="header-id-badge">
                <div className="id-label">STUDENT CODE</div>
                <div className="id-value">{learner.code}</div>
              </div>
            </header>

            {/* Input Form Fields */}
            <div className="edit-form-grid">
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Họ và tên
                </label>
                <input
                  type="text"
                  className="premium-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Email học viên
                </label>
                <input
                  type="email"
                  className="premium-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Ngày sinh
                </label>
                <input
                  type="date"
                  className="premium-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Giới tính
                </label>
                <select
                  className="premium-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Số điện thoại
                </label>
                <input
                  type="text"
                  className="premium-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Số CCCD / Citizen ID
                </label>
                <input
                  type="text"
                  className="premium-input"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Cơ quan / Tổ chức
                </label>
                <input
                  type="text"
                  className="premium-input"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Loại học viên
                </label>
                <select
                  className="premium-input"
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

              <div className="form-group-full">
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Địa chỉ thường trú
                </label>
                <input
                  type="text"
                  className="premium-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Class Allocation Panel */}
          <div className="edit-card">
            <div className="card-top-accent" />
            
            <div className="assigned-classes-section">
              <header className="edit-card-header" style={{ paddingBottom: '16px', marginBottom: '8px', borderBottom: '1px solid #e0e4e9' }}>
                <div className="header-info-group">
                  <div className="header-icon">
                    <svg width="24" height="20" viewBox="0 0 28 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.75 22.5L5 17.75V10.25L0 7.5L13.75 0L27.5 7.5V17.5H25V8.875L22.5 10.25V17.75L13.75 22.5ZM13.75 12.125L22.3125 7.5L13.75 2.875L5.1875 7.5L13.75 12.125ZM13.75 19.6562L20 16.2812V11.5625L13.75 15L7.5 11.5625V16.2812L13.75 19.6562Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="header-text">
                    <h2>PHÂN BỔ LỚP HỌC</h2>
                  </div>
                </div>
              </header>

              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Mã lớp</th>
                    <th>Tên khóa học</th>
                    <th>Giảng viên</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedClasses.length > 0 ? (
                    assignedClasses.map((item) => (
                      <tr key={item.code}>
                        <td className="class-code">{item.code}</td>
                        <td className="course-name">{item.name}</td>
                        <td className="instructor-name">{item.instructor}</td>
                        <td style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDeleteClass(item.code)}
                            aria-label="Xóa lớp học"
                          >
                            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5.4 13.5L8 10.9L10.6 13.5L12 12.1L9.4 9.5L12 6.9L10.6 5.5L8 8.1L5.4 5.5L4 6.9L6.6 9.5L4 12.1L5.4 13.5ZM3 18C2.45 18 1.97917 17.8042 1.5875 17.4125C1.19583 17.0208 1 16.55 1 16V3H0V1H5V0H11V1H16V3H15V16C15 16.55 14.8042 17.0208 14.4125 17.4125C14.0208 17.8042 13.55 18 13 18H3ZM13 3H3V16H13V3ZM3 3V16V3Z" fill="currentColor" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'rgba(0, 33, 71, 0.4)', fontStyle: 'italic' }}>
                        Chưa phân bổ lớp học nào cho học viên này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <button type="button" className="add-class-btn-dashed" onClick={handleAddClass}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 15H11V11H15V9H11V5H9V9H5V11H9V15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="currentColor" />
                </svg>
                <span>ĐĂNG KÝ THÊM LỚP HỌC MỚI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Status Management */}
        <div className="edit-card status-card">
          <div className="card-top-accent" />
          
          <header className="status-header">
            <div className="status-icon">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H6.2C6.43333 1.4 6.8 0.916667 7.3 0.55C7.8 0.183333 8.36667 0 9 0C9.63333 0 10.2 0.183333 10.7 0.55C11.2 0.916667 11.5667 1.4 11.8 2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM9 3.25C9.21667 3.25 9.39583 3.17917 9.5375 3.0375C9.67917 2.89583 9.75 2.71667 9.75 2.5C9.75 2.28333 9.67917 2.10417 9.5375 1.9625C9.39583 1.82083 9.21667 1.75 9 1.75C8.78333 1.75 8.60417 1.82083 8.4625 1.9625C8.32083 2.10417 8.25 2.28333 8.25 2.5C8.25 2.71667 8.32083 2.89583 8.4625 3.0375C8.60417 3.17917 8.78333 3.25 9 3.25ZM2 16.85C2.9 15.9667 3.94583 15.2708 5.1375 14.7625C6.32917 14.2542 7.61667 14 9 14C10.3833 14 11.6708 14.2542 12.8625 14.7625C14.0542 15.2708 15.1 15.9667 16 16.85V4H2V16.85ZM9 12C9.96667 12 10.7917 11.6583 11.475 10.975C12.1583 10.2917 12.5 9.46667 12.5 8.5C12.5 7.53333 12.1583 6.70833 11.475 6.025C10.7917 5.34167 9.96667 5 9 5C8.03333 5 7.20833 5.34167 6.525 6.025C5.84167 6.70833 5.5 7.53333 5.5 8.5C5.5 9.46667 5.84167 10.2917 6.525 10.975C7.20833 11.6583 8.03333 12 9 12ZM4 18H14C14 17.95 14 17.9083 14 17.875C14 17.8417 14 17.8 14 17.75C13.3 17.1667 12.525 16.7292 11.675 16.4375C10.825 16.1458 9.93333 16 9 16C8.06667 16 7.175 16.1458 6.325 16.4375C5.475 16.7292 4.7 17.1667 4 17.75C4 17.8 4 17.8417 4 17.875C4 17.9083 4 17.95 4 18ZM9 10C8.58333 10 8.22917 9.85417 7.9375 9.5625C7.64583 9.27083 7.5 8.91667 7.5 8.5C7.5 8.08333 7.64583 7.72917 7.9375 7.4375C8.22917 7.14583 8.58333 7 9 7C9.41667 7 9.77083 7.14583 10.0625 7.4375C10.3542 7.72917 10.5 8.08333 10.5 8.5C10.5 8.91667 10.3542 9.27083 10.0625 9.5625C9.77083 9.85417 9.41667 10 9 10Z" fill="currentColor" />
              </svg>
            </div>
            <h2>QUẢN LÝ TRẠNG THÁI</h2>
          </header>

          <div className="status-options-list">
            {[
              { id: 'ĐANG HỌC', label: 'ĐANG HỌC', eng: '(ACTIVE)', desc: 'Tham gia học tập đầy đủ' },
              { id: 'BẢO LƯU', label: 'BẢO LƯU', eng: '(SUSPENDED)', desc: 'Tạm dừng có thời hạn' },
              { id: 'TỐT NGHIỆP', label: 'TỐT NGHIỆP', eng: '(GRADUATED)', desc: 'Hoàn thành chương trình' },
              { id: 'NGHỈ HỌC', label: 'NGHỈ HỌC', eng: '(DROPPED)', desc: 'Dừng học vĩnh viễn' },
            ].map((option) => {
              const isSelected = status === option.id;
              const isCurrentInDb = learner.status === option.id;
              return (
                <div
                  key={option.id}
                  className={`status-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setStatus(option.id)}
                >
                  <div className="radio-circle" />
                  <div className="option-info">
                    <div className="option-title">
                      {option.label} {option.eng}
                    </div>
                    <div className="option-desc">{option.desc}</div>
                  </div>
                  {isCurrentInDb && <span className="current-badge">CURRENT</span>}
                </div>
              );
            })}
          </div>

          <div className="status-change-reason">
            <label htmlFor="reason-textarea">Lý do thay đổi trạng thái</label>
            <textarea
              id="reason-textarea"
              className="premium-textarea"
              placeholder="Nhập ghi chú chi tiết lý do thay đổi..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <footer className="action-footer-bar">
          <button type="button" className="footer-cancel-btn" onClick={onCancel}>
            HỦY THAY ĐỔI
          </button>
          
          <button type="submit" className="footer-save-btn">
            <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.79167 11.2917L10.5 6.58333L9.3125 5.39583L5.79167 8.91667L4.04167 7.16667L2.85417 8.35417L5.79167 11.2917ZM6.66667 16.6667C4.73611 16.1806 3.14236 15.0729 1.88542 13.3438C0.628472 11.6146 0 9.69444 0 7.58333V2.5L6.66667 0L13.3333 2.5V7.58333C13.3333 9.69444 12.7049 11.6146 11.4479 13.3438C10.191 15.0729 8.59722 16.1806 6.66667 16.6667ZM6.66667 14.9167C8.11111 14.4583 9.30556 13.5417 10.25 12.1667C11.1944 10.7917 11.6667 9.26389 11.6667 7.58333V3.64583L6.66667 1.77083L1.66667 3.64583V7.58333C1.66667 9.26389 2.13889 10.7917 3.08333 12.1667C4.02778 13.5417 5.22222 14.4531 6.66667 14.9167Z" fill="currentColor" />
            </svg>
            <span>LƯU HỒ SƠ HỌC VIÊN</span>
          </button>
        </footer>
      </form>
    </div>
  );
};

export default EditLearner;
