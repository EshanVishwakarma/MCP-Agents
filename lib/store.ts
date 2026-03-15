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

export type FlowSchedule = "morning" | "evening" | "daily";

export type Flow = {
  id: string;
  patientId: string;
  name: string;
  schedule: FlowSchedule;
  instructions: string;
  enabled: boolean;
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
  flows: Flow[];
};

const defaultStore: Store = { patients: [], navigators: [], flows: [] };

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
      flows: Array.isArray(data.flows) ? data.flows : [],
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

export async function updatePatient(
  id: string,
  updates: { displayName?: string }
): Promise<Patient | null> {
  return withLock((store) => {
    const idx = store.patients.findIndex((p) => p.id === id);
    if (idx === -1) return { store, result: null };
    const patient = store.patients[idx];
    const updated: Patient = {
      ...patient,
      ...(updates.displayName !== undefined && {
        displayName: updates.displayName.trim() || undefined,
      }),
    };
    const patients = [...store.patients];
    patients[idx] = updated;
    return { store: { ...store, patients }, result: updated };
  });
}

export async function createFlow(flow: {
  patientId: string;
  name: string;
  schedule: Flow["schedule"];
  instructions: string;
}): Promise<Flow> {
  return withLock((store) => {
    const newFlow: Flow = {
      id: crypto.randomUUID(),
      patientId: flow.patientId,
      name: flow.name.trim(),
      schedule: flow.schedule,
      instructions: flow.instructions.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const flows = [newFlow, ...store.flows];
    return { store: { ...store, flows }, result: newFlow };
  });
}

export function getFlowsByPatient(patientId: string): Flow[] {
  return readStore().flows
    .filter((f) => f.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getFlow(id: string): Flow | undefined {
  return readStore().flows.find((f) => f.id === id);
}

export function getAllFlows(): Flow[] {
  return readStore().flows;
}

export async function updateFlow(
  id: string,
  updates: Partial<Pick<Flow, "name" | "schedule" | "instructions" | "enabled">>
): Promise<Flow | null> {
  return withLock((store) => {
    const idx = store.flows.findIndex((f) => f.id === id);
    if (idx === -1) return { store, result: null };
    const flow = store.flows[idx];
    const updated: Flow = {
      ...flow,
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.schedule !== undefined && { schedule: updates.schedule }),
      ...(updates.instructions !== undefined && {
        instructions: updates.instructions.trim(),
      }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    };
    const flows = [...store.flows];
    flows[idx] = updated;
    return { store: { ...store, flows }, result: updated };
  });
}

export async function deleteFlow(id: string): Promise<boolean> {
  return withLock((store) => {
    const idx = store.flows.findIndex((f) => f.id === id);
    if (idx === -1) return { store, result: false };
    const flows = store.flows.filter((f) => f.id !== id);
    return { store: { ...store, flows }, result: true };
  });
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
