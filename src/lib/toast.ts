export type ToastDetail = { message: string; variant?: 'default' | 'success' | 'error' | 'warn' };

export function showToast(message: string, variant: ToastDetail['variant'] = 'default') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastDetail>('belmont_toast', { detail: { message, variant } } as any));
}

