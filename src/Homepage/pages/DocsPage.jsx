import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DocsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('getting-started');

  useEffect(() => {
    document.title = "Platform Documentation & API Reference | ETR Aviation";
  }, []);

  const docTabs = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'user-guide', label: 'User Guide' },
    { id: 'roles-permissions', label: 'Roles & Permissions' },
    { id: 'training-records', label: 'Training Records' },
    { id: 'evidence', label: 'Evidence Management' },
    { id: 'reporting', label: 'Reporting & Exports' },
    { id: 'api-reference', label: 'API Reference' }
  ];

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero" style={{ paddingBottom: '32px' }}>
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> ETR PLATFORM DOCUMENTATION
          </div>
          <h1 className="hero-title">
            Everything you need to <span className="highlight-text-cyan">operate and integrate.</span>
          </h1>
          <p className="hero-subtitle">
            Comprehensive guides for Administrators, Academic Staff, Instructors, Quality Assurance Officers, Training Managers, Students, and Auditors.
          </p>
        </div>
      </section>

      {/* DOCS LAYOUT */}
      <section className="page-section" style={{ paddingTop: 0 }}>
        <div className="docs-container">
          {/* SIDEBAR TABS */}
          <aside className="docs-sidebar">
            <h4>DOCUMENTATION INDEX</h4>
            <ul>
              {docTabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={activeTab === tab.id ? 'active' : ''}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* MAIN ARTICLE AREA */}
          <main className="docs-content">
            {activeTab === 'getting-started' && (
              <article className="doc-article">
                <h2>Getting Started with ETR</h2>
                <p>Welcome to the Electronic Training Record (ETR) Aviation Platform. ETR provides a centralized, auditable system for managing technical training, practical evaluations, and compliance sign-offs.</p>

                <h3>1. System Login</h3>
                <p>Access the portal at <code>/login</code> using your assigned account credentials. The system automatically detects your role permissions and redirects you to your role-specific dashboard.</p>

                <h3>2. Initial Account Setup</h3>
                <p>Upon first login, navigate to Profile settings to confirm your license numbers (FAA A&P, EASA B1/B2, CAAV), company authorization level, and contact email.</p>

                <h3>3. Navigating the Workspace</h3>
                <p>Use the left sidebar navigation in your role layout to manage classes, submit practical checklist evidence, or audit pending ETR approvals.</p>
              </article>
            )}

            {activeTab === 'user-guide' && (
              <article className="doc-article">
                <h2>User Guide & Workflows</h2>
                <p>ETR operates through a structured multi-stage workflow designed for aviation safety compliance.</p>

                <h3>Step 1: Course & Class Enrollment</h3>
                <p>Academic Staff provision courses, subjects, and student enrollments. Instructors are assigned to specific practical sessions.</p>

                <h3>Step 2: Attendance & Practical Evaluation</h3>
                <p>Instructors log session presence and perform hands-on checklist evaluations, marking items as Passed, Retake Needed, or Incomplete.</p>

                <h3>Step 3: Evidence Submission & QA Review</h3>
                <p>Required photos or work order evidence are uploaded. Quality Assurance (QA) Officers review evidence packages for compliance before approving.</p>

                <h3>Step 4: Training Manager Final Approval</h3>
                <p>Training Managers verify overall class scores and issue digital sign-offs, sealing the ETR into a read-only state.</p>
              </article>
            )}

            {activeTab === 'roles-permissions' && (
              <article className="doc-article">
                <h2>Roles & Access Controls</h2>
                <p>ETR enforces strict Role-Based Access Control (RBAC) to preserve data integrity and satisfy aviation regulatory separation of duties.</p>

                <div className="public-table-responsive">
                  <table className="public-table">
                    <thead>
                      <tr>
                        <th>ROLE</th>
                        <th>KEY PERMISSIONS</th>
                        <th>RESTRICTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold text-white">Admin</td>
                        <td>System config, User accounts, Audit logs, Department setup</td>
                        <td>Cannot self-verify QA evidence</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-white">Academic Staff</td>
                        <td>Manage courses, classes, student profiles, subject assignments</td>
                        <td>Cannot sign off practical evaluations</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-white">Instructor</td>
                        <td>Evaluate practical checklists, record attendance, attach evidence</td>
                        <td>Cannot finalize QA review</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-white">QA Officer</td>
                        <td>Audit evidence packages, approve/reject ETRs, search audit trails</td>
                        <td>Cannot edit student scores directly</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-white">Training Manager</td>
                        <td>Final ETR approval, class completion lock, reopening authorized ETRs</td>
                        <td>Requires QA review prior to signoff</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-white">Auditor</td>
                        <td>Read-only inspection portal, export training packages, view audit logs</td>
                        <td>Read-only access across all records</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {activeTab === 'training-records' && (
              <article className="doc-article">
                <h2>Training Records Structure</h2>
                <p>Each Electronic Training Record (ETR) contains full historical metadata for a learner's training program.</p>
                <ul>
                  <li><strong>Record ID & Hash:</strong> Unique system identifier with cryptographic SHA-256 seal.</li>
                  <li><strong>Learner Metadata:</strong> Full name, employee ID, license type, and organization.</li>
                  <li><strong>Subject & Practical Checklists:</strong> Individual task scores, timestamped evaluations, and evaluator ID.</li>
                  <li><strong>Approval Log:</strong> Timestamped signatures from Instructor, QA Officer, and Training Manager.</li>
                </ul>
              </article>
            )}

            {activeTab === 'evidence' && (
              <article className="doc-article">
                <h2>Evidence Storage & Quality Control</h2>
                <p>To meet FAA Part 145 and EASA Part-66 practical assessment requirements, practical checklist tasks require verifications.</p>
                <p>Supported file types include JPEG, PNG, and PDF document scans up to 10MB per task attachment. Photos are tagged with EXIF timestamps and evaluator credentials.</p>
              </article>
            )}

            {activeTab === 'reporting' && (
              <article className="doc-article">
                <h2>Reporting & Export Packages</h2>
                <p>ETR supports automated generation of audit packages:</p>
                <ul>
                  <li><strong>Dashboard Export:</strong> Excel export of active cohort statistics.</li>
                  <li><strong>Training Package PDF:</strong> Complete compiled ETR package including practical checklist results, attendance records, evidence photos, and digital sign-off certificates.</li>
                  <li><strong>Attendance Log PDF:</strong> Formal attendance records signed by certified instructors.</li>
                </ul>
              </article>
            )}

            {activeTab === 'api-reference' && (
              <article className="doc-article">
                <h2>REST API Reference</h2>
                <p>Public-safe REST endpoints for external LMS and HRIS synchronization.</p>

                <div className="code-block-preview">
                  <div className="code-header">GET /api/analytics/overview</div>
                  <pre><code>{`{
  "totalTechnicians": 72480,
  "activeCertifications": 9416,
  "auditPassRate": "99.98%",
  "averageSignoffTime": "4.2 min"
}`}</code></pre>
                </div>

                <div className="code-block-preview" style={{ marginTop: '16px' }}>
                  <div className="code-header">POST /api/contact</div>
                  <pre><code>{`{
  "name": "Jane Smith",
  "email": "jane@airline.com",
  "organization": "AeroTech MRO",
  "inquiryType": "Demo Request",
  "message": "Interested in Part 145 ETR integration."
}`}</code></pre>
                </div>
              </article>
            )}
          </main>
        </div>
      </section>
    </div>
  );
};

export default DocsPage;
