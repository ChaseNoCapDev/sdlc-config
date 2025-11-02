import { injectable, inject } from 'inversify';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import type { ValidateFunction, ErrorObject } from 'ajv';
import type { ILogger } from '@chasenocap/logger';
import type {
  IConfigLoader,
  ISDLCConfig,
  IConfigValidationResult,
  IValidationError,
  IValidationWarning
} from '../types/ConfigTypes.js';
import { sdlcConfigSchema } from '../schemas/schema.js';

@injectable()
export class ConfigLoader implements IConfigLoader {
  private readonly validateFunction: ValidateFunction<ISDLCConfig>;

  constructor(@inject('ILogger') private logger: ILogger) {
    const AjvConstructor = Ajv as any;
    const ajv = new AjvConstructor({ allErrors: true, verbose: true });
    ajv.addFormat('uri', true); // Add URI format validation
    this.validateFunction = ajv.compile(sdlcConfigSchema);
  }

  async loadFromFile(filePath: string): Promise<ISDLCConfig> {
    const childLogger = this.logger.child({ component: 'ConfigLoader', filePath });
    childLogger.info('Loading SDLC configuration from file');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return await this.loadFromString(content);
    } catch (error) {
      childLogger.error('Failed to load configuration file', error as Error);
      throw new Error(`Failed to load configuration from ${filePath}: ${(error as Error).message}`);
    }
  }

  async loadFromString(content: string): Promise<ISDLCConfig> {
    const childLogger = this.logger.child({ component: 'ConfigLoader' });
    childLogger.debug('Parsing SDLC configuration from string');

    try {
      // Parse YAML content
      const config = yaml.load(content) as ISDLCConfig;

      // Validate configuration
      const validationResult = this.validate(config);

      if (!validationResult.valid) {
        const errorMessages =
          validationResult.errors?.map((e) => `${e.path}: ${e.message}`).join(', ') ||
          'Unknown validation error';
        throw new Error(`Invalid configuration: ${errorMessages}`);
      }

      // Log warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        validationResult.warnings.forEach((warning) => {
          childLogger.warn(`Configuration warning at ${warning.path}: ${warning.message}`);
        });
      }

      childLogger.info('Successfully loaded SDLC configuration', {
        workflows: config.workflows.length,
        environments: config.environments?.length || 0
      });

      return config;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        childLogger.error('Failed to parse YAML content', error);
        throw new Error(`Invalid YAML syntax: ${error.message}`);
      }
      throw error;
    }
  }

  validate(config: ISDLCConfig): IConfigValidationResult {
    const childLogger = this.logger.child({ component: 'ConfigLoader' });
    childLogger.debug('Validating SDLC configuration');

    const errors: IValidationError[] = [];
    const warnings: IValidationWarning[] = [];

    // Schema validation
    const valid = this.validateFunction(config);

    if (!valid && this.validateFunction.errors) {
      this.validateFunction.errors.forEach((error: ErrorObject) => {
        errors.push({
          path: error.instancePath || '/',
          message: error.message || 'Unknown validation error',
          type: 'invalid'
        });
      });
    }

    // Custom validation rules
    if (config.workflows) {
      // Validate phase references
      config.workflows.forEach((workflow, wIndex) => {
        if (!workflow.phases) {
          return; // Schema validation will catch this
        }
        const phaseIds = new Set(workflow.phases.map((p) => p.id));

        // Check initial phase exists
        if (workflow.initialPhase && !phaseIds.has(workflow.initialPhase)) {
          errors.push({
            path: `/workflows/${wIndex}/initialPhase`,
            message: `Initial phase '${workflow.initialPhase}' not found in workflow phases`,
            type: 'reference'
          });
        }

        // Check phase transitions
        workflow.phases.forEach((phase, pIndex) => {
          phase.nextPhases?.forEach((nextPhaseId, nIndex) => {
            if (!phaseIds.has(nextPhaseId)) {
              errors.push({
                path: `/workflows/${wIndex}/phases/${pIndex}/nextPhases/${nIndex}`,
                message: `Next phase '${nextPhaseId}' not found in workflow phases`,
                type: 'reference'
              });
            }
          });

          // Check task dependencies
          const taskIds = new Set(phase.tasks?.map((t) => t.id) || []);
          phase.tasks?.forEach((task, tIndex) => {
            task.dependencies?.forEach((depId, dIndex) => {
              if (!taskIds.has(depId)) {
                errors.push({
                  path: `/workflows/${wIndex}/phases/${pIndex}/tasks/${tIndex}/dependencies/${dIndex}`,
                  message: `Task dependency '${depId}' not found in phase tasks`,
                  type: 'reference'
                });
              }
            });
          });
        });

        // Check transitions
        workflow.transitions?.forEach((transition, tIndex) => {
          if (!phaseIds.has(transition.from)) {
            errors.push({
              path: `/workflows/${wIndex}/transitions/${tIndex}/from`,
              message: `Transition source phase '${transition.from}' not found`,
              type: 'reference'
            });
          }
          if (!phaseIds.has(transition.to)) {
            errors.push({
              path: `/workflows/${wIndex}/transitions/${tIndex}/to`,
              message: `Transition target phase '${transition.to}' not found`,
              type: 'reference'
            });
          }
        });
      });
    }

    // Check for unused phases
    config.workflows?.forEach((workflow, wIndex) => {
      if (!workflow.phases) return;

      const referencedPhases = new Set<string>();
      if (workflow.initialPhase) {
        referencedPhases.add(workflow.initialPhase);
      }

      workflow.transitions?.forEach((t) => {
        referencedPhases.add(t.from);
        referencedPhases.add(t.to);
      });

      workflow.phases.forEach((p) => {
        p.nextPhases?.forEach((np) => referencedPhases.add(np));
      });

      workflow.phases.forEach((phase, pIndex) => {
        if (!referencedPhases.has(phase.id)) {
          warnings.push({
            path: `/workflows/${wIndex}/phases/${pIndex}`,
            message: `Phase '${phase.id}' is not referenced by any transition or phase`,
            type: 'unused'
          });
        }
      });
    });

    // Check for deprecated features
    if (config.metadata && 'legacyMode' in config.metadata) {
      warnings.push({
        path: '/metadata/legacyMode',
        message: 'The legacyMode flag is deprecated and will be removed in future versions',
        type: 'deprecated'
      });
    }

    childLogger.debug('Configuration validation completed', {
      errors: errors.length,
      warnings: warnings.length
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
