'use client';

// Simple imperative toast — creates a DOM element
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, duration = 2800): void {
  // Remove existing toast
  document.querySelector('.toast')?.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);

  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}