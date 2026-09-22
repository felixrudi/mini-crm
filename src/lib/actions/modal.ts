const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function nextFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  if (backwards) return current === 0 ? count - 1 : current - 1;
  return current === count - 1 ? 0 : current + 1;
}

/** Dialog-Verhalten: Rolle, Autofokus, Esc schließt, Tab bleibt im Dialog, Fokus geht zurück. */
export function modal(node: HTMLElement, options: { onclose?: () => void } = {}) {
  let opts = options;
  const previous = document.activeElement as HTMLElement | null;
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');

  const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
  (node.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0])?.focus();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      opts.onclose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = items();
    if (!list.length) return;
    e.preventDefault();
    const i = nextFocusIndex(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey);
    list[i].focus();
  }
  node.addEventListener('keydown', onKey);

  return {
    update(next: { onclose?: () => void }) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('keydown', onKey);
      previous?.focus?.();
    }
  };
}
