# CLAUDE.md - @chasenocap/sdlc-config

This file provides guidance to Claude when working with the sdlc-config package.

## Package Overview

The sdlc-config package provides YAML-based configuration management for Software Development Lifecycle (SDLC) workflows in the metaGOTHIC framework. It enables definition of phases, tasks, transitions, and environment-specific overrides.

## Key Components

### 1. **ConfigLoader** (`src/implementations/ConfigLoader.ts`)
- Loads YAML configurations from files or strings
- Validates against JSON schema
- Performs custom validation (reference checking, dependencies)
- Uses AJV for schema validation

### 2. **ConfigMerger** (`src/implementations/ConfigMerger.ts`)
- Merges multiple configurations
- Applies environment-specific overrides
- Handles deep merging of settings
- Preserves workflow integrity

### 3. **PhaseManager** (`src/implementations/PhaseManager.ts`)
- Manages phase navigation and transitions
- Validates phase completion
- Creates implicit transitions from nextPhases
- Provides workflow querying capabilities

## Configuration Structure

### Core Types
- **ISDLCConfig**: Top-level configuration
- **ISDLCWorkflow**: Individual workflow definition
- **ISDLCPhase**: Phase with objectives, tasks, conditions
- **ISDLCTask**: Individual task with dependencies
- **ISDLCTransition**: Phase-to-phase transition rules

### Validation Schema
Located in `src/schemas/sdlc-config.schema.json`:
- Full JSON Schema validation
- Required fields enforcement
- Type checking
- Pattern validation

## Usage Patterns

### Loading Configuration
```typescript
const configLoader = new ConfigLoader(logger);
const config = await configLoader.loadFromFile('path/to/config.yaml');
```

### Applying Environment
```typescript
const merger = new ConfigMerger(logger);
const prodConfig = merger.mergeEnvironment(config, 'production');
```

### Managing Phases
```typescript
const phaseManager = new PhaseManager(logger);
phaseManager.setConfig(config);
const transitions = phaseManager.getAvailableTransitions('workflow-id', 'current-phase');
```

## Testing Approach

### Unit Tests
- Test each component in isolation
- Mock logger for all tests
- Cover validation edge cases
- Test configuration merging scenarios

### Integration Tests
- Load actual YAML files
- Test complete workflows
- Validate environment application
- Test phase navigation

## Common Issues

### 1. **Invalid YAML Syntax**
- Check for proper indentation (2 spaces)
- Ensure quotes around special characters
- Validate list syntax

### 2. **Reference Errors**
- Verify phase IDs match in transitions
- Check task dependencies exist
- Ensure initial phase is defined

### 3. **Schema Violations**
- All required fields must be present
- Version must match pattern (e.g., "1.0.0")
- Task types must be valid enum values

## Integration Points

### With @chasenocap/sdlc-engine
- Provides configuration for state machine
- Defines valid transitions
- Sets phase completion criteria

### With @chasenocap/prompt-toolkit
- Phase metadata used in prompts
- Task information for context
- Workflow structure for guidance

### With @chasenocap/sdlc-content
- Links to documentation templates
- References deliverable formats
- Connects to best practices

## Best Practices

1. **Configuration Design**
   - Keep phases focused and cohesive
   - Define clear entry/exit conditions
   - Use meaningful task dependencies
   - Leverage environment overrides wisely

2. **Validation**
   - Always validate before using config
   - Check warnings for improvements
   - Test with multiple environments
   - Verify all references

3. **Error Handling**
   - Catch YAML parsing errors
   - Handle missing configurations gracefully
   - Log validation errors clearly
   - Provide helpful error messages

## Development Guidelines

1. **Adding Features**
   - Update TypeScript interfaces first
   - Extend JSON schema accordingly
   - Add validation logic if needed
   - Include comprehensive tests

2. **Modifying Schema**
   - Maintain backward compatibility
   - Update version if breaking changes
   - Document migration path
   - Test with existing configs

3. **Performance**
   - Cache loaded configurations
   - Minimize validation passes
   - Use efficient merging algorithms
   - Profile large configurations

## Debugging Tips

1. **Validation Failures**
   - Check full validation result object
   - Look at error paths for location
   - Verify against schema manually
   - Use online YAML validators

2. **Merge Issues**
   - Log before/after configurations
   - Check override precedence
   - Verify deep merge behavior
   - Test with minimal configs

3. **Phase Navigation**
   - Trace available transitions
   - Check implicit vs explicit transitions
   - Verify phase existence
   - Log phase manager state