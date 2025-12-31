import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { initSchema } from "@/lib/db/schema";

interface TableRow {
  name: string;
}

export const runtime = "nodejs";

/**
 * GET /api/db - 数据库状态检查
 */
export async function GET() {
  try {
    const db = getDb();

    // 检查数据库连接
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as TableRow[];

    return NextResponse.json({
      status: "ok",
      database: "connected",
      tables: result.map((r) => r.name),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "数据库连接失败",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/db/init - 初始化数据库 Schema
 */
export async function POST() {
  try {
    const db = getDb();
    initSchema(db);

    return NextResponse.json({
      status: "ok",
      message: "数据库初始化成功",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "数据库初始化失败",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
