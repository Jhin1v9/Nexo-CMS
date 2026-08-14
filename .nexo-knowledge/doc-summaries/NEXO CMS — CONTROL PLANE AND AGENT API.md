````md
# NEXO CMS — CONTROL PLANE AND AGENT API

## 1. Document Status

**Document:** `06-CONTROL-PLANE-AND-AGENT-API.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the programmatic control plane through which humans, AI agents, CLI tools and automations can operate Nexo capabilities.

This document defines the most important machine-facing property of Nexo:

> **The Nexo must be fully operable through programmatic capabilities without requiring an agent to operate the graphical interface.**

The API, Agent Tools, CLI and future SDKs must ultimately reach the same Nexo Application/Domain capabilities.

---

# 2. Objective

The Control Plane exists to make Nexo a programmable engineering platform.

It must allow authorized consumers to perform operations such as:

```text
Create Project
Import Project
Open Project
Analyze Project
Read Files
Write Files
Create Pages
Update Pages
Create Components
Update Components
Manage Media
Inspect Project
Run Commands
Run Builds
Run Tests
Start Preview
Read Git Status
Create Branch
Commit
Push
Pull
Merge
Rebase
Revert
Clone Project
Export Project
Run AI Tasks
Deploy
Verify Deployment
Rollback
Archive
Remove
````

The exact set of exposed capabilities must follow the security and product specifications.

---

# 3. Core Principle

The Control Plane must expose **domain capabilities**, not UI actions.

Correct:

```text
project.create
project.analyze
component.create
git.commit
runtime.build
deployment.deploy
```

Incorrect:

```text
click.createProject
open.projectPanel
press.saveButton
read.screen
click.deploy
```

The API must represent what Nexo can do, not how the browser happens to present it.

---

# 4. Human and Agent Parity

A human using the UI and an AI using the Control Plane must ultimately reach the same capability.

Example:

```text
Human:
Nexo UI
↓
Application
↓
project.create
```

```text
AI:
Agent API
↓
Application
↓
project.create
```

The implementation of `project.create` must not be duplicated.

The distinction between consumers comes from:

```text
Identity
Permissions
Policy
Approval
Execution Context
```

---

# 5. No Artificial AI Restriction

The Control Plane must not deliberately make AI consumers weaker merely because they are machines.

If an operation can safely be exposed programmatically, an authorized agent must be able to invoke it.

This includes high-level operations such as:

```text
Project Creation
Project Editing
Component Creation
Media Management
Build
Tests
Git
Deployment
Rollback
```

when the agent possesses the required permissions and policies allow the action.

---

# 6. No Playwright Requirement

An agent must not need:

```text
Browser
Playwright
DOM scraping
Screenshot interpretation
Simulated clicks
Keyboard automation
```

to operate a Nexo capability that has a programmatic entry point.

The intended flow is:

```text
Agent
↓
Authentication
↓
Capability Discovery
↓
Authorization
↓
Capability
↓
Structured Result
```

Playwright remains useful for testing the UI itself.

---

# 7. Consumers

The Control Plane should support the following consumers:

```text
Nexo Web UI
Kimi Code
Codex
Luna
Local AI
External AI Agents
CLI
SDK
Automation
CI/CD
Plugins
Internal Services
```

Additional consumers may be added without changing the underlying domain model.

---

# 8. Entry Point Types

The initial architecture should be prepared for multiple programmatic entry points:

```text
HTTP API
Agent API
CLI
SDK
Internal Application API
Job API
Webhook API
Plugin API
```

The exact transport is an implementation decision.

The capability contracts must remain independent from transport.

---

# 9. Transport Independence

A capability must not depend on HTTP-specific behavior.

For example:

```text
project.create
```

is a domain capability.

It may later be exposed through:

```text
HTTP
CLI
SDK
Agent Tool
Internal Call
```

without changing the underlying domain implementation.

---

# 10. API Boundary

A programmatic request follows:

```text
Consumer
↓
Transport / Entry Point
↓
Authentication
↓
Request Validation
↓
Authorization
↓
Application Capability
↓
Domain
↓
Adapter / Runtime / Provider
↓
Result
```

The API layer must not bypass:

* authorization;
* domain validation;
* Runtime security;
* project state validation.

---

# 11. Capability Naming

Capabilities should use stable semantic names.

Examples:

```text
project.create
project.import
project.open
project.analyze
project.read
project.write
project.refresh

component.detect
component.create
component.read
component.update
component.delete
component.promote
component.publish

media.list
media.read
media.upload
media.update
media.replace
media.delete

git.status
git.branch.create
git.branch.switch
git.commit
git.push
git.pull
git.fetch
git.merge
git.rebase
git.stash
git.revert
git.reset

runtime.command.execute
runtime.process.start
runtime.process.stop
runtime.build
runtime.test
runtime.preview

ai.task.create
ai.task.read
ai.task.cancel
ai.execute

deployment.preflight
deployment.deploy
deployment.verify
deployment.rollback
```

The exact names become part of the API contract once published.

Renaming a public capability should therefore be treated as a compatibility change.

---

# 12. Capability IDs

Every exposed capability must have a stable identifier.

A capability ID should not depend on a UI route.

Bad:

```text
dashboard.button.createProject
```

Good:

```text
project.create
```

---

# 13. Request Contract

Every programmatic capability must define:

```text
Capability ID
Request Schema
Authentication
Required Permissions
Policy Requirements
Resource Scope
Execution Behavior
Response Schema
Error Schema
Async Behavior
Idempotency Behavior
```

No public capability should rely on undocumented parameters.

---

# 14. Response Contract

Responses must be structured.

A generic operation result may contain:

```text
operationId
status
result
warnings
diagnostics
job
nextActions
```

Not every operation requires every field.

The exact schema must depend on the capability.

---

# 15. Status Model

Programmatic operations should distinguish:

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

A consumer must be able to distinguish completion from mere request acceptance.

---

# 16. Synchronous Operations

Small operations may return directly.

Example:

```text
project.read
git.status
media.list
```

The response should contain the final result when execution is completed within the request lifecycle.

---

# 17. Asynchronous Operations

Long-running operations should return a Job reference.

Examples:

```text
project.analyze
runtime.build
runtime.test
ai.task.create
deployment.deploy
large media processing
```

Conceptually:

```text
POST capability
↓
Job ID
↓
GET Job
↓
Result
```

The exact endpoint or protocol is implementation-defined.

---

# 18. Job Contract

A Job must expose enough state for any authorized consumer to monitor it.

Minimum conceptual fields:

```text
id
type
status
createdAt
startedAt
completedAt
owner
workspaceId
projectId when applicable
progress when measurable
result
error
```

The system must not fabricate progress percentages.

If progress cannot be measured reliably, report phase/status instead.

---

# 19. Job Cancellation

Long-running jobs should support cancellation when technically safe.

Conceptual operation:

```text
job.cancel
```

Cancellation must report a defined result.

Possible states:

```text
CANCEL_REQUESTED
CANCELLED
CANCEL_FAILED
ALREADY_COMPLETED
```

---

# 20. Operation Identity

Every important operation must have an `operationId`.

This ID must allow correlation between:

```text
API Request
Application Operation
Engine Operation
Runtime Job
Git Operation
Deployment
Audit
Logs
AI Task
```

The same logical operation must remain traceable across layers.

---

# 21. Authentication

Every machine-facing interface must have a defined authentication mechanism.

Possible mechanisms include:

```text
API Key
OAuth
Short-Lived Token
Service Identity
Signed Request
Session Credential
```

The final mechanism must be selected in the Security architecture based on the actual deployment and threat model.

Agents must not invent authentication schemes locally.

---

# 22. Machine Identity

Machine consumers must possess explicit identities.

Examples:

```text
Kimi Code Agent
Codex Agent
Luna Agent
Local AI Agent
CI Agent
Deployment Automation
Plugin
Service Account
```

A machine identity must be distinguishable from the human who initiated an operation.

---

# 23. Human + Agent Attribution

When a human asks an AI to perform an operation, the operation should preserve both identities when applicable.

Example:

```text
initiatedBy:
user_123

executedBy:
agent_kimi_01
```

This allows audit records to answer:

```text
Who requested this?
Which agent executed it?
What did it do?
What was the result?
```

---

# 24. Authorization

Every capability must check effective authorization before execution.

Conceptually:

```text
Actor
↓
Workspace Membership
↓
Role / Permissions
↓
Resource Scope
↓
Project Scope
↓
Environment
↓
Policy
↓
Capability
```

The Control Plane must never trust the caller simply because authentication succeeded.

---

# 25. Default Deny

If the Control Plane cannot establish that an actor is authorized:

```text
DENY
```

must be the default.

Unknown permission state must never become accidental authorization.

---

# 26. Approval

Some capabilities may require approval.

Example:

```text
deployment.production
```

could result in:

```text
REQUIRE_APPROVAL
```

The agent must then receive a structured response identifying that approval is required.

The operation must not silently execute.

---

# 27. Capability Discovery

Agents need a reliable method for discovering what the current context allows.

The Control Plane should expose a capability discovery mechanism.

Conceptually:

```text
GET capabilities
```

Result:

```text
project.read       → allowed
project.write      → allowed
git.commit         → allowed
git.push           → allowed
deployment.deploy  → denied
```

The actual representation may be different.

---

# 28. Capability Discovery Scope

Capabilities should be evaluated in context.

The response may depend on:

```text
Actor
Workspace
Project
Environment
Provider
Policy
```

An agent must not assume that permissions available in one project are available in another.

---

# 29. Capability Discovery Security

Capability discovery must not reveal unnecessarily sensitive information.

An unauthorized consumer should not receive details that allow it to map privileged internal capabilities if such information is security-sensitive.

Only appropriate capability information should be returned.

---

# 30. Project API

The Project Control Plane must support, as appropriate:

```text
project.create
project.import
project.open
project.read
project.analyze
project.refresh
project.clone
project.export
project.archive
project.remove
```

Each operation must define its own contract.

---

# 31. File API

The file-level Control Plane must support authorized operations such as:

```text
file.read
file.write
file.create
file.delete
file.rename
file.move
```

File operations must always be scoped to an authorized Project/Runtime context.

An external agent must not receive unrestricted filesystem access simply because it has `file.write`.

---

# 32. Component API

The Component Control Plane must expose:

```text
component.detect
component.read
component.create
component.update
component.delete
component.promote
component.publish
```

Operations must use active project adapters.

An AI must not create arbitrary framework source directly when the Component Domain can perform the operation correctly through an adapter.

---

# 33. Media API

The Media Control Plane should expose:

```text
media.list
media.read
media.upload
media.update
media.replace
media.delete
```

Media operations must respect asset references and project boundaries.

---

# 34. Design API

The Design Control Plane should support structured operations such as:

```text
design.read
design.update
design.token.read
design.token.update
theme.read
theme.update
```

The final capability names depend on the Design Engine.

The implementation must preserve the project's original styling system.

---

# 35. Responsive API

The Responsive Control Plane should support operations such as:

```text
responsive.createViewport
responsive.preview
responsive.diagnose
responsive.stressTest
responsive.readResult
```

Long-running diagnostic operations should use Jobs.

---

# 36. Runtime API

The Runtime Control Plane must expose authorized capabilities such as:

```text
runtime.command.execute
runtime.process.list
runtime.process.start
runtime.process.stop
runtime.process.restart
runtime.build
runtime.test
runtime.preview.start
runtime.preview.stop
```

All Runtime operations must pass through Runtime security.

---

# 37. Git API

The Git Control Plane must expose structured capabilities such as:

```text
git.status
git.history
git.diff
git.branch.create
git.branch.switch
git.branch.delete
git.commit
git.push
git.pull
git.fetch
git.merge
git.rebase
git.stash
git.revert
git.reset
```

Destructive operations must have their own permissions and policy checks.

---

# 38. Deployment API

Deployment capabilities must include:

```text
deployment.preflight
deployment.deploy
deployment.status
deployment.verify
deployment.rollback
```

Each operation must include:

```text
Project
Environment
Provider
Actor
```

as applicable.

---

# 39. AI API

The AI Control Plane should support:

```text
ai.provider.list
ai.provider.select
ai.task.create
ai.task.read
ai.task.cancel
ai.task.approve
ai.task.reject
ai.capabilities.read
```

The exact API must not allow the AI provider to bypass Nexo authorization.

---

# 40. AI Task

An AI Task must maintain:

```text
Task ID
Actor
Agent
Provider
Project
Instruction
Mode
Status
Permissions
Tools Used
Files Changed
Validation
Result
Error
```

Sensitive prompts or secrets must not be logged indiscriminately.

---

# 41. AI Execution Modes

The Control Plane must distinguish at least:

```text
MANUAL
AUTONOMOUS
```

Manual mode may require explicit approval before mutations.

Autonomous mode may execute multiple authorized operations without asking for approval at every step, but it must still obey policy and permission boundaries.

---

# 42. CLI

The CLI should map naturally to capabilities.

Examples:

```text
nexo project create
nexo project analyze
nexo project open
nexo project export

nexo git status
nexo git commit
nexo git push

nexo build
nexo test

nexo ai run

nexo deploy
```

CLI naming is a user interface decision, but the underlying calls must use the same capability contracts.

---

# 43. SDK

A future SDK may provide typed access to the same Control Plane.

The SDK must not implement independent business logic.

Example conceptually:

```text
client.projects.create(...)
```

should ultimately invoke:

```text
project.create
```

---

# 44. Webhooks

The Control Plane should be prepared to receive and emit webhook events when necessary.

Potential events:

```text
project.updated
git.pushed
build.completed
build.failed
deployment.completed
deployment.failed
ai.task.completed
```

Webhook handling must be authenticated and idempotent.

---

# 45. Idempotency

Capabilities that can be retried should support idempotency where practical.

Examples:

```text
project.create
project.import
deployment.deploy
plugin.install
webhook processing
```

An idempotency mechanism must ensure that retries do not unintentionally create duplicate resources.

---

# 46. Request Validation

Every capability must validate requests before domain execution.

Validation includes:

```text
Required Fields
Type
Format
Resource Scope
Project State
Environment
Capability Availability
```

Invalid requests must be rejected before side effects occur.

---

# 47. Resource Not Found

A request for an inaccessible or nonexistent resource must not result in arbitrary fallback behavior.

The result should be a structured error such as:

```text
NOT_FOUND
```

or the appropriate security-preserving response defined by the API.

---

# 48. Conflict Errors

The Control Plane must represent conflicts explicitly.

Examples:

```text
Project Changed Externally
Branch Changed
Resource Version Mismatch
Stale Project Model
Deployment Already Active
Component Modified Since Read
```

Consumers need enough structured information to decide whether to refresh, retry or request human input.

---

# 49. Unsupported Operations

If an adapter does not support an operation:

```text
UNSUPPORTED
```

must be returned rather than executing an approximate implementation.

Example:

```text
component.create
→ adapter unsupported
```

must not silently generate generic code using a different framework.

---

# 50. Agent-Friendly Error Model

Errors must provide machine-readable information.

A useful error concept includes:

```text
code
message
operationId
resource
retryable
requiresApproval
requiredCapability
details
```

Sensitive internal details must be omitted from external responses.

---

# 51. Retryability

Each relevant error should indicate whether retrying is reasonable.

Conceptual values:

```text
retryable: true
retryable: false
retryable: unknown
```

Examples:

```text
network failure
→ potentially retryable

invalid input
→ not retryable without modification

permission denied
→ not retryable without permission change
```

---

# 52. Pagination

List operations should support pagination when the resource can grow significantly.

Examples:

```text
projects.list
media.list
git.history
audit.list
jobs.list
```

The exact pagination style is a Control Plane implementation decision.

---

# 53. Filtering

Where useful, list operations should support structured filtering.

Examples:

```text
Projects by Workspace
Media by type
Git history by branch
Jobs by status
Audit by actor
```

Do not expose arbitrary database query syntax.

---

# 54. Sorting

List endpoints should use explicit sortable fields.

Do not make result ordering dependent on undocumented storage behavior.

---

# 55. API Versioning

Public Control Plane contracts require versioning.

A breaking change must not silently invalidate existing agents.

The exact versioning strategy must be defined before implementation.

Possible mechanisms include:

```text
URL Versioning
Header Versioning
Protocol Version
Schema Version
```

The chosen approach must be consistent.

---

# 56. Contract Schemas

Every public capability must possess a machine-readable schema where practical.

The schema must define:

```text
Request
Response
Error
Authentication
Permissions
```

The implementation should generate or validate these schemas from a single source of truth when possible.

---

# 57. Agent Tool Schemas

AI Tools must map cleanly to Control Plane capabilities.

Example:

```text
Tool:
project.create

Input:
ProjectCreateRequest

Output:
ProjectCreateResult
```

The tool schema must not contain hidden UI assumptions.

---

# 58. Agent Context

An agent request must identify its context.

At minimum when applicable:

```text
Workspace
Project
Environment
Branch
Actor
```

An agent should not operate on a project merely because the project name matches.

Stable identifiers should be preferred.

---

# 59. Project Selection

Agents should be able to explicitly select a project.

Conceptually:

```text
workspaceId
projectId
```

Names may be used for discovery, but mutation operations should prefer stable identifiers.

---

# 60. Context Validation

Before executing a mutation, the Control Plane should verify that the supplied project context still exists and is accessible.

If the project changed significantly:

```text
CONFLICT
```

or:

```text
STALE_CONTEXT
```

should be returned as appropriate.

---

# 61. Long-Running Agent Tasks

AI agents may invoke multi-stage tasks.

Example:

```text
Analyze Project
↓
Modify
↓
Build
↓
Test
↓
Commit
↓
Push
```

The Control Plane should support representing the entire workflow as an AI Task/Job while retaining individual operation identities.

---

# 62. Agent Workflow Observability

An agent should be able to query:

```text
Task Status
Current Phase
Operations Performed
Files Changed
Validation Results
Errors
Pending Approval
```

This must be structured data.

The agent should not need to parse human-readable UI logs.

---

# 63. Agent Cancellation

An authorized initiator should be able to cancel an active AI task when possible.

Cancellation must propagate to active operations according to their cancellation semantics.

The system must not claim the project was reverted unless an actual rollback occurred.

---

# 64. Agent Resume

Long-running tasks should be designed so they can potentially resume after transient failure when technically safe.

The task must know:

```text
Completed Steps
Current State
Pending Steps
Failed Step
Required Permissions
```

The implementation must not replay destructive operations blindly.

---

# 65. Agent Capability Equality with CLI

The CLI and Agent API should expose the same underlying operation capabilities where appropriate.

Example:

```text
CLI:
nexo git commit

Agent:
git.commit
```

Both must reach the Git Service.

---

# 66. Agent Capability Equality with UI

The UI should likewise use the same application capabilities.

Example:

```text
UI:
Commit Button
↓
git.commit

Agent:
git.commit
```

The button handler should not contain an alternative Git implementation.

---

# 67. Agent Authentication from Kimi Code

Kimi Code must be able to connect to Nexo through an official programmatic mechanism once the integration is implemented.

The integration should not require Kimi Code to:

```text
open browser
login visually
operate UI
inspect DOM
```

for normal Nexo control.

The exact authentication and protocol must be selected and verified during implementation.

---

# 68. Agent Authentication from Codex

The same principle applies to Codex or other coding agents.

The Nexo should provide a machine-readable path for:

```text
Authenticate
Discover
Read
Modify
Validate
Version
Deploy
```

according to permissions.

---

# 69. Luna Integration

Luna must be able to use the same Control Plane capabilities.

The intended architecture is:

```text
Luna
↓
Luna/Nexo Integration
↓
Agent Entry Point
↓
Authorization
↓
Nexo Capability
```

Luna must not need Playwright to control Nexo operations that already have programmatic capabilities.

---

# 70. Local AI Integration

A local AI should be able to operate Nexo through:

```text
API
CLI
SDK
Agent Tool Protocol
```

depending on the final implementation.

The local model must still authenticate and receive only the capabilities it is authorized to use.

---

# 71. External Automation

Automation can use the Control Plane for tasks such as:

```text
Scheduled Project Analysis
Automatic Tests
Build Validation
Deployment
Asset Processing
Maintenance
```

Automation identities must be independently auditable.

---

# 72. CI/CD Integration

The Control Plane should eventually support CI/CD workflows.

Example:

```text
CI
↓
Authenticate
↓
project.read
↓
runtime.test
↓
runtime.build
↓
deployment.deploy
```

Permissions must be limited to the workflow's actual requirements.

---

# 73. Security Rule for Entry Points

Every entry point must eventually converge on the same authorization rules.

Forbidden:

```text
UI → Security A
API → Security B
CLI → No Security
AI → Security C
```

Required:

```text
UI
API
CLI
AI
Plugin
    ↓
Central Authorization Model
```

---

# 74. No Hidden Administrative API

There must not be undocumented privileged endpoints created for convenience during development.

Development-only bypasses must not be shipped as production functionality.

If a privileged internal operation is required, its security boundary must be explicit.

---

# 75. Internal API

The Nexo may have internal application interfaces that are not public.

However, they must still follow Core security and domain rules.

Internal does not mean unrestricted.

---

# 76. Local Development Overrides

Development environments may provide debug facilities.

Those facilities must:

* be clearly separated from production;
* require explicit configuration;
* never silently enable production bypass;
* never weaken the production Control Plane.

---

# 77. API Rate and Resource Controls

Where exposed over a network, the Control Plane should support resource controls appropriate to the deployment.

Potential controls:

```text
Rate Limits
Concurrent Jobs
Request Size
Output Limits
Timeouts
AI Task Limits
Deployment Limits
```

Actual values depend on deployment requirements.

---

# 78. API Security Testing

The Control Plane must test:

```text
Authentication Failure
Authorization Failure
Cross-Workspace Access
Cross-Project Access
Token Revocation
Expired Credentials
Capability Escalation
Agent Privilege Escalation
Malformed Input
Path Traversal
Command Injection
Replay
Idempotency
Concurrent Requests
```

---

# 79. Contract Testing

Every public capability must have contract tests.

Tests must verify:

```text
Valid Request
Invalid Request
Unauthorized Request
Unsupported Capability
Successful Result
Failure Result
Partial Result where applicable
Async Behavior where applicable
```

---

# 80. Capability Discovery Testing

Capability discovery must be tested for different contexts.

Example:

```text
Developer on Project A
```

must not receive the same effective permissions as:

```text
Viewer on Project B
```

unless policies actually produce the same result.

---

# 81. Agent Parity Test

At least one end-to-end test must prove that a programmatic agent can complete a human-equivalent workflow.

Example:

```text
Authenticate Agent
↓
Select Project
↓
Read Project
↓
Create Component
↓
Run Build
↓
Run Tests
↓
Commit
```

No browser automation should be required.

---

# 82. Full Agent Workflow Test

The test suite should eventually verify:

```text
Agent
↓
Create Project
↓
Analyze
↓
Modify
↓
Validate
↓
Commit
↓
Push
↓
Deploy
↓
Verify
```

using only official Nexo programmatic interfaces.

---

# 83. Acceptance Criteria

The Control Plane is correctly implemented when:

1. Nexo capabilities can be invoked without the UI.
2. UI and API use the same underlying domain capabilities.
3. AI agents can use the same capabilities.
4. Kimi Code can be integrated without Playwright.
5. Codex can be integrated without Playwright.
6. Luna can use the programmatic control path.
7. Local AI can use the programmatic control path.
8. CLI can use the same capabilities.
9. Authentication exists for machine consumers.
10. Authorization is enforced.
11. Capability discovery exists.
12. Requests and responses are structured.
13. Errors are structured.
14. Long-running operations are represented by Jobs.
15. Jobs can be queried.
16. Jobs can be cancelled where supported.
17. Idempotency exists where required.
18. API versioning is defined.
19. Cross-project and cross-workspace boundaries are enforced.
20. No consumer requires UI automation for supported internal operations.
21. Agent actions are auditable.
22. Human initiator and executing agent can be distinguished.
23. AI does not bypass Runtime or Domain security.
24. Public capabilities are documented by machine-readable contracts.

---

# 84. K3 Swarm Implementation Protocol

Before implementing the Control Plane, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `04-RUNTIME-AND-SECURITY.md`.
3. Read `05-NEXO-ENGINE.md`.
4. Identify every capability that must be exposed.
5. Define request and response schemas.
6. Define authentication.
7. Define authorization.
8. Define resource scope.
9. Define synchronous/asynchronous behavior.
10. Define error codes.
11. Define idempotency behavior.
12. Define operation IDs.
13. Define Job behavior.
14. Define versioning.
15. Implement contract tests.
16. Implement an end-to-end machine-agent workflow.
17. Verify that no operation depends on Playwright.
18. Verify the same capabilities are used by UI, API, CLI and AI.
19. Research official documentation for the selected protocol, authentication mechanism and external integrations.
20. Document unresolved architectural decisions instead of inventing answers.

---

# 85. Final Control Plane Principle

The Nexo Control Plane exists to make the product controllable by humans and machines through a common set of capabilities.

The desired architecture is:

```text
                   NEXO CAPABILITIES
                         │
        ┌────────────────┼────────────────┐
        │                │                │
       UI               API              CLI
        │                │                │
        └────────────────┼────────────────┘
                         │
                  AI / AGENTS
                         │
                Kimi / Codex / Luna
                         │
                    Local AI
                         │
                    Automation
                         │
                         ▼
                  NEXO ENGINE
                         │
                DOMAIN CAPABILITIES
                         │
             ┌───────────┼───────────┐
             │           │           │
          ADAPTER      RUNTIME     PROVIDER
             │           │           │
             └───────────┼───────────┘
                         │
                    REAL RESOURCE
```

The central rule is:

> **The Nexo UI is not the control plane. The Nexo capabilities are the control plane.**

The browser is one way to invoke those capabilities.

An AI agent is another.

A CLI is another.

An automation system is another.

They must all operate the same underlying Nexo.

```
```
    