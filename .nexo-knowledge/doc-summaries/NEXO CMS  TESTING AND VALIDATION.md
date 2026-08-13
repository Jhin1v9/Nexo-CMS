````md
# NEXO CMS — TESTING AND VALIDATION

## 1. Document Status

**Document:** `13-TESTING-AND-VALIDATION.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines how the Nexo CMS implementation must be tested, validated and accepted before being considered complete.

This document establishes validation rules for the Nexo itself and for the operations it performs on real projects.

The objective is not merely to prove that functions execute.

The objective is to prove that:

```text
Nexo
↓
understands the project correctly
↓
modifies the correct project structures
↓
preserves the project's technology
↓
does not corrupt source
↓
produces valid results
↓
remains controllable by humans and machines
````

---

# 2. Core Testing Principle

The Nexo must be tested as an engineering platform, not only as a web application.

Validation must cover:

```text
Code
Architecture
Contracts
Runtime
Security
Project Intelligence
Adapters
Editor
Components
Media
Design
Responsive
Git
AI
Integrations
Deployment
```

A feature is not complete because its UI renders.

A feature is complete when its underlying capability works correctly through the appropriate domain and programmatic interfaces.

---

# 3. Validation Pyramid

The testing strategy should follow multiple layers:

```text
                    E2E / REAL PROJECT
                         ▲
                         │
                 Integration Tests
                         ▲
                         │
                  Contract Tests
                         ▲
                         │
                  Domain Tests
                         ▲
                         │
                  Adapter Tests
                         ▲
                         │
                    Unit Tests
```

No single level is sufficient.

---

# 4. Unit Tests

Unit tests should validate isolated logic.

Examples:

```text
Path validation
Project detection rules
Capability validation
Schema validation
Permission evaluation
Component schema validation
Design token parsing
Git result parsing
State transitions
```

Unit tests must be deterministic.

They must not depend on Internet access unless the test explicitly belongs to an external integration suite.

---

# 5. Domain Tests

Domain tests validate real Nexo capabilities.

Examples:

```text
project.create
project.analyze
component.create
media.replace
git.commit
runtime.build
deployment.preflight
```

Tests must verify:

```text
Input
Preconditions
Authorization
Execution
Result
State Change
Error
Audit
```

where applicable.

---

# 6. Application Tests

Application tests validate complete use cases.

Example:

```text
Create Project
↓
Analyze
↓
Resolve Adapters
↓
Return Ready State
```

Another example:

```text
Update Component
↓
Re-analyze
↓
Build
↓
Return Validation
```

Application tests must not mock away the important domain boundaries.

Mock only where the external dependency is intentionally outside the test scope.

---

# 7. Contract Tests

Every important boundary must have contract tests.

Required boundaries include:

```text
Application ↔ Engine
Engine ↔ Adapter
Engine ↔ Runtime
Engine ↔ Provider
AI ↔ Tool System
API ↔ Application
Plugin ↔ Core
Deployment ↔ Provider
Git ↔ Provider
```

Contract tests must verify that both sides agree on:

```text
Input
Output
Errors
States
Permissions
Version
Async Behavior
```

---

# 8. API Contract Tests

Every exposed Control Plane capability must have automated tests.

Example:

```text
project.create
```

must test:

```text
Valid Request
Invalid Request
Unauthorized Request
Forbidden Request
Existing Resource Conflict
Successful Result
Failure Result
```

Long-running operations must additionally test:

```text
Job Created
Job Running
Job Completed
Job Failed
Job Cancelled
```

---

# 9. Schema Validation

Request and response schemas must be validated automatically where practical.

The test suite must detect:

```text
Missing Required Field
Invalid Type
Invalid Enum
Invalid Format
Unexpected Structure
Invalid Nested Object
```

Do not rely solely on application-level manual validation.

---

# 10. Security Testing

Security must be continuously tested.

Minimum categories:

```text
Authentication
Authorization
Path Traversal
Symlink Escape
Command Injection
Cross-Project Access
Cross-Workspace Access
Secret Exposure
Privilege Escalation
Agent Privilege Escalation
Plugin Privilege Escalation
Credential Revocation
```

Security tests must be treated as mandatory.

---

# 11. Authorization Tests

Every privileged capability must include tests for:

```text
Allowed
Denied
Requires Approval
Wrong Workspace
Wrong Project
Wrong Environment
Expired Credential
Revoked Credential
```

The same authorization rules must apply regardless of entry point.

---

# 12. Human / AI Parity Tests

The Nexo must explicitly test that human-facing and programmatic consumers use the same capabilities.

Example:

```text
UI
↓
component.create
```

and:

```text
AI Tool
↓
component.create
```

must produce equivalent underlying behavior.

The test must fail if the AI path silently uses a separate implementation.

---

# 13. No-Playwright Control Plane Test

At least one full test must prove that an external agent can operate Nexo without browser automation.

Example:

```text
Agent Authenticate
↓
Discover Capabilities
↓
Open Project
↓
Analyze
↓
Modify
↓
Build
↓
Test
↓
Commit
```

The test must not use:

```text
Playwright
Browser UI
DOM scraping
Screenshot interpretation
```

for Nexo control.

---

# 14. Project Fixture Strategy

The project-intelligence and adapter systems require realistic fixture projects.

Fixtures should represent actual technologies.

Initial fixture matrix should include:

```text
Next.js
React
Vue
Svelte
Astro
HTML/CSS/JavaScript
```

and representative styling systems:

```text
Tailwind
CSS Modules
styled-components
CSS Variables
Plain CSS
```

Where practical, fixtures should use real project structures rather than artificial one-file examples.

---

# 15. Fixture Versions

Framework fixtures must identify their versions.

Example:

```text
nextjs/
  version: verified project version

vue/
  version: verified project version
```

The fixture must not silently change framework behavior without corresponding test updates.

---

# 16. Fixture Test Requirements

Each major fixture should test:

```text
Detection
Version Detection
Project Model
Project Graph
Adapter Selection
Route Detection
Component Detection
Style Detection
Asset Detection
Build Detection
Source Modification
Validation
```

---

# 17. Project Scan Tests

Project Intelligence must be tested against:

```text
Simple Project
Monorepo
Nested Project
Unknown Project
Partially Supported Project
Custom Project
Large Project
Malformed Project
No Git
Git Repository
Repository Subdirectory
```

---

# 18. Detection Accuracy

Detection tests must verify both:

```text
True Positives
False Positives
```

Example:

A directory named:

```text
components/
```

must not automatically cause every file inside it to be considered a component.

Detection must be based on actual evidence.

---

# 19. Ambiguous Detection Tests

Projects with conflicting evidence must be tested.

Example:

```text
package-lock.json
pnpm-lock.yaml
```

Expected behavior must be deterministic:

```text
Resolved
Conflict
or
Manual Confirmation Required
```

The system must not silently choose a random interpretation.

---

# 20. Unknown Technology Tests

The system must be tested against projects it does not recognize.

Expected behavior:

```text
UNKNOWN
```

or:

```text
DETECTED_BUT_UNSUPPORTED
```

The system must not fabricate compatibility.

---

# 21. Partial Adapter Tests

An adapter may support only part of a project.

Tests must verify:

```text
Supported Capability → works
Unsupported Capability → explicit unsupported result
```

The system must not use unsupported operations as if they were fully implemented.

---

# 22. Source Preservation Tests

One of the most important test categories.

Given a fixture project:

```text
Before
↓
Nexo Operation
↓
After
```

the test must confirm that unrelated project structures remain unchanged.

For example:

```text
Change Button
```

must not unexpectedly modify:

```text
Unrelated Components
Dependencies
Configuration
Git
Other Pages
Other Styles
```

---

# 23. Framework Preservation Tests

For every supported adapter, tests must verify that modifications remain in the project's original technology.

Examples:

```text
Tailwind Project
→ remains Tailwind-compatible

CSS Modules Project
→ remains CSS Modules-compatible

styled-components Project
→ remains styled-components-compatible
```

The test must detect accidental introduction of unrelated styling systems.

---

# 24. Source Transformation Tests

Whenever the Nexo modifies source:

```text
Input Source
↓
Transformation
↓
Expected Source
```

must be verified.

Tests must verify:

```text
Syntax Validity
Structure
Imports
Exports
Formatting
Semantics
```

where applicable.

---

# 25. Re-Analysis Tests

After a source mutation:

```text
Modify
↓
Re-analyze
```

the Project Model must reflect the new source.

Example:

```text
Create Component
↓
Project Model contains Component
```

If the new structure is not detected, the mutation must not be considered completely validated.

---

# 26. Build Validation

Supported project fixtures should be built after meaningful source mutations.

The test should verify:

```text
Exit Code
Build Result
Diagnostics
Expected Output
```

A source transformation that cannot build must be treated as failed unless the feature explicitly permits an intermediate invalid state.

---

# 27. Test Validation

When a project provides tests, the Nexo should run relevant tests after applicable modifications.

The test suite must verify that:

```text
Test Pass
Test Fail
Test Timeout
Test Not Available
```

are represented correctly.

---

# 28. Lint and Typecheck

When available, the Nexo may use project-specific:

```text
Lint
Typecheck
Format
```

as validation.

The test suite must not assume every project has these tools.

---

# 29. Editor Tests

The Editor must be tested at capability level, not just screenshot level.

Required categories:

```text
Selection
Source Mapping
Inspector
Edit
Save
Undo
Redo
Diff
Conflict
Preview
External Change
```

---

# 30. Visual Editor Tests

A visual operation must be tested against real source.

Example:

```text
Change Heading Text
↓
Save
↓
Read Source File
↓
Assert Text Changed
```

A test that checks only the browser display is insufficient.

---

# 31. Code Editor Tests

Code Editor tests must verify:

```text
Open Real File
Edit
Save
Read Back
Diff
External Modification
Conflict Handling
```

---

# 32. Inspector Tests

Inspector tests must verify that controls correspond to actual project capabilities.

Unsupported properties must not appear as successfully editable.

---

# 33. Source Mapping Tests

Source mapping must be tested for:

```text
Exact Mapping
Multiple Candidate Mapping
Partial Mapping
Unknown Mapping
Nested Components
Shared Components
```

The system must not select an arbitrary source file when multiple candidates exist without sufficient evidence.

---

# 34. Diff Tests

Diff output must correspond to actual source changes.

Test:

```text
Expected Before
Expected Mutation
Actual After
Actual Diff
```

The diff must not contain unrelated file changes.

---

# 35. Undo / Redo Tests

Test:

```text
Change
↓
Undo
↓
Verify Original
↓
Redo
↓
Verify Changed
```

Also test:

```text
Change
↓
External Modification
↓
Undo / Redo
```

and ensure unsafe operations are invalidated or handled explicitly.

---

# 36. Component Tests

Component Engine tests must cover:

```text
Create
Read
Update
Delete
Duplicate
Promote
Publish
Version
Compatibility
Dependencies
```

---

# 37. Component Compatibility Tests

Try installing:

```text
Compatible Component
Incompatible Component
Partially Compatible Component
Unknown Component
```

Expected behavior must match declared compatibility.

---

# 38. Component Dependency Tests

A component with:

```text
Project-Specific Dependency
```

must not be publishable as universally reusable unless that dependency is resolved or explicitly declared.

---

# 39. Component Version Tests

Updating:

```text
Component v1 → v2
```

must test:

```text
Compatibility
Migration
Affected Instances
Diff
Validation
Rollback / Recovery
```

where applicable.

---

# 40. Media Tests

Media Engine tests must cover:

```text
Upload
Read
Search
Replace
Delete
Reference Detection
Optimization
Metadata
External Media
Security
```

---

# 41. Media Reference Tests

Given:

```text
Hero Image
↓
Home Page
```

replacing the asset must update the actual project reference.

Deleting the asset must not leave an unnoticed broken reference.

---

# 42. Design Tests

Design Engine tests must cover:

```text
Color
Gradient
Typography
Spacing
Radius
Border
Shadow
Token
Theme
```

The tests must verify source-system preservation.

---

# 43. Styling System Preservation Tests

Fixture:

```text
CSS Modules
```

Operation:

```text
Change Button Color
```

Expected:

```text
CSS Module source changed
No Tailwind introduced
```

Equivalent tests must exist for other supported styling systems.

---

# 44. Responsive Tests

Responsive Lab tests must use a real browser/rendering environment where needed.

Required categories:

```text
Viewport
Overflow
Text Wrapping
Layout Breakage
Responsive Styles
Stress Testing
Comparison
```

---

# 45. Responsive Diagnostic Test

Fixture with known overflow:

```text
Viewport:
375px

Expected:
horizontal overflow
```

The test must verify that Nexo detects the problem and identifies the affected element when possible.

---

# 46. Responsive Repair Test

Known issue:

```text
Overflow
```

Expected workflow:

```text
Diagnose
↓
Modify
↓
Render
↓
Diagnose Again
↓
Issue Resolved
```

The test must verify the final source and rendered result.

---

# 47. Stress Test Validation

Stress content must not persist into the actual Source Project unless explicitly requested.

Test:

```text
Stress Test
↓
Run
↓
Inspect Source
↓
No permanent test data
```

---

# 48. Git Tests

Git testing must use real temporary repositories where possible.

Required:

```text
Status
Diff
Branch
Commit
Push
Pull
Fetch
Merge
Rebase
Stash
Revert
Reset
Conflict
```

High-risk operations must have separate authorization tests.

---

# 49. Git Conflict Tests

Create a real conflict.

The system must return:

```text
CONFLICT
```

and expose affected files.

It must not report:

```text
SUCCESS
```

while unresolved conflicts remain.

---

# 50. Git External Change Tests

Test:

```text
Nexo reads state
↓
External Git operation occurs
↓
Nexo operation begins
```

The system must detect or safely handle the changed repository state.

---

# 51. Runtime Tests

Runtime must be tested against:

```text
Filesystem
Process
Command
Build
Test
Preview
Timeout
Cancellation
Output
Resource Limit
```

---

# 52. Filesystem Security Tests

Mandatory tests:

```text
../ traversal
Absolute path escape
Symlink outside project
Unauthorized project
Unauthorized Workspace
File delete outside scope
```

Every unauthorized operation must be rejected.

---

# 53. Command Security Tests

Mandatory tests include:

```text
Argument Injection
Shell Injection
Unauthorized Command
Sensitive Command
Working Directory Escape
Environment Leakage
```

The exact test cases depend on the Runtime implementation.

---

# 54. Secret Leakage Tests

The system must test that secrets do not appear in:

```text
Logs
Errors
AI Context
Diffs
Audit
Terminal Output
API Responses
```

when not explicitly intended.

---

# 55. Control Plane Tests

Every public capability must have tests for:

```text
Authentication
Authorization
Validation
Success
Failure
Async State
Cancellation
```

---

# 56. Agent API Tests

An agent must be able to:

```text
Authenticate
Discover
Read Project
Modify Project
Validate
Git
```

through the Control Plane.

The tests must not depend on UI.

---

# 57. AI Tests

AI testing must separate deterministic platform behavior from non-deterministic model behavior.

Do not use a live LLM call as the only test for:

```text
Authorization
Tool Security
File Safety
Git Safety
```

Those must have deterministic tests.

---

# 58. AI Tool Tests

Each AI Tool must test:

```text
Valid Input
Invalid Input
Unauthorized
Unsupported
Execution Failure
Successful Result
Structured Result
```

---

# 59. AI Hallucination Safety Tests

Create situations where the model could incorrectly assume:

```text
Framework
Route
Component
Build Command
Git State
```

The platform must provide authoritative tool data and prevent unsupported operations.

---

# 60. AI Completion Verification Tests

Test:

```text
Model says success
↓
Real build fails
```

Expected:

```text
AI Task = FAILED
```

The textual model claim must not override actual validation.

---

# 61. Autonomous AI Tests

Autonomous workflows must be tested for:

```text
Permission Denied
Approval Required
Retry
Cancellation
Partial Failure
External Change
Successful Completion
```

---

# 62. Luna Integration Tests

Luna integration must test:

```text
Authentication
Capability Discovery
Tool Execution
Project Read
Project Mutation
Validation
Errors
Cancellation
Audit
```

Luna must use the programmatic Control Plane.

---

# 63. Integration Tests

External integrations must be tested for:

```text
Activation
Configuration
Authentication
Execution
Failure
Removal
Credential Protection
Source Mutation
```

Use provider-supported test environments where possible.

---

# 64. Deployment Tests

Deployment provider tests must include:

```text
Preflight
Build
Deploy
Status
Verify
Failure
Retry
Unknown State
Rollback
Credential Failure
```

Do not mock every provider behavior.

Provider-critical workflows require realistic integration tests where feasible.

---

# 65. Deployment Verification Test

Test:

```text
Deploy
↓
Provider reports complete
↓
Verify actual target
```

The system must not mark deployment successful when verification establishes failure.

---

# 66. Rollback Tests

Test:

```text
Deployment A
↓
Deployment B
↓
Rollback
↓
Verify A
```

The exact rollback mechanism depends on the provider.

---

# 67. Regression Testing

Every fixed bug that could recur should result in a regression test.

The Swarm must add regression tests when:

* fixing a parser;
* fixing an adapter;
* fixing a security problem;
* fixing project corruption;
* fixing AI tool behavior;
* fixing deployment behavior.

---

# 68. Snapshot Testing

Snapshot tests may be used for:

```text
Schemas
Project Models
Diagnostics
Structured Results
UI Components
```

Snapshots must not replace behavioral assertions.

---

# 69. Visual Regression

Visual regression may be used for:

```text
Nexo UI
Editor
Responsive Lab
Component Preview
```

Visual regression must be separate from Source Project correctness tests.

A visually correct screenshot does not prove the underlying source is correct.

---

# 70. End-to-End Project Tests

The most important validation layer is real end-to-end project manipulation.

Example:

```text
Open Fixture
↓
Analyze
↓
Create Component
↓
Edit Design
↓
Run Build
↓
Run Tests
↓
Inspect Git Diff
↓
Commit
↓
Verify Final State
```

The entire sequence should run without manually repairing the project.

---

# 71. Multi-Stack E2E Matrix

At least the primary supported fixtures should undergo end-to-end workflows.

Example:

```text
Next.js
React
Vue
Svelte
Astro
HTML/CSS/JS
```

Not every advanced feature needs full parity on every stack initially.

Unsupported capabilities must be reported explicitly.

---

# 72. Cross-Stack Test Principle

The same conceptual capability should produce technology-appropriate results.

Example:

```text
Create Component
```

must succeed in:

```text
React Fixture
Vue Fixture
Svelte Fixture
```

using their respective adapters.

The expected source representation is different.

The capability is the same.

---

# 73. Full Platform Acceptance Test

A complete Nexo acceptance test should eventually execute:

```text
Create Workspace
↓
Create / Import Project
↓
Analyze
↓
Resolve Stack
↓
Resolve Adapters
↓
Open Editor
↓
Modify Component
↓
Modify Design
↓
Test Responsive Layout
↓
Run Build
↓
Run Tests
↓
Inspect Git
↓
Commit
↓
Push
↓
Deploy Preview
↓
Verify
```

A second test must perform equivalent operations through a programmatic agent.

---

# 74. Agent End-to-End Acceptance Test

```text
Agent Authentication
↓
Capability Discovery
↓
Project Selection
↓
Project Analysis
↓
Component Creation
↓
Source Modification
↓
Build
↓
Test
↓
Git Status
↓
Commit
↓
Push
```

No UI interaction must be required.

---

# 75. Data Integrity Testing

The system must test that Nexo metadata remains consistent with:

```text
Source Project
Git
Deployment
Project Model
Project Graph
```

after:

```text
Branch Switch
External Edit
Runtime Restart
Application Restart
Failed Mutation
Successful Mutation
```

---

# 76. Crash Recovery Tests

Simulate failures during:

```text
Project Write
Build
AI Task
Git Commit
Push
Deployment
Media Processing
```

The system must recover to an explicit state.

It must not leave:

```text
false success
false clean state
hidden partial mutation
```

---

# 77. Restart Tests

Restart:

```text
Nexo Server
Runtime
Browser
Agent
```

during relevant operations.

Verify that persistent state is reconstructed from authoritative sources.

---

# 78. Concurrency Tests

Test simultaneous operations such as:

```text
Human editing
+
AI editing

AI editing
+
External IDE editing

Build
+
Source mutation

Git operation
+
Editor save
```

The system must detect or safely handle conflicts.

---

# 79. Performance Testing

Performance tests should use realistic project sizes.

Measure:

```text
Project Scan Time
Model Build Time
Editor Load Time
Large File Handling
AI Context Construction
Build Trigger
Git History Query
Media Indexing
Responsive Diagnostics
```

Do not optimize based purely on assumptions.

---

# 80. Large Project Test

A sufficiently large project fixture should be used to verify:

```text
Memory Usage
Scan Performance
UI Responsiveness
Incremental Updates
Context Construction
```

The target size should reflect realistic Nexo client projects.

---

# 81. Resource Exhaustion Tests

Test behavior when:

```text
Disk Full
Memory Limited
Process Hangs
Build Hangs
Network Lost
Provider Unavailable
Output Becomes Huge
```

The system must fail safely and report an explicit state.

---

# 82. Network Failure Tests

Simulate network loss during:

```text
AI Request
Git Push
Git Fetch
Deployment
Integration Request
Remote Runtime
```

The system must distinguish:

```text
Completed
Failed
Unknown
```

where actual completion cannot be determined.

---

# 83. Browser Disconnect Tests

A browser disconnect must not automatically cancel server-side operations unless explicitly configured.

Example:

```text
AI Task Running
↓
Browser closes
↓
AI Task continues
```

when policy permits.

The user must be able to reconnect and retrieve the task state.

---

# 84. Testing Environment Separation

Testing must distinguish:

```text
Unit
Integration
Fixture
End-to-End
External Provider
Security
Performance
```

External production systems must never be used accidentally by tests.

---

# 85. Test Data Isolation

Tests must not modify real user projects unless explicitly run as a controlled production validation process.

Use:

```text
Temporary Projects
Fixtures
Temporary Repositories
Sandbox Providers
```

where possible.

---

# 86. External Provider Test Isolation

Provider integrations must use:

```text
Sandbox
Test Project
Test Account
Mock
```

where supported.

Never assume a provider has a sandbox if it does not.

Verify the current provider documentation.

---

# 87. Test Environment Secrets

Test secrets must be:

```text
Dedicated
Rotatable
Scoped
Non-Production
```

Never use real production credentials in automated tests.

---

# 88. Test Naming

Tests should describe behavior.

Good:

```text
component-create-preserves-tailwind-project
```

Bad:

```text
test1
```

The name should help future engineers understand what regression is being protected.

---

# 89. Test Determinism

Tests must be deterministic whenever possible.

Avoid dependence on:

```text
Current Time
Random IDs
Internet
Provider Availability
AI Nondeterminism
Machine-Specific Paths
```

unless the test explicitly targets those conditions.

---

# 90. AI Test Determinism

For platform correctness tests, use deterministic AI stubs/mocks where appropriate.

Live model testing belongs to a separate AI integration/evaluation suite.

---

# 91. Acceptance Gates

A subsystem must not be considered complete until its mandatory validation gates pass.

Example:

```text
Implementation
↓
Unit Tests
↓
Contract Tests
↓
Integration Tests
↓
Fixture Tests
↓
Security Tests
↓
E2E
```

The exact gates depend on subsystem risk.

---

# 92. Definition of Done

A feature is not done when:

```text
UI works
```

It is done when:

```text
Capability works
+
Programmatic path works
+
Authorization works
+
Errors work
+
Tests pass
+
Real project validation passes
+
No known corruption path remains
```

---

# 93. Required Test Artifacts

Important features should produce:

```text
Tests
Fixtures
Expected Results
Failure Cases
Compatibility Matrix
Known Limitations
```

The Swarm must keep these artifacts associated with the relevant subsystem.

---

# 94. Research Requirement

Testing behavior that depends on external technology must be based on current verified behavior.

Before writing compatibility tests for:

```text
Framework
Browser
Git
Provider
AI API
Deployment Platform
```

the agent should inspect current official documentation and the actual installed version.

---

# 95. No Fake Validation

The following are not sufficient by themselves:

```text
HTTP 200
Process started
Button clicked
Model said done
File exists
Screenshot looks correct
```

Validation must target the actual success condition.

Examples:

```text
Build:
exit success + expected build result

Deployment:
provider completion + verification

Source Mutation:
expected source structure + validation

AI:
requested outcome + actual validation
```

---

# 96. Testing the Swarm

The Swarm implementation itself must also be validated.

The system should verify:

```text
Agents Read Correct Documents
Agents Respect Module Boundaries
Agents Do Not Invent APIs
Agents Run Required Tests
Agents Respect Security
Agents Preserve Existing Code
```

The final Swarm execution specification will define how this is enforced operationally.

---

# 97. Final Validation Workflow

The full product validation pipeline should eventually be:

```text
Lint
↓
Typecheck
↓
Unit Tests
↓
Contract Tests
↓
Security Tests
↓
Adapter Fixture Tests
↓
Integration Tests
↓
Real Project E2E
↓
AI Agent E2E
↓
Visual Regression
↓
Build
↓
Deployment Validation
```

Failures must stop the appropriate release gate.

---

# 98. Release Criteria

A release candidate must not be considered stable if there are unresolved:

```text
Critical Security Failures
Source Corruption Bugs
Unauthorized Access Paths
Broken Programmatic Capabilities
Data-Loss Bugs
False Deployment Success
False Validation Success
```

Known non-critical limitations may be documented explicitly.

---

# 99. K3 Swarm Implementation Protocol

Before declaring any subsystem complete, the Swarm must:

1. Read the relevant subsystem specification.
2. Identify acceptance criteria.
3. Implement unit tests.
4. Implement contract tests.
5. Implement integration tests.
6. Add or update fixture projects.
7. Run the affected real-project workflow.
8. Run security tests.
9. Run programmatic/agent tests where applicable.
10. Run end-to-end tests.
11. Verify no UI-only dependency exists.
12. Verify Source Project integrity.
13. Verify Git state.
14. Record failures and limitations.
15. Never mark a capability complete because the code compiles alone.

---

# 100. Final Principle

Testing in Nexo is not the final cosmetic step after development.

It is the mechanism that proves the platform can safely operate real projects.

The required engineering loop is:

```text
BUILD
↓
TEST
↓
OBSERVE
↓
VALIDATE
↓
FIX
↓
TEST AGAIN
```

The strongest validation is always connected to reality:

```text
Real Source Project
Real Runtime
Real Adapter
Real Git
Real Build
Real Browser
Real Provider
Real Programmatic Agent
```

> **A Nexo feature is complete only when the real project behaves correctly after the operation, the system can prove that correctness, and both humans and authorized machines can rely on the result.**

```
```
