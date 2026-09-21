import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/app-schema.ts"],
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // O dialeto "sqlite" do drizzle-kit só aceita "url" aqui (não
    // "authToken") — por isso mudanças futuras de schema contra o banco
    // remoto (Turso) não dá pra aplicar com `drizzle-kit push` direto;
    // usamos um script próprio pra isso (ver histórico da migração).
    url: process.env["DATABASE_URL"] ?? "file:./data/app.db",
  },
});
