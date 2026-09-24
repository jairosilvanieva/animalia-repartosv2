import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-api-key',
  orsApiKey: process.env.ORS_API_KEY || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'animalia_repartos'
  },
  // Integracion WhatsApp via Aoki (Reminder API Service).
  // Si falta apiKey o templateName, la notificacion se saltea (no rompe nada).
  aoki: {
    apiKey: process.env.AOKI_API_KEY || '',
    baseUrl: process.env.AOKI_BASE_URL || 'https://calendar-service.aokitech.com.ar',
    channelAlias: process.env.AOKI_CHANNEL_ALIAS || '1982164931879555',
    templateName: process.env.AOKI_TEMPLATE_NAME || '',
    templateLang: process.env.AOKI_TEMPLATE_LANG || 'es'
  }
};
