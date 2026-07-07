# Folder Structure

## Reference Repository Structure

```text
api/
  index.js
backend/
  controllers/
  data/
  middleware/
  models/
  routes/
  utils/
  seed.js
  server.js
frontend/
  public/
  src/
    components/
    pages/
    services/
    App.jsx
    main.jsx
scripts/
  generate-docs.js
```

## Planned USM Structure

The new system should preserve the same top-level structure.

```text
api/
  index.js
backend/
  controllers/
    authController.js
    userController.js
    councilController.js
    submissionController.js
    notificationController.js
    activityLogController.js
    settingsController.js
    reportController.js
  middleware/
    auth.js
  models/
    User.js
    Council.js
    Submission.js
    SubmissionHistory.js
    Notification.js
    ActivityLog.js
    SystemSetting.js
  routes/
    authRoutes.js
    userRoutes.js
    councilRoutes.js
    submissionRoutes.js
    notificationRoutes.js
    activityLogRoutes.js
    settingsRoutes.js
    reportRoutes.js
  utils/
    activityLogger.js
    s3Storage.js
  data/
    councils.xlsx or seed sources
  seed.js
  server.js
frontend/
  public/
  src/
    components/
      Sidebar.jsx
      PdfViewer.jsx
      UploadModal.jsx
      StatusBadge.jsx
      NotificationPanel.jsx
      ConfirmModal.jsx
    pages/
      Login.jsx
      SuperAdminDashboard.jsx
      BoardDashboard.jsx
      CouncilDashboard.jsx
      UserManagement.jsx
      SubmissionManagement.jsx
      Reports.jsx
      Notifications.jsx
      ActivityLogs.jsx
      Settings.jsx
      MyAccount.jsx
    services/
      api.js
    App.jsx
    main.jsx
```

## Folder-Level Rules to Preserve

- Keep controllers thin enough to remain readable, but still as the primary business-logic location unless you explicitly approve a service layer.
- Keep route files declarative and small.
- Keep model files singular and domain-focused.
- Keep frontend pages route-oriented and components reusable.
- Keep API wrappers centralized in one frontend service file for consistency with the reference repo.