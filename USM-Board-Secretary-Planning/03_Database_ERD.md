# Database ERD

## Reference Repository ERD

```mermaid
erDiagram
    USER ||--o{ ACTIVITY_LOG : creates
    SUC ||--o{ AGENDA : owns
    SUC ||--o{ DOCUMENT : owns

    USER {
        objectId _id
        string username
        string password
        string email
        string fullname
        string role
        string occCode
        string sucAbbreviation
        date createdAt
        date updatedAt
    }

    SUC {
        objectId _id
        string sucName
        string abbreviation
        string region
        string address
        string president
        string email
        string contact
        string boardSecretaryName
        string boardSecretaryEmail
        string boardSecretaryContact
        string dateOfBoardMeeting
        string chedOfficial
        string occCode
        string section
        date createdAt
        date updatedAt
    }

    AGENDA {
        objectId _id
        objectId sucId
        string sucName
        number year
        string quarter
        object oldAgenda
        object newAgenda
        array oldAgendaHistory
        array newAgendaHistory
        date createdAt
        date updatedAt
    }

    DOCUMENT {
        objectId _id
        objectId sucId
        string sucName
        number year
        string pageType
        string slot
        object file
        array fileHistory
        date createdAt
        date updatedAt
    }

    DATE_BOARD_MEETING {
        objectId _id
        string sucAbbreviation
        string sucName
        string meetingDate
        string meetingTime
        string title
        string notes
        string meetingType
        string location
        string setBy
        date createdAt
        date updatedAt
    }

    ACTIVITY_LOG {
        objectId _id
        objectId userId
        string username
        string fullname
        string role
        string occCode
        string sucAbbreviation
        string action
        string details
        string ipAddress
        date createdAt
        date updatedAt
    }
```

## Planned USM System ERD

```mermaid
erDiagram
    USER ||--o{ SUBMISSION : owns
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY_LOG : creates
    COUNCIL ||--o{ SUBMISSION : owns
    SUBMISSION ||--o{ SUBMISSION_HISTORY : versions

    USER {
        objectId _id
        string username
        string password
        string email
        string fullname
        string role
        objectId councilId
        boolean isActive
        date lastPasswordChangeAt
        date createdAt
        date updatedAt
    }

    COUNCIL {
        objectId _id
        string councilName
        string abbreviation
        string contactEmail
        string contactNumber
        string status
        date createdAt
        date updatedAt
    }

    SUBMISSION {
        objectId _id
        objectId councilId
        objectId submittedByUserId
        string documentTitle
        date meetingDate
        date submissionDate
        string status
        string remarks
        object file
        boolean isArchived
        object approvedBy
        object returnedBy
        date createdAt
        date updatedAt
    }

    SUBMISSION_HISTORY {
        objectId _id
        objectId submissionId
        string filename
        string contentType
        string s3Key
        number version
        string action
        string remarks
        object changedBy
        date uploadedAt
        date createdAt
    }

    NOTIFICATION {
        objectId _id
        objectId userId
        string type
        string title
        string message
        boolean isRead
        object meta
        date createdAt
        date updatedAt
    }

    ACTIVITY_LOG {
        objectId _id
        objectId userId
        string username
        string fullname
        string role
        string action
        string details
        string ipAddress
        date createdAt
        date updatedAt
    }

    SYSTEM_SETTING {
        objectId _id
        string key
        mixed value
        string description
        date updatedAt
    }
```

## Design Notes for the New System

- `Council` replaces `Suc` as the primary organization entity.
- `Submission` replaces the combined `Agenda` and `Document` domain.
- One active submission per council is enforced by controller logic and unique indexing.
- `SubmissionHistory` preserves prior uploads when a council replaces a returned document.
- `Notification` and `SystemSetting` are additive modules not present in the reference repo, but they fit the same model/controller pattern.