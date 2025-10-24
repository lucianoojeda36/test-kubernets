const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || '5432',
    name: process.env.DATABASE_NAME || 'myapp',
    user: process.env.DATABASE_USER || 'user',
    password: process.env.DATABASE_PASSWORD || 'password'
  },
  enableCors: process.env.ENABLE_CORS === 'true',
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  apiKey: process.env.API_KEY || 'default_key'
};

if (config.enableCors) {
  app.use(cors());
}

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend funcionando!',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/mensaje', (req, res) => {
  res.json({ 
    mensaje: `Hola desde Kubernetes - Ambiente: ${config.nodeEnv}!`,
    config: {
      environment: config.nodeEnv,
      logLevel: config.logLevel,
      database: {
        host: config.database.host,
        name: config.database.name,
        user: config.database.user
      }
    }
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    environment: config.nodeEnv,
    logLevel: config.logLevel,
    cors: config.enableCors,
    database: {
      host: config.database.host,
      port: config.database.port,
      name: config.database.name
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Ambiente: ${config.nodeEnv}`);
  console.log(`Log Level: ${config.logLevel}`);
});