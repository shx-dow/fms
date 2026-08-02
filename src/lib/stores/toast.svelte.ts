import { tick } from 'svelte';

export type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; text: string; type: 'ok' | 'err' | 'info'; action?: ToastAction; leaving?: boolean };
let toasts = $state<Toast[]>([]);
let nextId = 0;

export function show(text: string, type: 'ok' | 'err' | 'info' = 'ok', action?: ToastAction, duration = 3000) {
  const id = nextId++;
  toasts.push({ id, text, type, action });
  tick().then(() => {
    setTimeout(() => {
      const t = toasts.find(t => t.id === id);
      if (t) t.leaving = true;
      setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 250);
    }, duration);
  });
  return id;
}

export function dismissToast(id: number) {
  const t = toasts.find(t => t.id === id);
  if (t) t.leaving = true;
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 250);
}

export function getToasts() { return toasts; }
