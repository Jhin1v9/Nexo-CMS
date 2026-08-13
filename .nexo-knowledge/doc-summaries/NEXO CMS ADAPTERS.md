````md
# NEXO CMS — ADAPTER SYSTEM

## 1. Document Status

**Document:** `03-ADAPTER-SYSTEM.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the architecture, contracts and implementation rules for the Nexo Adapter System.

This document defines how Nexo supports different technologies without forcing projects into a Nexo-specific stack.

The Adapter System is one of the most important architectural mechanisms of the product.

---

# 2. Objective

The Adapter System exists to answer:

> **“How does Nexo perform a universal operation correctly inside this specific technology?”**

Nexo may have universal concepts such as:

```text
Page
Route
Component
Style
Asset
Build
Project
Dependency
````

Different technologies represent those concepts differently.

Examples:

```text
React
Vue
Svelte
Next.js
Nuxt
Astro
HTML/CSS/JavaScript
```

must not be treated as identical implementations.

The Adapter System isolates those differences.

---

# 3. Core Rule

The Nexo Core must understand **concepts**.

Adapters must understand **technology-specific implementations**.

Example:

```text
Nexo Core:

"Create Component"
```

The adapter determines:

```text
React:
Create React-compatible component source

Vue:
Create Vue-compatible component source

Svelte:
Create Svelte component source
```

The Core must not contain large branches such as:

```text
if React...
else if Vue...
else if Svelte...
else if Next...
```

when the behavior belongs to an Adapter.

---

# 4. Adapter Responsibilities

An Adapter may be responsible for:

* detection;
* version compatibility;
* project structure interpretation;
* route interpretation;
* page interpretation;
* component interpretation;
* component creation;
* component modification;
* styling interpretation;
* build interpretation;
* development-server interpretation;
* test interpretation;
* dependency interpretation;
* source transformation;
* validation;
* capability declaration.

An Adapter must only own knowledge that is genuinely specific to the technology it represents.

---

# 5. Adapter Non-Responsibilities

Adapters must not own:

* users;
* Workspace membership;
* global authorization rules;
* billing;
* audit policy;
* global AI policy;
* deployment approval;
* product navigation;
* UI state;
* Nexo-wide project permissions.

Those belong to other subsystems.

---

# 6. Adapter Composition

The Nexo must support multiple adapters simultaneously.

A project may require:

```text
Next.js Adapter
+
TypeScript Adapter
+
Tailwind Adapter
+
pnpm Adapter
```

The framework adapter does not need to own every technology in the project.

Adapters should be composable where technically safe.

---

# 7. Adapter Categories

Initial adapter categories:

```text
Framework Adapter
Language Adapter
Styling Adapter
Build Adapter
Package Manager Adapter
Test Adapter
Runtime Adapter
```

The initial architecture does not require a separate adapter implementation for every category.

Some categories may be combined when their responsibilities are tightly coupled.

The boundary must be defined by responsibility rather than by number of files.

---

# 8. Framework Adapters

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

These are initial implementation targets.

The architecture must allow adding frameworks later without rewriting the Nexo Core.

---

# 9. Styling Adapters

Initial styling systems should support, where appropriate:

```text
Tailwind CSS
CSS Modules
styled-components
CSS Variables
Plain CSS
SCSS / Sass
```

A project may use more than one styling mechanism.

The adapter system must not force one styling system when the project uses multiple systems.

---

# 10. Build Adapters

Build adapters determine how a project is built.

They may provide:

```text
Build Command
Build Arguments
Output Information
Environment Requirements
Build Detection
Build Validation
```

The system must not assume:

```text
npm run build
```

for all projects.

---

# 11. Package Manager Adapters

The system should support common package managers such as:

```text
npm
pnpm
yarn
bun
```

Package manager selection must come from project evidence or explicit user configuration.

---

# 12. Adapter Contract

Every adapter must implement a defined contract.

The exact programming-language interface depends on the chosen stack, but conceptually an adapter must expose capabilities such as:

```text
detect()
getIdentity()
getVersion()
getCapabilities()
analyze()
validate()
```

Capability-specific interfaces may additionally expose:

```text
findRoutes()
findPages()
findComponents()
findStyles()
createComponent()
updateComponent()
createPage()
updatePage()
build()
test()
```

An adapter must not expose capabilities it cannot reliably support.

---

# 13. Adapter Identity

Every adapter must have stable identity metadata.

Conceptually:

```text
id
name
category
version
adapterVersion
supportedProjectVersions
capabilities
```

Example:

```text
id:
nextjs

category:
framework

adapterVersion:
Nexo-supported adapter version

supportedProjectVersions:
declared compatibility range
```

---

# 14. Adapter Version vs Project Version

These must remain separate.

Example:

```text
Adapter Version:
1.4.0

Next.js Project Version:
15.x
```

Updating an adapter does not necessarily mean updating the project's framework.

---

# 15. Capability Declaration

An adapter must explicitly declare its supported capabilities.

Example:

```text
capabilities:
- project.detect
- route.detect
- page.read
- component.detect
- component.create
- component.update
- build.detect
```

A capability must not be presented as supported if the adapter cannot implement it reliably.

---

# 16. Capability Levels

Adapter capabilities should distinguish support levels where necessary.

Conceptual levels:

```text
FULL
PARTIAL
READ_ONLY
EXPERIMENTAL
UNSUPPORTED
```

Example:

```text
component.read:
FULL

component.create:
FULL

component.update:
PARTIAL

route.modify:
UNSUPPORTED
```

The UI and AI must respect these capability declarations.

---

# 17. Detection Contract

An adapter may participate in automatic stack detection.

Detection should return structured information such as:

```text
Detected Technology
Confidence
Evidence
Detected Version
Compatibility
```

Example:

```text
Technology:
Next.js

Confidence:
HIGH

Evidence:
next dependency
next configuration
Next.js routing structure

Version:
actual detected version
```

---

# 18. Detection Must Not Mutate

Adapter detection must be non-destructive.

Detection must not:

* rewrite files;
* install packages;
* modify Git;
* migrate configuration;
* create components.

Detection is an observation phase.

---

# 19. Adapter Selection

The Adapter Manager must select adapters based on project intelligence.

Conceptually:

```text
Project Intelligence
↓
Detected Technologies
↓
Compatibility Evaluation
↓
Adapter Resolution
↓
Active Adapter Set
```

Example:

```text
Project:
Next.js + TypeScript + Tailwind + pnpm

Adapters:
Next.js
TypeScript
Tailwind
pnpm
```

---

# 20. Adapter Resolution Conflicts

If multiple adapters claim authority over the same behavior, the system must detect the conflict.

Example:

```text
Two Build Adapters
```

must not result in arbitrary selection.

The system should:

1. evaluate confidence;
2. evaluate specificity;
3. evaluate explicit user configuration;
4. evaluate compatibility;
5. resolve deterministically;
6. request user input when ambiguity remains.

---

# 21. Manual Adapter Selection

Users must be able to override automatic detection where necessary.

The configuration must distinguish:

```text
Automatic Detection
User Confirmation
User Override
```

A user-confirmed adapter selection should take precedence according to documented configuration rules.

---

# 22. Custom Adapter

The architecture must support custom adapters.

A custom adapter can be used when:

* a framework is not officially supported;
* a project has unusual architecture;
* a company uses proprietary conventions;
* the standard adapter is insufficient.

A custom adapter must still implement official Adapter Contracts.

---

# 23. Custom Adapter Isolation

A custom adapter must not require modifications to the Nexo Core for every project-specific rule.

The desired architecture is:

```text
Nexo Core
↓
Adapter Contract
↓
Custom Adapter
↓
Project
```

not:

```text
Nexo Core
↓
special case for Client X
```

---

# 24. Adapter Fixtures

Every important adapter must have representative fixture projects.

Fixtures should test:

```text
Detection
Version Detection
Route Detection
Component Detection
Style Detection
Build Detection
Component Creation
Component Modification
Page Creation
Validation
```

The fixture should represent realistic project structure.

---

# 25. Framework Adapter Contract

A Framework Adapter should define, when supported:

```text
detect
getVersion
findRoutes
findPages
findLayouts
findComponents
createPage
updatePage
createComponent
updateComponent
validate
```

Not every framework supports every operation.

Unsupported operations must be explicitly declared.

---

# 26. Styling Adapter Contract

A Styling Adapter should define, where supported:

```text
detect
getSystem
findStyles
findTokens
findVariables
readStyle
updateStyle
createStyle
validate
```

The adapter must preserve the styling architecture already used by the project.

---

# 27. Build Adapter Contract

A Build Adapter should define:

```text
detect
getBuildCommand
getDevelopmentCommand
getPreviewCommand
getOutput
validateEnvironment
```

It must not execute commands without going through the Runtime security boundary.

---

# 28. Package Manager Adapter Contract

A Package Manager Adapter should be able to identify:

```text
Manager
Version
Lockfile
Install Command
Add Dependency Command
Remove Dependency Command
Run Script Command
```

Actual command syntax must be verified against the installed package manager version.

---

# 29. Test Adapter Contract

Where supported, the Test Adapter should identify:

```text
Test Runner
Unit Test Command
Integration Test Command
E2E Command
Configuration
Test Discovery
```

The system must distinguish unsupported test types from tests that simply do not exist in the project.

---

# 30. Adapter and Runtime

Adapters describe **what command or operation is appropriate**.

Runtime performs it.

Example:

```text
Build Adapter
↓
"Use this build command"

Runtime
↓
Executes the command
```

The adapter must not bypass Runtime security.

---

# 31. Adapter and Project Model

Adapters should enrich the Project Model with technology-specific information.

Example:

```text
Project:
Next.js

Adapter Metadata:
App Router
TypeScript
Tailwind
```

The Project Model must preserve universal concepts while allowing adapter-specific metadata.

---

# 32. Adapter and Project Graph

Adapters may provide relationships that are technology-specific.

Example:

```text
Next.js route
→ layout
→ page
→ component
```

The Adapter is responsible for correctly identifying these relationships.

The Graph remains a Nexo-level representation.

---

# 33. Adapter and Component System

When the Component Engine requests:

```text
component.create
```

the flow should be:

```text
Component Domain
↓
Resolve Active Framework Adapter
↓
Resolve Active Styling Adapter
↓
Generate / Modify Source
↓
Runtime Filesystem
↓
Re-analyze
↓
Validate
```

The Component Domain must not manually generate framework-specific source itself.

---

# 34. Adapter and Page System

Page creation must follow the same strategy:

```text
Page Capability
↓
Framework Adapter
↓
Project-specific representation
↓
Persist
↓
Re-analyze
↓
Validate
```

---

# 35. Adapter and Styling

When modifying styles, the system must prefer the project's existing styling mechanism.

Examples:

```text
Tailwind Project
→ Prefer Tailwind-compatible changes

CSS Modules Project
→ Prefer CSS Module changes

CSS Variables Project
→ Prefer variable changes

styled-components Project
→ Prefer styled-components changes
```

Do not introduce a second styling system merely because the Nexo prefers it.

---

# 36. Adapter and Design Tokens

If a project already has reusable design values, the adapter should identify and preserve them where possible.

Example:

```text
CSS variable:
--color-primary

```

The Nexo should prefer modifying the existing variable rather than creating a duplicate value elsewhere when the requested operation logically targets that design token.

---

# 37. Adapter and Source Transformation

When source transformations are required, the adapter should use the safest mechanism available.

Possible mechanisms include:

```text
AST
Parser
Structural Transformation
Framework Compiler API
Targeted Source Transformation
```

Plain string replacement must not be used as the universal editing strategy for structured source code.

---

# 38. Adapter and Formatting

Generated or modified code should preserve the project's formatting conventions whenever possible.

Examples:

```text
Indentation
Quotes
Semicolons
Trailing Commas
Line Width
File Naming
Import Ordering
```

Use project tooling when available rather than imposing Nexo formatting blindly.

---

# 39. Adapter and Linting

After structural modifications, the system should use the project's own linting/typechecking mechanisms when available.

The adapter should identify appropriate commands or validation mechanisms.

---

# 40. Adapter and Dependencies

An adapter must not add dependencies merely because a capability would be easier to implement with a new library.

Before adding a dependency, evaluate:

```text
Existing capability
Existing dependency
Native framework capability
Need for new dependency
Security
Maintenance
Bundle impact
Compatibility
```

A new dependency should have an explicit technical reason.

---

# 41. Adapter and Package Installation

Package installation must go through:

```text
Application / Domain
↓
Authorization
↓
Package Manager Adapter
↓
Runtime
```

It must not be executed directly by the UI or AI.

---

# 42. Adapter Failure

Adapters may fail.

Possible states:

```text
AVAILABLE
PARTIAL
UNSUPPORTED
ERROR
INCOMPATIBLE
```

The Nexo must never execute an unsupported operation as if the adapter were fully capable.

---

# 43. Version Compatibility

Adapter compatibility must consider the actual project version.

Example:

```text
Next.js Adapter:
supports versions A through B

Project:
version C

Result:
INCOMPATIBLE
```

The adapter must not silently assume future compatibility.

---

# 44. External Documentation Requirement

Framework behavior must be verified against current official documentation whenever the implementation depends on:

* routing;
* file conventions;
* build behavior;
* configuration;
* compiler behavior;
* component conventions;
* version-specific APIs.

Preferred sources:

```text
Official Documentation
Official Specification
Official Repository
Primary Technical Documentation
```

Do not invent framework behavior.

---

# 45. Version-Specific Research

When the actual installed version is relevant:

1. inspect the project version;
2. identify the relevant documentation version;
3. inspect official documentation;
4. implement against confirmed behavior;
5. add fixture coverage.

An older memory of framework behavior is not sufficient evidence for implementation.

---

# 46. Adapter Discovery

The system should be able to discover available adapters.

Adapter metadata should include:

```text
ID
Name
Category
Supported Versions
Capabilities
Adapter Version
Status
```

---

# 47. Adapter Registry

A Registry should manage:

* built-in adapters;
* custom adapters;
* plugin-provided adapters;
* adapter versions;
* compatibility information.

The Registry must not automatically trust arbitrary adapters without security and compatibility validation.

---

# 48. Adapter Loading

Adapter loading must verify:

```text
Identity
Version
Contract Compatibility
Permissions
Integrity
Dependencies
```

The exact security mechanism is defined in the Security specification.

---

# 49. Adapter Plugins

Future plugins may add adapters.

A plugin-provided adapter must implement the same Adapter Contract as a built-in adapter.

The Core must not require a special code path for every plugin adapter.

---

# 50. Adapter Capability Negotiation

Before executing an operation, the system should be able to determine:

```text
Can this adapter perform this operation?
```

Conceptually:

```text
Operation:
component.create

Adapter:
Next.js

Result:
SUPPORTED
```

or:

```text
Operation:
route.modify

Adapter:
Custom

Result:
UNSUPPORTED
```

The system must fail before mutation when incompatibility is known.

---

# 51. Adapter Safety

Adapters must not:

* bypass authorization;
* access secrets unnecessarily;
* execute arbitrary commands directly;
* modify files outside their authorized project scope;
* mutate unrelated projects;
* silently install dependencies;
* bypass Git rules;
* bypass Runtime restrictions.

Adapters are specialized implementation modules, not security authorities.

---

# 52. Adapter Scope

An adapter invocation must always be associated with a project context.

Conceptually:

```text
Workspace
Project
Adapter
Operation
```

An adapter must not operate on a globally implicit filesystem path.

---

# 53. Adapter Context

An adapter should receive a structured context containing only information necessary for the requested operation.

Possible context:

```text
Project Root
Project Model
Project Graph
Stack
Version
Configuration
Relevant Files
Runtime Capabilities
```

Do not pass unrestricted global state when unnecessary.

---

# 54. Adapter Result

Adapter operations should return structured results.

Example:

```text
Result:
SUCCESS

Files Changed:
- src/components/Hero.tsx

Warnings:
[]

Diagnostics:
[]

ReanalysisRequired:
true
```

Failure should also be structured.

---

# 55. Adapter Diagnostics

Adapters should be able to return diagnostics such as:

```text
WARNING
ERROR
UNSUPPORTED
CONFLICT
DEPRECATED
```

These diagnostics should be consumable by:

* UI;
* AI;
* API;
* logs;
* validation systems.

---

# 56. Adapter Transactions

An adapter may perform multiple source changes.

It must define whether the operation is:

```text
Atomic
Staged
Best Effort
Partially Recoverable
```

The system must not falsely report complete success after partial modification.

---

# 57. Adapter Re-analysis

After an adapter mutates project source, affected Project Intelligence must be refreshed.

Preferred flow:

```text
Adapter Mutation
↓
Persist
↓
Re-scan Affected Files
↓
Update Project Model
↓
Update Project Graph
↓
Validate
```

---

# 58. Adapter and Git

Adapters must not commit their own changes automatically.

A typical flow is:

```text
Adapter
↓
Modify Source
↓
Validation
↓
Git Domain
↓
Commit
```

Git commit must remain an explicit domain operation.

---

# 59. Adapter and AI

AI may request adapter-backed operations through the Nexo Domain.

The AI should not directly instantiate arbitrary adapters and manipulate the filesystem.

Preferred:

```text
AI
↓
component.update
↓
Component Domain
↓
Adapter
↓
Runtime
```

---

# 60. Adapter and UI

The UI may display adapter capabilities and diagnostics.

Example:

```text
Framework:
Next.js 15

Support:
Component Editing — Full
Route Editing — Partial
Custom Server — Limited
```

The UI must derive these states from actual adapter capability data.

---

# 61. Initial Adapter Set

For the first implementation, prioritize adapters that provide meaningful coverage without creating unnecessary complexity.

Recommended initial framework coverage:

```text
Next.js
React
Vue
Svelte
Astro
HTML/CSS/JavaScript
```

Recommended supporting technology coverage:

```text
TypeScript
Tailwind CSS
CSS Modules
styled-components
Plain CSS
npm
pnpm
yarn
bun
```

Additional technologies may be added after the adapter contracts are validated.

---

# 62. HTML/CSS/JavaScript Adapter

The HTML/CSS/JavaScript adapter should provide a useful baseline for projects without a major framework.

It should support, where reliable:

```text
HTML Pages
Links
Images
Scripts
Stylesheets
CSS
Basic Components / Reusable Structures
Static Assets
```

The adapter must not pretend that arbitrary JavaScript architecture is understood.

Unknown custom behavior should remain unknown.

---

# 63. React Adapter

The React Adapter must detect actual React usage and distinguish framework-level systems when another adapter is more appropriate.

For example:

```text
React
```

and:

```text
Next.js
```

must not be treated as equivalent.

When Next.js is detected, the Next.js adapter should own framework-specific behavior while React may provide shared component semantics.

---

# 64. Next.js Adapter

The Next.js Adapter must be version-aware and support the actual routing/build architecture detected in the project.

It must distinguish relevant architectural modes when applicable, rather than assuming a single routing structure.

Framework-specific behavior must be verified against the official documentation corresponding to the detected version.

---

# 65. Vue Adapter

The Vue Adapter must identify Vue-specific source structures and component semantics.

If a project is using Nuxt, Nuxt-specific behavior must be handled by the Nuxt adapter rather than assuming generic Vue behavior covers everything.

---

# 66. Svelte Adapter

The Svelte Adapter must understand Svelte component structure.

For SvelteKit projects, framework-specific route and application behavior should be provided by the SvelteKit adapter.

---

# 67. Astro Adapter

The Astro Adapter must understand Astro-specific page and component conventions.

It must distinguish Astro components and framework islands when relevant.

Framework-specific implementation details must be researched against the current official Astro documentation before implementation.

---

# 68. Styling Adapter Priority

When a project contains more than one styling system, the Nexo should identify the systems actually used by each target element.

Example:

```text
Project:
Tailwind + CSS Modules

Target Component:
CSS Module
```

The Nexo should not blindly generate Tailwind classes for a CSS Module component.

---

# 69. Styling Preservation Rule

The highest-priority styling rule is:

> **Modify the project using its existing styling language whenever that language can safely represent the requested change.**

Do not convert:

```text
CSS Modules
```

into:

```text
Tailwind
```

just because Nexo has a Tailwind tool.

Do not convert:

```text
styled-components
```

into:

```text
CSS Modules
```

because it appears simpler.

Technology migration is a separate operation.

---

# 70. Migration Is Not Normal Editing

A change such as:

```text
React → Vue
```

or:

```text
CSS Modules → Tailwind
```

is a migration.

It must not occur as a side effect of a normal editing operation.

Migration requires explicit product capability and dedicated specifications.

---

# 71. Adapter Test Matrix

Each supported adapter must eventually have tests covering at least:

```text
Detection
Version Detection
Compatibility
Project Scan
Routes
Pages
Components
Styles
Assets
Build
Development Server
Tests
Component Creation
Component Update
Page Creation
Validation
Failure Conditions
```

Tests should include both valid and invalid examples.

---

# 72. Acceptance Criteria

The Adapter System is correctly implemented when:

1. Adapters are isolated from the Core.
2. Multiple adapter categories can coexist.
3. Technology-specific knowledge is not duplicated throughout the system.
4. Adapter capabilities are explicit.
5. Unsupported operations are represented explicitly.
6. Adapter compatibility considers actual versions.
7. Automatic detection can be overridden manually.
8. Custom adapters can be added without changing Core business logic.
9. Adapter operations use Runtime boundaries.
10. Adapter operations respect Security.
11. Adapter mutations trigger appropriate re-analysis.
12. Adapter mutations do not automatically commit to Git.
13. Styling changes preserve the project's existing styling system.
14. Framework-specific behavior is not guessed.
15. External documentation is consulted when required.
16. Fixtures exist for important supported technologies.
17. AI uses adapters through domain capabilities rather than bypassing the architecture.

---

# 73. K3 Swarm Implementation Protocol

Before implementing an adapter, the agent must:

1. Read this document.
2. Read `01-SYSTEM-ARCHITECTURE.md`.
3. Read `02-PROJECT-INTELLIGENCE.md`.
4. Identify the actual project technology and version.
5. Inspect the project itself.
6. Inspect installed dependencies and configuration.
7. Consult official documentation for the exact relevant version.
8. Define detection evidence.
9. Define supported capabilities.
10. Implement only those capabilities that can be verified.
11. Create or update fixture coverage.
12. Validate positive and negative detection cases.
13. Validate mutations against real project structure.
14. Validate that the adapter does not bypass Security or Runtime.
15. Record unresolved limitations explicitly.

---

# 74. No-Hallucination Rule

If an adapter encounters a framework behavior it cannot establish reliably, it must not invent an implementation.

The correct sequence is:

```text
Unknown
↓
Inspect Project
↓
Inspect Installed Version
↓
Consult Official Documentation
↓
Inspect Official Source if Necessary
↓
Create Test Fixture
↓
Implement
```

If the behavior remains uncertain:

```text
UNKNOWN / UNSUPPORTED
```

is preferable to an unsafe implementation.

---

# 75. Final Adapter Principle

The Adapter System exists so that the Nexo can remain universal without becoming technologically ignorant.

The correct relationship is:

```text
NEXO CORE
    ↓
Universal Capability
    ↓
ADAPTER
    ↓
Technology-Specific Implementation
    ↓
RUNTIME
    ↓
REAL PROJECT
```

The Nexo must never force every project to speak the same technical language.

Instead:

> **The Nexo speaks its own universal language internally, while adapters translate that language into the real language of each project.**

```
```
