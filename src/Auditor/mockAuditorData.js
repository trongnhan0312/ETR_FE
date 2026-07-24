// Mock Data Service Layer for Auditor Compliance Module
// All functions are read-only and return structured mock data suitable for easy backend API replacement.

export const MOCK_AUDITOR_STATS = {
  totalLockedRecords: 142,
  complianceRate: 99.4,
  pendingAudit: 5,
  auditPackagesExported: 28,
};

export const MOCK_LOCKED_ETRS = [
  {
    id: "ETR-2026-0891",
    learnerId: "HV-8801",
    learnerName: "Nguyễn Văn An",
    learnerRole: "Aircraft Maintenance Engineer",
    learnerDepartment: "Line Maintenance",
    courseId: "CRS-A320-SYS",
    courseName: "Airbus A320 Type Rating & Systems Compliance",
    classId: "CLS-2026-A320-04",
    className: "A320 Maintenance Systems Class 04",
    completionDate: "2026-06-15",
    lockedDate: "2026-06-18 14:32",
    approvedBy: "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: "Trần Minh Quang (QA Lead)",
    academicStaff: "Phạm Thu Hà (Academic Staff)",
    instructor: "Đỗ Quốc Việt (Senior Instructor)",
    status: "Locked & Compliant",
    isLocked: true,
    verificationHash: "0x8F9A3C72B10E45D9981A64B2",
    totalSessions: 16,
    attendedSessions: 16,
    attendancePercentage: 100,
    overallScore: 94.5,
    resultStatus: "PASSED",
    subjects: [
      { code: "MOD-01", name: "A320 Avionics & Flight Controls", score: 96, passScore: 80, result: "PASSED", instructor: "Đỗ Quốc Việt" },
      { code: "MOD-02", name: "Hydraulics & Fuel Management", score: 92, passScore: 80, result: "PASSED", instructor: "Đỗ Quốc Việt" },
      { code: "MOD-03", name: "Turbofan Engine Inspection Protocols", score: 95, passScore: 80, result: "PASSED", instructor: "Trịnh Anh Tuấn" },
      { code: "MOD-04", name: "Emergency & Systems Failover Practical", score: 95, passScore: 80, result: "PASSED", instructor: "Trịnh Anh Tuấn" },
    ],
    attendanceList: [
      { session: 1, date: "2026-05-02", topic: "Airframe Overview & Safety Guidelines", duration: "4 hours", status: "PRESENT" },
      { session: 2, date: "2026-05-05", topic: "Avionics Systems Architecture", duration: "4 hours", status: "PRESENT" },
      { session: 3, date: "2026-05-09", topic: "Fly-by-wire Logic & Computers", duration: "4 hours", status: "PRESENT" },
      { session: 4, date: "2026-05-12", topic: "Hydraulic System Maintenance", duration: "4 hours", status: "PRESENT" },
      { session: 5, date: "2026-05-16", topic: "Fuel Transfer & Venting", duration: "4 hours", status: "PRESENT" },
      { session: 6, date: "2026-05-19", topic: "Powerplant CFM56 Diagnostics", duration: "4 hours", status: "PRESENT" },
    ],
    evidences: [
      { id: "EVD-891-01", name: "A320_Practical_Assessment_Sheet_Signed.pdf", size: "3.4 MB", uploadedAt: "2026-06-15 16:20", uploadedBy: "Đỗ Quốc Việt", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", type: "PDF" },
      { id: "EVD-891-02", name: "Simulated_Cockpit_Checklist_Logs.zip", size: "12.8 MB", uploadedAt: "2026-06-16 09:15", uploadedBy: "Đỗ Quốc Việt", sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb", type: "ZIP" },
      { id: "EVD-891-03", name: "QA_Final_Verification_Signoff.pdf", size: "1.2 MB", uploadedAt: "2026-06-17 11:45", uploadedBy: "Trần Minh Quang", sha256: "7d793037a0760186574b0282f2f435e70d19d1543168a079b2bf23ed95a91673", type: "PDF" },
    ]
  },
  {
    id: "ETR-2026-0892",
    learnerId: "HV-8804",
    learnerName: "Phạm Hải Đăng",
    learnerRole: "First Officer",
    learnerDepartment: "Flight Operations",
    courseId: "CRS-B787-REC",
    courseName: "Boeing 787 Recurrent Flight Safety & CRM",
    classId: "CLS-2026-B787-02",
    className: "B787 Recurrent Class 02",
    completionDate: "2026-06-12",
    lockedDate: "2026-06-14 10:15",
    approvedBy: "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: "Nguyễn Thị Phương (QA Officer)",
    academicStaff: "Phạm Thu Hà (Academic Staff)",
    instructor: "Nguyễn Văn Hùng (Check Pilot)",
    status: "Locked & Compliant",
    isLocked: true,
    verificationHash: "0x3D4E7F1A990B22C481D01E67",
    totalSessions: 12,
    attendedSessions: 12,
    attendancePercentage: 100,
    overallScore: 98.0,
    resultStatus: "PASSED",
    subjects: [
      { code: "CRM-101", name: "Crew Resource Management & Threat Handling", score: 100, passScore: 85, result: "PASSED", instructor: "Nguyễn Văn Hùng" },
      { code: "B787-SIM", name: "Full Flight Simulator Emergency Scenarios", score: 96, passScore: 85, result: "PASSED", instructor: "Nguyễn Văn Hùng" },
    ],
    attendanceList: [
      { session: 1, date: "2026-06-01", topic: "CRM & Human Factors Refresh", duration: "6 hours", status: "PRESENT" },
      { session: 2, date: "2026-06-05", topic: "B787 Systems & Abnormal Checklist", duration: "6 hours", status: "PRESENT" },
      { session: 3, date: "2026-06-10", topic: "Level D Simulator Evaluation", duration: "4 hours", status: "PRESENT" },
    ],
    evidences: [
      { id: "EVD-892-01", name: "B787_Sim_Evaluation_Form.pdf", size: "2.1 MB", uploadedAt: "2026-06-12 18:00", uploadedBy: "Nguyễn Văn Hùng", sha256: "9b74c2d829633e69176378e907d4b45d0e2e92c2a04803d526715f5c0b938072", type: "PDF" }
    ]
  },
  {
    id: "ETR-2026-0893",
    learnerId: "HV-8812",
    learnerName: "Vũ Thị Thanh Hằng",
    learnerRole: "Quality Inspector",
    learnerDepartment: "Quality Assurance",
    courseId: "CRS-AV-AUD",
    courseName: "Aviation Quality Auditing & EASA Part-145",
    classId: "CLS-2026-AUD-01",
    className: "Part-145 Compliance Class 01",
    completionDate: "2026-06-10",
    lockedDate: "2026-06-11 16:50",
    approvedBy: "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: "Trần Minh Quang (QA Lead)",
    academicStaff: "Ngô Quốc Bảo (Academic Officer)",
    instructor: "Bùi Hoàng Lâm (Senior Auditor)",
    status: "Locked & Compliant",
    isLocked: true,
    verificationHash: "0x7C118B99AA043F2910D7E844",
    totalSessions: 10,
    attendedSessions: 10,
    attendancePercentage: 100,
    overallScore: 91.0,
    resultStatus: "PASSED",
    subjects: [
      { code: "REG-201", name: "EASA Part-145 & VAR-145 Regulatory Framework", score: 90, passScore: 75, result: "PASSED", instructor: "Bùi Hoàng Lâm" },
      { code: "AUD-301", name: "Practical Audit Execution & Root Cause Analysis", score: 92, passScore: 75, result: "PASSED", instructor: "Bùi Hoàng Lâm" },
    ],
    attendanceList: [
      { session: 1, date: "2026-05-20", topic: "Part-145 Regulations Overview", duration: "4 hours", status: "PRESENT" },
      { session: 2, date: "2026-05-27", topic: "Non-conformance Reporting Protocols", duration: "4 hours", status: "PRESENT" },
    ],
    evidences: [
      { id: "EVD-893-01", name: "Audit_Practicum_Case_Study.pdf", size: "4.8 MB", uploadedAt: "2026-06-10 15:30", uploadedBy: "Bùi Hoàng Lâm", sha256: "3f829d5b06e4a2c5a4d0484a921d604b92b6a95f928e4695c02b1c413b194d21", type: "PDF" }
    ]
  },
  {
    id: "ETR-2026-0894",
    learnerId: "HV-8820",
    learnerName: "Hoàng Văn Tuấn",
    learnerRole: "Avionics Specialist",
    learnerDepartment: "Base Maintenance",
    courseId: "CRS-AV-RAD",
    courseName: "Radar & Navigation Systems Overhaul",
    classId: "CLS-2026-RAD-03",
    className: "Avionics Radar Class 03",
    completionDate: "2026-06-05",
    lockedDate: "2026-06-08 09:20",
    approvedBy: "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: "Nguyễn Thị Phương (QA Officer)",
    academicStaff: "Phạm Thu Hà (Academic Staff)",
    instructor: "Lương Thế Vinh (Avionics Chief)",
    status: "Locked & Compliant",
    isLocked: true,
    verificationHash: "0x1A2B3C4D5E6F7A8B9C0D1E2F",
    totalSessions: 14,
    attendedSessions: 14,
    attendancePercentage: 100,
    overallScore: 89.5,
    resultStatus: "PASSED",
    subjects: [
      { code: "RAD-101", name: "Weather Radar Transceiver Diagnostics", score: 88, passScore: 80, result: "PASSED", instructor: "Lương Thế Vinh" },
      { code: "NAV-202", name: "ILS/VOR Antenna Calibration", score: 91, passScore: 80, result: "PASSED", instructor: "Lương Thế Vinh" },
    ],
    attendanceList: [
      { session: 1, date: "2026-05-10", topic: "Transceiver Hardware Principles", duration: "4 hours", status: "PRESENT" },
    ],
    evidences: [
      { id: "EVD-894-01", name: "Radar_Calibration_Logbook.pdf", size: "1.9 MB", uploadedAt: "2026-06-05 14:10", uploadedBy: "Lương Thế Vinh", sha256: "8e71b29a32c61f28b49e77d018b3294c718a2456f9104b29c918451829e01824", type: "PDF" }
    ]
  },
  {
    id: "ETR-2026-0895",
    learnerId: "HV-8835",
    learnerName: "Đặng Thị Mai",
    learnerRole: "Cabin Crew Senior",
    learnerDepartment: "Inflight Services",
    courseId: "CRS-SAF-EMG",
    courseName: "Annual Cabin Safety & Evacuation Drills",
    classId: "CLS-2026-CAB-09",
    className: "Cabin Safety Recurrent Class 09",
    completionDate: "2026-06-01",
    lockedDate: "2026-06-03 11:00",
    approvedBy: "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: "Trần Minh Quang (QA Lead)",
    academicStaff: "Ngô Quốc Bảo (Academic Officer)",
    instructor: "Trần Thu Trang (Cabin Master)",
    status: "Locked & Compliant",
    isLocked: true,
    verificationHash: "0x445566778899AABBCCDDEEFF",
    totalSessions: 8,
    attendedSessions: 8,
    attendancePercentage: 100,
    overallScore: 96.0,
    resultStatus: "PASSED",
    subjects: [
      { code: "CAB-01", name: "Slide Evacuation & Ditching Practical", score: 98, passScore: 85, result: "PASSED", instructor: "Trần Thu Trang" },
      { code: "CAB-02", name: "First Aid & AED Operation", score: 94, passScore: 85, result: "PASSED", instructor: "Trần Thu Trang" },
    ],
    attendanceList: [
      { session: 1, date: "2026-05-25", topic: "Evacuation Mockup Practice", duration: "8 hours", status: "PRESENT" },
    ],
    evidences: [
      { id: "EVD-895-01", name: "Cabin_Evacuation_Drill_Certificate.pdf", size: "1.1 MB", uploadedAt: "2026-06-01 17:00", uploadedBy: "Trần Thu Trang", sha256: "1f2e3d4c5b6a79887766554433221100aabbccddeeff00112233445566778899", type: "PDF" }
    ]
  }
];

export const MOCK_APPROVAL_TIMELINE = [
  {
    stage: 1,
    roleTitle: "Academic Staff",
    user: "Phạm Thu Hà",
    role: "Academic Officer",
    timestamp: "2026-06-15 16:45",
    action: "Verified learner eligibility, session attendance, and finalized grade entry.",
    status: "Completed",
    hash: "0x89A12019BC4F"
  },
  {
    stage: 2,
    roleTitle: "QA Verification",
    user: "Trần Minh Quang",
    role: "QA Lead Auditor",
    timestamp: "2026-06-17 11:45",
    action: "Inspected uploaded evidence files and verified grading criteria against EASA Part-147 standard.",
    status: "Completed",
    hash: "0x55B32190DA12"
  },
  {
    stage: 3,
    roleTitle: "Training Manager Approval",
    user: "Lê Hoàng Nam",
    role: "Training Manager",
    timestamp: "2026-06-18 14:30",
    action: "Granted final administrative approval for certification issuance.",
    status: "Completed",
    hash: "0x33F89012AA56"
  },
  {
    stage: 4,
    roleTitle: "System Locked",
    user: "System Automated Daemon",
    role: "Security System",
    timestamp: "2026-06-18 14:32",
    action: "Record permanently locked (IsLocked = true). Cryptographic SHA-256 signature generated.",
    status: "Completed",
    hash: "0x8F9A3C72B10E45D9981A64B2"
  },
  {
    stage: 5,
    roleTitle: "Audited",
    user: "Auditor Officer",
    role: "Independent Compliance Auditor",
    timestamp: "2026-07-20 09:15",
    action: "Compliance audit verified. Zero discrepancies found.",
    status: "Audited",
    hash: "0x990011223344"
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: "LOG-2026-9011",
    timestamp: "2026-07-24 14:10:02",
    user: "Auditor Officer (auditor.compliance@aero.vn)",
    role: "Auditor",
    module: "ETR Inspection",
    action: "INSPECT_LOCKED_ETR",
    target: "ETR-2026-0891",
    result: "SUCCESS",
    details: "Inspected locked ETR details, attendance list, and QA signoff file."
  },
  {
    id: "LOG-2026-9010",
    timestamp: "2026-07-24 11:35:19",
    user: "Auditor Officer (auditor.compliance@aero.vn)",
    role: "Auditor",
    module: "Export Packages",
    action: "GENERATE_COMPLIANCE_PDF",
    target: "PKG-2026-0891-PDF",
    result: "SUCCESS",
    details: "Generated official compliance verification PDF package."
  },
  {
    id: "LOG-2026-9009",
    timestamp: "2026-07-23 16:40:00",
    user: "System Security Daemon",
    role: "System",
    module: "Security Enforcer",
    action: "PREVENT_WRITE_ATTEMPT",
    target: "ETR-2026-0891",
    result: "403 FORBIDDEN",
    details: "Blocked attempt to modify locked ETR record. HTTP 403 Forbidden returned."
  },
  {
    id: "LOG-2026-9008",
    timestamp: "2026-07-22 09:12:44",
    user: "Lê Hoàng Nam",
    role: "Training Manager",
    action: "APPROVE_AND_LOCK_ETR",
    target: "ETR-2026-0891",
    module: "ETR Workflow",
    result: "SUCCESS",
    details: "Approved ETR and initiated cryptographic record lock."
  },
  {
    id: "LOG-2026-9007",
    timestamp: "2026-07-21 15:20:11",
    user: "Trần Minh Quang",
    role: "QA Officer",
    action: "VERIFY_EVIDENCE_INTEGRITY",
    target: "EVD-891-01",
    module: "QA Verification",
    result: "SUCCESS",
    details: "Verified SHA-256 hash match with uploaded practical assessment sheet."
  },
  {
    id: "LOG-2026-9006",
    timestamp: "2026-07-20 10:05:30",
    user: "Auditor Officer (auditor.compliance@aero.vn)",
    role: "Auditor",
    module: "Advanced Search",
    action: "SEARCH_FILTER_LOCKED_ETRS",
    target: "Query: Airbus A320",
    result: "SUCCESS",
    details: "Filtered locked ETR database for course CRS-A320-SYS."
  }
];

export const MOCK_EXPORT_PACKAGES = [
  {
    id: "PKG-2026-001",
    name: "A320_Type_Rating_Compliance_Dossier_2026Q2.pdf",
    type: "Compliance PDF",
    scope: "Course: CRS-A320-SYS (14 Locked ETRs)",
    generatedDate: "2026-07-22 15:30",
    generatedBy: "Auditor Officer",
    size: "18.4 MB",
    status: "Ready",
    downloadUrl: "#",
    digitalSignature: "VALID (CA-AeroMetric-2026)"
  },
  {
    id: "PKG-2026-002",
    name: "Boeing_787_Recurrent_Evidence_Archive.zip",
    type: "Full Evidence ZIP",
    scope: "Class: CLS-2026-B787-02",
    generatedDate: "2026-07-20 11:15",
    generatedBy: "Auditor Officer",
    size: "142.0 MB",
    status: "Ready",
    downloadUrl: "#",
    digitalSignature: "VALID (CA-AeroMetric-2026)"
  },
  {
    id: "PKG-2026-003",
    name: "Regulatory_Audit_Package_EASA_Part145_2026.zip",
    type: "Regulatory Compliance Package",
    scope: "All Part-145 Certified Engineers",
    generatedDate: "2026-07-15 09:45",
    generatedBy: "Auditor Officer",
    size: "260.5 MB",
    status: "Ready",
    downloadUrl: "#",
    digitalSignature: "VALID (CA-AeroMetric-2026)"
  },
  {
    id: "PKG-2026-004",
    name: "Digital_Signature_Verification_Chain.p7b",
    type: "Digital Signature Package",
    scope: "Public Key Certificate Manifest Q2",
    generatedDate: "2026-07-10 14:20",
    generatedBy: "System Automated Daemon",
    size: "2.1 MB",
    status: "Ready",
    downloadUrl: "#",
    digitalSignature: "VALID (CA-AeroMetric-2026)"
  }
];

// Helper service functions for component data retrieval
export const getLockedETRs = (searchQuery = "", category = "All") => {
  return MOCK_LOCKED_ETRS.filter(etr => {
    const matchesSearch = 
      etr.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerId.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (category === "All") return matchesSearch;
    return matchesSearch && etr.learnerDepartment.toLowerCase().includes(category.toLowerCase());
  });
};

export const getETRById = (id) => {
  return MOCK_LOCKED_ETRS.find(etr => etr.id === id) || MOCK_LOCKED_ETRS[0];
};

export const getAuditLogs = (filterModule = "All", searchQuery = "") => {
  return MOCK_AUDIT_LOGS.filter(log => {
    const matchesQuery = 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (filterModule === "All") return matchesQuery;
    return matchesQuery && log.module.toLowerCase().includes(filterModule.toLowerCase());
  });
};
