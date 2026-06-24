const mockSchedule = [
  {
    day: "Thứ 2",
    sessions: [
      {
        time: "08:00 - 11:30",
        code: "AV-2024-001",
        name: "Kỹ thuật Hàng không Cơ bản",
        room: "Phòng B302 - Xưởng Động cơ",
      },
    ],
  },
  {
    day: "Thứ 3",
    sessions: [
      {
        time: "13:30 - 17:00",
        code: "AV-2024-045",
        name: "An toàn Hàng không & Quy trình",
        room: "Phòng A201 - Lý thuyết",
      },
    ],
  },
  {
    day: "Thứ 4",
    sessions: [
      {
        time: "08:00 - 11:30",
        code: "AV-2024-001",
        name: "Kỹ thuật Hàng không Cơ bản",
        room: "Phòng B302 - Xưởng Động cơ",
      },
    ],
  },
  {
    day: "Thứ 5",
    sessions: [
      {
        time: "13:30 - 17:00",
        code: "AV-2024-045",
        name: "An toàn Hàng không & Quy trình",
        room: "Phòng A201 - Lý thuyết",
      },
    ],
  },
  {
    day: "Thứ 6",
    sessions: [
      {
        time: "08:00 - 11:30",
        code: "AV-2024-001",
        name: "Kỹ thuật Hàng không Cơ bản",
        room: "Phòng B302 - Xưởng Động cơ",
      },
    ],
  },
  {
    day: "Thứ 7",
    sessions: [
      {
        time: "08:00 - 16:30",
        code: "AV-2024-012",
        name: "Khí tượng Hàng không",
        room: "Phòng A105 - Khí tượng",
      },
    ],
  },
  { day: "Chủ Nhật", sessions: [] },
];

const IntroductorSchedule = () => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-8 text-[#002147]">
      {/* Breadcrumb Area */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-start items-center gap-2">
          {/* <p className="text-[11px] font-semibold text-slate-400 tracking-wider">
            DASHBOARD
          </p>
          <svg
            width={5}
            height={7}
            viewBox="0 0 5 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z"
              fill="#94A3B8"
            />
          </svg>
          <p className="text-[11px] font-semibold text-[#c5a059] tracking-wider">
            LỊCH TRÌNH
          </p> */}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#002147]">
            Lịch giảng dạy trong tuần
          </h1>
        </div>
      </div>

      {/* Schedule Calendar View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-base text-[#002147]">
              Lịch biểu Tuần học hiện tại
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
              Áp dụng từ: Tuần này
            </p>
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded text-slate-600 transition-all">
              Tuần trước
            </button>
            <button className="px-3 py-1.5 bg-[#002147] text-white text-xs font-bold rounded transition-all">
              Tuần này
            </button>
            <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded text-slate-600 transition-all">
              Tuần sau
            </button>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {mockSchedule.map((dayData) => (
            <div
              key={dayData.day}
              className="border border-slate-100 rounded-lg bg-slate-50/50 p-4 flex flex-col gap-3 min-h-[220px]"
            >
              <div className="pb-2 border-b border-slate-200/60 flex justify-between items-center">
                <span className="text-xs font-bold text-[#002147]">
                  {dayData.day}
                </span>
                {dayData.sessions.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>

              <div className="flex flex-col gap-3 flex-grow justify-start">
                {dayData.sessions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                    Không có giờ dạy
                  </div>
                ) : (
                  dayData.sessions.map((session, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-1.5 hover:border-[#c5a059] transition-all cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-[#c5a059]">
                        {session.time}
                      </span>
                      <span className="text-[10px] font-bold text-[#002147] leading-tight block">
                        {session.name}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                        {session.code}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-1.5 mt-0.5">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {session.room}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntroductorSchedule;
