# Software Requirements Specification (SRS)

## 1. Document control

- Product: مركز إدارة التعاقدات — Contract Management Center
- Version: 0.4.0
- Platform: responsive web application, self-hosted with Docker
- Primary languages: Arabic and English
- Primary document store: Google Drive / Google Docs
- Database: PostgreSQL

## 2. Purpose

The system centralizes contract templates, creates controlled Google Docs copies, routes every copy to the responsible employee folder, tracks the complete contract lifecycle, and certifies completed contracts as PDF by adding a saved PNG stamp and PNG signature to the last page.

## 3. Scope

### 3.1 Included

- Internal account authentication and optional Google Workspace login.
- Role-based access for administrators, supervisors, and contract employees.
- Companies, packages, contract templates and versions.
- Deterministic template resolution without a default-template flag.
- One Google Drive destination folder per user.
- Personal Google Drive OAuth and Google Workspace Shared Drive support.
- Contract copy creation, registry, filters, status updates, and audit trail.
- One-click PDF certification with stamp and signature.
- Password reset by temporary link and local administrator recovery tool.
- Arabic/English UI, RTL/LTR, light/dark themes, and responsive layouts.
- Success/error feedback and confirmation before destructive actions.

### 3.2 Excluded

- Qualified digital signatures backed by PKI certificates.
- External signer identity verification and signing ceremony workflows.
- WhatsApp, CRM/ERP, bulk imports, and advanced reporting exports.
- A universal one-click cloud publish operation independent of a hosting account.

## 4. Actors and permissions

| Actor | Main permissions |
| --- | --- |
| Administrator | Full configuration, users, companies, packages, templates, Drive connection, certification identity, all visible contracts, reset links, audit log |
| Supervisor | Create contracts, view own and direct-report contracts, update allowed statuses, certify contracts in scope |
| Contract employee | Create contracts, view own contracts, update allowed statuses, certify own eligible contracts |

All permissions must be checked on the server. Hiding a button is not an authorization control.

## 5. Functional requirements

### FR-01 Authentication

- The system shall authenticate active internal users by email and bcrypt password hash.
- The system shall reject disabled accounts.
- The system shall revoke existing sessions after password reset or administrator disable.
- Optional Google Workspace login shall still require a matching active internal user.

### FR-02 Password recovery

- The login page shall expose a “Forgot password” flow.
- Reset tokens shall be random, stored only as SHA-256 hashes, single-use, and expire after 30 minutes.
- SMTP delivery shall be optional.
- An administrator shall be able to generate and copy a reset link for a user.
- `RESET-ADMIN-PASSWORD.bat` shall list existing accounts, reset one selected account, activate it, and create the first administrator when no account exists.
- Password recovery shall not delete contracts or database data.

### FR-03 User management and destination folders

- An administrator shall create and update users, roles, manager relationships, department, active state, and Google Drive Folder ID.
- Every employee who creates contracts shall have a writable destination Folder ID.
- The system shall test folder accessibility and write capability before production use.

### FR-04 Company and package management

- Administrators shall create and update companies and packages.
- Codes shall be unique.
- Delete operations shall require confirmation and shall archive/disable records to preserve history.
- Every save or failure shall display explicit feedback.

### FR-05 Template management

- A template shall be linked by Google File ID, not filename.
- A template shall include company, package, type, duration, price, currency, optional offer, version, and effective dates.
- The system shall not expose or use a default-template flag.
- The system shall test that the file is a copyable Google Docs document.
- Older versions and historical contract references shall remain unchanged.

### FR-06 Template resolution

- The employee shall select company, package, contract type, duration, price/currency, and offer.
- The resolver shall consider only active, unarchived, currently effective templates.
- When one exact match exists, the system shall use it.
- When multiple matches remain, the system shall use deterministic version/date ordering or ask the user to select the version; it shall never select randomly.

### FR-07 Contract generation

- The system shall reserve a unique reference number and idempotency key before the Drive call.
- It shall copy the selected Google Docs template without modifying the original.
- It shall create the copy inside the current employee's configured folder.
- It shall store source template identity/version, destination folder, creator, client details, result URL, and timestamps.
- It shall prevent duplicate submissions and warn about a similar recent contract.

### FR-08 Contract registry

- Users shall see only contracts within their permission scope.
- The registry shall support search, company, package, status, and date filters.
- It shall show reference, template version, employee, client, value, status, dates, Google Docs link, and certified PDF link.

### FR-09 Contract certification

- An administrator shall upload one PNG stamp and one PNG signature per company, each no larger than 5 MB.
- Each company shall have independent alignment, image order, gap, page offset, stamp width, and signature width settings.
- Certification shall require an eligible created contract and both images.
- After confirmation, the server shall use Google Docs structural data on a temporary copy to identify the last table, then export the copy as PDF.
- The server shall place the company's signature and stamp directly after the last table using that company's settings and without distortion.
- If the available space is insufficient, the server shall add a clean page rather than cover contract text.
- The temporary positioning copy shall be deleted after export whether certification succeeds or fails.
- The server shall upload the certified PDF to the same employee folder.
- The system shall save the PDF File ID, URL, filename, SHA-256 hash, certifier, and certification date.
- Repeating certification for an already certified contract shall not create a second certified file.
- The audit log shall record certification.

### FR-10 Google Drive connection

- Personal Gmail shall use OAuth with encrypted refresh-token storage.
- Google Workspace may use OAuth or a Service Account in a Shared Drive.
- OAuth credentials and tokens shall never be displayed to normal users or written to logs.
- A single server connection shall serve all users; users do not individually configure Google APIs. Administrators only assign each user a destination folder.

### FR-11 Localization and themes

- The system shall support Arabic/RTL and English/LTR.
- Navigation order, sidebar placement, forms, spacing, and icons shall follow the active direction.
- Locale and theme shall persist in cookies and work without client-side JavaScript.
- The interface shall support light and dark themes.

### FR-12 Feedback and deletion safety

- Create/update actions shall display success or failure notifications.
- Archive/delete/disable actions shall show a modal with the item impact and require explicit confirmation.
- Pending actions shall disable repeat submission and show progress.

### FR-13 Audit logging

- Sensitive operations shall record actor, action, entity type/id, time, request ID when available, and non-secret details.
- Logs shall cover contract creation/failure, certification, settings, account changes, and password reset completion.

## 6. Data requirements

The core entities are User, Agency, Package, ContractTemplate, GeneratedContract, SystemSetting, PasswordResetToken, AuditLog, ReferenceCounter, and Favorite. Historical generated contracts shall retain a snapshot of the original template name, version, and Google File ID even if master data changes.

## 7. Non-functional requirements

### Security

- Passwords shall use bcrypt cost 12.
- Refresh tokens shall use authenticated encryption at rest.
- Secrets shall come from environment variables and shall not be included in release archives.
- Production shall use HTTPS and secure secret management.

### Reliability

- Contract generation shall use unique idempotency keys.
- Database records shall represent creating, completed, and failed states.
- Google Drive failures shall return safe messages and preserve diagnostic logs without secrets.

### Performance

- Normal dashboard and registry requests should complete within 2 seconds under typical internal-team load, excluding Google API latency.
- Contract creation and PDF certification shall provide visible progress for long-running Drive operations.

### Accessibility

- Interactive controls shall be keyboard reachable and have visible focus states.
- Dialogs shall expose modal semantics and accessible labels.
- Color shall not be the only status indicator.

### Compatibility

- Current Chrome, Edge, Firefox, and Safari desktop versions.
- Responsive layouts down to a 390 px viewport.
- Windows local installation through Docker Desktop/WSL and standards-compliant Linux Docker hosting.

### Maintainability

- TypeScript, ESLint, unit tests, production build, Prisma migrations, and Docker image build shall remain part of release verification.

## 8. Deployment and portability

- Local installations store database data in the Docker volume on that device. Moving to another device requires migrating the database volume and `.env`, or starting with new data.
- A published server installation is configured once; users access it through the same HTTPS URL from any device and do not repeat Google OAuth setup.
- The production OAuth redirect URL and `APP_URL`/`AUTH_URL` shall match the published domain.

## 9. Acceptance criteria

1. An administrator can run `START-HERE.bat`, create/sign in to an admin account, and see the redesigned bilingual interface.
2. Arabic displays RTL with the sidebar on the right; English displays LTR with the sidebar on the left.
3. An administrator can connect Drive, test a template and employee folder, and assign distinct folders to two users.
4. Each user creates a contract copy in their own configured folder while the original template remains unchanged.
5. No default-template field or control appears in the UI or active schema.
6. Uploading a PNG stamp and signature then certifying an eligible contract creates one PDF in the same employee folder with both images on its last page.
7. The registry shows the certified status and PDF link.
8. Save operations produce success/failure messages and archive actions require confirmation.
9. A user can reset a forgotten password using a valid temporary link, and an administrator can recover a local account with the Windows tool without deleting data.
10. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` complete successfully.
