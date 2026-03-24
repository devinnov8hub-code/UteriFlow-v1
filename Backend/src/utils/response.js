// Standardized response helpers
export const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    data,
    error: null,
  });
};

export const error = (res, message, code = 'ERROR', statusCode = 400) => {
  return res.status(statusCode).json({
    status: 'error',
    data: null,
    error: { message, code },
  });
};
