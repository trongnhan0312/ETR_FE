import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

const RolePermissionManagement = () => {
  const { tr } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [accts, depts] = await Promise.all([
          api.get("/Accounts").catch(() => []),
          api.get("/Departments").catch(() => []),
        ]);
        setAccounts(Array.isArray(accts) ? accts : []);
        setDepartments(Array.isArray(depts) ? depts : []);
      } catch (err) {
        console.error("Error loading role/permission data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const roleSet = new Set();
  accounts.forEach(a => {
    const r = a.roleName || a.RoleName;
    if (r) roleSet.add(r);
  });
  const roles = [...roleSet].sort();

  const getRoleName = (acct) => acct.roleName || acct.RoleName || 'Unknown';
  const getDeptName = (deptId) => {
    const dept = departments.find(d => (d.departmentId || d.id) === deptId);
    return dept?.departmentName || dept?.name || '#' + deptId;
  };
  const getStatus = (acct) => (acct.status || acct.Status || 'Active');

  const permMatrix = {
    admin: { create: true, edit: true, assign: true, configure: true, delete: true },
    academic: { create: true, edit: true, assign: false, configure: false, delete: false },
    academicstaff: { create: true, edit: true, assign: false, configure: false, delete: false },
    instructor: { create: false, edit: true, assign: false, configure: false, delete: false },
    qa: { create: false, edit: false, assign: false, configure: false, delete: false },
    qualityassurance: { create: false, edit: false, assign: false, configure: false, delete: false },
    trainingmanager: { create: false, edit: false, assign: true, configure: false, delete: false },
    student: { create: false, edit: false, assign: false, configure: false, delete: false },
    auditor: { create: false, edit: false, assign: false, configure: false, delete: false },
  };

  const getPerm = (role, perm) => {
    const key = role.toLowerCase().replace(/\s+/g, '');
    const matrix = permMatrix[key] || permMatrix.student;
    return matrix[perm] ? 'Yes' : 'No';
  };

  const filteredAccounts = accounts.filter((acct) => {
    const role = getRoleName(acct);
    if (selectedRole !== 'All' && role !== selectedRole) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (acct.username || '').toLowerCase().includes(term) ||
      role.toLowerCase().includes(term) ||
      getDeptName(acct.departmentId || acct.DepartmentId).toLowerCase().includes(term)
    );
  });

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredAccounts, {
    pageSize: 10,
    resetKey: `${selectedRole}|${searchTerm}`,
  });

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Administrator page 3 of 5')}</p>
          <h1>{tr('Role & Permission Management')}</h1>
          <p className="page-description">
            {tr('Define access boundaries and keep business responsibilities separated.')}
          </p>
        </div>
      </section>

      <div className="student-metrics" style={{ marginBottom: 20 }}>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Tổng tài khoản')}</span>
          <strong className="student-metric-value">{loading ? '...' : accounts.length}</strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Phòng ban')}</span>
          <strong className="student-metric-value">{loading ? '...' : departments.length}</strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Vai trò')}</span>
          <strong className="student-metric-value">{roles.length}</strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Đang hoạt động')}</span>
          <strong className="student-metric-value green">
            {loading ? '...' : accounts.filter(a => getStatus(a) === 'Active').length}
          </strong>
        </div>
      </div>

      <div className="student-search-bar">
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9e1ec',
            fontSize: '13px', fontWeight: 600, color: '#002147', background: '#f8faff',
            cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="All">{tr('Tất cả vai trò')}</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="text" placeholder={tr('Tìm kiếm username, vai trò, phòng ban...')}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 8px',
            fontSize: '13px', color: '#002147', background: 'transparent', fontFamily: 'inherit' }} />
      </div>

      <section className="student-table-section" style={{ marginBottom: 20 }}>
        <div className="student-table-header">
          <div className="student-table-header-left">
            <p className="student-section-label">{tr('Role Permissions')}</p>
            <h2>{tr('Access Matrix')}</h2>
          </div>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 16px 16px' }}>
          <table className="student-subject-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{tr('Vai trò')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Tạo')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Sửa')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Gán quyền')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Cấu hình')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Xóa')}</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role}>
                  <td style={{ fontWeight: 700, color: '#002147' }}>{role}</td>
                  {['create', 'edit', 'assign', 'configure', 'delete'].map(perm => (
                    <td key={perm} style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 10px', borderRadius: '999px',
                        fontSize: '11px', fontWeight: 700,
                        background: getPerm(role, perm) === 'Yes' ? '#dcfce7' : '#f1f5f9',
                        color: getPerm(role, perm) === 'Yes' ? '#15803d' : '#94a3b8'
                      }}>
                        {getPerm(role, perm) === 'Yes' ? '✓' : '—'} {getPerm(role, perm)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="student-table-section">
        <div className="student-table-header">
          <div className="student-table-header-left">
            <p className="student-section-label">{tr('User Accounts')}</p>
            <h2>{tr('Tài khoản theo vai trò')} ({filteredAccounts.length})</h2>
          </div>
        </div>
        {loading ? (
          <div className="student-empty">{tr('Đang tải dữ liệu...')}</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="student-empty">{tr('Không tìm thấy tài khoản phù hợp.')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="student-table-grid" style={{ gridTemplateColumns: '40px 1.5fr 1fr 1.5fr 100px 110px' }}>
              <div className="student-table-cell student-table-cell--header">{tr('STT')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Username')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Vai trò')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Phòng ban')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Trạng thái')}</div>
              <div className="student-table-cell student-table-cell--header student-table-cell--end">{tr('Account ID')}</div>
              {pageItems.map((acct, idx) => (
                <div className="student-table-row" key={acct.accountId || acct.AccountId || idx}>
                  <div className="student-table-cell student-table-cell--index">{idx + 1}</div>
                  <div className="student-table-cell student-table-cell--strong">{acct.username || acct.Username || '--'}</div>
                  <div className="student-table-cell">
                    <span className="student-badge student-badge--progress" style={{ fontSize: 10 }}>{getRoleName(acct)}</span>
                  </div>
                  <div className="student-table-cell">{getDeptName(acct.departmentId || acct.DepartmentId)}</div>
                  <div className="student-table-cell">
                    <span className={`student-badge ${getStatus(acct) === 'Active' ? 'student-badge--completed' : 'student-badge--returned'}`} style={{ fontSize: 10 }}>
                      {getStatus(acct) === 'Active' ? tr('Hoạt động') : tr('Vô hiệu')}
                    </span>
                  </div>
                  <div className="student-table-cell student-table-cell--end" style={{ color: '#c5a059', fontWeight: 700, fontSize: 12 }}>#{acct.accountId || acct.AccountId}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>
    </div>
  );
};

export default RolePermissionManagement;