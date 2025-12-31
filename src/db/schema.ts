import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * 数据库Schema管理类
 * 负责数据库初始化和迁移
 */
export class DatabaseSchema {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 初始化数据库Schema
   * 创建所有表和索引
   */
  initialize(): void {
    try {
      // 读取并执行schema.sql
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');

      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
        logger.info('数据库Schema初始化成功');
      } else {
        throw new Error(`Schema文件不存在: ${schemaPath}`);
      }
    } catch (error) {
      logger.error('数据库Schema初始化失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 检查数据库是否已初始化
   */
  isInitialized(): boolean {
    try {
      const result = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debates'")
        .get();
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * 获取数据库版本
   */
  getVersion(): number {
    const result = this.db
      .prepare('PRAGMA user_version')
      .get() as { user_version: number } | undefined;
    return result?.user_version || 0;
  }

  /**
   * 设置数据库版本
   */
  setVersion(version: number): void {
    this.db.exec(`PRAGMA user_version = ${version}`);
    logger.info(`数据库版本已设置为 ${version}`);
  }

  /**
   * 执行迁移
   * @param migrationVersion 迁移版本号
   * @param migrationSql 迁移SQL语句
   */
  migrate(migrationVersion: number, migrationSql: string): void {
    try {
      this.db.exec('BEGIN TRANSACTION');

      const currentVersion = this.getVersion();
      if (currentVersion >= migrationVersion) {
        logger.info(`数据库版本已是 ${currentVersion}，跳过迁移 ${migrationVersion}`);
        this.db.exec('ROLLBACK');
        return;
      }

      this.db.exec(migrationSql);
      this.setVersion(migrationVersion);

      this.db.exec('COMMIT');
      logger.info(`数据库迁移到版本 ${migrationVersion} 成功`);
    } catch (error) {
      this.db.exec('ROLLBACK');
      logger.error(`数据库迁移到版本 ${migrationVersion} 失败`, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  truncateAll(): void {
    this.db.exec('BEGIN TRANSACTION');

    const tables = ['votes', 'help_requests', 'audience_requests', 'scores', 'messages', 'rounds', 'agents', 'debates'];

    for (const table of tables) {
      this.db.exec(`DELETE FROM ${table}`);
    }

    this.db.exec('COMMIT');
    logger.info('所有数据已清空');
  }
}

export default DatabaseSchema;
