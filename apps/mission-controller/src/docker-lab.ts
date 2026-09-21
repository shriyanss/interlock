import { existsSync } from "node:fs";
import { execa } from "execa";

/**
 * Resolves the docker-compose.yml for a mission and brings the lab up.
 * Missions without a compose file yet (built before the Docker services
 * exist) fall back to a stub entrypoint so the portal/HMI contract can be
 * developed and tested before the lab is built.
 */
export async function launchLab(
  missionSlug: string,
  composePath: string,
  sessionId: string,
  entrypointHost: string,
): Promise<{ entrypointUrl: string }> {
  if (!existsSync(composePath)) {
    return { entrypointUrl: `http://${entrypointHost}:8080/stub-entrypoint` };
  }
  await execa("docker-compose", ["-f", composePath, "up", "-d", "--build"], {
    env: { ...process.env, SESSION_ID: sessionId, WIREGUARD_SERVERURL: entrypointHost },
  });
  return { entrypointUrl: `http://${entrypointHost}:8080` };
}

export async function teardownLab(composePath: string): Promise<void> {
  if (!existsSync(composePath)) return;
  await execa("docker-compose", ["-f", composePath, "down"]);
}
