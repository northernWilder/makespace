import { createClient } from '@supabase/supabase-js';
import type { CalibrationInputs } from './calibration';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;

export type EntryKind = 'calibration' | 'note' | 'setting' | 'protocol';
export type CalibrationSnapshot = {
  inputs: CalibrationInputs;
  adjustment: number;
  difference: number;
  withinTolerance: boolean;
  geometryWarning: boolean;
};
export type Entry = {
  id: string;
  owner_id: string;
  machine: string;
  kind: EntryKind;
  title: string;
  body: string;
  calibration: CalibrationSnapshot | null;
  created_at: string;
};
