import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(".env"), override: true });
config({ path: resolve("../../.env"), override: true });
