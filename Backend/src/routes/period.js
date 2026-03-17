import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { periodValidators } from '../validators/index.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/first-log', periodValidators.logCreate, validate, async (req, res, next) => {
  try {
    const { startDate, notes } = req.body;
    const userId = req.user.id;

    const { data: existingLog, error: checkError } = await supabase
      .from('period_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_first_log', true)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLog) {
      throw new ConflictError('First period has already been logged');
    }

    const { data, error } = await supabase
      .from('period_logs')
      .insert({ user_id: userId, start_date: startDate, notes: notes ?? null, is_first_log: true })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'First period logged successfully', periodLog: data });
  } catch (error) {
    next(error);
  }
});

router.post('/log', periodValidators.logCreate, validate, async (req, res, next) => {
  try {
    const { startDate, endDate, notes } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('period_logs')
      .insert({
        user_id: userId,
        start_date: startDate,
        end_date: endDate ?? null,
        notes: notes ?? null,
        is_first_log: false,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Period logged successfully', periodLog: data });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ?? 10;
    const offset = req.query.offset ?? 0;

    const { data, error, count } = await supabase
      .from('period_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({ periodLogs: data, total: count, limit, offset });
  } catch (error) {
    next(error);
  }
});

router.put('/log/:id', periodValidators.logUpdate, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, notes } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.json({ message: 'No changes provided' });
    }

    const { data, error } = await supabase
      .from('period_logs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) throw new NotFoundError('Period log not found');

    return res.json({ message: 'Period log updated successfully', periodLog: data });
  } catch (error) {
    next(error);
  }
});

router.delete('/log/:id', periodValidators.logDelete, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('period_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) throw new NotFoundError('Period log not found');

    return res.json({ message: 'Period log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
