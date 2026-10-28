export const PUBLIC_ENV_NAMES: readonly string[];
export function clientBuildGuard(env: Record<string, string | undefined>): import("vite").Plugin;
