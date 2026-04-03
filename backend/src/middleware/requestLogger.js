const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Hook into response finish to log response info
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user ? req.user.userId : 'unauthenticated';
    
    console.log(`[RequestLogger] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms | User: ${userId}`);
  });
  
  next();
};

module.exports = requestLogger;
