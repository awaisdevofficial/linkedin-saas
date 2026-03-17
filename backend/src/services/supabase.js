import { getClient } from './supabase.service.js';

// Service-role Supabase client for secure server-side operations.
// Note: This bypasses RLS, so only use it in trusted backend code.
//
// We initialize lazily (via Proxy) so `load-env.js` has time to populate
// process.env before Supabase client creation.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

