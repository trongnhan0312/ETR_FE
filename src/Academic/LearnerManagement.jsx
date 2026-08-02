import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const LearnerManagement = () => {
  const [learners, setLearners] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create Profile (for learner account without a profile yet) Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileAcc, setProfileAcc] = useState(null);
  const [pFullName, setPFullName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pDateOfBirth, setPDateOfBirth] = useState('');
  const [pGender, setPGender] = useState('Male');

  // Create Form State (Student only)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Default@123');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [gender, setGender] = useState('Male');

  // Edit Form State (Student only - Department editable, Role locked)
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editDepartmentId, setEditDepartmentId] = useState('');

  // Helper to parse backend error responses into user-friendly messages
  const parseApiError = (err, fallbackMsg = "Thao tác thất bại.") => {
    if (!err) return fallbackMsg;
    const raw = err.message || String(err);
    try {
      const json = JSON.parse(raw);
      if (json.errors && typeof json.errors === 'object') {
        const fieldMap = {
          Username: 'Tên đăng nhập',
          Password: 'Mật khẩu',
          Email: 'Email',
          FullName: 'Họ và tên',
          DepartmentId: 'Phòng ban',
        };
        const messages = Object.entries(json.errors).map(([field, errs]) => {
          const fieldLabel = fieldMap[field] || field;
          const errStr = Array.isArray(errs) ? errs.join(', ') : String(errs);
          if (errStr.toLowerCase().includes('valid e-mail address')) {
            return `${fieldLabel} phải là một địa chỉ email hợp lệ (Ví dụ: student@domain.com).`;
          }
          return `${fieldLabel}: ${errStr}`;
        });
        return messages.join('\n');
      }
      if (json.title) return json.title;
      if (json.message) return json.message;
    } catch {
      // Not a JSON error string
    }
    return raw || fallbackMsg;
  };

  // Form validation helpers
  const isValidFullName = (name) => !/[0-9!@#$%&*()_+]/.test(name);
  const isValidPhone = (phone) => /^\d{10,11}$/.test(phone);
  const isValidDateOfBirth = (dob) => {
    if (!dob) return false;
    const year = new Date(dob).getFullYear();
    return !Number.isNaN(year) && year < 2007;
  };
  const toDateInputValue = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  // Helper to get all departments except Training (staff-related) for Student role.
  // NOTE: GET /api/Departments is Admin-only (DepartmentsController), so as Academic we
  // fall back to the authoritative list seeded in BE DataSeeder (ids 1-6, excluding id 2).
  const getNonTrainingDepts = () => {
    const filtered = departments.filter(
      (d) =>
        !d.name?.toLowerCase().includes('training') &&
        !d.name?.toLowerCase().includes('đào tạo') &&
        String(d.id) !== '2'
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '1', name: 'Administration' },
      { id: '3', name: 'Flight Crew' },
      { id: '4', name: 'Cabin Crew' },
      { id: '5', name: 'Engineering & Maintenance' },
      { id: '6', name: 'Ground Operations' },
    ];
  };

  const ROLE_MAP = {
    1: 'Admin',
    2: 'Instructor',
    3: 'QA',
    4: 'Academic',
    5: 'TrainingManager',
    6: 'Student',
    7: 'Audit',
  };

  const loadLearners = async () => {
    setLoading(true);
    try {
      const [accounts, profiles, deptList] = await Promise.all([
        api.get("/Accounts").catch(() => []),
        api.get("/UserProfiles").catch(() => []),
        api.get("/Departments").catch(() => []),
      ]);

      const accs = Array.isArray(accounts) ? accounts : [];
      const profs = Array.isArray(profiles) ? profiles : [];
      const depts = Array.isArray(deptList) ? deptList : [];

      const mappedDepts = depts.map((d) => ({
        id: String(d.departmentId ?? d.id),
        name: d.departmentName ?? d.name ?? `Dept #${d.departmentId}`,
      }));
      setDepartments(mappedDepts);

      // Filter ONLY Student role accounts (roleId === 6 per backend DataSeeder, or role name 'Student')
      const studentAccs = accs.filter((acc) => {
        const rId = Number(acc.roleId);
        const mappedRole = (ROLE_MAP[acc.roleId] || acc.role || acc.roleName || '').toLowerCase();
        return rId === 6 || mappedRole === 'student';
      });

      const mapped = studentAccs.map((acc) => {
        const profile = profs.find((p) => String(p.accountId) === String(acc.accountId));
        const deptObj = mappedDepts.find((d) => String(d.id) === String(acc.departmentId));
        return {
          accountId: acc.accountId,
          username: acc.username || `student_${acc.accountId}`,
          roleId: acc.roleId || 6,
          role: 'Student',
          departmentId: acc.departmentId,
          departmentName: deptObj?.name || (String(acc.departmentId) === '2' ? 'Training' : 'Administration'),
          status: acc.status || 'Active',
          hasProfile: !!profile,
          fullName: profile?.fullName || acc.username || 'Chưa cập nhật',
          email: profile?.email || acc.username || '',
          phone: profile?.phone || '',
          gender: profile?.gender || 'Male',
          dateOfBirth: profile?.dateOfBirth || '',
          userCode: profile?.userCode || `USR-${acc.accountId}`,
        };
      });
      setLearners(mapped);
    } catch (err) {
      console.error("Error loading student learners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearners();
  }, []);

  // Open Create Student Modal
  const handleOpenCreateModal = () => {
    setUsername('');
    setPassword('Default@123');
    setFullName('');
    setPhone('');
    setDateOfBirth('');
    const nonTraining = getNonTrainingDepts();
    setDepartmentId(String(nonTraining[0]?.id || '1'));
    setGender('Male');
    setFormError('');
    setIsCreateOpen(true);
  };

  // Submit Create Student Account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedUsername || !password || !trimmedFullName) {
      setFormError('Vui lòng nhập Username, Password và Họ tên.');
      return;
    }

    if (!trimmedUsername.includes('@') || !trimmedUsername.includes('.')) {
      setFormError('Tên đăng nhập (Username) phải là địa chỉ email hợp lệ (Ví dụ: student@domain.com).');
      return;
    }

    if (!isValidFullName(trimmedFullName)) {
      setFormError('Họ và tên không được chứa số hoặc ký tự đặc biệt (!@#$%&*()_+).');
      return;
    }

    if (phone.trim() && !isValidPhone(phone.trim())) {
      setFormError('Số điện thoại phải gồm 10 hoặc 11 chữ số.');
      return;
    }

    if (!isValidDateOfBirth(dateOfBirth)) {
      setFormError('Ngày sinh bắt buộc và phải trước năm 2007.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create account with Student Role (roleId: 6)
      const newAcc = await api.post("/Accounts", {
        username: trimmedUsername,
        password: password,
        roleId: 6,
        departmentId: Number(departmentId || getNonTrainingDepts()[0]?.id || 1),
      });

      // 2. Create user profile
      const accId = newAcc?.accountId || newAcc?.id;
      if (accId) {
        await api.post(`/UserProfiles/${accId}`, {
          userCode: `USR-${accId}`,
          fullName: trimmedFullName,
          email: trimmedUsername,
          phone: phone.trim() || null,
          dateOfBirth: new Date(`${dateOfBirth}T00:00:00`).toISOString(),
          gender: gender || "Male",
          organization: "ETR Aviation",
        }).catch((err) => console.warn("Failed to create profile details:", err));
      }

      await loadLearners();
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to create student:", err);
      setFormError(parseApiError(err, "Tạo học viên thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Create Profile Modal (for a student account that has no profile yet)
  const handleOpenProfileModal = (learner) => {
    setProfileAcc(learner);
    setPFullName('');
    setPEmail(learner.email || learner.username || '');
    setPPhone('');
    setPDateOfBirth('');
    setPGender('Male');
    setFormError('');
    setIsProfileOpen(true);
  };

  // Submit Create Profile -> POST /UserProfiles/{accountId} links to the student account
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!pFullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }

    if (!isValidFullName(pFullName.trim())) {
      setFormError('Họ và tên không được chứa số hoặc ký tự đặc biệt (!@#$%&*()_+).');
      return;
    }

    if (pPhone.trim() && !isValidPhone(pPhone.trim())) {
      setFormError('Số điện thoại phải gồm 10 hoặc 11 chữ số.');
      return;
    }

    if (!isValidDateOfBirth(pDateOfBirth)) {
      setFormError('Ngày sinh bắt buộc và phải trước năm 2007.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/UserProfiles/${profileAcc.accountId}`, {
        userCode: `USR-${profileAcc.accountId}`,
        fullName: pFullName.trim(),
        email: pEmail.trim() || profileAcc.username,
        phone: pPhone.trim() || null,
        dateOfBirth: new Date(`${pDateOfBirth}T00:00:00`).toISOString(),
        gender: pGender,
        organization: 'ETR Aviation',
      });
      await loadLearners();
      setIsProfileOpen(false);
    } catch (err) {
      console.error('Failed to create learner profile:', err);
      setFormError(parseApiError(err, 'Tạo hồ sơ học viên thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Student Modal
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditFullName(user.fullName === 'Chưa cập nhật' ? '' : user.fullName);
    setEditEmail(user.email || user.username || '');
    setEditPhone(user.phone || '');
    setEditDateOfBirth(toDateInputValue(user.dateOfBirth));
    setEditGender(user.gender || 'Male');
    
    const nonTraining = getNonTrainingDepts();
    const currentDeptIdStr = String(user.departmentId || '');
    if (!nonTraining.some((d) => String(d.id) === currentDeptIdStr)) {
      setEditDepartmentId(String(nonTraining[0]?.id || '1'));
    } else {
      setEditDepartmentId(currentDeptIdStr);
    }

    setFormError('');
    setIsEditOpen(true);
  };

  // Submit Edit Student (Department editable, Role locked to Student)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editFullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }

    if (!isValidFullName(editFullName.trim())) {
      setFormError('Họ và tên không được chứa số hoặc ký tự đặc biệt (!@#$%&*()_+).');
      return;
    }

    if (editPhone.trim() && !isValidPhone(editPhone.trim())) {
      setFormError('Số điện thoại phải gồm 10 hoặc 11 chữ số.');
      return;
    }

    if (!isValidDateOfBirth(editDateOfBirth)) {
      setFormError('Ngày sinh bắt buộc và phải trước năm 2007.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update profile info
      await api.put(`/UserProfiles/${editingUser.accountId}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim() || editingUser.username,
        phone: editPhone.trim() || null,
        dateOfBirth: new Date(`${editDateOfBirth}T00:00:00`).toISOString(),
        gender: editGender,
        organization: "ETR Aviation",
      });

      // 2. Update department (role is locked to Student)
      if (editDepartmentId) {
        await api.put(`/Accounts/${editingUser.accountId}/department`, {
          departmentId: Number(editDepartmentId),
        }).catch(async () => {
          await api.put(`/Accounts/${editingUser.accountId}`, {
            departmentId: Number(editDepartmentId),
          }).catch((err) => console.warn("Failed to update department:", err));
        });
      }

      await loadLearners();
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update student profile:", err);
      setFormError(parseApiError(err, "Cập nhật hồ sơ học viên thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete / Disable Student Account
  const handleDeleteAccount = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa tài khoản học viên "${user.username}"?`)) {
      return;
    }
    try {
      await api.delete(`/Accounts/${user.accountId}`);
      await api.put(`/Accounts/${user.accountId}/status`, { status: 'Inactive' }).catch(() => {});
      await loadLearners();
    } catch (err) {
      console.error("Failed to disable student:", err);
      try {
        await api.put(`/Accounts/${user.accountId}/status`, { status: 'Inactive' });
        await loadLearners();
      } catch (putErr) {
        alert("Vô hiệu hóa tài khoản thất bại: " + parseApiError(putErr));
      }
    }
  };

  // Activate Student Account
  const handleActivateAccount = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn kích hoạt lại tài khoản học viên "${user.username}" thành Active?`)) {
      return;
    }
    try {
      await api.put(`/Accounts/${user.accountId}/status`, { status: 'Active' });
      await loadLearners();
    } catch (err) {
      console.error("Failed to activate student account:", err);
      alert("Kích hoạt tài khoản thất bại: " + parseApiError(err));
    }
  };

  const filteredLearners = learners.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Section */}
      <section className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#002147', margin: 0 }}>Danh sách Học viên (Student Accounts)</h1>
          <div className="divider-gold" style={{ width: '40px', height: '3px', background: '#c5a059', margin: '8px 0 12px' }} />
          <p className="header-description" style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Quản lý danh sách tài khoản học viên: Tạo mới, cập nhật hồ sơ, đổi phòng ban, vô hiệu hóa và kích hoạt lại tài khoản.
          </p>
        </div>

        <button
          className="create-btn"
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#002147',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <span>+ Tạo tài khoản học viên</span>
        </button>
      </section>

      {/* Main Table Section */}
      <section className="table-card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Tất cả học viên ({filteredLearners.length})
            </h2>
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã HV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              width: '260px',
            }}
          />
        </div>

        <div className="data-table" style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.7fr 1.2fr 1.3fr 1.3fr 1.1fr 1fr 0.8fr 0.8fr 1.2fr',
              padding: '12px 16px',
              background: '#002147',
              color: '#fff',
              borderRadius: '8px 8px 0 0',
              fontWeight: '600',
              fontSize: '12px',
              letterSpacing: '0.03em',
            }}
          >
            <div>UserID</div>
            <div>Username / Mã HV</div>
            <div>Họ và tên</div>
            <div>Email</div>
            <div>Phòng ban</div>
            <div>Số điện thoại</div>
            <div>Giới tính</div>
            <div>Trạng thái</div>
            <div style={{ textAlign: 'right' }}>Hành động</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              Đang tải danh sách học viên...
            </div>
          ) : filteredLearners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontStyle: 'italic' }}>
              {searchTerm ? 'Không tìm thấy học viên phù hợp.' : 'Chưa có tài khoản học viên nào trong hệ thống.'}
            </div>
          ) : (
            filteredLearners.map((learner) => {
              const isInactive = learner.status?.toLowerCase() === 'inactive' || learner.status?.toLowerCase() === 'disabled';
              return (
                <div
                  key={learner.accountId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '0.7fr 1.2fr 1.3fr 1.3fr 1.1fr 1fr 0.8fr 0.8fr 1.2fr',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{learner.accountId}</div>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{learner.username}</div>
                  <div style={{ color: '#334155' }}>
                    <span>{learner.fullName}</span>
                    {!learner.hasProfile && (
                      <span
                        style={{
                          marginLeft: '6px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          color: '#b45309',
                          fontSize: '10px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Chưa có hồ sơ
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#64748b' }}>{learner.email}</div>
                  <div style={{ color: '#334155', fontWeight: '500' }}>{learner.departmentName}</div>
                  <div style={{ color: '#64748b' }}>{learner.phone || 'N/A'}</div>
                  <div style={{ color: '#64748b' }}>{learner.gender || 'N/A'}</div>
                  <div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: isInactive ? '#fef2f2' : '#ecfdf5',
                        color: isInactive ? '#ef4444' : '#10b981',
                      }}
                    >
                      {isInactive ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!learner.hasProfile && (
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(learner)}
                        title="Tạo hồ sơ cho học viên này"
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #fbbf24',
                          background: '#fffbeb',
                          color: '#b45309',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        + Tạo hồ sơ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(learner)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    {isInactive ? (
                      <button
                        type="button"
                        onClick={() => handleActivateAccount(learner)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0',
                          background: '#ecfdf5',
                          color: '#059669',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        Activate Account
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(learner)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #fca5a5',
                          background: '#fff5f5',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CREATE STUDENT MODAL */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Tạo tài khoản học viên (Student Role)</h2>
            
            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tên đăng nhập (Email / Username) *</label>
                <input
                  type="email"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: student@domain.com"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Mật khẩu *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Vai trò (Role)</label>
                  <input
                    type="text"
                    disabled
                    value="Student"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phòng ban</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {getNonTrainingDepts().map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Giới tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Male">Nam (Male)</option>
                    <option value="Female">Nữ (Female)</option>
                    <option value="Other">Khác (Other)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ngày sinh (phải trước năm 2007) *</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tổ chức (khóa)</label>
                  <input
                    type="text"
                    disabled
                    value="ETR Aviation"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo học viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {isEditOpen && editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>Chỉnh sửa hồ sơ học viên</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>Tài khoản: <strong>{editingUser.username}</strong></p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Vai trò (Role)</label>
                  <input
                    type="text"
                    disabled
                    value="Student"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    * Không thể sửa vai trò của học viên.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phòng ban (Department)</label>
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    {getNonTrainingDepts().map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ngày sinh (phải trước năm 2007) *</label>
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tổ chức (khóa)</label>
                  <input
                    type="text"
                    disabled
                    value="ETR Aviation"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Giới tính</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="Male">Nam (Male)</option>
                  <option value="Female">Nữ (Female)</option>
                  <option value="Other">Khác (Other)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CREATE PROFILE MODAL (student account has no profile yet) */}
      {isProfileOpen && profileAcc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>Tạo hồ sơ học viên</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              Tài khoản: <strong>{profileAcc.username}</strong> (UserID: {profileAcc.accountId}) — hồ sơ sẽ được móc nối tự động vào account này.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                  <input
                    type="text"
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="0901234567"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Giới tính</label>
                <select
                  value={pGender}
                  onChange={(e) => setPGender(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="Male">Nam (Male)</option>
                  <option value="Female">Nữ (Female)</option>
                  <option value="Other">Khác (Other)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ngày sinh (phải trước năm 2007) *</label>
                  <input
                    type="date"
                    value={pDateOfBirth}
                    onChange={(e) => setPDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tổ chức (khóa)</label>
                  <input
                    type="text"
                    disabled
                    value="ETR Aviation"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerManagement;
