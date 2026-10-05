import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { announce } from '../utils/crudNotify';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import { uploadToCloudinary, validateEvidenceFile, EXT_TO_MIME } from '../utils/cloudinary';

/** Format a Date or ISO string → yyyy-MM-dd for <input type="date"> */
const toDateInputValue = (d) => {
  if (!d) return '';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/** Format an ISO string → dd/MM/yyyy for display */
const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return '--';
  }
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const LICENSE_TYPE_OPTIONS = ['None', 'SPL', 'PPL', 'CPL', 'ATPL', 'MPL', 'Drone'];
const MEDICAL_CLASS_OPTIONS = ['None', 'Class 1', 'Class 2', 'Class 3', 'LAPL'];
const DOC_TYPE_OPTIONS = ['License', 'Medical', 'ELP', 'TypeRating', 'General'];

const StudentProfile = () => {
  const { tr } = useLanguage();
  const toast = useToast();

  /* ── Profile state ── */
  const [profile, setProfile] = useState({
    accountId: 0,
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Other',
    organization: '',
    username: '',
    roleName: 'Student',
    userCode: '',
    licenseType: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    medicalClass: '',
    medicalExpiryDate: '',
    icaoElpLevel: '',
    icaoElpExpiryDate: '',
    typeRatings: '',
    isCredentialsVerified: false,
    credentialsVerifiedAt: null,
  });

  /* ── Form & Loading states ── */
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [editingCreds, setEditingCreds] = useState(false);

  /* ── Credentials Edit form state ── */
  const [credForm, setCredForm] = useState({
    licenseType: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    medicalClass: '',
    medicalExpiryDate: '',
    icaoElpLevel: '',
    icaoElpExpiryDate: '',
    typeRatings: '',
  });

  /* ── Attachments state ── */
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('License');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  /* ── Password states ── */
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loadingPwd, setLoadingPwd] = useState(false);

  /* ── Load profile and attachments ── */
  useEffect(() => {
    loadProfileAndAttachments();
  }, []);

  const loadProfileAndAttachments = async () => {
    setProfileLoading(true);

    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setProfile((prev) => ({
        ...prev,
        fullName: u.fullName || '',
        username: u.username || '',
        roleName: u.roleName || 'Student',
      }));
    } catch { /* ignore */ }

    try {
      const data = await api.get('/UserProfiles/me', { suppressAuthRedirect: true });
      if (data) {
        const accId = data.AccountId ?? data.accountId ?? 0;
        const prof = {
          accountId: accId,
          fullName: data.FullName ?? data.fullName ?? '',
          email: data.Email ?? data.email ?? '',
          phone: data.Phone ?? data.phone ?? '',
          dateOfBirth: data.DateOfBirth ?? data.dateOfBirth ?? '',
          gender: data.Gender ?? data.gender ?? 'Other',
          organization: data.Organization ?? data.organization ?? '',
          username: data.username ?? '',
          roleName: data.RoleName ?? data.roleName ?? 'Student',
          userCode: data.UserCode ?? data.userCode ?? '',
          licenseType: data.LicenseType ?? data.licenseType ?? '',
          licenseNumber: data.LicenseNumber ?? data.licenseNumber ?? '',
          licenseExpiryDate: data.LicenseExpiryDate ?? data.licenseExpiryDate ?? '',
          medicalClass: data.MedicalClass ?? data.medicalClass ?? '',
          medicalExpiryDate: data.MedicalExpiryDate ?? data.medicalExpiryDate ?? '',
          icaoElpLevel: data.IcaoElpLevel ?? data.icaoElpLevel ?? '',
          icaoElpExpiryDate: data.IcaoElpExpiryDate ?? data.icaoElpExpiryDate ?? '',
          typeRatings: data.TypeRatings ?? data.typeRatings ?? '',
          isCredentialsVerified: data.IsCredentialsVerified ?? data.isCredentialsVerified ?? false,
          credentialsVerifiedAt: data.CredentialsVerifiedAt ?? data.credentialsVerifiedAt ?? null,
        };
        setProfile(prof);
        setCredForm({
          licenseType: prof.licenseType || 'None',
          licenseNumber: prof.licenseNumber || '',
          licenseExpiryDate: toDateInputValue(prof.licenseExpiryDate),
          medicalClass: prof.medicalClass || 'None',
          medicalExpiryDate: toDateInputValue(prof.medicalExpiryDate),
          icaoElpLevel: prof.icaoElpLevel || '',
          icaoElpExpiryDate: toDateInputValue(prof.icaoElpExpiryDate),
          typeRatings: prof.typeRatings || '',
        });

        if (accId > 0) {
          fetchAttachments(accId);
        }
      }
    } catch {
      // fallback
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchAttachments = async (accId) => {
    setLoadingAttachments(true);
    try {
      const list = await api.get(`/UserProfiles/${accId}/attachments`, { suppressAuthRedirect: true });
      if (Array.isArray(list)) {
        setAttachments(list);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAttachments(false);
    }
  };

  const initials = (name) => {
    if (!name) return 'HV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  /* ── Save demographic profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(
        '/UserProfiles/me',
        {
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          phone: profile.phone?.trim() || null,
          dateOfBirth: profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString()
            : new Date('2000-01-01').toISOString(),
          gender: profile.gender || 'Other',
          organization: profile.organization?.trim() || null,
        },
        { suppressAuthRedirect: true },
      );
      toast.success(tr('Cập nhật thành công'), announce('edit', tr('Hồ sơ')));
    } catch (err) {
      toast.error(tr('Cập nhật thất bại'));
    } finally {
      setSaving(false);
    }
  };

  /* ── Save pilot credentials ── */
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setSavingCreds(true);

    try {
      const payload = {
        licenseType: credForm.licenseType === 'None' ? null : credForm.licenseType || null,
        licenseNumber: credForm.licenseNumber?.trim() || null,
        licenseExpiryDate: credForm.licenseExpiryDate ? new Date(credForm.licenseExpiryDate).toISOString() : null,
        medicalClass: credForm.medicalClass === 'None' ? null : credForm.medicalClass || null,
        medicalExpiryDate: credForm.medicalExpiryDate ? new Date(credForm.medicalExpiryDate).toISOString() : null,
        icaoElpLevel: credForm.icaoElpLevel ? parseInt(credForm.icaoElpLevel, 10) : null,
        icaoElpExpiryDate: credForm.icaoElpExpiryDate ? new Date(credForm.icaoElpExpiryDate).toISOString() : null,
        typeRatings: credForm.typeRatings?.trim() || null,
      };

      const updated = await api.put('/UserProfiles/me/credentials', payload, { suppressAuthRedirect: true });
      if (updated) {
        setProfile((prev) => ({
          ...prev,
          licenseType: updated.LicenseType ?? updated.licenseType ?? '',
          licenseNumber: updated.LicenseNumber ?? updated.licenseNumber ?? '',
          licenseExpiryDate: updated.LicenseExpiryDate ?? updated.licenseExpiryDate ?? '',
          medicalClass: updated.MedicalClass ?? updated.medicalClass ?? '',
          medicalExpiryDate: updated.MedicalExpiryDate ?? updated.medicalExpiryDate ?? '',
          icaoElpLevel: updated.IcaoElpLevel ?? updated.icaoElpLevel ?? '',
          icaoElpExpiryDate: updated.IcaoElpExpiryDate ?? updated.icaoElpExpiryDate ?? '',
          typeRatings: updated.TypeRatings ?? updated.typeRatings ?? '',
          isCredentialsVerified: updated.IsCredentialsVerified ?? updated.isCredentialsVerified ?? false,
          credentialsVerifiedAt: updated.CredentialsVerifiedAt ?? updated.credentialsVerifiedAt ?? null,
        }));
      }

      setEditingCreds(false);
      toast.success(tr('Cập nhật năng định thành công'), tr('Thông tin tự khai đã lưu và đang chờ xác minh.'));
    } catch (err) {
      toast.error(tr('Cập nhật năng định thất bại'), err.message || tr('Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setSavingCreds(false);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    const errorMsg = validateEvidenceFile(file);
    if (errorMsg) {
      toast.error(tr(errorMsg) || errorMsg);
      return;
    }
    setUploadFile(file);
    if (!uploadFileName || uploadFileName.trim() === '') {
      setUploadFileName(file.name);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  /* ── Upload credential attachment ── */
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!uploadFile && !uploadFileUrl.trim()) {
      toast.error(tr('Vui lòng chọn tệp PDF hoặc ảnh minh chứng để tải lên.'));
      return;
    }

    setUploading(true);
    try {
      let cloudFile = null;
      if (uploadFile) {
        cloudFile = await uploadToCloudinary(uploadFile);
      }

      const fileExt = (uploadFileName || '').slice((uploadFileName || '').lastIndexOf('.')).toLowerCase();
      const fallbackMime = EXT_TO_MIME[fileExt] || (fileExt === '.pdf' ? 'application/pdf' : 'image/jpeg');

      const payload = {
        docType: uploadDocType,
        url: cloudFile ? cloudFile.fileUrl : uploadFileUrl.trim(),
        fileName: cloudFile ? cloudFile.fileName : (uploadFileName.trim() || 'evidence.pdf'),
        publicId: cloudFile?.publicId || null,
        mimeType: cloudFile ? cloudFile.mimeType : fallbackMime,
        fileSize: cloudFile?.fileSize || null,
      };

      await api.post(`/UserProfiles/${profile.accountId}/attachments`, payload, { suppressAuthRedirect: true });
      toast.success(tr('Tải lên minh chứng thành công'), announce('add', tr('Minh chứng')));
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadFileName('');
      setUploadFileUrl('');
      fetchAttachments(profile.accountId);
    } catch (err) {
      console.error('[Upload Attachment] Lỗi khi upload minh chứng:', err);
      toast.error(tr('Tải lên minh chứng thất bại'), err.message || tr('Vui lòng thử lại.'));
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete credential attachment ── */
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm(tr('Bạn có chắc chắn muốn xóa tài liệu minh chứng này?'))) return;

    try {
      await api.delete(`/UserProfiles/${profile.accountId}/attachments/${attachmentId}`, { suppressAuthRedirect: true });
      toast.success(tr('Đã xóa tệp minh chứng'), tr('Trạng thái xác minh của hồ sơ đã được tự động cập nhật lại.'));
      await fetchAttachments(profile.accountId);
      await loadProfileAndAttachments();
    } catch (err) {
      console.error('Delete attachment error:', err);
      toast.error(tr('Xóa tệp minh chứng thất bại'), err.message || tr('Vui lòng thử lại.'));
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error(tr('Thiếu thông tin'));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(tr('Mật khẩu không khớp'));
      return;
    }
    if (newPwd.length < 6) {
      toast.error(tr('Mật khẩu quá ngắn'));
      return;
    }

    setLoadingPwd(true);
    try {
      await api.post(
        '/auth/change-password',
        { oldPassword: currentPwd, newPassword: newPwd },
        { suppressAuthRedirect: true },
      );
      toast.success(tr('Đổi mật khẩu thành công'), announce('edit', tr('Mật khẩu')));
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      toast.error(tr('Đổi mật khẩu thất bại'));
    } finally {
      setLoadingPwd(false);
    }
  };

  return (
    <div className="page-shell">
      {/* ── Header ── */}
      <section className="student-welcome" style={{ marginBottom: 24 }}>
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Student Portal')}</p>
          <h1>{tr('Hồ sơ & Năng định Phi công')}</h1>
          <p className="welcome-sub">
            {tr('Quản lý thông tin cá nhân, hồ sơ bằng lái, giấy khám sức khỏe, chứng chỉ ICAO ELP và minh chứng.')}
          </p>
        </div>
        <div className="student-welcome-right">
          <div className="student-avatar-large">{initials(profile.fullName)}</div>
          <span className="welcome-role">
            {profile.userCode || profile.roleName}
          </span>
        </div>
      </section>

      {/* ── Toast notifications ── */}
      <toast.ToastContainer />

      {/* ── Two-column grid ── */}
      <section className="student-info-grid">
        {/* ===== LEFT: Demographic Profile ===== */}
        <div className="student-info-card">
          <div className="student-profile-header">
            <div className="student-profile-avatar">{initials(profile.fullName)}</div>
            <div>
              <h2 className="student-profile-name">
                {profile.fullName || tr('Học viên')}
              </h2>
              <p className="student-profile-role">
                {profile.roleName === 'Student' ? tr('Học viên') : profile.roleName}
              </p>
            </div>
          </div>

          {profileLoading ? (
            <p style={{ color: 'rgba(0,33,71,0.4)', fontSize: 13 }}>{tr('Đang tải...')}</p>
          ) : (
            <form className="student-pwd-form" onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>{tr('Họ và tên')}</label>
                <div className="student-field-value" style={{ padding: '11px 14px', border: '1px solid #e4eaf3', borderRadius: '10px', background: '#f0f4f9', color: 'rgba(0,33,71,0.6)', fontSize: '14px' }}>
                  {profile.fullName || '--'}
                </div>
              </div>

              <div className="form-group">
                <label>{tr('Email')}</label>
                <div className="student-field-value" style={{ padding: '11px 14px', border: '1px solid #e4eaf3', borderRadius: '10px', background: '#f0f4f9', color: 'rgba(0,33,71,0.6)', fontSize: '14px' }}>
                  {profile.email || '--'}
                </div>
              </div>

              <div className="form-group">
                <label>{tr('Số điện thoại')}</label>
                <input
                  type="tel"
                  placeholder={tr('Nhập số điện thoại')}
                  value={profile.phone || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>{tr('Ngày sinh')}</label>
                <input
                  type="date"
                  value={toDateInputValue(profile.dateOfBirth)}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>{tr('Giới tính')}</label>
                <select
                  value={profile.gender || 'Other'}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, gender: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d9e1ec',
                    fontSize: '14px',
                    color: '#17314f',
                    outline: 'none',
                    background: '#f8faff',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g === 'Male' ? tr('Nam') : g === 'Female' ? tr('Nữ') : tr('Khác')}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
                style={{ width: '100%', marginTop: 8 }}
              >
                {saving ? tr('Đang lưu...') : tr('Lưu thông tin')}
              </button>
            </form>
          )}
        </div>

        {/* ===== RIGHT: Change Password ===== */}
        <div className="student-info-card">
          <p className="info-eyebrow">{tr('Bảo mật')}</p>
          <h3>{tr('Đổi mật khẩu')}</h3>
          <form className="student-pwd-form" onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="sp-current">{tr('Mật khẩu hiện tại')}</label>
              <input
                id="sp-current"
                type="password"
                placeholder={tr('Nhập mật khẩu hiện tại')}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sp-new">{tr('Mật khẩu mới')}</label>
              <input
                id="sp-new"
                type="password"
                placeholder={tr('Nhập mật khẩu mới (ít nhất 6 ký tự)')}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sp-confirm">{tr('Xác nhận mật khẩu mới')}</label>
              <input
                id="sp-confirm"
                type="password"
                placeholder={tr('Nhập lại mật khẩu mới')}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="primary-btn"
              disabled={loadingPwd}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loadingPwd ? tr('Đang cập nhật...') : tr('Cập nhật mật khẩu')}
            </button>
          </form>
        </div>
      </section>

      {/* ===== PILOT CREDENTIALS CARD ===== */}
      <section style={{ marginTop: '28px' }}>
        <div className="student-info-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="info-eyebrow">{tr('Năng định & Bằng lái Phi công')}</p>
              <h3 style={{ margin: 0 }}>{tr('Hồ sơ Năng định Hiện tại')}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: profile.isCredentialsVerified ? '#ecfdf5' : '#fffbeb',
                  color: profile.isCredentialsVerified ? '#047857' : '#b45309',
                  border: profile.isCredentialsVerified ? '1px solid #a7f3d0' : '1px solid #fde68a',
                }}
              >
                {profile.isCredentialsVerified ? `✓ ${tr('ĐÃ XÁC MINH')}` : `⏳ ${tr('TỰ KHAI / CHỜ XÁC MINH')}`}
              </span>

              {!editingCreds ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingCreds(true)}
                  style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  ✏️ {tr('Cập nhật Năng định')}
                </button>
              ) : null}
            </div>
          </div>

          {!editingCreds ? (
            /* Display View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: '#f8fafd', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{tr('Bằng lái phi công')}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{profile.licenseType || '--'}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Số: {profile.licenseNumber || '--'}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Hạn: {formatDate(profile.licenseExpiryDate)}</div>
              </div>

              <div style={{ background: '#f8fafd', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{tr('Hạng sức khỏe hàng không')}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{profile.medicalClass || '--'}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Hạn: {formatDate(profile.medicalExpiryDate)}</div>
              </div>

              <div style={{ background: '#f8fafd', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{tr('Trình độ tiếng Anh ICAO')}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.icaoElpLevel ? `Level ${profile.icaoElpLevel}` : '--'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {profile.icaoElpLevel === 6 ? tr('Vô thời hạn') : `Hạn: ${formatDate(profile.icaoElpExpiryDate)}`}
                </div>
              </div>

              <div style={{ background: '#f8fafd', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{tr('Định danh loại tàu bay')}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{profile.typeRatings || '--'}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{tr('Chứng nhận chủng loại tàu bay')}</div>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSaveCredentials} style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label>{tr('Loại bằng lái')}</label>
                  <select
                    value={credForm.licenseType}
                    onChange={(e) => setCredForm((f) => ({ ...f, licenseType: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccd6e0' }}
                  >
                    {LICENSE_TYPE_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{tr('Số bằng lái')}</label>
                  <input
                    type="text"
                    placeholder="e.g. VN-12345"
                    value={credForm.licenseNumber}
                    onChange={(e) => setCredForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Ngày hết hạn bằng lái')}</label>
                  <input
                    type="date"
                    value={credForm.licenseExpiryDate}
                    onChange={(e) => setCredForm((f) => ({ ...f, licenseExpiryDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Hạng sức khỏe hàng không')}</label>
                  <select
                    value={credForm.medicalClass}
                    onChange={(e) => setCredForm((f) => ({ ...f, medicalClass: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccd6e0' }}
                  >
                    {MEDICAL_CLASS_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{tr('Ngày hết hạn giấy khám sức khỏe')}</label>
                  <input
                    type="date"
                    value={credForm.medicalExpiryDate}
                    onChange={(e) => setCredForm((f) => ({ ...f, medicalExpiryDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Cấp độ tiếng Anh ICAO (1 - 6)')}</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    placeholder="e.g. 4, 5, 6"
                    value={credForm.icaoElpLevel}
                    onChange={(e) => setCredForm((f) => ({ ...f, icaoElpLevel: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Ngày hết hạn ICAO ELP')}</label>
                  <input
                    type="date"
                    value={credForm.icaoElpExpiryDate}
                    onChange={(e) => setCredForm((f) => ({ ...f, icaoElpExpiryDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Định danh loại tàu bay')}</label>
                  <input
                    type="text"
                    placeholder="e.g. A320, B737, C172"
                    value={credForm.typeRatings}
                    onChange={(e) => setCredForm((f) => ({ ...f, typeRatings: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingCreds(false)}
                  style={{ padding: '8px 18px', borderRadius: '8px' }}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingCreds}
                  style={{ padding: '8px 20px', borderRadius: '8px' }}
                >
                  {savingCreds ? tr('Đang lưu...') : tr('Lưu năng định')}
                </button>
              </div>
            </form>
          )}

          {/* ── Credential Attachments & Evidence Section ── */}
          <div style={{ marginTop: '28px', borderTop: '1px solid #eef2f6', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, color: '#1e293b' }}>📎 {tr('Tài liệu minh chứng năng định')}</h4>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowUploadModal(true)}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
              >
                + {tr('Tải lên minh chứng')}
              </button>
            </div>

            {loadingAttachments ? (
              <p style={{ color: '#888', fontSize: '13px' }}>{tr('Đang tải danh sách tài liệu...')}</p>
            ) : attachments.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>{tr('Chưa có tệp minh chứng nào được tải lên.')}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {attachments.map((att) => (
                  <div
                    key={att.attachmentId ?? att.AttachmentId}
                    style={{
                      background: '#f8fafd',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        {att.docType ?? att.DocType ?? 'General'}
                      </span>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{att.fileName ?? att.FileName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(att.uploadedAt ?? att.UploadedAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={att.url ?? att.Url}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', textDecoration: 'none', color: '#004a99' }}
                      >
                        {tr('Xem')}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.attachmentId ?? att.AttachmentId)}
                        title={tr('Xóa tài liệu minh chứng này')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🗑️ {tr('Xóa')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Modal: Upload Credential Attachment ── */}
      {showUploadModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '520px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>{tr('Tải lên Minh chứng Năng định')}</h3>
              <button
                type="button"
                onClick={() => {
                  if (!uploading) {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadFileName('');
                    setUploadFileUrl('');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadAttachment}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {tr('Loại tài liệu')}
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccd6e0', fontSize: '14px' }}
                >
                  {DOC_TYPE_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Tệp minh chứng (PDF hoặc Ảnh) - Chọn file / Kéo thả giống bên Upload Evidence */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {tr('Tệp tài liệu')}
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('credential-file-input')?.click()}
                  style={{
                    border: dragging ? '2px dashed #0284c7' : '2px dashed #cbd5e1',
                    background: dragging ? '#f0f9ff' : '#f8fafc',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    id="credential-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  {uploadFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '32px' }}>
                        {uploadFile.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', wordBreak: 'break-all' }}>
                          {uploadFile.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB · <span style={{ color: '#0284c7' }}>{tr('Nhấn để chọn tệp khác')}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          setUploadFileName('');
                        }}
                        style={{
                          marginLeft: '8px',
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        title={tr('Xóa tệp')}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
                      <div style={{ fontWeight: 600, color: '#002147', fontSize: '14px', marginBottom: '4px' }}>
                        {tr('Nhấn để chọn tệp PDF hoặc kéo thả vào đây')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {tr('Hỗ trợ định dạng PDF, PNG, JPG, WEBP — tải lên Cloudinary')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tên tệp hiển thị / Ghi chú tên */}
              {uploadFile && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {tr('Tên tệp')}
                  </label>
                  <input
                    type="text"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccd6e0', fontSize: '14px' }}
                    placeholder="e.g. CPL_License_Front.pdf"
                    required
                  />
                </div>
              )}

              {/* Fallback nếu không chọn file từ máy: Tuỳ chọn nhập URL */}
              {!uploadFile && (
                <div style={{ marginBottom: '16px' }}>
                  <details style={{ fontSize: '12px', color: '#64748b' }}>
                    <summary style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 500, marginBottom: '8px' }}>
                      {tr('Hoặc nhập đường dẫn URL / Cloudinary URL trực tiếp')}
                    </summary>
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="url"
                        placeholder="https://res.cloudinary.com/..."
                        value={uploadFileUrl}
                        onChange={(e) => setUploadFileUrl(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccd6e0', fontSize: '13px', marginBottom: '6px' }}
                      />
                      <input
                        type="text"
                        placeholder="e.g. CPL_License_Front.pdf"
                        value={uploadFileName}
                        onChange={(e) => setUploadFileName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccd6e0', fontSize: '13px' }}
                      />
                    </div>
                  </details>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={uploading}
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadFileName('');
                    setUploadFileUrl('');
                  }}
                  style={{ padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={uploading || (!uploadFile && !uploadFileUrl.trim())}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    background: uploading ? '#94a3b8' : '#002147',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {uploading ? (
                    <>
                      <span>⏳</span>
                      <span>{tr('Đang tải lên Cloudinary...')}</span>
                    </>
                  ) : (
                    tr('Xác nhận tải lên')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentProfile;
