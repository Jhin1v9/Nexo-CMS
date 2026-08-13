````md
# NEXO CMS — WORKSPACE AND STORAGE

## 1. Document Status

**Document:** `14-WORKSPACE-AND-STORAGE.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines Workspace, Project Registration, Nexo-owned persistence, metadata ownership, storage boundaries and data lifecycle.

This document defines the data that belongs to Nexo itself.

It does **not** replace the Source Project, Git repository or external provider state.

---

# 2. Objective

Nexo needs its own persistent state to manage:

- users;
- machine identities;
- Workspaces;
- Projects;
- Project registrations;
- adapters;
- component library;
- media metadata;
- AI tasks;
- Jobs;
- audit records;
- integrations;
- deployments;
- preferences;
- configuration.

The storage layer must keep Nexo-owned data separate from the actual client project.

---

# 3. Core Rule

The fundamental separation is:

```text
NEXO STORAGE
    ↓
Nexo-owned metadata and application state

SOURCE PROJECT
    ↓
Real source code and project resources

GIT
    ↓
Version-control state

EXTERNAL PROVIDER
    ↓
Provider-owned state
````

These four concepts must never be merged into one source of truth.

---

# 4. Workspace

A Workspace is the primary organizational boundary inside Nexo.

A Workspace may contain:

```text
Users
Machine Identities
Projects
Shared Components
Shared Media Metadata
Integrations
Providers
Policies
Audit
Settings
```

A Workspace must have a stable identity.

Conceptually:

```text
Workspace
├── ID
├── Name
├── Members
├── Projects
├── Shared Resources
├── Policies
└── Settings
```

---

# 5. Workspace Isolation

Resources belonging to one Workspace must not automatically become accessible to another Workspace.

At minimum:

```text
Workspace A
↓
Project A
```

must not be readable by:

```text
Workspace B
```

unless an explicit sharing mechanism exists.

---

# 6. Project Registration

Nexo must distinguish:

```text
Nexo Project Registration
```

from:

```text
Source Project
```

The registration contains information required for Nexo to locate and manage the real project.

Conceptually:

```text
Project Registration
├── Project ID
├── Workspace ID
├── Source Location
├── Git Relation
├── Runtime Relation
├── Stack
├── Adapter State
└── Metadata
```

---

# 7. Project Identity

A Nexo Project ID must be stable.

It must not be derived exclusively from:

```text
Project Name
Filesystem Path
Git Branch
```

because these can change.

The Project ID belongs to Nexo.

---

# 8. Source Location

The registration must identify where the actual project lives.

Possible forms:

```text
Local Path
Remote Runtime Path
VPS Path
Mounted Path
Runtime-specific Resource Identifier
```

A source location is not itself a permission grant.

Runtime authorization still applies.

---

# 9. Project Path Changes

A project may move.

The system must support updating its source location without unnecessarily creating a new Project identity when the system can verify that the moved source is the same project.

The system should use project fingerprints and other evidence to verify identity.

If identity cannot be established safely, the system must request confirmation.

---

# 10. Project Fingerprint

Nexo should retain enough information to verify that a source location still points to the registered project.

Potential evidence:

```text
Project Root
Repository Identity
Key Configuration
Git Metadata
Selected File Fingerprints
```

The implementation must use a robust strategy.

A single timestamp is insufficient.

---

# 11. Workspace Membership

Workspace membership defines who can access Workspace resources.

Members must have:

```text
Identity
Role / Permissions
Membership Status
Created At
```

The exact role system belongs to Security/Authorization.

Storage must persist the information required by that system.

---

# 12. Machine Identities

Nexo must persist machine identities such as:

```text
AI Agent
Automation
CLI Service Identity
Plugin
Service Account
```

A machine identity must be separately identifiable.

Its credentials must not be stored as ordinary plaintext application metadata.

---

# 13. Agent Registration

An AI agent record may include:

```text
Agent ID
Name
Type
Provider
Owner
Workspace
Status
Permissions
Created At
Last Used At
```

Sensitive credentials are stored through the secure credential mechanism, not inside ordinary agent metadata.

---

# 14. Agent Lifecycle

Machine identities should support:

```text
ACTIVE
SUSPENDED
REVOKED
EXPIRED
```

A revoked identity must no longer authenticate successfully.

---

# 15. Project Access

Project access must derive from Workspace membership and explicit project-level policy where supported.

Storage must retain the relationships necessary for authorization.

The storage layer must not itself decide whether an operation is allowed.

Authorization belongs to Security.

---

# 16. Shared Component Library

Workspace-level components may be stored in Nexo Storage.

The library should preserve:

```text
Component ID
Version
Schema
Metadata
Compatibility
Dependencies
Source Definition
Status
```

The actual project-installed source remains inside the Source Project.

---

# 17. Library vs Project Component

These must remain different entities.

```text
Library Component
↓
Reusable Nexo Resource

Project Component
↓
Actual Source Project Resource
```

Installing a library component into a project creates or modifies real source code.

The Library record is not the source code itself.

---

# 18. Media Metadata

Nexo may store media metadata.

Examples:

```text
Asset ID
Name
Type
Dimensions
Source
Scope
References
Metadata
Created At
Updated At
```

The real asset may physically live in the Source Project or another storage system.

Nexo metadata must identify its source.

---

# 19. Media Source

An asset may originate from:

```text
Source Project
Nexo Library
Uploaded Asset
External URL
CDN
Generated Asset
Integration
```

Storage must preserve this distinction.

---

# 20. AI Task Storage

AI Tasks must persist outside the browser.

A task should include:

```text
Task ID
Workspace
Project
Initiator
Agent
Provider
Model
Mode
Status
Created At
Started At
Completed At
Operation IDs
Result
Error
```

Sensitive prompt/context content must follow privacy and security rules.

---

# 21. AI Task State

Storage must be able to reconstruct task state after:

```text
Browser Refresh
Browser Close
Nexo Restart
Runtime Restart
Temporary Network Failure
```

The UI is not the authoritative location of task state.

---

# 22. Job Storage

Long-running Jobs must persist enough data to recover their state.

Minimum conceptual information:

```text
Job ID
Type
Owner
Workspace
Project
Status
Created At
Started At
Completed At
Result
Error
```

---

# 23. Job Retention

Jobs should have configurable retention policies.

Completed jobs need not remain forever unless required for:

* audit;
* compliance;
* debugging;
* product history.

Retention must not be decided independently by individual modules.

---

# 24. Audit Storage

Audit events must be stored in a tamper-resistant or appropriately protected structure.

Relevant fields may include:

```text
Event ID
Actor
Initiator
Workspace
Project
Operation
Resource
Result
Timestamp
Operation ID
Job ID
```

Secrets must never be written into audit records.

---

# 25. Audit vs Application Logs

Audit records and application logs are separate.

```text
Audit
→ Security / accountability

Logs
→ Debugging / observability
```

A log message must not become the authoritative audit record.

---

# 26. Deployment Records

Nexo should persist deployment metadata.

Possible fields:

```text
Deployment ID
Project
Workspace
Environment
Provider
Source Revision
Status
URL
Provider Deployment ID
Initiator
Agent
Started At
Completed At
```

The record represents Nexo's knowledge of the deployment.

The external provider remains authoritative for provider-owned state.

---

# 27. Integration Records

Nexo should persist integration metadata such as:

```text
Integration ID
Project / Workspace Scope
Type
Provider
Status
Configuration Metadata
Permissions
Created At
Updated At
```

Secrets must be stored separately.

---

# 28. Provider Configuration

Provider configuration may include:

```text
Provider
Project
Environment
External ID
Status
Capabilities
```

Sensitive credentials must never be stored inside ordinary provider configuration records unless they are encrypted and protected according to the Security implementation.

Prefer dedicated secret storage.

---

# 29. Settings

Settings must have explicit scopes.

Possible scopes:

```text
Platform
Workspace
Project
Environment
User
Provider
```

Storage must retain the scope.

The configuration system determines precedence.

---

# 30. Configuration Precedence

When multiple settings apply, precedence must be explicitly defined.

Example conceptual hierarchy:

```text
Platform
↓
Workspace
↓
Project
↓
Environment
↓
User
```

This hierarchy is not automatically authoritative.

The final precedence must be documented by the configuration subsystem before implementation.

Agents must not invent precedence locally.

---

# 31. Cache Storage

Nexo may cache:

```text
Project Intelligence
Project Graph
Git Information
Provider Metadata
Capability Discovery
Media Index
```

Caches must include enough information to determine freshness.

A cache is not the source of truth.

---

# 32. Cache Invalidation

Caches must support:

```text
Invalidate
Refresh
Rebuild
Expire
```

Sources of invalidation include:

```text
External File Change
Branch Switch
Project Mutation
Adapter Update
Provider Change
Manual Refresh
```

---

# 33. Project Intelligence Snapshot

Nexo may persist Project Intelligence snapshots to improve performance.

A snapshot should include:

```text
Project Fingerprint
Analysis Version
Adapter Versions
Detected Stack
Analysis Timestamp
Model Version
```

This allows the system to detect stale analysis.

---

# 34. Adapter Version in Metadata

Because adapters evolve, persisted project intelligence should know which adapter version generated the analysis.

Example:

```text
Adapter:
nextjs

Adapter Version:
2.1.0
```

An adapter update may invalidate previous analysis.

---

# 35. Schema Versioning

Persisted Nexo records must have schema versions when the schema can evolve incompatibly.

Examples:

```text
Project Metadata v1
Project Metadata v2
Component Schema v3
```

The system must have migration or compatibility strategy.

---

# 36. Storage Migrations

Database/storage schema changes must be versioned.

A migration must be:

```text
Explicit
Repeatable
Tested
Recoverable where feasible
```

Never silently mutate production persistence structures during application startup without a controlled migration process.

---

# 37. Backup Strategy

Nexo-owned persistent data should have a defined backup strategy appropriate to deployment.

Important data may include:

```text
Workspace Metadata
Project Registrations
Component Library
AI Task Records
Audit
Deployment Records
Settings
```

The Source Project and Git repository have separate backup responsibilities.

Nexo must not assume its metadata backup protects source code.

---

# 38. Restore Strategy

Restoring Nexo Storage must not automatically rewrite Source Projects.

A restore operation should restore Nexo-owned state first.

Project/source reconciliation should then determine whether registrations still point to valid resources.

---

# 39. Orphaned Project Detection

Nexo should detect registrations whose source cannot be reached.

Possible status:

```text
SOURCE_UNAVAILABLE
SOURCE_MOVED
SOURCE_DELETED
RUNTIME_UNAVAILABLE
UNKNOWN
```

It must not automatically delete the registration.

---

# 40. Orphaned Metadata

If source files or assets disappear externally, Nexo metadata may become orphaned.

The system should detect and reconcile these records.

It must not silently fabricate replacement resources.

---

# 41. Project Removal

Removing a project from Nexo must be separate from deleting its Source Project.

Operation A:

```text
Remove Project Registration
```

Operation B:

```text
Delete Source Project
```

Operation B is destructive and must require explicit authorization.

---

# 42. Workspace Removal

Workspace deletion is highly destructive.

Before removal, the system must account for:

```text
Projects
Members
Agents
Shared Components
Integrations
Deployment Records
Audit
```

The exact cascade behavior must be explicitly defined.

Never assume deletion of a Workspace should physically delete Source Projects.

---

# 43. Shared Resource Deletion

Deleting a Workspace resource must account for project references.

Example:

```text
Global Component
↓
Used by Project A
↓
Used by Project B
```

Deleting the library entry must not automatically delete installed project source unless the architecture explicitly defines a linked-resource model.

---

# 44. Storage Transactions

Storage operations involving multiple Nexo records should use transactions where supported.

Example:

```text
Create Project Registration
+
Create Workspace Relationship
+
Create Initial Project Metadata
```

If a transaction cannot be used, the system must define recovery/reconciliation behavior.

---

# 45. Storage Does Not Own Source Mutations

Nexo Storage must not directly modify Source Project files.

Source mutations go through:

```text
Nexo Engine
↓
Adapter / Runtime
↓
Source Project
```

Storage may record the resulting metadata.

---

# 46. Storage Does Not Own Git

Storage may cache Git information.

It does not become Git.

Git remains authoritative for:

```text
Branch
Commit
Working Tree
History
Remote State
```

---

# 47. Storage Does Not Own Deployment

Storage records deployments.

The Deployment Provider remains authoritative for provider state.

---

# 48. Storage Does Not Own AI Reasoning

Storage may persist:

```text
Task State
Result Metadata
Audit
History
```

It must not become the authority on what the AI “believes” about the current project.

Project Intelligence and actual source state remain authoritative.

---

# 49. Multi-Tenancy Readiness

Even if Nexo begins as an internal product, the storage model should not assume only one Workspace exists.

The model must be capable of:

```text
Multiple Workspaces
Multiple Projects
Multiple Members
Multiple Agents
```

without requiring a rewrite of the data ownership model.

---

# 50. Tenant Isolation

Workspace data must be isolated at the persistence/query boundary.

A query for Workspace A must not accidentally return Workspace B records.

Authorization is still required after data retrieval.

Defense in depth is required.

---

# 51. Resource Ownership

Every persistent resource should have explicit ownership where relevant.

Examples:

```text
Workspace
Project
Component
Media
Integration
AI Task
Job
Deployment
```

Ownership must not be inferred from arbitrary names.

---

# 52. Stable References

Relations between records should use stable identifiers.

Do not rely exclusively on:

```text
Names
Paths
URLs
Human-readable labels
```

for internal relationships.

---

# 53. Soft Deletion

For resources requiring recovery or audit, soft deletion may be used.

Possible states:

```text
ACTIVE
ARCHIVED
DELETED
```

Soft deletion must not be mistaken for removal from external source resources.

---

# 54. Hard Deletion

Hard deletion should be reserved for data where:

* policy allows it;
* retention requirements allow it;
* dependencies are resolved.

Hard deletion must be explicit.

---

# 55. Privacy

Nexo storage should avoid persisting more information than necessary.

Sensitive information requires:

```text
Purpose
Retention
Access Control
Protection
Deletion Policy
```

AI prompts, project metadata and audit data may contain sensitive information and must be treated accordingly.

---

# 56. Project Privacy

Nexo metadata about a client project must not automatically become visible to every Workspace member.

The authorization model determines actual access.

Storage must preserve the data needed to enforce that model.

---

# 57. Search Index

Nexo may maintain indexes for:

```text
Projects
Components
Media
Audit
AI Tasks
```

Indexes must be derived data.

If an index becomes corrupt:

```text
Rebuild
```

must be possible from authoritative storage/source data.

---

# 58. Search and Permissions

Search must respect resource authorization.

A user must not discover a project merely because its name exists in an index they cannot access.

Filtering after retrieval is not sufficient if the underlying system leaks unauthorized metadata.

---

# 59. Storage Security

Nexo Storage must enforce:

```text
Authentication
Authorization
Workspace Isolation
Encryption where required
Secret Separation
Audit
```

The exact implementation depends on the selected storage technology.

---

# 60. Database Technology

This document does not mandate a specific database.

The selected storage technology must be evaluated based on:

```text
Transactional Requirements
Query Requirements
Local Deployment
Remote Deployment
Concurrency
Migration Support
Backup
Security
Operational Complexity
```

The K3 agent must research current official documentation before selecting the production implementation.

---

# 61. Local Storage

Because Nexo may operate locally, the storage layer must support a reliable local deployment.

The implementation may use an embedded or locally hosted database when appropriate.

The choice must not compromise future migration to remote deployment.

---

# 62. Remote Storage

When Nexo operates on a VPS, storage may be local to that VPS or external.

The Application/Domain layers must not depend directly on the physical database location.

---

# 63. Storage Repository Pattern

Domain code should not directly contain raw database queries throughout the application.

Use an appropriate persistence boundary.

Possible conceptual repositories:

```text
WorkspaceRepository
ProjectRepository
ComponentRepository
MediaRepository
AITaskRepository
JobRepository
DeploymentRepository
AuditRepository
```

The final implementation must avoid unnecessary abstraction while preserving domain ownership.

---

# 64. Storage Concurrency

The persistence layer must correctly handle concurrent updates.

Examples:

```text
Human updates project
AI updates project metadata
Job completes
Provider updates deployment
```

Optimistic concurrency or another appropriate strategy should be used where necessary.

---

# 65. Versioned Records

Critical records may require version numbers.

Example:

```text
Project Metadata
version: 12
```

A write based on version `11` should be able to detect that the record changed.

The exact concurrency mechanism belongs to the persistence implementation.

---

# 66. Storage Errors

Storage errors should be structured.

Examples:

```text
RecordNotFound
ConstraintViolation
Conflict
ConnectionUnavailable
MigrationFailure
TransactionFailure
PermissionDenied
StorageUnavailable
```

The Application Layer must not expose raw database errors directly.

---

# 67. Storage Availability

If Nexo Storage is temporarily unavailable:

```text
StorageUnavailable
```

must be represented explicitly.

The system must not fabricate success or lose source-project work silently.

---

# 68. Source Project Availability vs Storage Availability

These must remain separate states.

Example:

```text
Nexo Storage:
AVAILABLE

Source Project:
UNAVAILABLE
```

or:

```text
Nexo Storage:
UNAVAILABLE

Source Project:
STILL EXISTS
```

The UI and APIs must preserve that distinction.

---

# 69. Workspace and AI

Workspace policies can determine:

```text
AI Providers
Agent Permissions
Autonomous Mode
Deployment Permissions
Runtime Permissions
```

The AI Engine consumes those policies.

Workspace Storage persists the configuration.

---

# 70. Workspace and Components

Workspace-level Component Library records belong to Workspace scope.

Project-installed components remain project resources.

---

# 71. Workspace and Media

Shared media metadata may belong to Workspace.

Actual asset storage may remain project-specific or use a dedicated asset storage provider.

---

# 72. Workspace and Integrations

A Workspace may define reusable integration configurations.

However, secrets and project-specific credentials must remain scoped appropriately.

A global provider configuration must not automatically grant a project access to every provider secret.

---

# 73. Workspace and Deployments

Workspace policies may determine which users or agents can deploy to:

```text
Preview
Staging
Production
```

Storage persists configuration.

Security enforces it.

Deployment Provider executes it.

---

# 74. Workspace and Audit

Audit records must retain Workspace association when applicable.

This allows:

```text
Workspace Audit
Project Audit
Agent Audit
Deployment Audit
```

without mixing unrelated tenants.

---

# 75. Workspace Export

The system may eventually export Workspace-level configuration.

Export must distinguish:

```text
Metadata
Configuration
Components
Integrations
Secrets
```

Secrets must not be exported as ordinary configuration.

---

# 76. Import

Workspace or Project import must validate schema versions before persistence.

An import must not silently overwrite existing resources with the same identity.

Conflicts must be explicit.

---

# 77. Data Migration

When Nexo changes its internal model, the migration must preserve:

```text
Project Identity
Workspace Relationships
Component Versions
Audit Integrity
Deployment References
```

where possible.

Migration tests are mandatory.

---

# 78. Disaster Recovery

Nexo must eventually define recovery objectives for critical internal data.

At minimum, identify recovery requirements for:

```text
Workspace
Project Registrations
Component Library
AI Tasks
Audit
Deployment Metadata
```

The Source Project has independent disaster recovery through filesystem/Git/provider mechanisms.

---

# 79. Acceptance Criteria

Workspace and Storage are correctly implemented when:

1. Workspace is a stable organizational boundary.
2. Multiple Workspaces are supported by the data model.
3. Projects have stable Nexo identities.
4. Source location is separate from Project identity.
5. Nexo metadata is separate from Source Project files.
6. Git is not replaced by metadata.
7. Deployment state is not replaced by metadata.
8. AI state is persisted independently from the browser.
9. Jobs can survive browser disconnects.
10. Machine identities can be persisted securely.
11. Component Library resources can be versioned.
12. Media metadata can be indexed.
13. Audit records are separate from ordinary logs.
14. Secrets are stored separately from ordinary metadata.
15. Caches can be invalidated and rebuilt.
16. Schema versions and migrations exist.
17. Workspace isolation is enforced.
18. Search respects authorization.
19. Project removal does not automatically delete source.
20. Storage failures are represented explicitly.
21. Source availability and storage availability remain distinguishable.
22. Local and remote Nexo deployment are both architecturally possible.
23. Persistence can evolve without rewriting Domain logic.

---

# 80. K3 Swarm Implementation Protocol

Before implementing Workspace and Storage, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `04-RUNTIME-AND-SECURITY.md`.
3. Read `05-NEXO-ENGINE.md`.
4. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
5. Read `11-AI-ENGINE-AND-LUNA.md`.
6. Read this document completely.
7. Identify all persistent entities.
8. Define ownership and relationships.
9. Define schema versions.
10. Define migrations.
11. Define local deployment strategy.
12. Define remote deployment strategy.
13. Research official documentation for the selected storage technology.
14. Implement repository boundaries.
15. Implement Workspace isolation.
16. Implement concurrency handling.
17. Implement backup/restore strategy appropriate to the deployment.
18. Test deletion and recovery behavior.
19. Verify no source-project files are modified directly by Storage.
20. Verify all sensitive data is handled through the Security model.

---

# 81. Final Principle

Nexo Storage exists to remember what Nexo needs to operate.

It does not replace reality.

The architecture is:

```text
                    NEXO STORAGE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Workspace        Project          Library
    Metadata        Registration      Metadata
        │                │                │
        └────────────────┼────────────────┘
                         │
                    NEXO ENGINE
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      SOURCE          GIT           PROVIDER
      PROJECT         STATE           STATE
```

The defining rule is:

> **Nexo stores what Nexo owns. The real project, Git repository and external providers remain the authorities over the resources they own.**

The storage layer must make Nexo persistent without turning its metadata into a fictional version of the project.

```
```
