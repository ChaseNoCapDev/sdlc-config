# SDLC Configuration Examples

This directory contains example SDLC workflow configurations demonstrating different use cases and patterns.

## Available Examples

### 1. minimal-workflow.yaml

**Use Case**: Small projects, prototypes, solo developers

A lightweight 3-phase workflow (Plan → Build → Deploy) with minimal overhead:
- No approval gates
- Short timeouts
- Essential tasks only
- Quick iterations

**Best For**:
- Personal projects
- MVPs and prototypes
- Learning the SDLC config system
- Simple applications

**Phases**:
1. **Planning**: Quick requirements and architecture sketching
2. **Build**: Implementation and testing
3. **Deploy**: Deployment and verification

---

### 2. agile-sprint.yaml

**Use Case**: Agile/Scrum teams with 2-week sprints

A complete Scrum sprint workflow following standard agile practices:
- Sprint planning with backlog grooming
- Daily development with standups
- Sprint review and demo
- Retrospective and continuous improvement

**Best For**:
- Scrum teams
- Iterative development
- Product development with regular releases
- Teams practicing Agile methodologies

**Phases**:
1. **Sprint Planning**: Backlog review, goal setting, task breakdown
2. **Development**: 2-week development with daily standups
3. **Sprint Review**: Demo and stakeholder feedback
4. **Retrospective**: Team reflection and improvement planning

**Features**:
- 14-day sprint cycle
- Daily standup tasks
- CI/CD integration
- Story point estimation
- Environment-specific settings

---

### 3. hotfix-workflow.yaml

**Use Case**: Emergency production issues requiring immediate fixes

A fast-tracked workflow for critical production incidents:
- Accelerated approval process
- Minimal required tasks
- Immediate deployment
- Post-incident review

**Best For**:
- Production outages
- Critical security vulnerabilities
- Data corruption issues
- Service degradation

**Phases**:
1. **Triage**: Incident assessment and emergency approval (< 1 hour)
2. **Hotfix Development**: Quick fix with regression test (< 1 hour)
3. **Emergency Deployment**: Fast-tracked production deployment (< 30 min)
4. **Post-Incident Review**: RCA and documentation (within 24 hours)

**Features**:
- 10-minute approval timeout
- PagerDuty integration
- Emergency approver chain
- Automated rollback capability
- Enhanced monitoring during deployment

---

### 4. ci-cd-pipeline.yaml

**Use Case**: Fully automated continuous integration and deployment

A comprehensive CI/CD pipeline with quality gates and progressive deployment:
- Automated testing at every stage
- Multiple environments (dev → staging → prod)
- Blue-green and canary deployments
- Automated rollback

**Best For**:
- Mature development teams
- Microservices architectures
- High-frequency deployments
- Cloud-native applications

**Phases**:
1. **Commit**: Pre-commit hooks and build trigger
2. **Build and Test**: Compilation, linting, unit/integration tests, security scans
3. **Deploy to Dev**: Automated dev deployment with smoke tests
4. **Deploy to Staging**: E2E tests, performance tests, UAT
5. **Deploy to Production**: Canary deployment (10% → 50% → 100%)

**Features**:
- 80%+ code coverage requirement
- Security scanning (Snyk, npm audit)
- E2E testing (Playwright, Cypress)
- Performance testing (k6, JMeter)
- Gradual rollout with monitoring
- Blue-green deployment
- Automatic rollback on errors

**Tools Integrated**:
- GitHub Actions / Jenkins
- Docker / Kubernetes
- ArgoCD
- Datadog / Prometheus
- Playwright / Cypress

---

## Using These Examples

### Loading a Configuration

```typescript
import { ConfigLoader } from '@chasenocap/sdlc-config';

const loader = new ConfigLoader(logger);
const config = await loader.loadFromFile('examples/minimal-workflow.yaml');
```

### Customizing for Your Needs

1. **Copy an example** that matches your workflow
2. **Modify phases** to fit your process
3. **Adjust timeouts** based on your team's pace
4. **Add/remove tasks** as needed
5. **Configure environments** for your infrastructure
6. **Update approvers** with your team members

### Merging with Default Config

```typescript
import { ConfigMerger } from '@chasenocap/sdlc-config';

const merger = new ConfigMerger(logger);
const customConfig = await loader.loadFromFile('examples/agile-sprint.yaml');
const defaultConfig = await loader.loadFromFile('../src/configs/default-sdlc.yaml');

const merged = merger.merge(defaultConfig, customConfig);
```

### Environment-Specific Overrides

Each example includes environment configurations. Apply them:

```typescript
const prodConfig = merger.mergeEnvironment(config, 'production');
const devConfig = merger.mergeEnvironment(config, 'development');
```

---

## Comparison Matrix

| Feature | Minimal | Agile Sprint | Hotfix | CI/CD |
|---------|---------|--------------|--------|-------|
| **Phases** | 3 | 4 | 4 | 5 |
| **Automation** | Low | Medium | High | Very High |
| **Approval Gates** | None | Optional | Required | Required (Prod) |
| **Typical Duration** | Days | 2 weeks | Hours | Minutes-Hours |
| **Team Size** | 1-2 | 3-10 | 2-5 | 5+ |
| **Complexity** | Simple | Medium | Medium | High |
| **Best For** | Prototypes | Products | Emergencies | Services |

---

## Creating Your Own Configuration

### Basic Structure

```yaml
version: 1.0.0
workflows:
  - id: my-workflow
    name: My Custom Workflow
    version: 1.0.0
    initialPhase: first-phase
    phases:
      - id: first-phase
        name: First Phase
        objectives: [...]
        tasks: [...]
        nextPhases: [second-phase]
    transitions: [...]
    globalSettings: {...]

environments:
  - name: development
    overrides: {...]

defaultWorkflow: my-workflow
defaultEnvironment: development
```

### Validation

All examples are validated against the JSON schema in `src/schemas/sdlc-config.schema.json`. Validate your custom configurations:

```typescript
const result = await loader.validate(config);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Best Practices

1. **Start Simple**: Begin with minimal-workflow.yaml and add complexity as needed
2. **Use Meaningful IDs**: Phase and task IDs should be descriptive
3. **Define Clear Objectives**: Each phase should have clear, measurable objectives
4. **Set Realistic Timeouts**: Base timeouts on historical data
5. **Configure Environments**: Use environment overrides for different deployment targets
6. **Document Decisions**: Add comments explaining non-obvious configuration choices
7. **Test Thoroughly**: Validate configurations before using in production
8. **Version Control**: Track configuration changes in git

---

## Additional Resources

- **Schema Reference**: `../src/schemas/sdlc-config.schema.json`
- **Package Documentation**: `../CLAUDE.md`
- **Default Configuration**: `../src/configs/default-sdlc.yaml`
- **Integration Guide**: `../README.md`

---

## Support and Contributions

Found an issue or have a suggestion for a new example? Open an issue or PR in the metaGOTHIC framework repository.

**Common Requests for New Examples**:
- Kanban workflow
- GitFlow branching workflow
- Trunk-based development
- Security-focused workflow
- Documentation-driven development

---

*Part of the metaGOTHIC Framework - AI-Guided Opinionated TypeScript Framework*
