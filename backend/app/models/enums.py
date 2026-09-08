import enum


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    APPROVED = "APPROVED"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    CARRIED_OVER = "CARRIED_OVER"


class WorkType(str, enum.Enum):
    DEVELOPMENT = "DEVELOPMENT"
    TESTING = "TESTING"
    MEETINGS = "MEETINGS"
    DOCUMENTATION = "DOCUMENTATION"
    REVIEW = "REVIEW"
    OTHER = "OTHER"


class ReviewAction(str, enum.Enum):
    APPROVED = "APPROVED"
    REQUESTED_CHANGES = "REQUESTED_CHANGES"