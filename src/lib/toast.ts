import { writable } from 'svelte/store';

export type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

let nextId = 0;
const { subscribe, update } = writable<Toast[]>([]);

function add(message: string, type: Toast['type'] = 'info') {
  const id = nextId++;
  update(toasts => [...toasts, { id, message, type }]);
  setTimeout(() => remove(id), 3500);
}

function remove(id: number) {
  update(toasts => toasts.filter(t => t.id !== id));
}

export const toasts = { subscribe };
export const toast = {
  success: (msg: string) => add(msg, 'success'),
  error: (msg: string) => add(msg, 'error'),
  info: (msg: string) => add(msg, 'info'),
};
