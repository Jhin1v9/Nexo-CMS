````md
# NEXO CMS — RUNTIME AND SECURITY

## 1. Document Status

**Document:** `04-RUNTIME-AND-SECURITY.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the Runtime execution layer and its security boundaries.

This document defines how Nexo gains controlled access to:

- local or remote filesystems;
- processes;
- terminal commands;
- development servers;
- builds;
- tests;
- previews;
- environments;
- Git tooling;
- external execution resources.

It also defines the security requirements around those capabilities.

The Runtime is one of the most privileged parts of Nexo.

It must therefore be designed around explicit capabilities, authorization, isolation, observability and failure recovery.

---

# 2. Runtime Objective

The Runtime answers:

> **“How does Nexo safely execute an operation in the environment where the project exists?”**

The Runtime is responsible for execution.

It is not responsible for deciding whether an operation should happen.

The distinction is:

```text
Application / Domain
    ↓
Decides what operation is required
    ↓
Authorization / Policy
    ↓
Runtime
    ↓
Performs the operation
````

---

# 3. Runtime Architecture

Conceptually:

```text
                 NEXO DOMAIN
                      │
                 Application
                      │
              Authorization
                      │
                      ▼
                RUNTIME API
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   Filesystem      Process        Command
        │             │             │
        └─────────────┼─────────────┘
                      │
             ┌────────┼─────────┐
             │        │         │
          Build     Preview    Tests
             │        │         │
             └────────┼─────────┘
                      │
               EXECUTION ENV
                      │
                      ▼
                REAL PROJECT
```

---

# 4. Runtime Environment

The Runtime must be capable of operating in different deployment scenarios.

Initial scenarios:

```text
Local Runtime
Remote Runtime
VPS Runtime
Containerized Runtime
```

The Domain layer must not need to know which physical environment is being used.

Example:

```text
Domain:
Read file.

Local Runtime:
Reads local filesystem.

Remote Runtime:
Reads remote filesystem.
```

The capability contract remains the same.

---

# 5. Runtime Is a Boundary

The Runtime must be the controlled boundary between Nexo and the operating environment.

Domain code must not directly access:

```text
Filesystem APIs
Process APIs
Shell APIs
Operating System APIs
```

when those operations can be routed through Runtime capabilities.

The Runtime is responsible for applying:

* authorization context;
* path restrictions;
* command policies;
* process policies;
* timeouts;
* cancellation;
* logging;
* result normalization.

---

# 6. Runtime Capabilities

The Runtime should expose structured capabilities for:

```text
filesystem.read
filesystem.write
filesystem.create
filesystem.delete
filesystem.rename
filesystem.move

process.list
process.start
process.stop
process.restart
process.inspect

command.execute

build.run
test.run
preview.start
preview.stop
```

Additional capabilities can be added as required.

---

# 7. Capability Contract

Every Runtime capability must have:

```text
Operation ID
Input Schema
Authorization Requirement
Policy Requirement
Execution Context
Result Schema
Error Schema
Cancellation Behavior
Timeout Behavior
Audit Behavior
```

The consumer must not need to know implementation-specific operating-system details.

---

# 8. Filesystem Root

Every project Runtime session must have a defined filesystem scope.

Conceptually:

```text
Project Root
    ↓
Allowed Project Scope
```

Operations must not automatically have permission to access arbitrary paths outside the authorized scope.

---

# 9. Path Resolution

Before executing a filesystem operation, the Runtime must resolve the target path against the authorized scope.

The implementation must protect against:

```text
../
absolute path escape
symbolic-link escape
path traversal
unexpected mount access
```

A path that resolves outside the allowed scope must be rejected unless an explicit higher-level permission and policy allow it.

---

# 10. Filesystem Read

A read operation must receive:

```text
Project Context
Relative Path
Read Options
```

The Runtime should return structured information:

```text
Path
Encoding
Content
Size
Metadata
```

Binary data must not be interpreted as text without appropriate handling.

---

# 11. Filesystem Write

A write operation must:

1. authenticate the actor context;
2. authorize the operation;
3. validate target path;
4. validate operation;
5. write through Runtime;
6. confirm result;
7. report structured status;
8. emit audit information when required.

A failed write must not be reported as successful.

---

# 12. Filesystem Create

Creating a file must verify:

```text
Target Scope
Parent Directory
Permission
Existing Resource
Overwrite Policy
```

The default behavior must avoid accidental overwrites.

Overwrite behavior must be explicit.

---

# 13. Filesystem Delete

Deletion is a destructive operation.

Before deletion, the system must consider:

* authorization;
* file references;
* Git state;
* project state;
* operation risk.

The Runtime must not silently delete a file outside the permitted scope.

The Domain layer may require additional confirmation before executing the Runtime operation.

---

# 14. Filesystem Rename and Move

Rename and move operations must:

* validate source;
* validate destination;
* verify scope;
* detect collisions;
* respect filesystem semantics;
* report affected paths.

A move must not accidentally cross project boundaries.

---

# 15. Symlink Security

Symlinks must be treated carefully.

The Runtime must not assume:

```text
path inside project
=
target inside project
```

It must resolve the effective target before performing privileged operations.

A symlink escaping the authorized project scope must be rejected unless explicitly permitted.

---

# 16. Process Manager

The Runtime must provide controlled process management.

Capabilities may include:

```text
process.list
process.start
process.stop
process.restart
process.inspect
```

Process records should contain enough data to identify:

```text
Process ID
Parent Process
Command
Arguments
Working Directory
Status
Start Time
Exit Code
```

when available.

---

# 17. Process Ownership

Processes started by Nexo must be associated with an operation or project context.

Example:

```text
Project:
Junior Reformas

Process:
Development Server

Owner:
Project Runtime Session
```

This prevents ambiguous process management.

---

# 18. Process Start

Starting a process requires:

```text
Actor
Project
Command
Working Directory
Environment
Permissions
Policy
```

The Runtime must validate these before execution.

---

# 19. Process Stop

Stopping a process must identify the intended process precisely.

The system must not provide a generic mechanism that can accidentally terminate unrelated user or system processes.

---

# 20. Process Restart

Restart must be equivalent to an authorized lifecycle operation on an identified Nexo-managed process.

It must not blindly kill all processes matching a string.

---

# 21. Command Execution

Command execution is a privileged Runtime capability.

The execution flow is:

```text
Actor
↓
Authorization
↓
Command Validation
↓
Policy Evaluation
↓
Working Directory Validation
↓
Environment Resolution
↓
Execute
↓
Capture Result
↓
Audit
```

---

# 22. Command Input

A command execution request must explicitly define:

```text
Command
Arguments
Working Directory
Environment
Timeout
Cancellation Behavior
```

The Runtime must not silently execute commands in an arbitrary current working directory.

---

# 23. Shell Usage

The implementation must distinguish:

```text
Direct Process Execution
```

from:

```text
Shell Execution
```

Shell execution carries additional risks such as:

* command injection;
* quoting issues;
* environment expansion;
* shell-specific behavior.

The system should prefer direct process execution when shell semantics are not required.

---

# 24. Command Injection Protection

User-controlled or AI-generated values must not be concatenated into shell commands without proper handling.

Incorrect:

```text
exec("npm install " + userInput)
```

The exact safe execution mechanism must depend on the Runtime implementation.

The security requirement is:

> Inputs must be passed through structured arguments whenever possible rather than interpolated into shell source.

---

# 25. Command Allow / Deny Policy

The Runtime should support policy evaluation for sensitive commands.

The policy may classify commands as:

```text
SAFE
RESTRICTED
DANGEROUS
BLOCKED
UNKNOWN
```

Unknown commands must not automatically receive unrestricted authorization.

The exact command policy will be defined through the Security implementation.

---

# 26. AI Command Execution

AI-generated commands are subject to the same Runtime security boundary as human-requested commands.

The system must not create:

```text
Human command path
```

and:

```text
AI command bypass
```

AI execution must pass through:

```text
AI Identity
↓
Authorization
↓
Runtime Policy
↓
Command Execution
```

---

# 27. Environment Variables

Runtime operations may require environment variables.

The system must distinguish:

```text
Public Configuration
Sensitive Secret
Runtime Variable
Project Variable
Provider Credential
```

Sensitive values must not be exposed unnecessarily.

---

# 28. Secrets

Secrets may be required by:

* build;
* deployment;
* integrations;
* AI providers;
* project commands.

Secrets must be injected into the execution environment only when necessary.

The raw secret must not appear in:

```text
Logs
Audit Records
Diffs
AI Context
Error Messages
UI Output
```

unless a specifically authorized operation requires displaying it.

---

# 29. Secret Redaction

Runtime output should be capable of redacting known sensitive values.

Redaction must be applied before output is propagated to:

* UI;
* API;
* AI;
* logs;
* audit.

The implementation must avoid simplistic redaction assumptions that could leak secrets through transformed or encoded output.

---

# 30. Working Directory

Every command and process must have an explicit working directory.

For project operations, the default should be the relevant Project Root or another explicitly configured directory within the project scope.

The Runtime must not rely on an undocumented global process working directory.

---

# 31. Build Execution

The Build capability flow is:

```text
Project
↓
Build Adapter
↓
Build Command
↓
Authorization
↓
Runtime
↓
Process
↓
Build Result
```

The Runtime performs execution.

The Build Adapter determines the appropriate project-specific command or configuration.

---

# 32. Build Result

Build results must distinguish:

```text
SUCCESS
FAILED
CANCELLED
TIMEOUT
BLOCKED
ENVIRONMENT_ERROR
```

The result should include:

```text
Exit Code
Output
Error Output
Duration
Artifacts when known
Diagnostics
```

---

# 33. Test Execution

Tests should follow the same model:

```text
Test Adapter
↓
Test Command
↓
Authorization
↓
Runtime
↓
Process
↓
Structured Result
```

The Runtime must not assume every project uses the same test runner.

---

# 34. Development Server

The Runtime may manage development servers.

The process should be represented as an identifiable Nexo-managed process.

The system should detect readiness when technically possible.

Examples of readiness signals may include:

```text
Port available
Known startup message
Health endpoint
Provider-defined readiness
```

Do not treat a process that merely exists as necessarily ready.

---

# 35. Preview

Preview is a Runtime capability for rendering a known project state.

A preview session must identify:

```text
Project
Source State
Runtime
Port / Access Point
Viewport Context
Process
```

The system must not present an unrelated process as the project's preview.

---

# 36. Preview Isolation

Preview execution should be isolated from production deployment.

Preview must not modify production state unless explicitly requested through a deployment operation.

---

# 37. Runtime Session

A Runtime Session can represent an active execution context.

Conceptually:

```text
Runtime Session
├── Project
├── Working Directory
├── Environment
├── Permissions
├── Processes
└── Active Jobs
```

The session must not implicitly inherit unrelated projects or system-wide state.

---

# 38. Runtime Authentication

Runtime operations must carry an actor identity.

Possible actors:

```text
Human
AI Agent
CLI Session
Automation
Plugin
Internal Service
```

The Runtime must not assume that localhost requests are automatically trusted.

---

# 39. Runtime Authorization

Authorization must be evaluated before privileged operations.

Examples:

```text
filesystem.write
terminal.execute
process.stop
build.run
deployment-related command
```

The final policy comes from the central Security model.

Runtime must enforce the decision.

---

# 40. Runtime Policy

Policies may consider:

```text
Actor
Workspace
Project
Environment
Command
Path
Resource
Operation Risk
```

Example:

```text
AI Agent
+
production project
+
shell command
=
potentially restricted
```

The system must evaluate the real policy rather than hardcoding assumptions into individual callers.

---

# 41. Runtime Sandbox

Where technically appropriate, Runtime operations should support isolation.

Possible isolation mechanisms may include:

```text
Process Isolation
Filesystem Restrictions
Container Isolation
User Permissions
Working Directory Restrictions
Network Restrictions
```

The exact mechanism must be selected according to deployment environment and actual threat model.

Do not claim that a mechanism provides isolation unless its technical guarantees have been verified.

---

# 42. Local Runtime

Local Runtime must be able to access projects on the local filesystem within authorized scope.

The browser itself must not receive arbitrary filesystem authority.

The local server/runtime process is the component that accesses the filesystem.

---

# 43. Remote Runtime

Remote Runtime may execute operations on a VPS or remote machine.

The architecture should preserve the same logical Runtime capability contracts.

Conceptually:

```text
Nexo API
↓
Remote Runtime
↓
Project
```

The Domain must not need a different project-editing architecture merely because the Runtime moved from local to remote.

---

# 44. Runtime Transport

The transport mechanism between Nexo Application and a remote Runtime is not fixed by this document.

Possible approaches include:

```text
HTTP
RPC
WebSocket
Secure Agent Protocol
SSH-based Execution
```

The actual mechanism must be selected based on:

* security;
* reliability;
* latency;
* streaming requirements;
* deployment environment;
* maintainability.

External technical behavior must be verified through current official documentation before implementation.

---

# 45. Runtime Output Streaming

Long-running commands may stream:

```text
stdout
stderr
status
progress when available
```

Consumers may subscribe to the stream through supported APIs.

The underlying Runtime must remain the source of truth for execution state.

---

# 46. Runtime Timeouts

Long-running operations must have explicit timeout behavior.

Timeouts should be:

```text
Configured
Observable
Cancellable
Recoverable where possible
```

A timeout must not automatically be reported as a normal failure without distinguishing timeout from process exit.

---

# 47. Cancellation

Where possible, a running:

* command;
* build;
* test;
* preview;
* process;
* AI-controlled Runtime operation

must support cancellation.

Cancellation must have a defined result:

```text
CANCEL_REQUESTED
CANCELLED
CANCEL_FAILED
ALREADY_FINISHED
```

---

# 48. Process Termination Safety

The Runtime must avoid broad termination patterns such as indiscriminately killing all processes matching a generic name.

Processes should be identified using their Nexo-managed identity or an equivalent precise mechanism.

---

# 49. Resource Limits

Runtime operations should support configurable limits where appropriate:

```text
CPU
Memory
Duration
Output Size
Concurrent Processes
Disk Usage
Network Access
```

Not every environment will support every limit.

The implementation must only claim controls that are actually enforced.

---

# 50. Output Limits

Unbounded stdout/stderr collection can exhaust memory.

The Runtime should support:

* streaming;
* bounded buffering;
* truncation indicators;
* persistent logs for large outputs.

The consumer must be informed when output was truncated.

---

# 51. Concurrent Operations

The Runtime must support multiple operations when safe.

However, operations targeting the same resource may require coordination.

Examples:

```text
Two writes to same file
Build while dependency installation is running
Git checkout while editor is saving
Deploy while build is modifying artifacts
```

The Domain/Application layers should determine operation conflicts.

Runtime must provide sufficient lifecycle information to coordinate them.

---

# 52. File Lock / Conflict Awareness

The Runtime may expose information about active operations or file access when the environment supports it.

The system must not assume filesystem locks alone solve all concurrency problems.

Source-level conflict detection remains necessary.

---

# 53. Runtime Error Categories

At minimum, Runtime errors should distinguish:

```text
PermissionDenied
PathNotFound
PathOutsideScope
CommandNotFound
ProcessStartFailed
ProcessExitedWithError
Timeout
Cancelled
EnvironmentUnavailable
ResourceLimitExceeded
RuntimeUnavailable
RemoteConnectionFailed
UnknownRuntimeError
```

---

# 54. Runtime Result Integrity

A Runtime operation may only be reported as successful when the actual operating-system or provider operation succeeded.

Do not return:

```text
success: true
```

because the command was submitted.

Success requires the defined completion condition.

---

# 55. Runtime Audit

Sensitive Runtime operations must generate audit information.

Examples:

```text
Command Executed
File Deleted
Process Started
Process Stopped
Build Executed
Test Executed
```

Audit entries should include:

```text
Actor
Project
Operation
Target
Result
Timestamp
Job / Operation ID
```

Secrets must be excluded.

---

# 56. Runtime and Git

Git commands must normally pass through the Git domain rather than arbitrary Runtime command execution.

This provides:

* consistent authorization;
* structured results;
* Git-specific safety;
* better audit;
* easier AI usage.

Direct Git commands may still be possible through terminal when explicitly authorized.

These are separate capabilities.

---

# 57. Runtime and AI

AI may request Runtime capabilities through approved AI Tools.

Example:

```text
AI
↓
runtime.command
↓
Authorization
↓
Runtime Policy
↓
Command
```

The AI must not bypass the Runtime because it has generated the command itself.

---

# 58. Runtime and Plugins

Plugins must use approved Runtime capabilities.

A plugin must not gain unrestricted OS access merely because it is installed.

Runtime access should be scoped and auditable.

---

# 59. Security Model

The security model must follow:

```text
DEFAULT DENY
+
EXPLICIT CAPABILITY
+
EXPLICIT SCOPE
+
POLICY
+
AUDIT
```

The absence of a deny rule is not sufficient authorization.

---

# 60. Identity Types

The security layer must support at least:

```text
Human User
AI Agent
Automation
Plugin
Service Identity
CLI Session
```

Each identity must be distinguishable in authorization and audit.

---

# 61. Permission Model

Runtime-relevant permissions may include:

```text
runtime.read
runtime.command.execute
runtime.command.execute_sensitive
runtime.process.read
runtime.process.start
runtime.process.stop
runtime.process.restart
runtime.files.read
runtime.files.write
runtime.files.create
runtime.files.delete
runtime.build
runtime.test
runtime.preview
```

The final permission names belong to the Permission Model and API contracts.

---

# 62. AI Permissions

AI does not inherit unrestricted Runtime access simply because its human initiator has Runtime permissions.

The system must evaluate effective permission according to the central security model.

Example:

```text
Human:
runtime.command.execute = ALLOW

AI:
runtime.command.execute = DENY
```

is valid if policy dictates it.

However, the architecture must not prohibit AI access structurally when policy could safely allow it.

---

# 63. Approval Requirements

Certain Runtime operations may require explicit approval.

Examples:

```text
Destructive filesystem deletion
Sensitive commands
Production-oriented commands
Credential-related operations
Potentially irreversible operations
```

Approval must be separate from authentication.

---

# 64. Approval Flow

Conceptually:

```text
Actor
↓
Request
↓
Authorization
↓
Policy
↓
Approval Required
↓
Human Approval
↓
Runtime Execution
↓
Audit
```

An approval request must identify the operation and target clearly.

---

# 65. Security of Agent Entry Points

Programmatic Runtime entry points must not trust callers merely because they originate from:

```text
localhost
internal network
known browser
known process
```

Authentication and authorization must be applied according to the actual deployment security model.

---

# 66. Localhost Deployment

When Nexo runs locally:

```text
Browser
↓
Local Nexo Server
↓
Runtime
```

The browser should not receive direct arbitrary OS privileges.

The Nexo server is responsible for controlled Runtime access.

---

# 67. VPS Deployment

When Nexo runs on a VPS:

```text
Browser / Agent
↓
Nexo Server
↓
Runtime
↓
VPS Project
```

The server must protect filesystem and process access from unauthorized network clients.

Network exposure must be considered explicitly.

---

# 68. Remote Agent Security

An external agent such as:

```text
Kimi Code
Codex
Local AI
External Automation
```

must authenticate through an official programmatic mechanism.

It must not use browser session cookies as its normal integration strategy when an agent authentication mechanism exists.

---

# 69. Credential Handling

Agent credentials must:

* have identifiable owners;
* possess limited scope;
* be revocable;
* not be stored in plaintext unnecessarily;
* not appear in normal logs;
* be auditable.

The exact credential mechanism belongs to the Security implementation.

---

# 70. Secret Management

Secrets must have a separate management path from ordinary project metadata.

The system should support:

```text
Store
Use
Rotate
Revoke
Audit
```

without requiring every consumer to see the raw value.

---

# 71. Secret Injection

When a Runtime operation requires a secret:

```text
Nexo
↓
Resolve Authorized Secret
↓
Inject into Process Environment / Secure Channel
↓
Execute
↓
Remove from exposed state
```

The secret should not be copied into ordinary logs or AI context.

---

# 72. Environment Isolation

Development, preview, staging and production environments should be distinguishable when present.

Sensitive production credentials must not automatically become available to development operations.

---

# 73. Production Safety

Operations affecting production should generally receive stricter policy evaluation than local development operations.

Examples:

```text
Development:
build
run
test

Production:
deploy
rollback
production migration
production credentials
```

The exact policies are defined in Deployment and Security.

---

# 74. Security Event Logging

Security-relevant events should include:

```text
Authentication
Authorization Denial
Permission Change
Secret Access
Command Execution
Filesystem Mutation
Agent Creation
Agent Revocation
Plugin Permission Change
Deployment
```

The audit system must avoid recording secret values.

---

# 75. Runtime Recovery

If a Runtime process crashes, the system must be able to determine whether:

```text
Process Completed
Process Failed
Process Was Interrupted
Process State Unknown
```

Unknown state must not be incorrectly represented as success.

---

# 76. Runtime Restart

If the Nexo Runtime restarts:

```text
Runtime Down
↓
Runtime Up
↓
Reconstruct Sessions
↓
Inspect Processes
↓
Inspect Source State
↓
Reconcile
```

The system must not blindly trust memory from before the restart.

---

# 77. Runtime Security Testing

Security tests must cover:

```text
Path Traversal
Symlink Escape
Unauthorized Command
Unauthorized File Write
Unauthorized Delete
Unauthorized Process Stop
Secret Exposure
Agent Privilege Escalation
Permission Revocation
Cross-Project Access
Cross-Workspace Access
Remote Access
Command Injection
Output Leakage
```

---

# 78. Runtime Compatibility Testing

Runtime must be tested in supported environments.

Examples may include:

```text
Linux
Windows
macOS
VPS Environment
Container Environment
```

The exact supported matrix must be defined by the implementation.

Do not claim cross-platform support without testing it.

---

# 79. External Research Requirement

Runtime implementation may depend heavily on operating-system and security behavior.

The implementing agent must consult current official or primary documentation for:

* Node.js process APIs;
* filesystem APIs;
* child process behavior;
* operating-system permissions;
* container isolation;
* SSH;
* remote execution;
* browser security where applicable;
* credential systems.

Do not rely on undocumented assumptions.

---

# 80. No Security Through Obscurity

Do not assume that:

```text
hidden route
hidden endpoint
hidden button
localhost only
obscure command
```

is sufficient security.

Security must be enforced through actual authentication, authorization and execution boundaries.

---

# 81. Acceptance Criteria

Runtime and Security are correctly implemented when:

1. Filesystem operations are scoped.
2. Path traversal is prevented.
3. Symlink escape is handled.
4. Commands are structured and controlled.
5. Shell injection risks are addressed.
6. Processes have identity and lifecycle.
7. Builds are observable.
8. Tests are observable.
9. Previews are identifiable.
10. Long-running operations can be cancelled when supported.
11. Runtime outputs are structured.
12. Secrets are protected.
13. AI commands use the same Runtime security model as human commands.
14. Machine identities are supported.
15. Runtime operations are audited.
16. Unauthorized operations are blocked before execution.
17. Runtime works with local and remote environments through the same logical contract.
18. External project changes are not silently overwritten.
19. Security failures are represented explicitly.
20. Runtime recovery does not invent success.

---

# 82. K3 Swarm Implementation Protocol

Before implementing Runtime or Security, the agent must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `02-PROJECT-INTELLIGENCE.md`.
3. Read this document completely.
4. Read the Core Invariants.
5. Read the Workspace/Storage and Control Plane specifications when available.
6. Inspect the actual target operating environment.
7. Identify the actual runtime versions.
8. Research official documentation for OS/runtime APIs where required.
9. Define and test filesystem scope.
10. Define and test command execution policy.
11. Define identity and permission handling.
12. Implement structured errors.
13. Implement auditability.
14. Test attack and failure cases before declaring the Runtime safe.

The agent must not simplify security controls merely because the initial deployment is local.

---

# 83. Final Runtime Principle

The Runtime is the controlled bridge between Nexo and the real execution environment.

The correct architecture is:

```text
NEXO DOMAIN
    ↓
REQUESTED CAPABILITY
    ↓
AUTHENTICATION
    ↓
AUTHORIZATION
    ↓
POLICY
    ↓
RUNTIME
    ↓
OPERATING ENVIRONMENT
    ↓
RESULT
    ↓
AUDIT
```

The Runtime must be powerful enough for Nexo to genuinely operate real projects.

It must simultaneously be constrained enough that:

* an AI cannot escape its permissions;
* a plugin cannot access arbitrary files;
* a command cannot silently escape project scope;
* a user cannot modify resources they are not authorized to modify;
* a local deployment is not automatically trusted;
* a failed operation cannot masquerade as success.

> **Runtime gives Nexo the power to act. Security determines where, when and by whom that power may be used.**

```
```
