import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    ENVIRONMENT: str = Field(default="development", validation_alias="ENVIRONMENT")
    LOG_LEVEL: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    
    # DB Connections
    DATABASE_URL: str = Field(
        default="postgresql://postgres:password123@db:5432/medassist_db",
        validation_alias="DATABASE_URL"
    )
    CHROMA_HOST: str = Field(default="chromadb", validation_alias="CHROMA_HOST")
    CHROMA_PORT: int = Field(default=8000, validation_alias="CHROMA_PORT")
    
    # Security Setup
    JWT_SECRET: str = Field(default="test_dev_secret_key_12345", validation_alias="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Notification Details (Gmail/SMTP)
    SMTP_HOST: str = Field(default="smtp.gmail.com", validation_alias="SMTP_HOST")
    SMTP_PORT: int = Field(default=465, validation_alias="SMTP_PORT")
    SMTP_USER: str = Field(default="test@gmail.com", validation_alias="SMTP_USER")
    SMTP_PASSWORD: str = Field(default="app_password", validation_alias="SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str = Field(default="test@gmail.com", validation_alias="SMTP_FROM_EMAIL")
    
    # ADK/Vertex Settings
    VERTEX_AI_PROJECT_ID: str = Field(default="gcp-project", validation_alias="VERTEX_AI_PROJECT_ID")
    VERTEX_AI_LOCATION: str = "us-central1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
