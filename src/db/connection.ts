import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库连接类
export class DatabaseConnection {
  private static instance: Database.Database | null = null;
  private static dbPath: string;

  /**
   * 初始化数据库连接
   * @param dbPath 数据库文件路径
   */
  static initialize(dbPath: string): Database.Database {
    if (this.instance) {
      return this.instance;
    }

    this.dbPath = dbPath;

    // 确保数据目录存在
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建数据库连接，启用WAL模式
    this.instance = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // 启用WAL模式以支持并发读
    this.instance.pragma('journal_mode = WAL');
    this.instance.pragma('foreign_keys = ON');

    return this.instance;
  }

  /**
   * 获取数据库连接实例
   */
  static getConnection(): Database.Database {
    if (!this.instance) {
      const dbPath = process.env.DATABASE_PATH || './data/debates.db';
      return this.initialize(dbPath);
    }
    return this.instance;
  }

  /**
   * 关闭数据库连接
   */
  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  /**
   * 执行Schema初始化
   */
  static initializeSchema(): void {
    const db = this.getConnection();
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      console.log('数据库Schema初始化完成');
    } else {
      throw new Error(`Schema文件不存在: ${schemaPath}`);
    }
  }
}

// 默认导出连接实例
export default DatabaseConnection;
