````md
# NEXO CMS — INTEGRATIONS AND DEPLOYMENT

## 1. Document Status

**Document:** `12-INTEGRATIONS-AND-DEPLOYMENT.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the external integration system and deployment system of Nexo CMS.

This document defines how Nexo integrates external services, scripts, widgets, embeds and deployment providers without coupling the Core to a specific vendor.

---

# 2. Objective

The Integration and Deployment subsystem must allow Nexo projects to use and manage external capabilities such as:

```text
HTML
CSS
JavaScript
iframe
Widgets
External Scripts
External APIs
Maps
Chat
Analytics
Forms
Payment Systems
Deployment Providers
Hosting Providers
CDNs
````

The system must also allow Nexo to deploy projects through multiple providers.

The fundamental principle is:

> **External technology must remain external to the Nexo Core and connect through explicit contracts.**

---

# 3. Architecture

```text
                         NEXO ENGINE
                              │
              ┌───────────────┴────────────────┐
              │                                │
        INTEGRATION ENGINE              DEPLOYMENT ENGINE
              │                                │
      ┌───────┼────────┐              ┌────────┼────────┐
      │       │        │              │        │        │
    Widget   Script   API          Vercel  Hostinger   SSH
      │       │        │
      └───────┼────────┘
              │
       SOURCE PROJECT
```

External services must not directly control the Core.

---

# 4. Integration Types

The system must distinguish between integration classes.

Initial classes:

```text
Inline HTML
Inline CSS
Inline JavaScript
External Script
External Stylesheet
iframe
Widget
API Integration
Webhook
SDK Integration
Embed
Third-Party Component
```

Each integration type must have its own security and lifecycle rules where necessary.

---

# 5. Integration Identity

Every managed integration should have a stable identity.

Conceptually:

```text
Integration
├── ID
├── Name
├── Type
├── Scope
├── Provider
├── Configuration
├── Credentials
├── Permissions
├── Status
└── Metadata
```

---

# 6. Integration Scope

Integrations may exist at:

```text
Platform
Workspace
Project
Environment
Component
Page
```

The scope must be explicit.

A Project integration must not automatically become available to every project in the Workspace.

---

# 7. Integration Lifecycle

An integration should have explicit lifecycle states:

```text
DRAFT
CONFIGURED
VALIDATED
ACTIVE
DISABLED
ERROR
REMOVED
```

The system must not report an integration as active if validation failed.

---

# 8. Integration Installation

A typical integration installation flow:

```text
Select Integration
↓
Check Compatibility
↓
Configure
↓
Validate
↓
Authorize
↓
Apply to Project
↓
Verify
↓
Register
```

The actual project source must be modified when the integration requires source changes.

---

# 9. Integration Registry

The Nexo should maintain a registry of available integrations.

Each integration definition should include:

```text
ID
Name
Version
Type
Capabilities
Configuration Schema
Permissions
Dependencies
Compatibility
Security Requirements
```

---

# 10. External HTML

The system must permit inserting HTML where the project technology supports it.

The operation must use the appropriate Adapter.

The Nexo must not assume that arbitrary HTML can be inserted safely into every framework location.

---

# 11. External CSS

External CSS may be integrated through:

```text
Stylesheet Link
Import
Framework Configuration
Component-Specific Integration
```

The appropriate representation depends on the project.

The Nexo must not automatically modify global styles when the integration only requires local scope.

---

# 12. External JavaScript

External JavaScript must be treated as executable code.

An integration containing:

```text
<script>
```

must pass through Security and policy checks.

The Nexo must distinguish:

```text
Trusted Provider
User-Approved Script
Unknown Script
Blocked Script
```

where appropriate.

---

# 13. External Script Loading

An external script integration should record:

```text
Source URL
Provider
Load Strategy
Scope
Integrity information when supported
Dependencies
```

The system should not silently inject arbitrary scripts into every page.

---

# 14. Script Scope

Scripts may belong to:

```text
Global
Page
Component
Environment
```

The integration system must preserve this distinction.

A page-specific analytics script must not automatically become a global site script.

---

# 15. Script Position

When supported, the integration may specify placement such as:

```text
Head
Body Start
Body End
Component
Page Region
Framework-Specific Entry Point
```

The Adapter determines the correct source representation.

---

# 16. Script Ordering

Some external scripts depend on load order.

The integration system must support explicit ordering when required.

Example:

```text
Library
↓
Plugin
↓
Initialization
```

The system must not reorder scripts arbitrarily.

---

# 17. iframe Integrations

An iframe integration may contain:

```text
URL
Width
Height
Responsive Behavior
Sandbox Policy
Allow Attributes
Loading Policy
```

The system must preserve security restrictions.

---

# 18. iframe Security

The system must not automatically grant excessive iframe permissions.

Potential permissions include:

```text
camera
microphone
geolocation
fullscreen
payment
clipboard
```

Only required permissions should be configured.

---

# 19. Widget Model

A widget may be represented as:

```text
HTML
+
CSS
+
JavaScript
+
External Configuration
```

or as:

```text
iframe
```

or:

```text
Provider SDK
```

The integration system must preserve the actual implementation model.

---

# 20. Widget Component

Widgets may be exposed inside the Component Engine as reusable components.

Example:

```text
WhatsApp
Map
Chat
Reviews
Booking
Social Feed
```

The Component layer provides visual configuration.

The Integration layer owns provider-specific behavior.

---

# 21. External API Integration

API integrations may require:

```text
Base URL
Endpoints
Authentication
Headers
Request Schema
Response Schema
Environment
Secrets
```

Secrets must not be embedded directly into source when a secure configuration mechanism exists.

---

# 22. API Credentials

Credentials may be:

```text
Public
Private
Secret
Environment-Specific
Provider Managed
```

Sensitive credentials must use the Secret Management system.

---

# 23. API Integration Security

The integration engine must prevent accidental exposure of:

```text
API Keys
Bearer Tokens
Passwords
Private Credentials
Signing Secrets
```

through:

* logs;
* AI context;
* diffs;
* UI previews;
* audit.

---

# 24. Webhook Integration

Webhook integrations may support:

```text
Incoming Webhook
Outgoing Webhook
Event Mapping
Signature Verification
Retry
```

Webhook authentication must be explicit.

---

# 25. Webhook Security

Incoming webhooks must be verified according to the provider's supported security mechanism.

Do not trust a webhook solely because it came from a known URL.

---

# 26. Custom Integration

The Nexo must eventually permit custom integrations.

A custom integration must define:

```text
Integration ID
Type
Configuration Schema
Permissions
Execution Model
Security Requirements
Lifecycle
```

It must not gain unrestricted Core access.

---

# 27. Custom Code

The Nexo may allow users to insert custom code.

Custom code must be treated as source code.

The system must clearly distinguish:

```text
Nexo-Generated Code
User Code
External Integration Code
AI-Generated Code
```

---

# 28. AI-Generated Integrations

AI may create integration configuration when authorized.

Flow:

```text
User Request
↓
AI Analysis
↓
Integration Definition
↓
Compatibility Check
↓
Security Check
↓
Diff
↓
Approval when required
↓
Apply
↓
Validate
```

AI must not silently embed unknown external scripts.

---

# 29. Integration Validation

Before activation, an integration should validate:

```text
Configuration
Provider
Dependencies
Permissions
Credentials
Compatibility
Source Changes
```

A failed validation must result in:

```text
ERROR
```

or:

```text
BLOCKED
```

not:

```text
ACTIVE
```

---

# 30. Integration Dependencies

An integration may require:

```text
Package
Script
Provider
Environment Variable
API Credential
Component
```

Dependencies must be explicit.

---

# 31. No Silent Dependency Installation

An integration must not silently install packages because a provider happens to require them.

Dependency installation must be explicit, authorized and performed through the Package Manager/Runtime mechanisms.

---

# 32. Integration Compatibility

Compatibility may depend on:

```text
Framework
Framework Version
Runtime
Environment
Build System
Browser Support
Project Structure
```

The Adapter and Integration systems must work together.

---

# 33. Deployment Engine

The Deployment Engine manages the lifecycle of publishing a project to an external environment.

It is responsible for:

```text
Preflight
Build Coordination
Deployment
Verification
Rollback
Deployment State
```

The vendor-specific implementation belongs to Deployment Providers.

---

# 34. Deployment Provider

A Deployment Provider implements a common provider contract.

Initial provider possibilities:

```text
Vercel
Hostinger
SSH
SFTP
FTP
Docker
```

This list is extensible.

No provider may be assumed to behave identically to another.

---

# 35. Provider Capability Model

Each Deployment Provider should declare capabilities such as:

```text
Deploy
Preview
Rollback
Logs
Environment Variables
Domains
Build
Artifact Upload
Status
```

A provider must explicitly indicate unsupported features.

---

# 36. Deployment Target

Every deployment must identify:

```text
Project
Environment
Provider
Target
Configuration
```

Example:

```text
Project:
Client Website

Environment:
Production

Provider:
Vercel
```

---

# 37. Deployment Environments

The Nexo should support:

```text
Development
Preview
Staging
Production
Custom
```

where the provider supports them.

Environment-specific configuration must remain isolated.

---

# 38. Deployment Configuration

Deployment configuration may include:

```text
Build Command
Output Directory
Environment Variables
Node / Runtime Version
Framework
Provider Configuration
Domain
Branch
```

The actual configuration depends on the provider.

---

# 39. Deployment Preflight

Before deploying, run preflight checks.

Possible checks:

```text
Project Accessible
Git State
Build Configuration
Dependencies
Build
Environment Variables
Provider Authentication
Target Configuration
Required Permissions
```

The exact checks depend on the project/provider.

---

# 40. Preflight Result

Preflight should return:

```text
READY
WARNINGS
BLOCKED
FAILED
```

Deployment must not proceed when a blocking condition exists.

---

# 41. Build Before Deployment

When deployment requires a build, the Deployment Engine should invoke:

```text
Build Adapter
↓
Runtime Build
```

The Deployment Provider should not be responsible for understanding the project's internal source structure unless its platform explicitly owns the build environment.

---

# 42. Deployment Flow

Standard flow:

```text
Request
↓
Resolve Project
↓
Resolve Environment
↓
Resolve Provider
↓
Authorization
↓
Preflight
↓
Build if required
↓
Deploy
↓
Wait for Provider Result
↓
Verify
↓
Persist Deployment State
↓
Audit
```

---

# 43. Deployment State

Deployment states should include:

```text
DRAFT
READY
PREPARING
BUILDING
UPLOADING
DEPLOYING
VERIFYING
SUCCEEDED
FAILED
CANCELLED
ROLLED_BACK
UNKNOWN
```

The exact provider-specific states may be normalized into these conceptual states.

---

# 44. Deployment Success

A deployment must not be marked successful merely because an upload request was accepted.

Success should depend on the provider's actual completion condition and, where applicable, verification.

---

# 45. Deployment Verification

Verification may include:

```text
Provider Status
HTTP Status
Health Endpoint
Expected Domain
Preview URL
Build Completion
Basic Rendering Check
```

The exact verification strategy is provider- and project-dependent.

---

# 46. Deployment URL

When available, the Deployment record should store:

```text
Preview URL
Production URL
Provider Dashboard URL
Deployment ID
```

URLs must be treated as metadata rather than sources of truth for deployment state.

---

# 47. Deployment Logs

Deployment logs should be available when the provider supports them.

Logs must be:

```text
Structured where possible
Associated with Deployment ID
Associated with Project
Safe to display
Redacted for secrets
```

---

# 48. Deployment Cancellation

When supported by the provider, a deployment should be cancellable.

The result must distinguish:

```text
CANCEL_REQUESTED
CANCELLED
ALREADY_COMPLETED
CANCEL_FAILED
```

---

# 49. Rollback

Rollback is a first-class capability.

The architecture must distinguish:

```text
Rollback to Previous Deployment
Redeploy Previous Commit
Provider Rollback
Git Revert
```

These are not identical operations.

---

# 50. Rollback Provider Contract

A provider may implement native rollback.

If not, Nexo may reconstruct a deployment from a known source revision.

The Engine must not call something “rollback” unless the resulting behavior actually restores the intended previous deployment state.

---

# 51. Deployment History

Nexo should track:

```text
Deployment ID
Project
Environment
Provider
Source Revision
Status
URL
Started At
Completed At
Initiator
Agent
```

The record should remain separate from Git history.

---

# 52. Deployment and Git

Deployment should reference the source revision used.

Example:

```text
Deployment:
prod-42

Source:
commit abc123
```

This allows later verification of what was actually deployed.

---

# 53. Deployment and AI

AI may perform deployment when:

```text
deployment.deploy
```

is allowed.

Preferred workflow:

```text
AI
↓
deployment.preflight
↓
Review
↓
Approval if required
↓
deployment.deploy
↓
deployment.verify
```

AI must not deploy merely because it successfully changed files.

---

# 54. Production Deployment Policy

Production deployment should generally have stricter policies than preview.

Potential controls:

```text
Require Approval
Require Clean Git State
Require Build Success
Require Tests
Restrict AI Autonomous Deployment
Restrict Provider
```

The exact policy belongs to Security/Workspace configuration.

---

# 55. Deployment Secrets

Provider credentials must use secure secret management.

Deployment configuration must not place private credentials directly into source code.

---

# 56. Environment Variables

The Deployment system must distinguish:

```text
Build-time Variables
Runtime Variables
Public Variables
Secret Variables
Environment-Specific Variables
```

Do not expose secrets to the client bundle unless the project/provider intentionally requires a public variable.

---

# 57. Provider Authentication

Deployment providers may support:

```text
OAuth
API Token
SSH
Provider Credential
Service Identity
```

The implementation must use current official provider documentation.

---

# 58. Vercel Provider

If Vercel is implemented, its integration must remain inside the Vercel Deployment Provider.

The implementation agent must verify:

* current API;
* authentication;
* project linking;
* deployment creation;
* status;
* environment variables;
* domains;
* rollback/restore capabilities;

against current official Vercel documentation.

Do not hardcode undocumented behavior.

---

# 59. Hostinger Provider

If Hostinger is implemented, the integration must remain inside the Hostinger provider.

Depending on the hosting product, deployment may use:

```text
Git
SSH
SFTP
FTP
Provider API
```

The implementation must first determine the actual available deployment mechanism for the selected Hostinger service.

Do not assume all Hostinger products expose the same deployment API.

---

# 60. SSH Deployment

SSH deployment must define:

```text
Host
Port
User
Authentication
Remote Path
Build Strategy
Restart Strategy
Verification
```

Credentials must be handled by Secret Management.

---

# 61. SFTP Deployment

SFTP deployment should support secure file transfer where the target architecture requires it.

The system must distinguish:

```text
Upload
Delete
Replace
Sync
```

and define the behavior of each operation.

---

# 62. FTP Deployment

FTP should only be supported when the target environment requires it.

Because FTP does not provide the same transport security as SFTP, the provider should clearly communicate the security characteristics.

The system must not silently downgrade a secure deployment mechanism to FTP.

---

# 63. Docker Deployment

A Docker provider may eventually support:

```text
Build Image
Tag Image
Push Image
Run Container
Update Container
Health Check
Rollback
```

This should be implemented only when actually required.

---

# 64. Deployment Artifact

The Deployment Engine must know whether the provider expects:

```text
Source
Build Output
Container Image
Archive
Static Files
```

The provider contract defines the required artifact.

---

# 65. No Universal Deployment Assumption

Different providers may have completely different deployment models.

Do not force:

```text
build
→ zip
→ upload
```

onto a provider whose deployment mechanism is Git-based or container-based.

The Provider determines the actual mechanism.

---

# 66. Integration and Deployment Security

External integrations and deployment providers are privileged boundaries.

They must support:

```text
Authentication
Authorization
Secret Management
Audit
Failure Handling
Revocation
```

---

# 67. Integration Failure

An integration failure must not corrupt unrelated project state.

Example:

```text
Analytics Integration:
FAILED
```

must not cause:

```text
Project:
CORRUPTED
```

The integration operation must be isolated.

---

# 68. Deployment Failure

A failed deployment must preserve:

```text
Source Project
Git State
Previous Known Deployment State
Deployment Logs
Failure Reason
```

The system must not automatically modify source code merely because deployment failed unless an explicitly authorized remediation workflow is running.

---

# 69. Deployment Retry

Retries should be allowed only when:

```text
Failure is Retryable
Provider State Is Known
No Duplicate Deployment Risk
Policy Allows Retry
```

Do not blindly retry unknown provider states.

---

# 70. Unknown Deployment State

If the provider becomes unreachable while deployment is running:

```text
UNKNOWN
```

must be represented until the real provider state can be recovered.

Do not assume success.

Do not assume failure.

---

# 71. Integration and AI Context

AI should receive structured integration information.

Example:

```text
Integration:
Google Maps

Status:
ACTIVE

Scope:
Project

Configuration:
API-backed

Credential:
Configured
```

The raw credential value must not be exposed.

---

# 72. Integration and Components

An integration may provide Components.

Example:

```text
WhatsApp Integration
↓
WhatsApp Button Component
```

The component should reference the integration without embedding private credentials.

---

# 73. Integration and Project Model

Active integrations should be represented in the Project Model when relevant.

This helps AI and Editor understand:

```text
External Dependencies
Scripts
Widgets
Providers
```

---

# 74. Integration Removal

Removing an integration must define whether it removes:

```text
Configuration
Source Code
Dependencies
Scripts
Components
Credentials
```

The operation must not delete unrelated source.

---

# 75. Integration Migration

Changing an integration provider is a migration.

Example:

```text
Google Maps
→
Mapbox
```

must not happen as a simple configuration edit.

The system must understand the different implementation models.

---

# 76. External Domain Verification

When an integration or deployment requires a domain, the system may need to handle:

```text
DNS
SSL
Domain Ownership
Provider Configuration
```

These capabilities belong to provider-specific specifications.

The system must not assume domain ownership merely because a domain is configured in Nexo.

---

# 77. Integration Testing

Integrations must have tests for:

```text
Configuration
Authentication
Activation
Failure
Removal
Credential Protection
Project Mutation
Rollback
```

External provider tests should use provider-supported test environments where available.

---

# 78. Deployment Testing

Deployment providers must be tested for:

```text
Preflight
Build
Deploy
Status
Verification
Failure
Rollback
Credential Failure
Network Failure
Unknown State
```

Do not rely exclusively on mocked responses for provider-critical behavior.

---

# 79. External Research Requirement

Before implementing any external provider or integration, the K3 agent must:

1. identify the exact provider/product;
2. identify the current API or deployment mechanism;
3. consult official documentation;
4. verify authentication requirements;
5. verify supported operations;
6. verify version-specific behavior;
7. implement against documented behavior;
8. create provider-specific tests;
9. document limitations.

Preferred source order:

```text
Official Documentation
Official API Reference
Official Repository
Official Support / Engineering Documentation
Primary Technical Source
```

Do not invent provider capabilities.

---

# 80. Acceptance Criteria

The Integration and Deployment subsystem is correctly implemented when:

1. Integrations have stable identities.
2. Integration scope is explicit.
3. External scripts are security-controlled.
4. iframe integrations are security-controlled.
5. External APIs use structured configuration.
6. Secrets are handled through secure mechanisms.
7. Custom integrations can exist without changing the Core.
8. Integration lifecycle is explicit.
9. Deployment providers use a common contract.
10. Provider-specific behavior is isolated.
11. Deployment environments are explicit.
12. Preflight exists.
13. Deployment state is observable.
14. Deployment success requires actual completion.
15. Deployment verification exists.
16. Rollback semantics are explicit.
17. Unknown provider state is represented.
18. Git/source revision used for deployment is recorded.
19. AI can use deployment capabilities when authorized.
20. AI can use integrations without receiving secrets unnecessarily.
21. Provider failures do not corrupt project state.
22. No provider-specific assumption is hardcoded into the Domain.
23. Current official provider documentation is consulted before implementation.

---

# 81. K3 Swarm Implementation Protocol

Before implementing Integrations or Deployment:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `03-ADAPTER-SYSTEM.md`.
3. Read `04-RUNTIME-AND-SECURITY.md`.
4. Read `05-NEXO-ENGINE.md`.
5. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
6. Read `08-COMPONENT-AND-MEDIA-ENGINE.md`.
7. Read this document completely.
8. Identify each external provider actually required for the first release.
9. Research current official provider documentation.
10. Define the generic provider contract.
11. Implement one provider at a time.
12. Validate authentication.
13. Validate failure states.
14. Validate secret handling.
15. Validate deployment verification.
16. Validate AI access through the same Engine capabilities.
17. Add integration and deployment tests.
18. Record provider limitations instead of inventing behavior.

---

# 82. Final Principle

The Nexo must be able to connect projects to the outside world without allowing external systems to contaminate the Core architecture.

The correct model is:

```text
                 NEXO ENGINE
                     │
          ┌──────────┴──────────┐
          │                     │
   INTEGRATION ENGINE     DEPLOYMENT ENGINE
          │                     │
     PROVIDERS               PROVIDERS
          │                     │
   External Services      Hosting Platforms
          │                     │
          └──────────┬──────────┘
                     │
                REAL PROJECT
```

The defining rule is:

> **Nexo owns the capability and contract. The external provider owns the provider-specific implementation.**

The system must be powerful enough to connect projects to practically any required service, but modular enough that replacing one provider does not require rewriting the Nexo Core.

```
```
