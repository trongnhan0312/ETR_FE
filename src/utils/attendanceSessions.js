/**
 * Gom buổi học theo MÔN cho bảng Điểm danh của giảng viên.
 *
 * Vì sao: một lớp có nhiều môn, mỗi môn lại có nhiều buổi cùng tên ("Buổi 1",
 * "Buổi 2"...). Nếu trả về 1 danh sách phẳng thì các buổi đầu của mọi môn đều
 * hiển thị giống nhau ("Buổi 1") và rất dễ tưởng là thiếu buổi. Gom theo môn giúp
 * mỗi môn có 1 nhóm riêng, bên dưới liệt kê đầy đủ Buổi 1..N của môn đó.
 *
 * - Giữ nguyên thứ tự buổi đã có trong dữ liệu (đã sort theo môn rồi tới buổi).
 * - Mỗi buổi được đánh thêm `indexInSubject` (1-based, tính TRONG MÔN) để cột STT
 *   hiển thị "Buổi 1..N của môn" thay vì số thứ tự trộn giữa các môn.
 */
export const groupSessionsBySubject = (sessions = []) => {
  const groups = [];
  const byKey = new Map();

  (Array.isArray(sessions) ? sessions : []).forEach((session) => {
    const key =
      session?.subjectId == null ? "unknown" : String(session.subjectId);
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        subjectId: session?.subjectId ?? null,
        sessions: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.sessions.push(session);
  });

  return groups.map((group) => ({
    key: group.key,
    subjectId: group.subjectId,
    count: group.sessions.length,
    confirmedCount: group.sessions.filter((s) => s?.isConfirmed === true).length,
    sessions: group.sessions.map((s, index) => ({
      ...s,
      indexInSubject: index + 1,
    })),
  }));
};

/**
 * Dò nhóm của 1 buổi theo subjectId (dùng cho map tra cứu nhanh ở component).
 */
export const sessionGroupsBySubjectId = (groups = []) => {
  const map = new Map();
  (Array.isArray(groups) ? groups : []).forEach((g) => map.set(g.key, g));
  return map;
};
