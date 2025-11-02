import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigMerger } from '../../src/implementations/ConfigMerger.js';
import type { ISDLCConfig } from '../../src/types/ConfigTypes.js';
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

describe('ConfigMerger', () => {
  let configMerger: ConfigMerger;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    configMerger = new ConfigMerger(mockLogger);
  });

  describe('merge', () => {
    it('should merge two configurations', () => {
      const baseConfig: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Obj 1'],
                deliverables: ['Del 1'],
                entryConditions: ['Entry 1'],
                exitConditions: ['Exit 1'],
                tasks: [],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ],
        defaultWorkflow: 'workflow1'
      };

      const overrideConfig: ISDLCConfig = {
        version: '1.1.0',
        workflows: [
          {
            id: 'workflow2',
            name: 'Workflow 2',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Obj 1'],
                deliverables: ['Del 1'],
                entryConditions: ['Entry 1'],
                exitConditions: ['Exit 1'],
                tasks: [],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ],
        defaultWorkflow: 'workflow2'
      };

      const merged = configMerger.merge(baseConfig, overrideConfig);

      expect(merged.version).toBe('1.1.0');
      expect(merged.workflows).toHaveLength(2);
      expect(merged.defaultWorkflow).toBe('workflow2');
    });

    it('should override existing workflows', () => {
      const baseConfig: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Original Name',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: []
          }
        ]
      };

      const overrideConfig: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Updated Name',
            version: '1.1.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: []
          }
        ]
      };

      const merged = configMerger.merge(baseConfig, overrideConfig);

      expect(merged.workflows).toHaveLength(1);
      expect(merged.workflows[0].name).toBe('Updated Name');
      expect(merged.workflows[0].version).toBe('1.1.0');
    });

    it('should merge workflow settings', () => {
      const baseConfig: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: [],
            globalSettings: {
              requireApprovalForTransitions: true,
              defaultApprovers: ['user1'],
              timeoutSettings: {
                phaseTimeout: '7 days'
              }
            }
          }
        ]
      };

      const overrideConfig: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: [],
            globalSettings: {
              defaultApprovers: ['user2', 'user3'],
              timeoutSettings: {
                taskTimeout: '24 hours'
              }
            }
          }
        ]
      };

      const merged = configMerger.merge(baseConfig, overrideConfig);

      expect(merged.workflows[0].globalSettings?.requireApprovalForTransitions).toBe(true);
      expect(merged.workflows[0].globalSettings?.defaultApprovers).toEqual(['user2', 'user3']);
      expect(merged.workflows[0].globalSettings?.timeoutSettings).toEqual({
        phaseTimeout: '7 days',
        taskTimeout: '24 hours'
      });
    });
  });

  describe('mergeEnvironment', () => {
    it('should apply environment overrides', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: [],
            globalSettings: {
              requireApprovalForTransitions: true,
              timeoutSettings: {
                phaseTimeout: '7 days'
              }
            }
          }
        ],
        environments: [
          {
            name: 'production',
            overrides: {
              requireApprovalForTransitions: false,
              timeoutSettings: {
                phaseTimeout: '14 days',
                approvalTimeout: '24 hours'
              }
            },
            featureFlags: {
              autoApproval: true
            },
            variables: {
              LOG_LEVEL: 'info'
            }
          }
        ]
      };

      const merged = configMerger.mergeEnvironment(config, 'production');

      expect(merged.workflows[0].globalSettings?.requireApprovalForTransitions).toBe(false);
      expect(merged.workflows[0].globalSettings?.timeoutSettings?.phaseTimeout).toBe('14 days');
      expect(merged.workflows[0].globalSettings?.timeoutSettings?.approvalTimeout).toBe('24 hours');
      expect(merged.metadata?.appliedEnvironment).toBe('production');
      expect(merged.metadata?.featureFlags).toEqual({ autoApproval: true });
      expect(merged.metadata?.environmentVariables).toEqual({ LOG_LEVEL: 'info' });
    });

    it('should return original config if environment not found', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: []
          }
        ]
      };

      const merged = configMerger.mergeEnvironment(config, 'nonexistent');

      expect(merged).toEqual(config);
    });

    it('should create global settings if not present', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'workflow1',
            name: 'Workflow 1',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [],
            transitions: []
            // No globalSettings
          }
        ],
        environments: [
          {
            name: 'dev',
            overrides: {
              requireApprovalForTransitions: false
            }
          }
        ]
      };

      const merged = configMerger.mergeEnvironment(config, 'dev');

      expect(merged.workflows[0].globalSettings).toBeDefined();
      expect(merged.workflows[0].globalSettings?.requireApprovalForTransitions).toBe(false);
    });
  });
});
