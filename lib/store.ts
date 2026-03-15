/**
 * File-based persistence for patients and navigators.
 * Data survives server restarts. For production at scale, replace with a database.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

export type Patient = {
  id: string;
  displayName?: string;
  createdAt: string;
};

export type Navigator = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type Store = {
  patients: Patient[];
  navigators: Navigator[];
};

const defaultStore: Store = { patients: [], navigators: [] };

function getDataDir(): string {
  const dir =
    process.env.ARUL_DATA_DIR ||
    resolve(process.cwd(), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** For debugging: where the store file lives and whether it has data */
export function getStoreDebugInfo(): {
  storePath: string;
  fileExists: boolean;
  navigatorCount: number;
  patientCount: number;
} {
  const path = getStorePath();
  const store = readStore();
  return {
    storePath: path,
    fileExists: existsSync(path),
    navigatorCount: store.navigators.length,
    patientCount: store.patients.length,
  };
}

function getStorePath(): string {
  return join(getDataDir(), "store.json");
}

function readStore(): Store {
  const path = getStorePath();
  if (!existsSync(path)) return { ...defaultStore };
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as Partial<Store>;
    return {
      patients: Array.isArray(data.patients) ? data.patients : [],
      navigators: Array.isArray(data.navigators) ? data.navigators : [],
    };
  } catch {
    return { ...defaultStore };
  }
}

function writeStore(store: Store): void {
  const path = getStorePath();
  writeFileSync(path, JSON.stringify(store, null, 2), "utf-8");
}

let writeQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: (store: Store) => { store: Store; result: T }): Promise<T> {
  writeQueue = writeQueue.then(() => {
    const store = readStore();
    const { store: nextStore, result } = fn(store);
    writeStore(nextStore);
    return result;
  });
  return writeQueue as Promise<T>;
}

export async function createPatient(displayName?: string): Promise<Patient> {
  return withLock((store) => {
    const patient: Patient = {
      id: crypto.randomUUID(),
      displayName: displayName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const patients = [patient, ...store.patients];
    return { store: { ...store, patients }, result: patient };
  });
}

export function getPatient(id: string): Patient | undefined {
  return readStore().patients.find((p) => p.id === id);
}

export function listPatients(): Patient[] {
  const patients = readStore().patients;
  return [...patients].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getNavigatorByEmail(email: string): Navigator | undefined {
  const normalized = email.trim().toLowerCase();
  return readStore().navigators.find(
    (n) => n.email.toLowerCase() === normalized
  );
}

export function getNavigatorById(id: string): Navigator | undefined {
  return readStore().navigators.find((n) => n.id === id);
}

export async function createNavigator(
  email: string,
  passwordHash: string
): Promise<Navigator | null> {
  return withLock((store) => {
    const normalized = email.trim().toLowerCase();
    if (store.navigators.some((n) => n.email.toLowerCase() === normalized)) {
      return { store, result: null };
    }
    const navigator: Navigator = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    const navigators = [...store.navigators, navigator];
    return { store: { ...store, navigators }, result: navigator };
  });
}
