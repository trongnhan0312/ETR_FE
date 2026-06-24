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
import QALayout from './QA/QALayout';
import QADashboard from './QA/QADashboard';
import QAEvidenceVerification from './QA/QAEvidenceVerification';
import QARETRReviewQueue from './QA/QARETRReviewQueue';
import QARETRDetails from './QA/QARETRDetails';
import QARETRReturn from './QA/QARETRReturn';
import QASearchExport from './QA/QASearchExport';
import QAAuditTrail from './QA/QAAuditTrail';
import QAAccount from './QA/QAAccount';
import './App.css';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/login" replace />} />
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
				<Route path="/qa" element={<QALayout />}>
					<Route index element={<QADashboard />} />
					<Route path="evidence" element={<QAEvidenceVerification />} />
					<Route path="reviews" element={<QARETRReviewQueue />} />
					<Route path="details" element={<QARETRDetails />} />
					<Route path="return" element={<QARETRReturn />} />
					<Route path="search" element={<QASearchExport />} />
					<Route path="export" element={<QASearchExport />} />
					<Route path="audit" element={<QAAuditTrail />} />
					<Route path="profile" element={<QAAccount />} />
					<Route path="password" element={<QAAccount />} />
					<Route path="recent" element={<QADashboard />} />
					<Route path="rejected" element={<QAEvidenceVerification />} />
					<Route path="history" element={<QAEvidenceVerification />} />
				</Route>
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
