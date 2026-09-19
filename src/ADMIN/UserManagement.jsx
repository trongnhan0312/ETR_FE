import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { api, parseApiError } from '../utils/api';
import { announce } from '../utils/crudNotify';
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';
import { parseExcelPreview } from '../utils/excelPreview';
import ExcelPreviewTable from '../components/ExcelPreviewTable';

const UserManagement = ({ defaultTab = 'users' }) => {
  const { tr, trt, trEn } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  // Top-bar search từ AdminLayout (Outlet context) — lọc danh sách người dùng
  const outletCtx = useOutletContext() ?? {};
  const topbarQuery = typeof outletCtx.searchQuery === 'string' ? outletCtx.searchQuery : '';
  const activeTab = searchParams.get('tab') || defaultTab || 'users';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // ================= USERS STATE =================
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // User Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  // Lỗi inline riêng cho ô Username (Email) — VD: email đã tồn tại (409 Conflict)
  const [usernameError, setUsernameError] = useState('');

  // Create Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Default@123');
  const [showPassword, setShowPassword] = useState(false);
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

  // ================= DEPARTMENTS STATE =================
  const [rawDepartments, setRawDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');

  // Department Modal States
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [isDeleteDeptOpen, setIsDeleteDeptOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  // Department Form fields
  const [deptName, setDeptName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);
  const [deptFormError, setDeptFormError] = useState('');

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

  // Helper getters for department property resilience
  const getDeptId = (d) => d?.departmentId ?? d?.id ?? d?.DepartmentId ?? '';
  const getDeptName = (d) => d?.departmentName ?? d?.name ?? d?.DepartmentName ?? '';
  const getDeptDesc = (d) => d?.description ?? d?.Description ?? d?.code ?? d?.Code ?? '';

  const loadAllData = async () => {
    setLoadingUsers(true);
    setLoadingDepartments(true);
    try {
      const [accounts, profiles, deptList] = await Promise.all([
        api.get("/Accounts").catch(() => []),
        api.get("/UserProfiles").catch(() => []),
        api.get("/Departments").catch(() => []),
      ]);
      const accs = Array.isArray(accounts) ? accounts : [];
      const profs = Array.isArray(profiles) ? profiles : [];
      const depts = Array.isArray(deptList) ? deptList : [];

      setRawDepartments(depts);

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
      console.error("Error loading admin user & department data:", err);
    } finally {
      setLoadingUsers(false);
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Helper to parse backend error responses into user-friendly messages
  const parseLocalApiError = (err, fallbackMsg = tr("Thao tác thất bại.")) => {
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
          DepartmentName: tr('Tên phòng ban'),
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
      // ASP.NET ProblemDetails dùng `detail` cho mô tả cụ thể (VD: BusinessRuleViolation
      // "An account with username ... already exists." khi trùng email tài khoản).
      if (json.detail) return json.detail;
      if (json.title) return json.title;
      if (json.message) return json.message;
    } catch {
      // Not a JSON error string
    }
    // Trùng email/username — BE có thể trả 409 Conflict hoặc 400 BusinessRuleViolation với
    // message "already exists". Đưa về thông báo nghiệp vụ rõ ràng thay vì lỗi mạng chung.
    if (
      /already exists|already taken|duplicate username|duplicate email|trùng|đã tồn tại/i.test(raw) ||
      /conflict|409/i.test(raw)
    ) {
      return tr('Email này đã tồn tại trong hệ thống. Vui lòng chọn email khác.');
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

  // Departments available to Student: all EXCEPT Training (2) and Administration (1)
  const getStudentDepartments = () => {
    const trainingId = getTrainingDeptId();
    const filtered = departments.filter(
      (d) =>
        !d.name?.toLowerCase().includes('training') &&
        !d.name?.toLowerCase().includes('đào tạo') &&
        String(d.id) !== trainingId &&
        String(d.id) !== '1'
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '3', name: 'Flight Crew' },
      { id: '4', name: 'Cabin Crew' },
      { id: '5', name: 'Engineering & Maintenance' },
    ];
  };

  // Departments available to staff roles: Training (2) and Administration (1)
  const getStaffDepartments = () => {
    const trainingId = getTrainingDeptId();
    const filtered = departments.filter(
      (d) => String(d.id) === trainingId || String(d.id) === '1'
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: '1', name: 'Administration' },
      { id: trainingId, name: 'Training' },
    ];
  };

  // Handle role change in Edit Modal with department logic
  const handleEditRoleChange = (newRoleId) => {
    setEditRoleId(newRoleId);
    if (newRoleId === '6') {
      const studentDepts = getStudentDepartments();
      if (!studentDepts.some((d) => String(d.id) === String(editDepartmentId))) {
        setEditDepartmentId(String(studentDepts[0]?.id || '3'));
      }
    } else {
      const staffDepts = getStaffDepartments();
      if (!staffDepts.some((d) => String(d.id) === String(editDepartmentId))) {
        setEditDepartmentId(String(staffDepts[0].id));
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
    const studentDepts = getStudentDepartments();
    setDepartmentId(String(studentDepts[0]?.id || '1'));
    setGender('Male');
    setFormError('');
    setUsernameError('');
    setIsCreateOpen(true);
  };

  // Submit Create Account + Profile
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setUsernameError('');
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedUsername || !password || !trimmedFullName) {
      setFormError(tr('Vui lòng nhập Username, Password và Họ tên.'));
      return;
    }

    if (password.length < 6) {
      setFormError(tr('Mật khẩu phải có ít nhất 6 ký tự để đảm bảo bảo mật và đăng nhập được.'));
      return;
    }

    if (!trimmedUsername.includes('@') || !trimmedUsername.includes('.')) {
      setFormError(tr('Tên đăng nhập (Username) phải là một địa chỉ email hợp lệ (Ví dụ: user@domain.com).'));
      return;
    }

    // Kiểm tra trùng email/username ngay trên FE (dữ liệu /Accounts đã tải sẵn) — BE trả 409
    // Conflict nhưng response lỗi có thể bị CORS/redirect làm fetch reject thành
    // "Cannot reach API server", khiến người dùng nhìn thấy lỗi mạng chung. Chặn trước +
    // báo đúng lỗi tại ô Username (Email).
    const lower = trimmedUsername.toLowerCase();
    const duplicated = users.some(
      (u) =>
        String(u.username || '').toLowerCase() === lower ||
        String(u.email || '').toLowerCase() === lower,
    );
    if (duplicated) {
      const msg = tr('Email này đã tồn tại trong hệ thống. Vui lòng chọn email khác.');
      setUsernameError(msg);
      setFormError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const newAcc = await api.post("/Accounts", {
        username: trimmedUsername,
        password: password,
        roleId: Number(roleId),
        departmentId: Number(roleId !== '6' ? getTrainingDeptId() : departmentId),
      });

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

      await loadAllData();
      setIsCreateOpen(false);
      toast.success(tr("Tạo tài khoản thành công!"), announce("add", tr("Tài khoản")));
    } catch (err) {
      console.error("Failed to create user:", err);
      const raw = err?.message || String(err);
      let msg = parseLocalApiError(err, tr("Tạo tài khoản thất bại."));
      if (
        /already exists|already taken|duplicate|trùng|đã tồn tại|conflict|409/i.test(raw) ||
        /Cannot reach API server for \/Accounts/i.test(raw)
      ) {
        msg = tr('Email này đã tồn tại trong hệ thống. Vui lòng chọn email khác.');
      }
      setFormError(msg);
      // Trùng email → gắn lỗi ngay tại ô Username (Email) theo yêu cầu kiểm thử
      if (/đã tồn tại|already exists/i.test(msg)) {
        setUsernameError(msg);
      }
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

    const currentDeptIdStr = String(user.departmentId || '');
    if (activeRoleId === '6') {
      const studentDepts = getStudentDepartments();
      if (studentDepts.some((d) => String(d.id) === currentDeptIdStr)) {
        setEditDepartmentId(currentDeptIdStr);
      } else {
        setEditDepartmentId(String(studentDepts[0]?.id || '3'));
      }
    } else {
      const staffDepts = getStaffDepartments();
      if (staffDepts.some((d) => String(d.id) === currentDeptIdStr)) {
        setEditDepartmentId(currentDeptIdStr);
      } else {
        setEditDepartmentId(String(staffDepts[0].id));
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
      await api.put(`/UserProfiles/${editingUser.accountId}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        dateOfBirth: new Date().toISOString(),
        gender: editGender,
        organization: "ETR Aviation",
      });

      if (editRoleId && Number(editRoleId) !== 1) {
        await api.put(`/Accounts/${editingUser.accountId}/role`, {
          roleId: Number(editRoleId),
        }).catch((err) => console.warn("Failed to update role:", err));
      }

      const finalDeptId = editDepartmentId;
      if (finalDeptId) {
        try {
          await api.put(`/Accounts/${editingUser.accountId}/department`, {
            departmentId: Number(finalDeptId),
          });
        } catch (err) {
          console.warn("Failed to update department:", err);
          toast.error(tr("Cập nhật phòng ban thất bại"));
        }
      }

      await loadAllData();
      setIsEditOpen(false);
      toast.success(tr("Cập nhật tài khoản thành công!"), announce("edit", tr("Tài khoản")));
    } catch (err) {
      console.error("Failed to update user profile:", err);
      setFormError(parseLocalApiError(err, tr("Cập nhật hồ sơ thất bại.")));
    } finally {
      setSubmitting(false);
    }
  };

  // Toast notifications
  const toast = useToast();

  // ── Bulk Import Users từ Excel (BE có sẵn: /Import/accounts/template|validate|commit — Admin/Academic) ──
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [importValidating, setImportValidating] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [importDownloading, setImportDownloading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  const handleOpenImportModal = () => {
    setImportFile(null);
    setExcelPreview(null);
    setImportResult(null);
    setImportError('');
    setIsImportOpen(true);
  };

  const handleFileSelected = async (f) => {
    setImportFile(f);
    setImportResult(null);
    setImportError('');
    if (f) {
      try {
        const preview = await parseExcelPreview(f);
        setExcelPreview(preview);
      } catch {
        setExcelPreview(null);
      }
    } else {
      setExcelPreview(null);
    }
  };

  const handleDownloadImportTemplate = async () => {
    setImportError('');
    setImportDownloading(true);
    try {
      const blob = await api.downloadFile('/Import/accounts/template', {
        suppressAuthRedirect: true,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_create_accounts.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(tr('Tải template thành công!'));
    } catch (err) {
      console.error('Lỗi tải template import users:', err);
      setImportError(parseApiError(err, tr('Tải template thất bại.')));
    } finally {
      setImportDownloading(false);
    }
  };

  const handleValidateImport = async () => {
    setImportError('');
    if (!importFile) {
      setImportError(tr('Vui lòng chọn file Excel trước khi kiểm tra.'));
      return;
    }
    setImportValidating(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const result = await api.postFormData('/Import/accounts/validate', fd);
      setImportResult(result);
      if (result?.canCommit) {
        toast.success(tr('File hợp lệ, có thể nhập'));
      } else {
        toast.warning(tr('File có lỗi, cần sửa trước khi nhập'));
      }
    } catch (err) {
      console.error('Lỗi validate import users:', err);
      setImportResult(null);
      setImportError(parseApiError(err, tr('Kiểm tra file thất bại.')));
    } finally {
      setImportValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importFile || !importResult?.canCommit) return;
    setImportCommitting(true);
    setImportError('');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const result = await api.postFormData('/Import/accounts/commit', fd);
      const imported = result?.imported ?? 0;
      const skipped = result?.skipped ?? 0;
      toast.success(
        `${tr('Đã nhập thành công')} ${imported} ${tr('tài khoản')}${skipped > 0 ? ` — ${tr('bỏ qua')}: ${skipped}` : ''}`,
      );
      setIsImportOpen(false);
      await loadAllData();
    } catch (err) {
      console.error('Lỗi commit import users:', err);
      setImportError(parseApiError(err, tr('Nhập danh sách tài khoản thất bại.')));
    } finally {
      setImportCommitting(false);
    }
  };

  // Current logged in user ID
  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.accountId ?? u?.userId ?? null;
    } catch {
      return null;
    }
  })();

  // BE chặn xóa/vô hiệu hóa tài khoản Quản trị viên hệ thống gốc (AccountId = 1)
  // — xem AccountService.DeleteAccountAsync/UpdateAccountStatusAsync (commit 6d20503).
  const ROOT_ADMIN_ID = '1';
  const isRootAdmin = (user) => String(user?.accountId) === ROOT_ADMIN_ID;

  // Xác nhận trước các thao tác tài khoản (thay window.confirm)
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'toggle' | 'delete' | 'activate', user }

  const runAccountAction = async (type, user) => {
    if (type !== 'activate' && isRootAdmin(user)) {
      toast.error(
        tr('Không thể vô hiệu hóa hoặc xóa tài khoản Quản trị viên hệ thống gốc (ID: 1).'),
      );
      setConfirmAction(null);
      return;
    }

    if (String(user.accountId) === String(currentUserId)) {
      if (type === 'delete') {
        toast.error(tr("Bạn không thể tự xóa tài khoản của chính mình (cả xóa mềm lẫn xóa cứng)!"));
        setConfirmAction(null);
        return;
      }
      if (type === 'toggle') {
        toast.error(tr("Bạn không thể tự vô hiệu hóa tài khoản của chính mình!"));
        setConfirmAction(null);
        return;
      }
    }

    try {
      if (type === 'toggle') {
        const isInactive = user.status?.toLowerCase() === 'inactive' || user.status?.toLowerCase() === 'disabled';
        const nextStatus = isInactive ? 'Active' : 'Inactive';
        await api.put(`/Accounts/${user.accountId}/status`, { status: nextStatus });
        toast.success(tr("Cập nhật trạng thái"), announce("edit", tr("Tài khoản")));
      } else if (type === 'delete') {
        await api.delete(`/Accounts/${user.accountId}`);
        await api.put(`/Accounts/${user.accountId}/status`, { status: 'Inactive' }).catch(() => {});
        toast.success(tr("Soft Delete"), announce("delete", tr("Tài khoản")));
      } else {
        await api.put(`/Accounts/${user.accountId}/status`, { status: 'Active' });
        toast.success(tr("Kích hoạt thành công"), announce("edit", tr("Tài khoản")));
      }
      await loadAllData();
    } catch (err) {
      console.error(`Failed to ${type} account:`, err);
      const errMsg = parseApiError(err, type === 'delete' ? tr("Soft Delete thất bại") : tr("Thao tác thất bại"));
      toast.error(errMsg);
    } finally {
      setConfirmAction(null);
    }
  };

  // ================= DEPARTMENT CRUD HANDLERS =================
  const resetDeptForm = () => {
    setDeptName('');
    setDeptDescription('');
    setDeptFormError('');
    setSelectedDept(null);
  };

  const handleOpenCreateDeptModal = () => {
    resetDeptForm();
    setIsCreateDeptOpen(true);
  };

  const handleCreateDeptSubmit = async (e) => {
    e.preventDefault();
    setDeptFormError('');
    if (!deptName.trim()) {
      setDeptFormError(tr('Vui lòng nhập tên phòng ban'));
      return;
    }

    setDeptSubmitting(true);
    try {
      const payload = {
        departmentName: deptName.trim(),
        description: deptDescription.trim(),
      };
      await api.post('/Departments', payload);
      setIsCreateDeptOpen(false);
      resetDeptForm();
      await loadAllData();
      toast.success(tr('Tạo phòng ban thành công!'), announce('add', tr('Phòng ban')));
    } catch (err) {
      setDeptFormError(parseApiError(err, tr('Lỗi khi tạo phòng ban mới')));
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleOpenEditDeptModal = (dept) => {
    setSelectedDept(dept);
    setDeptName(getDeptName(dept));
    setDeptDescription(getDeptDesc(dept));
    setDeptFormError('');
    setIsEditDeptOpen(true);
  };

  const handleEditDeptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setDeptFormError('');
    if (!deptName.trim()) {
      setDeptFormError(tr('Vui lòng nhập tên phòng ban'));
      return;
    }

    const id = getDeptId(selectedDept);
    setDeptSubmitting(true);
    try {
      const payload = {
        departmentId: Number(id) || id,
        departmentName: deptName.trim(),
        description: deptDescription.trim(),
      };
      await api.put(`/Departments/${id}`, payload);
      setIsEditDeptOpen(false);
      resetDeptForm();
      await loadAllData();
      toast.success(tr('Cập nhật phòng ban thành công!'), announce('edit', tr('Phòng ban')));
    } catch (err) {
      setDeptFormError(parseApiError(err, tr('Lỗi khi cập nhật phòng ban')));
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleOpenDeleteDeptModal = (dept) => {
    setSelectedDept(dept);
    setDeptFormError('');
    setIsDeleteDeptOpen(true);
  };

  const handleDeleteDeptSubmit = async () => {
    if (!selectedDept) return;
    const id = getDeptId(selectedDept);
    setDeptSubmitting(true);
    try {
      await api.delete(`/Departments/${id}`);
      setIsDeleteDeptOpen(false);
      resetDeptForm();
      await loadAllData();
      toast.success(tr('Xoá phòng ban thành công!'), announce('delete', tr('Phòng ban')));
    } catch (err) {
      setDeptFormError(parseApiError(err, tr('Lỗi khi xoá phòng ban')));
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Filtered users — kết hợp search trên trang (searchTerm) và top-bar (topbarQuery):
  // dùng term nào đang có giá trị, ưu tiên search trong trang nếu người dùng đang gõ.
  const filteredUsers = users.filter((u) => {
    const effectiveTerm = searchTerm || topbarQuery;
    const q = effectiveTerm.toLowerCase();
    const matchesSearch =
      !effectiveTerm ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q);

    const matchesRole = roleFilter === 'ALL' || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const userPagination = usePagination(filteredUsers, {
    pageSize: 10,
    resetKey: `${searchTerm}|${topbarQuery}|${roleFilter}`,
  });

  // Filtered departments
  const filteredDepartments = rawDepartments.filter((d) => {
    const term = deptSearchTerm.toLowerCase();
    const idStr = String(getDeptId(d)).toLowerCase();
    const nameStr = getDeptName(d).toLowerCase();
    const descStr = getDeptDesc(d).toLowerCase();
    return idStr.includes(term) || nameStr.includes(term) || descStr.includes(term);
  });

  const deptPagination = usePagination(filteredDepartments, {
    pageSize: 10,
    resetKey: deptSearchTerm,
  });

  return (
    <div className="page-shell">
      {/* Top Tab Bar Switcher */}
      <div className="admin-tab-nav">
        <button
          type="button"
          className={`admin-tab-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {tr('Tài khoản hệ thống (System Accounts)')}
          <span className="admin-tab-badge">{users.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-nav-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"></path>
            <path d="M5 21V7l8-4v18"></path>
            <path d="M19 21V11l-6-3"></path>
            <path d="M9 9v.01"></path>
            <path d="M9 12v.01"></path>
            <path d="M9 15v.01"></path>
            <path d="M9 18v.01"></path>
          </svg>
          {tr('Quản lý phòng ban (Departments)')}
          <span className="admin-tab-badge">{rawDepartments.length}</span>
        </button>
      </div>

      {/* ================= TAB 1: USERS ================= */}
      {activeTab === 'users' && (
        <>
          <section className="page-header-card">
            <div>
              <p className="eyebrow">{tr('Administrator Management')}</p>
              <h1>{tr('User Management')}</h1>
              <p className="page-description">
                {tr('Quản lý tài khoản hệ thống: Tạo mới, cập nhật hồ sơ, đổi vai trò (Role), phòng ban (Department), vô hiệu hóa (Soft Delete) và kích hoạt lại tài khoản.')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                className="action-btn"
                type="button"
                onClick={handleOpenImportModal}
                style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                {tr('Import Users (Excel)')}
              </button>
              <button className="primary-btn" type="button" onClick={handleOpenCreateModal}>
                {tr('+ Create User')}
              </button>
            </div>
          </section>

          {/* Đã bỏ thẻ "Functions" (danh sách tag-chip tĩnh) — các thao tác Create/Edit/
              Department/Soft Delete/Activate đã có nút thật ở header và ở cột Actions từng
              dòng, nên thẻ đó chỉ gây trùng lặp và nhiễu giao diện. Chỉ giữ bộ lọc Role. */}
          <section className="split-panel" style={{ gridTemplateColumns: '1fr' }}>
            <div className="info-card">
              <p className="section-label">{tr('Filter by Role')}</p>
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
                <p className="section-label">{tr('System Accounts')}</p>
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
                <div>{tr('Username')}</div>
                <div>{tr('Full Name')}</div>
                <div>{tr('Email')}</div>
                <div>{tr('Role')}</div>
                <div>{tr('Department')}</div>
                <div>{tr('Gender')}</div>
                <div>{tr('Status')}</div>
                <div style={{ textAlign: 'right' }}>{tr('Actions')}</div>
              </div>

              {loadingUsers ? (
                <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
                  {tr('Đang tải danh sách tài khoản...')}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
                  {tr('Không tìm thấy tài khoản nào.')}
                </div>
              ) : (
                userPagination.pageItems.map((user) => {
                  const isInactive = user.status?.toLowerCase() === 'inactive' || user.status?.toLowerCase() === 'disabled';
                  const isSelf = String(user.accountId) === String(currentUserId);
                  const isProtectedAdmin = isRootAdmin(user);
                  // Khóa thao tác với chính mình VÀ với tài khoản Admin gốc (BE chặn ở tầng service).
                  const isLocked = isSelf || isProtectedAdmin;
                  const lockedTitle = isSelf
                    ? tr('Không thể tự vô hiệu hóa/xóa tài khoản của chính mình')
                    : tr('Không thể vô hiệu hóa hoặc xóa tài khoản Quản trị viên hệ thống gốc (ID: 1).');
                  return (
                    <div key={user.accountId} className="table-row table-layout user-layout" style={{ gridTemplateColumns: '1.1fr 1.2fr 1.2fr 0.9fr 1.1fr 0.8fr 0.8fr 1.2fr', alignItems: 'center' }}>
                      <div className="font-medium" style={{ color: '#0f172a', fontWeight: '600' }}>
                        {user.username}
                        {isSelf && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {tr('(Bạn)')}
                          </span>
                        )}
                        {isProtectedAdmin && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {tr('(Quản trị gốc)')}
                          </span>
                        )}
                      </div>
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
                          onClick={() => !isLocked && setConfirmAction({ type: 'toggle', user })}
                          disabled={isLocked}
                          className={!isInactive ? 'status status-active' : 'status status-pending'}
                          style={{ cursor: isLocked ? 'not-allowed' : 'pointer', border: 'none', opacity: isLocked ? 0.85 : 1 }}
                          title={isLocked ? lockedTitle : tr('Click để toggle Active/Inactive')}
                        >
                          {isInactive ? tr('Inactive') : tr('Active')}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="action-btn"
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          {tr('Edit')}
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
                            {tr('Activate Account')}
                          </button>
                        ) : (
                          <button
                            className="action-btn"
                            type="button"
                            onClick={() => !isLocked && setConfirmAction({ type: 'delete', user })}
                            disabled={isLocked}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              color: isLocked ? '#94a3b8' : '#ef4444',
                              borderColor: isLocked ? '#e2e8f0' : '#fca5a5',
                              background: isLocked ? '#f8fafc' : '#fff5f5',
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              opacity: isLocked ? 0.6 : 1
                            }}
                            title={isLocked ? lockedTitle : tr('Xóa tài khoản')}
                          >
                            {tr('Delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Pagination
              page={userPagination.page}
              pageCount={userPagination.pageCount}
              onChange={userPagination.setPage}
              total={userPagination.total}
              pageSize={10}
            />
          </section>
        </>
      )}

      {/* ================= TAB 2: DEPARTMENTS ================= */}
      {activeTab === 'departments' && (
        <>
          <div className="page-header-card">
            <div>
              <div className="eyebrow">{tr('QUẢN LÝ TỔ CHỨC / ADMIN')}</div>
              <h1>{tr('Quản lý phòng ban (Departments)')}</h1>
              <p className="page-description">
                {tr('Quản lý danh sách phòng ban trong hệ thống ETR Management: Thêm, sửa, xoá phòng ban.')}
              </p>
            </div>
            <div className="page-status-box">
              <span className="eyebrow" style={{ margin: 0 }}>{tr('TỔNG SỐ PHÒNG BAN')}</span>
              <strong style={{ fontSize: '24px', margin: '4px 0 0', color: '#002147' }}>
                {loadingDepartments ? '...' : rawDepartments.length}
              </strong>
              <p style={{ fontSize: '12px', marginTop: '2px' }}>{tr('Đang hoạt động trong hệ thống')}</p>
            </div>
          </div>

          <section className="table-section">
            <div className="section-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="section-label">{tr('DANH SÁCH PHÒNG BAN')}</div>
                <h2>{tr('Tất cả phòng ban')} ({filteredDepartments.length})</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={tr('Tìm theo tên hoặc ID phòng ban...')}
                  value={deptSearchTerm}
                  onChange={(e) => setDeptSearchTerm(e.target.value)}
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
                  onClick={handleOpenCreateDeptModal}
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

            <div className="data-table">
              <div
                className="table-header table-layout dept-layout"
                style={{ alignItems: 'center' }}
              >
                <div>{tr('ID')}</div>
                <div>{tr('Tên phòng ban (Department Name)')}</div>
                <div>{tr('Mô tả / Mã phòng ban')}</div>
                <div style={{ textAlign: 'right' }}>{tr('Hành động')}</div>
              </div>

              {loadingDepartments ? (
                <div className="table-row" style={{ justifyContent: 'center', padding: '28px', color: '#64748b' }}>
                  {tr('Đang tải danh sách phòng ban...')}
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="table-row" style={{ justifyContent: 'center', padding: '28px', color: '#64748b', fontStyle: 'italic' }}>
                  {deptSearchTerm ? tr('Không tìm thấy phòng ban phù hợp.') : tr('Chưa có phòng ban nào trong hệ thống.')}
                </div>
              ) : (
                deptPagination.pageItems.map((dept) => {
                  const id = getDeptId(dept);
                  const name = getDeptName(dept);
                  const desc = getDeptDesc(dept);

                  return (
                    <div
                      key={id || Math.random()}
                      className="table-row table-layout dept-layout"
                      style={{ alignItems: 'center' }}
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
                          onClick={() => handleOpenEditDeptModal(dept)}
                          style={{ padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          {tr('Sửa')}
                        </button>
                        <button
                          className="action-btn"
                          type="button"
                          onClick={() => handleOpenDeleteDeptModal(dept)}
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
              page={deptPagination.page}
              pageCount={deptPagination.pageCount}
              onChange={deptPagination.setPage}
              total={deptPagination.total}
              pageSize={10}
            />
          </section>
        </>
      )}

      {/* ================= USER MODALS ================= */}
      {/* BULK IMPORT USERS MODAL (Excel) — dùng endpoint /Import/accounts/* của BE */}
      {isImportOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', margin: 'auto' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>{tr('Import Users (Excel)')}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              {tr('Tải template chuẩn, điền danh sách tài khoản rồi kiểm tra và nhập hàng loạt.')}
            </p>

            {importError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {importError}
              </div>
            )}

            {/* Bước 1: template */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{tr('Bước 1 — Tải file mẫu')}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {tr('Cột bắt buộc: Username*, Mật khẩu*, Vai trò*, Phòng ban*, Họ và tên* | Cột tùy chọn: Ngày sinh, Giới tính, SĐT, Tổ chức (Mã định danh được hệ thống tự động tạo)')}
                </p>
              </div>
              <button className="action-btn" type="button" onClick={handleDownloadImportTemplate} disabled={importDownloading} style={{ padding: '8px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {importDownloading ? trEn('Downloading...') : tr('Tải template')}
              </button>
            </div>

            {/* Bước 2: chọn file + validate */}
            <div style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{tr('Bước 2 — Chọn file Excel & kiểm tra')}</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#f8fafc' }}
              />
              <button
                className="action-btn"
                type="button"
                onClick={handleValidateImport}
                disabled={!importFile || importValidating}
                style={{ marginTop: '10px', padding: '8px 14px', fontSize: '12px', cursor: !importFile ? 'not-allowed' : 'pointer' }}
              >
                {importValidating ? tr('Đang kiểm tra...') : tr('Kiểm tra file (Validate)')}
              </button>
            </div>

            {/* Xem trước dữ liệu trong file Excel */}
            {excelPreview && (
              <div style={{ marginBottom: '12px' }}>
                <ExcelPreviewTable
                  headers={excelPreview.headers}
                  rows={excelPreview.rows}
                  tr={tr}
                />
              </div>
            )}

            {/* Kết quả validate */}
            {importResult && (
              <div style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', marginBottom: '8px' }}>
                  <span>{tr('Tổng số dòng')}: <strong>{importResult.totalRows ?? 0}</strong></span>
                  <span style={{ color: '#15803d' }}>{tr('Hợp lệ')}: <strong>{importResult.validRows ?? 0}</strong></span>
                  <span style={{ color: '#b91c1c' }}>{tr('Lỗi')}: <strong>{importResult.errorRows ?? 0}</strong></span>
                </div>
                {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #fee2e2', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#fef2f2' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#b91c1c' }}>{tr('Dòng')}</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#b91c1c' }}>{tr('Cột')}</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#b91c1c' }}>{tr('Lỗi')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((er, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #fee2e2' }}>
                            <td style={{ padding: '6px 8px' }}>{er.row}</td>
                            <td style={{ padding: '6px 8px' }}>{er.column}</td>
                            <td style={{ padding: '6px 8px' }}>{er.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: '600', color: importResult.canCommit ? '#15803d' : '#b45309' }}>
                  {importResult.canCommit ? tr('File hợp lệ — có thể nhập vào hệ thống.') : tr('File còn lỗi — vui lòng sửa rồi kiểm tra lại.')}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
              >
                {tr('Hủy')}
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={!importResult?.canCommit || importCommitting}
                style={{ padding: '8px 18px', background: importResult?.canCommit ? '#002147' : '#94a3b8', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: importResult?.canCommit ? 'pointer' : 'not-allowed' }}
              >
                {importCommitting ? tr('Đang nhập...') : tr('Nhập vào hệ thống')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) setUsernameError('');
                  }}
                  placeholder={tr('Ví dụ: user@domain.com')}
                  aria-invalid={usernameError ? 'true' : 'false'}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${usernameError ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '6px', fontSize: '14px', outline: 'none', background: usernameError ? '#fff5f5' : '#fff' }}
                />
                {usernameError && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                    {usernameError}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Mật khẩu *')}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px 38px 8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? tr('Ẩn mật khẩu') : tr('Hiện mật khẩu')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
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
                        const studentDepts = getStudentDepartments();
                        setDepartmentId(String(studentDepts[0]?.id || '1'));
                      }
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="1">{tr('Admin')}</option>
                    <option value="2">{tr('Instructor')}</option>
                    <option value="3">{tr('QA')}</option>
                    <option value="4">{tr('Academic')}</option>
                    <option value="5">{tr('Training Manager')}</option>
                    <option value="6">{tr('Student')}</option>
                    <option value="7">{tr('Audit')}</option>
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
                      {getStudentDepartments().map((d) => (
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Họ và tên *')}</label>
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
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    {editRoleId === '6'
                      ? getStudentDepartments().map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))
                      : getStaffDepartments().map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {editRoleId !== '6' ? (
                <p style={{ margin: '-4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {tr('* Các vai trò Instructor, QA, Academic, Training Manager, Audit có thể chọn phòng Training hoặc Administration.')}
                </p>
              ) : (
                <p style={{ margin: '-4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {tr('* Học viên (Student) chỉ được phân bổ vào các phòng ban khác Training và Administration.')}
                </p>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Email')}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Số điện thoại')}</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{tr('Giới tính')}</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="Male">{tr('Nam (Male)')}</option>
                  <option value="Female">{tr('Nữ (Female)')}</option>
                  <option value="Other">{tr('Khác (Other)')}</option>
                </select>
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

      {/* ================= DEPARTMENT MODALS ================= */}
      {/* CREATE DEPARTMENT MODAL */}
      {isCreateDeptOpen && createPortal(
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
                onClick={() => setIsCreateDeptOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {deptFormError && (
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
                {deptFormError}
              </div>
            )}

            <form onSubmit={handleCreateDeptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  onClick={() => setIsCreateDeptOpen(false)}
                  disabled={deptSubmitting}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={deptSubmitting}
                >
                  {deptSubmitting ? tr('Đang tạo...') : tr('Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {isEditDeptOpen && createPortal(
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
                onClick={() => setIsEditDeptOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {deptFormError && (
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
                {deptFormError}
              </div>
            )}

            <form onSubmit={handleEditDeptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  onClick={() => setIsEditDeptOpen(false)}
                  disabled={deptSubmitting}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={deptSubmitting}
                >
                  {deptSubmitting ? tr('Đang lưu...') : tr('Cập nhật')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE DEPARTMENT CONFIRMATION MODAL */}
      {isDeleteDeptOpen && selectedDept && createPortal(
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
              {tr('Bạn có chắc chắn muốn xoá phòng ban')} <strong>"{getDeptName(selectedDept)}"</strong> (ID: #{getDeptId(selectedDept)}) {tr('không? Hành động này không thể hoàn tác.')}
            </p>

            {deptFormError && (
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
                {deptFormError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsDeleteDeptOpen(false)}
                disabled={deptSubmitting}
              >
                {tr('Hủy')}
              </button>
              <button
                type="button"
                onClick={handleDeleteDeptSubmit}
                disabled={deptSubmitting}
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
                {deptSubmitting ? tr('Đang xoá...') : tr('Xoá phòng ban')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* USER ACTION CONFIRMATION MODAL */}
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
