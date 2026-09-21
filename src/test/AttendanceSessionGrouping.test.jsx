import { describe, it, expect, vi } from "vitest";
import {
  groupSessionsBySubject,
  sessionGroupsBySubjectId,
} from "../utils/attendanceSessions";
import {
  REQUIRED_SESSIONS_FALLBACK,
  countClassSessionsBySubject,
  fetchCourseSubjectPlan,
  findClassSessionShortfall,
  findSubjectsWithoutSessionConfig,
  normalizeRequiredSessions,
} from "../utils/classSessions";

// Dữ liệu đúng như API trả cho 1 lớp có nhiều môn, mỗi môn nhiều buổi
const session = (sessionId, subjectId, title, isConfirmed = false) => ({
  sessionId,
  subjectId,
  name: title,
  isConfirmed,
});

describe("groupSessionsBySubject — bảng Điểm danh hiển thị đầy đủ theo môn", () => {
  const sessions = [
    session(1, 1, "Buổi 1"),
    session(2, 1, "Buổi 2"),
    session(3, 1, "Buổi 3", true),
    session(4, 2, "Buổi 1"),
    session(5, 2, "Buổi 2"),
    session(6, 4, "Buổi 1"),
  ];

  it("gom buổi theo từng môn, giữ nguyên thứ tự", () => {
    const groups = groupSessionsBySubject(sessions);
    expect(groups.map((g) => g.subjectId)).toEqual([1, 2, 4]);
    expect(groups.map((g) => g.count)).toEqual([3, 2, 1]);
  });

  it("đếm số buổi đã chốt của mỗi môn", () => {
    const groups = groupSessionsBySubject(sessions);
    expect(groups[0].confirmedCount).toBe(1);
    expect(groups[1].confirmedCount).toBe(0);
  });

  it("đánh số buổi TRONG MÔN (Buổi 1..N) thay vì số thứ tự trộn giữa các môn", () => {
    const groups = groupSessionsBySubject(sessions);
    expect(groups[0].sessions.map((s) => s.indexInSubject)).toEqual([1, 2, 3]);
    expect(groups[1].sessions.map((s) => s.indexInSubject)).toEqual([1, 2]);
    expect(groups[2].sessions.map((s) => s.indexInSubject)).toEqual([1]);
  });

  it("tra cứu nhanh nhóm theo subjectId", () => {
    const map = sessionGroupsBySubjectId(groupSessionsBySubject(sessions));
    expect(map.get("2").count).toBe(2);
    expect(map.get("4").sessions[0].name).toBe("Buổi 1");
  });

  it("chịu được buổi thiếu subjectId và danh sách rỗng", () => {
    expect(groupSessionsBySubject([])).toEqual([]);
    expect(groupSessionsBySubject(null)).toEqual([]);
    const groups = groupSessionsBySubject([{ sessionId: 9 }]);
    expect(groups[0].key).toBe("unknown");
    expect(groups[0].count).toBe(1);
  });
});

describe("classSessions — số buổi mỗi môn do BE sinh theo cấu hình khóa học", () => {
  it("RequiredSessions <= 0 / thiếu → coi như 1 (đúng quy tắc BE)", () => {
    expect(normalizeRequiredSessions(0)).toBe(REQUIRED_SESSIONS_FALLBACK);
    expect(normalizeRequiredSessions(undefined)).toBe(1);
    expect(normalizeRequiredSessions(-5)).toBe(1);
    expect(normalizeRequiredSessions("3")).toBe(3);
  });

  it("đếm số buổi hiện có của lớp theo môn", () => {
    const counted = countClassSessionsBySubject(
      [
        { classId: 43, subjectId: 1 },
        { classId: 43, subjectId: 1 },
        { classId: 43, subjectId: 2 },
        { classId: 44, subjectId: 1 },
      ],
      43,
    );
    expect(counted).toEqual({ 1: 2, 2: 1 });
  });

  it("đọc 'Số buổi yêu cầu' của khóa qua GET /Courses/{id}", async () => {
    const api = {
      get: vi.fn().mockResolvedValue({
        subjects: [
          { subjectId: 1, requiredSessions: 3 },
          { subjectId: 2, requiredSessions: 0 },
        ],
      }),
    };
    const plan = await fetchCourseSubjectPlan(api, 16);
    expect(api.get).toHaveBeenCalledWith("/Courses/16");
    expect(plan).toEqual([
      { subjectId: 1, requiredSessions: 3, configured: true },
      { subjectId: 2, requiredSessions: 1, configured: false },
    ]);
  });

  it("báo các môn CHƯA cấu hình số buổi (lớp sẽ chỉ có 1 buổi/môn)", async () => {
    const api = {
      get: vi.fn().mockResolvedValue({
        subjects: [
          { subjectId: 1, requiredSessions: 0 },
          { subjectId: 2, requiredSessions: 0 },
          { subjectId: 3, requiredSessions: 3 },
        ],
      }),
    };
    const missing = await findSubjectsWithoutSessionConfig({
      api,
      courseId: 16,
      subjectNameById: { 1: "Aviation Regulations", 2: "Aircraft Systems" },
    });
    expect(missing).toEqual([
      { subjectId: 1, subjectName: "Aviation Regulations" },
      { subjectId: 2, subjectName: "Aircraft Systems" },
    ]);
  });

  it("tìm môn thiếu buổi sau khi tạo lớp (case 3 môn chỉ có 1/3 buổi)", async () => {
    const api = {
      get: vi.fn((path) => {
        if (path === "/Courses/16") {
          return Promise.resolve({
            subjects: [
              { subjectId: 1, requiredSessions: 3 },
              { subjectId: 2, requiredSessions: 3 },
            ],
          });
        }
        return Promise.resolve([
          { classId: 43, subjectId: 1 },
          { classId: 43, subjectId: 2 },
          { classId: 43, subjectId: 2 },
        ]);
      }),
    };
    const shortfall = await findClassSessionShortfall({
      api,
      classId: 43,
      courseId: 16,
      subjectNameById: { 1: "Aviation Regulations", 2: "Aircraft Systems" },
    });
    expect(shortfall).toEqual([
      {
        subjectId: 1,
        subjectName: "Aviation Regulations",
        required: 3,
        actual: 1,
      },
      {
        subjectId: 2,
        subjectName: "Aircraft Systems",
        required: 3,
        actual: 2,
      },
    ]);
  });

  it("không cảnh báo khi lớp đã đủ buổi mỗi môn", async () => {
    const api = {
      get: vi.fn((path) => {
        if (path === "/Courses/1") {
          return Promise.resolve({ subjects: [{ subjectId: 1, requiredSessions: 2 }] });
        }
        return Promise.resolve([
          { classId: 1, subjectId: 1 },
          { classId: 1, subjectId: 1 },
        ]);
      }),
    };
    const shortfall = await findClassSessionShortfall({
      api,
      classId: 1,
      courseId: 1,
      subjectNameById: { 1: "Aviation Regulations" },
    });
    expect(shortfall).toEqual([]);
  });
});
