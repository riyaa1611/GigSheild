const errorHandler = (err, req, res, next) => {
  console.error('[GlobalErrorHandler]', err);

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  
  // Format based on spec: { error: true, code, message, timestamp }
  res.status(statusCode).json({
    error: true,
    code,
    message,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
