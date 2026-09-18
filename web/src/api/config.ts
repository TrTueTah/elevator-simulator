/**
 * The simulation backend origin. Baked in at build time by Vite, so changing it
 * requires a rebuild rather than a restart.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
