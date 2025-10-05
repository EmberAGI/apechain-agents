import * as z from "zod";

/**
 * Schema for application settings.
 */
export const Settings = z.object({
  MEMORY_FOLDER: z.string(),
  ONCHAIN_ACTIONS_API_URL: z
    .url()
    .optional()
    .default("https://api.emberai.xyz"),
  ARBITRUM_RPC_URL: z.url(),
  BUNDLER_URL: z.url(),
  LOG_LEVEL: z.string().default("info"),
});

/**
 * Service that provides access to environment settings.
 */
export class Environment {
  /**
   * @param settings - The application settings parsed from environment variables.
   */
  constructor(public settings = Settings.parse(process.env)) {}
}
