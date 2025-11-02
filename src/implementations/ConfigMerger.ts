import { injectable, inject } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type {
  IConfigMerger,
  ISDLCConfig,
  ISDLCWorkflow,
  IWorkflowSettings,
  IEnvironmentConfig
} from '../types/ConfigTypes.js';

@injectable()
export class ConfigMerger implements IConfigMerger {
  constructor(@inject('ILogger') private logger: ILogger) {}

  merge(base: ISDLCConfig, override: ISDLCConfig): ISDLCConfig {
    const childLogger = this.logger.child({ component: 'ConfigMerger' });
    childLogger.info('Merging SDLC configurations');

    const merged: ISDLCConfig = {
      version: override.version || base.version,
      workflows: this.mergeWorkflows(base.workflows, override.workflows),
      environments: this.mergeEnvironments(base.environments, override.environments),
      defaultWorkflow: override.defaultWorkflow || base.defaultWorkflow,
      defaultEnvironment: override.defaultEnvironment || base.defaultEnvironment,
      metadata: this.mergeMetadata(base.metadata, override.metadata)
    };

    childLogger.debug('Configuration merge completed', {
      workflows: merged.workflows.length,
      environments: merged.environments?.length || 0
    });

    return merged;
  }

  mergeEnvironment(config: ISDLCConfig, environmentName: string): ISDLCConfig {
    const childLogger = this.logger.child({
      component: 'ConfigMerger',
      environment: environmentName
    });
    childLogger.info('Applying environment-specific configuration');

    const environment = config.environments?.find((env) => env.name === environmentName);

    if (!environment) {
      childLogger.warn('Environment not found, returning original configuration');
      return config;
    }

    // Deep clone the config to avoid mutations
    const merged = JSON.parse(JSON.stringify(config)) as ISDLCConfig;

    // Apply environment overrides to each workflow
    if (environment.overrides) {
      merged.workflows = merged.workflows.map((workflow) => {
        if (workflow.globalSettings) {
          workflow.globalSettings = this.mergeWorkflowSettings(
            workflow.globalSettings,
            environment.overrides!
          );
        } else {
          workflow.globalSettings = environment.overrides;
        }
        return workflow;
      });
    }

    // Add environment metadata
    merged.metadata = {
      ...merged.metadata,
      appliedEnvironment: environmentName,
      environmentVariables: environment.variables,
      featureFlags: environment.featureFlags
    };

    childLogger.debug('Environment configuration applied', {
      overrides: !!environment.overrides,
      variables: Object.keys(environment.variables || {}).length,
      featureFlags: Object.keys(environment.featureFlags || {}).length
    });

    return merged;
  }

  private mergeWorkflows(
    baseWorkflows: ISDLCWorkflow[],
    overrideWorkflows?: ISDLCWorkflow[]
  ): ISDLCWorkflow[] {
    if (!overrideWorkflows || overrideWorkflows.length === 0) {
      return baseWorkflows;
    }

    const workflowMap = new Map<string, ISDLCWorkflow>();

    // Add base workflows
    baseWorkflows.forEach((workflow) => {
      workflowMap.set(workflow.id, workflow);
    });

    // Override or add new workflows
    overrideWorkflows.forEach((workflow) => {
      const existing = workflowMap.get(workflow.id);
      if (existing) {
        // Merge workflow
        workflowMap.set(workflow.id, this.mergeWorkflow(existing, workflow));
      } else {
        // Add new workflow
        workflowMap.set(workflow.id, workflow);
      }
    });

    return Array.from(workflowMap.values());
  }

  private mergeWorkflow(base: ISDLCWorkflow, override: ISDLCWorkflow): ISDLCWorkflow {
    return {
      ...base,
      ...override,
      globalSettings: this.mergeWorkflowSettings(base.globalSettings, override.globalSettings),
      metadata: this.mergeMetadata(base.metadata, override.metadata)
    };
  }

  private mergeWorkflowSettings(
    base?: IWorkflowSettings,
    override?: IWorkflowSettings
  ): IWorkflowSettings | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;

    return {
      requireApprovalForTransitions:
        override.requireApprovalForTransitions ?? base.requireApprovalForTransitions,
      defaultApprovers: override.defaultApprovers || base.defaultApprovers,
      notificationChannels: override.notificationChannels || base.notificationChannels,
      timeoutSettings: {
        ...base.timeoutSettings,
        ...override.timeoutSettings
      },
      integrations: {
        ...base.integrations,
        ...override.integrations
      }
    };
  }

  private mergeEnvironments(
    base?: IEnvironmentConfig[],
    override?: IEnvironmentConfig[]
  ): IEnvironmentConfig[] | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;

    const envMap = new Map<string, IEnvironmentConfig>();

    // Add base environments
    base.forEach((env) => envMap.set(env.name, env));

    // Override or add environments
    override.forEach((env) => {
      const existing = envMap.get(env.name);
      if (existing) {
        envMap.set(env.name, {
          ...existing,
          ...env,
          overrides: this.mergeWorkflowSettings(existing.overrides, env.overrides),
          featureFlags: { ...existing.featureFlags, ...env.featureFlags },
          variables: { ...existing.variables, ...env.variables }
        });
      } else {
        envMap.set(env.name, env);
      }
    });

    return Array.from(envMap.values());
  }

  private mergeMetadata(
    base?: Record<string, unknown>,
    override?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;
    return { ...base, ...override };
  }
}
