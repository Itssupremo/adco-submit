# UI Wireframes

## Shared Authenticated Shell

```text
+--------------------------------------------------------------------------------+
| Sidebar                              | Topbar: Page Title | Theme | User Menu |
|--------------------------------------|-----------------------------------------|
| Dashboard                            |                                         |
| Submissions                          | Main Content Area                       |
| Reports                              | cards / tables / forms / modals         |
| Notifications                        |                                         |
| Users / Logs / Settings              |                                         |
|--------------------------------------|-----------------------------------------|
| My Account                           | Footer                                  |
| Logout                               |                                         |
+--------------------------------------------------------------------------------+
```

## Login Page

Keep the same split-screen visual language as the reference repo.

```text
+--------------------------------------+-----------------------------------------+
| Branded left panel                   | Login card                              |
| - system identity                    | - username                              |
| - descriptive text                   | - password                              |
| - trust/security highlights          | - login button                          |
| - agency marks                       | - validation errors                     |
+--------------------------------------+-----------------------------------------+
```

## Super Admin Dashboard

```text
+--------------------------------------------------------------------------------+
| Stat Cards: Total Users | Total Councils | Pending | Approved | Returned | Arch |
+--------------------------------------------------------------------------------+
| Recent Uploads Table                                                     |
+--------------------------------------------------------------------------------+
| Recent Activities Table                                                  |
+--------------------------------------------------------------------------------+
```

## USM Board Dashboard

```text
+--------------------------------------------------------------------------------+
| Stat Cards: Pending Review | Approved | Returned | Recent Uploads                 |
+--------------------------------------------------------------------------------+
| Submission Review Table                                                   |
| Filters: status | council | date submitted | meeting date                     |
| Actions: View PDF | Approve | Return with Remarks                          |
+--------------------------------------------------------------------------------+
```

## Administrative Council Dashboard

```text
+--------------------------------------------------------------------------------+
| My Submission Card                                                        |
| - title                                                                   |
| - meeting date                                                            |
| - submission date                                                         |
| - current status badge                                                    |
| - remarks                                                                 |
| - upload/replace button                                                   |
+--------------------------------------------------------------------------------+
| Submission History Table                                                  |
+--------------------------------------------------------------------------------+
```

## Submission Management Page

```text
+--------------------------------------------------------------------------------+
| Filters: council | status | date submitted | meeting date                     |
+--------------------------------------------------------------------------------+
| Table: Council | Title | Meeting Date | Submitted At | Status | Actions        |
| Actions: View PDF | Download | Approve | Return | Archive                        |
+--------------------------------------------------------------------------------+
```

## Upload Modal

```text
+--------------------------------------------------------------+
| Upload Administrative Council Submission                     |
|--------------------------------------------------------------|
| Administrative Council Name [readonly or selected]           |
| Document Title                                               |
| Meeting Date                                                 |
| Submission Date [auto/default current date]                  |
| PDF Dropzone                                                 |
| Remarks [readonly for council on initial upload]             |
|--------------------------------------------------------------|
| Cancel                                  Submit / Replace     |
+--------------------------------------------------------------+
```

## Notifications Panel

```text
+--------------------------------------------------------------+
| Notifications                                                |
|--------------------------------------------------------------|
| [Unread] Submission received                                 |
| [Unread] Submission returned                                 |
| [Read]   Submission approved                                 |
| [Read]   Password changed                                    |
+--------------------------------------------------------------+
```

## UI Consistency Rules

- Preserve sidebar-first navigation.
- Preserve Bootstrap card and table patterns.
- Preserve PDF modal viewing behavior.
- Preserve page-level filters above tables.
- Preserve role-specific dashboards instead of a single polymorphic page.