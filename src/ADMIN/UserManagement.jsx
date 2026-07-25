import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const UserManagement = () => {
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

  const ROLE_MAP = {
    1: 'Admin',
    2: 'Instructor',
    3: 'QA',
    4: 'Academic',
    5: 'Student',
    6: 'TrainingManager',
    7: 'Audit',
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [accounts, profiles] = await Promise.all([
        api.get("/Accounts").catch(() => []),
        api.get("/UserProfiles").catch(() => []),
      ]);
      const accs = Array.isArray(accounts) ? accounts : [];
      const profs = Array.isArray(profiles) ? profiles : [];

      const mapped = accs.map((acc) => {
        const profile = profs.find((p) => p.accountId === acc.accountId);
        return {
          accountId: acc.accountId,
          username: acc.username || `user_${acc.accountId}`,
          roleId: acc.roleId,
          role: ROLE_MAP[acc.roleId] || acc.role || 'User',
          departmentId: acc.departmentId,
          status: acc.status || 'Active',
          fullName: profile?.fullName || 'Chưa cập nhật',
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

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setUsername('');
    setPassword('Default@123');
    setFullName('');
    setEmail('');
    setPhone('');
    setRoleId('5');
    setDepartmentId('2');
    setGender('Male');
    setFormError('');
    setIsCreateOpen(true);
  };

  // Submit Create Account + Profile
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!username.trim() || !password || !fullName.trim()) {
      setFormError('Vui lòng nhập Username, Password và Họ tên.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create account (POST /api/Accounts)
      const newAcc = await api.post("/Accounts", {
        username: username.trim(),
        password: password,
        roleId: Number(roleId),
        departmentId: Number(departmentId),
      });

      // 2. Create user profile (POST /api/UserProfiles/{accountId})
      const accId = newAcc?.accountId || newAcc?.id;
      if (accId) {
        await api.post(`/UserProfiles/${accId}`, {
          userCode: `USR-${accId}`,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          dateOfBirth: new Date().toISOString(),
          gender: gender || "Male",
          organization: "ETR Aviation",
        }).catch((err) => console.warn("Failed to create user profile detail:", err));
      }

      await loadUsers();
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to create user:", err);
      setFormError(err.message || "Tạo tài khoản thất bại.");
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
    setFormError('');
    setIsEditOpen(true);
  };

  // Submit Edit User Profile (PUT /api/UserProfiles/{accountId})
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editFullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/UserProfiles/${editingUser.accountId}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        dateOfBirth: new Date().toISOString(),
        gender: editGender,
        organization: "ETR Aviation",
      });

      await loadUsers();
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      setFormError(err.message || "Cập nhật hồ sơ thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Account Status (PUT /api/Accounts/{id}/status)
  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    if (!window.confirm(`Bạn có muốn đổi trạng thái tài khoản "${user.username}" thành "${nextStatus}"?`)) {
      return;
    }
    try {
      await api.put(`/Accounts/${user.accountId}/status`, { status: nextStatus });
      await loadUsers();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Cập nhật trạng thái thất bại: " + (err.message || "Lỗi server"));
    }
  };

  // Delete Account (DELETE /api/Accounts/{id})
  const handleDeleteAccount = async (user) => {
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản "${user.username}" (ID: ${user.accountId})?`)) {
      return;
    }
    try {
      await api.delete(`/Accounts/${user.accountId}`);
      await loadUsers();
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Xóa tài khoản thất bại: " + (err.message || "Lỗi server"));
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);

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
            Quản lý tài khoản hệ thống: Tạo mới, cập nhật hồ sơ, khóa/kích hoạt tài khoản và xóa người dùng via Backend API.
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
            <span className="tag-chip">Edit User Profile</span>
            <span className="tag-chip">Toggle Active/Disabled Status</span>
            <span className="tag-chip">Delete Account</span>
          </div>
        </div>

        <div className="info-card">
          <p className="section-label">Filter by Role</p>
          <div className="pill-row" style={{ marginTop: '8px' }}>
            {['ALL', 'Admin', 'Instructor', 'QA', 'Academic', 'Student', 'TrainingManager'].map((r) => (
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
            <h2>Danh sách tài khoản ({filteredUsers.length})</h2>
          </div>
          <input
            type="text"
            placeholder="Tìm theo username, tên, email..."
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
          <div className="table-header table-layout user-layout" style={{ gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr' }}>
            <div>Username</div>
            <div>Full Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {loading ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
              Đang tải danh sách tài khoản...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              Không tìm thấy tài khoản nào.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.accountId} className="table-row table-layout user-layout" style={{ gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr', alignItems: 'center' }}>
                <div className="font-medium" style={{ color: '#0f172a', fontWeight: '600' }}>{user.username}</div>
                <div className="text-gray">{user.fullName}</div>
                <div className="text-gray">{user.email || 'N/A'}</div>
                <div>
                  <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: '#e2e8f0', color: '#334155', fontWeight: '500' }}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(user)}
                    className={user.status === 'Active' ? 'status status-active' : 'status status-pending'}
                    style={{ cursor: 'pointer', border: 'none' }}
                    title="Click để đổi trạng thái Active/Disabled"
                  >
                    {user.status}
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
                  <button
                    className="action-btn"
                    type="button"
                    onClick={() => handleDeleteAccount(user)}
                    style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#fca5a5', background: '#fff5f5', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Tạo tài khoản mới (POST /api/Accounts)</h2>
            
            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tên đăng nhập (Username) *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: instructor_john"
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
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="1">Admin</option>
                    <option value="2">Instructor</option>
                    <option value="3">QA</option>
                    <option value="4">Academic</option>
                    <option value="5">Student</option>
                    <option value="6">Training Manager</option>
                    <option value="7">Audit</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phòng ban</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="1">Administration</option>
                    <option value="2">Training</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
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
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {isEditOpen && editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>Chỉnh sửa hồ sơ (PUT /api/UserProfiles/{editingUser.accountId})</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>Tài khoản: <strong>{editingUser.username}</strong> ({editingUser.role})</p>

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
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;