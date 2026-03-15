/**
 * Patient persistence. Uses file-based store (see lib/store.ts).
 * Replace store with a database for production at scale.
 */

export {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  type Patient,
} from "./store";
