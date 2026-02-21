import { create } from 'zustand';

interface SpatialState {
    activePlateId: string | null;
    setActivePlate: (id: string | null) => void;
    clearActivePlate: () => void;
}

export const useSpatialStore = create<SpatialState>((set) => ({
    activePlateId: null,
    setActivePlate: (id) => set({ activePlateId: id }),
    clearActivePlate: () => set({ activePlateId: null }),
}));
