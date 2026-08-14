import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, parseApiError } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  // Form fields
  const [deptName, setDeptName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { tr } = useLanguage();

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/Departments');
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Helper getters for property resilience
  const getDeptId = (d) => d?.departmentId ?? d?.id ?? d?.DepartmentId ?? '';
  const getDeptName = (d) => d?.departmentName ?? d?.name ?? d?.DepartmentName ?? '';
  const getDeptDesc = (d) => d?.description ?? d?.Description ?? d?.code ?? d?.Code ?? '';

  // Filtered departments based on search term
  const filteredDepartments = departments.filter((d) => {
    const term = searchTerm.toLowerCase();
    const idStr = String(getDeptId(d)).toLowerCase();
    const nameStr = getDeptName(d).toLowerCase();
    const descStr = getDeptDesc(d).toLowerCase();
    return idStr.includes(term) || nameStr.includes(term) || descStr.includes(term);
  });

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredDepartments, {
    pageSize: 10,
    resetKey: searchTerm,
  });

  // Reset form inputs
  const resetForm = () => {
    setDeptName('');
    setDeptDescription('');
    setFormError('');
    setSelectedDept(null);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!deptName.trim()) {
      setFormError(tr('Vui lòng nhập tên phòng ban'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        departmentName: deptName.trim(),
        description: deptDescription.trim(),
      };
      await api.post('/Departments', payload);
      setIsCreateOpen(false);
      resetForm();
      await loadDepartments();
    } catch (err) {
      setFormError(parseApiError(err, 'Lỗi khi tạo phòng ban mới'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (dept) => {
    setSelectedDept(dept);
    setDeptName(getDeptName(dept));
    setDeptDescription(getDeptDesc(dept));
    setFormError('');
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setFormError('');
    if (!deptName.trim()) {
      setFormError(tr('Vui lòng nhập tên phòng ban'));
      return;
    }

    const id = getDeptId(selectedDept);
    setSubmitting(true);
    try {
      const payload = {
        departmentId: Number(id) || id,
        departmentName: deptName.trim(),
        description: deptDescription.trim(),
      };
      await api.put(`/Departments/${id}`, payload);
      setIsEditOpen(false);
      resetForm();
      await loadDepartments();
    } catch (err) {
      setFormError(parseApiError(err, 'Lỗi khi cập nhật phòng ban'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (dept) => {
    setSelectedDept(dept);
    setFormError('');
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleDeleteSubmit = async () => {
    if (!selectedDept) return;
    const id = getDeptId(selectedDept);
    setSubmitting(true);
    try {
      await api.delete(`/Departments/${id}`);
      setIsDeleteOpen(false);
      resetForm();
      await loadDepartments();
    } catch (err) {
      setFormError(parseApiError(err, 'Lỗi khi xoá phòng ban'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      {/* Header Card */}
      <div className="page-header-card">
        <div>
          <div className="eyebrow">{tr('QUẢN LÝ TỔ CHỨC / ADMIN')}</div>
          <h1>{tr('Quản lý phòng ban (Departments)')}</h1>
          <p className="page-description">
            {tr('Quản lý danh sách phòng ban trong hệ thống ETR Management.')}
          </p>
        </div>
        <div className="page-status-box">
          <span className="eyebrow" style={{ margin: 0 }}>{tr('TỔNG SỐ PHÒNG BAN')}</span>
          <strong style={{ fontSize: '24px', margin: '4px 0 0', color: '#002147' }}>
            {loading ? '...' : departments.length}
          </strong>
          <p style={{ fontSize: '12px', marginTop: '2px' }}>{tr('Đang hoạt động trong hệ thống')}</p>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="table-section">
        <div className="section-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="section-label">{tr('DANH SÁCH PHÒNG BAN')}</div>
            <h2>{tr('Tất cả phòng ban')}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              placeholder={tr('Tìm theo tên hoặc ID phòng ban...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                width: '260px',
                outline: 'none',
              }}
            />
            <button
              className="primary-btn"
              type="button"
              onClick={handleOpenCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {tr('Thêm phòng ban mới')}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="data-table">
          <div
            className="table-header table-layout"
            style={{ gridTemplateColumns: '0.8fr 2fr 3fr 1.2fr', alignItems: 'center' }}
          >
            <div>{tr('ID')}</div>
            <div>{tr('Tên phòng ban (Department Name)')}</div>
            <div>{tr('Mô tả / Mã phòng ban')}</div>
            <div style={{ textAlign: 'right' }}>{tr('Hành động')}</div>
          </div>

          {loading ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '28px', color: '#64748b' }}>
              {tr('Đang tải danh sách phòng ban...')}
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '28px', color: '#64748b', fontStyle: 'italic' }}>
              {searchTerm ? tr('Không tìm thấy phòng ban phù hợp.') : tr('Chưa có phòng ban nào trong hệ thống.')}
            </div>
          ) : (
            pageItems.map((dept) => {
              const id = getDeptId(dept);
              const name = getDeptName(dept);
              const desc = getDeptDesc(dept);

              return (
                <div
                  key={id || Math.random()}
                  className="table-row table-layout"
                  style={{ gridTemplateColumns: '0.8fr 2fr 3fr 1.2fr', alignItems: 'center' }}
                >
                  <div className="font-medium" style={{ color: '#64748b', fontSize: '13px' }}>
                    #{id}
                  </div>
                  <div className="font-medium" style={{ color: '#002147', fontWeight: '600' }}>
                    {name}
                  </div>
                  <div className="text-gray" style={{ fontSize: '13px' }}>
                    {desc || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{tr('Không có mô tả')}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="action-btn"
                      type="button"
                      onClick={() => handleOpenEditModal(dept)}
                      style={{ padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {tr('Sửa')}
                    </button>
                    <button
                      className="action-btn"
                      type="button"
                      onClick={() => handleOpenDeleteModal(dept)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        color: '#ef4444',
                        borderColor: '#fca5a5',
                        background: '#fff5f5',
                        cursor: 'pointer',
                      }}
                    >
                      {tr('Xoá')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>

      {/* CREATE MODAL */}
      {isCreateOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              margin: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#002147', fontWeight: '700' }}>
                {tr('Thêm phòng ban mới')}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  {tr('Tên phòng ban (Department Name) *')}
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder={tr('e.g. Flight Operations, Technical Training...')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  {tr('Mô tả / Thông tin thêm')}
                </label>
                <textarea
                  rows={3}
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  placeholder={tr('Nhập mô tả cho phòng ban này...')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                >
                  {submitting ? tr('Đang tạo...') : tr('Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MODAL */}
      {isEditOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              margin: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#002147', fontWeight: '700' }}>
                {tr('Cập nhật phòng ban')} #{selectedDept ? getDeptId(selectedDept) : ''}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  {tr('Tên phòng ban (Department Name) *')}
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  {tr('Mô tả / Thông tin thêm')}
                </label>
                <textarea
                  rows={3}
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                >
                  {submitting ? tr('Đang lưu...') : tr('Cập nhật')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && selectedDept && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              margin: 'auto',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: '18px', color: '#ef4444', fontWeight: '700' }}>
              {tr('Xác nhận xoá phòng ban')}
            </h2>
            <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 16px', lineHeight: '1.5' }}>
              {tr('Bạn có chắc chắn muốn xoá phòng ban')} <strong>"{getDeptName(selectedDept)}"</strong> (ID: #{getDeptId(selectedDept)}){tr('không? Hành động này không thể hoàn tác.')}
            </p>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
              >
                {tr('Hủy')}
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '10px 18px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {submitting ? tr('Đang xoá...') : tr('Xoá phòng ban')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DepartmentManagement;
