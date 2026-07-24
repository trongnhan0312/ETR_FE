import { useState, useEffect } from 'react';

const AuditorProfile = () => {
  const [profile, setProfile] = useState({
    name: 'Auditor Compliance Officer',
    role: 'Independent Auditor',
    email: 'auditor.compliance@aero.vn',
    department: 'Regulatory Compliance & Quality Audit',
    status: 'Active (Read-Only)',
    accessLevel: 'Full Read-Only Access to GET Endpoints'
  });

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setProfile((prev) => ({
          ...prev,
          name: user.fullName || user.username || prev.name,
          email: user.email || prev.email,
        }));
      } catch {}
    }
  }, []);

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    setMessage({ type: 'success', text: 'Cập nhật mật khẩu thành công!' });
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Auditor Profile & Account Settings</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            Manage your compliance auditor profile credentials, security credentials, and view role scope details.
          </p>
        </div>
      </section>

      {message.text && (
        <div 
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Profile Details Panel */}
        <section className="table-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '20px' }}>
            Officer Profile Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Full Name</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{profile.name}</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Assigned System Role</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#c5a059', marginTop: '4px' }}>{profile.role}</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Email Address</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{profile.email}</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Department</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{profile.department}</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Permission Boundaries</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>{profile.accessLevel}</div>
            </div>
          </div>
        </section>

        {/* Change Password Panel */}
        <section className="table-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '20px' }}>
            Change Account Password
          </h2>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>Current Password</label>
              <input
                className="search-input"
                type="password"
                placeholder="Enter current password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>New Password</label>
              <input
                className="search-input"
                type="password"
                placeholder="Enter new password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>Confirm New Password</label>
              <input
                className="search-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="create-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px', borderRadius: '12px' }}
            >
              Update Password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AuditorProfile;
