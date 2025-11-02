import { describe, it, expect } from 'vitest';
import { ConfigLoader } from '../../src/implementations/ConfigLoader.js';
import { ConfigMerger } from '../../src/implementations/ConfigMerger.js';
import { PhaseManager } from '../../src/implementations/PhaseManager.js';
import { DEFAULT_CONFIG_PATH } from '../../src/index.js';
import type { ILogger } from '@chasenocap/logger';

// Mock logger
const createMockLogger = (): ILogger =>
  ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => createMockLogger()
  }) as any;

describe('Config Loading Integration', () => {
  it('should load and validate default SDLC configuration', async () => {
    const logger = createMockLogger();
    const configLoader = new ConfigLoader(logger);

    const config = await configLoader.loadFromFile(DEFAULT_CONFIG_PATH);

    expect(config.version).toBe('1.0.0');
    expect(config.workflows).toHaveLength(1);
    expect(config.workflows[0].id).toBe('standard-sdlc');
    expect(config.workflows[0].phases).toHaveLength(6);
    expect(config.environments).toHaveLength(2);
  });

  it('should apply environment configuration', async () => {
    const logger = createMockLogger();
    const configLoader = new ConfigLoader(logger);
    const configMerger = new ConfigMerger(logger);

    const config = await configLoader.loadFromFile(DEFAULT_CONFIG_PATH);
    const prodConfig = configMerger.mergeEnvironment(config, 'production');

    expect(prodConfig.workflows[0].globalSettings?.requireApprovalForTransitions).toBe(true);
    expect(prodConfig.workflows[0].globalSettings?.timeoutSettings?.phaseTimeout).toBe('14 days');
    expect(prodConfig.metadata?.featureFlags?.enhancedMonitoring).toBe(true);
  });

  it('should navigate through SDLC phases', async () => {
    const logger = createMockLogger();
    const configLoader = new ConfigLoader(logger);
    const phaseManager = new PhaseManager(logger);

    const config = await configLoader.loadFromFile(DEFAULT_CONFIG_PATH);
    phaseManager.setConfig(config);

    // Start at requirements phase
    const reqPhase = phaseManager.getPhase('standard-sdlc', 'requirements');
    expect(reqPhase?.name).toBe('Requirements Gathering');

    // Check available transitions
    const transitions = phaseManager.getAvailableTransitions('standard-sdlc', 'requirements');
    expect(transitions.some((t) => t.to === 'design')).toBe(true);

    // Move to design phase
    const canMoveToDesign = phaseManager.canTransition('standard-sdlc', 'requirements', 'design');
    expect(canMoveToDesign).toBe(true);

    // Cannot skip to deployment
    const canSkipToDeployment = phaseManager.canTransition(
      'standard-sdlc',
      'requirements',
      'deployment'
    );
    expect(canSkipToDeployment).toBe(false);
  });

  it('should merge multiple configurations', async () => {
    const logger = createMockLogger();
    const configLoader = new ConfigLoader(logger);
    const configMerger = new ConfigMerger(logger);

    const baseConfig = await configLoader.loadFromFile(DEFAULT_CONFIG_PATH);

    const overrideYaml = `
version: 1.1.0
workflows:
  - id: custom-workflow
    name: Custom Workflow
    version: 1.0.0
    initialPhase: custom-phase
    phases:
      - id: custom-phase
        name: Custom Phase
        objectives:
          - Custom objective
        deliverables:
          - Custom deliverable
        entryConditions: []
        exitConditions: []
        tasks: []
        nextPhases: []
    transitions: []
`;

    const overrideConfig = await configLoader.loadFromString(overrideYaml);
    const merged = configMerger.merge(baseConfig, overrideConfig);

    expect(merged.version).toBe('1.1.0');
    expect(merged.workflows).toHaveLength(2);
    expect(merged.workflows.some((w) => w.id === 'standard-sdlc')).toBe(true);
    expect(merged.workflows.some((w) => w.id === 'custom-workflow')).toBe(true);
  });

  it('should validate phase completion requirements', async () => {
    const logger = createMockLogger();
    const configLoader = new ConfigLoader(logger);
    const phaseManager = new PhaseManager(logger);

    const config = await configLoader.loadFromFile(DEFAULT_CONFIG_PATH);
    phaseManager.setConfig(config);

    // Validate requirements phase
    const validation = phaseManager.validatePhaseCompletion('standard-sdlc', 'requirements');
    expect(validation.valid).toBe(true);

    // Maintenance phase has no exit conditions (warning)
    const maintenanceValidation = phaseManager.validatePhaseCompletion(
      'standard-sdlc',
      'maintenance'
    );
    expect(maintenanceValidation.valid).toBe(true);
    expect(maintenanceValidation.warnings.length).toBeGreaterThan(0);
  });
});
