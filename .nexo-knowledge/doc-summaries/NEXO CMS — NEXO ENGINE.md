````md
# NEXO CMS — NEXO ENGINE

## 1. Document Status

**Document:** `05-NEXO-ENGINE.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the internal Nexo Engine that coordinates domain capabilities.

This document defines how the Nexo Engine turns the architectural foundations into executable domain operations.

The Engine is the central application/domain coordination layer.

It is not:

- the browser UI;
- the Runtime;
- the Adapter System;
- the AI provider;
- the database;
- Git itself;
- the deployment provider.

The Engine coordinates these systems through explicit contracts.

---

# 2. Objective

The Nexo Engine must provide a single authoritative implementation of the capabilities offered by the Nexo CMS.

The Engine must be reusable by:

```text
Web UI
API
CLI
AI Agents
Luna
Local AI
Automation
Plugins
Internal Jobs
````

A consumer must never need to implement the same operation independently.

Example:

```text
Human
↓
UI
↓
Application
↓
Nexo Engine
↓
component.create
```

and:

```text
AI
↓
Agent Tool
↓
Application
↓
Nexo Engine
↓
component.create
```

The underlying capability remains the same.

---

# 3. Engine Position

The Nexo Engine sits between application consumers and infrastructure:

```text
                    CONSUMERS
                        │
        ┌───────────────┼────────────────┐
        │               │                │
       UI              API              CLI
        │               │                │
        └───────────────┼────────────────┘
                        │
                    AI / JOBS
                        │
                        ▼
               APPLICATION LAYER
                        │
                        ▼
                  NEXO ENGINE
                        │
        ┌───────────────┼────────────────────┐
        │               │                    │
     Project        Components              Git
     Services        Services             Services
        │               │                    │
        ├──────────┬────┴────────┬───────────┤
        │          │             │
 Intelligence   Adapters       Runtime
        │                         │
        └──────────────┬──────────┘
                       │
                 REAL PROJECT
```

The exact physical package structure may differ.

The logical boundary must remain.

---

# 4. Engine Responsibility

The Engine is responsible for:

* executing Nexo domain capabilities;
* coordinating domain services;
* enforcing domain invariants;
* validating operation context;
* interacting with adapters;
* interacting with Runtime;
* interacting with providers;
* handling structured results;
* handling structured errors;
* coordinating multi-step operations;
* initiating re-analysis;
* maintaining operation state;
* producing audit and observability context.

The Engine is not responsible for:

* rendering UI;
* parsing arbitrary browser DOM;
* choosing framework-specific structures without adapters;
* bypassing security;
* storing secrets in plain project metadata;
* directly manipulating external infrastructure without provider contracts.

---

# 5. Domain Service Model

The Engine should organize capabilities around domain responsibilities.

Initial service groups:

```text
ProjectService
ProjectIntelligenceService
ComponentService
MediaService
DesignService
ResponsiveService
GitService
RuntimeService
AIService
IntegrationService
DeploymentService
WorkspaceService
PluginService
```

The exact module names are implementation details.

The responsibility boundaries are not optional.

---

# 6. Capability Ownership

Each capability has one authoritative owner.

Examples:

```text
project.create
→ ProjectService

project.analyze
→ ProjectIntelligenceService

component.create
→ ComponentService

media.replace
→ MediaService

git.commit
→ GitService

runtime.build
→ RuntimeService

ai.task
→ AIService

deployment.deploy
→ DeploymentService
```

A capability must not be implemented independently inside the UI, AI or CLI.

---

# 7. Application vs Engine

The Application Layer coordinates a use case.

The Engine owns the domain capability.

Example:

```text
User Request
↓
Application Service
↓
Authorization
↓
ProjectService
↓
Project / Adapter / Runtime
```

For simple operations the Application Layer may call the Engine directly.

For complex operations it may orchestrate multiple Engine capabilities.

---

# 8. Engine Context

Every Engine operation must receive an explicit context.

The context may contain:

```text
Actor
Workspace
Project
Environment
Branch
Runtime Session
Permissions
Policy Context
Operation ID
```

The exact context structure belongs to the implementation contracts.

The important requirement is:

> Operations must not depend on hidden global state to know which project, user or environment they are operating on.

---

# 9. Actor Context

Every mutation must identify the actor.

Possible actor types:

```text
Human
AI Agent
CLI Session
Automation
Plugin
Internal Service
```

For AI operations, preserve both:

```text
Initiator
Executing Agent
```

Example:

```text
Initiator:
Human User A

Executing Agent:
Kimi Code Agent

Operation:
project.write
```

---

# 10. Operation Identity

Important Engine operations should have an Operation ID.

The ID allows correlation between:

```text
UI
API
AI
Runtime
Jobs
Logs
Audit
Git
Deployment
```

Example:

```text
Operation ID:
op_123

Job ID:
job_456
```

The exact identifier format is implementation-defined.

---

# 11. Project Operations

The Project Service must support at least:

```text
project.create
project.import
project.open
project.read
project.refresh
project.analyze
project.clone
project.export
project.archive
project.remove
```

Each operation must define:

* input;
* output;
* permissions;
* validation;
* errors;
* state changes;
* side effects.

The detailed external interface belongs to the Control Plane specification.

---

# 12. Project Create

Project creation must distinguish between:

```text
Create Nexo Project Metadata
```

and:

```text
Create Actual Source Project
```

If the user asks Nexo to generate a new source project, the Engine must explicitly invoke the required project-generation strategy.

The Engine must not create source files merely because metadata was created.

---

# 13. Project Import

Project import should follow:

```text
Validate Source
↓
Resolve Workspace
↓
Resolve Project Identity
↓
Run Project Intelligence
↓
Resolve Adapters
↓
Create Nexo Project Registration
↓
Persist Metadata
↓
Return Project State
```

Import must not modify the source project by default.

---

# 14. Project Open

Opening an existing project must:

```text
Resolve Project
↓
Verify Source Location
↓
Check Accessibility
↓
Check Project Fingerprint
↓
Check Git State
↓
Check Intelligence Freshness
↓
Refresh if required
↓
Return Active Project Context
```

The Engine must not assume cached state is current.

---

# 15. Project Refresh

Refresh must reconcile:

```text
Filesystem
Git
Project Model
Project Graph
Adapter State
Runtime State
```

The refresh depth may vary.

A lightweight refresh may update status only.

A full refresh may rebuild Project Intelligence.

---

# 16. Project Write

`project.write` should not mean unrestricted arbitrary source modification.

It represents an authorized project mutation operation.

The mutation should normally come from a more specific capability such as:

```text
component.update
page.update
style.update
file.write
```

Generic file writing remains available where explicitly required.

---

# 17. Project Clone

Clone must create a new Project identity.

A clone must not accidentally reuse:

```text
Nexo Project ID
Workspace ownership
Secrets
Private integration credentials
Deployment credentials
```

Git remotes must be reviewed and configured appropriately.

---

# 18. Project Export

Export must operate on the real Source Project.

The exported result must remain usable outside the Nexo.

Nexo-only metadata must not silently become mandatory project source.

---

# 19. Component Service

The Component Service owns:

```text
component.detect
component.create
component.read
component.update
component.delete
component.promote
component.publish
```

The Component Service must use:

```text
Project Model
Component Model
Adapter System
Runtime
Validation
```

---

# 20. Component Create Flow

A component creation operation should follow:

```text
Resolve Project
↓
Resolve Active Adapters
↓
Validate Component Definition
↓
Check Compatibility
↓
Generate Source Representation
↓
Persist Source
↓
Re-analyze Affected Project Area
↓
Validate Result
↓
Return Operation Result
```

The Component Service must not hardcode framework source generation.

The selected Adapter owns technology-specific source representation.

---

# 21. Component Update Flow

```text
Resolve Component
↓
Resolve Source Mapping
↓
Validate Properties
↓
Resolve Adapter
↓
Transform Source
↓
Persist
↓
Re-analyze
↓
Validate
↓
Return Diff / Result
```

If the source relationship cannot be resolved safely, the operation must fail or request explicit handling rather than guessing.

---

# 22. Component Delete

Deletion is destructive.

The Service should evaluate:

```text
References
Dependencies
Routes
Pages
Other Components
Git State
```

When relevant.

The system should warn or block when deletion would create known invalid references.

---

# 23. Component Promotion

Promoting a project component to Workspace library must validate:

```text
Dependencies
Imports
Assets
Secrets
Project-specific configuration
Adapter compatibility
```

The component must not bring hidden project-private dependencies into the global library.

---

# 24. Media Service

The Media Service owns:

```text
media.list
media.read
media.upload
media.update
media.replace
media.delete
```

It must understand both:

```text
Asset
Asset Reference
```

A media replacement must update actual source references through the appropriate project mechanisms.

---

# 25. Media Replace

The expected flow is:

```text
Resolve Asset
↓
Find References
↓
Validate Replacement
↓
Replace Source Reference
↓
Persist
↓
Re-analyze
↓
Validate
```

If references cannot be determined and deletion/replacement could cause breakage, the operation must be treated conservatively.

---

# 26. Design Service

The Design Service coordinates changes to:

```text
Colors
Gradients
Typography
Spacing
Borders
Radius
Shadows
Variables
Themes
Tokens
```

It must delegate representation to the appropriate Styling Adapter.

---

# 27. Design Preservation

When changing a style, the Engine should prefer modifying an existing project-level source of truth.

Example:

```text
Existing:
--primary-color

Request:
Change primary color
```

Preferred:

```text
Modify --primary-color
```

rather than:

```text
Add new hardcoded color
```

The actual operation depends on Project Intelligence and Styling Adapter capabilities.

---

# 28. Responsive Service

The Responsive Service coordinates:

```text
Viewport
Preview
Diagnostics
Stress Testing
Overflow Detection
Text Wrapping Detection
Comparison
```

It must not directly implement browser rendering behavior when that belongs to the Preview/Runtime system.

---

# 29. Git Service

Git Service owns structured Git operations:

```text
git.status
git.branch
git.commit
git.push
git.pull
git.fetch
git.merge
git.rebase
git.stash
git.revert
git.reset
git.history
git.diff
```

Git Service must interact with Git through the Runtime or an appropriate Git implementation boundary.

---

# 30. Git Operation Flow

Example:

```text
AI / UI
↓
git.commit
↓
Authorization
↓
GitService
↓
Validate Repository
↓
Validate Working Tree
↓
Create Commit
↓
Verify Commit
↓
Audit
↓
Return Result
```

Consumers must not construct arbitrary Git commands as their primary Git API.

---

# 31. Runtime Service

The Runtime Service exposes safe application-level Runtime operations.

Examples:

```text
runtime.command
runtime.process
runtime.build
runtime.test
runtime.preview
```

It delegates actual execution to the Runtime subsystem defined in `04-RUNTIME-AND-SECURITY.md`.

---

# 32. AI Service

The AI Service coordinates:

```text
AI Provider
AI Context
AI Tools
AI Tasks
AI Execution Modes
AI Validation
```

It does not itself become a generic filesystem shell.

It must invoke authorized Nexo capabilities through the same Engine pathways used by other consumers.

---

# 33. AI Tool Execution

Example:

```text
AI
↓
component.update
↓
AI Tool
↓
Authorization
↓
ComponentService
↓
Adapter
↓
Runtime
```

Not:

```text
AI
↓
Direct filesystem
↓
Write arbitrary files
```

unless the requested operation is explicitly a generic file capability and is authorized.

---

# 34. Integration Service

The Integration Service manages:

```text
External Scripts
Embeds
Widgets
Third-party Integrations
Custom HTML
Custom CSS
Custom JavaScript
API Integrations
```

Security boundaries must be applied before execution or persistence.

---

# 35. Deployment Service

The Deployment Service coordinates:

```text
deployment.preflight
deployment.deploy
deployment.verify
deployment.rollback
```

It must use Deployment Providers.

The Service owns orchestration.

The Provider owns vendor-specific deployment behavior.

---

# 36. Deployment Flow

```text
Resolve Project
↓
Resolve Environment
↓
Resolve Provider
↓
Authorization
↓
Policy
↓
Preflight
↓
Build
↓
Deploy
↓
Verify
↓
Persist Deployment State
↓
Audit
```

A deployment must not be reported as successful merely because the provider accepted a request.

Success requires the provider's defined completion condition.

---

# 37. Workspace Service

Workspace Service owns:

```text
Workspace
Membership
Roles
Permissions
Workspace Settings
Shared Resources
Policies
```

Project-specific source logic must not enter Workspace Service.

---

# 38. Plugin Service

Plugin Service manages:

```text
Install
Activate
Deactivate
Update
Remove
Permission Grants
Compatibility
Lifecycle
```

Plugin code must remain isolated from unauthorized Core access.

---

# 39. Cross-Domain Operations

Some tasks require multiple Engine services.

Example:

```text
AI asks:
"Create a component, run tests, commit and push."
```

The orchestration is:

```text
AI
↓
AI Task
↓
ComponentService.create
↓
Validation
↓
RuntimeService.test
↓
GitService.status
↓
GitService.commit
↓
GitService.push
```

Each capability must remain owned by its correct service.

---

# 40. Cross-Domain Transaction Model

The Engine must not pretend all domains participate in one universal transaction.

For example:

```text
Component Change
+
Git Commit
+
Git Push
```

are separate real-world operations.

The Engine must track their states independently.

Example:

```text
Component Change:
SUCCESS

Commit:
SUCCESS

Push:
FAILED
```

The final result must reflect this accurately.

---

# 41. Operation State

Engine operations should support clear states.

Conceptual states:

```text
PENDING
RUNNING
WAITING_APPROVAL
SUCCEEDED
FAILED
PARTIAL
CANCELLED
BLOCKED
CONFLICT
```

A subsystem may define additional states.

---

# 42. State Persistence

Long-running or critical operations should persist enough state to recover after:

* browser refresh;
* process restart;
* network disconnect;
* Runtime restart.

The UI must never be the only location holding the actual operation state.

---

# 43. Jobs

Long-running Engine operations may become Jobs.

Examples:

```text
Project Analysis
Build
AI Task
Deployment
Large Asset Processing
```

The Engine should return Job information when execution is asynchronous.

---

# 44. Job Ownership

Every Job must identify:

```text
Actor
Workspace
Project
Operation Type
```

when applicable.

Background Jobs must not lose the context needed for authorization and audit.

---

# 45. Authorization

The Engine must assume that every consumer is untrusted until authorization proves otherwise.

Before a privileged capability executes:

```text
Actor
↓
Permission Evaluation
↓
Policy Evaluation
↓
Capability
```

The Engine must not rely on the UI's previous authorization result.

---

# 46. Authorization at Service Boundary

Each critical Service must have a clear authorization boundary.

Examples:

```text
ComponentService
GitService
RuntimeService
DeploymentService
WorkspaceService
```

This prevents a bypass through another entry point.

---

# 47. Capability-Level Permissions

Permissions should correspond to real operations.

Examples:

```text
component.create
component.update
git.commit
git.push
runtime.command
runtime.build
deployment.deploy
```

Do not rely exclusively on broad role names.

---

# 48. AI and Permissions

An AI agent may use the same Engine capabilities as a human, but only when its effective authorization allows them.

Example:

```text
Human:
git.push = ALLOW

Agent:
git.push = DENY
```

This is valid.

However, no capability should be structurally hidden from agents merely because the requester is an AI.

Authorization determines access.

---

# 49. Validation

Each Service must validate its domain inputs before invoking infrastructure.

Validation should include:

```text
Input validity
Resource existence
Project state
Adapter availability
Capability support
Permissions
Policy
Conflict state
```

---

# 50. Adapter Resolution

Whenever an Engine operation depends on project technology, the Engine must resolve active adapters.

Example:

```text
component.create
↓
Framework Adapter
+
Styling Adapter
```

The Engine must not silently use a fallback technology that differs from the project.

---

# 51. Runtime Resolution

The Engine must resolve the Runtime associated with the current project.

Possible Runtime:

```text
Local
Remote
VPS
Container
```

The Domain capability must remain the same.

---

# 52. Provider Resolution

Provider-dependent operations must resolve the appropriate provider explicitly.

Example:

```text
deployment.deploy
↓
Provider:
Vercel
```

or:

```text
deployment.deploy
↓
Provider:
Hostinger
```

The Engine must not rely on unspecified global provider state.

---

# 53. Context Freshness

Before complex operations, the Engine must check whether project intelligence is fresh enough.

If stale:

```text
Refresh
```

or:

```text
Block Operation
```

depending on the operation risk.

---

# 54. Conflict Handling

The Engine must detect conflicts such as:

```text
External File Change
Branch Change
Component Changed Externally
Git Conflict
Stale Project Model
Provider State Conflict
```

It must not silently choose one state over another.

---

# 55. Re-analysis After Mutation

After a successful source mutation:

```text
Mutation
↓
Re-analyze affected area
↓
Update Project Model
↓
Update Project Graph
↓
Validate
```

This ensures the Engine's internal representation remains synchronized with the real project.

---

# 56. Result Model

Engine operations should return structured results.

Conceptually:

```text
status
operationId
jobId when applicable
resource
changedFiles
warnings
diagnostics
nextActions
```

The exact schema is defined later.

---

# 57. Error Model

Engine errors should preserve origin.

Possible categories:

```text
ValidationError
AuthorizationError
NotFoundError
ConflictError
UnsupportedError
AdapterError
RuntimeError
ProviderError
GitError
BuildError
DeploymentError
```

Errors must remain machine-readable.

---

# 58. Partial Results

Services must be able to report partial results.

Example:

```text
status:
PARTIAL

changedFiles:
3

failedFiles:
2
```

The Engine must not flatten partial results into simple success or failure.

---

# 59. Idempotency

Where practical, Engine operations should be safe to retry.

Examples:

```text
project.import
component.publish
deployment.deploy
job.submit
```

If retrying could duplicate a resource, the operation must define an idempotency strategy.

---

# 60. Audit Context

The Engine should emit sufficient audit context for important operations:

```text
Actor
Workspace
Project
Operation
Resource
Result
Timestamp
Operation ID
```

For AI:

```text
Human Initiator
AI Agent
Provider
Operation
```

---

# 61. Observability

Engine operations should integrate with logs and metrics without putting observability logic into every individual domain rule.

The system must provide consistent operation identifiers.

Example:

```text
op_123
├── API request
├── Engine operation
├── Runtime process
├── Git operation
└── Audit event
```

This enables debugging of complex AI workflows.

---

# 62. No Hidden Side Effects

A capability should perform only the side effects documented by its contract.

Example:

```text
component.update
```

must not silently:

* commit Git;
* push Git;
* deploy;
* delete unrelated files;
* change Workspace settings.

Those must be explicit operations.

---

# 63. Explicit Side Effects

Complex workflows may intentionally compose operations:

```text
component.update
↓
git.commit
↓
git.push
↓
deployment.deploy
```

But each step must remain visible and independently auditable.

---

# 64. Domain Capability Composition

The Engine should permit composition of capabilities into higher-level workflows.

Example:

```text
FixResponsiveIssue
    ↓
AI Analysis
    ↓
component.update
    ↓
runtime.test
    ↓
runtime.build
    ↓
git.commit
```

The workflow does not replace the underlying capabilities.

---

# 65. AI Autonomous Workflow

Autonomous AI may orchestrate multiple Engine capabilities.

However:

```text
AI Planner
```

does not become:

```text
Security Authority
```

Every capability must still pass through the proper authorization and policy boundary.

---

# 66. Engine and UI

The UI should call Engine/Application capabilities through the application interfaces.

The UI must not know how:

```text
Git
Runtime
Adapter
Provider
```

internally execute operations.

---

# 67. Engine and API

The API should translate requests into Engine/Application operations.

The API is not allowed to bypass the Engine for privileged operations.

---

# 68. Engine and CLI

The CLI should use the same application capabilities as the API and UI.

No separate domain implementation is allowed.

---

# 69. Engine and AI

The AI Tool layer should translate AI requests into Engine/Application capabilities.

No direct AI-to-infrastructure bypass should be created merely for implementation convenience.

---

# 70. Engine and Plugins

Plugins should access the Engine through defined extension contracts.

They must not import arbitrary private modules to bypass capability boundaries.

---

# 71. Engine and Events

The Engine may emit domain/application events after meaningful state changes.

Examples:

```text
project.updated
component.updated
git.committed
build.completed
deployment.completed
ai.task.completed
```

Events must only be emitted after the corresponding state transition is genuinely achieved.

---

# 72. Engine and Caching

Caching is allowed for:

* Project Intelligence;
* metadata;
* lookup;
* capability discovery;
* performance.

Cache must never be treated as unquestionable truth when the Source Project or external system can be queried.

---

# 73. Engine and Source of Truth

For a source modification:

```text
Source Project
```

is the authority.

For Git state:

```text
Git
```

is the authority.

For deployment state:

```text
Provider
```

is the authority.

The Engine coordinates between them.

---

# 74. Recovery

When an Engine operation fails partway, the Service must determine whether recovery can be automatic.

Possible strategies:

```text
Rollback
Compensating Operation
Git Revert
Restore Snapshot
Retry
Re-analysis
Manual Recovery
```

The Engine must not claim recovery occurred unless it actually did.

---

# 75. Operation Cancellation

Long-running Engine operations should support cancellation when safe.

Cancellation must not leave the system pretending that an operation completed normally.

---

# 76. Service Boundaries

Services must expose narrow responsibilities.

Avoid a service such as:

```text
NexoService
```

with every operation in one class/module.

Prefer domain ownership:

```text
ProjectService
ComponentService
GitService
RuntimeService
DeploymentService
```

The final module structure should follow actual implementation complexity.

---

# 77. No Giant Service

The Engine must not become a monolithic class containing:

```text
all projects
all Git
all AI
all deployments
all media
all components
all security
```

Shared infrastructure can exist, but business responsibilities must remain separated.

---

# 78. No Premature Abstraction

Do not introduce abstractions that have no actual consumer or technical purpose.

Every Engine abstraction must answer:

```text
What problem does this solve?
Who consumes it?
What contract does it protect?
```

---

# 79. Contract Stability

Once a Domain capability is exposed to:

* UI;
* AI;
* CLI;
* API;
* plugin;

its contract becomes an architectural dependency.

Changes must be versioned or migrated intentionally.

---

# 80. External Research Requirement

When implementing Engine behavior that depends on external technology, the agent must:

1. inspect the actual installed technology/version;
2. read relevant Nexo documents;
3. consult official external documentation;
4. verify actual API behavior;
5. create tests;
6. implement;
7. record limitations.

Do not invent provider or framework behavior.

---

# 81. Required Tests

Every Engine service must include tests for:

```text
Success
Invalid Input
Unauthorized
Not Found
Unsupported Capability
Stale Context
External Modification
Adapter Failure
Runtime Failure
Provider Failure
Partial Failure
Cancellation
Retry
```

Critical workflows must also receive integration tests.

---

# 82. Acceptance Criteria

The Nexo Engine is correctly implemented when:

1. Domain capabilities have one authoritative implementation.
2. UI, API, CLI and AI can consume the same capabilities.
3. AI can perform authorized human-equivalent operations programmatically.
4. Services have clear responsibilities.
5. Adapters own technology-specific behavior.
6. Runtime owns execution.
7. Providers own vendor-specific behavior.
8. Authorization is enforced before privileged execution.
9. Operations have structured results.
10. Errors are structured.
11. Long-running operations can be represented as Jobs.
12. Partial failures are explicit.
13. External changes can invalidate stale state.
14. Source Project remains authoritative.
15. Hidden side effects are prohibited.
16. Important operations are auditable.
17. Complex workflows compose smaller capabilities rather than duplicating them.
18. The Engine remains usable without the browser UI.

---

# 83. K3 Swarm Implementation Protocol

Before implementing any Engine service, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `02-PROJECT-INTELLIGENCE.md`.
3. Read `03-ADAPTER-SYSTEM.md`.
4. Read this document.
5. Identify the owning domain.
6. Identify dependencies.
7. Identify required Runtime capabilities.
8. Identify required Adapter capabilities.
9. Identify authorization requirements.
10. Identify programmatic entry points.
11. Define success and failure states.
12. Implement tests.
13. Validate against real fixture projects where applicable.
14. Consult official external documentation when behavior is version-dependent.

If the required responsibility does not clearly belong to the proposed service, the agent must not invent a new boundary without architectural justification.

---

# 84. Final Principle

The Nexo Engine is the authoritative execution layer for Nexo capabilities.

Its fundamental model is:

```text
CONSUMER
    ↓
APPLICATION
    ↓
NEXO ENGINE
    ↓
DOMAIN CAPABILITY
    ↓
ADAPTER / PROVIDER / RUNTIME
    ↓
REAL RESOURCE
```

The Engine must be:

```text
Deterministic
Authorized
Observable
Testable
Composable
Extensible
Technology-aware through adapters
Independent from UI
```

Most importantly:

> **The Nexo Engine is where the Nexo actually knows how to do things. Every interface, every AI agent and every automation system should ultimately converge on these capabilities rather than creating its own version of them.**

```
```
