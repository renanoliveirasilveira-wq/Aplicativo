import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db";
import { user } from "./db/schema";

export const aceitarTermos = createServerFn({ method: "POST" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({
      headers: headers as unknown as Headers,
    });
    if (!session) throw new Error("Não autenticado");

    await db
      .update(user)
      .set({ termosAceitosEm: new Date() })
      .where(eq(user.id, session.user.id));

    return { aceito: true };
  },
);
