import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((req) => {
  if (req.method !== "GET") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 },
    );
  }

  return Response.json({
    message: "hello, it-incubator",
    studentId: 5258,
  });
});
