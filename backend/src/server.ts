import http                  from 'http';
import app                   from './app';
import { env }               from './config/env';
import { connectDatabase }   from './config/database';
import { logger }            from './config/logger';
import { initSocket }        from './socket/socket';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    // Create HTTP server from Express app
    // Socket.IO MUST share the same HTTP server instance
    const httpServer = http.createServer(app);

    // Initialise Socket.IO on the HTTP server
    initSocket(httpServer);

    httpServer.listen(env.port, () => {
      logger.info(`🚀 NexHR API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`🔌 Socket.IO ready on port ${env.port}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP + WebSocket server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
