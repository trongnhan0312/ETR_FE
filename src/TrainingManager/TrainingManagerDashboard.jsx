import { useState, useEffect } from 'react';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';
import './training-manager.scss';

const MIN_BAR_PX = 8;
const MONTH_BAR_CAP = 220;

const TrainingManagerDashboard = () => {
  const { tr } = useLanguage();
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [totalTrainees, setTotalTrainees] = useState('...');
  const [pendingEtrs, setPendingEtrs] = useState('...');
  const [approvedCount, setApprovedCount] = useState('...');
  const [etrVolume, setEtrVolume] = useState(null);
  const [complianceScore, setComplianceScore] = useState('...');
  const [certificationsDue, setCertificationsDue] = useState('...');

  useEffect(() => {
    const loadData = async () => {
      try {
        const dashboard = await fetchMyDashboard();
        if (!dashboard?.overview) return;
        const o = dashboard.overview;

        setTotalTrainees(String(o.totalEtrs));
        setApprovedCount(String(o.completedCount));
        setPendingEtrs(String(o.pendingApprovalCount));
        setComplianceScore(String(o.completionRatePercent));
        setCertificationsDue(String(o.pendingApprovalCount));

        // Monthly ETR volume chart derived from the real status-funnel counts.
        const f = dashboard.funnel;
        if (f) {
          const buckets = [
            f.draft, f.inProgress, f.submitted, f.verified, f.completed, f.returnedForCorrection,
          ];
          const max = Math.max(...buckets, 1);
          setEtrVolume(
            ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].map((month, i) => ({
              month,
              volume: buckets[i] ?? 0,
              height: `${Math.max(MIN_BAR_PX, Math.round(((buckets[i] ?? 0) / max) * MONTH_BAR_CAP))}px`,
              active: i === 2,
            })),
          );
        }
      } catch (err) {
        console.error('Error loading TM dashboard:', err);
      }
    };
    loadData();
  }, []);

  const monthlyVolume = etrVolume || [
    { month: 'JAN', volume: 0, height: '8px', active: false },
    { month: 'FEB', volume: 0, height: '8px', active: false },
    { month: 'MAR', volume: 0, height: '8px', active: true },
    { month: 'APR', volume: 0, height: '8px', active: false },
    { month: 'MAY', volume: 0, height: '8px', active: false },
    { month: 'JUN', volume: 0, height: '8px', active: false },
  ];

  // Calculate approval rate from real data
  const approvalRate = pendingEtrs !== '...' && approvedCount !== '...' ? {
    value: (parseInt(approvedCount) / Math.max(parseInt(approvedCount) + parseInt(pendingEtrs), 1) * 100).toFixed(1),
    label: `${approvedCount}A / ${parseInt(approvedCount) + parseInt(pendingEtrs)}T`
  } : { value: '...', label: '...' };

  return (
    <div className="tm-dashboard-container">
      {/* PAGE HEADER */}
      <div className="tm-dashboard-header">
        <div className="tm-header-title">
          <h1>{tr('Analytics Dashboard')}</h1>
          <p>
            {tr('Operational performance and compliance overview for')}{' '}
            <span className="font-semibold text-[#002147]">Fleet A-320</span>.
          </p>
        </div>

        <div>
          <div className="tm-status-chip">
            <span className="tm-status-dot" style={{ animation: 'pulse 1.5s infinite' }} />
            <p>{tr('SYSTEM SECURE')}</p>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div className="tm-metrics-grid">
        {/* TOTAL TRAINEES */}
        <div className="tm-metric-card tm-border-accent">
          <div className="tm-card-top">
            <span className="tm-card-label">{tr('TOTAL TRAINEES')}</span>
            <svg width={20} height={10} viewBox="0 0 20 10" fill="none">
              <path
                d="M0 10V8.6875C0 8.09028 0.305556 7.60417 0.916667 7.22917C1.52778 6.85417 2.33333 6.66667 3.33333 6.66667C3.51389 6.66667 3.6875 6.67014 3.85417 6.67708C4.02083 6.68403 4.18056 6.70139 4.33333 6.72917C4.13889 7.02083 3.99306 7.32639 3.89583 7.64583C3.79861 7.96528 3.75 8.29861 3.75 8.64583V10H0ZM5 10V8.64583C5 8.20139 5.12153 7.79514 5.36458 7.42708C5.60764 7.05903 5.95139 6.73611 6.39583 6.45833C6.84028 6.18056 7.37153 5.97222 7.98958 5.83333C8.60764 5.69444 9.27778 5.625 10 5.625C10.7361 5.625 11.4132 5.69444 12.0312 5.83333C12.6493 5.97222 13.1806 6.18056 13.625 6.45833C14.0694 6.73611 14.4097 7.05903 14.6458 7.42708C14.8819 7.79514 15 8.20139 15 8.64583V10H5ZM16.25 10V8.64583C16.25 8.28472 16.2049 7.94444 16.1146 7.625C16.0243 7.30556 15.8889 7.00694 15.7083 6.72917C15.8611 6.70139 16.0174 6.68403 16.1771 6.67708C16.3368 6.67014 16.5 6.66667 16.6667 6.66667C17.6667 6.66667 18.4722 6.85069 19.0833 7.21875C19.6944 7.58681 20 8.07639 20 8.6875V10H16.25ZM6.77083 8.33333H13.25C13.1111 8.05556 12.7257 7.8125 12.0938 7.60417C11.4618 7.39583 10.7639 7.29167 10 7.29167C9.23611 7.29167 8.53819 7.39583 7.90625 7.60417C7.27431 7.8125 6.89583 8.05556 6.77083 8.33333ZM3.33333 5.83333C2.875 5.83333 2.48264 5.67014 2.15625 5.34375C1.82986 5.01736 1.66667 4.625 1.66667 4.16667C1.66667 3.69444 1.82986 3.29861 2.15625 2.97917C2.48264 2.65972 2.875 2.5 3.33333 2.5C3.80556 2.5 4.20139 2.65972 4.52083 2.97917C4.84028 3.29861 5 3.69444 5 4.16667C5 4.625 4.84028 5.01736 4.52083 5.34375C4.20139 5.67014 3.80556 5.83333 3.33333 5.83333ZM16.6667 5.83333C16.2083 5.83333 15.816 5.67014 15.4896 5.34375C15.1632 5.01736 15 4.625 15 4.16667C15 3.69444 15.1632 3.29861 15.4896 2.97917C15.816 2.65972 16.2083 2.5 16.6667 2.5C17.1389 2.5 17.5347 2.65972 17.8542 2.97917C18.1736 3.29861 18.3333 3.69444 18.3333 4.16667C18.3333 4.625 18.1736 5.01736 17.8542 5.34375C17.5347 5.67014 17.1389 5.83333 16.6667 5.83333ZM10 5C9.30556 5 8.71528 4.75694 8.22917 4.27083C7.74306 3.78472 7.5 3.19444 7.5 2.5C7.5 1.79167 7.74306 1.19792 8.22917 0.71875C8.71528 0.239583 9.30556 0 10 0C10.7083 0 11.3021 0.239583 11.7812 0.71875C12.2604 1.19792 12.5 1.79167 12.5 2.5C12.5 3.19444 12.2604 3.78472 11.7812 4.27083C11.3021 4.75694 10.7083 5 10 5ZM10 3.33333C10.2361 3.33333 10.434 3.25347 10.5938 3.09375C10.7535 2.93403 10.8333 2.73611 10.8333 2.5C10.8333 2.26389 10.7535 2.06597 10.5938 1.90625C10.434 1.74653 10.2361 1.66667 10 1.66667C9.76389 1.66667 9.56597 1.74653 9.40625 1.90625C9.24653 2.06597 9.16667 2.26389 9.16667 2.5C9.16667 2.73611 9.24653 2.93403 9.40625 3.09375C9.56597 3.25347 9.76389 3.33333 10 3.33333Z"
                fill="#002147"
                fillOpacity={0.3}
              />
            </svg>
          </div>
          <div className="tm-card-value-row">
            <span className="tm-card-value">{totalTrainees}</span>
          </div>
          <div className="tm-progress-bar">
            <div className="tm-progress-fill bg-[#c5a022]" style={{ width: '70%' }} />
          </div>
        </div>

        {/* APPROVAL RATE */}
        <div className="tm-metric-card tm-border-accent">
          <div className="tm-card-top">
            <span className="tm-card-label">{tr('APPROVAL RATE')}</span>
            <svg width={17} height={17} viewBox="0 0 17 17" fill="none">
              <path
                d="M7.16667 12.1667L13.0417 6.29167L11.875 5.125L7.16667 9.83333L4.79167 7.45833L3.625 8.625L7.16667 12.1667ZM8.33333 16.6667C7.18056 16.6667 6.09722 16.4479 5.08333 16.0104C4.06944 15.5729 3.1875 14.9792 2.4375 14.2292C1.6875 13.4792 1.09375 12.5972 0.65625 11.5833C0.21875 10.5694 0 9.48611 0 8.33333C0 7.18056 0.21875 6.09722 0.65625 5.08333C1.09375 4.06944 1.6875 3.1875 2.4375 2.4375C3.1875 1.6875 4.06944 1.09375 5.08333 0.65625C6.09722 0.21875 7.18056 0 8.33333 0C9.48611 0 10.5694 0.21875 11.5833 0.65625C12.5972 1.09375 13.4792 1.6875 14.2292 2.4375C14.9792 3.1875 15.5729 4.06944 16.0104 5.08333C16.4479 6.09722 16.6667 7.18056 16.6667 8.33333C16.6667 9.48611 16.4479 10.5694 16.0104 11.5833C15.5729 12.5972 14.9792 13.4792 14.2292 14.2292C13.4792 14.9792 12.5972 15.5729 11.5833 16.0104C10.5694 16.4479 9.48611 16.6667 8.33333 16.6667ZM8.33333 15C10.1944 15 11.7708 14.3542 13.0625 13.0625C14.3542 11.7708 15 10.1944 15 8.33333C15 6.47222 14.3542 4.89583 13.0625 3.60417C11.7708 2.3125 10.1944 1.66667 8.33333 1.66667C6.47222 1.66667 4.89583 2.3125 3.60417 3.60417C2.3125 4.89583 1.66667 6.47222 1.66667 8.33333C1.66667 10.1944 2.3125 11.7708 3.60417 13.0625C4.89583 14.3542 6.47222 15 8.33333 15Z"
                fill="#002147"
                fillOpacity={0.3}
              />
            </svg>
          </div>
          <div className="tm-card-value-row">
            <span className="tm-card-value">{approvalRate.value}%</span>
            <span className="tm-badge gold">{approvalRate.label}</span>
          </div>
          <div className="tm-progress-bar">
            <div className="tm-progress-fill bg-[#002147]" style={{ width: '98%' }} />
          </div>
        </div>

        {/* PENDING ETRS */}
        <div className="tm-metric-card tm-border-accent">
          <div className="tm-card-top">
            <span className="tm-card-label">{tr('PENDING ETRS')}</span>
            <svg width={16} height={18} viewBox="0 0 16 18" fill="none">
              <path
                d="M11.6667 17.5C10.5139 17.5 9.53125 17.0938 8.71875 16.2812C7.90625 15.4688 7.5 14.4861 7.5 13.3333C7.5 12.1806 7.90625 11.1979 8.71875 10.3854C9.53125 9.57292 10.5139 9.16667 11.6667 9.16667C12.8194 9.16667 13.8021 9.57292 14.6146 10.3854C15.4271 11.1979 15.8333 12.1806 15.8333 13.3333C15.8333 14.4861 15.4271 15.4688 14.6146 16.2812C13.8021 17.0938 12.8194 17.5 11.6667 17.5ZM13.0625 15.3125L13.6458 14.7292L12.0833 13.1667V10.8333H11.25V13.5L13.0625 15.3125ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V3.33333C0 2.875 0.163194 2.48264 0.489583 2.15625C0.815972 1.82986 1.20833 1.66667 1.66667 1.66667H5.14583C5.29861 1.18056 5.59722 0.78125 6.04167 0.46875C6.48611 0.15625 6.97222 0 7.5 0C8.05556 0 8.55208 0.15625 8.98958 0.46875C9.42708 0.78125 9.72222 1.18056 9.875 1.66667H13.3333C13.7917 1.66667 14.184 1.82986 14.5104 2.15625C14.8368 2.48264 15 2.875 15 3.33333V8.54167C14.75 8.36111 14.4861 8.20833 14.2083 8.08333C13.9306 7.95833 13.6389 7.84722 13.3333 7.75V3.33333H11.6667V5.83333H3.33333V3.33333H1.66667V15H6.08333C6.18056 15.3056 6.29167 15.5972 6.41667 15.875C6.54167 16.1528 6.69444 16.4167 6.875 16.6667H1.66667ZM7.5 3.33333C7.73611 3.33333 7.93403 3.25347 8.09375 3.09375C8.25347 2.93403 8.33333 2.73611 8.33333 2.5C8.33333 2.26389 8.25347 2.06597 8.09375 1.90625C7.93403 1.74653 7.73611 1.66667 7.5 1.66667C7.26389 1.66667 7.06597 1.74653 6.90625 1.90625C6.74653 2.06597 6.66667 2.26389 6.66667 2.5C6.66667 2.73611 6.74653 2.93403 6.90625 3.09375C7.06597 3.25347 7.26389 3.33333 7.5 3.33333Z"
                fill="#002147"
                fillOpacity={0.3}
              />
            </svg>
          </div>
          <div className="tm-card-value-row">
            <span className="tm-card-value">{pendingEtrs}</span>
            <span className="tm-badge warn">{tr('URGENT')}</span>
          </div>
          <div className="tm-progress-bar">
            <div className="tm-progress-fill bg-[#b00020]" style={{ width: '20%' }} />
          </div>
        </div>

        {/* COMPLIANCE SCORE */}
        <div className="tm-metric-card tm-border-accent">
          <div className="tm-card-top">
            <span className="tm-card-label">{tr('COMPLIANCE SCORE')}</span>
            <svg width={19} height={18} viewBox="0 0 19 18" fill="none">
              <path
                d="M6.33333 17.5L4.75 14.8333L1.75 14.1667L2.04167 11.0833L0 8.75L2.04167 6.41667L1.75 3.33333L4.75 2.66667L6.33333 0L9.16667 1.20833L12 0L13.5833 2.66667L16.5833 3.33333L16.2917 6.41667L18.3333 8.75L16.2917 11.0833L16.5833 14.1667L13.5833 14.8333L12 17.5L9.16667 16.2917L6.33333 17.5ZM7.04167 15.375L9.16667 14.4583L11.3333 15.375L12.5 13.375L14.7917 12.8333L14.5833 10.5L16.125 8.75L14.5833 6.95833L14.7917 4.625L12.5 4.125L11.2917 2.125L9.16667 3.04167L7 2.125L5.83333 4.125L3.54167 4.625L3.75 6.95833L2.20833 8.75L3.75 10.5L3.54167 12.875L5.83333 13.375L7.04167 15.375ZM8.29167 11.7083L13 7L11.8333 5.79167L8.29167 9.33333L6.5 7.58333L5.33333 8.75L8.29167 11.7083Z"
                fill="#002147"
                fillOpacity={0.3}
              />
            </svg>
          </div>
          <div className="tm-card-value-row">
            <span className="tm-card-value">{complianceScore !== '...' ? `${complianceScore}%` : `${approvalRate.value}%`}</span>
            <span className="tm-badge success">{complianceScore !== '...' ? tr('LIVE') : tr('HIGH')}</span>
          </div>
          <div className="tm-progress-bar">
            <div className="tm-progress-fill bg-[#c5a022]" style={{
              width: complianceScore !== '...' ? `${Math.min(100, Number(complianceScore))}%` : '95.4%'
            }} />
          </div>
        </div>
      </div>

      {/* MID-SECTION: SUBMISSION PROGRESS & PASS/FAIL RATIO */}
      <div className="tm-charts-grid">
        {/* SUBMISSION PROGRESS */}
        <div className="tm-chart-card tm-col-span-2">
          <div className="tm-chart-header">
            <h3>{tr('SUBMISSION PROGRESS')}</h3>
            <div className="tm-chart-legend">
              <span className="legend-dot" />
              <span>{tr('MONTHLY ETR VOLUME')}</span>
            </div>
          </div>

          {/* Bar Chart Graphics */}
          <div className="tm-bar-chart">
            {monthlyVolume.map((item, index) => (
              <div
                key={item.month}
                className="tm-chart-column"
                onMouseEnter={() => setHoveredMonth(index)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Custom tooltip */}
                {(hoveredMonth === index || item.active) && (
                  <div className="tm-chart-tooltip">
                    {item.volume} {tr('ETRs')}
                  </div>
                )}

                {/* Bar */}
                <div
                  className={`column-bar${item.active ? ' active' : ''}`}
                  style={{ height: item.height }}
                />

                {/* Month label */}
                <span className={`column-label${item.active ? ' active' : ''}`}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* QUICK STATS (API-backed only) */}
      <div className="tm-bottom-grid">
        <div className="tm-stats-panel">
          <div className="tm-quick-stats">
            <div className="tm-stat-box tm-border-red">
              <span className="stat-label">{tr('CERTIFICATIONS DUE')}</span>
              <span className="stat-value error">{certificationsDue}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingManagerDashboard;
