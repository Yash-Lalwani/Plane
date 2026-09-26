import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

app.listen(env.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
  logger.info(`Server listening on port ${env.PORT}`);
});
