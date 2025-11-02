import { injectable, inject } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type {
  IPhaseManager,
  ISDLCConfig,
  ISDLCPhase,
  ISDLCTransition,
  ISDLCWorkflow,
  IConfigValidationResult,
  IValidationError,
  IValidationWarning
} from '../types/ConfigTypes.js';

@injectable()
export class PhaseManager implements IPhaseManager {
  private config: ISDLCConfig | null = null;

  constructor(@inject('ILogger') private logger: ILogger) {}

  setConfig(config: ISDLCConfig): void {
    this.config = config;
  }

  getPhase(workflowId: string, phaseId: string): ISDLCPhase | undefined {
    const childLogger = this.logger.child({
      component: 'PhaseManager',
      workflowId,
      phaseId
    });

    if (!this.config) {
      childLogger.error('No configuration loaded');
      return undefined;
    }

    const workflow = this.config.workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      childLogger.warn('Workflow not found');
      return undefined;
    }

    const phase = workflow.phases.find((p) => p.id === phaseId);
    if (!phase) {
      childLogger.warn('Phase not found');
      return undefined;
    }

    childLogger.debug('Phase retrieved successfully');
    return phase;
  }

  getAvailableTransitions(workflowId: string, currentPhaseId: string): ISDLCTransition[] {
    const childLogger = this.logger.child({
      component: 'PhaseManager',
      workflowId,
      currentPhaseId
    });

    if (!this.config) {
      childLogger.error('No configuration loaded');
      return [];
    }

    const workflow = this.config.workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      childLogger.warn('Workflow not found');
      return [];
    }

    const phase = this.getPhase(workflowId, currentPhaseId);
    if (!phase) {
      return [];
    }

    // Get transitions from current phase
    const availableTransitions = workflow.transitions.filter((t) => t.from === currentPhaseId);

    // Also check phase.nextPhases for implicit transitions
    const explicitTransitionTargets = new Set(availableTransitions.map((t) => t.to));

    phase.nextPhases.forEach((nextPhaseId) => {
      if (!explicitTransitionTargets.has(nextPhaseId)) {
        // Create implicit transition
        availableTransitions.push({
          from: currentPhaseId,
          to: nextPhaseId,
          conditions: [],
          metadata: { implicit: true }
        });
      }
    });

    childLogger.debug('Available transitions retrieved', {
      count: availableTransitions.length,
      targets: availableTransitions.map((t) => t.to)
    });

    return availableTransitions;
  }

  canTransition(workflowId: string, from: string, to: string): boolean {
    const childLogger = this.logger.child({
      component: 'PhaseManager',
      workflowId,
      from,
      to
    });

    const availableTransitions = this.getAvailableTransitions(workflowId, from);
    const canTransition = availableTransitions.some((t) => t.to === to);

    childLogger.debug('Transition check', { canTransition });
    return canTransition;
  }

  validatePhaseCompletion(workflowId: string, phaseId: string): IConfigValidationResult {
    const childLogger = this.logger.child({
      component: 'PhaseManager',
      workflowId,
      phaseId
    });

    const errors: IValidationError[] = [];
    const warnings: IValidationWarning[] = [];

    if (!this.config) {
      errors.push({
        path: '/',
        message: 'No configuration loaded',
        type: 'missing'
      });
      return { valid: false, errors, warnings };
    }

    const phase = this.getPhase(workflowId, phaseId);
    if (!phase) {
      errors.push({
        path: `/workflows/${workflowId}/phases/${phaseId}`,
        message: 'Phase not found',
        type: 'missing'
      });
      return { valid: false, errors, warnings };
    }

    // Check if all required tasks are marked as complete
    // (This would typically check against actual task completion state)
    const requiredTasks = phase.tasks.filter((t) => t.required);
    if (requiredTasks.length > 0) {
      childLogger.info('Phase has required tasks', { count: requiredTasks.length });
      // In a real implementation, we would check task completion status
    }

    // Check exit conditions
    if (phase.exitConditions.length === 0) {
      warnings.push({
        path: `/workflows/${workflowId}/phases/${phaseId}/exitConditions`,
        message: 'Phase has no exit conditions defined',
        type: 'best-practice'
      });
    }

    // Check if phase has any valid transitions
    const availableTransitions = this.getAvailableTransitions(workflowId, phaseId);
    if (availableTransitions.length === 0 && phase.nextPhases.length === 0) {
      warnings.push({
        path: `/workflows/${workflowId}/phases/${phaseId}`,
        message: 'Phase has no available transitions or next phases',
        type: 'best-practice'
      });
    }

    // Check for approval requirements
    if (phase.requiresApproval) {
      childLogger.info('Phase requires approval before completion');
      // In a real implementation, we would check approval status
    }

    childLogger.debug('Phase validation completed', {
      errors: errors.length,
      warnings: warnings.length
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getAllPhases(workflowId: string): ISDLCPhase[] {
    if (!this.config) {
      this.logger.error('No configuration loaded');
      return [];
    }

    const workflow = this.config.workflows.find((w) => w.id === workflowId);
    return workflow?.phases || [];
  }

  getWorkflow(workflowId: string): ISDLCWorkflow | undefined {
    if (!this.config) {
      this.logger.error('No configuration loaded');
      return undefined;
    }

    return this.config.workflows.find((w) => w.id === workflowId);
  }
}
