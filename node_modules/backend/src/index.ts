import { createServer } from "./server";
import { env } from "./config/env";
import { initializeSchema } from "./db/schema";
import { seedDatabase } from "./seed/seed";

initializeSchema();
seedDatabase();

const app = createServer();

app.listen(env.port, () => {
  console.log(`IncidentBrain backend running on http://localhost:${env.port}`);
  console.log(`Demo mode: ${env.isDemoMode ? "enabled" : "disabled"}`);
});
