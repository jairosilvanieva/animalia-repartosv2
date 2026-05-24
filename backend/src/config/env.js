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
  }
};
