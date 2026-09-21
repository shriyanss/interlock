import { NextResponse } from "next/server";
import { getAllMissions } from "@/lib/missions";

export async function GET() {
  return NextResponse.json(getAllMissions());
}
