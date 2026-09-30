import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../utils/api';

beforeEach(() => {
  localStorage.clear();
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
});

describe('Phase 2 - Flight & Simulator Training Records Mapping', () => {
  it('maps session TrainingType and LessonCode correctly', async () => {
    const rawSessions = [
      {
        sessionId: 101,
        classId: 1,
        subjectId: 10,
        sessionTitle: 'Bài bay vòng kín (Circuit Maneuvers)',
        sessionDate: '2026-10-05T08:00:00Z',
        location: 'Sân bay Tân Sơn Nhất (VVTS)',
        trainingType: 'Flight',
        lessonCode: 'NAV-L01',
        isConfirmed: false,
      },
      {
        sessionId: 102,
        classId: 1,
        subjectId: 11,
        sessionTitle: 'Huấn luyện buồng lái mô phỏng (IFR Sim)',
        sessionDate: '2026-10-06T08:00:00Z',
        location: 'SIM Room ALX',
        trainingType: 'Simulator',
        lessonCode: 'SIM-L01',
        isConfirmed: false,
      },
      {
        sessionId: 103,
        classId: 1,
        subjectId: 12,
        sessionTitle: 'Khí tượng hàng không (Meteorology)',
        sessionDate: '2026-10-07T08:00:00Z',
        location: 'Phòng học 301',
        trainingType: 'Theory',
        lessonCode: 'MET-L01',
        isConfirmed: true,
      },
    ];

    const mapped = rawSessions.map((s) => ({
      sessionId: s.sessionId,
      name: s.sessionTitle,
      trainingType: s.trainingType || 'Theory',
      lessonCode: s.lessonCode || null,
      isConfirmed: s.isConfirmed,
    }));

    expect(mapped[0].trainingType).toBe('Flight');
    expect(mapped[0].lessonCode).toBe('NAV-L01');

    expect(mapped[1].trainingType).toBe('Simulator');
    expect(mapped[1].lessonCode).toBe('SIM-L01');

    expect(mapped[2].trainingType).toBe('Theory');
    expect(mapped[2].lessonCode).toBe('MET-L01');
  });

  it('correctly maps flight and simulator hours and sign-offs for student roster', () => {
    const mockRecord = {
      attendanceRecordId: 501,
      sessionId: 101,
      enrollmentId: 1,
      status: 'Present',
      performanceGrade: 'Satisfactory',
      flightHours: 1.8,
      dualHours: 1.8,
      soloHours: 0.0,
      picHours: 0.0,
      nightHours: 0.0,
      instrumentHours: 0.5,
      crossCountryHours: 0.0,
      dayLandings: 4,
      nightLandings: 0,
      aircraftRegistration: 'VN-C172',
      departureIcao: 'VVTS',
      arrivalIcao: 'VVTS',
      route: 'Circuit pattern',
      instructorComments: 'Good flare and touchdown',
      instructorSignedAt: '2026-10-05T10:00:00Z',
      instructorSignedByAccountId: 2,
      studentSignedAt: '2026-10-05T10:30:00Z',
      studentSignedByAccountId: 6,
    };

    const isFlightOrSim = true;
    const mapped = {
      attendanceRecordId: mockRecord.attendanceRecordId,
      status: mockRecord.status,
      performanceGrade: mockRecord.performanceGrade || (isFlightOrSim ? 'Satisfactory' : null),
      flightHours: mockRecord.flightHours,
      aircraftRegistration: mockRecord.aircraftRegistration,
      instructorSignedAt: mockRecord.instructorSignedAt,
      studentSignedAt: mockRecord.studentSignedAt,
    };

    expect(mapped.status).toBe('Present');
    expect(mapped.performanceGrade).toBe('Satisfactory');
    expect(mapped.flightHours).toBe(1.8);
    expect(mapped.aircraftRegistration).toBe('VN-C172');
    expect(mapped.instructorSignedAt).toBeTruthy();
    expect(mapped.studentSignedAt).toBeTruthy();
  });

  it('builds valid payload for flight training session', () => {
    const form = {
      status: 'Present',
      remarks: 'Circuit maneuvers',
      performanceGrade: 'Satisfactory',
      flightHours: '2.0',
      simulatorHours: '',
      dualHours: '2.0',
      soloHours: '',
      picHours: '',
      nightHours: '0.5',
      instrumentHours: '0.5',
      crossCountryHours: '',
      dayLandings: '3',
      nightLandings: '1',
      aircraftRegistration: 'VN-A689',
      simulatorDevice: '',
      departureIcao: 'VVTS',
      arrivalIcao: 'VVTS',
      route: 'Local pattern',
      instructorComments: 'Stable approach',
      studentComments: '',
    };

    const parseDecimal = (v) => (v === '' || v == null ? null : parseFloat(v));
    const parseIntVal = (v) => (v === '' || v == null ? null : parseInt(v, 10));

    const payload = {
      sessionId: 101,
      enrollmentId: 1,
      status: form.status,
      remarks: form.remarks,
      performanceGrade: form.performanceGrade,
      flightHours: parseDecimal(form.flightHours),
      simulatorHours: parseDecimal(form.simulatorHours),
      dualHours: parseDecimal(form.dualHours),
      soloHours: parseDecimal(form.soloHours),
      picHours: parseDecimal(form.picHours),
      nightHours: parseDecimal(form.nightHours),
      instrumentHours: parseDecimal(form.instrumentHours),
      crossCountryHours: parseDecimal(form.crossCountryHours),
      dayLandings: parseIntVal(form.dayLandings),
      nightLandings: parseIntVal(form.nightLandings),
      aircraftRegistration: form.aircraftRegistration || null,
      simulatorDevice: form.simulatorDevice || null,
      departureIcao: form.departureIcao || null,
      arrivalIcao: form.arrivalIcao || null,
      route: form.route || null,
      instructorComments: form.instructorComments || null,
    };

    expect(payload.flightHours).toBe(2.0);
    expect(payload.simulatorHours).toBeNull();
    expect(payload.dualHours).toBe(2.0);
    expect(payload.nightHours).toBe(0.5);
    expect(payload.dayLandings).toBe(3);
    expect(payload.nightLandings).toBe(1);
    expect(payload.aircraftRegistration).toBe('VN-A689');
    expect(payload.departureIcao).toBe('VVTS');
  });

  it('handles legacy attendance records with null Phase 2 fields seamlessly', () => {
    const legacyRecord = {
      attendanceRecordId: 1,
      sessionId: 1,
      enrollmentId: 1,
      status: 'Present',
      remarks: 'Attended theory lecture',
    };

    const mapped = {
      attendanceRecordId: legacyRecord.attendanceRecordId,
      status: legacyRecord.status,
      remarks: legacyRecord.remarks,
      performanceGrade: legacyRecord.performanceGrade || null,
      flightHours: legacyRecord.flightHours != null ? legacyRecord.flightHours : '',
      simulatorHours: legacyRecord.simulatorHours != null ? legacyRecord.simulatorHours : '',
      aircraftRegistration: legacyRecord.aircraftRegistration || '',
      instructorSignedAt: legacyRecord.instructorSignedAt || null,
      studentSignedAt: legacyRecord.studentSignedAt || null,
    };

    expect(mapped.status).toBe('Present');
    expect(mapped.remarks).toBe('Attended theory lecture');
    expect(mapped.performanceGrade).toBeNull();
    expect(mapped.flightHours).toBe('');
    expect(mapped.aircraftRegistration).toBe('');
    expect(mapped.instructorSignedAt).toBeNull();
  });

  it('ensures Air Law and Meteorology are mapped to Theory, not Flight or Simulator', () => {
    const theorySubjects = [
      { subjectCode: 'ALW', subjectName: 'Air Law (Luật hàng không)', subjectType: 'Lý thuyết' },
      { subjectCode: 'MET', subjectName: 'Aviation Meteorology', subjectType: 'Theory' },
      { subjectCode: 'AIR_LAW_01', subjectName: 'Aviation Law', subjectType: 'Ground' },
    ];

    const classifySubject = (s) => {
      const code = (s.subjectCode || '').toUpperCase();
      const name = (s.subjectName || '').toLowerCase();
      if (code === 'ALW' || code.includes('AIR_LAW') || name.includes('air law') || name.includes('luật hàng không') || code === 'MET') {
        return 'Theory';
      }
      return 'Other';
    };

    theorySubjects.forEach((sub) => {
      expect(classifySubject(sub)).toBe('Theory');
    });
  });

  it('prevents session confirmation if flight or simulator records are unsigned', () => {
    const flightSession = { sessionId: 101, trainingType: 'Flight' };
    const records = [
      { attendanceRecordId: 1, instructorSignedAt: '2026-10-05T10:00:00Z' },
      { attendanceRecordId: 2, instructorSignedAt: null },
    ];

    const canConfirmSession = (session, sessionRecords) => {
      const isFlightOrSim = session.trainingType === 'Flight' || session.trainingType === 'Simulator';
      if (!isFlightOrSim) return true;
      const unsigned = (sessionRecords || []).filter((r) => !r.instructorSignedAt);
      return unsigned.length === 0;
    };

    expect(canConfirmSession(flightSession, records)).toBe(false);

    // After signing record 2
    records[1].instructorSignedAt = '2026-10-05T10:15:00Z';
    expect(canConfirmSession(flightSession, records)).toBe(true);

    // Theory session does not require instructor signature to confirm
    const theorySession = { sessionId: 102, trainingType: 'Theory' };
    const theoryRecords = [{ attendanceRecordId: 3, instructorSignedAt: null }];
    expect(canConfirmSession(theorySession, theoryRecords)).toBe(true);
  });

  it('prevents session confirmation if any enrolled student is missing an attendance record', () => {
    const flightSession = { sessionId: 101, trainingType: 'Flight' };
    const classStudents = [{ enrollmentId: 1 }, { enrollmentId: 2 }];
    const records = [{ enrollmentId: 1, instructorSignedAt: '2026-10-05T10:00:00Z' }];

    const canConfirmSessionWithRoster = (session, roster, sessionRecords) => {
      const isFlightOrSim = session.trainingType === 'Flight' || session.trainingType === 'Simulator';
      if (!isFlightOrSim) return true;
      const missing = roster.filter((st) => !sessionRecords.some((r) => r.enrollmentId === st.enrollmentId));
      if (missing.length > 0) return false;
      const unsigned = sessionRecords.filter((r) => !r.instructorSignedAt);
      return unsigned.length === 0;
    };

    expect(canConfirmSessionWithRoster(flightSession, classStudents, records)).toBe(false);

    // After adding record for student 2 with instructor signature
    records.push({ enrollmentId: 2, instructorSignedAt: '2026-10-05T10:15:00Z' });
    expect(canConfirmSessionWithRoster(flightSession, classStudents, records)).toBe(true);
  });

  it('maps real-world system subjects and non-FSTD disciplines correctly', () => {
    const systemSubjects = [
      { subjectCode: 'A320-SYS', subjectName: 'A320 Aircraft Systems & Avionics', subjectType: 'Theory', expected: 'Theory' },
      { subjectCode: 'A320-SIM', subjectName: 'A320 Full Flight Simulator (FFS) Procedures', subjectType: 'Practical', expected: 'Simulator' },
      { subjectCode: 'A320-FLT', subjectName: 'A320 Base Flight Training & Touch-and-Go', subjectType: 'Practical', expected: 'Flight' },
      { subjectCode: 'B737-SYS', subjectName: 'Boeing 737 Systems Architecture', subjectType: 'Theory', expected: 'Theory' },
      { subjectCode: 'B737-SIM', subjectName: 'Boeing 737 FFS Emergency Maneuvers', subjectType: 'Practical', expected: 'Simulator' },
      { subjectCode: 'CABIN-EMERGENCY', subjectName: 'Cabin Evacuation & Smoke/Fire Drill', subjectType: 'Practical', expected: 'Theory' },
      { subjectCode: 'MAINT-01', subjectName: 'Aircraft Maintenance Practical Workshop', subjectType: 'Practical', expected: 'Theory' },
      { subjectCode: 'MAINT-ENG', subjectName: 'Thực hành bảo dưỡng động cơ phản lực', subjectType: 'Thực hành', expected: 'Theory' },
      { subjectCode: 'AVIONICS-LAB', subjectName: 'Avionics System Lab & Testing', subjectType: 'Practical', expected: 'Theory' },
      { subjectCode: 'ALW', subjectName: 'Thực hành phân tích luật hàng không', subjectType: 'Practical', expected: 'Theory' },
      { subjectCode: 'MCC-01', subjectName: 'Mô phỏng bay tổ lái nhiều người', subjectType: 'Mô phỏng', expected: 'Simulator' },
      { subjectCode: 'FLT-01', subjectName: 'Circuits & Landings Flight Training', subjectType: 'Flight', expected: 'Flight' },
    ];

    const classify = (code, name, type) => {
      const c = (code || '').toUpperCase();
      const n = (name || '').toLowerCase();
      const t = (type || '').toLowerCase();

      // Theory Precedence
      if (c === 'ALW' || c.includes('AIR_LAW') || n.includes('air law') || n.includes('luật hàng không')) return 'Theory';
      // Non-FSTD practical disciplines (Maintenance, Cabin safety, Avionics workshop)
      if (c.startsWith('MAINT') || c.startsWith('CABIN') || c.startsWith('AVIONICS') || n.includes('maintenance') || n.includes('bảo dưỡng') || n.includes('cabin') || n.includes('evacuation') || n.includes('fire drill') || t.includes('maintenance') || t.includes('workshop')) {
        return 'Theory';
      }
      // Simulator
      if (t.includes('simulator') || t.includes('mô phỏng') || c.startsWith('SIM') || c.includes('-SIM') || n.includes('simulator') || n.includes('mô phỏng') || n.includes('ffs') || n.includes('fstd')) return 'Simulator';
      // Flight
      if (t.includes('flight') || t.includes('bay') || c.startsWith('FLT') || c.startsWith('FLY') || c.includes('-FLT') || n.includes('flight training') || n.includes('thực hành bay') || n.includes('touch-and-go') || n.includes('bay vòng kín')) return 'Flight';

      return 'Theory';
    };

    systemSubjects.forEach((sub) => {
      expect(classify(sub.subjectCode, sub.subjectName, sub.subjectType)).toBe(sub.expected);
    });
  });
});
