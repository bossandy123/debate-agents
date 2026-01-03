/**
 * 浏览器指纹生成工具
 * Feature: 001-voice-emotion
 *
 * 用于识别匿名用户，无需登录即可保存语音设置
 * 注意：这不是安全认证机制，仅用于用户体验优化
 */

export interface FingerprintData {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  deviceMemory: number;
  hardwareConcurrency: number;
}

/**
 * 生成浏览器指纹
 */
export async function generateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const data: FingerprintData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    deviceMemory: (navigator as any).deviceMemory || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
  };

  // 将数据转换为字符串
  const fingerprintString = JSON.stringify(data, Object.keys(data).sort());

  // 使用简单的哈希算法生成指纹
  const hash = await simpleHash(fingerprintString);

  return hash;
}

/**
 * 简单哈希算法（将字符串转换为哈希值）
 */
async function simpleHash(input: string): Promise<string> {
  // 使用 Web Crypto API 进行哈希
  if (crypto && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 取前 16 位作为指纹
    return hashHex.substring(0, 16);
  }

  // 降级方案：简单的字符串哈希
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }

  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * 获取本地存储的用户 ID
 * 如果不存在则生成新的
 */
export async function getUserId(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const storageKey = 'debate_user_id';

  // 尝试从 localStorage 获取
  const existingId = localStorage.getItem(storageKey);
  if (existingId) {
    return existingId;
  }

  // 生成新的用户 ID（基于指纹）
  const fingerprint = await generateFingerprint();

  // 添加时间戳避免冲突
  const userId = `${fingerprint}_${Date.now()}`;

  // 保存到 localStorage
  try {
    localStorage.setItem(storageKey, userId);
  } catch (error) {
    console.warn('[Fingerprint] Failed to save user ID:', error);
  }

  return userId;
}

/**
 * 重置用户 ID（用于测试或清除数据）
 */
export function resetUserId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = 'debate_user_id';
  localStorage.removeItem(storageKey);
  console.log('[Fingerprint] User ID reset');
}

/**
 * 检查是否支持 localStorage
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取设备信息（用于调试）
 */
export function getDeviceInfo(): Partial<FingerprintData> {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
