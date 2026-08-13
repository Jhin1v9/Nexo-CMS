````md
# NEXO CMS — SWARM EXECUTION SPECIFICATION

## 1. Document Status

**Document:** `15-SWARM-EXECUTION-SPEC.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification / Agent Execution Contract  
**Audience:** K3 Agent Swarm, Kimi Code, Codex, Luna, Nexo Digital Engineering Team  
**Status:** Engineering Specification  
**Authority:** Defines how the Agent Swarm must read, reason about, plan, implement, validate and assemble the Nexo CMS.

This is the final implementation-control document.

The Swarm must not interpret the previous documents as optional suggestions.

They collectively define the implementation contract.

---

# 2. Objective

The purpose of the K3 Swarm is to build the Nexo CMS from the supplied specifications while minimizing:

- hallucinated requirements;
- invented APIs;
- framework assumptions;
- duplicated logic;
- architectural drift;
- incomplete features;
- fake functionality;
- disconnected UI features;
- undocumented shortcuts.

The Swarm must operate as an engineering team rather than as a single agent improvising the entire system.

---

# 3. Authoritative Documentation Set

The implementation documentation consists of the Nexo foundation documents and the technical specifications.

Technical implementation documents:

```text
01-SYSTEM-ARCHITECTURE.md
02-PROJECT-INTELLIGENCE.md
03-ADAPTER-SYSTEM.md
04-RUNTIME-AND-SECURITY.md
05-NEXO-ENGINE.md
06-CONTROL-PLANE-AND-AGENT-API.md
07-EDITOR.md
08-COMPONENT-AND-MEDIA-ENGINE.md
09-DESIGN-AND-RESPONSIVE-LAB.md
10-GIT-AND-VERSIONING.md
11-AI-ENGINE-AND-LUNA.md
12-INTEGRATIONS-AND-DEPLOYMENT.md
13-TESTING-AND-VALIDATION.md
14-WORKSPACE-AND-STORAGE.md
15-SWARM-EXECUTION-SPEC.md
````

The previously created Human Manifest and product foundation documents remain authoritative for product intent.

---

# 4. Document Hierarchy

When interpreting requirements, use this hierarchy:

```text
1. Explicit user/project constraints
2. Core Invariants
3. System Architecture
4. Relevant Technical Specification
5. Contracts and schemas
6. Verified external documentation
7. Existing implementation
8. Agent assumptions
```

The lower the source is in this hierarchy, the weaker its authority.

An agent assumption must never override an explicit requirement.

---

# 5. No Invented Requirements

The Swarm must never implement functionality merely because:

```text
"It would probably be useful."
"It is common in other CMS products."
"The framework usually works this way."
"The agent thinks the user meant this."
```

A requirement must come from:

* the supplied specifications;
* explicit user instruction;
* a necessary implementation consequence of an explicit requirement;
* verified external technology behavior.

Anything else must be treated as a proposal, not an implemented requirement.

---

# 6. No Hallucinated Technology Behavior

When implementation depends on a technology whose behavior is not completely known, the agent must research it.

Required sequence:

```text
Identify Technology
↓
Identify Version
↓
Inspect Existing Project
↓
Consult Official Documentation
↓
Consult Official API / Specification
↓
Inspect Official Repository when necessary
↓
Create / Update Fixture
↓
Implement
↓
Test
```

Never invent:

* framework conventions;
* API endpoints;
* configuration names;
* package APIs;
* CLI commands;
* provider behavior;
* deployment mechanisms.

---

# 7. Internet Research Rule

The Swarm has permission and responsibility to use the Internet when implementation depends on external technology.

Preferred sources:

```text
Official Documentation
↓
Official API Reference
↓
Official Specification
↓
Official Repository
↓
Primary Technical Source
```

Search results or secondary articles may be used for orientation but must not be treated as the final authority when official documentation is available.

---

# 8. Version Verification

Before implementing version-sensitive behavior:

```text
Inspect Installed Version
↓
Inspect Declared Version
↓
Inspect Lockfile
↓
Verify Relevant Official Documentation
```

If the values differ:

```text
Declared Version
≠
Resolved Version
≠
Installed Version
```

the agent must understand which version actually controls runtime behavior.

---

# 9. Existing Repository First

Before creating code, the Swarm must inspect the actual repository.

It must determine:

```text
Repository Structure
Package Manager
Runtime
Framework
Existing Dependencies
Existing Configuration
Existing Scripts
Existing Tests
Existing Source
```

Do not create a new architecture over an existing implementation without understanding what is already there.

---

# 10. Preserve Existing Work

Existing project code must be treated as valuable.

The Swarm must not rewrite large areas merely because:

* another architecture looks cleaner;
* the agent prefers another framework;
* a new dependency is easier;
* a component could be implemented differently.

Before replacing existing code, determine:

```text
Why it exists
What depends on it
Whether the requirement actually requires replacement
Whether a smaller change is possible
```

---

# 11. Build the Foundation Before Features

The implementation should proceed from infrastructure toward features.

Recommended order:

```text
1. Repository / Tooling Foundation
2. Runtime
3. Storage
4. Security
5. Core Domain / Engine
6. Project Intelligence
7. Adapter System
8. Control Plane
9. Git
10. Editor
11. Components / Media
12. Design / Responsive
13. AI
14. Integrations / Deployment
15. Full Validation
```

The exact sequence may change when a technical dependency requires it.

---

# 12. Dependency Rule

A feature must not be implemented before its required foundation exists.

Example:

```text
Editor
requires:
Project Intelligence
Engine
Adapters
Runtime
```

Therefore the Swarm must not implement the full Editor before those dependencies are sufficiently functional.

---

# 13. Vertical Slice Strategy

After foundational contracts exist, the Swarm should validate them through vertical slices.

A good vertical slice may be:

```text
Import Project
↓
Detect Stack
↓
Resolve Adapter
↓
Read Project
↓
Display in UI
↓
Modify a supported property
↓
Save
↓
Re-analyze
↓
Build
```

This is preferable to implementing hundreds of disconnected UI screens before proving the underlying system works.

---

# 14. First Working Slice

The first functional milestone should prove:

```text
Select Project Folder
↓
Runtime Access
↓
Project Scan
↓
Stack Detection
↓
Project Model
↓
Project Open
↓
UI Display
```

This proves the core project-management architecture before advanced editing begins.

---

# 15. Second Working Slice

The second milestone should prove:

```text
Select Project
↓
Detect Adapter
↓
Read Component
↓
Visual / Code Representation
↓
Modify
↓
Write Source
↓
Re-analyze
↓
Build
```

This proves the fundamental “understand → edit → validate” loop.

---

# 16. Third Working Slice

The third milestone should prove machine control:

```text
Authenticate Agent
↓
Discover Capabilities
↓
Read Project
↓
Modify
↓
Build
↓
Test
↓
Git Status
```

No UI automation must be necessary.

---

# 17. Fourth Working Slice

The fourth milestone should prove AI engineering:

```text
AI Task
↓
Project Context
↓
Plan
↓
Tool Call
↓
Source Modification
↓
Validation
↓
Diff
↓
Result
```

---

# 18. Fifth Working Slice

The fifth milestone should prove deployment:

```text
Project
↓
Preflight
↓
Build
↓
Deploy
↓
Verify
↓
Deployment Record
```

---

# 19. Agent Roles

The Swarm should divide work according to architectural responsibilities.

Possible roles include:

```text
Architecture Agent
Runtime Agent
Storage Agent
Security Agent
Project Intelligence Agent
Adapter Agent
Engine Agent
Control Plane Agent
Editor Agent
Component Agent
Media Agent
Design Agent
Responsive Agent
Git Agent
AI Agent
Integration Agent
Deployment Agent
Testing Agent
Reviewer Agent
```

The exact number of agents may vary.

The critical requirement is that responsibilities remain aligned with the architecture.

---

# 20. Agent Ownership

Every implementation task must have:

```text
Owner
Dependencies
Inputs
Expected Outputs
Validation
Acceptance Criteria
```

No task should exist without an owner.

---

# 21. Parallel Work

Tasks may run in parallel only when they do not depend on unfinished contracts.

Safe example:

```text
Adapter Fixture Creation
+
UI Design System
+
Test Infrastructure
```

while foundational contracts are stable.

Unsafe example:

```text
Control Plane implementation
+
Changing Engine Capability Contracts
```

at the same time without coordination.

---

# 22. Shared Contract Rule

When multiple agents depend on the same contract:

```text
Contract
↓
Freeze
↓
Consumers Implement
```

Do not allow five agents to independently invent the same contract.

---

# 23. Contract Changes

If an agent discovers that a contract is insufficient:

1. Stop depending on undocumented behavior.
2. Identify the problem.
3. Propose the smallest necessary contract change.
4. Check affected specifications.
5. Update the authoritative contract.
6. Notify dependent work.
7. Revalidate consumers.

Do not silently fork a private version of the contract.

---

# 24. Architecture Review Gate

A reviewer must inspect changes that affect:

```text
Domain Boundaries
Security
Runtime
Adapters
Control Plane
Public API
AI Permissions
Storage Schema
Deployment
Provider Contracts
```

These areas are too important for isolated local decisions.

---

# 25. Coding Standard

Implementation must favor:

```text
Clarity
Explicit Contracts
Strong Types
Small Modules
Deterministic Behavior
Testability
Error Handling
Observability
```

Avoid unnecessary cleverness.

---

# 26. No Giant Modules

Avoid files/modules that become responsible for unrelated domains.

Do not create:

```text
NexoService
ProjectManager
UniversalHandler
AIManager
CMSManager
```

containing large portions of the product.

Responsibility must remain aligned with domain boundaries.

---

# 27. No Giant Components

The UI must also preserve modularity.

A component should not simultaneously own:

```text
Data Loading
Git
Runtime
AI
Project Mutation
Authorization
Rendering
```

Use appropriate application/domain boundaries.

---

# 28. Type Safety

Where the selected implementation language supports strong typing, public contracts must use explicit types.

Avoid broad escape hatches such as:

```text
any
unknown everywhere
untyped JSON
stringly-typed state
```

unless technically necessary.

When untyped external data enters the system, validate it at the boundary.

---

# 29. Input Validation

Every external input must be validated at its boundary.

Potential sources:

```text
HTTP
CLI
AI
Plugin
User Input
Filesystem
Provider
Webhook
```

Do not assume upstream consumers are correct.

---

# 30. Output Validation

External responses must also be validated.

Examples:

```text
AI Provider
Git Provider
Deployment Provider
Filesystem Metadata
Browser Runtime
```

Do not trust third-party response structure blindly.

---

# 31. Error Handling

Errors must be:

```text
Caught
Classified
Contextualized
Logged Safely
Returned Structurally
```

Never swallow an error merely to keep the UI running.

If recovery is possible, expose it.

---

# 32. No Silent Fallback

The Swarm must not silently fall back from:

```text
Unsupported
```

to:

```text
Guess
```

Example:

```text
Framework Adapter unavailable
```

must not silently become:

```text
Generic source rewrite
```

when that could corrupt the project.

---

# 33. Safe Unknown State

When the system cannot establish something reliably:

```text
UNKNOWN
```

is an acceptable and often correct state.

The platform must prefer uncertainty over fabricated confidence.

---

# 34. Logging

Logs should answer:

```text
What happened?
Where?
Why?
Who?
Which operation?
Which project?
Which job?
What was the result?
```

Logs must not contain secrets.

---

# 35. Structured Logging

Where practical, logs should be structured rather than plain free-form strings.

Context should include:

```text
operationId
jobId
projectId
workspaceId
actorId
agentId
```

where applicable.

---

# 36. Audit vs Logs

Do not use normal debug logs as the authoritative audit trail.

Security-relevant operations must produce explicit audit records.

---

# 37. Testing Before Feature Completion

A feature must not be marked complete merely because:

```text
Code Compiles
```

Minimum completion standard:

```text
Implementation
+
Relevant Tests
+
Error Handling
+
Authorization
+
Realistic Validation
```

---

# 38. Real Project Validation

Whenever a feature modifies project source, test it against a realistic fixture.

Example:

```text
Create Component
↓
Inspect Source
↓
Run Build
↓
Inspect Git Diff
```

This is mandatory for important project-editing features.

---

# 39. Fixture Requirement

When implementing a new adapter or framework-sensitive feature:

```text
Fixture
↓
Test
↓
Implementation
↓
Test Again
```

Do not implement framework behavior solely from memory.

---

# 40. Source Integrity Gate

After a mutation, verify:

```text
Expected Files Changed
No Unexpected Files
Source Parseable
Project Structure Valid
Git Diff Correct
```

A feature that changes unrelated files must be investigated before acceptance.

---

# 41. Build Gate

A source-editing feature must run the appropriate project build when required.

A failed build must be visible.

Do not mark the feature successful merely because the file write succeeded.

---

# 42. Git Gate

After project mutations:

```text
Git Status
Git Diff
```

should be inspected during validation.

This identifies unintended changes.

---

# 43. External Change Gate

Testing must include changes made outside Nexo.

The system must not silently overwrite external source modifications.

---

# 44. AI Gate

Any AI-powered mutation feature must have a deterministic non-AI test path proving:

```text
Authorization
Tool Security
Source Mutation
Validation
Rollback / Failure Handling
```

The LLM must not be the only thing verifying its own behavior.

---

# 45. Agent Gate

Any machine-facing capability must be testable without the browser.

Example:

```text
API / Agent Tool
↓
Capability
↓
Result
```

No Playwright.

---

# 46. Security Gate

Before release, verify:

```text
No Unauthorized Filesystem Access
No Unauthorized Command Execution
No Cross-Workspace Access
No Secret Leakage
No AI Permission Bypass
No Plugin Permission Bypass
No Production Deployment Bypass
```

---

# 47. Provider Gate

Every external provider used in production must have:

```text
Authentication Test
Success Test
Failure Test
Unknown State Test
Credential Failure Test
```

where applicable.

---

# 48. Deployment Gate

No deployment provider is production-ready until the system can distinguish:

```text
Deployment Submitted
Deployment Running
Deployment Succeeded
Deployment Failed
Deployment Unknown
```

---

# 49. Completion Gate

A feature is ready for integration only when:

```text
Implementation
↓
Tests
↓
Review
↓
Fixture Validation
↓
Security Validation
↓
Contract Validation
↓
Integration
```

have passed according to its risk level.

---

# 50. Integration Order

The Swarm should assemble the platform progressively.

Recommended dependency graph:

```text
Runtime
   ↓
Storage
   ↓
Security
   ↓
Nexo Engine
   ↓
Project Intelligence
   ↓
Adapters
   ↓
Control Plane
   ↓
Git
   ↓
Editor
   ↓
Components / Media
   ↓
Design / Responsive
   ↓
AI
   ↓
Integrations
   ↓
Deployment
```

Some modules may be developed in parallel when contracts are already stable.

---

# 51. Do Not Wait for the Entire Product Before Testing

The Swarm must continuously produce working increments.

Preferred:

```text
Build Small
↓
Validate
↓
Integrate
↓
Expand
```

instead of:

```text
Build Everything
↓
Attempt Integration Once
```

---

# 52. Architecture Drift Detection

During implementation, reviewers must watch for:

```text
Framework Logic Entering Core
UI Becoming Business Logic
AI Bypassing Domain
Runtime Bypassing Security
Storage Becoming Source of Truth
Provider Logic Entering Domain
Duplicate Capabilities
```

Architecture drift must be corrected early.

---

# 53. Dependency Drift

Agents must not add dependencies casually.

Before adding a package, verify:

```text
Existing Equivalent
Project Requirement
Security
Maintenance
License
Compatibility
Bundle / Runtime Cost
```

Prefer existing project dependencies when they already solve the problem appropriately.

---

# 54. Technology Selection

The Swarm may research and choose implementation technologies where the specifications intentionally leave them open.

However, choices must consider:

```text
Requirements
Compatibility
Performance
Security
Maintenance
Developer Experience
AI Tooling
Deployment Environment
```

The agent must document significant choices.

---

# 55. Nexo UI Technology

The exact UI framework must be selected based on the actual implementation constraints.

The UI must support the architectural requirements:

```text
Localhost operation
Project interaction
Responsive professional interface
Editor
Code View
Preview
AI Interface
Git Interface
Runtime Status
```

Do not select a technology solely because it is currently fashionable.

---

# 56. Nexo Runtime Technology

The Runtime technology must provide reliable support for:

```text
Filesystem
Processes
Commands
Builds
Preview
Security
Local Deployment
Remote Deployment
```

Official documentation must be consulted before implementation.

---

# 57. Browser Technology

The browser/rendering system must support the actual needs of:

```text
Preview
DOM Inspection
Bounding Boxes
Screenshots
Responsive Testing
Visual Regression
```

The Swarm must verify compatibility with the selected browser automation/runtime version.

---

# 58. Localhost Architecture

The initial product may run as:

```text
Browser
↓
Local Nexo Server
↓
Runtime
↓
Local Project
```

The browser must not receive direct operating-system authority.

---

# 59. Remote Architecture

The same logical system should support:

```text
Browser / Agent
↓
Nexo Server
↓
Remote Runtime
↓
Project
```

The Domain should remain independent of physical Runtime location.

---

# 60. Development Environment

The Swarm must provide a reproducible development environment.

It should define:

```text
Runtime Version
Package Manager
Install Command
Development Command
Build Command
Test Command
Lint / Typecheck
Environment Variables
```

No developer should need undocumented setup steps.

---

# 61. Environment Configuration

Sensitive configuration must be handled through secure environment/secret mechanisms.

Do not commit:

```text
API Keys
Passwords
Private Tokens
Private Keys
Provider Secrets
```

---

# 62. Documentation Synchronization

When implementation changes a contract:

```text
Code
↔
Technical Specification
```

must remain synchronized.

Documentation must not be allowed to drift indefinitely from the actual system.

---

# 63. Decision Records

When the Swarm makes a significant architectural decision not explicitly determined by the specifications, it should create a decision record containing:

```text
Decision
Reason
Alternatives Considered
Evidence
Impact
Affected Documents
```

This prevents undocumented architecture changes.

---

# 64. Research Records

When external research determines an implementation:

```text
Technology
Version
Source
Finding
Decision
```

should be recorded when the finding is important to future maintenance.

---

# 65. No Copying External Documentation Wholesale

The Swarm may research external documentation, but the Nexo documentation should contain only the technical conclusions necessary for implementation.

Do not dump entire external manuals into the repository.

---

# 66. Security Before Convenience

If an implementation choice is between:

```text
Convenient but unsafe
```

and:

```text
Slightly more complex but properly bounded
```

the secure architecture wins.

Do not create bypasses merely to accelerate initial development.

---

# 67. Local-First Does Not Mean Security-Free

Even if the first version runs on:

```text
localhost
```

the system must still maintain:

```text
Identity
Authorization
Scoped Runtime
Secret Protection
Audit
```

The architecture must remain usable when deployed remotely.

---

# 68. Production Readiness

Before production deployment, verify:

```text
Authentication
Authorization
HTTPS
Secret Management
Backup
Logging
Audit
Error Recovery
Resource Limits
Provider Credentials
Runtime Isolation
```

The precise production checklist belongs to deployment documentation, but the architecture must make these possible.

---

# 69. Final Integration Test

The Swarm must eventually execute a complete workflow using a realistic fixture project:

```text
Create / Import Workspace
↓
Select Project
↓
Analyze
↓
Detect Stack
↓
Resolve Adapters
↓
Open Editor
↓
Inspect Component
↓
Modify Component
↓
Modify Design
↓
Run Responsive Diagnostics
↓
Fix Issue
↓
Build
↓
Test
↓
Git Diff
↓
Commit
↓
Push
↓
Deploy Preview
↓
Verify
```

The same logical workflow must be possible through a programmatic agent.

---

# 70. Final Agent Test

A machine-agent acceptance test must demonstrate:

```text
Authenticate Agent
↓
Discover Capabilities
↓
Select Project
↓
Analyze Project
↓
Read Source
↓
Modify Component
↓
Run Build
↓
Run Tests
↓
Inspect Git
↓
Commit
```

The test must not use the browser.

---

# 71. Full AI Engineering Test

An AI agent must eventually demonstrate:

```text
Receive Engineering Task
↓
Inspect Project
↓
Understand Stack
↓
Inspect Relevant Source
↓
Plan
↓
Modify
↓
Build
↓
Test
↓
Diagnose Failure
↓
Repair
↓
Re-test
↓
Produce Diff
↓
Commit when authorized
```

This is the central proof that Nexo is actually an AI engineering platform.

---

# 72. Final Swarm Checklist

Before final assembly, the Swarm must verify:

```text
[ ] Architecture implemented
[ ] Runtime implemented
[ ] Security implemented
[ ] Storage implemented
[ ] Project Intelligence implemented
[ ] Adapters implemented
[ ] Engine implemented
[ ] Control Plane implemented
[ ] Git implemented
[ ] Editor implemented
[ ] Components implemented
[ ] Media implemented
[ ] Design implemented
[ ] Responsive Lab implemented
[ ] AI Engine implemented
[ ] Luna integration implemented
[ ] Integrations implemented
[ ] Deployment implemented
[ ] Tests implemented
[ ] Real fixtures validated
[ ] Agent API validated
[ ] AI workflow validated
[ ] Security validated
[ ] Deployment validated
```

---

# 73. Definition of Complete

The Nexo is **not complete** when:

```text
The interface looks finished.
```

It is complete when:

```text
Architecture
+
Real Capabilities
+
Real Project Modification
+
Adapter Support
+
Runtime
+
Security
+
Programmatic Control
+
AI
+
Git
+
Validation
```

work together as one coherent system.

---

# 74. What the Swarm Must Never Do

The Swarm must never:

```text
Invent missing APIs.

Assume unsupported framework behavior.

Rewrite the whole project unnecessarily.

Replace an existing styling system without instruction.

Use Playwright as the Nexo's internal control plane.

Create UI-only functionality without a corresponding capability when programmatic access is required.

Give AI unrestricted filesystem access.

Give plugins unrestricted runtime access.

Store secrets in normal metadata.

Mark an operation successful because the model said it succeeded.

Mark deployment successful before actual verification.

Delete source projects when merely removing Nexo metadata.

Silently overwrite external changes.

Hide unsupported functionality behind a fake UI control.

Create duplicate business logic for UI, CLI and AI.

Introduce dependencies without technical justification.

Turn unknown behavior into a guess.
```

---

# 75. What the Swarm Should Prefer

The Swarm should prefer:

```text
Existing project conventions
Official APIs
Explicit contracts
Typed interfaces
Small modules
Real validation
Real project fixtures
Structured errors
Programmatic entry points
Adapter boundaries
Runtime boundaries
Security boundaries
Incremental implementation
Reversible changes
Observable operations
```

---

# 76. Agent Reasoning Rule

Before implementing a non-trivial operation, the agent should internally resolve:

```text
What is the requirement?

What subsystem owns it?

What contract already exists?

What source is authoritative?

What adapter is required?

What runtime capability is required?

What permission is required?

What can fail?

How will it be tested?

How will success be verified?
```

Only then should the code be implemented.

---

# 77. Ambiguity Rule

When documentation is incomplete but implementation can safely proceed without guessing, choose the smallest reversible implementation.

When ambiguity could affect:

```text
Architecture
Security
Source Integrity
Public API
Data Model
Provider Integration
```

the agent must research or create a decision record before proceeding.

It must not silently guess.

---

# 78. Existing Implementation vs Specification

If the implementation and specification disagree:

1. Determine whether the code or specification is newer.
2. Determine whether the difference is intentional.
3. Check related documents.
4. Preserve explicit product constraints.
5. Update the appropriate authoritative source.
6. Do not silently accept inconsistent behavior.

---

# 79. Swarm Communication

Agents working in parallel must communicate:

```text
Contract Changes
Blocked Dependencies
Unexpected Findings
Security Issues
Provider Limitations
Architecture Conflicts
Test Failures
```

Do not hide a blocker by implementing a private workaround.

---

# 80. Merge Discipline

Before merging agent work:

```text
Typecheck
Tests
Lint
Contract Validation
Architecture Review
Conflict Resolution
```

must be performed according to the subsystem risk.

---

# 81. Final Review Agent

A dedicated review phase should inspect the assembled product for:

```text
Architectural Drift
Duplicate Logic
Security Bypasses
Fake Features
Unsupported Claims
Broken Contracts
Source Corruption Risk
Missing Programmatic Entry Points
Missing Tests
Provider Assumptions
AI Privilege Escalation
```

The review agent should not merely inspect whether files exist.

It must inspect whether the implementation behaves according to the specifications.

---

# 82. Final Real-Project Audit

Before declaring the product ready, run the Nexo against representative real-world projects.

For each:

```text
Analyze
Open
Inspect
Edit
Build
Test
Git
Preview
Responsive
AI
```

and verify that the project remains technologically faithful to itself.

---

# 83. Final Programmatic Audit

Run the same capabilities through:

```text
API
CLI
AI Tool
```

where supported.

Verify that the UI is not secretly required.

---

# 84. Final Security Audit

Verify:

```text
No cross-workspace access
No unauthorized filesystem access
No command bypass
No AI privilege bypass
No secret leakage
No plugin escape
No production deployment bypass
No hidden debug access
```

---

# 85. Final Documentation Audit

Every implemented major capability must have:

```text
Owner
Contract
Security
Error Model
Test
Validation
```

The documentation does not need to become enormous.

It must remain accurate.

---

# 86. Master Execution Rule

The K3 Swarm must interpret all Nexo technical documents as a connected engineering system.

No document should be read in isolation when a capability crosses subsystem boundaries.

For example:

```text
AI Component Creation
```

requires:

```text
AI Engine
+
Control Plane
+
Nexo Engine
+
Component Engine
+
Adapter System
+
Project Intelligence
+
Runtime
+
Security
+
Testing
```

The agent must follow those relationships rather than treating each document as an independent product.

---

# 87. Final Build Philosophy

The Swarm must build the Nexo in a way that allows future engineers and AI agents to understand it.

Avoid:

```text
Magic
Hidden Coupling
Undocumented Global State
Temporary Hacks That Become Architecture
Fake Abstractions
Silent Fallbacks
```

Prefer:

```text
Explicit Contracts
Observable State
Clear Ownership
Real Sources of Truth
Testable Boundaries
Reversible Changes
```

---

# 88. Final Product Definition

The Nexo CMS is complete when it can perform the following loop reliably:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
MODEL
   ↓
EDIT
   ↓
VALIDATE
   ↓
VERSION
   ↓
DEPLOY
   ↓
VERIFY
```

with:

```text
Human
AI
Kimi
Codex
Luna
Local AI
CLI
Automation
```

all able to use the same underlying platform according to their permissions.

---

# 89. Final Rule

The K3 Agent Swarm must optimize for **correctness over speed of apparent progress**.

A feature that exists but:

* does not actually modify the project;
* does not respect the project's stack;
* cannot be used through the API;
* cannot be tested;
* bypasses security;
* invents unsupported behavior;
* or fails silently

is not considered implemented.

The correct result is:

```text
REAL IMPLEMENTATION
+
REAL PROJECT
+
REAL SOURCE
+
REAL VALIDATION
+
REAL PROGRAMMATIC CONTROL
```

---

# 90. Final Statement

The Nexo CMS must be built as a universal engineering platform.

It must understand existing projects rather than forcing them into one technology.

It must provide visual tools without becoming dependent on visual automation.

It must provide AI without giving AI uncontrolled authority.

It must provide a CMS-like experience without becoming a traditional CMS trapped inside one framework.

It must provide Git without replacing Git.

It must provide deployment without becoming tied to one host.

It must provide reusable components without creating a proprietary project format.

It must provide automation without hiding its capabilities behind the browser.

The final architecture is:

```text
                         NEXO CMS
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
      HUMAN                AI                AUTOMATION
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                     CONTROL PLANE
                            │
                       NEXO ENGINE
                            │
       ┌────────────────────┼─────────────────────┐
       │                    │                     │
PROJECT INTELLIGENCE    COMPONENTS             GIT
       │                    │                     │
       ├──────────────┬─────┴──────┬──────────────┤
       │              │            │
    ADAPTERS        DESIGN       MEDIA
       │              │            │
       └──────────────┼────────────┘
                      │
                   RUNTIME
                      │
             ┌────────┼─────────┐
             │        │         │
         FILESYSTEM  PROCESS   BROWSER
             │        │         │
             └────────┼─────────┘
                      │
                SOURCE PROJECT
                      │
              ┌───────┴────────┐
              │                │
             GIT          DEPLOYMENT
                              │
                         PROVIDERS
```

> **Build the Nexo as a real engineering system first. The interface, AI and automation are different ways of operating that same system. Never allow any one of them to become a substitute for the system itself.**

```
```
