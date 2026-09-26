// Environment used by every test run. Tests get their own Postgres database and Redis
// database index so they never touch development data. Cloudinary and email are mocked.
export const testEnv = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://plane:plane@localhost:5432/plane_test",
  REDIS_URL: "redis://localhost:6379/1",
  CLIENT_URL: "http://localhost:5173",
  CORS_ORIGIN: "http://localhost:5173",
  ACCESS_TOKEN_SECRET: "test-access-secret",
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_SECRET: "test-refresh-secret",
  REFRESH_TOKEN_EXPIRY: "7d",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Plane <test@example.com>",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
};
