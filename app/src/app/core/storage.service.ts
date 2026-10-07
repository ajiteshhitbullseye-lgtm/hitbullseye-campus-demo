import { Injectable } from '@angular/core';

/** localStorage with an in-memory fallback (private windows, blocked storage). */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private mem: Record<string, string> = {};
  private readonly prefix = 'hbc1.';

  get(key: string): string | null {
    try {
      const v = localStorage.getItem(this.prefix + key);
      return v === null ? (this.mem[key] ?? null) : v;
    } catch {
      return this.mem[key] ?? null;
    }
  }

  set(key: string, value: string): void {
    this.mem[key] = value;
    try { localStorage.setItem(this.prefix + key, value); } catch { /* memory copy is enough */ }
  }

  remove(key: string): void {
    delete this.mem[key];
    try { localStorage.removeItem(this.prefix + key); } catch { /* ignore */ }
  }

  json<T>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }

  /** Remove every key this app wrote (demo reset). */
  clearAll(): void {
    this.mem = {};
    try {
      Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }
}
