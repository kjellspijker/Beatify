import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.debug("Using .env.example file to supply config environment variables");
    dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SESSION_SECRET = process.env["SESSION_SECRET"];
export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];
export const MYSQL_HOST = process.env["MYSQL_HOST"];
export const MYSQL_PORT = process.env["MYSQL_PORT"];
export const MYSQL_USERNAME = process.env["MYSQL_USERNAME"];
export const MYSQL_PASSWORD = process.env["MYSQL_PASSWORD"];
export const MYSQL_DATABASE = process.env["MYSQL_DATABASE"];

export const SPOTIFY_CLIENT_ID = process.env["SPOTIFY_CLIENT_ID"];
export const SPOTIFY_CLIENT_SECRET = process.env["SPOTIFY_CLIENT_SECRET"];
export const SPOTIFY_CALLBACK_URL = process.env["SPOTIFY_CALLBACK_URL"];

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

if (!MONGODB_URI) {
    logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    process.exit(1);
}
