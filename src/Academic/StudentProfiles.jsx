import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const ROLE_MAP = {
  1: 'Admin',
  2: 'Instructor',
  3: 'QA',
  4: 'Academic',
  5: 'TrainingManager',
  6: 'Student',
  7: 'Audit',
};

const GENDER_LABEL = {
  Male: 'Nam',
  Female: 'Nữ',
  Other: 'Khác',
};

const toDateInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDate = (iso) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('vi-VN');
};

const parseApiError = (err, fallbackMsg = 'Thao tác thất bại.') => {
  if (!err) return fallbackMsg;
  const raw = err.message || String(err);
  try {
    const json = JSON.parse(raw);
    if (json.errors && typeof json.errors === 'object') {
      const fieldMap = {
        UserCode: 'Mã học viên',
        FullName: 'Họ và tên',
        Email: 'Email',
        Phone: 'Số điện thoại',
        DateOfBirth: 'Ngày sinh',
        Gender: 'Giới tính',
        Organization: 'Tổ chức',
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

const StudentProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create wizard state
  const [createStep, setCreateStep] = useState('account'); // 'account' | 'profile'
  const [createdAccount, setCreatedAccount] = useState(null);

  // Step 1: Account form state
  const [aUsername, setAUsername] = useState('');
  const [aPassword, setAPassword] = useState('Default@123');
  const [aDepartmentId, setADepartmentId] = useState('');

  // Step 2: Profile form state
  const [cUserCode, setCUserCode] = useState('');
  const [cFullName, setCFullName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDateOfBirth, setCDateOfBirth] = useState('');
  const [cGender, setCGender] = useState('Male');
  const [cOrganization, setCOrganization] = useState('ETR Aviation');

  // Edit form state
  const [eFullName, setEFullName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eDateOfBirth, setEDateOfBirth] = useState('');
  const [eGender, setEGender] = useState('Male');
  const [eOrganization, setEOrganization] = useState('');

  const loadProfiles = async () => {
    try {
      const [profilesData, accountsData, deptList] = await Promise.all([
        api.get('/UserProfiles/learners').catch(() => []),
        api.get('/Accounts').catch(() => []),
        api.get('/Departments').catch(() => []),
      ]);

      const profs = Array.isArray(profilesData) ? profilesData : [];
      const accs = Array.isArray(accountsData) ? accountsData : [];
      const depts = Array.isArray(deptList) ? deptList : [];

      setDepartments(
        depts.map((d) => ({
          id: String(d.departmentId ?? d.id),
          name: d.departmentName ?? d.name ?? `Dept #${d.departmentId}`,
        })),
      );

      // Learner accounts only (roleId === 6 or mapped role Student/Learner)
      const learnerAccs = accs.filter((acc) => {
        const rId = Number(acc.roleId);
        const mappedRole = (ROLE_MAP[acc.roleId] || acc.role || acc.roleName || '').toLowerCase();
        return rId === 6 || mappedRole === 'student' || mappedRole === 'learner';
      });

      setProfiles(
        profs.map((p) => ({
          accountId: p.accountId,
          userCode: p.userCode || `USR-${p.accountId}`,
          fullName: p.fullName || 'Chưa cập nhật',
          email: p.email || '',
          phone: p.phone || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || 'Other',
          organization: p.organization || '',
          username: learnerAccs.find((a) => String(a.accountId) === String(p.accountId))?.username || '',
        })),
      );
    } catch (err) {
      console.error('Error loading student profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Helper to get non-training departments for Student role
  const getNonTrainingDepts = () => {
    const filtered = departments.filter(
      (d) =>
        !d.name?.toLowerCase().includes('training') &&
        !d.name?.toLowerCase().includes('đào tạo') &&
        String(d.id) !== '2',
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '1', name: 'Administration' },
      { id: '3', name: 'Flight Operations' },
    ];
  };

  const handleOpenCreateModal = () => {
    setCreateStep('account');
    setCreatedAccount(null);
    setAUsername('');
    setAPassword('Default@123');
    const nonTraining = getNonTrainingDepts();
    setADepartmentId(String(nonTraining[0]?.id || '1'));
    setCUserCode('');
    setCFullName('');
    setCEmail('');
    setCPhone('');
    setCDateOfBirth('');
    setCGender('Male');
    setCOrganization('ETR Aviation');
    setFormError('');
    setIsCreateOpen(true);
  };

  // Step 1: Create Account (Student role only, enforced by backend)
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedUsername = aUsername.trim();
    if (!trimmedUsername) {
      setFormError('Vui lòng nhập Tên đăng nhập (Username).');
      return;
    }
    if (!trimmedUsername.includes('@') || !trimmedUsername.includes('.')) {
      setFormError('Tên đăng nhập (Username) phải là địa chỉ email hợp lệ (Ví dụ: student@domain.com).');
      return;
    }
    if (!aPassword) {
      setFormError('Vui lòng nhập Mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      const newAcc = await api.post('/Accounts', {
        username: trimmedUsername,
        password: aPassword,
        roleId: 6, // Student role
        departmentId: Number(aDepartmentId || getNonTrainingDepts()[0]?.id || 1),
      });

      const accId = newAcc?.accountId ?? newAcc?.id;
      if (!accId) {
        setFormError('Tạo tài khoản thành công nhưng không nhận được accountId từ hệ thống.');
        return;
      }

      setCreatedAccount({ accountId: accId, username: trimmedUsername });
      setCUserCode(`USR-${accId}`);
      setCEmail(trimmedUsername);
      setFormError('');
      setCreateStep('profile');
    } catch (err) {
      console.error('Failed to create student account:', err);
      setFormError(parseApiError(err, 'Tạo tài khoản học viên thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Create Profile linked to the accountId from Step 1
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createdAccount?.accountId) {
      setFormError('Thiếu accountId. Vui lòng quay lại Bước 1 để tạo tài khoản.');
      return;
    }
    if (!cFullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!cEmail.trim() || !cEmail.includes('@')) {
      setFormError('Email phải là một địa chỉ email hợp lệ (Ví dụ: student@domain.com).');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/UserProfiles/${createdAccount.accountId}`, {
        userCode: cUserCode.trim() || `USR-${createdAccount.accountId}`,
        fullName: cFullName.trim(),
        email: cEmail.trim(),
        phone: cPhone.trim() || null,
        dateOfBirth: cDateOfBirth ? new Date(`${cDateOfBirth}T00:00:00`).toISOString() : new Date().toISOString(),
        gender: cGender,
        organization: cOrganization.trim() || null,
      });
      await loadProfiles();
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
      setFormError(parseApiError(err, 'Tạo hồ sơ học viên thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (profile) => {
    setEditingProfile(profile);
    setEFullName(profile.fullName === 'Chưa cập nhật' ? '' : profile.fullName);
    setEEmail(profile.email || '');
    setEPhone(profile.phone || '');
    setEDateOfBirth(toDateInputValue(profile.dateOfBirth));
    setEGender(profile.gender || 'Male');
    setEOrganization(profile.organization || '');
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!eFullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!eEmail.trim() || !eEmail.includes('@')) {
      setFormError('Email phải là một địa chỉ email hợp lệ (Ví dụ: student@domain.com).');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/UserProfiles/${editingProfile.accountId}`, {
        fullName: eFullName.trim(),
        email: eEmail.trim(),
        phone: ePhone.trim() || null,
        dateOfBirth: eDateOfBirth ? new Date(`${eDateOfBirth}T00:00:00`).toISOString() : new Date().toISOString(),
        gender: eGender,
        organization: eOrganization.trim() || null,
      });
      await loadProfiles();
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setFormError(parseApiError(err, 'Cập nhật hồ sơ học viên thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenViewModal = (profile) => {
    setViewingProfile(profile);
    setIsViewOpen(true);
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      p.userCode.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Section */}
      <section
        className="content-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#002147', margin: 0 }}>
            Hồ sơ Học viên (User Profiles)
          </h1>
          <div className="divider-gold" style={{ width: '40px', height: '3px', background: '#c5a059', margin: '8px 0 12px' }} />
          <p className="header-description" style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Quản lý hồ sơ học viên: Xem, tạo mới và cập nhật thông tin hồ sơ cho từng tài khoản học viên.
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
          <span>+ Tạo hồ sơ học viên</span>
        </button>
      </section>

      {/* Main Table Section */}
      <section
        className="table-card"
        style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Tất cả hồ sơ ({filteredProfiles.length})
            </h2>
          </div>
          <input
            type="text"
            placeholder="Tìm theo mã HV, tên, email, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              width: '280px',
            }}
          />
        </div>

        <div className="data-table" style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1.3fr 1.4fr 1fr 1fr 0.8fr 1.1fr 0.9fr',
              padding: '12px 16px',
              background: '#002147',
              color: '#fff',
              borderRadius: '8px 8px 0 0',
              fontWeight: '600',
              fontSize: '12px',
              letterSpacing: '0.03em',
            }}
          >
            <div>Mã học viên</div>
            <div>Họ và tên</div>
            <div>Email</div>
            <div>Số điện thoại</div>
            <div>Ngày sinh</div>
            <div>Giới tính</div>
            <div>Tổ chức</div>
            <div style={{ textAlign: 'right' }}>Hành động</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              Đang tải danh sách hồ sơ học viên...
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontStyle: 'italic' }}>
              {searchTerm ? 'Không tìm thấy hồ sơ phù hợp.' : 'Chưa có hồ sơ học viên nào trong hệ thống.'}
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <div
                key={profile.accountId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 1.3fr 1.4fr 1fr 1fr 0.8fr 1.1fr 0.9fr',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: '700', color: '#c5a059' }}>{profile.userCode}</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{profile.fullName}</div>
                <div style={{ color: '#64748b' }}>{profile.email || 'N/A'}</div>
                <div style={{ color: '#334155' }}>{profile.phone || 'N/A'}</div>
                <div style={{ color: '#334155' }}>{formatDate(profile.dateOfBirth)}</div>
                <div style={{ color: '#64748b' }}>{GENDER_LABEL[profile.gender] || profile.gender || 'N/A'}</div>
                <div style={{ color: '#334155', fontWeight: '500' }}>{profile.organization || 'N/A'}</div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenViewModal(profile)}
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
                    Xem
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(profile)}
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
                    Sửa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CREATE PROFILE WIZARD MODAL (Step 1: Account, Step 2: Profile) */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              {['account', 'profile'].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: createStep === step ? '#002147' : '#e2e8f0',
                      color: createStep === step ? '#fff' : '#64748b',
                    }}
                  >
                    {step === 'account' ? 'Bước 1: Tạo Account' : 'Bước 2: Tạo Profile'}
                  </div>
                  {step === 'account' && (
                    <span style={{ color: '#cbd5e1' }}>→</span>
                  )}
                </div>
              ))}
            </div>

            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>
              {createStep === 'account' ? 'Tạo tài khoản học viên' : 'Tạo hồ sơ học viên'}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              {createStep === 'account'
                ? 'Bước 1/2: Tạo tài khoản mới với vai trò Student (RoleId = 6).'
                : 'Bước 2/2: Nhập thông tin hồ sơ. Backend sẽ tự móc nối vào Account đã tạo ở Bước 1.'}
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            {createStep === 'account' ? (
              <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tên đăng nhập (Email / Username) *</label>
                  <input
                    type="email"
                    required
                    value={aUsername}
                    onChange={(e) => setAUsername(e.target.value)}
                    placeholder="Ví dụ: student@domain.com"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Mật khẩu *</label>
                    <input
                      type="password"
                      required
                      value={aPassword}
                      onChange={(e) => setAPassword(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Vai trò (Role)</label>
                    <input
                      type="text"
                      disabled
                      value="Student (RoleId = 6)"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                      * Academic chỉ được tạo tài khoản Student.
                    </p>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phòng ban (Department) *</label>
                  <select
                    required
                    value={aDepartmentId}
                    onChange={(e) => setADepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {getNonTrainingDepts().map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
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
                    {submitting ? 'Đang tạo Account...' : 'Tạo Account (Bước 1)'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '13px', color: '#065f46' }}>
                  ✓ Tạo Account thành công — Account ID: <strong>{createdAccount?.accountId}</strong>
                  {createdAccount?.username ? ` (${createdAccount.username})` : ''}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Mã học viên</label>
                    <input
                      type="text"
                      value={cUserCode}
                      onChange={(e) => setCUserCode(e.target.value)}
                      placeholder="Ví dụ: USR-15"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên *</label>
                    <input
                      type="text"
                      required
                      value={cFullName}
                      onChange={(e) => setCFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email *</label>
                    <input
                      type="email"
                      required
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="student@domain.com"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                    <input
                      type="text"
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      placeholder="0901234567"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ngày sinh</label>
                    <input
                      type="date"
                      value={cDateOfBirth}
                      onChange={(e) => setCDateOfBirth(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Giới tính</label>
                    <select
                      value={cGender}
                      onChange={(e) => setCGender(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    >
                      <option value="Male">Nam (Male)</option>
                      <option value="Female">Nữ (Female)</option>
                      <option value="Other">Khác (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tổ chức</label>
                  <input
                    type="text"
                    value={cOrganization}
                    onChange={(e) => setCOrganization(e.target.value)}
                    placeholder="ETR Aviation"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => { setCreateStep('account'); setFormError(''); }}
                    style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {submitting ? 'Đang lưu hồ sơ...' : 'Tạo hồ sơ (Bước 2)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>Chỉnh sửa hồ sơ học viên</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              Mã học viên: <strong>{editingProfile.userCode}</strong> (ID: {editingProfile.accountId})
            </p>

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
                  value={eFullName}
                  onChange={(e) => setEFullName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email *</label>
                  <input
                    type="email"
                    required
                    value={eEmail}
                    onChange={(e) => setEEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                  <input
                    type="text"
                    value={ePhone}
                    onChange={(e) => setEPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ngày sinh</label>
                  <input
                    type="date"
                    value={eDateOfBirth}
                    onChange={(e) => setEDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Giới tính</label>
                  <select
                    value={eGender}
                    onChange={(e) => setEGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Male">Nam (Male)</option>
                    <option value="Female">Nữ (Female)</option>
                    <option value="Other">Khác (Other)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tổ chức</label>
                <input
                  type="text"
                  value={eOrganization}
                  onChange={(e) => setEOrganization(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
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

      {/* VIEW PROFILE MODAL */}
      {isViewOpen && viewingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Hồ sơ học viên</h2>
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Mã học viên', value: viewingProfile.userCode },
                { label: 'ID tài khoản', value: String(viewingProfile.accountId) },
                { label: 'Tên đăng nhập', value: viewingProfile.username || 'N/A' },
                { label: 'Họ và tên', value: viewingProfile.fullName },
                { label: 'Email', value: viewingProfile.email || 'N/A' },
                { label: 'Số điện thoại', value: viewingProfile.phone || 'N/A' },
                { label: 'Ngày sinh', value: formatDate(viewingProfile.dateOfBirth) },
                { label: 'Giới tính', value: GENDER_LABEL[viewingProfile.gender] || viewingProfile.gender || 'N/A' },
                { label: 'Tổ chức', value: viewingProfile.organization || 'N/A' },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', textAlign: 'right' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => handleOpenEditModal(viewingProfile)}
                style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                Sửa hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfiles;
