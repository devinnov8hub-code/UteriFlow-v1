import { getAnonClient, createUserClient } from '../config/supabase.js';
import { AppError } from '../errors/index.js';

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    // Verify the token using the anon client's auth.getUser()
    const { data: { user }, error } = await getAnonClient().auth.getUser(token);

    if (error) {
      const isExpired =
        error.message?.toLowerCase().includes('expired') ||
        error.status === 401 ||
        error.code === 'token_expired';

      return next(new AppError(
        isExpired ? 'Token expired' : 'Invalid token',
        401,
        isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      ));
    }

    if (!user) {
      return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
    }

    // Attach the verified user to the request
    req.user = user;

    // *** THE KEY FIX ***
    // Create a per-request Supabase client that carries the user's JWT.
    // All route handlers must use req.supabase.from(...) — NOT the global
    // supabase singleton — so that RLS policies evaluate as this user and
    // return the correct data instead of silently returning empty arrays.
    req.supabase = createUserClient(token);

    next();
  } catch (err) {
    next(new AppError('Authentication failed', 401, 'UNAUTHORIZED'));
  }
}
