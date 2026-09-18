const configured = import.meta.env.VITE_API_BASE_URL;

/**
 * The simulation backend origin. Baked in at BUILD time by Vite, so changing it
 * requires a rebuild rather than a restart.
 */
export const API_BASE_URL: string = configured ?? 'http://localhost:8080';

/**
 * True when a production build shipped without the variable set. The localhost
 * fallback is right for development and silently wrong once deployed - a built
 * site would sit there failing to reach a machine that isn't there. Better to
 * say so on screen than to look broken for no stated reason.
 */
export const API_BASE_URL_MISSING: boolean = import.meta.env.PROD && !configured;
