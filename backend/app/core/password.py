import re

MIN_LENGTH = 8
MAX_LENGTH = 72

SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{};:,.<>?/\\|~`'\""


def validate_password(password: str, email: str | None = None) -> str:
    """Raise ValueError with a readable message if the password is too weak."""
    if len(password) < MIN_LENGTH:
        raise ValueError(f"Password must be at least {MIN_LENGTH} characters")

    if len(password) > MAX_LENGTH:
        raise ValueError(f"Password must be {MAX_LENGTH} characters or fewer")

    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one letter")

    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number")

    if not any(char in SPECIAL_CHARACTERS for char in password):
        raise ValueError("Password must contain at least one special character")

    if email and password.lower() == email.lower():
        raise ValueError("Password cannot be the same as your email address")

    return password