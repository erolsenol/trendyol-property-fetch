import { config } from "dotenv"
config({ path: `.env.${process.env.NODE_ENV || "development"}` })

export const CREDENTIALS = process.env.CREDENTIALS === "true"
export const {
    NODE_ENV,
    PORT,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    SESSION_KEY,
    LOG_FORMAT,
    LOG_DIR,
    ORIGIN,
    ACCESS_TOKEN_EXPIRESIN,
    REFRESH_TOKEN_EXPIRESIN,
    API_TAG,
    API_VERSION,
} = process.env
