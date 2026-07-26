import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "authorization",
      "headers.authorization",
      "access_token",
      "refresh_token",
      "token",
      "credentials",
      "GOOGLE_SERVICE_ACCOUNT_JSON",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "contract-hub",
  },
});
