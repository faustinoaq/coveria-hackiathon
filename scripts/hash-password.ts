import { config } from "dotenv";
config({ path: ".env.local" });
import { hashPassword } from "../lib/auth";

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD no esta definido en el entorno.");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  console.log(hash);
}

main();
