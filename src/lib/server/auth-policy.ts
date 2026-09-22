export type AuthInput = {
  pathname: string;
  dev: boolean;
  sessionValid: boolean;
  proxyUser: boolean;
};

export type AuthDecision = 'allow' | 'login' | 'deny';

function isPublic(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/favicon.png' || pathname === '/manifest.webmanifest') return true;
  return ['/_app/', '/design/', '/icons/', '/sw.js', '/workbox-'].some((p) => pathname.startsWith(p));
}

export function decideAuth(i: AuthInput): AuthDecision {
  if (i.dev) return 'allow';
  if (i.pathname.startsWith('/api/v1/')) return 'allow';
  if (isPublic(i.pathname)) return 'allow';
  if (i.sessionValid || i.proxyUser) return 'allow';
  return i.pathname.startsWith('/api/') ? 'deny' : 'login';
}
