export function errorHandler(err, req, res, next) {
  console.error('[Error]', err);
  const status  = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred.'
    : err.message;
  res.status(status).json({ error: message });
}