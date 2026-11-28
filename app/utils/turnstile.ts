/** Cloudflare Turnstile script, loaded once on demand (explicit rendering) */
export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface ITurnstileOptions {
  sitekey: string;
  size?: 'normal' | 'flexible' | 'compact';
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

export interface ITurnstile {
  render: (container: HTMLElement, options: ITurnstileOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: ITurnstile;
  }
}

let loading: Promise<ITurnstile> | null = null;

export const loadTurnstile = (): Promise<ITurnstile> => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<ITurnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile not available')));
    script.onerror = () => {
      loading = null; // let a later attempt try again
      script.remove();
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
};
