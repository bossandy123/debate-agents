import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { initSchema, validateSchema } from "./schema";

/**
 * 创建一个新的数据库连接（用于测试）
 * @param dbPath - 数据库文件路径，":memory:" 表示内存数据库
 */
export function createDb(dbPath: string = ":memory:"): Database.Database {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

/**
 * SQLite 客户端单例
 * 确保整个应用使用同一个数据库连接
 */
class DatabaseClient {
  private static instance: Database.Database | null = null;

  /**
   * 获取数据库实例（单例模式）
   */
  static getInstance(): Database.Database {
    if (this.instance === null) {
      this.instance = this.createConnection();
    }
    return this.instance;
  }

  /**
   * 创建新的数据库连接
   */
  private static createConnection(): Database.Database {
    const dbPath = process.env.DATABASE_PATH || "./data/debates.db";

    // 确保数据目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 创建数据库连接
    const db = new Database(dbPath);

    // 启用外键约束
    db.pragma("foreign_keys = ON");

    // 初始化 Schema
    if (!validateSchema(db)) {
      initSchema(db);
    }

    return db;
  }

  /**
   * 关闭数据库连接
   */
  static close(): void {
    if (this.instance !== null) {
      this.instance.close();
      this.instance = null;
    }
  }

  /**
   * 重置数据库（仅用于测试）
   */
  static reset(): void {
    if (this.instance !== null) {
      this.instance.close();
    }
    const dbPath = process.env.DATABASE_PATH || "./data/debates.db";
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    this.instance = this.createConnection();
  }
}

/**
 * 获取数据库实例的便捷函数
 */
export function getDb(): Database.Database {
  return DatabaseClient.getInstance();
}

/**
 * 关闭数据库连接的便捷函数
 */
export function closeDb(): void {
  DatabaseClient.close();
}

/**
 * 重置数据库的便捷函数（仅用于测试）
 */
export function resetDb(): void {
  DatabaseClient.reset();
}

export default DatabaseClient;
