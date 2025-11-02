import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseManager } from '../../src/implementations/PhaseManager.js';
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

describe('PhaseManager', () => {
  let phaseManager: PhaseManager;
  let mockLogger: ILogger;
  let testConfig: ISDLCConfig;

  beforeEach(() => {
    mockLogger = createMockLogger();
    phaseManager = new PhaseManager(mockLogger);

    testConfig = {
      version: '1.0.0',
      workflows: [
        {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          initialPhase: 'phase1',
          phases: [
            {
              id: 'phase1',
              name: 'Phase 1',
              objectives: ['Objective 1'],
              deliverables: ['Deliverable 1'],
              entryConditions: ['Entry 1'],
              exitConditions: ['Exit 1'],
              tasks: [
                {
                  id: 'task1',
                  name: 'Task 1',
                  type: 'manual',
                  required: true
                },
                {
                  id: 'task2',
                  name: 'Task 2',
                  type: 'manual',
                  required: false,
                  dependencies: ['task1']
                }
              ],
              nextPhases: ['phase2', 'phase3'],
              requiresApproval: true
            },
            {
              id: 'phase2',
              name: 'Phase 2',
              objectives: ['Objective 2'],
              deliverables: ['Deliverable 2'],
              entryConditions: ['Entry 2'],
              exitConditions: ['Exit 2'],
              tasks: [],
              nextPhases: ['phase3']
            },
            {
              id: 'phase3',
              name: 'Phase 3',
              objectives: ['Objective 3'],
              deliverables: ['Deliverable 3'],
              entryConditions: ['Entry 3'],
              exitConditions: [],
              tasks: [],
              nextPhases: []
            }
          ],
          transitions: [
            {
              from: 'phase1',
              to: 'phase2',
              conditions: ['Condition 1'],
              requiresApproval: true,
              approvers: ['Manager']
            },
            {
              from: 'phase2',
              to: 'phase3',
              conditions: ['Condition 2']
            }
          ]
        }
      ]
    };

    phaseManager.setConfig(testConfig);
  });

  describe('getPhase', () => {
    it('should return phase by ID', () => {
      const phase = phaseManager.getPhase('test-workflow', 'phase1');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('phase1');
      expect(phase?.name).toBe('Phase 1');
    });

    it('should return undefined for non-existent phase', () => {
      const phase = phaseManager.getPhase('test-workflow', 'nonexistent');

      expect(phase).toBeUndefined();
    });

    it('should return undefined for non-existent workflow', () => {
      const phase = phaseManager.getPhase('nonexistent', 'phase1');

      expect(phase).toBeUndefined();
    });

    it('should return undefined if no config is set', () => {
      const newManager = new PhaseManager(mockLogger);
      const phase = newManager.getPhase('test-workflow', 'phase1');

      expect(phase).toBeUndefined();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return explicit transitions', () => {
      const transitions = phaseManager.getAvailableTransitions('test-workflow', 'phase1');

      expect(transitions).toHaveLength(2); // 1 explicit (phase2) + 1 implicit (phase3)
      expect(transitions.some((t) => t.to === 'phase2' && t.requiresApproval)).toBe(true);
    });

    it('should create implicit transitions from nextPhases', () => {
      const transitions = phaseManager.getAvailableTransitions('test-workflow', 'phase1');

      const implicitTransition = transitions.find((t) => t.to === 'phase3');
      expect(implicitTransition).toBeDefined();
      expect(implicitTransition?.metadata?.implicit).toBe(true);
      expect(implicitTransition?.conditions).toEqual([]);
    });

    it('should not duplicate explicit transitions', () => {
      const transitions = phaseManager.getAvailableTransitions('test-workflow', 'phase2');

      const phase3Transitions = transitions.filter((t) => t.to === 'phase3');
      expect(phase3Transitions).toHaveLength(1);
    });

    it('should return empty array for invalid phase', () => {
      const transitions = phaseManager.getAvailableTransitions('test-workflow', 'nonexistent');

      expect(transitions).toEqual([]);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transition', () => {
      const canTransition = phaseManager.canTransition('test-workflow', 'phase1', 'phase2');

      expect(canTransition).toBe(true);
    });

    it('should return true for implicit transition', () => {
      const canTransition = phaseManager.canTransition('test-workflow', 'phase1', 'phase3');

      expect(canTransition).toBe(true);
    });

    it('should return false for invalid transition', () => {
      const canTransition = phaseManager.canTransition('test-workflow', 'phase2', 'phase1');

      expect(canTransition).toBe(false);
    });
  });

  describe('validatePhaseCompletion', () => {
    it('should validate phase with required tasks', () => {
      const result = phaseManager.validatePhaseCompletion('test-workflow', 'phase1');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about missing exit conditions', () => {
      const result = phaseManager.validatePhaseCompletion('test-workflow', 'phase3');

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('no exit conditions'))).toBe(true);
    });

    it('should warn about dead-end phases', () => {
      const result = phaseManager.validatePhaseCompletion('test-workflow', 'phase3');

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('no available transitions'))).toBe(
        true
      );
    });

    it('should return error for non-existent phase', () => {
      const result = phaseManager.validatePhaseCompletion('test-workflow', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message === 'Phase not found')).toBe(true);
    });

    it('should return error if no config is set', () => {
      const newManager = new PhaseManager(mockLogger);
      const result = newManager.validatePhaseCompletion('test-workflow', 'phase1');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message === 'No configuration loaded')).toBe(true);
    });
  });

  describe('getAllPhases', () => {
    it('should return all phases for workflow', () => {
      const phases = phaseManager.getAllPhases('test-workflow');

      expect(phases).toHaveLength(3);
      expect(phases.map((p) => p.id)).toEqual(['phase1', 'phase2', 'phase3']);
    });

    it('should return empty array for non-existent workflow', () => {
      const phases = phaseManager.getAllPhases('nonexistent');

      expect(phases).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow by ID', () => {
      const workflow = phaseManager.getWorkflow('test-workflow');

      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('test-workflow');
      expect(workflow?.name).toBe('Test Workflow');
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = phaseManager.getWorkflow('nonexistent');

      expect(workflow).toBeUndefined();
    });
  });
});
