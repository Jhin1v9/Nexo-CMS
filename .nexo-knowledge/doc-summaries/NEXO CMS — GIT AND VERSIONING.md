````md
# NEXO CMS — GIT AND VERSIONING

## 1. Document Status

**Document:** `10-GIT-AND-VERSIONING.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the Git and version-control subsystem of Nexo CMS.

Git is a mandatory architectural capability of Nexo.

Nexo must work with real Git repositories and real Git state.

The platform must not create a fake version-control layer that merely resembles Git.

---

# 2. Objective

The Git subsystem must allow authorized users, AI agents and automations to:

- inspect repository status;
- inspect history;
- inspect diffs;
- create branches;
- switch branches;
- create commits;
- push;
- pull;
- fetch;
- merge;
- rebase;
- stash;
- revert;
- reset;
- clone;
- configure remotes;
- create repositories through supported Git providers.

All operations must work against the actual repository.

---

# 3. Core Principle

Git is a version-control system external to Nexo.

Nexo is a consumer and coordinator of Git capabilities.

The architecture is:

```text
Human / AI / CLI / Automation
            ↓
       Nexo Git API
            ↓
        Git Service
            ↓
      Authorization
            ↓
          Runtime
            ↓
      Real Git Repository
            ↓
     Git Remote Provider
````

---

# 4. Git Is Mandatory

Every managed Nexo project must have a defined Git relationship.

The project may initially be:

```text
Git Repository
Git Repository Parent
Git Repository Not Yet Initialized
```

But the Nexo project workflow must treat version control as a mandatory concern.

If a project is not currently under Git, Nexo must represent that state explicitly.

The system must not silently claim version control exists when it does not.

---

# 5. Project and Repository Are Different

A Nexo Project is not the same thing as a Git Repository.

Possible relationship:

```text
Nexo Project
↓
Repository Root
↓
Selected Project Directory
```

A Nexo Project may be:

* the repository root;
* a subdirectory of a repository;
* one application inside a monorepo.

The system must preserve these relationships.

---

# 6. Repository Identity

Where available, Nexo should track repository identity.

Possible metadata:

```text
Repository Root
Remote URLs
Current Branch
HEAD
Repository Provider
Repository Identifier
```

Nexo Project ID must remain separate from Git repository identity.

---

# 7. Git Detection

Git detection must inspect the actual repository.

The system should determine:

```text
Is Git repository?
Repository root
Current branch
HEAD
Working tree status
Remotes
Upstream branch
```

Git state must not come from cached Nexo metadata when actual Git state is available.

---

# 8. Git State

The Git subsystem must represent at least:

```text
CLEAN
MODIFIED
UNTRACKED
STAGED
CONFLICTED
DETACHED_HEAD
REBASE_IN_PROGRESS
MERGE_IN_PROGRESS
CHERRY_PICK_IN_PROGRESS
REVERT_IN_PROGRESS
NO_REPOSITORY
UNKNOWN
```

The implementation may include additional states.

---

# 9. Working Tree

The working tree is the real filesystem state compared to Git.

The Nexo must distinguish:

```text
Untracked
Modified
Deleted
Renamed
Copied
Staged
Unmerged
```

Do not reduce all changes to a simple `dirty` flag.

---

# 10. Git Status

`git.status` must provide structured state.

Conceptually:

```text
Branch
HEAD
Tracking Branch
Ahead
Behind
Staged Changes
Unstaged Changes
Untracked Files
Conflicts
Repository State
```

The exact schema is defined by the Control Plane implementation.

---

# 11. Git Diff

Diff must expose the actual difference between states.

Supported comparisons may include:

```text
Working Tree vs HEAD
Staged vs HEAD
Branch vs Branch
Commit vs Commit
Commit vs Parent
```

The Nexo must not generate approximate diffs from editor history when actual Git diff data is available.

---

# 12. Nexo Diff vs Git Diff

These are different concepts.

```text
Editor Diff
→ Changes represented by the Nexo editing system

Git Diff
→ Actual repository difference
```

They may correspond, but they must not be treated as identical.

---

# 13. Change Origin

Nexo should preserve the origin of important changes when possible.

Example:

```text
Change Origin:
Human
AI
CLI
Generated Component
External Tool
```

Git itself remains authoritative for actual repository history.

Nexo origin metadata must not alter Git semantics.

---

# 14. Branch Model

The Git subsystem must support:

```text
List Branches
Create Branch
Delete Branch
Switch Branch
Track Remote Branch
Get Current Branch
```

Branch operations must use actual Git.

---

# 15. Branch Creation

Creating a branch must define:

```text
Source Revision
New Branch Name
Checkout Behavior
```

The system must validate the requested branch name according to Git rules.

---

# 16. Branch Switching

Before switching branches, Nexo must inspect local modifications.

If switching would cause data loss or conflict, it must not silently discard changes.

Possible results:

```text
SWITCHED
BLOCKED
CONFLICT
REQUIRES_STASH
REQUIRES_COMMIT
```

---

# 17. Branch Deletion

Branch deletion is potentially destructive.

The system should distinguish:

```text
Delete Local Branch
Delete Remote Branch
Force Delete
```

Force deletion must be a separate high-risk capability.

---

# 18. Detached HEAD

Detached HEAD must be represented explicitly.

The UI and AI must not assume that the project has a normal branch when detached.

---

# 19. Commit

Commit is a real Git operation.

Flow:

```text
Review Changes
↓
Authorization
↓
Validate Repository
↓
Stage Selected Changes
↓
Create Commit
↓
Verify Commit
↓
Return Commit Result
```

The Nexo must not report a successful commit until Git confirms it.

---

# 20. Commit Scope

The user or agent must be able to determine what will be committed.

The system should expose:

```text
All Changes
Selected Files
Selected Hunk(s) where supported
```

The default must not silently commit unrelated work.

---

# 21. Commit Message

Commit message must be explicit.

Nexo may help generate a commit message through AI, but:

```text
AI-generated message
≠
automatic authorization to commit
```

The actual commit remains a Git operation governed by permissions and policy.

---

# 22. Commit Attribution

Where appropriate, the commit may retain standard Git author/committer information.

Nexo audit metadata may separately record:

```text
Requested By
Executed By
```

Do not alter Git identity semantics without explicit configuration.

---

# 23. AI Commit

An AI agent may create a commit when:

* it has `git.commit` permission;
* policy permits it;
* required validation is satisfied;
* any required approval is completed.

The AI must use the Git Service, not arbitrary shell commands as its normal Git control path.

---

# 24. Push

Push must be a separate operation from commit.

A successful commit does not imply a successful push.

Possible sequence:

```text
Commit
→ SUCCESS

Push
→ FAILED
```

The final state must preserve both results.

---

# 25. Push Permissions

The system should distinguish:

```text
git.push
git.forcePush
```

Force push must never be implicitly included in ordinary push permission.

---

# 26. Pull

Pull combines remote synchronization and local branch state.

Before pulling, the Git Service should inspect:

```text
Working Tree
Current Branch
Tracking Branch
Remote State
```

The operation must not silently overwrite local changes.

---

# 27. Fetch

Fetch updates local remote references without necessarily modifying the working tree.

The Nexo should expose fetch separately from pull.

---

# 28. Remote

A repository may contain multiple remotes.

The system should support:

```text
List Remotes
Add Remote
Update Remote
Remove Remote
Select Remote
```

Remote URLs may contain sensitive information.

Credentials must never be exposed in logs.

---

# 29. GitHub Integration

GitHub is an external Git provider.

The Git subsystem must distinguish:

```text
Git Engine
```

from:

```text
GitHub API
```

Git operations such as commit remain Git operations.

GitHub-specific operations may include:

```text
Create Repository
Inspect Repository
Configure Remote
List Branches
Create Branch
```

when supported by the provider.

---

# 30. Repository Creation

Nexo should eventually support:

```text
Create Local Repository
Create Remote Repository
Create Local + Remote Relationship
```

Repository creation must be explicit.

The system must not create public repositories by accident.

---

# 31. Repository Visibility

When an external provider supports visibility settings, Nexo must represent:

```text
Public
Private
Internal
Provider-Specific
```

The provider's actual capabilities must be verified before implementation.

---

# 32. Git Provider Authentication

Git providers must use explicit authentication mechanisms.

Potential methods include:

```text
OAuth
Personal Access Token
SSH
Provider Credential
Service Identity
```

The actual integration must follow current provider documentation.

Do not invent authentication flows.

---

# 33. Credential Security

Git credentials must not be exposed in:

* logs;
* audit;
* AI context;
* terminal output where avoidable;
* error messages.

Credentials should be stored through the appropriate secret mechanism.

---

# 34. Merge

Merge must be a distinct operation.

Flow:

```text
Validate Repository
↓
Check Working Tree
↓
Select Source Branch
↓
Execute Merge
↓
Detect Conflicts
↓
Validate Result
```

The result must distinguish:

```text
MERGED
CONFLICT
FAILED
```

---

# 35. Merge Conflicts

Conflict state must be explicit.

The Git subsystem should expose:

```text
Conflicted Files
Conflict Markers
Affected Branches
Operation in Progress
```

The system must not claim the merge completed while conflicts remain unresolved.

---

# 36. Rebase

Rebase is a higher-risk Git operation.

It must be separately authorized.

The system must expose:

```text
Rebase Started
Rebase In Progress
Conflict
Rebase Completed
Rebase Aborted
```

---

# 37. Stash

The Git system may support:

```text
stash
stash list
stash apply
stash pop
stash drop
```

Stash operations must remain real Git operations.

---

# 38. Revert

Revert creates a new Git change that reverses a previous commit.

It must not be confused with:

```text
reset
```

The UI and AI must represent this difference clearly.

---

# 39. Reset

Reset is potentially destructive and must be subdivided conceptually:

```text
Soft
Mixed
Hard
```

`hard` reset must require elevated authorization or explicit confirmation.

The system must not perform destructive reset as a side effect of recovery.

---

# 40. Cherry-Pick

Cherry-pick may be supported as an advanced Git capability.

It must expose conflict state if the selected commit cannot be applied cleanly.

---

# 41. History

Git history must read from actual Git.

It may include:

```text
Commit Hash
Author
Committer
Message
Date
Parents
Branch References
```

---

# 42. Commit Detail

A commit detail view should allow inspecting:

```text
Commit
Parent
Changed Files
Diff
Author
Message
```

When permissions permit.

---

# 43. Git Log and AI

AI may consume structured history.

Example:

```text
Recent commits
Current branch
Uncommitted changes
Last deployment commit
```

AI should receive the minimum history relevant to its task rather than the entire repository history by default.

---

# 44. Branch Protection

Some repositories may have branch protection enforced by the provider.

Nexo must not assume local permissions imply remote permission.

Example:

```text
Local git.push
→ SUCCESS

Remote provider
→ DENIED
```

This must be represented accurately.

---

# 45. Remote State

The Nexo should distinguish:

```text
LOCAL
REMOTE
AHEAD
BEHIND
DIVERGED
UNKNOWN
```

The UI and AI must not claim synchronization when the repository is diverged.

---

# 46. Git Synchronization

A synchronized project may conceptually be:

```text
Working Tree Clean
+
Local Branch Matches Tracking Branch
```

However, the exact definition of “synced” must use actual Git state.

---

# 47. Git Operation Safety

Before destructive operations, inspect:

```text
Working Tree
Branch
Current Operation
Uncommitted Changes
Tracking Branch
Conflicts
```

Do not execute blindly because a user clicked a button or AI requested an action.

---

# 48. Git + Editor

The Editor may show Git state, but Git remains the authority.

After saving a file:

```text
Editor:
Saved

Git:
Modified
```

This is expected.

`Saved` does not mean `Committed`.

---

# 49. Git + Project Intelligence

After:

```text
Checkout
Merge
Rebase
Reset
Pull
```

Project Intelligence may become stale.

The system must refresh affected project intelligence.

---

# 50. Git + Adapters

Git operations are stack-independent.

Adapters may provide information about:

* generated files;
* source files;
* build artifacts.

But Git remains responsible for repository state.

---

# 51. Git + Runtime

Git operations may execute through the Runtime.

The Git Service is responsible for:

* command semantics;
* state interpretation;
* authorization;
* structured result.

Runtime is responsible for process execution.

---

# 52. Git + AI

AI must interact with Git through structured Git capabilities.

Preferred:

```text
AI
↓
git.status
git.diff
git.commit
git.push
```

Not:

```text
AI
↓
arbitrary shell command
↓
git commit ...
```

The latter may still be possible through explicit terminal permissions, but it is not the preferred Git control path.

---

# 53. Git + Automation

Automation must use machine identities.

Example:

```text
CI Agent
↓
git.fetch
↓
runtime.test
↓
git.commit
```

The permissions must be scoped to the automation workflow.

---

# 54. Git Hooks

Projects may contain Git hooks.

The Nexo must account for the possibility that a Git operation triggers project-defined hooks.

This affects:

* security;
* execution time;
* command output;
* environment.

The agent must verify actual Git behavior and document the chosen handling.

---

# 55. Hook Security

Git hooks execute project-controlled code.

Therefore:

```text
git commit
```

may implicitly execute local project logic.

Nexo security policy must account for this.

An apparently simple Git operation may therefore require Runtime permissions.

---

# 56. Commit Validation

Before commit, Nexo may optionally run configured validation such as:

```text
Lint
Typecheck
Tests
Build
Formatting
```

The actual validation set is project-specific.

The system must not assume every project uses all of them.

---

# 57. Pre-Commit Hooks

If the repository has pre-commit hooks, Git may execute them.

Nexo must report hook failures separately from Git argument validation errors where possible.

---

# 58. Commit Verification

After commit, verify:

```text
HEAD
Commit Hash
Working Tree State
Branch
```

when possible.

Do not trust only the command process exit status if the operation contract requires additional confirmation.

---

# 59. Push Verification

After push, verify according to the provider/Git result:

```text
Remote Reference
Tracking State
Push Result
```

The system must report remote rejection clearly.

---

# 60. Pull Verification

After pull, verify:

```text
Current HEAD
Working Tree
Conflict State
Branch State
```

and trigger Project Intelligence reconciliation when needed.

---

# 61. Remote URL Security

URLs may contain embedded credentials in poorly configured repositories.

Nexo must redact credentials when displaying remote URLs.

Prefer displaying normalized/sanitized remote information.

---

# 62. Git Errors

Git errors should be classified.

Examples:

```text
RepositoryNotFound
BranchNotFound
RemoteNotFound
AuthenticationFailed
PermissionDenied
MergeConflict
RebaseConflict
WorkingTreeDirty
NoTrackingBranch
NonFastForward
HookFailed
InvalidReference
UnknownGitError
```

---

# 63. Git Error Machine Readability

Error output must be structured enough for AI agents to determine whether they should:

```text
Retry
Fetch
Pull
Resolve Conflict
Ask for Approval
Change Branch
Stop
```

Agents must not be required to parse arbitrary terminal screenshots.

---

# 64. Operation IDs

Every significant Git operation should have an operation identifier.

This allows tracing:

```text
AI Request
↓
git.commit
↓
Runtime Process
↓
Git Result
↓
Audit
```

---

# 65. Git Jobs

Long-running operations may be represented as Jobs.

Possible examples:

```text
Clone
Fetch Large Repository
Large Push
Rebase
Merge
```

The job must expose progress when meaningful and state when progress cannot be measured.

---

# 66. Git Concurrency

Git state can change between request and execution.

Example:

```text
Read Status
↓
External Commit
↓
Attempt Commit
```

The Git Service must re-check relevant repository state before mutations where necessary.

---

# 67. Optimistic Concurrency

Where useful, operations may include an expected repository state.

Example concept:

```text
Expected HEAD:
abc123

Actual HEAD:
def456
```

The operation should then fail with a conflict instead of silently acting against a changed repository.

---

# 68. Git Snapshots

Nexo may maintain additional snapshots for recovery.

These snapshots are supplementary.

Git remains the version-control authority.

Do not create a second incompatible version history.

---

# 69. Recovery

Git can be a major recovery mechanism.

Before risky operations, Nexo may encourage or require:

```text
Commit
Stash
Snapshot
```

depending on policy.

The system must not claim a recovery point exists if it does not.

---

# 70. Force Operations

High-risk operations must be separately identified:

```text
git.forcePush
git.resetHard
git.branch.deleteForce
```

These must not inherit normal permissions automatically.

---

# 71. Agent Safety

Autonomous AI must obey the same high-risk Git restrictions.

For example:

```text
AI:
git.push
→ allowed

AI:
git.forcePush
→ denied
```

unless explicit policy grants it.

---

# 72. Human Approval for High-Risk Git

Policies may require approval for:

* force push;
* hard reset;
* deleting protected branches;
* rewriting history;
* production branch modifications.

Approval is an additional control, not a replacement for authorization.

---

# 73. Repository Creation through GitHub

When creating a remote repository:

```text
Nexo
↓
Git Provider
↓
Create Repository
↓
Receive Repository Identity
↓
Configure Local Remote
↓
Verify
```

The local repository and remote repository are separate resources.

---

# 74. GitHub Provider Boundary

GitHub-specific API behavior must remain inside the GitHub integration/provider.

The Git Domain should use a generic repository provider contract where possible.

This allows future providers such as:

```text
GitLab
Bitbucket
Gitea
Self-hosted Git
```

without changing the Git Domain fundamentally.

---

# 75. Repository Initialization

If a project is not a Git repository, Nexo may support initialization.

The operation must be explicit.

Example:

```text
Initialize Git Repository
```

must not happen merely because a project is imported.

---

# 76. Git Repository Detection After Initialization

After initialization:

```text
Initialize
↓
Verify .git
↓
Read HEAD / branch state
↓
Update Project Metadata
```

The repository must be confirmed before Nexo reports Git enabled.

---

# 77. Branch Naming

Nexo may suggest branch names, including AI-generated names.

Suggestions must not bypass Git naming validity.

Final branch creation must use actual Git validation.

---

# 78. Commit Message Generation

AI may generate commit messages based on actual diffs.

The generated message must reflect real changes.

The AI must not fabricate changes that do not exist.

---

# 79. AI Git Context

AI Git context should include only information necessary for the task.

Examples:

```text
Current branch
Status
Relevant diff
Recent commits
Upstream state
Conflict state
```

Do not expose unnecessary secrets or unrelated repository history.

---

# 80. Git API Entry Points

The Git system should provide programmatic entry points for all supported operations.

Minimum:

```text
git.status
git.diff
git.history
git.branch.list
git.branch.create
git.branch.switch
git.branch.delete
git.commit
git.push
git.pull
git.fetch
```

Advanced:

```text
git.merge
git.rebase
git.stash
git.revert
git.reset
git.cherryPick
```

High-risk:

```text
git.forcePush
git.resetHard
git.branch.deleteForce
```

must have explicit permissions.

---

# 81. Acceptance Criteria

The Git subsystem is correctly implemented when:

1. Git state comes from real Git.
2. Repository identity is distinct from Nexo Project identity.
3. Working tree states are represented accurately.
4. Branches can be managed.
5. Commits can be created.
6. Commit scope is visible.
7. Push and commit are separate operations.
8. Pull and fetch are separate operations.
9. Remote state can be inspected.
10. Merge conflicts are represented.
11. Rebase conflicts are represented.
12. High-risk operations have separate permissions.
13. Git credentials are protected.
14. GitHub/other providers remain separate from Git Engine logic.
15. AI can execute authorized Git operations programmatically.
16. UI and AI use the same Git Service.
17. Git changes can trigger Project Intelligence refresh.
18. Hooks and their side effects are accounted for.
19. Git failures are structured.
20. Git operations are auditable.
21. Git recovery behavior is explicit.
22. No fake version-control system replaces Git.

---

# 82. K3 Swarm Implementation Protocol

Before implementing the Git subsystem, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `04-RUNTIME-AND-SECURITY.md`.
3. Read `05-NEXO-ENGINE.md`.
4. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
5. Inspect the actual Git version available in the target environment.
6. Consult current official Git documentation for version-specific behavior.
7. Implement structured Git commands and results.
8. Implement repository and branch detection.
9. Implement status and diff.
10. Implement commit.
11. Implement remote synchronization.
12. Implement conflict handling.
13. Implement high-risk operation permissions.
14. Implement Git provider abstraction.
15. Test against real repositories and temporary fixture repositories.
16. Test AI access through the same Git Service.
17. Verify that no Git capability depends on UI automation.
18. Test failure, cancellation and external-change scenarios.

---

# 83. Final Principle

Git in Nexo is not a visual imitation of Git.

It is a real integration with real repositories.

The architecture is:

```text
                    HUMAN / AI / CLI
                           │
                        GIT API
                           │
                      GIT SERVICE
                           │
                  AUTHORIZATION
                           │
                         RUNTIME
                           │
                       REAL GIT
                           │
                  ┌────────┴────────┐
                  │                 │
             LOCAL REPO        REMOTE PROVIDER
                                  │
                         GitHub / GitLab /
                         Bitbucket / etc.
```

The defining rule is:

> **Nexo may make Git easier to use, easier to understand and easier for AI to control, but it must never replace Git's actual repository state, history or semantics with a fake abstraction.**

```
```
