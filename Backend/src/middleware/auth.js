import supabase from '../config/supabase.js';
import { AppError } from '../errors/index.js';

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Missing or invalid authorization header', 401));
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('Invalid or expired token', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Authentication failed', 401));
  }
}
