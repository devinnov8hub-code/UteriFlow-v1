import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/index.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg;
    return next(new ValidationError(message));
  }
  next();
};
