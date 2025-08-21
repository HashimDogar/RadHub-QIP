import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL || "./data/app.db";
fs.rmSync(DB_PATH, { force: true });
console.log("Deleted DB (if existed). Recreating schema...");
import("./../server.js");
