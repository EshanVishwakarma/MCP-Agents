import { getStoreDebugInfo } from "@/lib/store";
import { NextResponse } from "next/server";

/**
 * Debug route: open /api/debug-store to see if the store file exists
 * and how many navigators/patients are in it. Remove or protect in production.
 */
export async function GET() {
  const info = getStoreDebugInfo();
  return NextResponse.json(info);
}
