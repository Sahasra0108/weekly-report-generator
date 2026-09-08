from pydantic_settings import BaseSettings, SettingsConfigDict

@field_validator("DATABASE_URL")
@classmethod
def name_the_driver(cls, v: str) -> str:
    if v.startswith("mysql://"):
        v = v.replace("mysql://", "mysql+pymysql://", 1)
    if "ssl-mode=REQUIRED" in v:
        v = v.replace("ssl-mode=REQUIRED", "ssl_verify_cert=false")
    return v

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    ALGORITHM: str = "HS256"
    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False   # True in production (HTTPS only)
    COOKIE_SAMESITE: str = "lax"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-flash-latest"


settings = Settings()