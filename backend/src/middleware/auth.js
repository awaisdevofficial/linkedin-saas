import { supabase } from '../services/supabase.js';

// Auth middleware for backend routes.
// Expects a JWT in `Authorization: Bearer <token>` and attaches `req.user`.
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

