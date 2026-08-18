import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createDefaultScenario } from '../core/defaults';
import type {
  CarInputs,
  CustomCostLine,
  IncomeInputs,
  LoanInputs,
  RunningCostInputs,
  Scenario,
} from '../core/types';

/**
 * Persisted with AsyncStorage rather than MMKV so the app runs in Expo Go on a
 * plain phone — no native build required to try it.
 */
interface ScenarioState {
  scenario: Scenario;
  /** Named snapshots the user can flip between to compare cars. */
  saved: Scenario[];
  hydrated: boolean;

  setIncome: (patch: Partial<IncomeInputs>) => void;
  setCar: (patch: Partial<CarInputs>) => void;
  setLoan: (patch: Partial<LoanInputs>) => void;
  setRunning: (patch: Partial<RunningCostInputs>) => void;

  addCostLine: () => void;
  updateCostLine: (id: string, patch: Partial<CustomCostLine>) => void;
  removeCostLine: (id: string) => void;

  rename: (name: string) => void;
  saveCurrent: () => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  reset: () => void;
}

const MAX_SAVED = 3;

export const useScenario = create<ScenarioState>()(
  persist(
    (set, get) => ({
      scenario: createDefaultScenario(),
      saved: [],
      hydrated: false,

      setIncome: (patch) =>
        set((s) => ({ scenario: { ...s.scenario, income: { ...s.scenario.income, ...patch } } })),
      setCar: (patch) => set((s) => ({ scenario: { ...s.scenario, car: { ...s.scenario.car, ...patch } } })),
      setLoan: (patch) => set((s) => ({ scenario: { ...s.scenario, loan: { ...s.scenario.loan, ...patch } } })),
      setRunning: (patch) =>
        set((s) => ({ scenario: { ...s.scenario, running: { ...s.scenario.running, ...patch } } })),

      addCostLine: () =>
        set((s) => ({
          scenario: {
            ...s.scenario,
            running: {
              ...s.scenario.running,
              others: [
                ...s.scenario.running.others,
                { id: `cost-${Date.now()}`, label: '', monthly: 0 },
              ],
            },
          },
        })),

      updateCostLine: (id, patch) =>
        set((s) => ({
          scenario: {
            ...s.scenario,
            running: {
              ...s.scenario.running,
              others: s.scenario.running.others.map((line) =>
                line.id === id ? { ...line, ...patch } : line,
              ),
            },
          },
        })),

      removeCostLine: (id) =>
        set((s) => ({
          scenario: {
            ...s.scenario,
            running: {
              ...s.scenario.running,
              others: s.scenario.running.others.filter((line) => line.id !== id),
            },
          },
        })),

      rename: (name) => set((s) => ({ scenario: { ...s.scenario, name } })),

      saveCurrent: () =>
        set((s) => {
          const snapshot: Scenario = { ...s.scenario, id: `saved-${Date.now()}` };
          const existing = s.saved.filter((item) => item.name !== snapshot.name);
          return { saved: [snapshot, ...existing].slice(0, MAX_SAVED) };
        }),

      loadSaved: (id) => {
        const match = get().saved.find((item) => item.id === id);
        if (match) set({ scenario: { ...match } });
      },

      deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((item) => item.id !== id) })),

      reset: () => set({ scenario: createDefaultScenario() }),
    }),
    {
      name: 'oyc-scenario-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ scenario: state.scenario, saved: state.saved }),
    },
  ),
);

// Persist rehydrates asynchronously; screens wait on `hydrated` so the user
// never sees default numbers flash over their saved ones.
useScenario.persist.onFinishHydration(() => useScenario.setState({ hydrated: true }));
if (useScenario.persist.hasHydrated()) useScenario.setState({ hydrated: true });
