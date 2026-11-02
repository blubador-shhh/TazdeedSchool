/**
 * Sandbox/preview health probe.
 *
 * This is *not* part of the Tazdeed School application surface: the app is a
 * static export with no server runtime, and all data access happens from the
 * browser through Firebase Authentication + Cloud Firestore.
 *
 * It is declared `force-static` so it survives `output: "export"` builds.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    ok: true,
    service: "tazdeed-school-web",
    mode: process.env.NEXT_STATIC_EXPORT === "1" ? "static-export" : "server",
    checkedAt: new Date().toISOString(),
  });
}
