import { useState, useMemo } from "react";

// Mock sessions list matching A320 attendance history template
const mockSessions = [
  {
    stt: "01",
    date: "24/05/2024",
    name: "Buổi 1: Giới thiệu hệ thống thủy lực",
    room: "Phòng LAB-04",
    instructor: "Nguyễn Văn A",
    attendance: "25/25",
    rate: 100,
    color: "emerald",
  },
  {
    stt: "02",
    date: "26/05/2024",
    name: "Buổi 2: Kiểm tra van xả áp",
    room: "Xưởng bảo trì A1",
    instructor: "Nguyễn Văn A",
    attendance: "23/25",
    rate: 92,
    color: "amber",
  },
  {
    stt: "03",
    date: "28/05/2024",
    name: "Buổi 3: Quy trình an toàn động cơ",
    room: "Phòng LAB-04",
    instructor: "Nguyễn Văn A",
    attendance: "24/25",
    rate: 96,
    color: "indigo",
  },
  {
    stt: "04",
    date: "31/05/2024",
    name: "Buổi 4: Thực hành chẩn đoán lỗi",
    room: "Hangar B7",
    instructor: "Trần Văn B (Phụ tá)",
    attendance: "25/25",
    rate: 100,
    color: "emerald",
  },
  {
    stt: "05",
    date: "02/06/2024",
    name: "Buổi 5: Cấu trúc cánh máy bay",
    room: "Hangar B7",
    instructor: "Nguyễn Văn A",
    attendance: "24/25",
    rate: 96,
    color: "indigo",
  },
  {
    stt: "06",
    date: "04/06/2024",
    name: "Buổi 6: Bảo dưỡng càng hạ cánh",
    room: "Xưởng bảo trì A1",
    instructor: "Nguyễn Văn A",
    attendance: "25/25",
    rate: 100,
    color: "emerald",
  },
  {
    stt: "07",
    date: "06/06/2024",
    name: "Buổi 7: Quy trình nạp nhiên liệu",
    room: "Phòng LAB-04",
    instructor: "Nguyễn Văn A",
    attendance: "23/25",
    rate: 92,
    color: "amber",
  },
  {
    stt: "08",
    date: "08/06/2024",
    name: "Buổi 8: Hệ thống lái tự động AP",
    room: "Phòng LAB-04",
    instructor: "Nguyễn Văn A",
    attendance: "24/25",
    rate: 96,
    color: "indigo",
  },
  {
    stt: "09",
    date: "10/06/2024",
    name: "Buổi 9: Thiết bị vô tuyến hàng không",
    room: "Phòng LAB-04",
    instructor: "Nguyễn Văn A",
    attendance: "25/25",
    rate: 100,
    color: "emerald",
  },
  {
    stt: "10",
    date: "12/06/2024",
    name: "Buổi 10: Kiểm tra tổng kết chuyên đề",
    room: "Hangar B7",
    instructor: "Nguyễn Văn A",
    attendance: "23/25",
    rate: 92,
    color: "amber",
  },
];

const IntroductorClasses = () => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [courseKey, setCourseKey] = useState("");
  const [hasScheduleOnly, setHasScheduleOnly] = useState(false);

  // Class Details State
  const [sessionSearch, setSessionSearch] = useState("");
  const [attendanceModalSession, setAttendanceModalSession] = useState(null);

  // Session Creation State
  const [creatingSessionInClass, setCreatingSessionInClass] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionLocation, setNewSessionLocation] = useState(
    "Phòng Lab 302 - Cơ sở A",
  );
  const [newSessionTime, setNewSessionTime] = useState("");
  const [newSessionDescription, setNewSessionDescription] = useState("");
  const [assistInstructors, setAssistInstructors] = useState([]);

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      alert("Vui lòng nhập tên buổi học!");
      return;
    }
    if (!newSessionDate) {
      alert("Vui lòng chọn ngày thực hiện!");
      return;
    }

    // Chuyển đổi định dạng ngày yyyy-mm-dd từ input type="date" thành dd/mm/yyyy
    const dateParts = newSessionDate.split("-");
    const formattedDate =
      dateParts.length === 3
        ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        : newSessionDate;

    const newSession = {
      stt: String(sessions.length + 1).padStart(2, "0"),
      date: formattedDate,
      name: newSessionName,
      room: newSessionLocation,
      instructor:
        "Nguyễn Văn A" +
        (assistInstructors.length > 0
          ? ` (+${assistInstructors.length} trợ giảng)`
          : ""),
      attendance: "0/25",
      rate: 0,
      color: "indigo",
    };

    setSessions((prev) => [newSession, ...prev]);
    setCreatingSessionInClass(false);

    // Reset form states
    setNewSessionName("");
    setNewSessionDate("");
    setNewSessionTime("");
    setNewSessionDescription("");
    setNewSessionLocation("Phòng Lab 302 - Cơ sở A");
    setAssistInstructors([]);

    alert("Tạo buổi học mới thành công!");
  };

  const [viewingSessionDetails, setViewingSessionDetails] = useState(null);
  const [sessionSubTab, setSessionSubTab] = useState("evaluation");
  const [evidenceFiles, setEvidenceFiles] = useState([
    {
      name: "Attendance_Day_01.pdf",
      type: "ATTENDANCE SHEET",
      date: "24/10/2023",
      status: "CHỜ QA DUYỆT",
      fileType: "pdf",
    },
    {
      name: "Practical_Exam_Result.png",
      type: "PRACTICAL FORM",
      date: "22/10/2023",
      status: "CHỜ QA DUYỆT",
      fileType: "png",
    },
  ]);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadEvidence = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert("Kích thước file vượt quá giới hạn 10MB!");
      return;
    }

    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(fileExt)) {
      alert("Định dạng file không hỗ trợ! Chỉ cho phép PDF, JPG, PNG.");
      return;
    }

    const newFile = {
      name: file.name,
      type: fileExt === "pdf" ? "ATTENDANCE SHEET" : "PRACTICAL FORM",
      date: new Date().toLocaleDateString("vi-VN"),
      status: "CHỜ QA DUYỆT",
      fileType: fileExt === "pdf" ? "pdf" : "png",
    };

    setEvidenceFiles((prev) => [newFile, ...prev]);
    alert("Tải lên minh chứng thành công!");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const mockEvent = { target: { files } };
      handleUploadEvidence(mockEvent);
    }
  };

  const handleCompleteSession = () => {
    if (evidenceFiles.length === 0) {
      alert("Vui lòng tải lên ít nhất một file minh chứng trước khi hoàn tất!");
      return;
    }

    const confirmComplete = window.confirm(
      "Bạn có chắc chắn muốn gửi minh chứng lên bộ phận QA và hoàn tất buổi học này không?\nSau khi hoàn tất, hệ thống sẽ khóa chức năng chỉnh sửa.",
    );

    if (confirmComplete) {
      alert(
        "Gửi minh chứng thành công! Buổi học đã chuyển sang trạng thái chờ duyệt và hoàn tất.",
      );
      setViewingSessionDetails(null);
    }
  };

  const [isEditingScores, setIsEditingScores] = useState(false);
  const [studentScores, setStudentScores] = useState([
    {
      code: "HV-2024-001",
      name: "Nguyễn Văn An",
      score: 85,
      comment:
        "Kỹ năng tháo lắp linh kiện xuất sắc, tuân thủ nghiêm ngặt quy định.",
    },
    {
      code: "HV-2024-002",
      name: "Lê Thị Bình",
      score: 92,
      comment: "Nắm vững quy trình an toàn bay, lý thuyết đạt điểm tuyệt đối.",
    },
    {
      code: "HV-2024-003",
      name: "Trần Văn Cường",
      score: 45,
      comment:
        "Cần cải thiện kỹ năng đọc bản vẽ kỹ thuật và quy trình bảo dưỡng.",
    },
    {
      code: "HV-2024-004",
      name: "Phạm Minh Đức",
      score: 78,
      comment: "Thái độ học tập tốt, hoàn thành bài thực hành đúng hạn.",
    },
  ]);
  const [editingScores, setEditingScores] = useState([]);

  const handleStartEditScores = () => {
    setEditingScores(JSON.parse(JSON.stringify(studentScores)));
    setIsEditingScores(true);
  };

  const handleScoreChange = (code, value) => {
    const scoreVal =
      value === "" ? "" : Math.min(100, Math.max(0, parseInt(value) || 0));
    setEditingScores((prev) =>
      prev.map((s) => (s.code === code ? { ...s, score: scoreVal } : s)),
    );
  };

  const handleCommentChange = (code, value) => {
    setEditingScores((prev) =>
      prev.map((s) => (s.code === code ? { ...s, comment: value } : s)),
    );
  };

  const handleSaveScores = () => {
    setStudentScores(editingScores);
    setIsEditingScores(false);
    alert("Lưu bảng điểm đánh giá thành công!");
  };

  const [sessionAttendance, setSessionAttendance] = useState([
    {
      code: "SV2024001",
      name: "Nguyễn Văn An",
      avatar: "AN",
      morning: "P",
      afternoon: "P",
    },
    {
      code: "SV2024002",
      name: "Trần Thị Bình",
      avatar: "TB",
      morning: "AE",
      afternoon: "P",
    },
    {
      code: "SV2024003",
      name: "Lê Hoàng Cường",
      avatar: "LC",
      morning: "P",
      afternoon: "P",
    },
    {
      code: "SV2024004",
      name: "Phạm Minh Đức",
      avatar: "MĐ",
      morning: "P",
      afternoon: "AU",
    },
  ]);

  const handleToggleAttendance = (studentCode, timeOfDay, status) => {
    setSessionAttendance((prev) =>
      prev.map((student) =>
        student.code === studentCode
          ? { ...student, [timeOfDay]: status }
          : student,
      ),
    );
  };

  // Mock list of assigned classes based on the user's first HTML template
  const classesData = useMemo(
    () => [
      {
        stt: "01",
        code: "AV-2024-001",
        name: "Kỹ thuật Hàng không Cơ bản",
        subName: "Hệ thống động cơ phản lực",
        courseKey: "24",
        schedule: "Thứ 2, 4, 6",
        time: "08:00 - 11:30",
        studentsCount: "25/25",
        status: "Đang diễn ra",
      },
      {
        stt: "02",
        code: "AV-2024-045",
        name: "An toàn Hàng không & Quy trình",
        subName: "Tuân thủ ICAO Annex 14",
        courseKey: "25",
        schedule: "Thứ 3, 5",
        time: "13:30 - 17:00",
        studentsCount: "18/20",
        status: "Sắp tới",
      },
      {
        stt: "03",
        code: "AV-2023-098",
        name: "Quản trị Không lưu Chuyên sâu",
        subName: "Mô phỏng Radar cấp độ 3",
        courseKey: "22",
        schedule: "Cả tuần",
        time: "Tăng cường",
        studentsCount: "15/15",
        status: "Hoàn thành",
      },
      {
        stt: "04",
        code: "AV-2024-012",
        name: "Khí tượng Hàng không",
        subName: "Dự báo thời tiết chuyên biệt",
        courseKey: "24",
        schedule: "Thứ 7",
        time: "08:00 - 16:30",
        studentsCount: "30/30",
        status: "Đang diễn ra",
      },
      {
        stt: "05",
        code: "AV-2024-088",
        name: "Vật liệu Hàng không hiện đại",
        subName: "Composite & Nano-structures",
        courseKey: "26",
        schedule: "Chưa sắp lịch",
        time: "",
        studentsCount: "0/25",
        status: "Sắp tới",
      },
    ],
    [],
  );

  // Filter classes dynamically
  const filteredClasses = useMemo(() => {
    return classesData.filter((cls) => {
      const matchesSearch =
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "Tất cả" || cls.status === statusFilter;
      const matchesCourse = !courseKey || cls.courseKey === courseKey;
      const matchesSchedule =
        !hasScheduleOnly || cls.schedule !== "Chưa sắp lịch";

      return matchesSearch && matchesStatus && matchesCourse && matchesSchedule;
    });
  }, [classesData, searchTerm, statusFilter, courseKey, hasScheduleOnly]);

  // Statistics calculation
  const stats = useMemo(() => {
    const ongoing = classesData.filter(
      (c) => c.status === "Đang diễn ra",
    ).length;
    const upcoming = classesData.filter((c) => c.status === "Sắp tới").length;
    const completed = classesData.filter(
      (c) => c.status === "Hoàn thành",
    ).length;
    return { ongoing, upcoming, completed };
  }, [classesData]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.instructor.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.room.toLowerCase().includes(sessionSearch.toLowerCase()),
    );
  }, [sessions, sessionSearch]);

  // IF CLASS IS SELECTED: RENDER 100% FIGMA CODE BUT SCALED DOWN AND RESPONSIVE
  if (selectedClass) {
    if (creatingSessionInClass) {
      return (
        <div className="flex flex-col justify-start items-start w-full relative bg-slate-50 animate-fadeIn">
          <div className="flex flex-col justify-start items-start self-stretch gap-6 p-6 pb-20">
            {/* Topbar layout */}
            <div className="flex justify-between items-center self-stretch h-20 px-6 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex justify-start items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  CURRENT SESSION
                </span>
                <div className="w-px h-4 bg-slate-200" />
                <span className="text-sm font-semibold text-[#002147]">
                  {selectedClass.name}
                </span>
              </div>
              <div className="flex justify-start items-center gap-6">
                <div
                  onClick={() => alert("Thực hiện điểm danh nhanh")}
                  className="flex justify-center items-center px-6 py-2 rounded-full bg-[#002147] text-white font-bold text-xs uppercase cursor-pointer hover:opacity-90 transition-all shadow-sm"
                >
                  CHECK-IN
                </div>
                <div className="flex justify-start items-center gap-4 text-[#002147]/60">
                  <button className="hover:text-slate-900 transition-colors">
                    <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
                      <path
                        d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button className="hover:text-slate-900 transition-colors">
                    <svg width={21} height={20} viewBox="0 0 21 20" fill="none">
                      <path
                        d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#002147]">
                        Capt. Nguyen
                      </span>
                      <span className="text-[10px] uppercase text-[#002147]/60">
                        CHIEF INSTRUCTOR
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#c5a059] bg-gradient-to-br from-[#002147] to-[#036] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      CN
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breadcrumb section */}
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCreatingSessionInClass(false)}
                  className="flex justify-center items-center w-12 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z"
                      fill="#002147"
                    />
                  </svg>
                </button>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-bold text-[#002147]">
                    Tạo Buổi Học Mới
                  </h1>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Lớp Huấn Luyện</span>
                    <span>/</span>
                    <span className="text-[#c5a059]">
                      Khóa {selectedClass.courseKey}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form grid layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Form Elements */}
              <div className="lg:col-span-2 flex flex-col gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                    THÔNG TIN BUỔI HỌC
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-[#c5a059] bg-[#c5a059]/10 uppercase tracking-wide">
                    BẮT BUỘC
                  </span>
                </div>

                {/* Session Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    TÊN BUỔI HỌC
                  </label>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="VD: Buổi 1: Lý thuyết cơ bản khí động học"
                    className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] placeholder-slate-400/70 focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Date & Start Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      NGÀY THỰC HIỆN
                    </label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      THỜI GIAN BẮT ĐẦU
                    </label>
                    <input
                      type="time"
                      value={newSessionTime}
                      onChange={(e) => setNewSessionTime(e.target.value)}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Content & Goals */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    NỘI DUNG & MỤC TIÊU HUẤN LUYỆN
                  </label>
                  <textarea
                    value={newSessionDescription}
                    onChange={(e) => setNewSessionDescription(e.target.value)}
                    placeholder="Nhập chi tiết nội dung buổi học và các mục tiêu cần đạt được trong buổi huấn luyện này..."
                    rows={6}
                    className="w-full p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-[#002147] placeholder-slate-400/70 focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* Right Side Settings */}
              <div className="flex flex-col gap-6">
                {/* Location */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
                      <path
                        d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 17.35C10.0333 15.4833 11.5417 13.7875 12.525 12.2625C13.5083 10.7375 14 9.38333 14 8.2C14 6.38333 13.4208 4.89583 12.2625 3.7375C11.1042 2.57917 9.68333 2 8 2C6.31667 2 4.89583 2.57917 3.7375 3.7375C2.57917 4.89583 2 6.38333 2 8.2C2 9.38333 2.49167 10.7375 3.475 12.2625C4.45833 13.7875 5.96667 15.4833 8 17.35ZM8 20C5.31667 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6792 0 9.86667 0 8.2C0 5.7 0.804167 3.70833 2.4125 2.225C4.02083 0.741667 5.88333 0 8 0C10.1167 0 11.9792 0.741667 13.5875 2.225C15.1958 3.70833 16 5.7 16 8.2C16 9.86667 15.3375 11.6792 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                      ĐỊA ĐIỂM
                    </span>
                  </div>
                  <select
                    value={newSessionLocation}
                    onChange={(e) => setNewSessionLocation(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] transition-all"
                  >
                    <option value="Phòng Lab 302 - Cơ sở A">
                      Phòng Lab 302 - Cơ sở A
                    </option>
                    <option value="Phòng LAB-04">Phòng LAB-04</option>
                    <option value="Xưởng bảo trì A1">Xưởng bảo trì A1</option>
                    <option value="Hangar B7">Hangar B7</option>
                  </select>
                </div>

                {/* Primary Instructor */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <svg width={22} height={16} viewBox="0 0 22 16" fill="none">
                      <path
                        d="M17 10V7H14V5H17V2H19V5H22V7H19V10H17ZM8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                      GIẢNG VIÊN PHỤ TRÁCH
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-start items-center gap-3 p-3 rounded-xl bg-[#002147]/5 border border-[#002147]/10">
                      <div className="w-8 h-8 rounded-full border border-[#c5a059] bg-gradient-to-br from-[#002147] to-[#036] flex items-center justify-center text-white font-bold text-xs">
                        CN
                      </div>
                      <p className="text-xs font-bold text-[#002147]">
                        Capt. Nguyen (Bạn)
                      </p>
                    </div>

                    {assistInstructors.map((ins, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fadeIn"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[#002147] font-bold text-xs">
                            {ins.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            {ins}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAssistInstructors((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt("Nhập tên giảng viên hỗ trợ:");
                        if (name && name.trim()) {
                          setAssistInstructors((prev) => [
                            ...prev,
                            name.trim(),
                          ]);
                        }
                      }}
                      className="flex justify-center items-center py-3 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 transition-colors text-[11px] font-bold text-[#002147]/50"
                    >
                      + THÊM GIẢNG VIÊN HỖ TRỢ
                    </button>
                  </div>
                </div>

                {/* Banner rules */}
                <div
                  className="flex justify-start items-center p-6 rounded-2xl border border-[#002147] relative overflow-hidden h-40"
                  style={{
                    background:
                      "linear-gradient(171.07deg, #002147 -113.1%, #036 213.1%)",
                  }}
                >
                  <div className="absolute right-[-10px] top-6 opacity-10 pointer-events-none">
                    <svg width={88} height={83} viewBox="0 0 88 83" fill="none">
                      <path
                        d="M19.2558 92.8527L21.8547 80.6258L38.71 73.474L42.4524 55.8673L-0.000138134 63.2012L3.11854 48.529L48.066 29.4573L52.6401 7.93805C53.2118 5.24814 54.659 3.149 56.9817 1.64062C59.3044 0.13224 61.8108 -0.33607 64.5007 0.235688C67.1906 0.807446 69.2897 2.25468 70.7981 4.57738C72.3065 6.90008 72.7748 9.40638 72.203 12.0963L67.629 33.6155L100.933 69.3202L97.8147 83.9924L62.0153 60.0255L58.2729 77.6322L70.7621 91.0214L68.1632 103.248L45.2688 90.7144L19.2558 92.8527Z"
                        fill="white"
                        fillOpacity="0.05"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5 z-10">
                    <h4 className="text-lg font-bold text-white leading-snug">
                      Quy chuẩn Huấn Luyện Bay
                    </h4>
                    <p className="text-xs italic text-white/70 leading-relaxed">
                      "Sự an toàn và chính xác là nền tảng của mọi chuyến bay
                      thành công. Hãy đảm bảo nội dung bài học tuân thủ tiêu
                      chuẩn ICAO."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="w-full flex justify-end items-center gap-4 border-t border-slate-200 pt-6 mt-6">
              <button
                type="button"
                onClick={() => setCreatingSessionInClass(false)}
                className="px-8 py-3 rounded-full hover:bg-slate-100 text-xs font-bold text-[#002147] transition-all uppercase tracking-wider"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                onClick={handleCreateSession}
                className="px-8 py-3 rounded-full text-white text-xs font-bold transition-all hover:opacity-90 active:scale-95 uppercase tracking-wider shadow-md hover:shadow-lg"
                style={{
                  background:
                    "linear-gradient(159.93deg, #c5a059 -27.55%, #a68045 127.55%)",
                }}
              >
                XÁC NHẬN TẠO BUỔI HỌC
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (viewingSessionDetails) {
      return (
        <div className="flex flex-col justify-start items-start w-full relative bg-slate-50 animate-fadeIn">
          <div className="flex flex-col justify-start items-start self-stretch gap-8 p-6 pb-20">
            {/* Header section */}
            <div className="flex justify-between items-end self-stretch flex-wrap gap-4">
              <div className="flex flex-col justify-start items-start gap-2">
                <div className="flex justify-start items-center gap-2">
                  <span
                    onClick={() => setViewingSessionDetails(null)}
                    className="text-[11px] font-bold text-[#c5a059] uppercase tracking-wider cursor-pointer hover:underline"
                  >
                    LỚP HỌC
                  </span>
                  <svg
                    width={6}
                    height={10}
                    viewBox="0 0 6 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0.8875 10L0 9.1125L4.1125 5L0 0.8875L0.8875 0L5.8875 5L0.8875 10Z"
                      fill="#C5A059"
                    />
                  </svg>
                  <span className="text-[11px] font-bold text-[#002147] opacity-60 uppercase tracking-wider">
                    {selectedClass.code}
                  </span>
                </div>
                <div className="flex flex-col justify-start items-start self-stretch pt-1">
                  <h2 className="text-3xl font-bold text-[#002147]">
                    {selectedClass.name}
                  </h2>
                </div>
                <div className="flex justify-start items-center gap-4 text-slate-500 text-sm font-semibold">
                  <div className="flex items-center gap-1.5">
                    <svg
                      width={12}
                      height={15}
                      viewBox="0 0 12 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 7.5C6.4125 7.5 6.76562 7.35312 7.05937 7.05937C7.35312 6.76562 7.5 6.4125 7.5 6C7.5 5.5875 7.35312 5.23438 7.05937 4.94063C6.76562 4.64688 6.4125 4.5 6 4.5C5.5875 4.5 5.23438 4.64688 4.94063 4.94063C4.64688 5.23438 4.5 5.5875 4.5 6C4.5 6.4125 4.64688 6.76562 4.94063 7.05937C5.23438 7.35312 5.5875 7.5 6 7.5ZM6 13.0125C7.525 11.6125 8.65625 10.3406 9.39375 9.19687C10.1313 8.05312 10.5 7.0375 10.5 6.15C10.5 4.7875 10.0656 3.67188 9.19687 2.80312C8.32812 1.93437 7.2625 1.5 6 1.5C4.7375 1.5 3.67188 1.93437 2.80312 2.80312C1.93437 3.67188 1.5 4.7875 1.5 6.15C1.5 7.0375 1.86875 8.05312 2.60625 9.19687C3.34375 10.3406 4.475 11.6125 6 13.0125ZM6 15C3.9875 13.2875 2.48438 11.6969 1.49063 10.2281C0.496875 8.75937 0 7.4 0 6.15C0 4.275 0.603125 2.78125 1.80938 1.66875C3.01562 0.55625 4.4125 0 6 0C7.5875 0 8.98438 0.55625 10.1906 1.66875C11.3969 2.78125 12 4.275 12 6.15C12 7.4 11.5031 8.75937 10.5094 10.2281C9.51562 11.6969 8.0125 13.2875 6 15Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span>
                      {viewingSessionDetails.room || "Hangar B2, Tân Sơn Nhất"}
                    </span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1.5">
                    <svg
                      width={17}
                      height={12}
                      viewBox="0 0 17 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0 12V9.9C0 9.475 0.109375 9.08437 0.328125 8.72812C0.546875 8.37187 0.8375 8.1 1.2 7.9125C1.975 7.525 2.7625 7.23438 3.5625 7.04063C4.3625 6.84688 5.175 6.75 6 6.75C6.825 6.75 7.6375 6.84688 8.4375 7.04063C9.2375 7.23438 10.025 7.525 10.8 7.9125C11.1625 8.1 11.4531 8.37187 11.6719 8.72812C11.8906 9.08437 12 9.475 12 9.9V12H0ZM13.5 12V9.75C13.5 9.2 13.3469 8.67188 13.0406 8.16562C12.7344 7.65937 12.3 7.225 11.7375 6.8625C12.375 6.9375 12.975 7.06562 13.5375 7.24687C14.1 7.42812 14.625 7.65 15.1125 7.9125C15.5625 8.1625 15.9062 8.44063 16.1437 8.74687C16.3812 9.05312 16.5 9.3875 16.5 9.75V12H13.5ZM6 6C5.175 6 4.46875 5.70625 3.88125 5.11875C3.29375 4.53125 3 3.825 3 3C3 2.175 3.29375 1.46875 3.88125 0.88125C4.46875 0.29375 5.175 0 6 0C6.825 0 7.53125 0.29375 8.11875 0.88125C8.70625 1.46875 9 2.175 9 3C9 3.825 8.70625 4.53125 8.11875 5.11875C7.53125 5.70625 6.825 6 6 6ZM13.5 3C13.5 3.825 13.2062 4.53125 12.6187 5.11875C12.0312 5.70625 11.325 6 10.5 6C10.3625 6 10.1875 5.98438 9.975 5.95312C9.7625 5.92188 9.5875 5.8875 9.45 5.85C9.7875 5.45 10.0469 5.00625 10.2281 4.51875C10.4094 4.03125 10.5 3.525 10.5 3C10.5 2.475 10.4094 1.96875 10.2281 1.48125C10.0469 0.99375 9.7875 0.55 9.45 0.15C9.625 0.0875 9.8 0.046875 9.975 0.028125C10.15 0.009375 10.325 0 10.5 0C11.325 0 12.0312 0.29375 12.6187 0.88125C13.2062 1.46875 13.5 2.175 13.5 3ZM1.5 10.5H10.5V9.9C10.5 9.7625 10.4656 9.6375 10.3969 9.525C10.3281 9.4125 10.2375 9.325 10.125 9.2625C9.45 8.925 8.76875 8.67188 8.08125 8.50313C7.39375 8.33438 6.7 8.25 6 8.25C5.3 8.25 4.60625 8.33438 3.91875 8.50313C3.23125 8.67188 2.55 8.925 1.875 9.2625C1.7625 9.325 1.67188 9.4125 1.60312 9.525C1.53437 9.6375 1.5 9.7625 1.5 9.9V10.5ZM6 4.5C6.4125 4.5 6.76562 4.35312 7.05937 4.05937C7.35312 3.76562 7.5 3.4125 7.5 3C7.5 2.5875 7.35312 2.23438 7.05937 1.94062C6.76562 1.64687 6.4125 1.5 6 1.5C5.5875 1.5 5.23438 1.64687 4.94063 1.94062C4.64688 2.23438 4.5 2.5875 4.5 3C4.5 3.4125 4.64688 3.76562 4.94063 4.05937C5.23438 4.35312 5.5875 4.5 6 4.5Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span>
                      {selectedClass.studentsCount.split("/")[1] || "24"} Học
                      viên
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress/Step Stepper */}
              <div className="flex flex-col justify-start items-start w-full max-w-sm gap-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[11px] font-bold italic text-[#002147] uppercase">
                    TIẾN ĐỘ KHÓA HỌC:{" "}
                    <span className="text-[#c5a059]">75%</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#002147] uppercase">
                    BƯỚC 3: ĐÁNH GIÁ
                  </span>
                </div>
                <div className="flex justify-center items-start self-stretch h-2.5 gap-1 pt-1">
                  <div className="h-full flex-grow bg-[#002147]" />
                  <div className="h-full flex-grow bg-[#002147]" />
                  <div className="h-full flex-grow bg-[#c5a059] shadow-[0px_0px_8px_0_rgba(197,160,89,0.5)] animate-pulse" />
                  <div className="h-full flex-grow bg-slate-200" />
                </div>
                <div className="flex justify-between items-start w-full text-[9px] font-bold text-slate-400 uppercase">
                  <span>KHỞI TẠO</span>
                  <span>ĐÀO TẠO</span>
                  <span className="text-[#002147]">KIỂM TRA</span>
                  <span>LƯU TRỮ</span>
                </div>
              </div>
            </div>

            {/* Inner Subtabs Navigation */}
            <div className="flex justify-start items-start self-stretch gap-2 pt-2 border-b border-slate-200">
              <button
                onClick={() => {
                  setAttendanceModalSession(viewingSessionDetails);
                  setViewingSessionDetails(null);
                }}
                className="flex flex-col justify-center items-center px-8 py-3 border-b-2 border-transparent hover:border-slate-300 hover:text-slate-800 text-xs font-bold text-slate-500 uppercase transition-all"
              >
                ĐIỂM DANH
              </button>
              <button
                onClick={() => setSessionSubTab("evaluation")}
                className={`flex flex-col justify-center items-center px-8 py-3 border-b-2 text-xs font-bold uppercase transition-all ${
                  sessionSubTab === "evaluation"
                    ? "border-[#c5a059] bg-white/50 text-[#002147]"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                ĐÁNH GIÁ KẾT QUẢ
              </button>
              <button
                onClick={() => setSessionSubTab("evidence")}
                className={`flex flex-col justify-center items-center px-8 py-3 border-b-2 text-xs font-bold uppercase transition-all ${
                  sessionSubTab === "evidence"
                    ? "border-[#c5a059] bg-white/50 text-[#002147]"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                MINH CHỨNG
              </button>
            </div>

            {sessionSubTab === "evaluation" ? (
              <>
                {/* Assessment Grade Sheet Table Card */}
                <div
                  className="flex flex-col justify-start items-start self-stretch rounded bg-white border border-[#002147]/5 w-full shadow-sm overflow-hidden"
                  style={{ boxShadow: "0px 4px 20px 0 rgba(0,33,71,0.08)" }}
                >
                  {/* Grading table header control */}
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center self-stretch p-6 bg-white border-b border-slate-200 gap-4">
                    <div className="flex flex-col justify-start items-start gap-1">
                      <h3 className="text-xl font-bold text-[#002147]">
                        Bảng nhập điểm đánh giá định kỳ
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Final Examination - {viewingSessionDetails.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isEditingScores ? (
                        <>
                          <button
                            onClick={() => setIsEditingScores(false)}
                            className="px-6 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-[#002147] transition-all uppercase tracking-wider"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            onClick={handleSaveScores}
                            className="px-6 py-2.5 rounded-lg text-white font-bold text-xs transition-all hover:opacity-90 active:scale-95 uppercase tracking-wider shadow-md hover:shadow-lg"
                            style={{
                              background:
                                "linear-gradient(159.93deg, #10b981 -27.55%, #059669 127.55%)",
                            }}
                          >
                            Lưu điểm đánh giá
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleStartEditScores}
                          className="flex items-center gap-2.5 px-6 py-3 rounded-lg text-white font-bold text-xs uppercase hover:opacity-95 transition-all shadow-md active:scale-95 shrink-0"
                          style={{
                            background:
                              "linear-gradient(169.68deg, #002147 -91.91%, #036 191.91%)",
                          }}
                        >
                          <svg
                            width={16}
                            height={16}
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0"
                          >
                            <path
                              d="M2 16H3.425L13.2 6.225L11.775 4.8L2 14.575V16ZM0 18V13.75L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.25 18H0ZM16 3.4L14.6 2L16 3.4ZM12.475 5.525L11.775 4.8L13.2 6.225L12.475 5.525Z"
                              fill="currentColor"
                            />
                          </svg>
                          NHẬP ĐIỂM ĐÁNH GIÁ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table rendering */}
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f4f7f9] border-b border-slate-200">
                          <th className="px-6 py-4 font-bold uppercase text-[#002147] w-24 text-center">
                            STT
                          </th>
                          <th className="px-6 py-4 font-bold uppercase text-[#002147] min-w-[200px]">
                            HỌC VIÊN
                          </th>
                          <th className="px-6 py-4 font-bold uppercase text-[#002147] w-40 text-center">
                            ĐIỂM SỐ
                          </th>
                          <th className="px-6 py-4 font-bold uppercase text-[#002147] w-44 text-center">
                            XẾP LOẠI
                          </th>
                          <th className="px-6 py-4 font-bold uppercase text-[#002147] min-w-[300px]">
                            NHẬN XẾT CHUYÊN MÔN
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(isEditingScores ? editingScores : studentScores).map(
                          (student, sIdx) => {
                            const isPass = student.score >= 50;
                            const formattedStt = String(sIdx + 1).padStart(
                              2,
                              "0",
                            );
                            return (
                              <tr
                                key={student.code}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-6 py-4 text-center font-bold text-[#44474e]/50">
                                  {formattedStt}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-[#002147] text-sm">
                                    {student.name}
                                  </p>
                                  <p className="text-[10px] font-semibold text-[#44474e]/60 uppercase tracking-wide mt-0.5">
                                    ID: {student.code}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {isEditingScores ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={student.score}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          student.code,
                                          e.target.value,
                                        )
                                      }
                                      className="w-20 text-center h-10 border border-slate-200 rounded-lg text-sm font-bold text-[#002147] focus:outline-none focus:border-[#c5a059]"
                                    />
                                  ) : (
                                    <span className="text-base font-bold text-[#002147]">
                                      {student.score}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span
                                    className={`inline-block px-4 py-1.5 font-bold text-[10px] tracking-wide rounded-md uppercase border ${
                                      isPass
                                        ? "bg-[#e8f5e9] border-[#c8e6c9] text-[#2e7d32]"
                                        : "bg-[#ffebee] border-[#ffcdd2] text-[#c62828]"
                                    }`}
                                  >
                                    {isPass ? "PASS" : "FAIL"}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {isEditingScores ? (
                                    <input
                                      type="text"
                                      value={student.comment}
                                      onChange={(e) =>
                                        handleCommentChange(
                                          student.code,
                                          e.target.value,
                                        )
                                      }
                                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-[#c5a059]"
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-slate-600">
                                      {student.comment}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table pagination control footer */}
                  <div className="flex justify-between items-center w-full px-6 py-4 bg-slate-50 border-t border-slate-200 flex-wrap gap-4 text-xs font-bold text-slate-400 uppercase">
                    <span>
                      HIỂN THỊ {studentScores.length} / 24 HỌC VIÊN TRONG DANH
                      SÁCH
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="flex justify-center items-center w-8 h-8 rounded border border-slate-200 hover:bg-slate-100 bg-white transition-colors cursor-not-allowed opacity-50">
                        <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                          <path
                            d="M4.5 9L0 4.5L4.5 0L5.55 1.05L2.1 4.5L5.55 7.95L4.5 9Z"
                            fill="#1A1C1E"
                          />
                        </svg>
                      </button>
                      <button className="flex justify-center items-center w-8 h-8 rounded bg-[#002147] text-[#c5a059] font-bold shadow-sm">
                        1
                      </button>
                      <button
                        onClick={() =>
                          alert("Chức năng phân trang đang được tích hợp.")
                        }
                        className="flex justify-center items-center w-8 h-8 rounded border border-slate-200 hover:bg-slate-100 bg-white text-[#002147] font-bold transition-colors"
                      >
                        2
                      </button>
                      <button
                        onClick={() =>
                          alert("Chức năng phân trang đang được tích hợp.")
                        }
                        className="flex justify-center items-center w-8 h-8 rounded border border-slate-200 hover:bg-slate-100 bg-white transition-colors"
                      >
                        <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                          <path
                            d="M3.45 4.5L0 1.05L1.05 0L5.55 4.5L1.05 9L0 7.95L3.45 4.5Z"
                            fill="#1A1C1E"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back action footer */}
                <div className="w-full flex justify-start">
                  <button
                    onClick={() => setViewingSessionDetails(null)}
                    className="px-6 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#002147] uppercase tracking-wider shadow-sm transition-all"
                  >
                    QUAY LẠI DANH SÁCH BUỔI HỌC
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Stepper Card */}
                <div
                  className="flex flex-col justify-start items-center self-stretch gap-10 p-8 rounded-lg bg-white border border-[#c4c7cf]"
                  style={{ boxShadow: "0px 1px 2px 0 rgba(0,0,0,0.05)" }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center self-stretch gap-4">
                    <div className="flex flex-col justify-start items-start gap-2">
                      <p className="text-2xl font-bold text-left text-[#002147]">
                        {selectedClass.name}
                      </p>
                      <div className="flex flex-wrap justify-start items-start gap-6 text-[#44474e] text-xs font-semibold">
                        <div className="flex justify-start items-center gap-2">
                          <svg
                            width={11}
                            height={12}
                            viewBox="0 0 11 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1.16667 11.6667C0.845833 11.6667 0.571181 11.5524 0.342708 11.324C0.114236 11.0955 0 10.8208 0 10.5V2.33333C0 2.0125 0.114236 1.73785 0.342708 1.50937C0.571181 1.2809 0.845833 1.16667 1.16667 1.16667H1.75V0H2.91667V1.16667H7.58333V0H8.75V1.16667H9.33333C9.65417 1.16667 9.92882 1.2809 10.1573 1.50937C10.3858 1.73785 10.5 2.0125 10.5 2.33333V10.5C10.5 10.8208 10.3858 11.0955 10.1573 11.324C9.92882 11.5524 9.65417 11.6667 9.33333 11.6667H1.16667ZM1.16667 10.5H9.33333V4.66667H1.16667V10.5ZM1.16667 3.5H9.33333V2.33333H1.16667V3.5ZM1.16667 3.5V2.33333V3.5Z"
                              fill="#C5A059"
                            />
                          </svg>
                          <span>12/10/2023 - 25/11/2023</span>
                        </div>
                        <div className="flex justify-start items-center gap-2">
                          <svg
                            width={10}
                            height={12}
                            viewBox="0 0 10 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4.66667 5.83333C4.9875 5.83333 5.26215 5.7191 5.49062 5.49062C5.7191 5.26215 5.83333 4.9875 5.83333 4.66667C5.83333 4.34583 5.7191 4.07118 5.49062 3.84271C5.26215 3.61424 4.9875 3.5 4.66667 3.5C4.34583 3.5 4.07118 3.61424 3.84271 3.84271C3.61424 4.07118 3.5 4.34583 3.5 4.66667C3.5 4.9875 3.61424 5.26215 3.84271 5.49062C4.07118 5.7191 4.34583 5.83333 4.66667 5.83333ZM4.66667 10.1208C5.85278 9.03194 6.73264 8.04271 7.30625 7.15312C7.87986 6.26354 8.16667 5.47361 8.16667 4.78333C8.16667 3.72361 7.82882 2.8559 7.15312 2.18021C6.47743 1.50451 5.64861 1.16667 4.66667 1.16667C3.68472 1.16667 2.8559 1.50451 2.18021 2.18021C1.50451 2.8559 1.16667 3.72361 1.16667 4.78333C1.16667 5.47361 1.45347 6.26354 2.02708 7.15312C2.60069 8.04271 3.48056 9.03194 4.66667 10.1208ZM4.66667 11.6667C3.10139 10.3347 1.93229 9.09757 1.15937 7.95521C0.386458 6.81285 0 5.75556 0 4.78333C0 3.325 0.469097 2.16319 1.40729 1.29792C2.34549 0.432639 3.43194 0 4.66667 0C5.90139 0 6.98785 0.432639 7.92604 1.29792C8.86424 2.16319 9.33333 3.325 9.33333 4.78333C9.33333 5.75556 8.94688 6.81285 8.17396 7.95521C7.40104 9.09757 6.23194 10.3347 4.66667 11.6667Z"
                              fill="#C5A059"
                            />
                          </svg>
                          <span>
                            {viewingSessionDetails.room ||
                              "Phòng SIM-04, Trung tâm Huấn luyện"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-start items-center gap-2 px-4 py-2 rounded bg-[#002147]/5 border border-[#002147]/20 shrink-0">
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0"
                      >
                        <path
                          d="M5.25 8.75H6.41667V5.25H5.25V8.75ZM5.83333 4.08333C5.99861 4.08333 6.13715 4.02743 6.24896 3.91563C6.36076 3.80382 6.41667 3.66528 6.41667 3.5C6.41667 3.33472 6.36076 3.19618 6.24896 3.08437C6.13715 2.97257 5.99861 2.91667 5.83333 2.91667C5.66806 2.91667 5.52951 2.97257 5.41771 3.08437C5.3059 3.19618 5.25 3.33472 5.25 3.5C5.25 3.66528 5.3059 3.80382 5.41771 3.91563C5.52951 4.02743 5.66806 4.08333 5.83333 4.08333ZM5.83333 11.6667C5.02639 11.6667 4.26806 11.5135 3.55833 11.2073C2.84861 10.901 2.23125 10.4854 1.70625 9.96042C1.18125 9.43542 0.765625 8.81806 0.459375 8.10833C0.153125 7.39861 0 6.64028 0 5.83333C0 5.02639 0.153125 4.26806 0.459375 3.55833C0.765625 2.84861 1.18125 2.23125 1.70625 1.70625C2.23125 1.18125 2.84861 0.765625 3.55833 0.459375C4.26806 0.153125 5.02639 0 5.83333 0C6.64028 0 7.39861 0.153125 8.10833 0.459375C8.81806 0.765625 9.43542 1.18125 9.96042 1.70625C10.4854 2.23125 10.901 2.84861 11.2073 3.55833C11.5135 4.26806 11.6667 5.02639 11.6667 5.83333C11.6667 6.64028 11.5135 7.39861 11.2073 8.10833C10.901 8.81806 10.4854 9.43542 9.96042 9.96042C9.43542 10.4854 8.81806 10.901 8.10833 11.2073C7.39861 11.5135 6.64028 11.6667 5.83333 11.6667Z"
                          fill="#C5A059"
                        />
                      </svg>
                      <span className="text-[11px] font-bold uppercase text-[#002147] tracking-wider">
                        ĐANG THỰC HIỆN
                      </span>
                    </div>
                  </div>

                  {/* Stepper progress */}
                  <div className="flex justify-between items-center w-full max-w-[1126px] overflow-x-auto gap-4 py-2 border-t border-slate-100 pt-6">
                    {/* Step 1: Điểm danh */}
                    <div
                      onClick={() => {
                        setAttendanceModalSession(viewingSessionDetails);
                        setViewingSessionDetails(null);
                      }}
                      className="flex flex-col justify-start items-center gap-2 cursor-pointer hover:opacity-85 transition-all"
                    >
                      <div className="flex justify-center items-center w-10 h-10 rounded-full bg-[#1e8e3e]/10 border border-[#1e8e3e]/20">
                        <svg
                          width={13}
                          height={10}
                          viewBox="0 0 13 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.275 9.01875L0 4.74375L1.06875 3.675L4.275 6.88125L11.1562 0L12.225 1.06875L4.275 9.01875Z"
                            fill="#1E8E3E"
                          />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold text-center uppercase text-[#1e8e3e]">
                        ĐIỂM DANH
                      </p>
                    </div>
                    <div className="flex-grow h-0.5 bg-[#1e8e3e]/30 min-w-[20px]" />

                    {/* Step 2: Chấm điểm */}
                    <div
                      onClick={() => setSessionSubTab("evaluation")}
                      className="flex flex-col justify-start items-center gap-2 cursor-pointer hover:opacity-85 transition-all"
                    >
                      <div className="flex justify-center items-center w-10 h-10 rounded-full bg-[#1e8e3e]/10 border border-[#1e8e3e]/20">
                        <svg
                          width={13}
                          height={10}
                          viewBox="0 0 13 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.275 9.01875L0 4.74375L1.06875 3.675L4.275 6.88125L11.1562 0L12.225 1.06875L4.275 9.01875Z"
                            fill="#1E8E3E"
                          />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold text-center uppercase text-[#1e8e3e]">
                        CHẤM ĐIỂM
                      </p>
                    </div>
                    <div className="flex-grow h-0.5 bg-[#1e8e3e]/30 min-w-[20px]" />

                    {/* Step 3: Nhận xét */}
                    <div
                      onClick={() => setSessionSubTab("evaluation")}
                      className="flex flex-col justify-start items-center gap-2 cursor-pointer hover:opacity-85 transition-all"
                    >
                      <div className="flex justify-center items-center w-10 h-10 rounded-full bg-[#1e8e3e]/10 border border-[#1e8e3e]/20">
                        <svg
                          width={13}
                          height={10}
                          viewBox="0 0 13 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.275 9.01875L0 4.74375L1.06875 3.675L4.275 6.88125L11.1562 0L12.225 1.06875L4.275 9.01875Z"
                            fill="#1E8E3E"
                          />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold text-center uppercase text-[#1e8e3e]">
                        NHẬN XÉT
                      </p>
                    </div>
                    <div className="flex-grow h-0.5 bg-[#c5a059] min-w-[20px]" />

                    {/* Step 4: Minh chứng */}
                    <div className="flex flex-col justify-start items-center gap-2">
                      <div className="flex justify-center items-center w-10 h-10 rounded-full bg-gradient-to-br from-[#c5a059] to-[#d4af37] shadow-[0px_0px_0px_4px_rgba(197,160,89,0.2),_0px_4px_6px_-1px_rgba(0,0,0,0.1),_0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
                        <span className="text-base font-bold text-center text-[#002147]">
                          4
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-center uppercase text-[#002147]">
                        MINH CHỨNG
                      </p>
                    </div>
                    <div className="flex-grow h-0.5 bg-slate-200 min-w-[20px]" />

                    {/* Step 5: Hoàn tất */}
                    <div className="flex flex-col justify-start items-center opacity-30 gap-2">
                      <div className="flex justify-center items-center w-10 h-10 rounded-full bg-[#f5f7fa] border border-[#c4c7cf]">
                        <span className="text-base font-bold text-center text-[#44474e]">
                          5
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-center uppercase text-[#44474e]">
                        HOÀN TẤT
                      </p>
                    </div>
                  </div>
                </div>

                {/* Two Columns Section */}
                <div className="w-full flex flex-col lg:flex-row justify-start items-start gap-6">
                  {/* Left Column: Tải lên minh chứng */}
                  <div className="flex-1 w-full self-stretch flex flex-col justify-start items-start gap-8 p-8 rounded-lg bg-white border border-[#c4c7cf] shadow-sm">
                    <div className="flex justify-start items-center self-stretch relative gap-3">
                      <div className="w-1 h-6 rounded-full bg-[#c5a059]" />
                      <p className="text-lg font-bold text-left uppercase text-[#002147]">
                        TẢI LÊN MINH CHỨNG
                      </p>
                    </div>

                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className="w-full cursor-pointer"
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleUploadEvidence}
                        className="hidden"
                      />
                      <div
                        className={`flex flex-col justify-center items-center w-full p-12 rounded-lg border-2 border-dashed transition-all ${
                          isDragging
                            ? "bg-[#c5a059]/10 border-[#c5a059] scale-[1.01]"
                            : "bg-[#f5f7fa] border-[#c5a059]/30 hover:bg-[#c5a059]/5 hover:border-[#c5a059]/55"
                        }`}
                      >
                        <div className="flex flex-col justify-center items-center h-[104px] w-20 pb-6">
                          <div className="flex justify-center items-center w-20 h-20 rounded-full bg-[#002147]/5">
                            <svg
                              width={27}
                              height={34}
                              viewBox="0 0 27 34"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M11.6667 28.3333H15V21.375L17.6667 24.0417L20 21.6667L13.3333 15L6.66667 21.6667L9.04167 24L11.6667 21.375V28.3333ZM3.33333 33.3333C2.41667 33.3333 1.63194 33.0069 0.979167 32.3542C0.326389 31.7014 0 30.9167 0 30V3.33333C0 2.41667 0.326389 1.63194 0.979167 0.979167C1.63194 0.326389 2.41667 0 3.33333 0H16.6667L26.6667 10V30C26.6667 30.9167 26.3403 31.7014 25.6875 32.3542C25.0347 33.0069 24.25 33.3333 23.3333 33.3333H3.33333ZM15 11.6667V3.33333H3.33333V30H23.3333V11.6667H15ZM3.33333 3.33333V11.6667V3.33333V11.6667V30V3.33333Z"
                                fill="#C5A059"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="text-base font-bold text-center text-[#002147] pb-2">
                          {isDragging
                            ? "Thả file vào đây..."
                            : "Kéo thả file hoặc click để chọn"}
                        </p>
                        <p className="text-xs font-medium text-center uppercase text-[#44474e]/70 pb-8">
                          PDF, JPG, PNG (TỐI ĐA 10MB)
                        </p>
                        <div
                          className="flex justify-center items-center px-10 py-3 rounded text-white text-xs font-bold uppercase transition-transform active:scale-95 shadow-md hover:shadow-lg"
                          style={{
                            background:
                              "linear-gradient(165.91deg, #002147 -55.85%, #036 155.85%)",
                          }}
                        >
                          CHỌN FILE
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Right Column: Hồ sơ đã tải */}
                  <div className="w-full lg:w-[480px] shrink-0 self-stretch flex flex-col justify-start items-start gap-8 p-8 rounded-lg bg-white border border-[#c4c7cf] shadow-sm">
                    <div className="flex justify-between items-center self-stretch">
                      <div className="flex justify-start items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-[#c5a059]" />
                        <p className="text-lg font-bold text-left uppercase text-[#002147]">
                          HỒ SƠ ĐÃ TẢI
                        </p>
                      </div>
                      <div className="flex justify-start items-start px-3 py-1 rounded-full bg-[#002147]">
                        <p className="text-[10px] font-bold uppercase text-[#c5a059]">
                          {evidenceFiles.length}{" "}
                          {evidenceFiles.length === 1 ? "FILE" : "FILES"}
                        </p>
                      </div>
                    </div>

                    <div className="w-full flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                      {evidenceFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400">
                          <p className="text-sm font-semibold italic">
                            Chưa có file minh chứng nào được tải lên
                          </p>
                        </div>
                      ) : (
                        evidenceFiles.map((file, index) => {
                          const isPdf = file.fileType === "pdf";
                          return (
                            <div
                              key={index}
                              className="flex justify-start items-start self-stretch gap-4 p-5 rounded-lg border border-[#c4c7cf] relative group"
                            >
                              {isPdf ? (
                                <div className="flex justify-center items-center w-10 h-10 rounded bg-red-50 border border-red-100 shrink-0">
                                  <svg
                                    width={20}
                                    height={20}
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z"
                                      fill="#DC2626"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex justify-center items-center w-10 h-10 rounded bg-blue-50 border border-blue-100 shrink-0">
                                  <svg
                                    width={18}
                                    height={18}
                                    viewBox="0 0 18 18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.4125 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM3 14H15L11.25 9L8.25 13L6 10L3 14ZM2 16V2V16Z"
                                      fill="#2563EB"
                                    />
                                  </svg>
                                </div>
                              )}
                              <div className="flex flex-col justify-start items-start flex-grow gap-1 min-w-0">
                                <p className="text-sm font-bold text-[#002147] truncate w-full">
                                  {file.name}
                                </p>
                                <div className="flex justify-start items-center gap-3">
                                  <p className="text-[10px] font-semibold uppercase text-slate-400/80">
                                    {file.type}
                                  </p>
                                  <p className="text-[10px] font-semibold text-slate-400">
                                    {file.date}
                                  </p>
                                </div>
                                <div className="flex justify-start items-center gap-1.5 px-3 py-0.5 mt-1.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/20">
                                  <svg
                                    width={10}
                                    height={10}
                                    viewBox="0 0 10 10"
                                    fill="none"
                                    className="shrink-0"
                                  >
                                    <path
                                      d="M6.65 7.35L7.35 6.65L5.5 4.8V2.5H4.5V5.2L6.65 7.35ZM5 10C4.30833 10 3.65833 9.86875 3.05 9.60625C2.44167 9.34375 1.9125 8.9875 1.4625 8.5375C1.0125 8.0875 0.65625 7.55833 0.39375 6.95C0.13125 6.34167 0 5.69167 0 5C0 4.30833 0.13125 3.65833 0.39375 3.05C0.65625 2.44167 1.0125 1.9125 1.4625 1.4625C1.9125 1.0125 2.44167 0.65625 3.05 0.39375C3.65833 0.13125 4.30833 0 5 0C5.69167 0 6.34167 0.13125 6.95 0.39375C7.55833 0.65625 8.0875 1.0125 8.5375 1.4625C8.9875 1.9125 9.34375 2.44167 9.60625 3.05C9.86875 3.65833 10 4.30833 10 5C10 5.69167 9.86875 6.34167 9.60625 6.95C9.34375 7.55833 8.9875 8.0875 8.5375 8.5375C8.0875 8.9875 7.55833 9.34375 6.95 9.60625C6.34167 9.86875 5.69167 10 5 10Z"
                                      fill="#C5A059"
                                    />
                                  </svg>
                                  <p className="text-[9px] font-bold uppercase text-[#c5a059]">
                                    {file.status}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEvidenceFiles((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  );
                                }}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                >
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                  <path
                                    fillRule="evenodd"
                                    d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex flex-col justify-start items-center self-stretch gap-2 pt-4 border-t border-slate-100">
                      <svg
                        width={24}
                        height={30}
                        viewBox="0 0 24 30"
                        fill="none"
                        className="opacity-40"
                      >
                        <path
                          d="M10.425 20.325L18.9 11.85L16.7625 9.7125L10.425 16.05L7.275 12.9L5.1375 15.0375L10.425 20.325ZM12 30C8.525 29.125 5.65625 27.1312 3.39375 24.0187C1.13125 20.9062 0 17.45 0 13.65V4.5L12 0L24 4.5V13.65C24 17.45 22.8688 20.9062 20.6063 24.0187C18.3438 27.1312 15.475 29.125 12 30ZM12 26.85C14.6 26.025 16.75 24.375 18.45 21.9C20.15 19.425 21 16.675 21 13.65V6.5625L12 3.1875L3 6.5625V13.65C3 16.675 3.85 19.425 5.55 21.9C7.25 24.375 9.4 26.025 12 26.85Z"
                          fill="#C5A059"
                        />
                      </svg>
                      <p className="text-[10px] font-bold text-center uppercase text-[#002147] opacity-40">
                        TÀI LIỆU ĐÃ ĐƯỢC MÃ HÓA BẢO MẬT
                      </p>
                    </div>
                  </div>
                </div>

                {/* Process Overview Banner */}
                <div
                  className="flex flex-col sm:flex-row justify-start items-center self-stretch gap-6 sm:gap-10 p-8 sm:p-10 rounded-lg bg-[#002147] relative overflow-hidden text-white"
                  style={{
                    boxShadow:
                      "0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="absolute right-[-10px] top-6 opacity-10 pointer-events-none">
                    <svg
                      width={150}
                      height={150}
                      viewBox="0 0 96 96"
                      fill="white"
                    >
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="white"
                        strokeWidth="6"
                        fill="transparent"
                      />
                    </svg>
                  </div>

                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#c5a059]/10 shrink-0 flex items-center justify-center">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c5a059"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>

                  <div className="flex flex-col justify-start items-start gap-2">
                    <p className="text-xl font-bold text-left text-[#c5a059]">
                      Quy trình phê duyệt minh chứng
                    </p>
                    <p className="text-sm font-medium text-left text-white/70 leading-relaxed max-w-3xl">
                      Mỗi file minh chứng sau khi tải lên sẽ được chuyển đến bộ
                      phận QA (Quality Assurance) để kiểm soát chất lượng. Vui
                      lòng kiểm tra kỹ nội dung file trước khi nhấn nút Hoàn tất
                      khóa học. Hệ thống sẽ khóa chức năng tải lên sau khi QA đã
                      phê duyệt hoặc khóa học đã kết thúc.
                    </p>
                  </div>
                </div>

                {/* Bottom Actions footer bar */}
                <div className="flex justify-between items-center w-full px-6 py-4 bg-white border border-[#c4c7cf] rounded-lg shadow-sm">
                  <div
                    onClick={() => setSessionSubTab("evaluation")}
                    className="flex justify-start items-center gap-2 cursor-pointer hover:opacity-85 text-[#002147] transition-all font-bold text-xs"
                  >
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 10 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0"
                    >
                      <path
                        d="M2.23125 5.25L5.49792 8.51667L4.66667 9.33333L0 4.66667L4.66667 0L5.49792 0.816667L2.23125 4.08333H9.33333V5.25H2.23125Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>QUAY LẠI BƯỚC 3</span>
                  </div>

                  <button
                    onClick={handleCompleteSession}
                    className="flex justify-center items-center px-10 py-3 rounded bg-[#c5a059] text-white font-bold text-xs uppercase shadow-md hover:bg-[#c5a059]/95 transition-all active:scale-95"
                  >
                    TIẾP TỤC: HOÀN TẤT
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (creatingSessionInClass) {
      return (
        <div className="flex flex-col justify-start items-start w-full relative bg-slate-50 animate-fadeIn">
          <div className="flex flex-col justify-start items-start self-stretch gap-6 p-6 pb-20">
            {/* Topbar layout */}
            <div className="flex justify-between items-center self-stretch h-20 px-6 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex justify-start items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  CURRENT SESSION
                </span>
                <div className="w-px h-4 bg-slate-200" />
                <span className="text-sm font-semibold text-[#002147]">
                  {selectedClass.name}
                </span>
              </div>
              <div className="flex justify-start items-center gap-6">
                <div
                  onClick={() => alert("Thực hiện điểm danh nhanh")}
                  className="flex justify-center items-center px-6 py-2 rounded-full bg-[#002147] text-white font-bold text-xs uppercase cursor-pointer hover:opacity-90 transition-all shadow-sm"
                >
                  CHECK-IN
                </div>
                <div className="flex justify-start items-center gap-4 text-[#002147]/60">
                  <button className="hover:text-slate-900 transition-colors">
                    <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
                      <path
                        d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button className="hover:text-slate-900 transition-colors">
                    <svg width={21} height={20} viewBox="0 0 21 20" fill="none">
                      <path
                        d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[#002147]">
                        Capt. Nguyen
                      </span>
                      <span className="text-[10px] uppercase text-[#002147]/60">
                        CHIEF INSTRUCTOR
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#c5a059] bg-gradient-to-br from-[#002147] to-[#036] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      CN
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breadcrumb section */}
            <div className="flex justify-between items-center w-full mt-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCreatingSessionInClass(false)}
                  className="flex justify-center items-center w-12 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z"
                      fill="#002147"
                    />
                  </svg>
                </button>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-bold text-[#002147]">
                    Tạo Buổi Học Mới
                  </h1>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Lớp Huấn Luyện</span>
                    <span>/</span>
                    <span className="text-[#c5a059]">
                      Khóa {selectedClass.courseKey}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form grid layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Form Elements */}
              <div className="lg:col-span-2 flex flex-col gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                    THÔNG TIN BUỔI HỌC
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-[#c5a059] bg-[#c5a059]/10 uppercase tracking-wide">
                    BẮT BUỘC
                  </span>
                </div>

                {/* Session Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    TÊN BUỔI HỌC
                  </label>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="VD: Buổi 1: Lý thuyết cơ bản khí động học"
                    className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] placeholder-slate-400/70 focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Date & Start Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      NGÀY THỰC HIỆN
                    </label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      THỜI GIAN BẮT ĐẦU
                    </label>
                    <input
                      type="time"
                      value={newSessionTime}
                      onChange={(e) => setNewSessionTime(e.target.value)}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Content & Goals */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    NỘI DUNG & MỤC TIÊU HUẤN LUYỆN
                  </label>
                  <textarea
                    value={newSessionDescription}
                    onChange={(e) => setNewSessionDescription(e.target.value)}
                    placeholder="Nhập chi tiết nội dung buổi học và các mục tiêu cần đạt được trong buổi huấn luyện này..."
                    rows={6}
                    className="w-full p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-[#002147] placeholder-slate-400/70 focus:outline-none focus:border-[#c5a059] focus:bg-white transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* Right Side Settings */}
              <div className="flex flex-col gap-6">
                {/* Location */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
                      <path
                        d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 17.35C10.0333 15.4833 11.5417 13.7875 12.525 12.2625C13.5083 10.7375 14 9.38333 14 8.2C14 6.38333 13.4208 4.89583 12.2625 3.7375C11.1042 2.57917 9.68333 2 8 2C6.31667 2 4.89583 2.57917 3.7375 3.7375C2.57917 4.89583 2 6.38333 2 8.2C2 9.38333 2.49167 10.7375 3.475 12.2625C4.45833 13.7875 5.96667 15.4833 8 17.35ZM8 20C5.31667 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6792 0 9.86667 0 8.2C0 5.7 0.804167 3.70833 2.4125 2.225C4.02083 0.741667 5.88333 0 8 0C10.1167 0 11.9792 0.741667 13.5875 2.225C15.1958 3.70833 16 5.7 16 8.2C16 9.86667 15.3375 11.6792 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                      ĐỊA ĐIỂM
                    </span>
                  </div>
                  <select
                    value={newSessionLocation}
                    onChange={(e) => setNewSessionLocation(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-[#002147] focus:outline-none focus:border-[#c5a059] transition-all"
                  >
                    <option value="Phòng Lab 302 - Cơ sở A">
                      Phòng Lab 302 - Cơ sở A
                    </option>
                    <option value="Phòng LAB-04">Phòng LAB-04</option>
                    <option value="Xưởng bảo trì A1">Xưởng bảo trì A1</option>
                    <option value="Hangar B7">Hangar B7</option>
                  </select>
                </div>

                {/* Primary Instructor */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <svg width={22} height={16} viewBox="0 0 22 16" fill="none">
                      <path
                        d="M17 10V7H14V5H17V2H19V5H22V7H19V10H17ZM8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
                        fill="#C5A059"
                      />
                    </svg>
                    <span className="font-bold text-xs text-[#002147] uppercase tracking-wider">
                      GIẢNG VIÊN PHỤ TRÁCH
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-start items-center gap-3 p-3 rounded-xl bg-[#002147]/5 border border-[#002147]/10">
                      <div className="w-8 h-8 rounded-full border border-[#c5a059] bg-gradient-to-br from-[#002147] to-[#036] flex items-center justify-center text-white font-bold text-xs">
                        CN
                      </div>
                      <p className="text-xs font-bold text-[#002147]">
                        Capt. Nguyen (Bạn)
                      </p>
                    </div>

                    {assistInstructors.map((ins, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fadeIn"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[#002147] font-bold text-xs">
                            {ins.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            {ins}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAssistInstructors((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt("Nhập tên giảng viên hỗ trợ:");
                        if (name && name.trim()) {
                          setAssistInstructors((prev) => [
                            ...prev,
                            name.trim(),
                          ]);
                        }
                      }}
                      className="flex justify-center items-center py-3 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 transition-colors text-[11px] font-bold text-[#002147]/50"
                    >
                      + THÊM GIẢNG VIÊN HỖ TRỢ
                    </button>
                  </div>
                </div>

                {/* Banner rules */}
                <div
                  className="flex justify-start items-center p-6 rounded-2xl border border-[#002147] relative overflow-hidden h-40"
                  style={{
                    background:
                      "linear-gradient(171.07deg, #002147 -113.1%, #036 213.1%)",
                  }}
                >
                  <div className="absolute right-[-10px] top-6 opacity-10 pointer-events-none">
                    <svg width={88} height={83} viewBox="0 0 88 83" fill="none">
                      <path
                        d="M19.2558 92.8527L21.8547 80.6258L38.71 73.474L42.4524 55.8673L-0.000138134 63.2012L3.11854 48.529L48.066 29.4573L52.6401 7.93805C53.2118 5.24814 54.659 3.149 56.9817 1.64062C59.3044 0.13224 61.8108 -0.33607 64.5007 0.235688C67.1906 0.807446 69.2897 2.25468 70.7981 4.57738C72.3065 6.90008 72.7748 9.40638 72.203 12.0963L67.629 33.6155L100.933 69.3202L97.8147 83.9924L62.0153 60.0255L58.2729 77.6322L70.7621 91.0214L68.1632 103.248L45.2688 90.7144L19.2558 92.8527Z"
                        fill="white"
                        fillOpacity="0.05"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5 z-10">
                    <h4 className="text-lg font-bold text-white leading-snug">
                      Quy chuẩn Huấn Luyện Bay
                    </h4>
                    <p className="text-xs italic text-white/70 leading-relaxed">
                      "Sự an toàn và chính xác là nền tảng của mọi chuyến bay
                      thành công. Hãy đảm bảo nội dung bài học tuân thủ tiêu
                      chuẩn ICAO."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="w-full flex justify-end items-center gap-4 border-t border-slate-200 pt-6 mt-6">
              <button
                type="button"
                onClick={() => setCreatingSessionInClass(false)}
                className="px-8 py-3 rounded-full hover:bg-slate-100 text-xs font-bold text-[#002147] transition-all uppercase tracking-wider"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                onClick={handleCreateSession}
                className="px-8 py-3 rounded-full text-white text-xs font-bold transition-all hover:opacity-90 active:scale-95 uppercase tracking-wider shadow-md hover:shadow-lg"
                style={{
                  background:
                    "linear-gradient(159.93deg, #c5a059 -27.55%, #a68045 127.55%)",
                }}
              >
                XÁC NHẬN TẠO BUỔI HỌC
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (attendanceModalSession) {
      return (
        <div className="flex flex-col justify-start items-start w-full relative bg-slate-50 animate-fadeIn">
          <div className="flex flex-col justify-start items-start self-stretch gap-5 p-6 pb-20">
            {/* Breadcrumb section */}
            <div className="flex flex-col justify-start items-start self-stretch gap-1">
              <div className="flex justify-start items-center self-stretch gap-1.5 text-xs">
                <div
                  className="flex flex-col justify-start items-start relative cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    setAttendanceModalSession(null);
                    setSelectedClass(null);
                  }}
                >
                  <p className="text-slate-600 font-medium">Training History</p>
                </div>
                <div className="flex flex-col justify-start items-start relative">
                  <svg
                    width={5}
                    height={7}
                    viewBox="0 0 5 7"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path
                      d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
                      fill="#475569"
                    />
                  </svg>
                </div>
                <div
                  className="flex flex-col justify-start items-start relative cursor-pointer hover:text-[#002147]"
                  onClick={() => setAttendanceModalSession(null)}
                >
                  <p className="text-slate-600 font-medium">
                    Chi tiết lịch sử điểm danh
                  </p>
                </div>
                <div className="flex flex-col justify-start items-start relative">
                  <svg
                    width={5}
                    height={7}
                    viewBox="0 0 5 7"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path
                      d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
                      fill="#475569"
                    />
                  </svg>
                </div>
                <div className="flex flex-col justify-start items-start relative">
                  <p className="font-semibold text-[#c5a059]">
                    Ghi nhận điểm danh
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-start items-start self-stretch mt-1">
                <p className="self-stretch text-2xl font-bold text-left text-[#002147]">
                  Ghi nhận &amp; Cập nhật điểm danh
                </p>
              </div>
            </div>

            {/* Main Content Info Block */}
            <div className="flex flex-col justify-start items-start self-stretch gap-6 w-full mt-2">
              <div className="flex flex-col justify-start items-start self-stretch gap-6 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center self-stretch gap-4">
                  <div className="flex flex-col justify-start items-start gap-1">
                    <div className="flex justify-start items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                        LỚP HỌC
                      </span>
                      <svg
                        width={5}
                        height={7}
                        viewBox="0 0 5 7"
                        fill="none"
                        className="opacity-50"
                      >
                        <path
                          d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
                          fill="#64748B"
                        />
                      </svg>
                      <span className="text-[10px] font-bold text-[#c5a059] tracking-wider uppercase">
                        {selectedClass.code}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#002147]">
                      {selectedClass.name} - Khóa {selectedClass.courseKey}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreatingSessionInClass(true)}
                    className="flex justify-start items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all shrink-0"
                    style={{
                      background:
                        "linear-gradient(166.62deg, #002147 -61.08%, #036 161.08%)",
                    }}
                  >
                    <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                      <path
                        d="M6.75 11.25H8.25V8.25H11.25V6.75H8.25V3.75H6.75V6.75H3.75V8.25H6.75V11.25ZM7.5 15C6.4625 15 5.4875 14.8031 4.575 14.4094C3.6625 14.0156 2.86875 13.4812 2.19375 12.8062C1.51875 12.1312 0.984375 11.3375 0.590625 10.425C0.196875 9.5125 0 8.5375 0 7.5C0 6.4625 0.196875 5.4875 0.590625 4.575C0.984375 3.6625 1.51875 2.86875 2.19375 2.19375C2.86875 1.51875 3.6625 0.984375 4.575 0.590625C5.4875 0.196875 6.4625 0 7.5 0C8.5375 0 9.5125 0.196875 10.425 0.590625C11.3375 0.984375 12.1312 1.5 12.8062 2.19375C13.4812 2.86875 14.0156 3.6625 14.4094 4.575C14.8031 5.4875 15 6.4625 15 7.5C15 8.5375 14.8031 9.5125 14.4094 10.425C14.0156 11.3375 12.8062 12.8062 11.7563 13.5C10.5938 14.8031 9.175 15 7.5 15Z"
                        fill="white"
                      />
                    </svg>
                    TẠO BUỔI HỌC
                  </button>
                </div>

                {/* Steps stepper indicator */}
                <div className="w-full border-t border-slate-100 pt-5 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex flex-row justify-between items-center w-full gap-4 relative">
                    <div className="absolute left-8 right-8 top-5 h-0.5 bg-slate-200 z-0 hidden md:block">
                      <div
                        className="h-full bg-gradient-to-r from-[#002147] to-[#c5a059]"
                        style={{ width: "40%" }}
                      />
                    </div>

                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-xs shadow-md border-4 border-white">
                        1
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                        CHUẨN BỊ
                      </span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c5a059] to-[#d4af37] text-[#002147] flex items-center justify-center font-bold text-xs shadow-md border-4 border-white">
                        2
                      </div>
                      <span className="text-[9px] font-bold text-[#002147] tracking-wider">
                        ĐIỂM DANH
                      </span>
                    </div>

                    {/* Step 3 */}
                    <div
                      onClick={() => {
                        setAttendanceModalSession(null);
                        setSessionSubTab("evaluation");
                      }}
                      className="flex flex-col items-center gap-2 z-10 flex-1 cursor-pointer hover:opacity-80 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center font-semibold text-xs border-4">
                        3
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                        ĐÁNH GIÁ
                      </span>
                    </div>

                    {/* Step 4 */}
                    <div
                      onClick={() => {
                        setAttendanceModalSession(null);
                        setSessionSubTab("evidence");
                      }}
                      className="flex flex-col items-center gap-2 z-10 flex-1 cursor-pointer hover:opacity-80 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center font-semibold text-xs border-4">
                        4
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                        HOÀN TẤT
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table wrapper */}
              <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#002147] text-white">
                        <th className="px-6 py-3.5 font-bold uppercase w-[80px] text-center">
                          STT
                        </th>
                        <th className="px-6 py-3.5 font-bold uppercase min-w-[200px]">
                          HỌC VIÊN
                        </th>
                        <th className="px-6 py-3.5 font-bold uppercase w-[120px]">
                          MÃ SỐ
                        </th>
                        <th className="px-6 py-3.5 text-center w-[220px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="opacity-80 text-[8px] font-bold text-[#c5a059] tracking-wider">
                              {attendanceModalSession.date}
                            </span>
                            <span className="font-bold tracking-wide">
                              BUỔI SÁNG
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3.5 text-center w-[220px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="opacity-80 text-[8px] font-bold text-[#c5a059] tracking-wider">
                              {attendanceModalSession.date}
                            </span>
                            <span className="font-bold tracking-wide">
                              BUỔI CHIỀU
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3.5 w-[100px] text-right pr-6">
                          NOTE
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessionAttendance.map((student, sIdx) => {
                        const formattedStt = String(sIdx + 1).padStart(2, "0");
                        return (
                          <tr
                            key={student.code}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-3 text-center text-slate-400 font-semibold">
                              {formattedStt}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002147] to-[#036] border border-slate-200 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                  {student.avatar}
                                </div>
                                <span className="font-bold text-[#002147]">
                                  {student.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-slate-500 font-medium">
                              {student.code}
                            </td>

                            {/* Morning Attendance Buttons */}
                            <td className="px-6 py-3">
                              <div className="flex justify-center items-center gap-1.5">
                                {["P", "AE", "AU", "T"].map((opt) => {
                                  const isSelected = student.morning === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        handleToggleAttendance(
                                          student.code,
                                          "morning",
                                          opt,
                                        )
                                      }
                                      className={`w-7 h-7 rounded border font-bold text-[9px] flex items-center justify-center transition-all ${
                                        isSelected
                                          ? "bg-[#002147] text-white border-[#002147] shadow-[0px_0px_0px_2px_#002147]"
                                          : "border-slate-200 text-slate-400 hover:bg-slate-50"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Afternoon Attendance Buttons */}
                            <td className="px-6 py-3">
                              <div className="flex justify-center items-center gap-1.5">
                                {["P", "AE", "AU", "T"].map((opt) => {
                                  const isSelected = student.afternoon === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        handleToggleAttendance(
                                          student.code,
                                          "afternoon",
                                          opt,
                                        )
                                      }
                                      className={`w-7 h-7 rounded border font-bold text-[9px] flex items-center justify-center transition-all ${
                                        isSelected
                                          ? "bg-[#002147] text-white border-[#002147] shadow-[0px_0px_0px_2px_#002147]"
                                          : "border-slate-200 text-slate-400 hover:bg-slate-50"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Document note action */}
                            <td className="px-6 py-3 text-right pr-6">
                              <button
                                type="button"
                                onClick={() =>
                                  alert(
                                    `Ghi chú học vụ cho học viên: ${student.name}`,
                                  )
                                }
                                className="p-1 text-slate-300 hover:text-[#c5a059] transition-colors"
                              >
                                <svg
                                  width={14}
                                  height={14}
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M1.66667 13.3333H9.16667V9.16667H13.3333V1.66667H1.66667V13.3333ZM1.66667 15C1.20833 15 0.815972 14.8368 0.489583 14.5104C0.163194 14.184 0 13.7917 0 13.3333V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H13.3333C13.7917 0 14.184 0.163194 14.5104 0.489583C14.8368 0.815972 15 1.20833 15 1.66667V10L10 15H1.66667ZM3.33333 9.16667V7.5H7.5V9.16667H3.33333ZM3.33333 5.83333V4.16667H11.6667V5.83333H3.33333"
                                    fill="currentColor"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm Lock Attendance */}
              <div className="w-full flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    alert("Khóa dữ liệu điểm danh thành công!");
                    setAttendanceModalSession(null);
                  }}
                  className="w-full max-w-[360px] py-3 rounded-lg text-white font-bold text-center text-xs uppercase shadow-lg transition-transform active:scale-98 hover:opacity-95 hover:shadow-xl"
                  style={{
                    background:
                      "linear-gradient(174.05deg, #002147 -192.6%, #036 292.6%)",
                    boxShadow:
                      "0px 10px 15px -3px rgba(0,33,71,0.2), 0px 4px 6px -4px rgba(0,33,71,0.2)",
                  }}
                >
                  CONFIRM &amp; LOCK ATTENDANCE
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col justify-start items-start w-full relative bg-slate-50">
        <div className="flex flex-col justify-start items-start self-stretch gap-5 p-6 pb-20">
          {/* Breadcrumb section */}
          <div className="flex flex-col justify-start items-start self-stretch gap-1">
            <div className="flex justify-start items-center self-stretch gap-1.5">
              <div
                className="flex flex-col justify-start items-start relative cursor-pointer hover:text-slate-900"
                onClick={() => setSelectedClass(null)}
              >
                <p className="text-sm text-slate-600 font-medium">
                  Training History
                </p>
              </div>
              <div className="flex flex-col justify-start items-start relative">
                <svg
                  width={5}
                  height={7}
                  viewBox="0 0 5 7"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
                    fill="#475569"
                  />
                </svg>
              </div>
              <div className="flex flex-col justify-start items-start relative">
                <p className="text-sm font-semibold text-[#002147]">
                  Chi tiết lịch sử điểm danh
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-start items-start self-stretch mt-1">
              <p className="self-stretch text-2xl font-bold text-left text-[#002147]">
                Chi tiết lịch sử điểm danh
              </p>
            </div>
          </div>

          {/* Cards Flex Row Container */}
          <div className="flex flex-col lg:flex-row gap-5 w-full pt-1">
            {/* Left Card: Class Info Box */}
            <div
              className="flex justify-start items-center flex-grow p-6 rounded-xl bg-white border border-slate-200"
              style={{ boxShadow: "0px 1px 2px 0 rgba(0,0,0,0.05)" }}
            >
              <div className="flex justify-start items-center gap-6">
                <div className="flex justify-center items-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#002147] to-[#036] shrink-0 relative">
                  <div
                    className="rounded-xl bg-white/0 absolute inset-0"
                    style={{
                      boxShadow:
                        "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
                    }}
                  />
                  <div className="flex flex-col justify-start items-start relative z-10">
                    <svg
                      width={28}
                      height={25}
                      viewBox="0 0 35 31"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0"
                    >
                      <path
                        d="M3.33333 30.25V26.9167H33.3333V30.25H3.33333ZM6.25 21.9167L0 11.5L4 10.4167L8.66667 14.3333L14.5 12.7917L5.875 1.29167L10.7083 0L23.1667 10.4583L30.25 8.54167C31.1389 8.29167 31.9792 8.39583 32.7708 8.85417C33.5625 9.3125 34.0833 9.98611 34.3333 10.875C34.5833 11.7639 34.4792 12.6042 34.0208 13.3958C33.5625 14.1875 32.8889 14.9583 32 14.9583L6.25 21.9167Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col justify-start items-start gap-1">
                  <div className="flex justify-start items-start px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    <p className="text-[9px] text-left font-bold text-[#002147] tracking-wide">
                      AIRBUS A320 SERIES
                    </p>
                  </div>
                  <div className="flex flex-col justify-start items-start self-stretch pt-0.5">
                    <p className="text-base font-bold text-left text-slate-900 leading-tight">
                      {selectedClass.name} - Lớp{" "}
                      {selectedClass.courseKey === "24" ? "A1" : "B2"}
                    </p>
                  </div>
                  <div className="flex justify-start items-start self-stretch gap-6 mt-0.5">
                    <div className="flex justify-start items-center gap-1">
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0"
                      >
                        <path
                          d="M6 6C5.175 6 4.46875 5.70625 3.88125 5.11875C3.29375 4.53125 3 3.825 3 3C3 2.175 3.29375 1.46875 3.88125 0.88125C4.46875 0.29375 5.175 0 6 0C6.825 0 7.53125 0.29375 8.11875 0.88125C8.70625 1.46875 9 2.175 9 3C9 3.825 8.70625 4.53125 8.11875 5.11875C7.53125 5.70625 6.825 6 6 6ZM0 12V9.9C0 9.475 0.109375 9.08437 0.328125 8.72812C0.546875 8.37187 0.8375 8.1 1.2 7.9125C1.975 7.525 2.7625 7.23438 3.5625 7.04063C4.3625 6.84688 5.175 6.75 6 6.75C6.825 6.75 7.6375 6.84688 8.4375 7.04063C9.2375 7.23438 10.025 7.525 10.8 7.9125C11.1625 8.1 11.4531 8.37187 11.6719 8.72812C11.8906 9.08437 12 9.475 12 9.9V12H0ZM1.5 10.5H10.5V9.9C10.5 9.7625 10.4656 9.6375 10.3969 9.525C10.3281 9.4125 10.2375 9.325 10.125 9.2625C9.45 8.925 8.76875 8.67188 8.08125 8.50313C7.39375 8.33438 6.7 8.25 6 8.25C5.3 8.25 4.60625 8.33438 3.91875 8.50313C3.23125 8.67188 2.55 8.925 1.875 9.2625C1.7625 9.325 1.67188 9.4125 1.60312 9.525C1.53437 9.6375 1.5 9.7625 1.5 9.9V10.5ZM6 4.5C6.4125 4.5 6.76562 4.35312 7.05937 4.05937C7.35312 3.76562 7.5 3.4125 7.5 3C7.5 2.5875 7.35312 2.23438 7.05937 1.94062C6.76562 1.64687 6.4125 1.5 6 1.5C5.5875 1.5 5.23438 1.64687 4.94063 1.94062C4.64688 2.23438 4.5 2.5875 4.5 3C4.5 3.4125 4.64688 3.76562 4.94063 4.05937C5.23438 4.35312 5.5875 4.5 6 4.5Z"
                          fill="#C5A059"
                        />
                      </svg>
                      <p className="text-xs text-left">
                        <span className="text-slate-600">Giảng viên: </span>
                        <span className="font-semibold text-slate-900">
                          Nguyễn Văn A
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-start items-center gap-1">
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 14 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0"
                      >
                        <path
                          d="M1.5 15C1.0875 15 0.734375 14.8531 0.440625 14.5594C0.146875 14.2656 0 13.9125 0 13.5V3C0 2.5875 0.146875 2.23438 0.440625 1.94062C0.734375 1.64687 1.0875 1.5 1.5 1.5H2.25V0H3.75V1.5H9.75V0H11.25V1.5H12C12.4125 1.5 12.7656 1.64687 13.0594 1.94062C13.3531 2.23438 13.5 2.5875 13.5 3V13.5C13.5 13.9125 13.3531 14.2656 13.0594 14.5594C12.7656 14.8531 12.4125 15 12 15H1.5ZM1.5 13.5H12V6H1.5V13.5ZM1.5 4.5H12V3H1.5V4.5ZM1.5 4.5V3V4.5Z"
                          fill="#C5A059"
                        />
                      </svg>
                      <p className="text-xs text-left text-slate-600">
                        {selectedClass.schedule}
                      </p>
                    </div>
                    <div className="flex justify-start items-center gap-1">
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0"
                      >
                        <path
                          d="M9.975 11.025L11.025 9.975L8.25 7.2V3.75H6.75V7.8L9.975 11.025ZM7.5 15C6.4625 15 5.4875 14.8031 4.575 14.4094C3.6625 14.0156 2.86875 13.4812 2.19375 12.8062C1.51875 12.1312 0.984375 11.3375 0.590625 10.425C0.196875 9.5125 0 8.5375 0 7.5C0 6.4625 0.196875 5.4875 0.590625 4.575C0.984375 3.6625 1.51875 2.86875 2.19375 2.19375C2.86875 1.51875 3.6625 0.984375 4.575 0.590625C5.4875 0.196875 6.4625 0 7.5 0C8.5375 0 9.5125 0.196875 10.425 0.590625C11.3375 0.984375 12.1312 1.51875 12.8062 2.19375C13.4812 2.86875 14.0156 3.6625 14.4094 4.575C14.8031 5.4875 15 6.4625 15 7.5C15 8.5375 14.8031 9.5125 14.4094 10.425C14.0156 11.3375 13.4812 12.1312 12.8062 12.8062C12.1312 13.4812 11.3375 14.0156 10.425 14.4094C9.5125 14.8031 8.5375 15 7.5 15ZM7.5 13.5C9.1625 13.5 10.5781 12.9156 11.7469 11.7469C12.9156 10.5781 13.5 9.1625 13.5 7.5C13.5 5.8375 12.9156 4.42188 11.7469 3.25312C10.5781 2.08437 9.1625 1.5 7.5 1.5C5.8375 1.5 4.42188 2.08437 3.25312 3.25312C2.08437 4.42188 1.5 5.8375 1.5 7.5C1.5 9.1625 2.08437 10.5781 3.25312 11.7469C4.42188 12.9156 5.8375 13.5 7.5 13.5Z"
                          fill="#C5A059"
                        />
                      </svg>
                      <p className="text-xs text-left text-slate-600">
                        {selectedClass.time || "08:00 - 11:30"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Performance Analysis Card */}
            <div
              className="flex justify-between items-center w-full lg:w-[450px] p-6 rounded-xl border border-[#002147] shrink-0 overflow-hidden relative"
              style={{
                background:
                  "linear-gradient(160.59deg, #002147 -29.75%, #036 129.75%)",
                boxShadow:
                  "0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)",
              }}
            >
              <div className="w-[160.02px] h-40 absolute right-[-20px] top-0 opacity-10 pointer-events-none">
                <p className="text-[140px] font-bold text-left text-white leading-none">
                  ETR
                </p>
              </div>
              <div className="flex flex-col justify-start items-start gap-1 z-10">
                <div>
                  <p className="text-[9px] font-bold text-left uppercase text-[#c5a059] tracking-wider">
                    PERFORMANCE ANALYSIS
                  </p>
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-left text-white">
                    Total Attendance Rate
                  </p>
                </div>
                <div className="opacity-80 mt-0.5">
                  <p className="text-xs text-left text-white">
                    Active Sessions: 12/15
                  </p>
                </div>
              </div>
              <div className="flex justify-center items-center relative z-10 shrink-0">
                <svg
                  width={80}
                  height={80}
                  viewBox="0 0 96 96"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-20 h-20"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="white"
                    strokeOpacity="0.1"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#C5A059"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * 88) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <p className="absolute text-sm font-bold text-white">88%</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center self-stretch gap-4 px-4 py-3 rounded-xl bg-white border border-slate-200"
            style={{ boxShadow: "0px 1px 2px 0 rgba(0,0,0,0.05)" }}
          >
            <div className="flex flex-col justify-start items-start w-full sm:w-[320px] relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#c5a059] transition-all"
                placeholder="Tìm kiếm buổi học, mã học phần..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
              />
              <div className="absolute left-3.5 top-[10px] text-slate-400">
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>

            <div className="flex justify-start items-center gap-3">
              <button
                onClick={() => alert("Bộ lọc dữ liệu đang được cập nhật.")}
                className="flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <svg
                  width={12}
                  height={8}
                  viewBox="0 0 15 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.83333 10V8.33333H9.16667V10H5.83333ZM2.5 5.83333V4.16667H12.5V5.83333H2.5ZM0 1.66667V0H15V1.66667H0Z"
                    fill="currentColor"
                  />
                </svg>
                Lọc dữ liệu
              </button>

              <button
                onClick={() => setCreatingSessionInClass(true)}
                className="flex justify-center items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold text-xs shadow-sm transition-all hover:opacity-90 active:scale-95"
                style={{
                  background:
                    "linear-gradient(166.66deg, #002147 -61.33%, #036 161.33%)",
                }}
              >
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 6.66667H0V5H5V0H6.66667V5H11.6667V6.66667H6.66667V11.6667H5V6.66667Z"
                    fill="white"
                  />
                </svg>
                Tạo Buổi Học
              </button>
            </div>
          </div>

          {/* Sessions List Table */}
          <div className="flex flex-col justify-start items-start self-stretch rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden w-full">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[70px] text-center">
                      STT
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[120px]">
                      NGÀY HỌC
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] min-w-[260px]">
                      TÊN BUỔI HỌC
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[180px]">
                      GIẢNG VIÊN
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[90px] text-center">
                      SĨ SỐ
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[150px]">
                      TỶ LỆ
                    </th>
                    <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[220px] text-right pr-8">
                      THAO TÁC
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map((session) => {
                    let badgeBg =
                      "bg-green-50 border-green-100 text-emerald-600";
                    let progressBg = "bg-emerald-600";
                    let progressVal = `${session.rate}%`;

                    if (session.color === "amber") {
                      badgeBg = "bg-amber-50 border-amber-100 text-amber-600";
                      progressBg = "bg-amber-600";
                    } else if (session.color === "indigo") {
                      badgeBg =
                        "bg-indigo-50 border-indigo-100 text-indigo-600";
                      progressBg = "bg-indigo-600";
                    }

                    return (
                      <tr
                        key={session.stt}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-center text-slate-500 font-semibold">
                          {session.stt}
                        </td>
                        <td className="px-6 py-3.5 text-slate-900 font-medium">
                          {session.date}
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-[#002147] leading-tight">
                            {session.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {session.room}
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-slate-900 font-medium">
                          {session.instructor}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-bold ${badgeBg}`}
                          >
                            {session.attendance}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-grow h-1.5 relative overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full ${progressBg}`}
                                style={{ width: progressVal }}
                              />
                            </div>
                            <span className="shrink-0 font-bold text-slate-700">
                              {session.rate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right pr-8">
                          <div className="flex justify-end items-center gap-4">
                            <button
                              onClick={() => setAttendanceModalSession(session)}
                              className="flex justify-start items-center gap-1.5 px-3 py-1.5 rounded bg-[#002147] hover:bg-[#002147]/95 transition-all text-white font-bold text-[10px] shadow-sm"
                            >
                              <svg
                                width={12}
                                height={12}
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M5.73333 9.73333L10.4333 5.03333L9.5 4.1L5.73333 7.86667L3.83333 5.96667L2.9 6.9L5.73333 9.73333ZM6.66667 13.3333C5.74444 13.3333 4.87778 13.1583 4.06667 12.8083C3.25556 12.4583 2.55 11.9833 1.95 11.3833C1.35 10.7833 0.875 10.0778 0.525 9.26667C0.175 8.45555 0 7.58889 0 6.66667C0 5.74444 0.175 4.87778 0.525 4.06667C0.875 3.25556 1.35 2.55 1.95 1.95C2.55 1.35 3.25556 0.875 4.06667 0.525C4.87778 0.175 5.74444 0 6.66667 0C7.58889 0 8.45555 0.175 9.26667 0.525C10.0778 0.875 10.7833 1.35 11.3833 1.95C11.9833 2.55 12.4583 3.25556 12.8083 4.06667C13.1583 4.87778 13.3333 5.74444 13.3333 6.66667C13.3333 7.58889 13.1583 8.45555 12.8083 9.26667C12.4583 10.0778 11.9833 10.7833 11.3833 11.3833C10.7833 11.9833 10.0778 12.4583 9.26667 12.8083C8.45555 13.1583 7.58889 13.3333 6.66667 13.3333ZM6.66667 12C8.15556 12 9.41667 11.4833 10.45 10.45C11.4833 9.41667 12 8.15556 12 6.66667C12 5.17778 11.4833 3.91667 10.45 2.88333C9.41667 1.85 8.15556 1.33333 6.66667 1.33333C5.17778 1.33333 3.91667 1.85 2.88333 2.88333C1.85 3.91667 1.33333 5.17778 1.33333 6.66667C1.33333 8.15556 1.85 9.41667 2.88333 10.45C3.91667 11.4833 5.17778 12 6.66667 12Z"
                                  fill="white"
                                />
                              </svg>
                              Điểm danh
                            </button>
                            <button
                              onClick={() => {
                                setViewingSessionDetails(session);
                                setSessionSubTab("evaluation");
                              }}
                              className="flex items-center gap-1 font-bold text-[#c5a059] hover:underline focus:outline-none"
                            >
                              Xem chi tiết
                              <svg
                                width={9}
                                height={9}
                                viewBox="0 0 11 11"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M8.11667 6H0V4.66667H8.11667L4.38333 0.933333L5.33333 0L10.6667 5.33333L5.33333 10.6667L4.38333 9.73333L8.11667 6Z"
                                  fill="#C5A059"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex justify-between items-center self-stretch px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs">
              <div>
                <p className="italic text-slate-600 font-semibold">
                  Hiển thị 1-10 trên 15 buổi học
                </p>
              </div>
              <div className="flex justify-start items-center gap-2">
                <button className="flex justify-center items-center w-7 h-7 opacity-50 rounded bg-white border border-slate-200 cursor-not-allowed">
                  <svg
                    width={5}
                    height={8}
                    viewBox="0 0 6 9"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.5 9L0 4.5L4.5 0L5.55 1.05L2.1 4.5L5.55 7.95L4.5 9Z"
                      fill="#475569"
                    />
                  </svg>
                </button>
                <div className="flex flex-col justify-center items-center h-7 w-7 rounded bg-[#002147] text-white font-bold shadow-sm">
                  1
                </div>
                <button
                  onClick={() =>
                    alert("Chức năng phân trang đang được tích hợp.")
                  }
                  className="flex flex-col justify-center items-center h-7 w-7 rounded hover:bg-slate-100 text-slate-600 font-semibold transition-colors"
                >
                  2
                </button>
                <button
                  onClick={() =>
                    alert("Chức năng phân trang đang được tích hợp.")
                  }
                  className="flex justify-center items-center w-7 h-7 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    width={5}
                    height={8}
                    viewBox="0 0 6 9"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.5 0L6 4.5L1.5 9L0.45 7.95L3.9 4.5L0.45 1.05L1.5 0Z"
                      fill="#475569"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT CLASS LIST PAGE (Dashboard)
  return (
    <div className="flex flex-col justify-start items-start w-full relative gap-6 p-6 bg-slate-50">
      {/* Breadcrumbs */}
      <div className="flex flex-col justify-start items-start self-stretch gap-1">
        <div className="flex justify-start items-center self-stretch gap-1.5">
          <div className="flex flex-col justify-start items-start relative">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider">
              DASHBOARD
            </p>
          </div>
          <div className="flex flex-col justify-start items-start relative text-slate-400">
            <svg
              width={5}
              height={7}
              viewBox="0 0 5 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="flex flex-col justify-start items-start relative">
            <p className="text-[10px] font-bold text-[#c5a059] tracking-wider">
              LỚP HỌC
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-start items-start self-stretch mt-0.5">
          <p className="self-stretch text-2xl font-bold text-left text-[#002147]">
            Danh sách lớp học được phân công
          </p>
        </div>
      </div>

      {/* Toolbar filter */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center self-stretch gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col justify-start items-start flex-grow relative">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#002147] placeholder-gray-400 focus:outline-none focus:border-[#c5a059] transition-all"
            placeholder="Tìm theo tên lớp, mã lớp hoặc khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3.5 top-[11px] text-slate-400">
            <svg
              width={14}
              height={14}
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap tracking-wider">
            TRẠNG THÁI:
          </p>
          <div className="flex justify-start items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
            {["Tất cả", "Đang diễn ra", "Sắp tới", "Hoàn thành"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded text-[10px] font-bold text-center transition-all ${
                  statusFilter === tab
                    ? "bg-white text-[#002147] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex justify-center items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-bold transition-all ${
              showAdvanced || courseKey || hasScheduleOnly
                ? "bg-[#002147] text-white border-[#002147]"
                : "bg-white text-[#002147] border-slate-300 hover:bg-slate-50"
            }`}
          >
            <svg
              width={12}
              height={8}
              viewBox="0 0 15 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.83333 10V8.33333H9.16667V10H5.83333ZM2.5 5.83333V4.16667H12.5V5.83333H2.5ZM0 1.66667V0H15V1.66667H0Z"
                fill="currentColor"
              />
            </svg>
            BỘ LỌC NÂNG CAO
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showAdvanced && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm animate-fadeIn">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Chọn Khóa Học
            </label>
            <select
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#002147] focus:outline-none focus:border-[#c5a059]"
              value={courseKey}
              onChange={(e) => setCourseKey(e.target.value)}
            >
              <option value="">Tất cả các khóa</option>
              <option value="22">Khóa 22</option>
              <option value="24">Khóa 24</option>
              <option value="25">Khóa 25</option>
              <option value="26">Khóa 26</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="hasScheduleOnly"
              className="w-3.5 h-3.5 text-[#c5a059] border-slate-300 rounded focus:ring-[#c5a059]"
              checked={hasScheduleOnly}
              onChange={(e) => setHasScheduleOnly(e.target.checked)}
            />
            <label
              htmlFor="hasScheduleOnly"
              className="text-[11px] font-bold text-slate-600 cursor-pointer select-none"
            >
              Chỉ hiển thị lớp đã sắp xếp lịch dạy
            </label>
          </div>
        </div>
      )}

      {/* Count Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Card 1: Lớp đang dạy */}
        <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-[#002147] text-white shadow-sm overflow-hidden relative group h-24">
          <div className="flex justify-center items-center w-12 h-12 rounded-lg bg-white/10 border border-white/10 backdrop-blur z-10 shrink-0">
            <svg
              width={20}
              height={22}
              viewBox="0 0 26 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.6667 28C16.8222 28 15.25 27.35 13.95 26.05C12.65 24.75 12 23.1778 12 21.3333C12 19.4889 12.65 17.9167 13.95 16.6167C15.25 15.3167 16.8222 14.6667 18.6667 14.6667C20.5111 14.6667 22.0833 15.3167 23.3833 16.6167C24.6833 17.9167 25.3333 19.4889 25.3333 21.3333C25.3333 23.1778 24.6833 24.75 23.3833 26.05C22.0833 27.35 20.5111 28 18.6667 28ZM20.9 24.5L21.8333 23.5667L19.3333 21.0667V17.3333H18V21.6L20.9 24.5ZM2.66667 26.6667C1.93333 26.6667 1.30556 26.4056 0.783333 25.8833C0.261111 25.3611 0 24.7333 0 24V5.33333C0 4.6 0.261111 3.97222 0.783333 3.45C1.30556 2.92778 1.93333 2.66667 2.66667 2.66667H8.23333C8.47778 1.88889 8.95556 1.25 9.66667 0.75C10.3778 0.25 11.1556 0 12 0C12.8889 0 13.6833 0.25 14.3833 0.75C15.0833 1.25 15.5556 1.88889 15.8 2.66667H21.3333C22.0667 2.66667 22.6944 2.92778 23.2167 3.45C23.7389 3.97222 24 4.6 24 5.33333V13.6667C23.6 13.3778 23.1778 13.1333 22.7333 12.9333C22.2889 12.7333 21.8222 12.5556 21.3333 12.4V5.33333H18.6667V9.33333H5.33333V5.33333H2.66667V24H9.73333C9.88889 24.4889 10.0667 24.9556 10.2667 25.4C10.4667 25.8444 10.7111 26.2667 11 26.6667H2.66667ZM12 5.33333C12.3778 5.33333 12.6944 5.20556 12.95 4.95C13.2056 4.69444 13.3333 4.37778 13.3333 4C13.3333 3.62222 13.2056 3.30556 12.95 3.05C12.6944 2.79444 12.3778 2.66667 12 2.66667C11.6222 2.66667 11.3056 2.79444 11.05 3.05C10.7944 3.30556 10.6667 3.62222 10.6667 4C10.6667 4.37778 10.7944 4.69444 11.05 4.95C11.3056 5.20556 11.6222 5.33333 12 5.33333Z"
                fill="#C5A059"
              />
            </svg>
          </div>
          <div className="z-10">
            <p className="text-[9px] font-bold text-white/50 tracking-wider uppercase">
              LỚP ĐANG DẠY
            </p>
            <p className="text-2xl font-bold mt-0.5">
              {stats.ongoing.toString().padStart(2, "0")}
            </p>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/5 absolute right-[-10px] bottom-[-10px] pointer-events-none" />
        </div>

        {/* Card 2: Lớp sắp tới */}
        <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-white border border-slate-200 shadow-sm h-24">
          <div className="flex justify-center items-center w-12 h-12 rounded-lg bg-[#c5a059]/10 shrink-0">
            <svg
              width={20}
              height={22}
              viewBox="0 0 27 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.6667 26.6667V24H24V10.6667H5.33333V16H2.66667V5.33333C2.66667 4.6 2.92778 3.97222 3.45 3.45C3.97222 2.92778 4.6 2.66667 5.33333 2.66667H6.66667V0H9.33333V2.66667H20V0H22.6667V2.66667H24C24.7333 2.66667 25.3611 2.92778 25.8833 3.45C26.4056 3.97222 26.6667 4.6 26.6667 5.33333V24C26.6667 24.7333 26.4056 25.3611 25.8833 25.8833C25.3611 26.4056 24.7333 26.6667 24 26.6667H18.6667ZM9.33333 29.3333L7.46667 27.4667L10.9 24H0V21.3333H10.9L7.46667 17.8667L9.33333 16L16 22.6667L9.33333 29.3333ZM5.33333 8H24V5.33333H5.33333V8ZM5.33333 8V5.33333V8Z"
                fill="#C5A059"
              />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              LỚP SẮP TỚI
            </p>
            <p className="text-2xl font-bold text-[#002147] mt-0.5">
              {stats.upcoming.toString().padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Card 3: Đã hoàn thành */}
        <div className="flex justify-start items-center gap-5 p-5 rounded-xl bg-white border border-slate-200 shadow-sm h-24">
          <div className="flex justify-center items-center w-12 h-12 rounded-lg bg-emerald-600/10 shrink-0">
            <svg
              width={22}
              height={20}
              viewBox="0 0 30 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.1333 28L7.6 23.7333L2.8 22.6667L3.26667 17.7333L0 14L3.26667 10.2667L2.8 5.33333L7.6 4.26667L10.1333 0L14.6667 1.93333L19.2 0L21.7333 4.26667L26.5333 5.33333L26.0667 10.2667L29.3333 14L26.0667 17.7333L26.5333 22.6667L21.7333 23.7333L19.2 28L14.6667 26.0667L10.1333 28ZM11.2667 24.6L14.6667 23.1333L18.1333 24.6L20 21.4L23.6667 20.5333L23.3333 16.8L25.8 14L23.3333 11.1333L23.3333 7.4L20 6.6L18.0667 3.4L14.6667 4.86667L11.2 3.4L9.33333 6.6L5.66667 7.4L6 11.1333L3.53333 14L6 16.8L5.66667 20.6L9.33333 21.4L11.2667 24.6ZM13.2667 18.7333L20.8 11.2L18.9333 9.26667L13.2667 14.9333L10.4 12.1333L8.53333 14L13.2667 18.7333Z"
                fill="#059669"
              />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              ĐÃ HOÀN THÀNH
            </p>
            <p className="text-2xl font-bold text-[#002147] mt-0.5">
              {(stats.completed + 15).toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Class List Table */}
      <div className="flex flex-col justify-start items-start self-stretch rounded-xl bg-white border border-slate-200 shadow-sm w-full overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[60px] text-center">
                  STT
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[100px]">
                  MÃ LỚP
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] min-w-[200px]">
                  TÊN KHÓA HỌC / CHUYÊN ĐỀ
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[90px] text-center">
                  KHÓA
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[150px]">
                  LỊCH HỌC
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[90px] text-center">
                  SĨ SỐ
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[140px]">
                  TRẠNG THÁI
                </th>
                <th className="px-6 py-3.5 font-bold uppercase text-[#002147] w-[160px] text-right pr-8">
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-400 italic"
                  >
                    Không tìm thấy lớp học nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <tr
                    key={cls.code}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center text-slate-400 font-semibold">
                      {cls.stt}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#002147] leading-snug">
                      {cls.code.split("-").slice(0, 2).join("-") + "-"}
                      <br />
                      {cls.code.split("-")[2]}
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="font-bold text-[#002147] hover:text-[#c5a059] transition-colors cursor-pointer"
                        onClick={() => setSelectedClass(cls)}
                      >
                        {cls.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {cls.subName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-600">
                      Khóa {cls.courseKey}
                    </td>
                    <td className="px-6 py-4">
                      {cls.schedule === "Chưa sắp lịch" ? (
                        <p className="italic text-slate-400">Chưa sắp lịch</p>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-700">
                            {cls.schedule}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ({cls.time})
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-0.5 rounded bg-slate-100 font-bold text-[#002147]">
                        {cls.studentsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                          cls.status === "Đang diễn ra"
                            ? "bg-emerald-600/10 text-emerald-600"
                            : cls.status === "Sắp tới"
                              ? "bg-amber-600/10 text-amber-600"
                              : "bg-slate-200/50 text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            cls.status === "Đang diễn ra"
                              ? "bg-emerald-600"
                              : cls.status === "Sắp tới"
                                ? "bg-amber-600"
                                : "bg-slate-400"
                          }`}
                        />
                        {cls.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      <button
                        onClick={() => setSelectedClass(cls)}
                        className="inline-flex justify-center items-center gap-1.5 pl-4 pr-3 py-2 rounded transition-transform active:scale-95 text-white font-bold text-[10px]"
                        style={{
                          background:
                            "linear-gradient(159.93deg, #c5a059 -27.55%, #a68045 127.55%)",
                        }}
                      >
                        XEM CHI TIẾT
                        <svg
                          width={10}
                          height={8}
                          viewBox="0 0 11 8"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.66667 8L5.73333 7.03333L8.1 4.66667H0V3.33333H8.1L5.73333 0.966667L6.66667 0L10.6667 4L6.66667 8Z"
                            fill="white"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IntroductorClasses;
