from pydantic_settings import BaseSettings, SettingsConfigDict


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


settings = Settings()