/**
 * Rate Limiter Middleware
 * Protege contra abuse com limite de requisições por IP
 */

import rateLimit from 'express-rate-limit';

import { logger } from '../lib/logger';

/**
 * Rate limiter para API de otimização
 * 10 requests a cada 15 minutos por IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 requests por IP
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Muitas requisições deste IP. Por favor, tente novamente em 15 minutos.',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      error: 'Muitas requisições deste IP. Por favor, tente novamente em 15 minutos.',
      retryAfter: '15 minutes'
    });
  },
  skip: (req) => {
    // Skip rate limit para IPs whitelist (opcional)
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip || '');
  }
});

/**
 * Rate limiter mais permissivo para endpoints públicos
 * 30 requests a cada 15 minutos
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.'
  }
});

/**
 * Rate limiter MUITO restritivo para endpoints sensíveis
 * 3 requests a cada 15 minutos
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de requisições excedido. Aguarde 15 minutos.'
  },
  handler: (req, res) => {
    logger.error('Strict rate limit exceeded - possible abuse', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      error: 'Limite de requisições excedido. Aguarde 15 minutos.'
    });
  }
});
