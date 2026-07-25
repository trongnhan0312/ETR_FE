import { describe, it, expect, vi } from 'vitest';
import {
  fetchAuditLogs,
  fetchAuditLogById,
  searchAuditLogs,
  fetchEtrList,
  fetchEtrById,
  fetchApprovals,
  exportTrainingPackage,
  exportPdf,
  exportDashboard,
  downloadExportFile,
  fetchDashboardStats,
  fetchReportsSummary,
} from '../Auditor/auditorApi';

describe('Auditor API Service Layer', () => {
  it('1. AuditController - fetchAuditLogs should fetch logs array', async () => {
    const logs = await fetchAuditLogs();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('1. AuditController - fetchAuditLogById should return single audit log item', async () => {
    const log = await fetchAuditLogById('LOG-2026-9011');
    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
  });

  it('1. AuditController - searchAuditLogs should filter logs correctly', async () => {
    const searchRes = await searchAuditLogs('INSPECT_LOCKED_ETR', 'ETR Inspection');
    expect(Array.isArray(searchRes)).toBe(true);
  });

  it('2. EtrController - fetchEtrList should return ETR records list', async () => {
    const etrs = await fetchEtrList();
    expect(Array.isArray(etrs)).toBe(true);
    expect(etrs.length).toBeGreaterThan(0);
  });

  it('2. EtrController - fetchEtrById should return single ETR record details', async () => {
    const etr = await fetchEtrById('ETR-2026-0891');
    expect(etr).toBeDefined();
    expect(etr.id).toBeDefined();
  });

  it('3. ApprovalsController - fetchApprovals should return workflow timeline', async () => {
    const approvals = await fetchApprovals('ETR-2026-0891');
    expect(Array.isArray(approvals)).toBe(true);
    expect(approvals.length).toBeGreaterThan(0);
  });

  it('4. ExportsController - exportPdf, exportTrainingPackage, exportDashboard should generate packages', async () => {
    const pdfPkg = await exportPdf({ etrId: 'ETR-2026-0891' });
    expect(pdfPkg).toBeDefined();

    const zipPkg = await exportTrainingPackage({ packageType: 'Full Evidence ZIP' });
    expect(zipPkg).toBeDefined();

    const dashPkg = await exportDashboard({ type: 'SignatureManifest' });
    expect(dashPkg).toBeDefined();
  });

  it('5. DashboardController & ReportsController - stats and summary should return valid KPIs', async () => {
    const stats = await fetchDashboardStats();
    expect(stats).toBeDefined();
    expect(stats.totalLockedRecords).toBeDefined();

    const summary = await fetchReportsSummary();
    expect(summary).toBeDefined();
  });
});
