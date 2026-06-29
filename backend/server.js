require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { seedChatbotQuestions } = require("./utils/seedChatbotQuestions");

const PORT = process.env.PORT || 5000;
let server;

// ── Unhandled promise rejections ──────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.name} - ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
    return;
  }
  process.exit(1);
});

// ── Uncaught exceptions ───────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.name} - ${err.message}`);
  process.exit(1);
});

// Root Route
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

// ── Start server ──────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  if (process.env.AUTO_SEED_CHATBOT !== "false") {
    try {
      await seedChatbotQuestions();
    } catch (err) {
      logger.error(`Chatbot auto-seed failed: ${err.message}`);
    }
  }

  server = app.listen(PORT, () => {
    logger.info(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });

  return server;
};

startServer().catch((err) => {
  logger.error(`SERVER START FAILED: ${err.name} - ${err.message}`);
  process.exit(1);
});
