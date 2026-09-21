import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

console.log("Hello from hello-world function!");

export default {
  fetch: withSupabase({ auth: ["none" as never, "secret"] }, async (req, ctx) => {
    const url = new URL(req.url);
    const name = url.searchParams.get("name") ?? "World";

    return Response.json({
      message: `Hello ${name}!`,
      authMode: ctx.authMode,
      timestamp: new Date().toISOString(),
    });
  }),
};

