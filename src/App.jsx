import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './Homepage/login';
import AdminLayout from './ADMIN/AdminLayout';
import Dashboard from './ADMIN/Dashboard';
import UserManagement from './ADMIN/UserManagement';
import RolePermissionManagement from './ADMIN/RolePermissionManagement';
import AuditLog from './ADMIN/AuditLog';
import SystemConfiguration from './ADMIN/SystemConfiguration';
import './App.css';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/admin" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/admin" element={<AdminLayout />}>
					<Route index element={<Dashboard />} />
					<Route path="users" element={<UserManagement />} />
					<Route path="roles" element={<RolePermissionManagement />} />
					<Route path="audit" element={<AuditLog />} />
					<Route path="config" element={<SystemConfiguration />} />
				</Route>
				<Route path="*" element={<Navigate to="/admin" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
