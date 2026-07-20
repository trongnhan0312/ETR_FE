import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../utils/api";
import "./training-manager.scss";

const ClassStatus = () => {
  const { searchQuery = "" } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");

  // Form states for creating a new class
  const [newClassId, setNewClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassSub, setNewClassSub] = useState("");
  const [newInstructor, setNewInstructor] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newTraineesCount, setNewTraineesCount] = useState(15);
  const [newClassType, setNewClassType] = useState("Type Rating");

  // Load classes from API
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setClassesLoading(true);
    try {
      const [classData, enrollmentData, profileData] = await Promise.all([
        api.get("/Classes").catch(() => []),
        api.get("/Enrollments").catch(() => []),
        api.get("/UserProfiles").catch(() => []),
      ]);

      const clsArr = Array.isArray(classData) ? classData : [];
      const enrArr = Array.isArray(enrollmentData) ? enrollmentData : [];
      const profArr = Array.isArray(profileData) ? profileData : [];

      const mapped = clsArr.slice(0, 10).map((cls) => {
        const classEnrollments = enrArr.filter((e) => e.classId === cls.classId);
        const instructors = profArr.filter((p) =>
          classEnrollments.some((e) => e.accountId === p.accountId)
        );
        return {
          id: cls.classCode || `CL-${cls.classId}`,
          name: cls.className || `Lớp #${cls.classId}`,
          subName: cls.description || cls.courseName || "",
          instructor: instructors.length > 0 ? instructors[0]?.fullName || "Instructor" : "Chưa phân công",
          startDate: cls.startDate ? new Date(cls.startDate).toLocaleDateString("vi-VN") : "TBD",
          endDate: cls.endDate ? new Date(cls.endDate).toLocaleDateString("vi-VN") : "TBD",
          progress: 0,
          attendance: "--",
          status: cls.status === "Active" ? "IN PROGRESS" : cls.status === "Scheduled" ? "SCHEDULED" : "IN PROGRESS",
          simRoom: "",
          trainees: classEnrollments.length,
          type: "",
          historyLogs: cls.createdAt ? [{ date: new Date(cls.createdAt).toISOString().split("T")[0], event: "Lớp được khởi tạo." }] : [],
        };
      });

      setClasses(mapped.length > 0 ? mapped : getFallbackClasses());
    } catch (err) {
      console.error("Error loading classes:", err);
      setClasses(getFallbackClasses());
    } finally {
      setClassesLoading(false);
    }
  };

  // Fallback mock data when API is unavailable
  const getFallbackClasses = () => [
    { id: "CL-001", name: "A320 Type Rating", subName: "Sim Phase", instructor: "Capt. Nguyen Van A", startDate: "01/10", endDate: "15/11", progress: 85, attendance: "98%", status: "IN PROGRESS", simRoom: "SIM-04", trainees: 18, type: "Type Rating", historyLogs: [] },
    { id: "CL-002", name: "B787 Conversion", subName: "Ground School", instructor: "Capt. Le Quang B", startDate: "20/10", endDate: "30/12", progress: 42, attendance: "92%", status: "IN PROGRESS", simRoom: "SIM-01", trainees: 15, type: "Conversion", historyLogs: [] },
    { id: "CL-003", name: "CRM Advanced", subName: "Theory Module", instructor: "Dr. Hoang Thuy D", startDate: "05/11", endDate: "10/11", progress: 0, attendance: "--", status: "SCHEDULED", simRoom: "ROOM-102", trainees: 20, type: "Workshop", historyLogs: [] },
    { id: "CL-004", name: "A350 Initial Cert", subName: "Sim Maintenance", instructor: "Capt. Tran Minh E", startDate: "15/09", endDate: "01/11", progress: 60, attendance: "100%", status: "DELAYED", simRoom: "SIM-02", trainees: 12, type: "Certification", historyLogs: [] },
  ];

  // Sample students attendance data by class
  const [studentsData, setStudentsData] = useState({
    "BATCH-320-A": [
      {
        id: 1,
        name: "Nguyễn Hoàng Nam",
        code: "VNA-7829",
        rate: 95,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "NH",
      },
      {
        id: 2,
        name: "Trần Minh Quân",
        code: "VNA-4432",
        rate: 70,
        s10: "A",
        s11: "P",
        s12: "A",
        avatar: "TM",
      },
      {
        id: 3,
        name: "Lê Thị Mai",
        code: "VNA-1109",
        rate: 88,
        s10: "P",
        s11: "L",
        s12: "P",
        avatar: "LT",
      },
      {
        id: 4,
        name: "Phan Anh Đức",
        code: "VNA-9921",
        rate: 92,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "PA",
      },
    ],
    "BATCH-787-C": [
      {
        id: 1,
        name: "Phạm Thanh Sơn",
        code: "VNA-1049",
        rate: 92,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "PT",
      },
      {
        id: 2,
        name: "Vũ Quốc Anh",
        code: "VNA-2234",
        rate: 85,
        s10: "P",
        s11: "L",
        s12: "P",
        avatar: "VQ",
      },
      {
        id: 3,
        name: "Đỗ Thúy Vy",
        code: "VNA-6729",
        rate: 75,
        s10: "A",
        s11: "P",
        s12: "A",
        avatar: "DT",
      },
      {
        id: 4,
        name: "Bùi Gia Huy",
        code: "VNA-8812",
        rate: 96,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "BG",
      },
    ],
    "BATCH-CRM-01": [
      {
        id: 1,
        name: "Hoàng Quốc Việt",
        code: "VNA-5521",
        rate: 100,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "HQ",
      },
      {
        id: 2,
        name: "Nguyễn Thị Hồng",
        code: "VNA-9910",
        rate: 100,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "NT",
      },
      {
        id: 3,
        name: "Trần Gia Bảo",
        code: "VNA-4431",
        rate: 100,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "TG",
      },
      {
        id: 4,
        name: "Phan Thanh Bình",
        code: "VNA-3329",
        rate: 100,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "PT",
      },
    ],
    "BATCH-350-X": [
      {
        id: 1,
        name: "Nguyễn Văn Hải",
        code: "VNA-1234",
        rate: 92,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "NV",
      },
      {
        id: 2,
        name: "Lê Văn Đạt",
        code: "VNA-5678",
        rate: 75,
        s10: "A",
        s11: "P",
        s12: "A",
        avatar: "LV",
      },
      {
        id: 3,
        name: "Phạm Minh Trí",
        code: "VNA-9012",
        rate: 83,
        s10: "P",
        s11: "L",
        s12: "A",
        avatar: "PM",
      },
      {
        id: 4,
        name: "Đặng Hoài Nam",
        code: "VNA-3456",
        rate: 96,
        s10: "P",
        s11: "P",
        s12: "P",
        avatar: "DH",
      },
    ],
  });

  // Filtering Logic for Class List
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || cls.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Dynamic card counts for main dashboard
  const activeCount = classes.filter((c) => c.status === "IN PROGRESS").length;
  const urgentCount = classes.filter((c) => c.status === "DELAYED").length;

  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!newClassId || !newClassName || !newInstructor) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    const created = {
      id: newClassId.toUpperCase(),
      name: newClassName,
      subName: newClassSub || "Theory Module",
      instructor: newInstructor,
      startDate: newStartDate || "TBD",
      endDate: newEndDate || "TBD",
      progress: 0,
      attendance: "--",
      status: "SCHEDULED",
      simRoom: newRoom || "ROOM-101",
      trainees: parseInt(newTraineesCount) || 10,
      type: newClassType,
      historyLogs: [
        {
          date: new Date().toISOString().split("T")[0],
          event: "Lớp học được khởi tạo thành công.",
        },
      ],
    };

    setClasses([created, ...classes]);
    setShowCreateModal(false);

    // Reset fields
    setNewClassId("");
    setNewClassName("");
    setNewClassSub("");
    setNewInstructor("");
    setNewStartDate("");
    setNewEndDate("");
    setNewRoom("");
    setNewTraineesCount(15);
  };

  const getStudentsForClass = (classId) => {
    return (
      studentsData[classId] || [
        {
          id: 1,
          name: "Học viên Mẫu A",
          code: "VNA-9901",
          rate: 100,
          s10: "P",
          s11: "P",
          s12: "P",
          avatar: "HA",
        },
        {
          id: 2,
          name: "Học viên Mẫu B",
          code: "VNA-9902",
          rate: 100,
          s10: "P",
          s11: "P",
          s12: "P",
          avatar: "HB",
        },
      ]
    );
  };

  // Cycling student attendance states: P (Present) -> A (Absent) -> L (Late)
  const handleAttendanceClick = (studentId, sessionKey) => {
    if (!selectedClassDetails) return;
    const classId = selectedClassDetails.id;
    const currentStudents = getStudentsForClass(classId);

    const updatedStudents = currentStudents.map((student) => {
      if (student.id === studentId) {
        const current = student[sessionKey];
        let next = "P";
        if (current === "P") next = "A";
        else if (current === "A") next = "L";
        else next = "P";

        const updated = { ...student, [sessionKey]: next };

        // Calculate new attendance rate based on previous 9 sessions + these 3 sessions
        let basePresents = 9;
        if (student.code === "VNA-4432") basePresents = 6.5;
        if (student.code === "VNA-1109") basePresents = 8;
        if (student.code === "VNA-9921") basePresents = 8.5;

        let currentPresents = 0;
        [updated.s10, updated.s11, updated.s12].forEach((s) => {
          if (s === "P") currentPresents += 1.0;
          if (s === "L") currentPresents += 0.8;
        });

        updated.rate = Math.min(
          100,
          Math.round(((basePresents + currentPresents) / 12) * 100),
        );
        return updated;
      }
      return student;
    });

    setStudentsData({
      ...studentsData,
      [classId]: updatedStudents,
    });
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "IN PROGRESS":
        return (
          <div className="inline-flex flex-col justify-center items-center w-[72px] h-8 rounded-sm bg-[#2e7d32]/10 border border-[#2e7d32]/20 text-[10px] font-bold leading-none text-[#2e7d32] uppercase">
            <span>IN</span>
            <span className="mt-0.5">PROGRESS</span>
          </div>
        );
      case "SCHEDULED":
        return (
          <div className="inline-flex justify-center items-center px-2 py-1 rounded-sm bg-blue-100 text-[10px] font-bold text-blue-700 uppercase">
            SCHEDULED
          </div>
        );
      case "DELAYED":
        return (
          <div className="inline-flex justify-center items-center px-2 py-1 rounded-sm bg-[#ffdad6] text-[10px] font-bold text-[#ba1a1a] uppercase">
            DELAYED
          </div>
        );
      default:
        return null;
    }
  };

  const renderSessionIcon = (sessionStatus) => {
    if (sessionStatus === "P") {
      return (
        <svg
          width={20}
          height={20}
          viewBox="0 0 20 20"
          fill="none"
          className="text-[#2E7D32]"
        >
          <path
            d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    if (sessionStatus === "A") {
      return (
        <svg
          width={20}
          height={20}
          viewBox="0 0 20 20"
          fill="none"
          className="text-[#D32F2F]"
        >
          <path
            d="M6.4 15L10 11.4L13.6 15L15 13.6L11.4 10L15 6.4L13.6 5L10 8.6L6.4 5L5 6.4L8.6 10L5 13.6L6.4 15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    if (sessionStatus === "L") {
      return (
        <div className="w-5 h-5 rounded-full bg-[#ed6c02]/10 border border-[#ed6c02]/30 flex justify-center items-center text-[10px] font-bold text-[#ed6c02]">
          L
        </div>
      );
    }
    return null;
  };

  const renderTraineeStatus = (rate) => {
    if (rate >= 90) {
      return (
        <div className="inline-flex justify-center items-center px-2 py-0.5 rounded-sm bg-[#2e7d32]/10 border border-[#2e7d32]/20 text-[10px] font-bold uppercase text-[#2e7d32]">
          ĐẠT
        </div>
      );
    }
    if (rate >= 80 && rate < 90) {
      return (
        <div className="inline-flex justify-center items-center px-2 py-1 rounded-sm bg-[#ed6c02]/10 border border-[#ed6c02]/20 text-[10px] font-bold uppercase text-[#ed6c02] tracking-wider leading-none">
          <div className="flex flex-col items-center">
            <span>THEO</span>
            <span className="mt-0.5">DÕI</span>
          </div>
        </div>
      );
    }
    return (
      <div className="inline-flex justify-center items-center px-2 py-1 rounded-sm bg-[#d32f2f]/10 border border-[#d32f2f]/20 text-[10px] font-bold uppercase text-[#d32f2f] tracking-wider leading-none">
        <div className="flex flex-col items-center">
          <span>CẢNH</span>
          <span className="mt-0.5">BÁO</span>
        </div>
      </div>
    );
  };

  // IF VIEWING CLASS ATTENDANCE DETAILS SUB-PAGE
  if (selectedClassDetails) {
    const classId = selectedClassDetails.id;
    const currentStudents = getStudentsForClass(classId);

    // Search filter for students
    const filteredStudents = currentStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(attendanceSearchQuery.toLowerCase()),
    );

    // Calculate metrics dynamically
    const avgAttendance =
      currentStudents.length > 0
        ? Math.round(
            currentStudents.reduce((sum, s) => sum + s.rate, 0) /
              currentStudents.length,
          )
        : 0;

    const sessionsHeld = Math.max(
      1,
      Math.round((selectedClassDetails.progress / 100) * 24),
    );

    const absentManyCount =
      classId === "BATCH-320-A"
        ? 3
        : currentStudents.filter((s) => s.rate < 80).length;

    return (
      <div className="flex flex-col lg:flex-row w-full h-full">
        {/* WORKSPACE DETAIL MAIN AREA */}
        <div className="flex-1 flex flex-col justify-start items-start p-12 gap-10 overflow-y-auto">
          {/* BREADCRUMB AND HEADER */}
          <div className="flex justify-between items-end w-full">
            <div className="flex flex-col justify-start items-start gap-2">
              <div className="flex justify-start items-center gap-1">
                <span
                  onClick={() => setSelectedClassDetails(null)}
                  className="text-xs font-semibold uppercase text-[#495057] cursor-pointer hover:text-[#002147] transition-all"
                >
                  TRẠNG THÁI LỚP HỌC
                </span>
                <svg
                  width={5}
                  height={8}
                  viewBox="0 0 5 8"
                  fill="none"
                  className="mx-1"
                >
                  <path
                    d="M3.06667 4L0 0.933333L0.933333 0L4.93333 4L0.933333 8L0 7.06667L3.06667 4Z"
                    fill="#495057"
                  />
                </svg>
                <span className="text-xs font-semibold uppercase text-[#002147]">
                  CHI TIẾT ĐIỂM DANH
                </span>
              </div>
              <h2 className="text-3xl font-bold text-left text-[#002147] m-0">
                Kiểm tra dữ liệu điểm danh
              </h2>
            </div>

            <button
              className="flex justify-start items-center gap-2 px-8 py-3 rounded-sm bg-[#002147] border-none text-white cursor-pointer hover:bg-[#002147]/90 transition-all font-bold text-sm shadow-sm"
              onClick={() => alert("Xuất báo cáo điểm danh thành công!")}
            >
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <path
                  d="M6.66667 10L2.5 5.83333L3.66667 4.625L5.83333 6.79167V0H7.5V6.79167L9.66667 4.625L10.8333 5.83333L6.66667 10ZM1.66667 13.3333C1.20833 13.3333 0.815972 13.1701 0.489583 12.8438C0.163194 12.5174 0 12.125 0 11.6667V9.16667H1.66667V11.6667H11.6667V9.16667H13.3333V11.6667C13.3333 12.125 13.1701 12.5174 12.8438 12.8438C12.5174 13.1701 12.125 13.3333 11.6667 13.3333H1.66667Z"
                  fill="white"
                />
              </svg>
              <span>XUẤT BÁO CÁO</span>
            </button>
          </div>

          {/* GRID DETAILS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* Info Card */}
            <div className="lg:col-span-6 bg-white border border-[#dee2e6] p-6 shadow-sm flex flex-col justify-center h-[168px] rounded-sm">
              <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                <div>
                  <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-none block tracking-wider">
                    MÃ LỚP
                  </span>
                  <p className="text-lg font-bold text-[#002147] m-0 mt-1 leading-tight">
                    {selectedClassDetails.id}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-none block tracking-wider">
                    KHÓA HỌC
                  </span>
                  <p className="text-lg font-bold text-[#002147] m-0 mt-1 leading-tight">
                    {selectedClassDetails.name}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-none block tracking-wider">
                    GIẢNG VIÊN
                  </span>
                  <p className="text-lg font-bold text-[#002147] m-0 mt-1 leading-tight">
                    {selectedClassDetails.instructor}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-none block tracking-wider">
                    THỜI GIAN
                  </span>
                  <p className="text-lg font-bold text-[#002147] m-0 mt-1 leading-tight">
                    {selectedClassDetails.startDate} -{" "}
                    {selectedClassDetails.endDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric Card 1 */}
            <div className="lg:col-span-2 bg-white border border-[#dee2e6] p-6 shadow-sm flex flex-col justify-between h-[168px] rounded-sm">
              <div className="flex justify-start items-start w-full">
                <svg
                  width={27}
                  height={27}
                  viewBox="0 0 27 27"
                  fill="none"
                  className="text-[#C5A059]"
                >
                  <path
                    d="M14.6667 12H23.9333C23.6 9.55556 22.5833 7.48333 20.8833 5.78333C19.1833 4.08333 17.1111 3.06667 14.6667 2.73333V12ZM12 23.9333V2.73333C9.31111 3.06667 7.08333 4.23889 5.31667 6.25C3.55 8.26111 2.66667 10.6222 2.66667 13.3333C2.66667 16.0444 3.55 18.4056 5.31667 20.4167C7.08333 22.4278 9.31111 23.6 12 23.9333ZM14.6667 23.9333C17.1111 23.6222 19.1889 22.6111 20.9 20.9C22.6111 19.1889 23.6222 17.1111 23.9333 14.6667H14.6667V23.9333ZM13.3333 26.6667C11.4889 26.6667 9.75556 26.3167 8.13333 25.6167C6.51111 24.9167 5.1 23.9667 3.9 22.7667C2.7 21.5667 1.75 20.1556 1.05 18.5333C0.35 16.9111 0 15.1778 0 13.3333C0 11.4889 0.35 9.75556 1.05 8.13333C1.75 6.51111 2.7 5.1 3.9 3.9C5.1 2.7 6.51111 1.75 8.13333 1.05C9.75556 0.35 11.4889 0 13.3333 0C15.1778 0 16.9056 0.35 18.5167 1.05C20.1278 1.75 21.5389 2.70556 22.75 3.91667C23.9611 5.12778 24.9167 6.53889 25.6167 8.15C26.3167 9.76111 26.6667 11.4889 26.6667 13.3333C26.6667 15.1556 26.3167 16.8778 25.6167 18.5C24.9167 20.1222 23.9667 21.5389 22.7667 22.75C21.5667 23.9611 20.1556 24.9167 18.5333 25.6167C16.9111 26.3167 15.1778 26.6667 13.3333 26.6667Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-snug block tracking-wider">
                  TỶ LỆ THAM DỰ
                  <br />
                  CHUNG
                </span>
                <p className="text-2xl font-bold text-[#002147] m-0 leading-none">
                  {avgAttendance}%
                </p>
              </div>
            </div>

            {/* Metric Card 2 */}
            <div className="lg:col-span-2 bg-white border border-[#dee2e6] p-6 shadow-sm flex flex-col justify-between h-[168px] rounded-sm">
              <div className="flex justify-start items-start w-full">
                <svg
                  width={24}
                  height={27}
                  viewBox="0 0 24 27"
                  fill="none"
                  className="text-[#002147]"
                >
                  <path
                    d="M10.6 21.8L5.86667 17.0667L7.8 15.1333L10.6 17.9333L16.2 12.3333L18.1333 14.2667L10.6 21.8ZM2.66667 26.6667C1.93333 26.6667 1.30556 26.4056 0.783333 25.8833C0.261111 25.3611 0 24.7333 0 24V5.33333C0 4.6 0.261111 3.97222 0.783333 3.45C1.30556 2.92778 1.93333 2.66667 2.66667 2.66667H4V0H6.66667V2.66667H17.3333V0H20V2.66667H21.3333C22.0667 2.66667 22.6944 2.92778 23.2167 3.45C23.7389 3.97222 24 4.6 24 5.33333V24C24 24.7333 23.7389 25.3611 23.2167 25.8833C22.6944 26.4056 22.0667 26.6667 21.3333 26.6667H2.66667ZM2.66667 24H21.3333V10.6667H2.66667V24ZM2.66667 8H21.3333V5.33333H2.66667V8ZM2.66667 8V5.33333V8Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-snug block tracking-wider">
                  SỐ BUỔI ĐÃ
                  <br />
                  HỌC
                </span>
                <p className="text-2xl font-bold text-[#002147] m-0 leading-none">
                  {sessionsHeld}/24
                </p>
              </div>
            </div>

            {/* Metric Card 3 */}
            <div className="lg:col-span-2 bg-white border border-[#dee2e6] border-l-4 border-l-[#d32f2f] p-6 shadow-sm flex flex-col justify-between h-[168px] rounded-sm">
              <div className="flex justify-start items-start w-full">
                <svg
                  width={30}
                  height={29}
                  viewBox="0 0 30 29"
                  fill="none"
                  className="text-[#D32F2F]"
                >
                  <path
                    d="M26.4 28.3L21.7667 23.6667V23.9H0.433333V20.1667C0.433333 19.4111 0.627778 18.7167 1.01667 18.0833C1.40556 17.45 1.92222 16.9667 2.56667 16.6333C3.94444 15.9444 5.34444 15.4278 6.76667 15.0833C8.18889 14.7389 9.63333 14.5667 11.1 14.5667C11.3667 14.5667 11.6389 14.5722 11.9167 14.5833C12.1944 14.5944 12.4667 14.6111 12.7333 14.6333L11.3333 13.2333C11.2889 13.2333 11.25 13.2333 11.2167 13.2333C11.1833 13.2333 11.1444 13.2333 11.1 13.2333C9.63333 13.2333 8.37778 12.7111 7.33333 11.6667C6.28889 10.6222 5.76667 9.36667 5.76667 7.9C5.76667 7.85556 5.76667 7.81667 5.76667 7.78333C5.76667 7.75 5.76667 7.71111 5.76667 7.66667L0 1.9L1.9 0L28.3 26.4L26.4 28.3ZM21.3 14.7667C22.4333 14.9 23.5 15.1278 24.5 15.45C25.5 15.7722 26.4333 16.1667 27.3 16.6333C28.1 17.0778 28.7111 17.5722 29.1333 18.1167C29.5556 18.6611 29.7667 19.2556 29.7667 19.9V23.9H29.6L24.2667 18.5667C24.0667 17.8333 23.7167 17.1389 23.2167 16.4833C22.7167 15.8278 22.0778 15.2556 21.3 14.7667ZM11.1 17.2333C9.85556 17.2333 8.62222 17.3833 7.4 17.6833C6.17778 17.9833 4.96667 18.4333 3.76667 19.0333C3.56667 19.1444 3.40556 19.3 3.28333 19.5C3.16111 19.7 3.1 19.9222 3.1 20.1667V21.2333H19.1V21L16.2 18.1C15.3556 17.8111 14.5056 17.5944 13.65 17.45C12.7944 17.3056 11.9444 17.2333 11.1 17.2333ZM17.8333 12.1333C18.2556 11.5111 18.5722 10.8444 18.7833 10.1333C18.9944 9.42222 19.1 8.67778 19.1 7.9C19.1 6.96667 18.9389 6.06667 18.6167 5.2C18.2944 4.33333 17.8333 3.54444 17.2333 2.83333C17.5444 2.72222 17.8556 2.65 18.1667 2.61667C18.4778 2.58333 18.7889 2.56667 19.1 2.56667C20.5667 2.56667 21.8222 3.08889 22.8667 4.13333C23.9111 5.17778 24.4333 6.43333 24.4333 7.9C24.4333 9.36667 23.8833 10.6222 22.7833 11.6667C21.6833 12.7111 20.4 13.2333 18.9333 13.2333L17.8333 12.1333ZM15.9 10.2L13.7667 8.06667C13.7667 8.02222 13.7667 7.99444 13.7667 7.98333C13.7667 7.97222 13.7667 7.94444 13.7667 7.9C13.7667 7.16667 13.5056 6.53889 12.9833 6.01667C12.4611 5.49444 11.8333 5.23333 11.1 5.23333C11.0556 5.23333 11.0278 5.23333 11.0167 5.23333C11.0056 5.23333 10.9778 5.23333 10.9333 5.23333L8.8 3.1C9.15556 2.92222 9.52222 2.78889 9.9 2.7C10.2778 2.61111 10.6778 2.56667 11.1 2.56667C12.5667 2.56667 13.8222 3.08889 14.8667 4.13333C15.9111 5.17778 16.4333 6.43333 16.4333 7.9C16.4333 8.32222 16.3889 8.72222 16.3 9.1C16.2111 9.47778 16.0778 9.84444 15.9 10.2Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#495057]/60 uppercase leading-snug block tracking-wider">
                  HỌC VIÊN
                  <br />
                  VẮNG NHIỀU
                </span>
                <p className="text-2xl font-bold text-[#d32f2f] m-0 leading-none">
                  {String(absentManyCount).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>

          {/* ATTENDANCE TABLE CARD */}
          <div className="flex flex-col justify-start items-start w-full overflow-hidden rounded bg-white border border-[#dee2e6] shadow-sm">
            {/* Table Toolbar */}
            <div className="flex justify-between items-center w-full p-6 border-b border-[#dee2e6]">
              <div className="flex items-center flex-grow max-w-[400px]">
                <div className="flex justify-center items-center w-full relative pl-10 pr-6 py-2.5 rounded bg-[#f8f9fa] border border-[#dee2e6]">
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-sm text-gray-800 placeholder-gray-500 focus:outline-none"
                    placeholder="Tìm kiếm học viên hoặc ID..."
                    value={attendanceSearchQuery}
                    onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                      <path
                        d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                        fill="#495057"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-start items-center gap-3 ml-4">
                <button
                  className="flex justify-start items-center gap-2 px-6 py-2 rounded-sm border border-[#dee2e6] bg-white cursor-pointer hover:bg-slate-50 transition-all font-semibold text-xs text-[#495057]"
                  onClick={() => alert("Lọc danh sách...")}
                >
                  <svg width={14} height={9} viewBox="0 0 14 9" fill="none">
                    <path
                      d="M5.25 9V7.5H8.25V9H5.25ZM2.25 5.25V3.75H11.25V5.25H2.25ZM0 1.5V0H13.5V1.5H0Z"
                      fill="#495057"
                    />
                  </svg>
                  <span>BỘ LỌC</span>
                </button>
                <button
                  className="flex justify-start items-center gap-2 px-6 py-2 rounded-sm border border-[#dee2e6] bg-white cursor-pointer hover:bg-slate-50 transition-all font-semibold text-xs text-[#495057]"
                  onClick={() => alert("Chọn Buổi học...")}
                >
                  <svg width={14} height={15} viewBox="0 0 14 15" fill="none">
                    <path
                      d="M1.5 15C1.0875 15 0.734375 14.8531 0.440625 14.5594C0.146875 14.2656 0 13.9125 0 13.5V3C0 2.5875 0.146875 2.23438 0.440625 1.94062C0.734375 1.64687 1.0875 1.5 1.5 1.5H2.25V0H3.75V1.5H9.75V0H11.25V1.5H12C12.4125 1.5 12.7656 1.64687 13.0594 1.94062C13.3531 2.23438 13.5 2.5875 13.5 3V13.5C13.5 13.9125 13.3531 14.2656 13.0594 14.5594C12.7656 14.8531 12.4125 15 12 15H1.5ZM1.5 13.5H12V6H1.5V13.5ZM1.5 4.5H12V3H1.5V4.5ZM1.5 4.5V3V4.5ZM6.75 9C6.5375 9 6.35938 8.92813 6.21562 8.78438C6.07187 8.64062 6 8.4625 6 8.25C6 8.0375 6.07187 7.85938 6.21562 7.71562C6.35938 7.57187 6.5375 7.5 6.75 7.5C6.9625 7.5 7.14062 7.57187 7.28438 7.71562C7.42813 7.85938 7.5 8.0375 7.5 8.25C7.5 8.4625 7.42813 8.64062 7.28438 8.78438C7.14062 8.92813 6.9625 9 6.75 9ZM3.75 9C3.5375 9 3.35938 8.92813 3.21563 8.78438C3.07188 8.64062 3 8.4625 3 8.25C3 8.0375 3.07188 7.85938 3.21563 7.71562C3.35938 7.57187 3.5375 7.5 3.75 7.5C3.9625 7.5 4.14062 7.57187 4.28438 7.71562C4.42813 7.85938 4.5 8.0375 4.5 8.25C4.5 8.4625 4.42813 8.64062 4.28438 8.78438C4.14062 8.92813 3.9625 9 3.75 9ZM9.75 9C9.5375 9 9.35938 8.92813 9.21562 8.78438C9.07187 8.64062 9 8.4625 9 8.25C9 8.0375 9.07187 7.85938 9.21562 7.71562C9.35938 7.57187 9.5375 7.5 9.75 7.5C9.9625 7.5 10.1406 7.57187 10.2844 7.71562C10.4281 7.85938 10.5 8.0375 10.5 8.25C10.5 8.4625 10.4281 8.64062 10.2844 8.78438C10.1406 8.92813 9.9625 9 9.75 9ZM6.75 12C6.5375 12 6.35938 11.9281 6.21562 11.7844C6.07187 11.6406 6 11.4625 6 11.25C6 11.0375 6.07187 10.8594 6.21562 10.7156C6.35938 10.5719 6.5375 10.5 6.75 10.5C6.9625 10.5 7.14062 10.5719 7.28438 10.7156C7.42813 10.8594 7.5 11.0375 7.5 11.25C7.5 11.4625 7.42813 11.6406 7.28438 11.7844C7.14062 11.9281 6.9625 12 6.75 12ZM3.75 12C3.5375 12 3.35938 11.9281 3.21563 11.7844C3.07188 11.6406 3 11.4625 3 11.25C3 11.0375 3.07188 10.8594 3.21563 10.7156C3.35938 10.5719 3.5375 10.5 3.75 10.5C3.9625 10.5 4.14062 10.5719 4.28438 10.7156C4.42813 10.8594 4.5 11.0375 4.5 11.25C4.5 11.4625 4.42813 11.6406 4.28438 11.7844C4.14062 11.9281 3.9625 12 3.75 12ZM9.75 12C9.5375 12 9.35938 11.9281 9.21562 11.7844C9.07187 11.6406 9 11.4625 9 11.25C9 11.0375 9.07187 10.8594 9.21562 10.7156C9.35938 10.5719 9.5375 10.5 9.75 10.5C9.9625 10.5 10.1406 10.5719 10.2844 10.7156C10.4281 10.8594 10.5 11.0375 10.5 11.25C10.5 11.4625 10.4281 11.6406 10.2844 11.7844C10.1406 11.9281 9.9625 12 9.75 12Z"
                      fill="#495057"
                    />
                  </svg>
                  <span>BUỔI HỌC (10-12)</span>
                </button>
              </div>
            </div>

            {/* Table Element */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#002147] text-white">
                    <th className="px-6 py-5 text-[11px] font-semibold uppercase w-[8%]">
                      STT
                    </th>
                    <th className="px-6 py-5 text-[11px] font-semibold uppercase w-[24%]">
                      HỌC VIÊN
                    </th>
                    <th className="px-6 py-5 text-[11px] font-semibold uppercase w-[15%]">
                      ID
                    </th>
                    <th className="px-6 py-5 text-[11px] font-semibold uppercase w-[20%]">
                      TỶ LỆ TỔNG
                    </th>
                    <th className="px-4 py-5 text-[11px] font-semibold uppercase w-[10%] text-center">
                      BUỔI 10
                    </th>
                    <th className="px-4 py-5 text-[11px] font-semibold uppercase w-[10%] text-center">
                      BUỔI 11
                    </th>
                    <th className="px-4 py-5 text-[11px] font-semibold uppercase w-[10%] text-center">
                      BUỔI 12
                    </th>
                    <th className="px-6 py-5 text-[11px] font-semibold uppercase w-[13%] text-left">
                      TRẠNG THÁI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee2e6]">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => {
                      const idParts = student.code.split("-");
                      const isUrgent = student.rate < 80;

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-6 text-sm font-medium text-[#495057]">
                            {String(index + 1).padStart(2, "0")}
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full border border-[#dee2e6] bg-slate-100 flex items-center justify-center font-bold text-[#002147] text-xs">
                                {student.avatar}
                              </div>
                              <span className="text-sm font-bold text-[#002147]">
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-[#495057]">
                            <span>{idParts[0]}-</span>
                            <br />
                            <span>{idParts[1]}</span>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <div className="flex justify-start items-center gap-2">
                              <div className="w-24 h-1.5 rounded-full bg-[#dee2e6] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${student.rate}%`,
                                    backgroundColor: isUrgent
                                      ? "#d32f2f"
                                      : "#c5a059",
                                  }}
                                />
                              </div>
                              <span
                                className={`text-xs font-semibold ${isUrgent ? "text-[#d32f2f]" : "text-[#002147]"}`}
                              >
                                {student.rate}%
                              </span>
                            </div>
                          </td>

                          {/* Session 10 */}
                          <td className="px-4 py-4 text-center align-middle">
                            <div
                              className="inline-flex justify-center items-center cursor-pointer p-1 hover:bg-black/5 rounded"
                              onClick={() =>
                                handleAttendanceClick(student.id, "s10")
                              }
                            >
                              {renderSessionIcon(student.s10)}
                            </div>
                          </td>

                          {/* Session 11 */}
                          <td className="px-4 py-4 text-center align-middle">
                            <div
                              className="inline-flex justify-center items-center cursor-pointer p-1 hover:bg-black/5 rounded"
                              onClick={() =>
                                handleAttendanceClick(student.id, "s11")
                              }
                            >
                              {renderSessionIcon(student.s11)}
                            </div>
                          </td>

                          {/* Session 12 */}
                          <td className="px-4 py-4 text-center align-middle">
                            <div
                              className="inline-flex justify-center items-center cursor-pointer p-1 hover:bg-black/5 rounded"
                              onClick={() =>
                                handleAttendanceClick(student.id, "s12")
                              }
                            >
                              {renderSessionIcon(student.s12)}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4 align-middle text-left">
                            {renderTraineeStatus(student.rate)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-10 text-gray-500 text-sm font-semibold"
                      >
                        Không tìm thấy học viên nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="flex justify-between items-center w-full p-6 border-t border-[#dee2e6] bg-white">
              <span className="text-xs font-medium text-[#495057]">
                Hiển thị 1 - {filteredStudents.length} của 28 học viên
              </span>
              <div className="flex justify-start items-start gap-1">
                <div className="flex justify-center items-center w-9 h-9 rounded-sm border border-[#dee2e6] cursor-pointer hover:bg-slate-50">
                  <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                    <path
                      d="M4.5 9L0 4.5L4.5 0L5.55 1.05L2.1 4.5L5.55 7.95L4.5 9Z"
                      fill="#1A1C1E"
                    />
                  </svg>
                </div>
                <div className="flex justify-center items-center w-9 h-9 rounded-sm bg-[#002147] text-white font-semibold text-xs cursor-pointer">
                  1
                </div>
                <div className="flex justify-center items-center w-9 h-9 rounded-sm border border-[#dee2e6] text-[#1a1c1e] font-semibold text-xs cursor-pointer hover:bg-slate-50">
                  2
                </div>
                <div className="flex justify-center items-center w-9 h-9 rounded-sm border border-[#dee2e6] text-[#1a1c1e] font-semibold text-xs cursor-pointer hover:bg-slate-50">
                  3
                </div>
                <div className="flex justify-center items-center w-9 h-9 rounded-sm border border-[#dee2e6] cursor-pointer hover:bg-slate-50">
                  <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                    <path
                      d="M3.45 4.5L0 1.05L1.05 0L5.55 4.5L1.05 9L0 7.95L3.45 4.5Z"
                      fill="#1A1C1E"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* LEGEND BAR */}
          <div className="flex justify-start items-center w-full gap-12 px-6 py-6 rounded-sm bg-[#e9ecef]/30 border border-[#dee2e6]">
            <span className="text-[10px] font-bold text-[#002147] uppercase">
              CHÚ THÍCH:
            </span>

            <div className="flex items-center gap-1.5">
              <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <path
                  d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
                  fill="#2E7D32"
                />
              </svg>
              <span className="text-xs font-semibold text-[#495057]">
                Có mặt (Present)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <path
                  d="M6.4 15L10 11.4L13.6 15L15 13.6L11.4 10L15 6.4L13.6 5L10 8.6L6.4 5L5 6.4L8.6 10L5 13.6L6.4 15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
                  fill="#D32F2F"
                />
              </svg>
              <span className="text-xs font-semibold text-[#495057]">
                Vắng mặt (Absent)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#ed6c02]/10 border border-[#ed6c02]/30 flex justify-center items-center text-[10px] font-semibold text-[#ed6c02]">
                L
              </div>
              <span className="text-xs font-semibold text-[#495057]">
                Đi muộn (Late)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: CLASS STATUS DASHBOARD LIST
  return (
    <div className="w-full bg-[#f7f9fc] min-h-full">
      <div className="flex flex-col justify-start items-start w-full overflow-hidden px-12 pt-10 pb-20 gap-10">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-end w-full">
          <div className="flex flex-col justify-start items-start gap-1">
            <h1 className="text-[32px] font-semibold text-left text-[#000613] m-2">
              Theo dõi trạng thái lớp học
            </h1>
            <p className="text-base text-left text-[#43474e] m-2">
              Quản lý và giám sát tiến độ các lớp đào tạo hàng không
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex justify-start items-center gap-2 px-6 py-3 rounded bg-[#012248] text-white border-none cursor-pointer hover:bg-[#012248]/90 transition-all font-semibold"
          >
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <path
                d="M5 6.66667H0V5H5V0H6.66667V5H11.6667V6.66667H6.66667V11.6667H5V6.66667Z"
                fill="white"
              />
            </svg>
            <span className="text-base text-center text-white ">
              Tạo lớp học mới
            </span>
          </button>
        </div>

        {/* QUICK OVERVIEW SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Card 1: TỔNG SỐ LỚP ĐANG HOẠT ĐỘNG */}
          <div className="flex flex-col justify-start items-start w-full overflow-hidden gap-3 p-6 rounded-lg bg-white border border-[#74777f]/10 relative shadow-sm h-[142px]">
            <div className="flex justify-between items-start self-stretch w-full">
              <span className="text-xs font-semibold text-left uppercase text-[#43474e] tracking-wider">
                TỔNG SỐ LỚP ĐANG HOẠT ĐỘNG
              </span>
              <svg
                width={21}
                height={19}
                viewBox="0 0 21 19"
                fill="none"
                className="flex-shrink-0"
              >
                <path
                  d="M2 18.15V16.15H20V18.15H2ZM3.75 13.15L0 6.9L2.4 6.25L5.2 8.6L8.7 7.675L3.525 0.775L6.425 0L13.9 6.275L18.15 5.125C18.6833 4.975 19.1875 5.0375 19.6625 5.3125C20.1375 5.5875 20.45 5.99167 20.6 6.525C20.75 7.05833 20.6875 7.5625 20.4125 8.0375C20.1375 8.5125 19.7333 8.825 19.2 8.975L3.75 13.15Z"
                  fill="#735C00"
                />
              </svg>
            </div>
            <p className="text-5xl font-bold text-left text-[#000613] m-0">
              {String(activeCount).padStart(2, "0")}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#735c00]" />
          </div>

          {/* Card 2: TỶ LỆ HOÀN THÀNH TRUNG BÌNH */}
          <div className="flex flex-col justify-start items-start w-full overflow-hidden gap-3 p-6 rounded-lg bg-white border border-[#74777f]/10 relative shadow-sm h-[142px]">
            <div className="flex justify-between items-start self-stretch w-full">
              <span className="text-xs font-semibold text-left uppercase text-[#43474e] tracking-wider">
                TỶ LỆ HOÀN THÀNH TRUNG BÌNH
              </span>
              <svg
                width={18}
                height={18}
                viewBox="0 0 18 18"
                fill="none"
                className="flex-shrink-0"
              >
                <path
                  d="M4 14H6V9H4V14ZM12 14H14V4H12V14ZM8 14H10V11H8V14ZM8 9H10V7H8V9ZM2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM2 2V16V2Z"
                  fill="#E9C349"
                />
              </svg>
            </div>
            <div className="flex justify-start items-start self-stretch relative gap-1 w-full">
              <p className="text-5xl font-bold text-left text-[#000613] m-0">
                78%
              </p>
              <div className="flex flex-col justify-end items-start flex-grow h-12 relative pl-4 pt-9 pb-2">
                <div className="self-stretch flex-grow-0 flex-shrink-0 h-1 relative rounded-xl bg-[#eceef1]">
                  <div className="w-[78%] h-1 absolute left-[-1px] top-[-1px] rounded-xl bg-[#e9c349]" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e9c349]" />
          </div>

          {/* Card 3: CẦN CHÚ Ý KHẨN CẤP */}
          <div className="flex flex-col justify-start items-start w-full overflow-hidden gap-3 p-6 rounded-lg bg-white border border-[#74777f]/10 relative shadow-sm h-[142px]">
            <div className="flex justify-between items-start self-stretch w-full">
              <span className="text-xs font-semibold text-left uppercase text-[#43474e] tracking-wider">
                CẦN CHÚ Ý KHẨN CẤP
              </span>
              <svg
                width={22}
                height={19}
                viewBox="0 0 22 19"
                fill="none"
                className="flex-shrink-0"
              >
                <path
                  d="M0 19L11 0L22 19H0ZM11 16C11.2833 16 11.5208 15.9042 11.7125 15.7125C11.9042 15.5208 12 15.2833 12 15C12 14.7167 11.9042 14.4792 11.7125 14.2875C11.5208 14.0958 11.2833 14 11 14C10.7167 14 10.4792 14.0958 10.2875 14.2875C10.0958 14.4792 10 14.7167 10 15C10 15.2833 10.0958 15.5208 10.2875 15.7125C10.4792 15.9042 10.7167 16 11 16ZM10 13H12V8H10V13Z"
                  fill="#BA1A1A"
                />
              </svg>
            </div>
            <p className="text-5xl font-bold text-left text-[#000613] m-0">
              {String(urgentCount).padStart(2, "0")}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ba1a1a]" />
          </div>
        </div>

        {/* TABLE CONTAINER CARD */}
        <div className="flex flex-col justify-start items-start w-full overflow-hidden rounded-lg bg-white border border-[#74777f]/10 shadow-sm">
          {/* Table Header Bar */}
          <div className="flex justify-between items-center w-full p-6 bg-[#012248] border-b border-[#c4c6cf]/30">
            <h3 className="text-xl font-semibold text-left text-white m-0">
              Danh sách lớp học (Active & Upcoming)
            </h3>
            <div className="flex justify-start items-center gap-3 text-white">
              <div
                className="p-1.5 cursor-pointer hover:bg-white/10 rounded"
                onClick={() => alert("Lọc danh sách...")}
              >
                <svg width={18} height={12} viewBox="0 0 18 12" fill="none">
                  <path
                    d="M7 12V10H11V12H7ZM3 7V5H15V7H3ZM0 2V0H18V2H0Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div
                className="p-1.5 cursor-pointer hover:bg-white/10 rounded"
                onClick={() => alert("Xuất dữ liệu Excel...")}
              >
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Sub Tab Filter Row */}
          <div className="flex border-b border-gray-200 px-6 py-2 bg-[#f8fafc] w-full gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-4 py-2 font-semibold text-xs border-0 border-b-2 bg-transparent cursor-pointer transition-all ${
                statusFilter === "ALL"
                  ? "border-[#002147] text-[#002147]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Tất cả lớp học ({classes.length})
            </button>
            <button
              onClick={() => setStatusFilter("IN PROGRESS")}
              className={`px-4 py-2 font-semibold text-xs border-0 border-b-2 bg-transparent cursor-pointer transition-all ${
                statusFilter === "IN PROGRESS"
                  ? "border-[#002147] text-[#002147]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Đang hoạt động (
              {classes.filter((c) => c.status === "IN PROGRESS").length})
            </button>
            <button
              onClick={() => setStatusFilter("SCHEDULED")}
              className={`px-4 py-2 font-semibold text-xs border-0 border-b-2 bg-transparent cursor-pointer transition-all ${
                statusFilter === "SCHEDULED"
                  ? "border-[#002147] text-[#002147]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Đã lên lịch (
              {classes.filter((c) => c.status === "SCHEDULED").length})
            </button>
            <button
              onClick={() => setStatusFilter("DELAYED")}
              className={`px-4 py-2 font-semibold text-xs border-0 border-b-2 bg-transparent cursor-pointer transition-all ${
                statusFilter === "DELAYED"
                  ? "border-[#002147] text-[#002147]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Trì hoãn ({classes.filter((c) => c.status === "DELAYED").length})
            </button>
          </div>

          {/* Table Element */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#f2f4f7] border-b border-[#c4c6cf]/30">
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[12%]">
                    MÃ LỚP
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[22%]">
                    KHÓA ĐÀO TẠO
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[20%]">
                    GIẢNG VIÊN
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[15%]">
                    THỜI GIAN
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[15%]">
                    TIẾN ĐỘ
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[10%] text-center">
                    CHUYÊN CẦN
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#43474e] uppercase tracking-wider w-[16%] text-center">
                    TRẠNG THÁI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6cf]/20">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => {
                    const isDelayed = cls.status === "DELAYED";
                    const idParts = cls.id.split("-");
                    return (
                      <tr
                        key={cls.id}
                        onClick={() => setSelectedClassDetails(cls)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        {/* Mã lớp */}
                        <td className="px-6 py-6 align-middle">
                          <p className="text-base font-bold text-left text-[#000613] m-0 leading-tight">
                            <span>{idParts[0]}-</span>
                            <br />
                            <span>{idParts.slice(1).join("-")}</span>
                          </p>
                        </td>
                        {/* Khóa đào tạo */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col justify-start items-start">
                            <p
                              className={`text-base font-bold text-left m-0 leading-snug ${isDelayed ? "text-[#ba1a1a]" : "text-[#191c1e]"}`}
                            >
                              {cls.name}
                            </p>
                            <p
                              className={`text-xs text-left m-0 mt-0.5 leading-snug ${isDelayed ? "text-[#ba1a1a] font-semibold" : "text-[#43474e]"}`}
                            >
                              {cls.subName}
                            </p>
                          </div>
                        </td>
                        {/* Giảng viên */}
                        <td className="px-6 py-4 align-middle">
                          <p className="text-base text-left text-[#43474e] m-0 leading-snug">
                            {cls.instructor}
                          </p>
                        </td>
                        {/* Thời gian */}
                        <td className="px-6 py-4 align-middle">
                          <p className="text-xs text-left text-[#191c1e] m-0">
                            {cls.startDate} - {cls.endDate}
                          </p>
                        </td>
                        {/* Tiến độ */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex justify-start items-center gap-2">
                            <div className="flex flex-col justify-center items-start flex-grow h-2 relative overflow-hidden rounded-xl bg-[#eceef1]">
                              <div
                                className="h-full rounded-xl transition-all duration-500"
                                style={{
                                  width: `${cls.progress}%`,
                                  backgroundColor: isDelayed
                                    ? "#ba1a1a"
                                    : "#735c00",
                                }}
                              />
                            </div>
                            <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 w-8">
                              <p className="text-xs font-bold text-left text-[#191c1e] m-0">
                                {cls.progress}%
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Chuyên cần */}
                        <td className="px-6 py-4 align-middle text-center">
                          <p className="text-base font-bold text-[#000613] m-0">
                            {cls.attendance}
                          </p>
                        </td>
                        {/* Trạng thái */}
                        <td className="px-6 py-4 align-middle text-center">
                          <div className="inline-flex justify-center items-center">
                            {renderStatusBadge(cls.status)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-gray-500 text-sm font-semibold"
                    >
                      Không tìm thấy lớp học phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="flex justify-between items-center w-full p-6 border-t border-r-0 border-b-0 border-l-0 border-[#c4c6cf]/30 bg-white">
            <div>
              <span className="text-xs font-semibold text-[#43474e]">
                Hiển thị {filteredClasses.length} trên {classes.length} lớp học
              </span>
            </div>
            <div className="flex justify-start items-start gap-2">
              <div className="flex justify-start items-center px-3 py-[7px] rounded-sm border border-[#c4c6cf] cursor-pointer hover:bg-slate-50 transition-all">
                <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                  <path
                    d="M4.5 9L0 4.5L4.5 0L5.55 1.05L2.1 4.5L5.55 7.95L4.5 9Z"
                    fill="#191C1E"
                  />
                </svg>
              </div>
              <div className="flex flex-col justify-center items-center px-3 py-1 rounded-sm bg-[#012248] border border-[#c4c6cf] cursor-pointer">
                <p className="text-base text-center text-white m-0">1</p>
              </div>
              <div className="flex flex-col justify-center items-center px-3 py-1 rounded-sm border border-[#c4c6cf] cursor-pointer hover:bg-slate-50 transition-all">
                <p className="text-base text-center text-[#191c1e] m-0">2</p>
              </div>
              <div className="flex flex-col justify-center items-center px-3 py-1 rounded-sm border border-[#c4c6cf] cursor-pointer hover:bg-slate-50 transition-all">
                <p className="text-base text-center text-[#191c1e] m-0">3</p>
              </div>
              <div className="flex justify-start items-center px-3 py-[7px] rounded-sm border border-[#c4c6cf] cursor-pointer hover:bg-slate-50 transition-all">
                <svg width={6} height={9} viewBox="0 0 6 9" fill="none">
                  <path
                    d="M3.45 4.5L0 1.05L1.05 0L5.55 4.5L1.05 9L0 7.95L3.45 4.5Z"
                    fill="#191C1E"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE NEW CLASS MODAL */}
      {showCreateModal && (
        <div className="tm-modal-overlay">
          <div className="tm-modal-card max-w-lg w-full bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="modal-header bg-[#002147] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="m-0 text-xl font-bold text-[#ffe088]">
                  Tạo Lớp Học Mới
                </h3>
                <p className="m-0 text-xs text-slate-300 mt-1">
                  Điền thông tin chi tiết cho lớp đào tạo hàng không mới
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-transparent border-none text-white text-2xl cursor-pointer hover:text-[#ffe088]"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateClass}
              className="p-6 flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    MÃ LỚP (Bắt buộc) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. BATCH-320-B"
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    PHÂN LOẠI LỚP
                  </label>
                  <select
                    value={newClassType}
                    onChange={(e) => setNewClassType(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  >
                    <option value="Type Rating">Type Rating</option>
                    <option value="Conversion">Conversion</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Certification">Certification</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  KHÓA ĐÀO TẠO (Bắt buộc) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. A320 Type Rating"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  PHÂN ĐOẠN/MÔ ĐUN ĐÀO TẠO
                </label>
                <input
                  type="text"
                  placeholder="E.g. Sim Phase: Final Check, Ground School..."
                  value={newClassSub}
                  onChange={(e) => setNewClassSub(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  GIẢNG VIÊN PHỤ TRÁCH (Bắt buộc) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Capt. Nguyen Van A"
                  value={newInstructor}
                  onChange={(e) => setNewInstructor(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    THỜI GIAN BẮT ĐẦU
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. 01/10"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    THỜI GIAN KẾT THÚC
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. 15/11"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    PHÒNG HỌC / BUỒNG LÁI MÔ PHỎNG
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. SIM-04"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    SỐ HỌC VIÊN
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTraineesCount}
                    onChange={(e) => setNewTraineesCount(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              <div className="modal-footer border-t border-gray-200 pt-4 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 border-none rounded cursor-pointer text-gray-700 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#002147] hover:bg-[#002147]/95 border-none rounded cursor-pointer text-white font-semibold"
                >
                  Tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassStatus;
