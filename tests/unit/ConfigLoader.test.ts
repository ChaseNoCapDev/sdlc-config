import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigLoader } from '../../src/implementations/ConfigLoader.js';
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

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    configLoader = new ConfigLoader(mockLogger);
  });

  describe('loadFromString', () => {
    it('should load valid YAML configuration', async () => {
      const yamlContent = `
version: 1.0.0
workflows:
  - id: test-workflow
    name: Test Workflow
    version: 1.0.0
    initialPhase: phase1
    phases:
      - id: phase1
        name: Phase 1
        objectives:
          - Test objective
        deliverables:
          - Test deliverable
        entryConditions:
          - Test entry condition
        exitConditions:
          - Test exit condition
        tasks:
          - id: task1
            name: Task 1
            type: manual
            required: true
        nextPhases:
          - phase2
      - id: phase2
        name: Phase 2
        objectives:
          - Test objective 2
        deliverables:
          - Test deliverable 2
        entryConditions:
          - Test entry condition 2
        exitConditions:
          - Test exit condition 2
        tasks: []
        nextPhases: []
    transitions:
      - from: phase1
        to: phase2
        conditions:
          - Test condition
`;

      const config = await configLoader.loadFromString(yamlContent);

      expect(config.version).toBe('1.0.0');
      expect(config.workflows).toHaveLength(1);
      expect(config.workflows[0].id).toBe('test-workflow');
      expect(config.workflows[0].phases).toHaveLength(2);
    });

    it('should throw error for invalid YAML syntax', async () => {
      const invalidYaml = `
version: 1.0.0
workflows:
  - id: test
    invalid syntax here
`;

      await expect(configLoader.loadFromString(invalidYaml)).rejects.toThrow('Invalid YAML syntax');
    });

    it('should throw error for invalid configuration schema', async () => {
      const invalidConfig = `
version: 1.0.0
workflows:
  - id: test-workflow
    name: Test Workflow
    # missing required fields
`;

      await expect(configLoader.loadFromString(invalidConfig)).rejects.toThrow(
        'Invalid configuration'
      );
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ]
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid phase references', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialPhase: 'nonexistent', // Invalid reference
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [],
                nextPhases: ['nonexistent2'] // Invalid reference
              }
            ],
            transitions: [
              {
                from: 'phase1',
                to: 'nonexistent3', // Invalid reference
                conditions: []
              }
            ]
          }
        ]
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.type === 'reference')).toBe(true);
    });

    it('should detect invalid task dependencies', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [
                  {
                    id: 'task1',
                    name: 'Task 1',
                    type: 'manual',
                    required: true,
                    dependencies: ['nonexistent'] // Invalid dependency
                  }
                ],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ]
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Task dependency'))).toBe(true);
    });

    it('should warn about unused phases', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [],
                nextPhases: []
              },
              {
                id: 'phase2', // This phase is not referenced anywhere
                name: 'Phase 2',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ]
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.type === 'unused')).toBe(true);
    });

    it('should warn about deprecated features', () => {
      const config: ISDLCConfig = {
        version: '1.0.0',
        workflows: [
          {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialPhase: 'phase1',
            phases: [
              {
                id: 'phase1',
                name: 'Phase 1',
                objectives: ['Test'],
                deliverables: ['Test'],
                entryConditions: ['Test'],
                exitConditions: ['Test'],
                tasks: [],
                nextPhases: []
              }
            ],
            transitions: []
          }
        ],
        metadata: {
          legacyMode: true // Deprecated feature
        }
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.type === 'deprecated')).toBe(true);
    });
  });
});
