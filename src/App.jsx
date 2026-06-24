import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './Homepage/login';
import AdminLayout from './ADMIN/AdminLayout';
import Dashboard from './ADMIN/Dashboard';
import UserManagement from './ADMIN/UserManagement';
import RolePermissionManagement from './ADMIN/RolePermissionManagement';
import AuditLog from './ADMIN/AuditLog';
import SystemConfiguration from './ADMIN/SystemConfiguration';
import AcademicLayout from './ACADEMIC/AcademicLayout';
import LearnerManagement from './ACADEMIC/LearnerManagement';
import CourseClassManagement from './ACADEMIC/CourseClassManagement';
import EtrManagement from './ACADEMIC/EtrManagement';
import IntroductorLayout from './Introductor/IntroductorLayout';
import IntroductorClasses from './Introductor/IntroductorClasses';
import IntroductorSchedule from './Introductor/IntroductorSchedule';
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
				<Route path="/academic" element={<AcademicLayout />}>
					<Route index element={<Navigate to="/academic/learners" replace />} />
					<Route path="learners" element={<LearnerManagement />} />
					<Route path="courses" element={<CourseClassManagement />} />
					<Route path="etr" element={<EtrManagement />} />
				</Route>
				<Route path="/introductor" element={<IntroductorLayout />}>
					<Route index element={<Navigate to="/introductor/classes" replace />} />
					<Route path="classes" element={<IntroductorClasses />} />
					<Route path="schedule" element={<IntroductorSchedule />} />
				</Route>
				<Route path="*" element={<Navigate to="/admin" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
