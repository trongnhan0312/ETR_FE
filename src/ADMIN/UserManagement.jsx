import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const UserManagement = () => {
  const { tr, trt } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Default@123');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('5'); // Default Student
  const [departmentId, setDepartmentId] = useState('2'); // Default Training
  const [gender, setGender] = useState('Male');

  // Edit Form State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editRoleId, setEditRoleId] = useState('5');
  const [editDepartmentId, setEditDepartmentId] = useState('2');

  const [departments, setDepartments] = useState([]);

  const ROLE_MAP = {
    1: 'Admin',
    2: 'Instructor',
    3: 'QA',
    4: 'Academic',
    5: 'TrainingManager',
    6: 'Student',
    7: 'Audit',
  };

  const EDITABLE_ROLES = [
    { id: 2, name: 'Instructor' },
    { id: 3, name: 'QA' },
    { id: 4, name: 'Academic' },
    { id: 5, name: 'TrainingManager' },
    { id: 6, name: 'Student' },
    { id: 7, name: 'Audit' },
  ];

  const loadUsers = async () => {
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

      const mapped = accs.map((acc) => {
        const profile = profs.find((p) => String(p.accountId) === String(acc.accountId));
        const deptObj = mappedDepts.find((d) => String(d.id) === String(acc.departmentId));
        return {
          accountId: acc.accountId,
          username: acc.username || `user_${acc.accountId}`,
          roleId: acc.roleId,
          role: ROLE_MAP[acc.roleId] || acc.role || 'User',
          departmentId: acc.departmentId,
          departmentName: deptObj?.name || (String(acc.departmentId) === '2' ? 'Training' : 'Administration'),
          status: acc.status || 'Active',
          fullName: profile?.fullName || tr('Chưa cập nhật'),
          email: profile?.email || '',
          phone: profile?.phone || '',
          gender: profile?.gender || 'Male',
          userCode: profile?.userCode || `USR-${acc.accountId}`,
        };
      });
      setUsers(mapped);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Helper to parse backend error responses into user-friendly messages
  const parseApiError = (err, fallbackMsg = tr("Thao tác thất bại.")) => {
    if (!err) return fallbackMsg;
    const raw = err.message || String(err);
    try {
      const json = JSON.parse(raw);
      if (json.errors && typeof json.errors === 'object') {
        const fieldMap = {
          Username: tr('Tên đăng nhập'),
          Password: tr('Mật khẩu'),
          Email: tr('Email'),
          FullName: tr('Họ và tên'),
          RoleId: tr('Vai trò'),
          DepartmentId: tr('Phòng ban'),
        };
        const messages = Object.entries(json.errors).map(([field, errs]) => {
          const fieldLabel = fieldMap[field] || field;
          const errStr = Array.isArray(errs) ? errs.join(', ') : String(errs);
          if (errStr.toLowerCase().includes('valid e-mail address')) {
            return `${fieldLabel} ${tr('phải là một địa chỉ email hợp lệ (Ví dụ: name@company.com).')}`;
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

  // Helper to find Training department ID
  const getTrainingDeptId = () => {
    const tDept = departments.find(
      (d) =>
        d.name?.toLowerCase().includes('training') ||
        d.name?.toLowerCase().includes('đào tạo') ||
        String(d.id) === '2'
    );
    return tDept ? String(tDept.id) : '2';
  };

  // Helper to get non-training departments for Student role
  const getNonTrainingDepts = () => {
    const trainingId = getTrainingDeptId();
    const filtered = departments.filter(
      (d) =>
        !d.name?.toLowerCase().includes('training') &&
        !d.name?.toLowerCase().includes('đào tạo') &&
        String(d.id) !== trainingId
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '1', name: 'Administration' },
      { id: '3', name: 'Flight Operations' },
    ];
  };

  // Handle role change in Edit Modal with department logic
  const handleEditRoleChange = (newRoleId) => {
    setEditRoleId(newRoleId);
    const trainingId = getTrainingDeptId();
    if (newRoleId !== '6') {
      // Staff roles: automatically set department to Training
      setEditDepartmentId(trainingId);
    } else {
      // Student role: filter out Training department
      const nonTraining = getNonTrainingDepts();
      if (editDepartmentId === trainingId || !nonTraining.some((d) => String(d.id) === String(editDepartmentId))) {
        setEditDepartmentId(String(nonTraining[0].id));
      }
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setUsername('');
    setPassword('Default@123');
    setFullName('');
    setEmail('');
    setPhone('');
    setRoleId('6');
    const nonTraining = getNonTrainingDepts();
    setDepartmentId(String(nonTraining[0]?.id || '1'));
    setGender('Male');
    setFormError('');
    setIsCreateOpen(true);
  };

  // Submit Create Account + Profile
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedUsername || !password || !trimmedFullName) {
      setFormError(tr('Vui lòng nhập Username, Password và Họ tên.'));
      return;
    }

    // Backend requires Username to be a valid email address
    if (!trimmedUsername.includes('@') || !trimmedUsername.includes('.')) {
      setFormError(tr('Tên đăng nhập (Username) phải là một địa chỉ email hợp lệ (Ví dụ: user@domain.com).'));
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create account
      const newAcc = await api.post("/Accounts", {
        username: trimmedUsername,
        password: password,
        roleId: Number(roleId),
        departmentId: Number(roleId !== '6' ? getTrainingDeptId() : departmentId),
      });

      // 2. Create user profile
      const accId = newAcc?.accountId || newAcc?.id;
      if (accId) {
        await api.post(`/UserProfiles/${accId}`, {
          userCode: `USR-${accId}`,
          fullName: trimmedFullName,
          email: trimmedUsername,
          phone: phone.trim() || null,
          dateOfBirth: new Date().toISOString(),
          gender: gender || "Male",
          organization: "ETR Aviation",
        }).catch((err) => console.warn("Failed to create user profile detail:", err));
      }

      await loadUsers();
      setIsCreateOpen(false);
      // Toast thành công — nhất quán với các flow tạo khác (khóa học/lớp/phòng ban)
      toast.success(tr("Tạo tài khoản thành công!"), trt('accountCreated', { username: trimmedUsername }));
    } catch (err) {
      console.error("Failed to create user:", err);
      setFormError(parseApiError(err, tr("Tạo tài khoản thất bại.")));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditFullName(user.fullName === 'Chưa cập nhật' ? '' : user.fullName);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditGender(user.gender || 'Male');
    
    const currentRoleIdStr = String(user.roleId || '');
    const activeRoleId = currentRoleIdStr && currentRoleIdStr !== '1' ? currentRoleIdStr : '2';
    setEditRoleId(activeRoleId);

    const trainingId = getTrainingDeptId();
    if (activeRoleId !== '5') {
      setEditDepartmentId(trainingId);
    } else {
      const currentDeptIdStr = String(user.departmentId || '');
      const nonTraining = getNonTrainingDepts();
      if (currentDeptIdStr === trainingId || !nonTraining.some((d) => String(d.id) === currentDeptIdStr)) {
        setEditDepartmentId(String(nonTraining[0].id));
      } else {
        setEditDepartmentId(currentDeptIdStr);
      }
    }

    setFormError('');
    setIsEditOpen(true);
  };

  // Submit Edit User Profile + Role + Department
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editFullName.trim()) {
      setFormError(tr('Vui lòng nhập Họ và tên.'));
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update profile info
      await api.put(`/UserProfiles/${editingUser.accountId}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        dateOfBirth: new Date().toISOString(),
        gender: editGender,
        organization: "ETR Aviation",
      });

      // 2. Update role
      if (editRoleId && Number(editRoleId) !== 1) {
        await api.put(`/Accounts/${editingUser.accountId}/role`, {
          roleId: Number(editRoleId),
        }).catch((err) => console.warn("Failed to update role:", err));
      }

      // 3. Update department
      // B7: route chính thức là PUT /Accounts/{id}/department (Admin) — backend KHÔNG có route
      // PUT /Accounts/{id} (404). Bỏ fallback cũ (luôn 404) và hiển thị lỗi rõ ràng nếu thất bại.
      const finalDeptId = editRoleId !== '5' ? getTrainingDeptId() : editDepartmentId;
      if (finalDeptId) {
        try {
          await api.put(`/Accounts/${editingUser.accountId}/department`, {
            departmentId: Number(finalDeptId),
          });
        } catch (err) {
          console.warn("Failed to update department:", err);
          toast.error(
            tr("Cập nhật phòng ban thất bại"),
            parseApiError(err, tr("Không thể đổi phòng ban."))
          );
        }
      }

      await loadUsers();
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      setFormError(parseApiError(err, tr("Cập nhật hồ sơ thất bại.")));
    } finally {
      setSubmitting(false);
    }
  };

  // Toast notifications
  const toast = useToast();

  // Xác nhận trước các thao tác tài khoản (thay window.confirm)
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'toggle' | 'delete' | 'activate', user }

  const runAccountAction = async (type, user) => {
    try {
      if (type === 'toggle') {
        const isInactive = user.status?.toLowerCase() === 'inactive' || user.status?.toLowerCase() === 'disabled';
        const nextStatus = isInactive ? 'Active' : 'Inactive';
        await api.put(`/Accounts/${user.accountId}/status`, { status: nextStatus });
        toast.success(tr("Cập nhật trạng thái"), trt('toggleAccount', { username: user.username, status: nextStatus }));
      } else if (type === 'delete') {
        await api.delete(`/Accounts/${user.accountId}`);
        await api.put(`/Accounts/${user.accountId}/status`, { status: 'Inactive' }).catch(() => {});
        toast.success("Soft Delete", trt('softDeletedAccount', { username: user.username }));
      } else {
        await api.put(`/Accounts/${user.accountId}/status`, { status: 'Active' });
        toast.success(tr("Kích hoạt thành công"), trt('activatedAccount', { username: user.username }));
      }
      await loadUsers();
    } catch (err) {
      console.error(`Failed to ${type} account:`, err);
      if (type === 'delete') {
        try {
          await api.put(`/Accounts/${user.accountId}/status`, { status: 'Inactive' });
          await loadUsers();
        } catch (putErr) {
          toast.error(tr("Soft Delete thất bại"), parseApiError(putErr));
        }
      } else if (type === 'toggle') {
        toast.error(tr("Cập nhật trạng thái thất bại"), parseApiError(err));
      } else {
        toast.error(tr("Kích hoạt tài khoản thất bại"), parseApiError(err));
      }
    } finally {
      setConfirmAction(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q);

    const matchesRole = roleFilter === 'ALL' || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator Management</p>
          <h1>User Management</h1>
          <p className="page-description">
            {tr('Quản lý tài khoản hệ thống: Tạo mới, cập nhật hồ sơ, đổi vai trò (Role), phòng ban (Department), vô hiệu hóa (Soft Delete) và kích hoạt lại tài khoản.')}
          </p>
        </div>

        <button className="primary-btn" type="button" onClick={handleOpenCreateModal}>
          + Create User
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            <span className="tag-chip" style={{ cursor: 'pointer' }} onClick={handleOpenCreateModal}>+ Create User</span>
            <span className="tag-chip">Edit User & Role</span>
            <span className="tag-chip">Department Assignment</span>
            <span className="tag-chip">Soft Delete (Inactive)</span>
            <span className="tag-chip">Activate Account</span>
          </div>
        </div>

        <div className="info-card">
          <p className="section-label">Filter by Role</p>
          <div className="pill-row" style={{ marginTop: '8px' }}>
            {['ALL', 'Admin', 'Instructor', 'QA', 'Academic', 'Student', 'TrainingManager', 'Audit'].map((r) => (
              <span
                key={r}
                onClick={() => setRoleFilter(r)}
                className={roleFilter === r ? 'tag-chip active' : 'tag-chip'}
                style={{
                  cursor: 'pointer',
                  background: roleFilter === r ? '#002147' : '#f1f5f9',
                  color: roleFilter === r ? '#fff' : '#475569',
                  fontWeight: roleFilter === r ? '600' : 'normal',
                }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="section-label">System Accounts</p>
            <h2>{tr('Danh sách tài khoản')} ({filteredUsers.length})</h2>
          </div>
          <input
            type="text"
            placeholder={tr('Tìm theo username, tên, email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              width: '280px',
            }}
          />
        </div>

        <div className="data-table user-table" style={{ marginTop: '16px' }}>
          <div className="table-header table-layout user-layout" style={{ gridTemplateColumns: '1.1fr 1.2fr 1.2fr 0.9fr 1.1fr 0.8fr 0.8fr 1.2fr' }}>
            <div>Username</div>
            <div>Full Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Department</div>
            <div>Gender</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {loading ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
              {tr('Đang tải danh sách tài khoản...')}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              {tr('Không tìm thấy tài khoản nào.')}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isInactive = user.status?.toLowerCase() === 'inactive' || user.status?.toLowerCase() === 'disabled';
              return (
                <div key={user.accountId} className="table-row table-layout user-layout" style={{ gridTemplateColumns: '1.1fr 1.2fr 1.2fr 0.9fr 1.1fr 0.8fr 0.8fr 1.2fr', alignItems: 'center' }}>
                  <div className="font-medium" style={{ color: '#0f172a', fontWeight: '600' }}>{user.username}</div>
                  <div className="text-gray">{user.fullName}</div>
                  <div className="text-gray">{user.email || 'N/A'}</div>
                  <div>
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: '#e2e8f0', color: '#334155', fontWeight: '500' }}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-gray" style={{ fontSize: '13px', fontWeight: '500' }}>
                    {user.departmentName}
                  </div>
                  <div className="text-gray">{user.gender || 'N/A'}</div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'toggle', user })}
                      className={!isInactive ? 'status status-active' : 'status status-pending'}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title={tr('Click để toggle Active/Inactive')}
                    >
                      {isInactive ? 'Inactive' : 'Active'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="action-btn"
                      type="button"
                      onClick={() => handleOpenEditModal(user)}
                      style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    {isInactive ? (
                      <button
                        className="action-btn"
                        type="button"
                        onClick={() => setConfirmAction({ type: 'activate', user })}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          color: '#059669',
                          borderColor: '#a7f3d0',
                          background: '#ecfdf5',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Activate Account
                      </button>
                    ) : (
                      <button
                        className="action-btn"
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete', user })}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          color: '#ef4444',
                          borderColor: '#fca5a5',
                          background: '#fff5f5',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CREATE USER MODAL */}
      {isCreateOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', margin: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>{tr('Tạo tài khoản mới')}</h2>
            
            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Tên đăng nhập (Email / Username) *')}</label>
                <input
                  type="email"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={tr('Ví dụ: user@domain.com')}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Mật khẩu *')}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Họ và tên *')}</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={tr('Ví dụ: Nguyễn Văn A')}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Vai trò (Role)')}</label>
                  <select
                    value={roleId}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setRoleId(newRole);
                      const trainingId = getTrainingDeptId();
                      if (newRole !== '6') {
                        setDepartmentId(trainingId);
                      } else {
                        const nonTraining = getNonTrainingDepts();
                        setDepartmentId(String(nonTraining[0]?.id || '1'));
                      }
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="1">Admin</option>
                    <option value="2">Instructor</option>
                    <option value="3">QA</option>
                    <option value="4">Academic</option>
                    <option value="5">Training Manager</option>
                    <option value="6">Student</option>
                    <option value="7">Audit</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Phòng ban')}</label>
                  {roleId !== '6' ? (
                    <select
                      value={getTrainingDeptId()}
                      disabled
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569' }}
                    >
                      <option value={getTrainingDeptId()}>{tr('Training (Trung tâm Đào tạo)')}</option>
                    </select>
                  ) : (
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
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Số điện thoại')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Giới tính')}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Male">{tr('Nam (Male)')}</option>
                    <option value="Female">{tr('Nữ (Female)')}</option>
                    <option value="Other">{tr('Khác (Other)')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? tr('Đang tạo...') : tr('Tạo tài khoản')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT USER PROFILE & ROLE & DEPARTMENT MODAL */}
      {isEditOpen && editingUser && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', margin: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>{tr('Chỉnh sửa tài khoản')}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>{tr('Tài khoản:')} <strong>{editingUser.username}</strong></p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Vai trò (Role)')}</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    {EDITABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Phòng ban (Department)')}</label>
                  {editRoleId !== '6' ? (
                    <select
                      value={getTrainingDeptId()}
                      disabled
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                    >
                      <option value={getTrainingDeptId()}>Training</option>
                    </select>
                  ) : (
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
                  )}
                </div>
              </div>

              {editRoleId !== '5' ? (
                <p style={{ margin: '-4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {tr('* Các vai trò Instructor, QA, Academic, Training Manager, Audit bắt buộc thuộc phòng Training (Trung tâm Đào tạo).')}
                </p>
              ) : (
                <p style={{ margin: '-4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {tr('* Học viên (Student) có thể phân bổ sang các phòng ban khác (loại trừ phòng Training).')}
                </p>
              )}

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
                  {submitting ? tr('Đang lưu...') : tr('Lưu thay đổi')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Xác nhận thao tác tài khoản */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runAccountAction(confirmAction?.type, confirmAction?.user)}
        title={
          confirmAction?.type === 'delete'
            ? tr("Soft Delete tài khoản")
            : confirmAction?.type === 'toggle'
            ? tr("Đổi trạng thái tài khoản")
            : tr("Kích hoạt tài khoản")
        }
        message={
          confirmAction?.type === 'delete'
            ? trt('confirmSoftDelete', { username: confirmAction?.user?.username || '' })
            : confirmAction?.type === 'toggle'
            ? trt('confirmToggleStatus', { username: confirmAction?.user?.username || '' })
            : trt('confirmActivate', { username: confirmAction?.user?.username || '' })
        }
        confirmText={
          confirmAction?.type === 'delete'
            ? tr("SOFT DELETE")
            : confirmAction?.type === 'toggle'
            ? tr("ĐỔI TRẠNG THÁI")
            : tr("KÍCH HOẠT")
        }
        cancelText={tr("HỦY BỎ")}
        confirmVariant={confirmAction?.type === 'delete' ? "danger" : "primary"}
        bodyMessage={
          confirmAction?.type === 'delete'
            ? tr("Tài khoản sẽ không thể đăng nhập, nhưng toàn bộ hồ sơ đào tạo và lịch sử kiểm toán vẫn được giữ nguyên.")
            : tr("Thay đổi trạng thái sẽ được áp dụng ngay và ghi nhận vào Audit Log.")
        }
      />

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default UserManagement;