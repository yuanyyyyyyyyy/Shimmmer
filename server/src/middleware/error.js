export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: '数据已存在'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      error: '关联数据不存在'
    });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: '请求的资源不存在' });
};

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}
