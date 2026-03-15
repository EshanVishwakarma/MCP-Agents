import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const connectedAccountId = url.searchParams.get("connected_account_id");
  const baseUrl = url.origin;
  const backUrl = new URL(`/connect/${patientId}`, baseUrl);
  if (status === "success" && connectedAccountId) {
    backUrl.searchParams.set("connected", "1");
  }
  if (status === "failed") {
    backUrl.searchParams.set("error", "connection_failed");
  }
  return NextResponse.redirect(backUrl.toString());
}
