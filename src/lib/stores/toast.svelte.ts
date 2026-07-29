import { tick } from 'svelte';

type Toast = { id: number; text: string; type: 'ok' | 'err'; leaving?: boolean };
let toasts = $state<Toast[]>([]);
let nextId = 0;

export function show(text: string, type: 'ok' | 'err' = 'ok') {
  const id = nextId++;
  toasts.push({ id, text, type });
  tick().then(() => {
    setTimeout(() => {
      const t = toasts.find(t => t.id === id);
      if (t) t.leaving = true;
      setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 250);
    }, 3000);
  });
  return id;
}

export function getToasts() { return toasts; }