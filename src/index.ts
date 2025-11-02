import 'reflect-metadata';

// Export types
export * from './types/ConfigTypes.js';

// Export implementations
export { ConfigLoader } from './implementations/ConfigLoader.js';
export { ConfigMerger } from './implementations/ConfigMerger.js';
export { PhaseManager } from './implementations/PhaseManager.js';

// Export default configuration path
export const DEFAULT_CONFIG_PATH = new URL('./configs/default-sdlc.yaml', import.meta.url).pathname;
