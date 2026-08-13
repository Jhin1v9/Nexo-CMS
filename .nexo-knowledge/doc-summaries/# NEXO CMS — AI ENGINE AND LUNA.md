````md
# NEXO CMS — AI ENGINE AND LUNA

## 1. Document Status

**Document:** `11-AI-ENGINE-AND-LUNA.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the Nexo AI Engine, AI provider architecture, AI context system, AI tools, execution modes and Luna integration.

This document defines how artificial intelligence operates inside Nexo without becoming a privileged bypass around the Nexo architecture.

The central requirement is:

> **AI is a first-class consumer of Nexo capabilities, not a special browser user and not an unrestricted operating-system process.**

---

# 2. Objective

The Nexo AI subsystem must allow AI agents to:

- understand projects;
- inspect project structure;
- reason about source;
- plan changes;
- edit files;
- create pages;
- create components;
- modify components;
- manage media;
- analyze responsive problems;
- run builds;
- run tests;
- inspect Git;
- create commits;
- push;
- deploy;
- verify;
- recover;
- perform multi-step engineering workflows;

when the AI identity has the required permissions and policies allow the operation.

The AI must use Nexo capabilities rather than recreating the platform's logic.

---

# 3. Core AI Principle

The AI architecture is:

```text
AI PROVIDER
    ↓
AI ENGINE
    ↓
AI CONTEXT
    ↓
AI PLANNER / EXECUTOR
    ↓
AI TOOLS
    ↓
NEXO ENGINE
    ↓
DOMAIN CAPABILITIES
    ↓
ADAPTER / RUNTIME / PROVIDER
````

The AI Provider supplies model intelligence.

The Nexo controls:

* context;
* capabilities;
* tools;
* permissions;
* policies;
* execution;
* validation;
* audit.

---

# 4. AI Is Not the Architecture

The AI must not become the central owner of Nexo logic.

Incorrect:

```text
AI
↓
decides everything
↓
direct filesystem
↓
direct Git
↓
direct deployment
```

Correct:

```text
AI
↓
requests capability
↓
Nexo authorization
↓
Nexo Engine
↓
appropriate subsystem
```

The AI decides how to reason about a task.

The Nexo decides what operations are actually available.

---

# 5. Provider Independence

The AI Engine must support multiple providers.

Initial possible providers:

```text
Kimi
Luna
OpenAI
Anthropic
Gemini
Local Models
Custom Providers
```

This list is not exhaustive.

The Core must not contain provider-specific logic throughout the application.

---

# 6. AI Provider Contract

Every provider must implement a common conceptual contract.

The provider must be capable of:

```text
identify()
getModels()
generate()
stream()
cancel()
```

where supported.

The exact interface depends on the chosen implementation.

A Provider must not receive unrestricted Nexo Runtime access merely because it can generate model responses.

---

# 7. Provider Metadata

A provider should expose structured metadata such as:

```text
Provider ID
Provider Name
Model ID
Model Capabilities
Context Limits
Tool Support
Streaming Support
Vision Support
Reasoning Support
```

Provider-reported capabilities must be treated as data, not assumptions.

---

# 8. Provider Adapter

External model APIs must be isolated behind provider adapters.

Example:

```text
AI Engine
↓
Provider Interface
↓
Kimi Provider
```

or:

```text
AI Engine
↓
Provider Interface
↓
OpenAI Provider
```

This keeps the AI Engine independent of provider API syntax.

---

# 9. Local AI Provider

Local models must be first-class providers.

A local model may communicate through:

```text
HTTP
OpenAI-compatible API
Local Process
Custom Runtime
```

depending on the implementation.

The Nexo must not assume that local AI means unrestricted local system access.

The model still operates through Nexo permissions and tools.

---

# 10. Luna Provider

Luna must be integrated through a dedicated Provider/Agent interface.

Luna is conceptually different from an ordinary remote model if it already possesses its own execution, tools or internal orchestration.

The Nexo should therefore treat Luna as an AI/Agent provider capable of interacting with Nexo through explicit capabilities.

---

# 11. Luna Integration Principle

The preferred architecture is:

```text
Luna
↓
Nexo Agent Interface
↓
Authentication
↓
Authorization
↓
Nexo Engine
```

Not:

```text
Luna
↓
Browser
↓
Playwright
↓
Nexo UI
```

when programmatic access is available.

---

# 12. Luna Independence

The Nexo must not reimplement Luna internals.

The Nexo only needs an integration boundary that allows Luna to:

* authenticate;
* discover capabilities;
* send tasks;
* invoke tools;
* receive results;
* receive operation state;
* receive errors.

Luna remains responsible for its own internal architecture.

---

# 13. AI Identity

Each AI execution must have an identifiable agent identity.

Examples:

```text
Kimi Agent
Codex Agent
Luna Agent
Local AI Agent
Automation Agent
```

An AI identity must be distinct from the human user who requested the task.

---

# 14. Human Initiator

Where a human starts an AI task, the system should preserve:

```text
Initiated By:
Human User

Executed By:
AI Agent
```

This is necessary for:

* audit;
* authorization;
* accountability;
* debugging.

---

# 15. Machine Authentication

AI providers and agents must authenticate through supported machine-facing mechanisms.

Possible mechanisms may include:

```text
API Key
OAuth
Short-Lived Token
Service Identity
Signed Request
```

The actual implementation must be determined by the Security and Control Plane specifications.

Do not invent authentication behavior for third-party providers.

---

# 16. AI Authorization

Every AI operation must pass through the Nexo authorization model.

The AI must not receive a hidden privileged mode.

Example:

```text
AI
↓
git.push
↓
Authorization
↓
ALLOW / DENY / REQUIRE_APPROVAL
```

---

# 17. AI Permission Parity

AI must be able to perform the same domain capabilities available to a human when:

* the capability has a programmatic entry point;
* the AI has permission;
* policies allow it;
* required approvals are satisfied.

Example:

```text
Human:
component.create → ALLOW

AI:
component.create → ALLOW
```

Both call the same Component capability.

---

# 18. AI Does Not Receive Automatic Human Permissions

Human permissions must not automatically become AI permissions.

The system must evaluate effective AI authorization independently.

Example:

```text
Human:
deployment.production → ALLOW

AI:
deployment.production → DENY
```

This is valid when policy requires it.

The restriction belongs to Security and Policy, not to the AI architecture itself.

---

# 19. AI Context Engine

The AI Context Engine determines what information should be presented to a model for a task.

Context may include:

```text
Project Identity
Stack
Versions
Routes
Pages
Components
Relevant Files
Styles
Assets
Dependencies
Git State
Build State
Diagnostics
Active Task
```

The system must not automatically send the entire repository to every model.

---

# 20. Context Is Task-Specific

Context should be selected according to the task.

Example:

```text
Task:
Fix mobile overflow

Relevant context:
Responsive diagnostic
Affected component
Related source
Styles
Breakpoints
Relevant preview information
```

There is no need to send unrelated project history.

---

# 21. Context Freshness

AI context must indicate its freshness.

Possible states:

```text
FRESH
STALE
PARTIAL
UNKNOWN
```

AI must not be encouraged to act on known-stale source information.

---

# 22. Context Sources

Context may come from:

```text
Project Intelligence
Project Model
Project Graph
Source Files
Git
Runtime Diagnostics
Responsive Lab
Component Library
Media Library
Previous AI Operations
```

Every context source must have a known origin.

---

# 23. Context Provenance

Where practical, AI context should retain provenance.

Example:

```text
Information:
Next.js 15

Source:
package.json

Information:
Hero.tsx causes 28px overflow

Source:
Responsive Diagnostic job_123
```

This helps prevent fabricated context.

---

# 24. Context Priority

When sources disagree, the system should use a defined authority order.

Typical example:

```text
Actual Source Project
↓
Runtime Observation
↓
Git State
↓
Project Intelligence
↓
Cached Metadata
↓
AI Assumption
```

AI assumptions are never authoritative project facts.

The exact precedence must remain consistent with the relevant subsystem specifications.

---

# 25. Context Limits

The Context Engine must account for provider/model limits.

It should support strategies such as:

```text
Relevant File Selection
Summarization
Chunking
Prioritization
Tool Retrieval
Incremental Context
```

The system must not blindly truncate critical source code.

---

# 26. Tool System

AI Tools expose Nexo capabilities to the model.

Examples:

```text
project.read
project.analyze
file.read
file.write
component.create
component.update
media.search
git.status
git.diff
git.commit
runtime.command.execute
runtime.build
runtime.test
responsive.diagnose
deployment.deploy
```

Each Tool must correspond to a real Nexo operation.

---

# 27. Tool Contract

Every AI Tool must define:

```text
Tool ID
Description
Input Schema
Output Schema
Required Permission
Scope
Side Effects
Async Behavior
Error Model
```

The model must not need to guess tool parameters.

---

# 28. Tool Discovery

AI should be able to discover available tools according to the current context.

Example:

```text
project.read
project.write
git.status
git.commit
runtime.build
```

The AI should not be shown tools that it is forbidden to use when capability hiding is appropriate.

---

# 29. Tool Availability Is Dynamic

Tool availability may depend on:

```text
Project
Adapter
Permissions
Environment
Provider
Workspace Policy
Project State
```

Example:

```text
Next.js project:
route.create → available

Unsupported framework:
route.create → unavailable
```

---

# 30. Tool Execution

Every tool invocation must pass through the Control Plane/Engine.

Flow:

```text
AI Model
↓
Tool Request
↓
Input Validation
↓
Authorization
↓
Policy
↓
Nexo Engine
↓
Tool Result
↓
AI Model
```

---

# 31. Tool Result

Tool results must be structured.

Example:

```text
status
operationId
resource
result
warnings
diagnostics
job
error
```

The model should not need to interpret screenshots or UI messages to know what happened.

---

# 32. Tool Error Handling

Tools must return machine-readable errors.

Examples:

```text
INVALID_INPUT
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
UNSUPPORTED
RUNTIME_FAILURE
BUILD_FAILURE
TIMEOUT
CANCELLED
```

The AI can then decide whether to:

```text
Retry
Change Plan
Ask User
Request Approval
Stop
```

---

# 33. Tool Security

AI Tools must never expose more privileges than the corresponding Nexo capability.

If:

```text
git.push
```

requires permission, the Tool must require the same permission.

---

# 34. Generic File Tool

A generic file operation can exist:

```text
file.read
file.write
file.create
file.delete
```

but the AI should prefer higher-level capabilities when available.

Example:

```text
Prefer:
component.update

instead of:
file.write
```

when the task is specifically a component modification.

---

# 35. Generic Command Tool

A generic Runtime command capability may exist:

```text
runtime.command.execute
```

but AI should prefer structured domain operations when available.

Example:

```text
Prefer:
git.commit

instead of:
runtime.command.execute("git commit ...")
```

This provides stronger validation, authorization and audit.

---

# 36. AI Planning

The AI Engine should support a planning stage for complex tasks.

Example:

```text
Request
↓
Understand
↓
Inspect
↓
Plan
↓
Propose Operations
↓
Execute
```

The plan should be represented structurally where possible.

---

# 37. Plan Object

A plan may contain:

```text
Task
Assumptions
Steps
Required Capabilities
Affected Resources
Validation Plan
Rollback Strategy
```

The AI must identify assumptions rather than silently treating guesses as facts.

---

# 38. Manual Mode

Manual AI mode should follow:

```text
User Request
↓
AI Analysis
↓
Plan
↓
Proposed Changes
↓
Diff
↓
Approval
↓
Execution
↓
Validation
```

The AI must not apply mutations before required approval.

---

# 39. Autonomous Mode

Autonomous AI mode may execute multiple authorized operations.

Flow:

```text
Task
↓
Understand
↓
Plan
↓
Execute
↓
Validate
↓
Repair if authorized
↓
Complete
```

Autonomy does not bypass:

* authorization;
* policy;
* Runtime restrictions;
* secret handling;
* audit;
* required approvals.

---

# 40. Autonomous Retry

AI may retry failures when:

* the error is retryable;
* the task policy allows retries;
* the retry will not create unsafe duplicate effects.

Destructive actions must not be blindly repeated.

---

# 41. AI Validation Loop

The preferred engineering loop is:

```text
Inspect
↓
Modify
↓
Validate
↓
Observe
↓
Fix
↓
Validate Again
```

Validation should use real project capabilities:

```text
Parser
Typecheck
Lint
Test
Build
Preview
Responsive Diagnostics
Git Diff
```

as appropriate.

---

# 42. AI Source Editing

When AI changes source, it should use the highest-level suitable capability.

Preferred hierarchy:

```text
Structured Domain Capability
↓
Adapter-backed Source Transformation
↓
Targeted File Mutation
↓
Generic File Write
```

Generic file writing should be the fallback, not the first choice when a structured operation exists.

---

# 43. AI Diff

AI-generated source changes must be representable as a diff.

The diff should identify:

```text
Files
Before
After
Added
Removed
Modified
```

and, when possible:

```text
Origin:
AI Agent
Task ID
```

---

# 44. AI Approval

Approval may be required:

```text
Before Change
Before Commit
Before Push
Before Production Deploy
```

according to policy.

An AI must receive a structured approval response.

---

# 45. AI Task State

AI tasks should have explicit states:

```text
QUEUED
PLANNING
WAITING_APPROVAL
EXECUTING
VALIDATING
BLOCKED
COMPLETED
FAILED
CANCELLED
```

The exact state set may be extended.

---

# 46. AI Task Persistence

AI task state must exist outside the browser.

A browser refresh must not destroy a running task.

This allows:

```text
UI
API
CLI
Luna
Automation
```

to query the same task state.

---

# 47. AI Task Cancellation

Authorized consumers should be able to cancel running tasks where safe.

Cancellation must propagate to active operations when supported.

---

# 48. AI Task Resume

Long-running AI workflows may support resume after recoverable interruptions.

The task must know:

```text
Completed Steps
Current Step
Pending Steps
Operation IDs
Failures
```

The AI must not blindly repeat destructive completed steps.

---

# 49. AI and Project Intelligence

Before making structural changes, AI should use Project Intelligence.

Example:

```text
AI:
"Create a page."

Context:
Framework = Next.js
Router = detected
Styling = Tailwind
Package Manager = pnpm
```

The AI should not invent the project's architecture.

---

# 50. AI and Adapters

AI must use Adapter capabilities through Nexo Engine operations.

The model does not need to know every framework implementation detail if the Adapter can perform the requested operation.

---

# 51. AI and Runtime

AI must use Runtime through authorized capabilities.

Example:

```text
AI
↓
runtime.build
↓
Runtime
```

not direct process execution outside Nexo.

---

# 52. AI and Git

AI must use Git Domain capabilities:

```text
git.status
git.diff
git.commit
git.push
```

rather than recreating Git semantics.

---

# 53. AI and Media

AI can:

```text
search
inspect
select
upload
replace
```

media through Media Engine capabilities.

The model should receive metadata before binary content whenever possible.

---

# 54. AI and Components

AI should search the Component Library before creating a new component when the request matches an existing reusable capability.

Preferred:

```text
Search
↓
Reuse
```

before:

```text
Generate duplicate component
```

---

# 55. AI and Responsive Lab

AI can consume structured responsive diagnostics.

Preferred:

```text
responsive.diagnose
↓
Structured Issue
↓
AI Analysis
↓
Source Modification
↓
Re-render
↓
Verify
```

rather than requiring screenshot-only reasoning when structured browser evidence exists.

---

# 56. AI and Design

AI should use Design capabilities instead of randomly editing CSS.

Example:

```text
design.token.update
```

should be preferred over mass file replacement when the user's request targets a shared token.

---

# 57. AI and Deployment

Deployment must remain a separate high-impact capability.

Example:

```text
AI
↓
deployment.preflight
↓
Approval / Policy
↓
deployment.deploy
↓
deployment.verify
```

An AI should not treat `deploy` as equivalent to `write files`.

---

# 58. AI Context Security

AI context must not automatically contain:

```text
API Keys
Passwords
Private Keys
Tokens
Secret Environment Values
Provider Credentials
```

unless the task explicitly requires a secret operation and the policy authorizes the necessary secret use.

Even then, passing raw secrets into model context should be avoided where a secure capability can perform the operation without exposing the value.

---

# 59. Secret-Aware Tools

Prefer tools that consume secrets internally.

Example:

```text
Preferred:
deployment.deploy

Avoid:
AI receives production password
↓
AI manually logs into server
```

The first architecture keeps secret material outside model context.

---

# 60. AI Network Access

AI provider access and project network access are separate concepts.

An AI being able to call its model provider does not mean it can arbitrarily access project networks or external services.

Network permissions must remain explicit.

---

# 61. AI Command Safety

Commands generated by AI must be treated as untrusted input until:

```text
Validated
Authorized
Policy Checked
```

AI must not receive a command bypass because it produced the command itself.

---

# 62. Autonomous AI and Destructive Operations

Autonomous mode must apply stricter controls to irreversible actions.

Examples:

```text
Delete Project
Delete File
Force Push
Hard Reset
Production Deployment
Secret Rotation
```

These may require approval even when ordinary editing is autonomous.

---

# 63. AI Observability

Every significant AI task should be traceable through:

```text
Task ID
Operation ID
Agent ID
Human Initiator
Provider
Model
Project
Workspace
Tools Used
Files Changed
Result
```

Sensitive prompt content must be handled according to privacy and logging policy.

---

# 64. Tool Trace

For debugging, an AI task should be able to expose its tool sequence.

Example:

```text
project.analyze
↓
component.read
↓
file.read
↓
component.update
↓
runtime.test
↓
git.diff
```

This is valuable for audit and debugging.

---

# 65. AI Hallucination Protection

The AI Engine must make it difficult for models to confuse assumptions with observed project facts.

Tools should return authoritative structured information.

Example:

Instead of allowing the model to assume:

```text
"The project uses Tailwind."
```

provide:

```text
Detected Styling System:
Tailwind
Confidence:
CONFIRMED
Evidence:
...
```

---

# 66. AI Action Preconditions

Tools should reject operations when required preconditions are not satisfied.

Example:

```text
component.update
```

should fail if:

```text
component unknown
adapter unavailable
project stale
```

rather than allowing AI to improvise around the problem.

---

# 67. AI Planning and Unknowns

When information is missing, AI may request additional inspection.

Example:

```text
Need to know router type.
↓
project.analyze
```

AI should prefer inspection tools over assumptions.

---

# 68. AI Tool Budget

The AI Engine may enforce task-level limits such as:

```text
Maximum Tool Calls
Maximum Runtime Duration
Maximum File Mutations
Maximum Retry Count
Maximum Cost
Maximum Concurrent Jobs
```

Limits are policy/configuration concerns and must not be hardcoded in provider adapters.

---

# 69. AI Context Budget

The Context Engine may impose:

```text
Maximum Context Size
Maximum File Size
Maximum Number of Files
Maximum History
```

Selection should prioritize relevant information.

---

# 70. AI Memory

AI task history may be stored as metadata, but project truth must remain in:

```text
Source Project
Git
Project Intelligence
```

AI memory must not override actual project state.

---

# 71. AI Conversation vs Project State

Conversation content is not project state.

Example:

```text
AI says:
"the page is fixed"
```

does not mean:

```text
Project:
build succeeds
```

The Nexo must verify actual state through tools.

---

# 72. AI Result Verification

An AI task is not successful merely because the model says it succeeded.

Success must be based on actual operation results.

Example:

```text
AI:
"I fixed the build."

Nexo:
Run build
↓
FAIL
```

Final task state must reflect:

```text
FAILED
```

not AI's textual claim.

---

# 73. AI Completion Contract

An AI task should be considered successful when:

```text
Requested Outcome
+
Required Operations
+
Validation
```

meet the task's acceptance conditions.

---

# 74. AI Multi-Step Engineering Task

Example task:

> Fix the mobile navigation, run tests, commit the changes and push.

Correct execution:

```text
Understand Task
↓
Project Intelligence
↓
Responsive Diagnosis
↓
Plan
↓
Modify Source
↓
Render
↓
Verify Responsive Issue
↓
Run Tests
↓
Git Diff
↓
Commit
↓
Push
↓
Final Report
```

Each stage must use actual Nexo capabilities.

---

# 75. AI Final Report

An AI task completion result should provide structured information:

```text
Status
Summary
Files Changed
Operations Performed
Validation Results
Git Result
Deployment Result when applicable
Warnings
Remaining Issues
```

The textual model response may summarize this, but structured state is authoritative.

---

# 76. Luna-Specific Integration

Luna must have:

```text
Luna Identity
Authentication
Capabilities
Tool Access
Task Interface
Result Interface
Audit Context
```

The Nexo must not assume Luna's internal implementation.

---

# 77. Luna as External/Internal Agent

Luna may operate:

```text
Local
Remote
Within Nexo environment
Outside Nexo environment
```

The integration must expose a consistent capability contract.

---

# 78. Luna Tool Translation

If Luna already has its own tool format, the Nexo integration may translate between:

```text
Luna Tool
↓
Nexo Capability
```

The translation layer must not duplicate the actual domain operation.

---

# 79. Luna and Nexo Security

Luna must be subject to the same authorization model as other machine identities.

Being the Nexo's own AI does not grant an automatic unrestricted bypass.

Administrative capabilities must remain explicit.

---

# 80. Luna Autonomous Mode

If Luna runs autonomously:

```text
Luna
↓
AI Authorization
↓
Policy
↓
Nexo Capability
```

The same approval and destructive-operation rules apply.

---

# 81. Provider Failure

If an AI provider fails:

```text
Provider Unavailable
```

the Nexo should preserve:

* project state;
* pending changes;
* task state;
* audit;
* recovery data.

Provider failure must not destroy the project.

---

# 82. Model Failure

Model errors such as:

```text
Invalid Tool Call
Malformed Output
Context Overflow
Provider Timeout
Unsupported Tool Format
```

must be represented as AI-layer failures.

The Nexo should not treat them as successful operations.

---

# 83. Tool Call Validation

AI-generated tool calls must be validated before execution.

Required checks:

```text
Tool Exists
Tool Available
Input Valid
Actor Authorized
Project Accessible
Policy Allows
```

Only then may execution proceed.

---

# 84. Structured Tool Schema

Tool schemas should be machine-readable and suitable for supported providers.

Where possible, use the provider's official structured tool/function-calling mechanism rather than parsing free-form model text.

The exact provider implementation must follow current official documentation.

---

# 85. Provider Compatibility

Different AI providers may support tools differently.

The AI Provider layer must normalize these differences.

The AI Engine must operate against a common internal tool model.

---

# 86. Tool Streaming

If a provider supports streaming, the AI Engine may stream:

```text
Text
Tool Requests
Tool Results
Task State
```

The streamed representation must remain distinguishable from authoritative task state.

---

# 87. Provider Model Selection

The AI Engine may allow model selection based on:

```text
Task
Provider
Capabilities
Context Size
Tool Support
Cost
Latency
Policy
```

The selected model must not receive broader permissions merely because it is more capable.

---

# 88. AI Model Does Not Determine Permissions

A model's intelligence level must never determine its authorization.

Example:

```text
Most capable model
≠
Most privileged model
```

Permissions belong to identity and policy.

---

# 89. Multiple Models

An AI Task may eventually use multiple models.

Example:

```text
Planner Model
↓
Coder Model
↓
Validator Model
```

All models must operate through the same Nexo authorization and capability boundaries.

---

# 90. AI Model Handoff

When handing context between models, the Nexo must preserve:

```text
Task Context
Project Context
Permissions
Tool Availability
Current State
```

Secrets must not be transferred unnecessarily.

---

# 91. AI Task Isolation

Different AI tasks should not automatically share unrestricted working memory.

Task context must be scoped.

This prevents one task from accidentally influencing another with unrelated project assumptions.

---

# 92. Multi-Agent Tasks

The architecture may support multiple agents cooperating on a task.

Example:

```text
Planner Agent
↓
Developer Agent
↓
Tester Agent
```

All agents must have explicit identities.

All operations remain attributable.

---

# 93. Agent Delegation

An agent may delegate work to another agent only through an authorized mechanism.

The child agent must not automatically inherit unrestricted permissions.

Delegation should preserve:

```text
Parent Agent
Child Agent
Human Initiator
Granted Scope
```

---

# 94. AI and Plugin System

AI may discover plugin-provided tools.

Plugin tools must follow normal Plugin and Security contracts.

AI must not receive arbitrary plugin privileges merely because a plugin exposes a tool.

---

# 95. AI and Custom Tools

Nexo may support user-defined or project-defined tools in the future.

Custom tools must declare:

```text
Identity
Inputs
Outputs
Permissions
Side Effects
Security Requirements
```

No arbitrary executable tool should become trusted merely because it was registered.

---

# 96. AI Testing

AI subsystem tests must include deterministic tests around:

```text
Tool Selection
Tool Validation
Authorization
Tool Errors
Context Selection
Provider Errors
Task State
Cancellation
Retries
Diff Handling
Validation Loop
```

Do not rely exclusively on model outputs for automated correctness.

---

# 97. AI Integration Testing

Integration tests should verify:

```text
Agent
↓
Authenticate
↓
Discover
↓
Read Project
↓
Modify
↓
Validate
↓
Git
```

without browser automation.

---

# 98. AI Fixture Tasks

Create deterministic fixture tasks such as:

```text
Fix a known CSS bug
Create a known component
Change a design token
Run tests
Create a commit
```

The fixture project and expected result should be controlled.

---

# 99. No Hallucinated Success

A model response saying:

```text
Done.
```

is not evidence of success.

The AI Engine must trust:

```text
Tool Results
Runtime Results
Build Results
Test Results
Git Results
Deployment Results
```

over model claims.

---

# 100. Research Requirement

Before implementing provider integrations, the agent must consult current official documentation for each selected provider.

This includes:

```text
Kimi
OpenAI
Anthropic
Gemini
Local Model Runtime
Tool Calling
Streaming
Authentication
Context APIs
```

The Swarm must verify current APIs instead of relying on remembered interfaces.

---

# 101. Acceptance Criteria

The AI subsystem is correctly implemented when:

1. Multiple AI providers can be supported.
2. AI providers are isolated behind contracts.
3. Local AI is supported as a provider.
4. Luna has an explicit integration boundary.
5. AI has machine identity.
6. Human initiators can be distinguished from executing agents.
7. AI capabilities are controlled by authorization.
8. AI can perform authorized human-equivalent Nexo operations.
9. AI does not require Playwright for internal control.
10. AI context is task-specific.
11. Context freshness is represented.
12. Secrets are not exposed unnecessarily.
13. Tools have machine-readable contracts.
14. Tool calls are validated.
15. Tool execution passes through Nexo authorization.
16. AI tasks have persistent state.
17. AI tasks support cancellation where appropriate.
18. AI tasks do not treat textual model claims as authoritative.
19. AI-generated changes produce real project diffs.
20. AI can use Project Intelligence.
21. AI can use Adapters through Nexo capabilities.
22. AI can use Runtime through authorized tools.
23. AI can use Git through Git capabilities.
24. AI can use Component and Media capabilities.
25. AI can perform responsive diagnosis.
26. Autonomous mode still respects Security.
27. High-risk actions can require approval.
28. Provider failures do not corrupt project state.
29. Multiple agents can be audited.
30. The complete agent workflow works without browser automation.

---

# 102. K3 Swarm Implementation Protocol

Before implementing AI, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `03-ADAPTER-SYSTEM.md`.
3. Read `04-RUNTIME-AND-SECURITY.md`.
4. Read `05-NEXO-ENGINE.md`.
5. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
6. Read this document completely.
7. Inspect the selected AI provider APIs.
8. Research current official provider documentation.
9. Implement provider abstraction.
10. Implement AI Context Engine.
11. Implement Tool Contract.
12. Implement Tool Validation.
13. Implement manual execution mode.
14. Implement autonomous execution mode behind permissions.
15. Implement Luna integration boundary.
16. Implement AI task persistence.
17. Implement cancellation.
18. Implement deterministic fixture tasks.
19. Verify human/AI capability parity.
20. Verify that AI cannot bypass Runtime or Authorization.
21. Verify that no internal operation depends on Playwright.

---

# 103. Final Principle

The Nexo AI Engine must make AI genuinely useful as an engineering operator without allowing the model to become an uncontrolled system administrator.

The architecture is:

```text
                     AI PROVIDER
                          │
                      AI ENGINE
                          │
                    AI CONTEXT
                          │
                   PLANNER / MODEL
                          │
                       TOOLS
                          │
                  AUTHORIZATION
                          │
                     NEXO ENGINE
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
     PROJECT            GIT             RUNTIME
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    REAL PROJECT
```

The defining rule is:

> **The model provides intelligence. Nexo provides capabilities, permissions and execution.**

Luna, Kimi, Codex, local models and future AI systems should all be able to operate the same Nexo through the same underlying capability architecture.

The ultimate goal is that an authorized AI can perform the same real engineering work a human can perform through Nexo, programmatically, safely, audibly and without pretending to be a human clicking a browser.

```
```
