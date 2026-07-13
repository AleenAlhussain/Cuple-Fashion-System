import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MENU_FILE = path.join(process.cwd(), "src/app/api/menu/menu.json");

export async function GET() {
  try {
    const file = await fs.readFile(MENU_FILE, "utf-8");
    return NextResponse.json(JSON.parse(file));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load menu data", error: error?.message ?? null },
      { status: 500 }
    );
  }
}
