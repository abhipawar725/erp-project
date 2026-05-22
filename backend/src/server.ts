import "module-alias/register";
import app from "./app";
import { connectDatabase } from "./config/database";
import { logger } from "./config/logger";
import { env } from "./config/env";

// Load models BEFORE DB connection
import "./database/models/Associations";

async function bootstrap() {
  try {
    await connectDatabase();

    logger.info("Database connected");

    const server = app.listen(env.port, () => {
      logger.info(`Server is started on port ${env.port}`);
    });

    // optional graceful shutdown
    process.on("SIGTERM", () => {
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error("Bootstrap error:", err);
    process.exit(1);
  }
}

bootstrap();