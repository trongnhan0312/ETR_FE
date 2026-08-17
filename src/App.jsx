import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import Homepage from './Homepage/homepage';
import Login from './Homepage/login';
import PublicLayout from './Homepage/PublicLayout';
import RecordsPage from './Homepage/pages/RecordsPage';
import CompetencyPage from './Homepage/pages/CompetencyPage';
import CompliancePage from './Homepage/pages/CompliancePage';
import AnalyticsPage from './Homepage/pages/AnalyticsPage';
import IntegrationsPage from './Homepage/pages/IntegrationsPage';
import AboutPage from './Homepage/pages/AboutPage';
import CustomersPage from './Homepage/pages/CustomersPage';
import CareersPage from './Homepage/pages/CareersPage';
import NewsroomPage from './Homepage/pages/NewsroomPage';
import NewsDetailPage from './Homepage/pages/NewsDetailPage';
import DocsPage from './Homepage/pages/DocsPage';
import SecurityPage from './Homepage/pages/SecurityPage';
import RegulatoryLibraryPage from './Homepage/pages/RegulatoryLibraryPage';
import ContactPage from './Homepage/pages/ContactPage';
import AdminLayout from './ADMIN/AdminLayout';
import Dashboard from './ADMIN/Dashboard';
import UserManagement from './ADMIN/UserManagement';

import DepartmentManagement from './ADMIN/DepartmentManagement';
import AuditLog from './ADMIN/AuditLog';
import SystemConfiguration from './ADMIN/SystemConfiguration';
import AcademicLayout from './Academic/AcademicLayout';
import AcademicDashboard from './Academic/AcademicDashboard';
import LearnerManagement from './Academic/LearnerManagement';
import StudentProfiles from './Academic/StudentProfiles';
import CourseClassManagement from './Academic/CourseClassManagement';
import EtrManagement from './Academic/EtrManagement';
import ExpiringStudents from './Academic/ExpiringStudents';
import SubjectManagement from './Academic/SubjectManagement';
import AcademicAuditLogs from './Academic/AcademicAuditLogs';
import InstructorLayout from './Instructor/InstructorLayout';
import InstructorDashboard from './Instructor/InstructorDashboard';
import InstructorClasses from './Instructor/InstructorClasses';
import InstructorSchedule from './Instructor/InstructorSchedule';
import InstructorAttendance from './Instructor/InstructorAttendance';
import InstructorAssessments from './Instructor/InstructorAssessments';
import InstructorEvidence from './Instructor/InstructorEvidence';
import InstructorAssessmentStructure from './Instructor/InstructorAssessmentStructure';
import QALayout from './QA/QALayout';
import QADashboard from './QA/QADashboard';
import QAEvidenceVerification from './QA/QAEvidenceVerification';
import QARETRReviewQueue from './QA/QARETRReviewQueue';
import QARETRDetails from './QA/QARETRDetails';
import QAETRList from './QA/QAETRList';
import QARETRReturn from './QA/QARETRReturn';
import QASearchExport from './QA/QASearchExport';
import QAAuditTrail from './QA/QAAuditTrail';
import QAAccount from './QA/QAAccount';
import QARetakeHistory from './QA/QARetakeHistory';
import TrainingManagerLayout from './TrainingManager/TrainingManagerLayout';
import TrainingManagerDashboard from './TrainingManager/TrainingManagerDashboard';
import ClassStatus from './TrainingManager/ClassStatus';
import EtrApproval from './TrainingManager/EtrApproval';
import TrainingManagerAmendments from './TrainingManager/TrainingManagerAmendments';
import StudentLayout from './Student/StudentLayout';
import StudentDashboard from './Student/StudentDashboard';
import StudentMyETR from './Student/StudentMyETR';
import StudentCertificateStatus from './Student/StudentCertificateStatus';
import StudentProfile from './Student/StudentProfile';
import AuditorLayout from './Auditor/AuditorLayout';
import AuditorDashboard from './Auditor/AuditorDashboard';
import AuditorLockedETRs from './Auditor/AuditorLockedETRs';
import AuditorAdvancedSearch from './Auditor/AuditorAdvancedSearch';
import AuditorETRDetails from './Auditor/AuditorETRDetails';
import AuditorApprovalHistory from './Auditor/AuditorApprovalHistory';
import AuditorAuditLogs from './Auditor/AuditorAuditLogs';
import AuditorExportPackages from './Auditor/AuditorExportPackages';
import AuditorProfile from './Auditor/AuditorProfile';
import './App.css';

import { useEffect } from 'react';
import { isTokenExpired, handleUnauthorized } from './utils/api';

// Protected Route Guard based on role stored in localStorage and token expiry
const ProtectedRoute = ({ allowedRoles }) => {
	const token = localStorage.getItem('token');
	const userJson = localStorage.getItem('user');

	if (!token || !userJson || isTokenExpired(token)) {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		return <Navigate to="/login" replace />;
	}

	try {
		const user = JSON.parse(userJson);

		// Lấy role ra (hỗ trợ cả trường hợp bạn lưu là roleName hoặc role)
		const rawRole = user.roleName || user.role || "";
		const userRole = rawRole.toLowerCase();

		const isAllowed = allowedRoles.some(
			(role) => role.toLowerCase() === userRole,
		);

		if (!isAllowed) {
			// Redirect to role-appropriate home page instead of showing forbidden page
			if (userRole === 'admin') return <Navigate to="/admin" replace />;
			if (userRole === 'instructor') return <Navigate to="/instructor" replace />;
			if (userRole === 'qa' || userRole === 'qualityassurance') return <Navigate to="/qa" replace />;
			if (userRole === 'academic' || userRole === 'academicstaff') return <Navigate to="/academic" replace />;
			if (userRole === 'trainingmanager') return <Navigate to="/trainingmanager" replace />;
			if (userRole === 'student' || userRole === 'learner') return <Navigate to="/student" replace />;
			if (userRole === 'auditor' || userRole === 'audit') return <Navigate to="/auditor" replace />;
			return <Navigate to="/login" replace />;
		}

		return <Outlet />;
	} catch (e) {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		return <Navigate to="/login" replace />;
	}
};

function App() {
	useEffect(() => {
		// Tự động kiểm tra hạn Token định kỳ & khi chuyển tab/window focus cho TẤT CẢ các Role
		const checkTokenExpiry = () => {
			const token = localStorage.getItem('token');
			if (token && isTokenExpired(token)) {
				console.warn('Phiên làm việc hết hạn. Tự động chuyển về trang đăng nhập.');
				handleUnauthorized();
			}
		};

		checkTokenExpiry();
		const intervalId = setInterval(checkTokenExpiry, 5000);
		window.addEventListener('focus', checkTokenExpiry);

		return () => {
			clearInterval(intervalId);
			window.removeEventListener('focus', checkTokenExpiry);
		};
	}, []);

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Homepage />} />
				<Route path="/login" element={<Login />} />

				{/* Public Footer Routes */}
				<Route element={<PublicLayout />}>
					<Route path="/records" element={<RecordsPage />} />
					<Route path="/competency" element={<CompetencyPage />} />
					<Route path="/compliance" element={<CompliancePage />} />
					<Route path="/analytics" element={<AnalyticsPage />} />
					<Route path="/integrations" element={<IntegrationsPage />} />

					<Route path="/about" element={<AboutPage />} />
					<Route path="/customers" element={<CustomersPage />} />
					<Route path="/careers" element={<CareersPage />} />
					<Route path="/newsroom" element={<NewsroomPage />} />
					<Route path="/newsroom/:id" element={<NewsDetailPage />} />

					<Route path="/docs" element={<DocsPage />} />
					<Route path="/docs/*" element={<DocsPage />} />
					<Route path="/security" element={<SecurityPage />} />
					<Route path="/regulatory-library" element={<RegulatoryLibraryPage />} />
					<Route path="/contact" element={<ContactPage />} />
				</Route>

				{/* Protected Admin Routes */}
				<Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
					<Route path="/admin" element={<AdminLayout />}>
						<Route index element={<Dashboard />} />
						<Route path="users" element={<UserManagement />} />

						<Route path="departments" element={<DepartmentManagement />} />
						<Route path="audit" element={<AuditLog />} />
						<Route path="config" element={<SystemConfiguration />} />
					</Route>
				</Route>

				{/* Protected Academic Routes */}
				<Route
					element={
						<ProtectedRoute allowedRoles={["Academic", "AcademicStaff"]} />
					}
				>
					<Route path="/academic" element={<AcademicLayout />}>
						<Route index element={<AcademicDashboard />} />
						<Route path="learners" element={<LearnerManagement />} />
						<Route path="profiles" element={<StudentProfiles />} />
						<Route path="courses" element={<CourseClassManagement />} />
						<Route path="etr" element={<EtrManagement />} />
						<Route path="expiring-students" element={<ExpiringStudents />} />
						<Route path="subjects" element={<SubjectManagement />} />
						<Route path="audit" element={<AcademicAuditLogs />} />
					</Route>
				</Route>

				{/* Protected Instructor Routes */}
				<Route element={<ProtectedRoute allowedRoles={['Instructor']} />}>
					<Route path="/instructor" element={<InstructorLayout />}>
						<Route index element={<InstructorDashboard />} />
						<Route path="classes" element={<InstructorClasses />} />
						<Route path="attendance" element={<InstructorAttendance />} />
						<Route path="assessments" element={<InstructorAssessments />} />
						<Route path="structure" element={<InstructorAssessmentStructure />} />
						<Route path="evidence" element={<InstructorEvidence />} />
						<Route path="schedule" element={<InstructorSchedule />} />
					</Route>
				</Route>

				{/* Protected QA Routes */}
				<Route element={<ProtectedRoute allowedRoles={['QA', 'QualityAssurance']} />}>
					<Route path="/qa" element={<QALayout />}>
						<Route index element={<QADashboard />} />
						<Route path="evidence" element={<QAEvidenceVerification />} />
						<Route path="reviews" element={<QARETRReviewQueue />} />
						<Route path="etrs" element={<QAETRList />} />
						<Route path="details" element={<QARETRDetails />} />
						<Route path="return" element={<QARETRReturn />} />
						<Route path="search" element={<QASearchExport />} />
						<Route path="export" element={<QASearchExport />} />
						<Route path="retake-history" element={<QARetakeHistory />} />
						<Route path="audit" element={<QAAuditTrail />} />
						<Route path="profile" element={<QAAccount />} />
						<Route path="password" element={<QAAccount />} />
						<Route path="recent" element={<QADashboard />} />
						<Route path="rejected" element={<QAEvidenceVerification />} />
						<Route path="history" element={<QARetakeHistory />} />
					</Route>
				</Route>

				{/* Protected Training Manager Routes (Admin cũng được vào để duyệt/Reopen ETR) */}
				<Route element={<ProtectedRoute allowedRoles={["TrainingManager", "Admin"]} />}>
					<Route path="/trainingmanager" element={<TrainingManagerLayout />}>
						<Route index element={<TrainingManagerDashboard />} />
						<Route path="classes" element={<ClassStatus />} />
						<Route path="etr-approval" element={<EtrApproval />} />
						<Route path="expiring-students" element={<ExpiringStudents />} />
						<Route path="amendments" element={<TrainingManagerAmendments />} />
					</Route>
				</Route>

				{/* Protected Student Routes */}
				<Route element={<ProtectedRoute allowedRoles={["Student", "Learner"]} />}>
					<Route path="/student" element={<StudentLayout />}>
						<Route index element={<StudentDashboard />} />
						<Route path="etr" element={<StudentMyETR />} />
						<Route path="certificates" element={<StudentCertificateStatus />} />
						<Route path="profile" element={<StudentProfile />} />
					</Route>
				</Route>

				{/* Protected Auditor Routes */}
				<Route element={<ProtectedRoute allowedRoles={["Auditor", "Audit"]} />}>
					<Route path="/auditor" element={<AuditorLayout />}>
						<Route index element={<AuditorDashboard />} />
						<Route path="etrs" element={<AuditorLockedETRs />} />
						<Route path="search" element={<AuditorAdvancedSearch />} />
						<Route path="details" element={<AuditorETRDetails />} />
						<Route path="approval-history" element={<AuditorApprovalHistory />} />
						<Route path="audit-logs" element={<AuditorAuditLogs />} />
						<Route path="export-packages" element={<AuditorExportPackages />} />
						<Route path="profile" element={<AuditorProfile />} />
					</Route>
				</Route>

				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
