````md
# NEXO CMS — SYSTEM ARCHITECTURE

## 1. Document Status

**Document:** `01-SYSTEM-ARCHITECTURE.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** System-level architectural specification

This document defines the structural architecture of the Nexo CMS.

It must be interpreted together with the previously established Nexo CMS foundation documents:

- Human Manifest
- Vision
- Product Principles
- Non-Goals
- Glossary
- Core Invariants

Those documents establish the product's intent and immutable principles.

This document establishes how the software must be structurally organized to preserve those principles.

A lower-level implementation must not silently contradict this document.

---

# 2. Architectural Objective

The Nexo CMS must be implemented as a **programmable engineering platform for real web projects**.

It is not merely:

- a visual website editor;
- a CMS frontend;
- a chatbot;
- an IDE replacement;
- a collection of unrelated tools.

The platform must provide a single underlying system that can be controlled through multiple consumers:

```text
Human
AI Agent
Kimi Code
Codex
Luna
Local AI
CLI
Automation
Plugin
External Integration
````

These consumers must access the same underlying capabilities.

The Nexo must never require a different implementation of the same business operation simply because the consumer changed.

---

# 3. Fundamental Architecture

The architecture is based on the following flow:

```text
CONSUMER
    ↓
ENTRY POINT
    ↓
AUTHENTICATION
    ↓
AUTHORIZATION / POLICY
    ↓
APPLICATION CAPABILITY
    ↓
DOMAIN OPERATION
    ↓
ADAPTER / PROVIDER / RUNTIME
    ↓
REAL RESOURCE
```

Examples of real resources:

```text
Source Project Files
Git Repository
Operating System Processes
Deployment Provider
AI Provider
Nexo Storage
External Integration
```

The web interface is only one consumer.

The browser must never become the hidden owner of Nexo business logic.

---

# 4. Human and Machine Capability Parity

This is a core architectural requirement.

> **Any operation that an authorized human can perform through the Nexo and that is technically suitable for programmatic execution must also be executable by an authorized AI or machine consumer through a programmatic entry point.**

Example:

```text
Human
↓
Nexo UI
↓
project.create
```

and:

```text
AI
↓
Nexo API / Agent Tool / CLI
↓
project.create
```

Both operations must converge on the same underlying capability.

The difference between the two consumers may be:

```text
Identity
Permissions
Policy
Approval
Execution Context
```

The difference must not be an artificial limitation such as:

```text
Human can create project.
AI cannot create project.
```

when there is no security or technical reason for that restriction.

---

# 5. No Browser Automation as Internal Control Plane

The Nexo must not require browser automation for an AI or external agent to control Nexo capabilities that already have programmatic implementations.

The following is explicitly not the intended architecture:

```text
AI
↓
Browser
↓
Playwright
↓
Find Button
↓
Click
↓
Wait
↓
Read DOM
↓
Infer Result
```

The intended architecture is:

```text
AI
↓
Authenticated Programmatic Entry Point
↓
Authorization
↓
Nexo Capability
↓
Structured Result
```

Playwright may be used for:

* UI testing;
* end-to-end testing;
* visual regression;
* browser automation;
* interaction with genuinely browser-only external systems.

It must not be the primary internal mechanism for controlling the Nexo itself.

---

# 6. Architectural Layers

The Nexo must maintain these conceptual layers:

```text
1. Experience Layer
2. Entry Point Layer
3. Application Layer
4. Domain Layer
5. Intelligence / Adapter Layer
6. Infrastructure Layer
7. Runtime Layer
8. External Resource Layer
```

The physical implementation does not have to create a separate process for every layer.

A modular monolith is acceptable for the initial product.

Logical boundaries must still exist.

The Swarm must not introduce distributed services merely to make the architecture appear more advanced.

---

# 7. Experience Layer

The Experience Layer is responsible for human interaction.

It may contain:

* project dashboard;
* visual editor;
* code editor;
* inspector;
* component studio;
* media library;
* responsive laboratory;
* Git interface;
* AI interface;
* deployment interface;
* workspace management;
* settings.

The Experience Layer is responsible for:

* displaying information;
* collecting user input;
* navigation;
* interaction;
* visual state;
* approval flows;
* presenting results;
* presenting errors.

The Experience Layer must not directly implement privileged operations against:

* filesystem;
* operating system;
* Git;
* deployment providers;
* secrets;
* AI providers.

It must request those operations through application/domain capabilities.

---

# 8. Entry Point Layer

The Entry Point Layer exposes Nexo capabilities to consumers.

Possible entry points include:

```text
Web UI
HTTP API
Agent API
CLI
SDK
Internal Commands
Jobs
Webhooks
Plugin API
```

Not every internal capability must become publicly accessible.

Every public or machine-facing capability must have:

* contract;
* authentication requirements;
* authorization requirements;
* input schema;
* output schema;
* error model;
* state model;
* versioning policy.

The exact API protocol is defined later in:

```text
06-CONTROL-PLANE-AND-AGENT-API.md
```

---

# 9. Application Layer

The Application Layer coordinates complete use cases.

Examples:

```text
CreateProject
ImportProject
AnalyzeProject
OpenProject
CreateComponent
UpdateComponent
ReplaceAsset
RunBuild
RunTests
CommitProject
RunAITask
DeployProject
RollbackDeployment
```

Application services may:

* load project context;
* validate request;
* check authorization;
* apply policies;
* select required domain capability;
* resolve adapters;
* invoke Runtime capabilities;
* invoke providers;
* create jobs;
* emit events;
* return structured results.

Application services must not contain large amounts of framework-specific implementation logic.

---

# 10. Domain Layer

The Domain Layer contains the actual capabilities of the Nexo.

Initial domain areas:

```text
Project
Project Intelligence
Components
Media
Design
Responsive
Git
Runtime
AI
Integrations
Deployment
Workspace
Security
Storage
Plugins
```

Each domain must possess a clear responsibility.

The exact module breakdown may evolve, but responsibility ownership must remain unambiguous.

---

# 11. Domain Capability Model

The system must expose real domain operations rather than UI actions.

Initial conceptual capabilities include:

```text
project.create
project.import
project.open
project.analyze
project.read
project.write
project.refresh
project.clone
project.export
project.archive
project.remove

component.detect
component.create
component.read
component.update
component.delete
component.promote
component.publish

media.list
media.upload
media.read
media.update
media.replace
media.delete

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

runtime.command
runtime.process
runtime.build
runtime.test
runtime.preview

ai.task
ai.plan
ai.execute
ai.validate

deployment.preflight
deployment.deploy
deployment.verify
deployment.rollback
```

These names are conceptual capability identifiers.

The authoritative request/response schemas are defined in the Control Plane specification.

---

# 12. Capability Ownership

Every capability must have one authoritative implementation.

Examples:

```text
git.commit
→ Git Domain

runtime.build
→ Runtime / Build Domain

component.create
→ Component Domain

deployment.deploy
→ Deployment Domain

project.analyze
→ Project / Project Intelligence Domain
```

The capability must not have separate business logic implementations for:

```text
UI
AI
CLI
Plugin
Automation
```

Those are consumers.

The domain capability is the authority.

---

# 13. Dependency Direction

The preferred dependency direction is:

```text
Experience
    ↓
Entry Point
    ↓
Application
    ↓
Domain
    ↓
Contracts
    ↓
Infrastructure / Adapters / Providers / Runtime
```

The following dependency directions are forbidden:

```text
Runtime → UI
Adapter → UI
Infrastructure → UI
Domain → UI
Provider → UI
```

The Runtime must remain usable without the web application being loaded.

The Domain must remain usable without a browser.

---

# 14. Project Domain

The Project Domain owns the project lifecycle and project identity.

Responsibilities include:

```text
create
import
open
refresh
analyze
clone
export
archive
remove
```

The Project Domain must not contain deep framework-specific implementation details.

It must delegate technology interpretation to:

```text
Project Intelligence
Adapters
Build Adapters
Styling Adapters
Framework Adapters
```

---

# 15. Project Intelligence Domain

Project Intelligence is responsible for understanding an existing project.

The system should detect or infer, when evidence exists:

```text
Language
Framework
Framework Version
Styling System
Package Manager
Dependencies
Routes
Pages
Layouts
Components
Assets
Build System
Development Command
Test Command
Git Repository
Branch
Environment Configuration
```

Detection must distinguish between:

```text
Known
Detected
Inferred
Unknown
Unsupported
Partially Supported
```

Unknown information must never silently become an assumed fact.

---

# 16. Project Model

The Project Model is Nexo's internal representation of the project.

It may contain representations of:

```text
Project
Files
Directories
Routes
Pages
Layouts
Components
Styles
Assets
Dependencies
Scripts
Build
Git
Environment
Integrations
```

The Project Model is derived information.

It is not the Source Project.

The Source Project remains the authoritative representation of actual project files.

---

# 17. Project Graph

The Project Graph represents relationships between project entities.

Examples:

```text
Route
  ↓
Page
  ↓
Component
  ↓
Asset
```

```text
Component
  ↓
Style
  ↓
Design Token
```

```text
Component
  ↓
Dependency
  ↓
Component
```

The graph should be used whenever relationship information is necessary for:

* impact analysis;
* safe editing;
* dependency analysis;
* component operations;
* asset replacement;
* route operations;
* AI context.

---

# 18. Source Project

The Source Project is the actual project being administered.

It contains the real:

* source code;
* assets;
* configuration;
* dependencies;
* Git repository;
* project structure.

The Source Project is the primary source of truth for the project itself.

Nexo metadata must never be treated as a replacement for the Source Project.

---

# 19. Nexo-Owned Metadata

The Nexo may maintain data required for operating the platform.

Examples:

```text
Project Registration
Workspace Association
Detected Stack
Adapter State
Component Registry
Media Registry
Cache
Audit
Snapshots
User Preferences
Project Metadata
```

This data belongs to the Nexo.

It must not silently overwrite newer source-project state.

---

# 20. Stale State

All derived project representations may become stale.

Examples:

```text
Project Model
Project Graph
Component Index
Asset Index
Git Cache
Route Index
Build Information
```

The system must support:

```text
Detection
Invalidation
Refresh
Re-scan
Reconciliation
```

Complex or destructive operations must not proceed using context known to be stale.

---

# 21. External Project Modification

The Nexo must assume that projects can be modified outside the application.

Examples:

```text
VS Code
Other IDE
Terminal
Git CLI
Scripts
Another AI
External Automation
```

External modification is valid.

When external changes are detected:

```text
Detect
↓
Identify affected state
↓
Invalidate stale representations
↓
Refresh / Re-scan
↓
Reconcile
```

The Nexo must never silently overwrite external modifications.

---

# 22. Adapter Layer

Adapters encapsulate technology-specific project knowledge.

Adapters prevent framework and tooling assumptions from spreading through the Core.

Initial framework targets may include:

```text
Next.js
React
Vue
Nuxt
Svelte
SvelteKit
Astro
Vite
HTML/CSS/JavaScript
```

Initial styling targets may include:

```text
Tailwind
CSS Modules
styled-components
CSS Variables
Plain CSS
```

These are initial targets, not a permanent support ceiling.

---

# 23. Adapter Responsibilities

An Adapter may define how to:

* detect a technology;
* inspect project structure;
* locate components;
* locate routes;
* locate styles;
* create components;
* modify components;
* create pages;
* modify pages;
* resolve styling;
* execute or identify builds;
* validate compatibility.

The Adapter must not define global Nexo authorization rules.

The Adapter must not determine Workspace ownership.

The Adapter must not bypass Runtime security.

---

# 24. Runtime Layer

Runtime provides controlled access to the environment where the project operates.

Capabilities include:

```text
Filesystem
Process Management
Terminal
Command Execution
Development Server
Build
Tests
Preview
Environment Inspection
```

Runtime operations must produce structured results.

A command result should be able to contain:

```text
Command
Arguments
Exit Code
Stdout
Stderr
Status
Started At
Finished At
Process Identifier when applicable
Cancellation State
```

---

# 25. Runtime Does Not Decide Product Intent

Runtime answers:

> How can the requested operation be executed?

It does not answer:

> Should the Nexo perform this operation?

Example:

```text
Application:
"Execute the detected build."

Runtime:
"Execute the configured build process and return the result."
```

Authorization, policy and domain logic must determine whether execution is allowed.

---

# 26. Provider Layer

External systems must be represented through explicit provider contracts.

Provider categories may include:

```text
AI Provider
Deployment Provider
Git Remote Provider
Authentication Provider
Storage Provider
```

Providers must implement Nexo contracts.

They must not redefine the Nexo domain.

Changing a provider should not require rewriting the Domain Layer.

---

# 27. AI Architecture Boundary

AI must be divided into separate concerns:

```text
AI Provider
AI Engine
AI Context
AI Tools
AI Tasks
AI Execution
AI Validation
```

The AI Provider supplies model capability.

The AI Engine coordinates reasoning and task execution.

AI Tools expose authorized Nexo capabilities.

The AI must never be treated as an authority greater than the security model.

---

# 28. AI Tool Principle

AI Tools must represent actual Nexo capabilities.

Correct:

```text
project.read
project.write
component.create
component.update
git.commit
runtime.build
runtime.test
deployment.deploy
```

Incorrect:

```text
clickSaveButton
openSidebar
selectMenu
readScreenText
clickDeploy
```

The incorrect model couples AI to the UI.

The correct model gives AI access to the Nexo domain.

---

# 29. Human / AI Capability Equivalence

If a human can perform:

```text
Create Project
Edit File
Create Component
Upload Media
Run Build
Run Tests
Commit
Push
Deploy
Rollback
```

and the capability is technically suitable for programmatic operation, an authorized AI must also be able to perform the operation programmatically.

Example:

```text
Human
↓
UI
↓
project.create
```

```text
AI
↓
Agent API / Tool
↓
project.create
```

The implementation of `project.create` must remain the same domain capability.

---

# 30. Machine Identity

The architecture must support non-human identities.

Examples:

```text
AI Agent
Automation Job
Plugin
Service Account
CLI Session
Internal Service
```

Each machine identity must have:

* unique identity;
* authentication;
* authorization;
* permissions;
* audit context;
* scope.

AI must not need to impersonate a human through browser automation.

---

# 31. Authorization Boundary

Every privileged operation must follow:

```text
Actor Identity
↓
Authentication
↓
Authorization
↓
Policy
↓
Capability
↓
Execution
↓
Audit
```

Examples of privileged operations:

* filesystem mutation;
* command execution;
* process management;
* Git mutation;
* secret access;
* component publication;
* deployment;
* rollback;
* autonomous AI execution;
* plugin installation.

A hidden or disabled UI button is never considered sufficient security.

---

# 32. API Architecture

The API is a programmatic interface to Nexo capabilities.

The API must expose domain operations rather than UI interactions.

Correct:

```text
project.create
component.update
git.commit
runtime.build
deployment.deploy
```

Incorrect:

```text
button.click
panel.open
tree.select
screen.read
```

The API must use structured input and output.

The final protocol may be HTTP/REST, RPC, GraphQL or another justified mechanism.

The protocol must be selected only after evaluating the actual product requirements and current ecosystem support.

---

# 33. CLI Architecture

The CLI is a first-class consumer of Nexo capabilities.

Examples:

```text
nexo project analyze
nexo project create
nexo git status
nexo git commit
nexo build
nexo deploy
```

CLI commands must call the same underlying services available to the API and UI.

The CLI must not contain a separate implementation of project manipulation.

---

# 34. Plugin Boundary

Plugins extend the Nexo through contracts.

Plugins must not access arbitrary private internals.

A plugin must declare or request required capabilities.

Plugin access must be:

```text
Authenticated
Authorized
Scoped
Auditable
```

Plugin failure must not automatically compromise the Core.

---

# 35. Workspace Boundary

Workspace is the organizational boundary for:

* users;
* roles;
* permissions;
* projects;
* shared components;
* shared media;
* providers;
* integrations;
* policies.

A Workspace may contain multiple Projects.

A Project belongs to a Workspace context but remains a distinct entity.

---

# 36. Storage Boundary

Nexo Storage contains data owned by the Nexo platform.

Examples:

```text
Users
Memberships
Workspace Data
Project Metadata
Component Registry
Media Registry
Audit
Snapshots
Configuration
```

Storage must not become a hidden replacement for Source Project files.

The storage implementation itself is defined in:

```text
14-WORKSPACE-AND-STORAGE.md
```

---

# 37. Event Architecture

The system may use events for:

* asynchronous processing;
* audit;
* notifications;
* integrations;
* state propagation.

Examples:

```text
project.created
project.updated
component.created
component.updated
git.committed
build.completed
deployment.completed
ai.task.completed
```

Events must have explicit contracts.

Events must not be used to conceal a mandatory synchronous dependency.

---

# 38. Job Architecture

Long-running tasks should use a Job abstraction.

Examples:

```text
Project Analysis
Build
AI Task
Deployment
Large Asset Processing
```

A Job must have, at minimum:

```text
ID
Type
Owner
Context
Status
Result
Error
Started At
Completed At
```

Jobs must be observable by both UI and programmatic consumers where appropriate.

---

# 39. Error Architecture

Errors must be structured and machine-readable.

Conceptual categories include:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
UnsupportedError
AdapterError
RuntimeError
ProviderError
BuildError
GitError
DeploymentError
```

Errors must preserve enough information to allow diagnosis without leaking secrets or internal sensitive data.

---

# 40. Partial Failure

Multi-step operations must explicitly represent partial completion.

Example:

```text
Operation:
Update Component

Files attempted:
5

Succeeded:
3

Failed:
2
```

The system must not report:

```text
success: true
```

when only part of the operation succeeded.

The subsystem responsible for the operation must define its recovery strategy.

---

# 41. Atomicity

The architecture must not assume filesystem, Git, deployment and external provider operations are automatically transactional.

For multi-resource changes, the responsible subsystem must define an appropriate strategy:

```text
Atomic operation
Staged operation
Rollback
Snapshot
Recovery
Explicit partial state
```

The system must never falsely claim atomic completion.

---

# 42. Concurrency

The architecture must assume multiple actors can change a project.

Possible actors include:

```text
Human
AI
CLI
External IDE
Git
Automation
Plugin
```

The system must detect or prevent destructive races when possible.

An operation must not blindly overwrite a newer source state.

---

# 43. Idempotency

Operations that can reasonably be retried should be idempotent.

Important candidates:

* project creation;
* import;
* publish;
* deployment;
* webhook processing;
* job submission.

When an operation is intentionally non-idempotent, its contract must state that explicitly.

---

# 44. Configuration Boundary

Configuration must possess an explicit scope.

Possible scopes:

```text
Platform
Workspace
Project
Environment
Provider
User
```

When multiple scopes can affect the same value, precedence must be explicitly documented before implementation.

Agents must not invent precedence rules locally.

---

# 45. Secrets Boundary

Secrets must be isolated from ordinary metadata.

Secrets must not appear in:

* logs;
* diffs;
* normal AI context;
* error messages;
* normal audit records;
* source previews.

A consumer may be allowed to use a secret without being allowed to read its raw value.

---

# 46. Network Boundary

Network access may exist in:

* Runtime;
* AI providers;
* plugins;
* integrations;
* deployment providers.

Network access must be controlled according to Security Policy.

The architecture must not assume that every component has unrestricted Internet access.

---

# 47. Performance Boundaries

The system must support projects substantially larger than trivial demonstration projects.

The architecture should favor:

```text
Lazy Loading
Incremental Scanning
Incremental Indexing
Targeted Project Analysis
Caching
Virtualized UI
```

when measurements justify them.

Do not introduce complexity solely because it may improve performance in theory.

---

# 48. Extensibility

New technologies should normally be introduced through Adapters.

New external services should normally be introduced through Providers or Integrations.

Optional new capabilities should normally be introduced through Plugins or modular extensions.

The Core must not grow every time a new framework or external service is added.

---

# 49. No Premature Microservices

The initial Nexo implementation should prefer a modular architecture with strong internal boundaries.

Separate processes or services should only be introduced when justified by:

* security isolation;
* runtime isolation;
* scalability;
* reliability;
* deployment constraints;
* provider constraints.

Do not create microservices simply because the product contains many domains.

---

# 50. Recommended Initial Module Structure

The exact implementation depends on the chosen technology stack, but the architecture should support a structure similar to:

```text
nexo-cms/
├── apps/
│   ├── cms/
│   └── runtime/
│
├── packages/
│   ├── core/
│   ├── project/
│   ├── intelligence/
│   ├── adapters/
│   ├── runtime/
│   ├── components/
│   ├── media/
│   ├── design/
│   ├── responsive/
│   ├── git/
│   ├── ai/
│   ├── integrations/
│   ├── deployment/
│   ├── security/
│   ├── control-plane/
│   ├── workspace/
│   └── shared/
│
├── adapters/
├── tests/
└── docs/
```

This is a structural proposal, not permission to choose a specific framework or monorepo tool without evaluating the actual implementation requirements.

---

# 51. Technology Selection Rule

This document does not authorize an agent to select implementation technologies arbitrarily.

Before selecting a foundational technology, the implementing agent must:

1. inspect the requirements;
2. inspect architectural constraints;
3. identify viable options;
4. verify current official documentation;
5. verify compatibility with the chosen environment;
6. evaluate maintenance and security implications;
7. document the decision;
8. implement only after the decision is consistent with the architecture.

---

# 52. External Research Requirement

When an implementation depends on current behavior of an external technology, agents must research before coding.

Examples:

* Node.js APIs;
* browser APIs;
* GitHub API;
* Vercel API;
* Hostinger interfaces;
* framework APIs;
* package managers;
* authentication systems;
* AI APIs;
* process sandboxing;
* filesystem security;
* deployment protocols.

Preferred source order:

```text
1. Official Documentation
2. Official Specification
3. Official Repository
4. Primary Technical Source
5. Secondary Source only when necessary
```

Agents must not invent:

* API endpoints;
* method names;
* parameters;
* CLI commands;
* configuration fields;
* version behavior;
* provider capabilities.

---

# 53. Version Awareness

External technologies must be treated as versioned dependencies.

When relevant, implementation must verify:

```text
Installed Version
Supported Version
Documentation Version
Compatibility Constraints
```

An agent must not assume current behavior from an outdated knowledge base when the real installed version can be inspected.

---

# 54. Architecture Validation

Before declaring the architecture implemented, verify:

```text
UI does not own domain logic.

API does not duplicate domain logic.

CLI does not duplicate domain logic.

AI does not bypass authorization.

Runtime does not own product rules.

Adapters contain technology-specific knowledge.

Source Project remains authoritative.

Providers remain replaceable.

Plugins remain isolated.

Long-running operations are observable.

Errors are structured.

External modifications are detectable.

Programmatic entry points exist for supported capabilities.

Security is enforced outside the UI.

```

---

# 55. Required Architectural Properties

The implementation must satisfy all of the following:

### Property A — Domain Independence

The Domain must remain usable without the browser UI.

### Property B — Programmatic Control

Supported human capabilities must have programmatic equivalents where technically appropriate.

### Property C — AI Control

Authorized AI agents must be able to operate the Nexo programmatically.

### Property D — Adapter Isolation

Framework-specific knowledge must remain isolated from the Core.

### Property E — Runtime Isolation

Operating-system operations must remain behind Runtime boundaries.

### Property F — Project Integrity

The Source Project remains the real project.

### Property G — Security Enforcement

Authorization must happen at execution boundaries, not only in UI.

### Property H — Provider Independence

The Core must not depend permanently on a single vendor.

### Property I — Failure Visibility

Partial and failed operations must remain visible.

### Property J — External Change Safety

External modifications must not be overwritten silently.

---

# 56. Architectural Anti-Patterns

The following patterns are explicitly forbidden unless a future architectural decision changes this specification.

## 56.1 UI-Owned Business Logic

```text
Button Handler
↓
Direct Filesystem Write
```

Forbidden.

---

## 56.2 AI-Owned Business Logic

```text
AI Tool
↓
Direct arbitrary filesystem manipulation
```

Forbidden when a corresponding authorized Domain capability exists.

---

## 56.3 CLI-Owned Business Logic

```text
CLI Command
↓
Private implementation
```

Forbidden when the operation already exists as a Domain capability.

---

## 56.4 Browser-Controlled Nexo

```text
AI
↓
Playwright
↓
Nexo UI
```

Forbidden as the primary internal control mechanism.

---

## 56.5 Framework Leakage

```text
Core
↓
if project is Next.js
...
if project is Vue
...
if project is Svelte
...
```

Framework-specific branching must be moved into Adapter boundaries when technically appropriate.

---

## 56.6 Runtime Leakage

```text
Domain
↓
Direct OS Process API
```

Forbidden.

---

## 56.7 Provider Leakage

```text
Domain
↓
Direct OpenAI API
```

or:

```text
Domain
↓
Direct Vercel API
```

without a provider boundary is forbidden.

---

## 56.8 Metadata as Source of Truth

```text
Nexo Metadata
≠
Source Project
```

Nexo metadata must not silently override the source project.

---

## 56.9 Hidden Global State

Critical project state must not depend on undocumented process-global mutable state.

---

## 56.10 Giant Core Service

Do not create one universal service responsible for:

```text
Project
Git
AI
Media
Components
Deployment
Security
```

Responsibilities must remain separated.

---

# 57. Testing Requirements at Architecture Level

Each boundary must be testable independently.

At minimum:

```text
Project Tests
Project Intelligence Tests
Adapter Tests
Runtime Tests
Domain Tests
API Tests
Agent Entry Point Tests
Git Tests
Component Tests
AI Tool Tests
Security Tests
Deployment Tests
Integration Tests
```

The later Testing specification defines the detailed strategy.

---

# 58. Contract Testing

Contracts between major subsystems must be testable.

Especially:

```text
Application ↔ Domain
Domain ↔ Adapter
Domain ↔ Runtime
AI ↔ AI Tools
API ↔ Application
Plugin ↔ Core
Deployment ↔ Provider
Git ↔ Remote Provider
```

A provider or adapter that violates its contract must fail validation.

---

# 59. Fixture Projects

The architecture must support fixture projects for adapter and Project Intelligence validation.

Fixture projects should represent real structures rather than artificial single-file examples whenever possible.

Fixtures should test:

```text
Detection
Analysis
Editing
Creation
Build
Validation
```

The adapter specification defines the exact fixture requirements.

---

# 60. Observability Context

Relevant operations should carry structured context where applicable:

```text
Workspace ID
Project ID
Actor ID
Agent ID
Operation ID
Job ID
Provider
Environment
Git Branch
Result
Timestamp
```

This context enables debugging and audit.

---

# 61. Operation Identity

Important operations should have unique identifiers.

Example:

```text
Operation ID
Job ID
AI Task ID
Deployment ID
```

This allows UI, API, logs and agents to refer to the same operation without relying on ambiguous human-readable messages.

---

# 62. Structured Results

Domain operations must return structured results.

Do not use arbitrary text as the primary communication format between internal services.

A result should distinguish:

```text
Success
Failure
Partial
Blocked
Pending
```

and provide structured data where appropriate.

---

# 63. Structured Errors for AI

Because AI agents are first-class consumers, errors must be machine-readable.

An AI should be able to determine:

```text
What failed?
Why?
Was the project modified?
Can I retry?
Do I need approval?
Do I need another capability?
Is the operation unsupported?
Is context stale?
```

without interpreting a screenshot or UI message.

---

# 64. Recovery Architecture

Operations that can cause project changes must have a documented recovery path.

Possible mechanisms:

```text
Git
Diff
Snapshots
Staged Changes
Rollback
Reconciliation
Manual Recovery
```

The appropriate mechanism depends on the subsystem.

---

# 65. Architecture and Future SaaS

The system may later become a commercial SaaS.

The current architecture must therefore avoid assumptions such as:

```text
one user
one workspace
one project
one provider
one machine
```

However, SaaS infrastructure must not be prematurely implemented if it is not required by the initial product.

The architecture must be extensible rather than prematurely distributed.

---

# 66. Architecture and Local-First Operation

The Nexo must be capable of operating against a local filesystem when the Runtime is local.

The same logical architecture must also support a remote Runtime when the Nexo is deployed to a VPS or another environment.

Conceptually:

```text
Local Nexo
↓
Local Runtime
↓
Local Project
```

and:

```text
Remote Nexo
↓
Remote Runtime
↓
Remote Project
```

The Domain should not need to know whether the Runtime is local or remote.

---

# 67. Architecture and Web Application Model

The Nexo may expose its interface through a browser and run its server locally.

The browser is an interface layer.

It is not a security boundary by itself and must not be assumed to have direct operating-system authority.

Filesystem, process and command operations belong to the Runtime environment.

---

# 68. Localhost Is Not Automatically Trusted

Running the Nexo on localhost does not automatically justify unrestricted access.

Authentication and authorization rules must still be defined appropriately for the actual threat model.

When the same application is deployed to a VPS or network environment, the security boundary becomes even more important.

---

# 69. Architecture Change Rule

Any implementation decision that changes one of the following must be treated as an architectural change:

```text
Layer boundaries
Domain ownership
Runtime boundary
Adapter boundary
Provider boundary
Security boundary
Programmatic Control Plane
Source of Truth
Persistence model
Process isolation
```

Such changes must not be introduced silently.

---

# 70. Research and Evidence Rule for Agents

When the agent encounters missing technical information:

1. Read the relevant local Nexo specification.
2. Read related contracts.
3. Read Core Invariants.
4. Inspect the actual implementation state.
5. Inspect the installed dependency/version when applicable.
6. Consult the official external documentation.
7. Compare the result against architectural requirements.
8. Only then implement.

The agent must not convert an information gap into an invented implementation.

---

# 71. Implementation Rule for K3 Swarm

The K3 Agent Swarm must use this document as the system-level architectural boundary.

Before implementing any subsystem, the agent must answer:

```text
Which architectural layer owns this?

Which domain owns this capability?

Which contract is used?

Which adapter is responsible for technology-specific behavior?

Which Runtime capability executes the operation?

Which identity performs it?

Which permission is required?

Which entry point exposes it?

How is the result represented?

How is failure represented?

How is the operation validated?

How is it audited?
```

If those questions cannot be answered from the documentation and existing contracts, the agent must inspect the relevant technical document or conduct the required external research.

It must not invent a new architecture locally.

---

# 72. Acceptance Criteria

The system architecture is considered correctly implemented only when all of the following are true:

1. The UI is not the source of domain logic.
2. The API does not contain a separate implementation of domain behavior.
3. The CLI does not contain a separate implementation of domain behavior.
4. AI agents can operate authorized capabilities programmatically.
5. Playwright is not required for internal Nexo control where programmatic capabilities exist.
6. Runtime operations are isolated behind Runtime boundaries.
7. Framework-specific logic is isolated through Adapters.
8. External vendors are accessed through Provider boundaries where appropriate.
9. Source Project remains authoritative for project source.
10. Git operations interact with real Git.
11. Authorization is enforced at execution boundaries.
12. Secrets are not exposed through normal logs or AI context.
13. Long-running operations are represented as Jobs where appropriate.
14. Partial failures are represented explicitly.
15. External project changes can invalidate stale context.
16. Multiple consumers can use the same underlying capabilities.
17. The architecture can support future adapters without rewriting the Core.
18. The architecture can support future AI providers without rewriting the Core.
19. The architecture can support local and remote Runtime environments.
20. The initial implementation does not require premature microservices.

---

# 73. Final Architectural Rule

The Nexo CMS must be a platform of real capabilities, not a browser application with scattered automation attached to it.

The desired architecture is:

```text
                    NEXO DOMAIN
                         │
          ┌──────────────┼──────────────┐
          │              │              │
         UI             API            CLI
          │              │              │
          └──────────────┼──────────────┘
                         │
                     AI / AGENTS
                         │
                      JOBS
                         │
                         ▼
                 APPLICATION LAYER
                         │
                         ▼
                    DOMAIN LAYER
                         │
              ┌──────────┼──────────┐
              │          │          │
           ADAPTERS    PROVIDERS   RUNTIME
              │          │          │
              └──────────┼──────────┘
                         │
                         ▼
                 REAL PROJECT / SERVICE
```

The defining property of the Nexo architecture is:

> **One domain capability, many authorized consumers.**

A human, Kimi Code, Codex, Luna, a local AI, a CLI or another automation system should not need a different version of the Nexo.

They should use different entry points into the same system.

The Nexo is therefore not fundamentally a website editor.

It is a **programmable engineering platform for understanding, editing, validating, versioning and deploying real web projects.**

```
```
