/**
 * Core configuration types for SDLC management
 */

export interface ISDLCPhase {
  id: string;
  name: string;
  description?: string;
  objectives: string[];
  deliverables: string[];
  entryConditions: string[];
  exitConditions: string[];
  tasks: ISDLCTask[];
  nextPhases: string[]; // Phase IDs that can follow this phase
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ISDLCTask {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'automated' | 'review' | 'approval';
  required: boolean;
  dependencies?: string[]; // Task IDs this task depends on
  estimatedDuration?: string; // e.g., "2 days", "4 hours"
  assignee?: string;
  tools?: string[];
  outputs?: string[];
}

export interface ISDLCTransition {
  from: string; // Phase ID
  to: string; // Phase ID
  conditions: string[];
  requiresApproval?: boolean;
  approvers?: string[];
  metadata?: Record<string, unknown>;
}

export interface ISDLCWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  initialPhase: string;
  phases: ISDLCPhase[];
  transitions: ISDLCTransition[];
  globalSettings?: IWorkflowSettings;
  metadata?: Record<string, unknown>;
}

export interface IWorkflowSettings {
  requireApprovalForTransitions?: boolean;
  defaultApprovers?: string[];
  notificationChannels?: string[];
  timeoutSettings?: ITimeoutSettings;
  integrations?: IIntegrationSettings;
}

export interface ITimeoutSettings {
  phaseTimeout?: string; // e.g., "7 days"
  taskTimeout?: string; // e.g., "24 hours"
  approvalTimeout?: string; // e.g., "48 hours"
  warningThreshold?: number; // percentage, e.g., 80
}

export interface IIntegrationSettings {
  githubEnabled?: boolean;
  slackEnabled?: boolean;
  emailEnabled?: boolean;
  webhookUrl?: string;
  customIntegrations?: Record<string, unknown>;
}

export interface IEnvironmentConfig {
  name: string;
  description?: string;
  overrides?: IWorkflowSettings;
  featureFlags?: Record<string, boolean>;
  variables?: Record<string, string>;
}

export interface ISDLCConfig {
  version: string;
  workflows: ISDLCWorkflow[];
  environments?: IEnvironmentConfig[];
  defaultWorkflow?: string;
  defaultEnvironment?: string;
  metadata?: Record<string, unknown>;
}

// Configuration validation schemas
export interface IConfigValidationResult {
  valid: boolean;
  errors: IValidationError[];
  warnings: IValidationWarning[];
}

export interface IValidationError {
  path: string;
  message: string;
  type: 'missing' | 'invalid' | 'conflict' | 'reference';
}

export interface IValidationWarning {
  path: string;
  message: string;
  type: 'deprecated' | 'unused' | 'performance' | 'best-practice';
}

// Service interfaces
export interface IConfigLoader {
  loadFromFile(filePath: string): Promise<ISDLCConfig>;
  loadFromString(content: string): Promise<ISDLCConfig>;
  validate(config: ISDLCConfig): IConfigValidationResult;
}

export interface IConfigMerger {
  merge(base: ISDLCConfig, override: ISDLCConfig): ISDLCConfig;
  mergeEnvironment(config: ISDLCConfig, environment: string): ISDLCConfig;
}

export interface IPhaseManager {
  getPhase(workflowId: string, phaseId: string): ISDLCPhase | undefined;
  getAvailableTransitions(workflowId: string, currentPhaseId: string): ISDLCTransition[];
  canTransition(workflowId: string, from: string, to: string): boolean;
  validatePhaseCompletion(workflowId: string, phaseId: string): IConfigValidationResult;
}
