import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.string().default("development"),
  OPENAI_API_KEY: z.string().optional(),
  GITHUB_DEFAULT_REPO: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: Number(parsed.data.PORT),
  nodeEnv: parsed.data.NODE_ENV,
  openAiApiKey: parsed.data.OPENAI_API_KEY,
  githubDefaultRepo: parsed.data.GITHUB_DEFAULT_REPO,
  isDemoMode: !parsed.data.OPENAI_API_KEY
};
