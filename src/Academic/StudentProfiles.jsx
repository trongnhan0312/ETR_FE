import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

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

const formatDate = (iso, lang = 'vi') => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN');
};

const parseApiError = (err, fallbackMsg = 'Thao tác thất bại.', tr = (x) => x) => {
  if (!err) return fallbackMsg;
  const raw = err.message || String(err);
  // Check for common duplicate-email patterns in the raw string
  if (raw.toLowerCase().includes('already exist') || raw.toLowerCase().includes('đã tồn tại') || raw.toLowerCase().includes('duplicate')) {
    return tr('Tên đăng nhập (Email) này đã tồn tại trong hệ thống. Vui lòng chọn email khác.');
  }
  try {
    const json = JSON.parse(raw);
    // ProblemDetails format from BE: { status, title, detail, instance }
    if (json.detail) {
      const detail = String(json.detail);
      if (detail.toLowerCase().includes('already exist') || detail.toLowerCase().includes('đã tồn tại')) {
        return tr('Tên đăng nhập (Email) này đã tồn tại trong hệ thống. Vui lòng chọn email khác.');
      }
      return detail;
    }
    if (json.errors && typeof json.errors === 'object') {
      const fieldMap = {
        UserCode: tr('Mã học viên'),
        FullName: tr('Họ và tên'),
        Email: tr('Email'),
        Phone: tr('Số điện thoại'),
        DateOfBirth: tr('Ngày sinh'),
        Gender: tr('Giới tính'),
        Organization: tr('Tổ chức'),
      };
      const messages = Object.entries(json.errors).map(([field, errs]) => {
        const fieldLabel = fieldMap[field] || field;
        const errStr = Array.isArray(errs) ? errs.join(', ') : String(errs);
        if (errStr.toLowerCase().includes('valid e-mail address')) {
          return `${fieldLabel} ${tr('phải là một địa chỉ email hợp lệ (Ví dụ: student@domain.com).')}`;
        }
        if (errStr.toLowerCase().includes('already exist') || errStr.toLowerCase().includes('đã tồn tại') || errStr.toLowerCase().includes('duplicate')) {
          return `${fieldLabel} ${tr('đã tồn tại. Vui lòng chọn giá trị khác.')}`;
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

const StudentProfiles = () => {
  const { tr, lang } = useLanguage();
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [studentAccounts, setStudentAccounts] = useState([]);
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

  // Create Student Account + Profile Form State (unified)
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('Default@123');
  const [cShowPassword, setCShowPassword] = useState(false);
  const [cFullName, setCFullName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDateOfBirth, setCDateOfBirth] = useState('');
  const [cGender, setCGender] = useState('Male');
  const [cDepartmentId, setCDepartmentId] = useState('3');

  // Edit form state
  const [eFullName, setEFullName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eDateOfBirth, setEDateOfBirth] = useState('');
  const [eGender, setEGender] = useState('Male');

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

      setStudentAccounts(learnerAccs);

      setProfiles(
        profs.map((p) => ({
          accountId: p.accountId,
          userCode: p.userCode || `USR-${p.accountId}`,
          fullName: p.fullName || tr('Chưa cập nhật'),
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

  const getStudentDepartments = () => {
    const filtered = departments.filter(
      (d) =>
        !d.name?.toLowerCase().includes('training') &&
        !d.name?.toLowerCase().includes('đào tạo') &&
        String(d.id) !== '2' &&
        String(d.id) !== '1',
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '3', name: 'Flight Crew' },
      { id: '4', name: 'Cabin Crew' },
      { id: '5', name: 'Engineering & Maintenance' },
      { id: '6', name: 'Ground Operations' },
    ];
  };

  const handleOpenCreateModal = () => {
    setCUsername('');
    setCPassword('Default@123');
    setCShowPassword(false);
    setCFullName('');
    setCPhone('');
    setCDateOfBirth('');
    setCGender('Male');
    const studentDepts = getStudentDepartments();
    setCDepartmentId(String(studentDepts[0]?.id || '3'));
    setFormError('');
    setIsCreateOpen(true);
  };

  // Submit Create Student Account + Profile (unified flow, same as LearnerManagement)
  const handleCreateStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const trimmedUsername = cUsername.trim();
    const trimmedFullName = cFullName.trim();

    if (!trimmedUsername || !cPassword || !trimmedFullName) {
      setFormError(tr('Vui lòng nhập Username, Password và Họ tên.'));
      return;
    }
    if (!trimmedUsername.includes('@') || !trimmedUsername.includes('.')) {
      setFormError(tr('Tên đăng nhập (Username) phải là địa chỉ email hợp lệ (Ví dụ: student@domain.com).'));
      return;
    }
    if (!isValidFullName(trimmedFullName)) {
      setFormError(tr('Họ và tên không được chứa số hoặc ký tự đặc biệt (!@#$%&*()_+).'));
      return;
    }
    if (cPhone.trim() && !isValidPhone(cPhone.trim())) {
      setFormError(tr('Số điện thoại phải gồm 10 hoặc 11 chữ số.'));
      return;
    }
    if (!isValidDateOfBirth(cDateOfBirth)) {
      setFormError(tr('Ngày sinh bắt buộc và phải trước năm 2007.'));
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create account with Student Role (roleId: 6)
      const newAcc = await api.post('/Accounts', {
        username: trimmedUsername,
        password: cPassword,
        roleId: 6,
        departmentId: Number(cDepartmentId || getStudentDepartments()[0]?.id || 3),
      });

      // 2. Create user profile
      const accId = newAcc?.accountId || newAcc?.id;
      if (accId) {
        await api.post(`/UserProfiles/${accId}`, {
          userCode: `USR-${accId}`,
          fullName: trimmedFullName,
          email: trimmedUsername,
          phone: cPhone.trim() || null,
          dateOfBirth: new Date(`${cDateOfBirth}T00:00:00`).toISOString(),
          gender: cGender || 'Male',
          organization: 'ETR Aviation',
        }).catch((err) => console.warn('Failed to create profile details:', err));
      }

      await loadProfiles();
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create student:', err);
      setFormError(parseApiError(err, tr('Tạo học viên thất bại.'), tr));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (profile) => {
    setEditingProfile(profile);
    setEFullName(profile.fullName === tr('Chưa cập nhật') ? '' : profile.fullName);
    setEEmail(profile.email || '');
    setEPhone(profile.phone || '');
    setEDateOfBirth(toDateInputValue(profile.dateOfBirth));
    setEGender(profile.gender || 'Male');
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!eFullName.trim()) {
      setFormError(tr('Vui lòng nhập Họ và tên.'));
      return;
    }
    if (!isValidFullName(eFullName.trim())) {
      setFormError(tr('Họ và tên không được chứa số hoặc ký tự đặc biệt (!@#$%&*()_+).'));
      return;
    }
    if (!eEmail.trim() || !eEmail.includes('@')) {
      setFormError(tr('Email phải là một địa chỉ email hợp lệ (Ví dụ: student@domain.com).'));
      return;
    }
    if (ePhone.trim() && !isValidPhone(ePhone.trim())) {
      setFormError(tr('Số điện thoại phải gồm 10 hoặc 11 chữ số.'));
      return;
    }
    if (!isValidDateOfBirth(eDateOfBirth)) {
      setFormError(tr('Ngày sinh bắt buộc và phải trước năm 2007.'));
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/UserProfiles/${editingProfile.accountId}`, {
        fullName: eFullName.trim(),
        email: eEmail.trim(),
        phone: ePhone.trim() || null,
        dateOfBirth: new Date(`${eDateOfBirth}T00:00:00`).toISOString(),
        gender: eGender,
        organization: 'ETR Aviation',
      });
      await loadProfiles();
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setFormError(parseApiError(err, tr('Cập nhật hồ sơ học viên thất bại.'), tr));
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

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredProfiles, {
    pageSize: 10,
    resetKey: searchTerm,
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
            {tr('Hồ sơ Học viên (User Profiles)')}
          </h1>
          <div className="divider-gold" style={{ width: '40px', height: '3px', background: '#c5a059', margin: '8px 0 12px' }} />
          <p className="header-description" style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {tr('Quản lý hồ sơ học viên: Xem, tạo mới và cập nhật thông tin hồ sơ cho từng tài khoản học viên.')}
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
          <span>{tr('+ Tạo hồ sơ học viên')}</span>
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
              {tr('Tất cả hồ sơ')} ({filteredProfiles.length})
            </h2>
          </div>
          <input
            type="text"
            placeholder={tr('Tìm theo mã HV, tên, email, SĐT...')}
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

        <div style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', background: '#fff' }}>
          <div className="data-table" style={{ minWidth: '1150px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '130px 180px 220px 130px 120px 100px 140px minmax(130px, 1fr)',
                padding: '12px 16px',
                background: '#002147',
                color: '#fff',
                fontWeight: '600',
                fontSize: '12px',
                letterSpacing: '0.03em',
                alignItems: 'center',
              }}
            >
              <div>{tr('Mã học viên')}</div>
              <div>{tr('Họ và tên')}</div>
              <div>{tr('Email')}</div>
              <div>{tr('Số điện thoại')}</div>
              <div>{tr('Ngày sinh')}</div>
              <div>{tr('Giới tính')}</div>
              <div>{tr('Tổ chức')}</div>
              <div style={{ textAlign: 'right' }}>{tr('Hành động')}</div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                {tr('Đang tải danh sách hồ sơ học viên...')}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontStyle: 'italic' }}>
                {searchTerm ? tr('Không tìm thấy hồ sơ phù hợp.') : tr('Chưa có hồ sơ học viên nào trong hệ thống.')}
              </div>
            ) : (
              pageItems.map((profile) => (
                <div
                  key={profile.accountId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 180px 220px 130px 120px 100px 140px minmax(130px, 1fr)',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    fontSize: '13px',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#c5a059', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.userCode}</div>
                  <div style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.fullName}</div>
                  <div style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={profile.email}>{profile.email || 'N/A'}</div>
                  <div style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.phone || 'N/A'}</div>
                  <div style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDate(profile.dateOfBirth, lang)}</div>
                  <div style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr(GENDER_LABEL[profile.gender]) || profile.gender || 'N/A'}</div>
                  <div style={{ color: '#334155', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.organization || 'N/A'}</div>
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
                      {tr('Xem')}
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
                      {tr('Sửa')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>

      {/* CREATE STUDENT MODAL (Single-Step) */}
      {isCreateOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>{tr('Tạo tài khoản & hồ sơ học viên')}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              {tr('Nhập thông tin tài khoản và hồ sơ học viên (Vai trò: Student).')}
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Account Section */}
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                {tr('1. Thông tin Tài khoản')}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Tên đăng nhập (Email / Username) *')}</label>
                <input
                  type="email"
                  required
                  value={cUsername}
                  onChange={(e) => setCUsername(e.target.value)}
                  placeholder={tr('Ví dụ: student@domain.com')}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Mật khẩu *')}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={cShowPassword ? 'text' : 'password'}
                    required
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px 38px 8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setCShowPassword(!cShowPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
                  >
                    {cShowPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Vai trò (Role)')}</label>
                  <input type="text" disabled value="Student" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Phòng ban')}</label>
                  <select
                    value={cDepartmentId}
                    onChange={(e) => setCDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {getStudentDepartments().map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profile Section */}
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '8px' }}>
                {tr('2. Thông tin Hồ sơ')}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Họ và tên *')}</label>
                <input
                  type="text"
                  required
                  value={cFullName}
                  onChange={(e) => setCFullName(e.target.value)}
                  placeholder={tr('Ví dụ: Nguyễn Văn A')}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Số điện thoại')}</label>
                  <input
                    type="text"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    placeholder="0901234567"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Giới tính')}</label>
                  <select
                    value={cGender}
                    onChange={(e) => setCGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Male">{tr('Nam (Male)')}</option>
                    <option value="Female">{tr('Nữ (Female)')}</option>
                    <option value="Other">{tr('Khác (Other)')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Ngày sinh (phải trước năm 2007) *')}</label>
                  <input
                    type="date"
                    required
                    value={cDateOfBirth}
                    onChange={(e) => setCDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Tổ chức (khóa)')}</label>
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
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', background: '#002147', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? tr('Đang tạo học viên...') : tr('Tạo học viên')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && editingProfile && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>{tr('Chỉnh sửa hồ sơ học viên')}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              {tr('Mã học viên:')} <strong>{editingProfile.userCode}</strong> (ID: {editingProfile.accountId})
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Họ và tên *')}</label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Email *')}</label>
                  <input
                    type="email"
                    required
                    value={eEmail}
                    onChange={(e) => setEEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Số điện thoại')}</label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Ngày sinh')}</label>
                  <input
                    type="date"
                    value={eDateOfBirth}
                    onChange={(e) => setEDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Giới tính')}</label>
                  <select
                    value={eGender}
                    onChange={(e) => setEGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Male">{tr('Nam (Male)')}</option>
                    <option value="Female">{tr('Nữ (Female)')}</option>
                    <option value="Other">{tr('Khác (Other)')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Tổ chức (khóa)')}</label>
                <input
                  type="text"
                  disabled
                  value="ETR Aviation"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  {tr('* Tổ chức không thể thay đổi.')}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
                >
                  {tr('Hủy')}
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

      {/* VIEW PROFILE MODAL */}
      {isViewOpen && viewingProfile && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{tr('Hồ sơ học viên')}</h2>
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
                { label: tr('Mã học viên'), value: viewingProfile.userCode },
                { label: tr('ID tài khoản'), value: String(viewingProfile.accountId) },
                { label: tr('Tên đăng nhập'), value: viewingProfile.username || 'N/A' },
                { label: tr('Họ và tên'), value: viewingProfile.fullName },
                { label: tr('Email'), value: viewingProfile.email || 'N/A' },
                { label: tr('Số điện thoại'), value: viewingProfile.phone || 'N/A' },
                { label: tr('Ngày sinh'), value: formatDate(viewingProfile.dateOfBirth, lang) },
                { label: tr('Giới tính'), value: tr(GENDER_LABEL[viewingProfile.gender]) || viewingProfile.gender || 'N/A' },
                { label: tr('Tổ chức'), value: viewingProfile.organization || 'N/A' },
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
                {tr('Sửa hồ sơ')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentProfiles;
