import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as authSchema from "./schema";
import * as appSchema from "./app-schema";

const schema = { ...authSchema, ...appSchema };

const client = createClient({
  url: process.env["DATABASE_URL"] ?? "file:./data/app.db",
  // Só usado em produção, contra um banco remoto (Turso) — em dev local
  // (arquivo .db) o libSQL ignora esse campo, então não precisa de valor.
  authToken: process.env["DATABASE_AUTH_TOKEN"],
});

export const db = drizzle(client, { schema });
