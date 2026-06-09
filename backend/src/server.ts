import http from "http";
import "module-alias/register";
import app from "./app";
import { connectDatabase } from "./config/database";
import { logger } from "./config/logger";
import { env } from "./config/env";
import { initSocket } from "./socket";

const server = http.createServer(app)

initSocket(server)

// Load models BEFORE DB connection
import "./database/models/Associations";


async function bootstrap() {
  try {
    await connectDatabase();

    logger.info("Database connected");

    const mainserver = server.listen(env.port, () => {
      logger.info(`Server is started on port ${env.port}`);
    });

    // optional graceful shutdown
    process.on("SIGTERM", () => {
      mainserver.close(() => {
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