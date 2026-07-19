import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import Login from './Homepage/login';
import AdminLayout from './ADMIN/AdminLayout';
import Dashboard from './ADMIN/Dashboard';
import UserManagement from './ADMIN/UserManagement';
import RolePermissionManagement from './ADMIN/RolePermissionManagement';
import AuditLog from './ADMIN/AuditLog';
import SystemConfiguration from './ADMIN/SystemConfiguration';
import AcademicLayout from './Academic/AcademicLayout';
import LearnerManagement from './Academic/LearnerManagement';
import CourseClassManagement from './Academic/CourseClassManagement';
import EtrManagement from './Academic/EtrManagement';
import InstructorLayout from './Instructor/InstructorLayout';
import InstructorDashboard from './Instructor/InstructorDashboard';
import InstructorClasses from './Instructor/InstructorClasses';
import InstructorAttendance from './Instructor/InstructorAttendance';
import InstructorAssessments from './Instructor/InstructorAssessments';
import InstructorEvidence from './Instructor/InstructorEvidence';
import QALayout from './QA/QALayout';
import QADashboard from './QA/QADashboard';
import QAEvidenceVerification from './QA/QAEvidenceVerification';
import QARETRReviewQueue from './QA/QARETRReviewQueue';
import QARETRDetails from './QA/QARETRDetails';
import QARETRReturn from './QA/QARETRReturn';
import QASearchExport from './QA/QASearchExport';
import QAAuditTrail from './QA/QAAuditTrail';
import QAAccount from './QA/QAAccount';
import TrainingManagerLayout from './TrainingManager/TrainingManagerLayout';
import TrainingManagerDashboard from './TrainingManager/TrainingManagerDashboard';
import ClassStatus from './TrainingManager/ClassStatus';
import EtrApproval from './TrainingManager/EtrApproval';
import './App.css';

// Protected Route Guard based on role stored in localStorage
// Protected Route Guard based on role stored in localStorage
/*const ProtectedRoute = ({ allowedRoles }) => {
	const token = localStorage.getItem('token');
	const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
	return <Navigate to="/login" replace />;
  }

  try {
	const user = JSON.parse(userJson);

	// Lấy role ra (hỗ trợ cả trường hợp bạn lưu là roleName hoặc role)
	const rawRole = user.roleName || user.role || "";
	const userRole = rawRole.toLowerCase(); // chuyển thành chữ thường ví dụ: "admin"

	const isAllowed = allowedRoles.some(
	  (role) => role.toLowerCase() === userRole,
	);

		if (!isAllowed) {
			// Redirect authorized users to their respective default home page
			if (userRole === 'admin') return <Navigate to="/admin" replace />;
			if (userRole === 'instructor') return <Navigate to="/instructor" replace />;
			if (userRole === 'qa' || userRole === 'qualityassurance') return <Navigate to="/qa" replace />;
			if (userRole === 'academic' || userRole === 'academicstaff') return <Navigate to="/academic" replace />;
			if (userRole === 'trainingmanager') return <Navigate to="/trainingmanager" replace />;
			return <Navigate to="/login" replace />;
		}

		return <Outlet />;
	} catch (e) {
		return <Navigate to="/login" replace />;
	}
};*/
// Temporary: bypass authentication during development
const ProtectedRoute = () => {
	return <Outlet />;
};
function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="/login" element={<Login />} />

				{/* Protected Admin Routes */}
				<Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
					<Route path="/admin" element={<AdminLayout />}>
						<Route index element={<Dashboard />} />
						<Route path="users" element={<UserManagement />} />
						<Route path="roles" element={<RolePermissionManagement />} />
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
						<Route
							index
							element={<Navigate to="/academic/learners" replace />}
						/>
						<Route path="learners" element={<LearnerManagement />} />
						<Route path="courses" element={<CourseClassManagement />} />
						<Route path="etr" element={<EtrManagement />} />
					</Route>
				</Route>

				{/* Protected Instructor Routes */}
				<Route element={<ProtectedRoute allowedRoles={['Instructor']} />}>
					<Route path="/instructor" element={<InstructorLayout />}>
						<Route
							index
							element={<Navigate to="/instructor/dashboard" replace />}
						/>

						<Route path="dashboard" element={<InstructorDashboard />} />
						<Route path="classes" element={<InstructorClasses />} />
						<Route path="attendance" element={<InstructorAttendance />} />
						<Route path="assessments" element={<InstructorAssessments />} />
						<Route path="evidence" element={<InstructorEvidence />} />
					</Route>
				</Route>
				{/* Protected QA Routes */}
				<Route element={<ProtectedRoute allowedRoles={['QA', 'QualityAssurance']} />}>
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
				</Route>

				{/* Protected Training Manager Routes */}
				<Route element={<ProtectedRoute allowedRoles={["TrainingManager"]} />}>
					<Route path="/trainingmanager" element={<TrainingManagerLayout />}>
						<Route index element={<TrainingManagerDashboard />} />
						<Route path="classes" element={<ClassStatus />} />
						<Route path="etr-approval" element={<EtrApproval />} />
					</Route>
				</Route>

				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
