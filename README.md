# @chasenocap/sdlc-config

SDLC configuration management for the metaGOTHIC framework. Provides YAML-based configuration for Software Development Lifecycle workflows, phases, tasks, and transitions.

## Features

- **YAML Configuration**: Define SDLC workflows in readable YAML format
- **Phase Management**: Define phases with objectives, deliverables, and tasks
- **Transition Control**: Configure phase transitions with conditions and approvals
- **Environment Support**: Override settings for different environments
- **Validation**: Comprehensive schema validation with helpful error messages
- **Configuration Merging**: Merge multiple configurations with inheritance
- **Type Safety**: Full TypeScript support with interfaces

## Installation

```bash
npm install @chasenocap/sdlc-config
```

## Quick Start

```typescript
import { ConfigLoader, PhaseManager } from '@chasenocap/sdlc-config';
import { createContainer } from '@chasenocap/di-framework';
import { WinstonLogger } from '@chasenocap/logger';

// Set up dependencies
const container = createContainer();
container.bind('ILogger').to(WinstonLogger);

// Load configuration
const logger = container.get<ILogger>('ILogger');
const configLoader = new ConfigLoader(logger);
const config = await configLoader.loadFromFile('sdlc-config.yaml');

// Use phase manager
const phaseManager = new PhaseManager(logger);
phaseManager.setConfig(config);

// Get current phase
const phase = phaseManager.getPhase('standard-sdlc', 'requirements');

// Check available transitions
const transitions = phaseManager.getAvailableTransitions('standard-sdlc', 'requirements');
```

## Configuration Schema

### Basic Structure

```yaml
version: 1.0.0
workflows:
  - id: my-workflow
    name: My Development Workflow
    version: 1.0.0
    initialPhase: requirements
    phases:
      - id: requirements
        name: Requirements Gathering
        objectives:
          - Understand business needs
        deliverables:
          - Requirements document
        entryConditions:
          - Project approved
        exitConditions:
          - Requirements signed off
        tasks:
          - id: task1
            name: Interview stakeholders
            type: manual
            required: true
        nextPhases:
          - design
    transitions:
      - from: requirements
        to: design
        conditions:
          - Requirements approved
```

### Environment Configuration

```yaml
environments:
  - name: production
    overrides:
      requireApprovalForTransitions: true
      timeoutSettings:
        phaseTimeout: 14 days
    featureFlags:
      enhancedMonitoring: true
    variables:
      LOG_LEVEL: info
```

## API Reference

### ConfigLoader

```typescript
interface IConfigLoader {
  loadFromFile(filePath: string): Promise<ISDLCConfig>;
  loadFromString(content: string): Promise<ISDLCConfig>;
  validate(config: ISDLCConfig): IConfigValidationResult;
}
```

### PhaseManager

```typescript
interface IPhaseManager {
  getPhase(workflowId: string, phaseId: string): ISDLCPhase | undefined;
  getAvailableTransitions(workflowId: string, currentPhaseId: string): ISDLCTransition[];
  canTransition(workflowId: string, from: string, to: string): boolean;
  validatePhaseCompletion(workflowId: string, phaseId: string): IConfigValidationResult;
}
```

### ConfigMerger

```typescript
interface IConfigMerger {
  merge(base: ISDLCConfig, override: ISDLCConfig): ISDLCConfig;
  mergeEnvironment(config: ISDLCConfig, environment: string): ISDLCConfig;
}
```

## Task Types

- **manual**: Human-performed tasks
- **automated**: System-executed tasks
- **review**: Review/approval tasks
- **approval**: Formal approval tasks

## Validation

The configuration loader performs comprehensive validation:

- **Schema Validation**: Ensures configuration matches JSON schema
- **Reference Validation**: Verifies all phase and task references exist
- **Dependency Validation**: Checks task dependencies are valid
- **Best Practice Warnings**: Suggests improvements (unused phases, missing conditions)

## Examples

### Complete Workflow Example

```yaml
version: 1.0.0
workflows:
  - id: agile-sprint
    name: Agile Sprint Workflow
    version: 1.0.0
    initialPhase: planning
    phases:
      - id: planning
        name: Sprint Planning
        objectives:
          - Define sprint goals
          - Select user stories
        deliverables:
          - Sprint backlog
        tasks:
          - id: story-selection
            name: Select user stories
            type: manual
            required: true
          - id: task-breakdown
            name: Break down stories
            type: manual
            required: true
            dependencies:
              - story-selection
        nextPhases:
          - development

      - id: development
        name: Development
        objectives:
          - Implement features
          - Write tests
        deliverables:
          - Working software
          - Test coverage
        tasks:
          - id: coding
            name: Write code
            type: manual
            required: true
          - id: testing
            name: Write tests
            type: manual
            required: true
        nextPhases:
          - review

      - id: review
        name: Sprint Review
        objectives:
          - Demo features
          - Gather feedback
        deliverables:
          - Demo recording
          - Feedback notes
        tasks:
          - id: demo
            name: Demonstrate features
            type: manual
            required: true
        nextPhases:
          - retrospective

    globalSettings:
      timeoutSettings:
        phaseTimeout: 14 days
      integrations:
        githubEnabled: true
        slackEnabled: true
```

## Integration with metaGOTHIC

This package is designed to work seamlessly with the metaGOTHIC framework:

- **State Machine**: Use with `@chasenocap/sdlc-engine` for workflow execution
- **Templates**: Combine with `@chasenocap/prompt-toolkit` for AI guidance
- **Content**: Integrate with `@chasenocap/sdlc-content` for documentation

## License

MIT