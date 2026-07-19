import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const IntroductorLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[220px] shrink-0 bg-[#002147] text-white flex flex-col justify-between md:sticky md:h-screen md:top-0 relative overflow-hidden z-20 shadow-xl">
        {/* Decorative shadow box (styled based on the user's template) */}
        <div
          className="absolute inset-y-0 right-0 w-[1px] bg-white/10 pointer-events-none"
          style={{ boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)" }}
        />

        {/* Sidebar Upper Section */}
        <div className="flex flex-col w-full">
          {/* Logo Branding Header */}
          <div className="flex flex-col justify-start items-start self-stretch pb-4">
            <div className="flex flex-col justify-start items-start self-stretch gap-1 p-5 border-b border-white/10">
              <div className="flex flex-col justify-start items-start self-stretch relative">
                <p className="self-stretch text-2xl font-bold text-left tracking-tight">
                  <span className="text-[#c5a059]">AeroMetric</span>
                  <span className="text-white">ETR</span>
                </p>
              </div>
              <div className="flex flex-col justify-start items-start self-stretch relative">
                <p className="self-stretch text-[10px] font-medium text-left uppercase text-white/50 tracking-wider">
                  AVIATION TRAINING SYSTEMS
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col justify-start items-start self-stretch gap-2 px-4 py-2">
            <NavLink
              to="/introductor/classes"
              className={({ isActive }) =>
                `flex justify-start items-center self-stretch gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#c5a059]/10 to-[#c5a059]/0 border-l-4 border-[#c5a059]'
                    : 'hover:bg-white/5 text-white/70 hover:text-white border-l-4 border-transparent'
                }`
              }
            >
              <div className="flex flex-col justify-start items-start shrink-0 relative">
                <svg
                  width={15}
                  height={17}
                  viewBox="0 0 15 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V3.33333C0 2.875 0.163194 2.48264 0.489583 2.15625C0.815972 1.82986 1.20833 1.66667 1.66667 1.66667H2.5V0H4.16667V1.66667H10.8333V0H12.5V1.66667H13.3333C13.7917 1.66667 14.184 1.82986 14.5104 2.15625C14.8368 2.48264 15 2.875 15 3.33333V15C15 15.4583 14.8368 15.8507 14.5104 16.1771C14.184 16.5035 13.7917 16.6667 13.3333 16.6667H1.66667ZM1.66667 15H13.3333V6.66667H1.66667V15ZM1.66667 5H13.3333V3.33333H1.66667V5ZM1.66667 5V3.33333V5Z"
                    fill="#C5A059"
                  />
                </svg>
              </div>
              <div className="flex flex-col justify-start items-start shrink-0 relative">
                <p className="text-sm font-semibold text-left">
                  Lớp học được phân công
                </p>
              </div>
            </NavLink>

            <NavLink
              to="/introductor/schedule"
              className={({ isActive }) =>
                `flex justify-start items-center self-stretch gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#c5a059]/10 to-[#c5a059]/0 border-l-4 border-[#c5a059]'
                    : 'hover:bg-white/5 text-white/70 hover:text-white border-l-4 border-transparent'
                }`
              }
            >
              <div className="flex flex-col justify-start items-start shrink-0 relative">
                <svg
                  width={15}
                  height={17}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
                    fill="#C5A059"
                  />
                </svg>
              </div>
              <div className="flex flex-col justify-start items-start shrink-0 relative">
                <p className="text-sm font-semibold text-left">
                  Lịch giảng dạy trong tuần
                </p>
              </div>
            </NavLink>
          </div>
        </div>

        {/* Sidebar Footer Section */}
        <div className="flex flex-col justify-start items-start self-stretch gap-1 p-4 bg-black/20 border-t border-white/10 mt-auto">
          {/* Settings Button */}
          <button
            onClick={() => alert('Chức năng cài đặt tài khoản đang được phát triển.')}
            className="flex justify-start items-center self-stretch gap-4 px-4 py-3 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all text-left w-full"
          >
            <div className="flex flex-col justify-start items-start shrink-0 relative">
              <svg
                width={17}
                height={17}
                viewBox="0 0 17 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <path
                  d="M6.08333 16.6667L5.75 14C5.56944 13.9306 5.39931 13.8472 5.23958 13.75C5.07986 13.6528 4.92361 13.5486 4.77083 13.4375L2.29167 14.4792L0 10.5208L2.14583 8.89583C2.13194 8.79861 2.125 8.70486 2.125 8.61458C2.125 8.52431 2.125 8.43056 2.125 8.33333C2.125 8.23611 2.125 8.14236 2.125 8.05208C2.125 7.96181 2.13194 7.86806 2.14583 7.77083L0 6.14583L2.29167 2.1875L4.77083 3.22917C4.92361 3.11806 5.08333 3.01389 5.25 2.91667C5.41667 2.81944 5.58333 2.73611 5.75 2.66667L6.08333 0H10.6667L11 2.66667C11.1806 2.73611 11.3507 2.81944 11.5104 2.91667C11.6701 3.01389 11.8264 3.11806 11.9792 3.22917L14.4583 2.1875L16.75 6.14583L14.6042 7.77083C14.6181 7.86806 14.625 7.96181 14.625 8.05208C14.625 8.14236 14.625 8.23611 14.625 8.33333C14.625 8.43056 14.625 8.52431 14.625 8.61458C14.625 8.70486 14.6111 8.79861 14.5833 8.89583L16.7292 10.5208L14.4375 14.4792L11.9792 13.4375C11.8264 13.5486 11.6667 13.6528 11.5 13.75C11.3333 13.8472 11.1667 13.9306 11 14L10.6667 16.6667H6.08333ZM7.54167 15H9.1875L9.47917 12.7917C9.90972 12.6806 10.309 12.5174 10.6771 12.3021C11.0451 12.0868 11.3819 11.8264 11.6875 11.5208L13.75 12.375L14.5625 10.9583L12.7708 9.60417C12.8403 9.40972 12.8889 9.20486 12.9167 8.98958C12.9444 8.77431 12.9583 8.55556 12.9583 8.33333C12.9583 8.11111 12.9444 7.89236 12.9167 7.67708C12.8889 7.46181 12.8403 7.25694 12.7708 7.0625L14.5625 5.70833L13.75 4.29167L11.6875 5.16667C11.3819 4.84722 11.0451 4.57986 10.6771 4.36458C10.309 4.14931 9.90972 3.98611 9.47917 3.875L9.20833 1.66667H7.5625L7.27083 3.875C6.84028 3.98611 6.44097 4.14931 6.07292 4.36458C5.70486 4.57986 5.36806 4.84028 5.0625 5.14583L3 4.29167L2.1875 5.70833L3.97917 7.04167C3.90972 7.25 3.86111 7.45833 3.83333 7.66667C3.80556 7.875 3.79167 8.09722 3.79167 8.33333C3.79167 8.55556 3.80556 8.77083 3.83333 8.97917C3.86111 9.1875 3.90972 9.39583 3.97917 9.60417L2.1875 10.9583L3 12.375L5.0625 11.5C5.36806 11.8194 5.70486 12.0868 6.07292 12.3021C6.44097 12.5174 6.84028 12.6806 7.27083 12.7917L7.54167 15ZM8.41667 11.25C9.22222 11.25 9.90972 10.9653 10.4792 10.3958C11.0486 9.82639 11.3333 9.13889 11.3333 8.33333C11.3333 7.52778 11.0486 6.84028 10.4792 6.27083C9.90972 5.70139 9.22222 5.41667 8.41667 5.41667C7.59722 5.41667 6.90625 5.70139 6.34375 6.27083C5.78125 6.84028 5.5 7.52778 5.5 8.33333C5.5 9.13889 5.78125 9.82639 6.34375 10.3958C6.90625 10.9653 7.59722 11.25 8.41667 11.25Z"
                  fill="white"
                  fillOpacity="0.6"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-start items-start shrink-0 relative">
              <p className="text-sm font-medium text-left text-white/60">
                Cài đặt
              </p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate('/login');
            }}
            className="flex justify-start items-center self-stretch gap-4 px-4 py-3 hover:bg-rose-950/20 rounded-lg transition-all text-left w-full"
          >
            <div className="flex flex-col justify-start items-center shrink-0 relative">
              <svg
                width={15}
                height={15}
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <path
                  d="M1.66667 15C1.20833 15 0.815972 14.8368 0.489583 14.5104C0.163194 14.184 0 13.7917 0 13.3333V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H7.5V1.66667H1.66667V13.3333H7.5V15H1.66667ZM10.8333 11.6667L9.6875 10.4583L11.8125 8.33333H5V6.66667H11.8125L9.6875 4.54167L10.8333 3.33333L15 7.5L10.8333 11.6667Z"
                  fill="#BE123C"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-start items-center shrink-0 relative">
              <p className="text-sm font-bold text-center uppercase text-rose-600 tracking-wide">
                ĐĂNG XUẤT
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-screen">
        {/* Topbar Header */}
        <header className="h-14 border-b border-slate-200 bg-white flex justify-between items-center px-4 md:px-6 shadow-sm">
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>AeroMetric ETR</span>
            <span>/</span>
            <span className="text-[#002147]">Introductor</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications */}
            <button className="relative w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#002147] transition-all">
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="currentColor" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#c5a059]"></span>
            </button>

            <div className="h-6 w-[1px] bg-slate-200"></div>

            {/* Language Switcher */}
            <button className="flex items-center gap-2 text-xs font-bold text-[#002147] hover:opacity-80 transition-opacity">
              <span>VIETNAMESE (VN)</span>
              <svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 4.31667L0 0.816667L0.816667 0L3.5 2.68333L6.18333 0L7 0.816667L3.5 4.31667Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </header>

        {/* Outer Outlet containing page contents */}
        <main className="flex-grow flex flex-col p-4 md:p-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default IntroductorLayout;
