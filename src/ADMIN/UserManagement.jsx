import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
          username: acc.username || `user_${acc.accountId}`,
          fullName: profile?.fullName || 'Chưa cập nhật',
          email: profile?.email || '',
          role: profile?.roleName || acc.role || 'User',
          status: acc.isLocked ? 'Locked' : 'Active',
          accountId: acc.accountId,
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

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 2 of 5</p>
          <h1>User Management</h1>
          <p className="page-description">
            Create users, edit profiles, disable accounts, reset passwords, and search by username or email.
          </p>
        </div>

        <button className="primary-btn" type="button">
          Create User
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            <span className="tag-chip">Create User</span>
            <span className="tag-chip">Edit User</span>
            <span className="tag-chip">Disable User</span>
            <span className="tag-chip">Reset Password</span>
            <span className="tag-chip">Search User</span>
          </div>
        </div>

        <div className="info-card">
          <p className="section-label">Fields</p>
          <div className="field-grid">
            <div className="field-box">Username</div>
            <div className="field-box">Full Name</div>
            <div className="field-box">Email</div>
            <div className="field-box">Role</div>
            <div className="field-box">Status</div>
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header">
          <div>
            <p className="section-label">Account list</p>
            <h2>Searchable pseudo user table</h2>
          </div>
        <input
          type="text"
          placeholder="Tìm kiếm người dùng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e1e4e8', fontSize: '13px', outline: 'none', width: '250px' }}
        />
        </div>

        <div className="data-table user-table">
          <div className="table-header table-layout user-layout">
            <div>Username</div>
            <div>Full Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {loading ? (
            <div className="table-row table-layout user-layout" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
              Đang tải...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="table-row table-layout user-layout" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            filteredUsers.map((user) => (
            <div key={user.username} className="table-row table-layout user-layout">
              <div className="font-medium">{user.username}</div>
              <div className="text-gray">{user.fullName}</div>
              <div className="text-gray">{user.email}</div>
              <div className="text-gray">{user.role}</div>
              <div>
                <span className={user.status === 'Active' ? 'status status-active' : 'status status-pending'}>
                  {user.status}
                </span>
              </div>
              <div><button className="action-btn" type="button">Edit</button></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserManagement;