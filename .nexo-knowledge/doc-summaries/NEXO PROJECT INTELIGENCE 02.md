````md
# NEXO CMS — PROJECT INTELLIGENCE

## 1. Document Status

**Document:** `02-PROJECT-INTELLIGENCE.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the engineering behavior required for project discovery, technology detection, project modeling and project understanding.

This document defines how the Nexo CMS receives a real project, analyzes it, constructs an internal representation and determines what it understands before allowing editing or automation.

The system must never treat an unknown project as if it were a known project.

---

# 2. Objective

Project Intelligence is responsible for answering:

> **“What is this project, how is it structured, what technologies does it use, and what can Nexo safely do with it?”**

The system must analyze projects without requiring the project to be converted into a Nexo-specific architecture.

The result must allow the Nexo to understand projects across different stacks while preserving their original implementation.

---

# 3. Core Pipeline

The standard project intelligence pipeline is:

```text
SELECT SOURCE
    ↓
VALIDATE LOCATION
    ↓
SCAN FILESYSTEM
    ↓
IDENTIFY PROJECT ROOT
    ↓
DETECT TECHNOLOGIES
    ↓
DETECT VERSIONS
    ↓
DETECT PACKAGE MANAGER
    ↓
DETECT BUILD / DEV / TEST COMMANDS
    ↓
DETECT GIT
    ↓
DETECT ROUTES
    ↓
DETECT PAGES / LAYOUTS
    ↓
DETECT COMPONENTS
    ↓
DETECT STYLES
    ↓
DETECT ASSETS
    ↓
BUILD PROJECT MODEL
    ↓
BUILD PROJECT GRAPH
    ↓
CALCULATE SUPPORT / CONFIDENCE
    ↓
PERSIST NEXO METADATA
    ↓
PROJECT READY / REVIEW REQUIRED / PARTIALLY SUPPORTED
````

The exact stages may execute incrementally or in parallel where dependencies allow.

The final result must remain deterministic and explainable.

---

# 4. Non-Destructive Discovery

Project discovery must be non-destructive by default.

Scanning must not automatically:

* modify source files;
* migrate framework;
* install dependencies;
* update packages;
* initialize Git;
* rewrite configuration;
* generate components;
* generate Nexo-specific source files.

Discovery is analysis.

Modification belongs to separate operations.

---

# 5. Project Source

The intelligence system must accept a project source through a Runtime-accessible location.

Possible environments:

```text
Local Filesystem
Remote Runtime Filesystem
Mounted Workspace
VPS Filesystem
```

Project Intelligence must not assume that the project is physically located on the same machine as the browser.

The Runtime provides the actual filesystem boundary.

---

# 6. Project Root Detection

The system must determine the effective project root before deep analysis.

Evidence may include:

```text
package.json
pnpm-workspace.yaml
yarn.lock
package-lock.json
bun.lock
bun.lockb
vite.config.*
next.config.*
nuxt.config.*
astro.config.*
svelte.config.*
tsconfig.json
jsconfig.json
Cargo.toml
pyproject.toml
composer.json
Gemfile
go.mod
index.html
.git
```

The list is not exhaustive.

The detector must use multiple signals rather than assuming a single filename defines the root.

---

# 7. Monorepo Detection

The detector must recognize when the selected directory contains multiple projects or packages.

Possible indicators:

```text
workspaces
pnpm-workspace.yaml
lerna.json
turbo.json
nx.json
multiple package.json files
apps/
packages/
services/
```

A monorepo must not automatically be flattened into one project.

The system must represent the repository hierarchy.

Conceptually:

```text
Repository
├── App A
├── App B
├── Package A
└── Package B
```

---

# 8. Project Root Ambiguity

If multiple plausible project roots are detected, the system must not silently choose one when that choice affects editing.

It should:

1. detect candidate roots;
2. calculate confidence;
3. select only when confidence is sufficient;
4. otherwise request user confirmation.

---

# 9. Filesystem Scanner

The scanner must traverse the source project through a Runtime filesystem capability.

The scanner must collect at least:

```text
Path
Type
Size
Extension
Modification Time when available
Relative Path
Parent
Hash when required
```

The scanner may collect additional metadata when useful.

---

# 10. Exclusion Rules

The scanner must avoid unnecessary traversal of directories known to contain generated or dependency-heavy data.

Common examples may include:

```text
node_modules
.git/objects
.cache
.next/cache
.nuxt
dist
build
coverage
tmp
vendor
```

However, exclusions must be technology-aware.

A directory must not be excluded simply because its name is common.

The scanner must preserve the ability to inspect generated output when a specific diagnostic operation requires it.

---

# 11. Symlinks

Symlink handling must be explicit.

The system must not blindly follow arbitrary symlinks because they can:

* escape the project root;
* create cycles;
* expose unrelated files;
* increase scan size.

The scanner must have a defined symlink policy.

The chosen implementation must be compatible with the operating system and Runtime.

---

# 12. Ignore Files

The scanner should recognize project-defined ignore mechanisms such as:

```text
.gitignore
.npmignore
.prettierignore
.eslintignore
```

but must not assume that every ignore file means “never inspect”.

Ignore semantics depend on the operation.

For example:

```text
Git status
```

and:

```text
Project security scan
```

may require different traversal policies.

---

# 13. File Classification

Files should be classified where possible.

Examples:

```text
Source
Configuration
Dependency Manifest
Lockfile
Style
Asset
Documentation
Generated
Test
Build Output
Git Metadata
Unknown
```

Classification is metadata.

It must not be treated as absolute truth when the implementation cannot establish the type with sufficient confidence.

---

# 14. Stack Detection

Stack detection must identify technologies using multiple sources of evidence.

Possible evidence:

```text
Dependency Manifest
Lockfiles
Configuration Files
Scripts
Directory Structure
File Extensions
Source Patterns
Build Commands
Framework Signatures
```

The detector should not depend on a single heuristic whenever multiple signals are available.

---

# 15. Detection Confidence

Every significant detection should be associated with a confidence level when ambiguity is possible.

Conceptual values:

```text
CONFIRMED
HIGH
MEDIUM
LOW
UNKNOWN
```

The exact representation is implementation-defined.

Example:

```text
Framework:
Next.js
Confidence:
CONFIRMED

Styling:
Tailwind
Confidence:
HIGH
```

---

# 16. Detection Evidence

For important detections, the system should retain evidence.

Example:

```text
Technology:
Next.js

Evidence:
next dependency in package.json
next.config.js detected
app/ directory detected
next scripts detected
```

This evidence is important for:

* debugging;
* AI reasoning;
* user review;
* adapter selection;
* future re-analysis.

---

# 17. Version Detection

When possible, the system must determine actual installed versions.

Sources may include:

```text
package.json
lockfile
installed package metadata
configuration
runtime inspection
```

The system must distinguish:

```text
Declared Version
Resolved Version
Installed Version
```

when those values differ.

---

# 18. Package Manager Detection

The system should detect package manager using reliable signals.

Examples:

```text
package-lock.json → npm
pnpm-lock.yaml → pnpm
yarn.lock → yarn
bun.lock / bun.lockb → bun
```

The system should also inspect project configuration and available commands when ambiguity remains.

Do not assume `npm` merely because `package.json` exists.

---

# 19. Package Manager Priority

When multiple package-manager indicators exist, the system must detect the conflict.

Example:

```text
package-lock.json
pnpm-lock.yaml
```

must not result in silent selection without evaluating the project state.

The user may need to confirm the intended manager.

---

# 20. Dependency Analysis

Dependency analysis should identify:

* direct dependencies;
* development dependencies;
* peer dependencies when relevant;
* package versions;
* workspace dependencies;
* local packages;
* package manager;
* lockfile.

The analyzer should distinguish declared dependencies from actually installed dependencies when possible.

---

# 21. Framework Detection

Framework detection must be implemented through extensible detection rules.

Initial framework targets:

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

The architecture must allow additional frameworks to be added without rewriting the Project Intelligence core.

---

# 22. Styling Detection

The system must detect the project's actual styling strategy.

Potential strategies:

```text
Tailwind
CSS Modules
styled-components
Emotion
CSS Variables
Plain CSS
SCSS / Sass
PostCSS
Utility Classes
Inline Styles
Mixed
Unknown
```

The system must support projects using multiple styling systems.

Example:

```text
Tailwind + CSS Modules
```

must not be forced into a single styling category.

---

# 23. Build Detection

The system must identify the project's build mechanism.

Possible evidence:

```text
package.json scripts
framework configuration
build configuration
tool-specific files
workspace configuration
```

The result must contain, where possible:

```text
Build Command
Build Tool
Expected Output
Environment Requirements
```

Do not assume:

```text
npm run build
```

for every project.

---

# 24. Development Command Detection

The system should detect the correct development command.

Examples may include:

```text
npm run dev
pnpm dev
yarn dev
bun dev
npm start
custom script
```

The command must come from project evidence or explicit configuration.

---

# 25. Test Command Detection

The system should identify project testing mechanisms when available.

Possible examples:

```text
npm test
vitest
jest
playwright
cypress
custom test script
```

The system should distinguish between:

```text
Unit Tests
Integration Tests
End-to-End Tests
Visual Tests
```

when sufficient evidence exists.

---

# 26. Lint / Typecheck Detection

When available, identify:

```text
Lint Command
Typecheck Command
Formatting Command
```

Examples:

```text
eslint
prettier
tsc
vue-tsc
svelte-check
```

The detector must not assume that every project has these tools.

---

# 27. Git Detection

The system must detect whether the project is inside a Git repository.

It should determine, where possible:

```text
Repository Root
Current Branch
Working Tree State
Remotes
HEAD
Repository Status
```

Git detection must use the actual Git state, not a metadata approximation.

---

# 28. Git Repository Boundary

A selected project may be:

```text
Inside Repository
Repository Root
Subdirectory of Monorepo
Not a Git Repository
```

The model must preserve this distinction.

A folder selected by the user is not necessarily the Git repository root.

---

# 29. Route Detection

Route detection must be adapter-driven.

The Project Intelligence system should identify routes through framework-specific conventions.

Examples may include:

```text
Next.js App Router
Next.js Pages Router
Nuxt Pages
SvelteKit Routes
Astro Pages
Vue Router
React Router
Static HTML paths
```

The core intelligence system must not hardcode all routing conventions.

Adapters own framework-specific route interpretation.

---

# 30. Page Detection

Pages must be represented separately from physical files when possible.

A page may consist of:

```text
Route
Page Source
Layout
Template
Metadata
Components
```

The Project Model must preserve relationships between these entities.

---

# 31. Layout Detection

The system should detect shared layouts when the framework provides explicit mechanisms.

Examples:

```text
Next.js layouts
Nuxt layouts
SvelteKit layouts
Vue layout systems
Project-level templates
```

Layout detection must remain adapter-specific.

---

# 32. Component Detection

Component detection must identify reusable UI units where evidence exists.

Possible evidence:

```text
React components
Vue components
Svelte components
Web Components
Framework-specific component files
Known component directories
Component exports
```

Directory names alone are not enough to guarantee a component.

Example:

```text
components/
```

is evidence, not proof that every file inside is a valid component.

---

# 33. Component Confidence

Detected components should include confidence.

Example:

```text
Component:
Hero.tsx

Confidence:
HIGH

Evidence:
React component export
JSX return
Imported by page
```

This allows later editing operations to distinguish reliable detections from uncertain ones.

---

# 34. Style Detection

The intelligence engine should identify where styles originate.

Possible sources:

```text
CSS file
SCSS
CSS Module
Tailwind utility classes
Styled Components
Emotion
Inline style
CSS Variables
Framework-specific style system
```

A component may use multiple style sources.

---

# 35. Token Detection

The system should attempt to detect reusable design values such as:

```text
CSS Variables
Tailwind Theme
Theme Objects
Design Tokens
Constants
Shared Style Maps
```

The detection must preserve the original source representation.

Do not convert tokens into a Nexo-specific format solely for convenience.

---

# 36. Asset Detection

The system should identify assets including:

```text
Images
SVG
GIF
Video
Audio
Fonts
PDF
Other static resources
```

Possible source locations include:

```text
public
static
assets
src/assets
media
uploads
framework-specific public directories
```

The actual asset root must be determined from project context.

---

# 37. Asset References

The Project Graph should represent references between assets and consumers when reliably detectable.

Example:

```text
hero.webp
    ↓
Hero Component
    ↓
Home Page
```

References are important for:

* replacement;
* deletion;
* impact analysis;
* unused asset detection.

---

# 38. External Asset References

The system must distinguish local assets from external resources.

Examples:

```text
Local Image
Remote CDN Image
External URL
Data URI
Imported Asset
Generated Asset
```

A remote image must not be treated as a local asset merely because it appears in source code.

---

# 39. Configuration Detection

The analyzer should detect relevant configuration files.

Examples:

```text
tsconfig.json
jsconfig.json
eslint.config.*
prettier.config.*
vite.config.*
next.config.*
nuxt.config.*
astro.config.*
svelte.config.*
postcss.config.*
tailwind.config.*
```

The list is extensible.

Configuration files must be associated with the relevant adapter or tool.

---

# 40. Environment Detection

The system should detect environment-related configuration without exposing secrets.

It may identify:

```text
.env
.env.local
.env.development
.env.production
```

but secret values must not automatically enter:

* Project Model;
* AI context;
* logs;
* audit entries.

The system should represent the existence and names of configuration variables where appropriate without exposing their values.

---

# 41. Script Detection

The system should inspect declared scripts.

For package-based projects this may include:

```text
dev
build
start
test
lint
typecheck
format
preview
```

Scripts are evidence.

Their names must not be interpreted as guaranteed semantics without considering actual command contents.

---

# 42. Runtime Requirements Detection

Project Intelligence should identify, where possible:

```text
Node Version
Python Version
Java Version
PHP Version
Other Runtime Requirements
```

The actual runtime detection strategy depends on the project technology.

---

# 43. Project Type Detection

A project may be classified broadly as:

```text
Web Application
Static Website
Component Library
Monorepo
Package
Backend Service
Full-stack Application
Documentation Site
Unknown
```

This classification is informational and must not limit future operations unless an adapter requires such a limitation.

---

# 44. Unsupported Project Handling

When the system encounters a project it cannot safely understand, it must not pretend compatibility.

Possible status:

```text
FULLY_SUPPORTED
PARTIALLY_SUPPORTED
DETECTED_BUT_UNSUPPORTED
UNKNOWN
CUSTOM
```

The user must be able to see the limitation.

---

# 45. Custom Stack

A user must be able to provide manual project information when automatic detection is incomplete.

Manual information may include:

```text
Framework
Framework Version
Styling System
Package Manager
Build Command
Development Command
Test Command
Project Root
Custom Adapter
```

Manual configuration must be persisted separately from automatic detection.

---

# 46. Automatic vs Manual Configuration

The system must distinguish:

```text
Detected Value
User Confirmed Value
User Override
Unknown
```

A confirmed user value should override conflicting automatic detection until explicitly changed or invalidated according to documented rules.

---

# 47. Adapter Selection

After detection, the system must determine which adapters apply.

A project may require multiple adapters.

Example:

```text
Next.js Adapter
+
TypeScript Adapter
+
Tailwind Adapter
+
pnpm Adapter
```

Adapter composition is preferred over creating one enormous framework-specific adapter containing every concern.

---

# 48. Adapter Compatibility

The intelligence layer must verify adapter compatibility with the detected project.

Possible outcomes:

```text
Compatible
Partially Compatible
Conflict
Unsupported
Unknown
```

An adapter must not be used as fully compatible merely because its framework name matches.

Version and project configuration can change compatibility.

---

# 49. Version-Aware Detection

A technology identifier without version information may be insufficient.

Example:

```text
Next.js
```

may need to become:

```text
Next.js
Version:
actual detected version
```

when version affects:

* routing;
* configuration;
* build;
* component structure;
* API behavior.

---

# 50. Project Model Structure

At minimum, the Project Model should be capable of representing:

```text
Project
├── Identity
├── Source
├── Stack
├── Adapters
├── Runtime
├── Package Manager
├── Build
├── Development
├── Tests
├── Git
├── Routes
├── Pages
├── Layouts
├── Components
├── Styles
├── Assets
├── Integrations
└── Diagnostics
```

The exact serialization schema belongs to the implementation and later project-model contracts.

---

# 51. Project Identity

The Project Model should distinguish:

```text
Nexo Project ID
Source Path
Source Root
Git Repository ID when available
Workspace ID
Project Name
```

Nexo Project ID must not be confused with filesystem path or Git repository identity.

---

# 52. Project Fingerprint

The system should have a way to identify whether the current filesystem still represents the analyzed project.

Possible mechanisms include:

```text
Project Root
Key Configuration Hash
File Metadata
Repository Identity
Selected File Hashes
```

The implementation must choose a robust strategy.

It must not depend on one timestamp alone.

---

# 53. Incremental Re-Analysis

The system should avoid rebuilding the entire Project Model after every small change.

It should be able to re-analyze affected areas when feasible.

Example:

```text
Component file changed
↓
Re-analyze component
↓
Update affected graph edges
↓
Invalidate dependent context
```

A full scan remains available as a recovery mechanism.

---

# 54. Change Detection

Project Intelligence must be able to detect relevant changes.

Sources may include:

```text
Filesystem watcher
Git status
Manual refresh
External command
Project reopening
Runtime restart
```

The implementation may combine several mechanisms.

---

# 55. Full Re-Scan

The system must provide a full project re-scan capability.

It is required for recovery from:

* corrupted metadata;
* major branch changes;
* framework migration;
* significant external modifications;
* adapter updates.

---

# 56. Analysis Lifecycle

Project analysis should expose states such as:

```text
NOT_ANALYZED
SCANNING
ANALYZING
READY
PARTIAL
REVIEW_REQUIRED
FAILED
STALE
```

The exact internal enum may differ, but the semantic states must remain representable.

---

# 57. Analysis Jobs

Large projects may require asynchronous analysis.

An analysis job should report:

```text
Job ID
Progress when measurable
Current Phase
Status
Result
Warnings
Errors
```

The system must not fake progress percentages.

---

# 58. Analysis Warnings

Warnings must be separate from fatal errors.

Examples:

```text
Unknown build command
Multiple package managers detected
Partial framework support
Unknown custom configuration
Unreadable directory
Unsupported file type
```

A project may still be usable despite warnings.

---

# 59. Analysis Errors

Fatal errors prevent reliable completion of the relevant operation.

Examples:

```text
Project root inaccessible
Filesystem permission denied
Runtime unavailable
Corrupted required configuration
```

The system must explain the failure without exposing secrets.

---

# 60. Error Isolation

One unreadable or unsupported file should not necessarily abort the entire project scan.

When possible:

```text
File A → analyzed
File B → analyzed
File C → unreadable
File D → analyzed
```

The result should report the affected file while continuing the scan.

The operation should become partial only when the missing information materially affects project understanding.

---

# 61. Ignore Generated Artifacts Carefully

Generated output should generally not be treated as editable source unless the user explicitly targets it.

Examples:

```text
dist
build
.next
.nuxt
coverage
```

The Project Model should distinguish source from generated output.

---

# 62. Source vs Generated

Files should be classified where possible as:

```text
Source
Generated
Dependency
Metadata
Build Artifact
Unknown
```

AI and visual editing should prefer Source files over generated artifacts.

---

# 63. Dependency Directories

Dependency directories such as `node_modules` should generally not become part of the semantic Source Project Model.

They may still be inspected for:

* installed versions;
* package metadata;
* debugging;
* compatibility.

The analyzer must avoid indexing every dependency file as project source.

---

# 64. Large Files

The analyzer should avoid reading very large files into memory unnecessarily.

Large-file behavior must be defined according to the operation.

A simple metadata scan may not need full content.

A source-editing operation may require targeted reads.

---

# 65. Binary Files

Binary files must not be interpreted as source text.

They should be classified according to available metadata.

Examples:

```text
Image
Video
Font
PDF
Archive
Unknown Binary
```

---

# 66. Encoding

The scanner must detect or safely handle source file encoding.

UTF-8 should be the expected default for modern web projects, but the implementation must not corrupt files with different valid encodings.

---

# 67. Parser Strategy

Project Intelligence should prefer structured parsers when reliable parsing is required.

Examples:

```text
AST
JSON parser
CSS parser
Framework-specific parser
Package manifest parser
```

Regex may be used for limited detection heuristics, but must not be treated as universally reliable source transformation logic.

Project Intelligence is analysis, not unrestricted text replacement.

---

# 68. Source Mapping Preparation

Project Intelligence must collect enough structural information to support future source mapping.

Relevant information may include:

```text
File
Node
Component
Export
Route
Element
Source Location
Line
Column
Parent
```

The actual source map implementation belongs to the Editor specification.

---

# 69. AI Context Preparation

Project Intelligence must provide structured context that AI can consume.

AI context may include:

```text
Project Type
Stack
Versions
Relevant Files
Components
Routes
Styles
Dependencies
Git State
Build State
Known Problems
Adapter Capabilities
```

AI must not automatically receive every file in the project.

Context should be task-relevant.

---

# 70. Context Minimization

When constructing AI context, the system should prefer:

```text
Relevant
Fresh
Structured
Minimal
Sufficient
```

over:

```text
Entire Repository Dump
```

This improves:

* accuracy;
* performance;
* privacy;
* cost;
* reasoning quality.

---

# 71. Project Intelligence Security

The intelligence layer must never expose secret values merely because it is scanning a project.

Examples of sensitive sources:

```text
.env
credentials files
private keys
tokens
service account files
SSH keys
API secrets
```

The system should detect their presence and classify them appropriately without automatically placing their contents into normal analysis results.

---

# 72. Research Requirement

When implementing technology-specific detection rules, the agent must consult current primary documentation when the behavior is version-dependent or insufficiently known.

Examples:

```text
Next.js routing
SvelteKit routing
Nuxt conventions
Astro content/page structure
Vite configuration
Tailwind configuration
Package manager lockfile behavior
```

The agent must inspect the actual installed/project version before applying version-specific rules.

---

# 73. No Invented Detection Rules

An agent must not claim that a technology uses a particular file structure unless supported by:

* official documentation;
* verified project evidence;
* official source code;
* validated fixture.

If uncertain, mark the rule as uncertain and investigate.

---

# 74. Project Intelligence and Adapters

Project Intelligence discovers what is present.

Adapters explain what can be done with what was discovered.

The relationship is:

```text
Project Intelligence
        ↓
Detected Technology
        ↓
Adapter Resolution
        ↓
Adapter Capabilities
```

Project Intelligence must not embed all adapter behavior.

---

# 75. Project Intelligence and Runtime

Project Intelligence uses Runtime capabilities to inspect the environment.

Example:

```text
Project Intelligence
↓
Runtime.filesystem.read
↓
package.json
```

or:

```text
Project Intelligence
↓
Runtime.command
↓
package-manager --version
```

Only when required and authorized.

Discovery must avoid arbitrary command execution.

---

# 76. Project Intelligence and Git

Project Intelligence may use Git information to enrich the model.

Examples:

```text
Current Branch
Repository Root
Working Tree Status
Remote Presence
```

Git modifications must not occur during discovery.

---

# 77. Project Intelligence and Persistence

After successful analysis, Nexo may persist a Project Intelligence snapshot.

Persisted information must include enough metadata to determine whether it may be stale.

---

# 78. Project Intelligence Reconciliation

Reconciliation must compare:

```text
Current Source Project
Stored Nexo Model
Git State
Runtime State
```

The system should update only what is necessary.

If the state is ambiguous, the system must mark it as unresolved rather than guessing.

---

# 79. Project Opening

When an existing Nexo project is reopened:

```text
Load Registration
↓
Check Source Location
↓
Check Project Fingerprint
↓
Check Git
↓
Determine Staleness
↓
Refresh if Required
↓
Open
```

The system must not blindly reuse old Project Model data.

---

# 80. Project Branch Switching

After branch changes:

```text
Detect Branch Change
↓
Refresh Filesystem State
↓
Invalidate Affected Intelligence
↓
Re-scan
↓
Resolve Adapters
↓
Update Project Model
↓
Refresh Preview
```

The UI must not continue showing a previous branch as current.

---

# 81. Project Clone

After cloning:

```text
Clone Source
↓
Create New Nexo Project Identity
↓
Re-detect Git
↓
Re-scan
↓
Review Secrets / Integrations
↓
Create New Project Model
```

A clone must not accidentally reuse the source project's Nexo identity.

---

# 82. Project Export

Export does not mean exporting Nexo's internal Project Model.

The export should preserve the actual Source Project unless the user explicitly asks for Nexo-specific metadata.

---

# 83. Project Removal

Removing a project from Nexo must be separate from deleting the Source Project.

These operations are different:

```text
Remove from Nexo
```

and:

```text
Delete Source Project
```

The second is more destructive and must never happen as a side effect of the first.

---

# 84. Acceptance Criteria

Project Intelligence is considered correctly implemented when:

1. A real project folder can be analyzed without modifying it.
2. The project root can be identified or explicitly confirmed.
3. Monorepos can be detected.
4. The system can detect relevant stack technologies.
5. Detection includes evidence and confidence where appropriate.
6. Actual versions can be identified when available.
7. Package managers can be detected.
8. Build/dev/test commands can be identified or marked unknown.
9. Git repository state can be detected without mutation.
10. Routes can be detected through adapters.
11. Components can be detected with confidence.
12. Styles can be detected without forcing one styling system.
13. Assets can be indexed.
14. The Project Model can represent the detected structure.
15. The Project Graph can represent relevant relationships.
16. Unknown and unsupported structures are explicitly represented.
17. External modifications can invalidate stale intelligence.
18. Full re-scan is available.
19. Analysis can run incrementally where practical.
20. Secret values are not exposed through normal intelligence output.
21. AI context can be generated from structured project intelligence.
22. The project remains unchanged after discovery unless a separate authorized mutation is requested.

---

# 85. K3 Swarm Implementation Rules

Before implementing Project Intelligence, the agent must:

1. inspect this document;
2. inspect `01-SYSTEM-ARCHITECTURE.md`;
3. inspect Core Invariants;
4. inspect Adapter System requirements;
5. inspect Runtime requirements;
6. inspect the actual fixture/project structure;
7. inspect installed dependency versions;
8. research official framework documentation whenever necessary;
9. implement detection with evidence;
10. write tests for positive, negative and ambiguous cases.

The agent must not invent framework rules to fill missing knowledge.

---

# 86. Required Test Categories

At minimum, Project Intelligence tests must cover:

```text
Simple project
Monorepo
Multiple package managers
Unknown framework
Known framework
Mixed styling systems
Missing configuration
Malformed configuration
Missing Git
Git repository in parent directory
External modifications
Generated directories
Large projects
Binary assets
Unknown files
Custom stack
Partial adapter support
Version differences
```

---

# 87. Required Fixture Principle

Where framework-specific behavior is important, use real or representative fixture projects.

Each fixture should contain enough realistic structure to verify:

```text
Detection
Project Model
Project Graph
Adapter Selection
Route Detection
Component Detection
Style Detection
Build Detection
```

A fixture must not encode assumptions that contradict official framework behavior.

---

# 88. Final Rule

Project Intelligence exists to establish a reliable understanding of reality before the Nexo modifies that reality.

The required principle is:

```text
Observe
↓
Understand
↓
Model
↓
Verify
↓
Then Modify
```

Not:

```text
Guess
↓
Modify
↓
Hope
```

The Project Intelligence system is successful when the Nexo can open an unfamiliar project, determine what it actually is, explain what it understands, identify what it does not understand, select the appropriate adapters and provide enough reliable context for the Editor, Engine and AI to operate safely.

> **The Nexo must understand the project before it attempts to control the project.**

```
```
