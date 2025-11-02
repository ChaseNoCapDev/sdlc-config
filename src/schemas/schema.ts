export const sdlcConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://github.com/ChaseNoCap/sdlc-config/schemas/sdlc-config.schema.json',
  title: 'SDLC Configuration Schema',
  type: 'object',
  required: ['version', 'workflows'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Configuration schema version'
    },
    workflows: {
      type: 'array',
      items: { $ref: '#/definitions/workflow' },
      minItems: 1
    },
    environments: {
      type: 'array',
      items: { $ref: '#/definitions/environment' }
    },
    defaultWorkflow: {
      type: 'string',
      description: 'ID of the default workflow'
    },
    defaultEnvironment: {
      type: 'string',
      description: 'Name of the default environment'
    },
    metadata: {
      type: 'object',
      additionalProperties: true
    }
  },
  definitions: {
    workflow: {
      type: 'object',
      required: ['id', 'name', 'version', 'initialPhase', 'phases', 'transitions'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        initialPhase: { type: 'string' },
        phases: {
          type: 'array',
          items: { $ref: '#/definitions/phase' },
          minItems: 1
        },
        transitions: {
          type: 'array',
          items: { $ref: '#/definitions/transition' }
        },
        globalSettings: { $ref: '#/definitions/workflowSettings' },
        metadata: { type: 'object' }
      }
    },
    phase: {
      type: 'object',
      required: [
        'id',
        'name',
        'objectives',
        'deliverables',
        'entryConditions',
        'exitConditions',
        'tasks',
        'nextPhases'
      ],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        objectives: {
          type: 'array',
          items: { type: 'string' }
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' }
        },
        entryConditions: {
          type: 'array',
          items: { type: 'string' }
        },
        exitConditions: {
          type: 'array',
          items: { type: 'string' }
        },
        tasks: {
          type: 'array',
          items: { $ref: '#/definitions/task' }
        },
        nextPhases: {
          type: 'array',
          items: { type: 'string' }
        },
        requiresApproval: { type: 'boolean' },
        metadata: { type: 'object' }
      }
    },
    task: {
      type: 'object',
      required: ['id', 'name', 'type', 'required'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        type: {
          type: 'string',
          enum: ['manual', 'automated', 'review', 'approval']
        },
        required: { type: 'boolean' },
        dependencies: {
          type: 'array',
          items: { type: 'string' }
        },
        estimatedDuration: { type: 'string' },
        assignee: { type: 'string' },
        tools: {
          type: 'array',
          items: { type: 'string' }
        },
        outputs: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    transition: {
      type: 'object',
      required: ['from', 'to', 'conditions'],
      properties: {
        from: { type: 'string' },
        to: { type: 'string' },
        conditions: {
          type: 'array',
          items: { type: 'string' }
        },
        requiresApproval: { type: 'boolean' },
        approvers: {
          type: 'array',
          items: { type: 'string' }
        },
        metadata: { type: 'object' }
      }
    },
    workflowSettings: {
      type: 'object',
      properties: {
        requireApprovalForTransitions: { type: 'boolean' },
        defaultApprovers: {
          type: 'array',
          items: { type: 'string' }
        },
        notificationChannels: {
          type: 'array',
          items: { type: 'string' }
        },
        timeoutSettings: { $ref: '#/definitions/timeoutSettings' },
        integrations: { $ref: '#/definitions/integrationSettings' }
      }
    },
    timeoutSettings: {
      type: 'object',
      properties: {
        phaseTimeout: { type: 'string' },
        taskTimeout: { type: 'string' },
        approvalTimeout: { type: 'string' },
        warningThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      }
    },
    integrationSettings: {
      type: 'object',
      properties: {
        githubEnabled: { type: 'boolean' },
        slackEnabled: { type: 'boolean' },
        emailEnabled: { type: 'boolean' },
        webhookUrl: { type: 'string', format: 'uri' },
        customIntegrations: { type: 'object' }
      }
    },
    environment: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        overrides: { $ref: '#/definitions/workflowSettings' },
        featureFlags: {
          type: 'object',
          additionalProperties: { type: 'boolean' }
        },
        variables: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    }
  }
};
