````md
# NEXO CMS — EDITOR

## 1. Document Status

**Document:** `07-EDITOR.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the architecture and behavior of the Nexo visual editor, source editor, inspector, source mapping, change tracking and persistence workflow.

The Editor is a consumer of Nexo capabilities.

It must not become an independent implementation of project manipulation.

---

# 2. Objective

The Nexo Editor must allow humans to work visually and directly with real project source.

The Editor must support two complementary representations:

```text
Visual Representation
        ↕
Project Structure
        ↕
Source Code
````

The Editor must not create a fake visual model disconnected from the actual project.

When an edit is saved, the actual Source Project must change.

When the Source Project changes externally, the Editor must be capable of detecting and reconciling the difference.

---

# 3. Core Principle

The Editor must satisfy:

> **What the user sees and edits must remain connected to the real source of the project.**

Incorrect:

```text
User edits text
↓
Editor state changes
↓
UI says Saved
```

Correct:

```text
User edits text
↓
Resolve real source
↓
Generate source change
↓
Persist
↓
Validate
↓
Update Project Intelligence
↓
Update Preview
↓
Report Saved
```

---

# 4. Editor Architecture

Conceptually:

```text
                        EDITOR
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Visual View      Code View        Inspector
          │                │                │
          └────────────────┼────────────────┘
                           │
                    Change Manager
                           │
                      Source Mapping
                           │
                    Nexo Engine
                           │
                    Adapter System
                           │
                       Runtime
                           │
                     SOURCE PROJECT
```

---

# 5. Editor Responsibilities

The Editor owns:

* visual selection;
* code editing interface;
* inspector;
* source navigation;
* visual/code synchronization;
* local editing state;
* change review;
* diff presentation;
* undo/redo;
* save interaction;
* preview interaction.

The Editor does not own:

* framework parsing;
* filesystem security;
* Git business logic;
* deployment;
* AI authorization;
* adapter implementation;
* project source of truth.

---

# 6. Editor Modes

The Editor must support at least:

```text
Visual
Code
Split
Preview
Inspector
Diff
```

These are representations of the same underlying project state.

They must not become independent project models.

---

# 7. Visual Editor

The Visual Editor allows the user to:

* view rendered project output;
* select elements;
* inspect structure;
* modify supported properties;
* add existing components;
* create supported pages/components;
* manipulate supported content;
* preview responsive behavior.

Visual editing must work through Nexo Engine capabilities.

---

# 8. Code Editor

The Code Editor must provide direct access to actual Source Project files.

It should support:

* file navigation;
* search;
* syntax highlighting;
* editing;
* diagnostics;
* formatting integration;
* source mapping;
* diff;
* save;
* undo;
* redo.

The actual code must remain the project's code.

The Nexo must not maintain an independent shadow copy that becomes the authoritative source.

---

# 9. Split View

Split View should allow:

```text
Code
+
Visual Preview
```

to be used simultaneously.

When a source change affects the preview, the preview should update through the real development runtime.

When an element is selected visually, the Editor should navigate to its source when reliable mapping exists.

---

# 10. Inspector

The Inspector displays editable properties of the current selection.

Possible property groups:

```text
Content
Layout
Typography
Color
Background
Border
Radius
Shadow
Spacing
Responsive
Component Props
Accessibility
Links
Media
```

The exact controls available depend on:

```text
Selected Resource
Component Schema
Project Stack
Adapter Capabilities
```

The Inspector must never fabricate editable properties that the underlying project cannot safely represent.

---

# 11. Selection Model

A selection should identify enough information to resolve the corresponding project object.

Conceptually:

```text
Selection
├── Project ID
├── Route
├── Node / Element
├── Component
├── Source File
├── Source Location
└── Confidence
```

Not every selection has every field.

---

# 12. Selection Confidence

Source mapping can be:

```text
EXACT
HIGH_CONFIDENCE
PARTIAL
UNKNOWN
```

The UI must not present an uncertain source mapping as exact.

For example:

```text
Visual Element
↓
Possible source:
Hero.tsx

Confidence:
PARTIAL
```

is preferable to incorrectly editing an unrelated file.

---

# 13. Source Mapping

Source Mapping connects:

```text
Rendered Element
        ↕
Project Node
        ↕
Source File
        ↕
Line / Column / Structure
```

Source mapping must use Project Intelligence and Adapter capabilities.

The Editor itself must not implement independent framework parsers.

---

# 14. Source Mapping Requirements

A mapping should identify when possible:

```text
Project
Route
Component
File
Node
Export
Line
Column
```

Additional metadata may be stored if required.

---

# 15. Mapping Failure

When mapping cannot reliably identify the source:

```text
Unknown
```

must be represented.

The Editor should offer safe alternatives such as:

* open page source;
* open related component;
* inspect project structure;
* use Code View.

It must not guess silently.

---

# 16. Visual Element Selection

Selection flow:

```text
Preview
↓
Select Element
↓
Resolve Node
↓
Resolve Project Context
↓
Resolve Source Mapping
↓
Open Inspector
```

The selected element must belong to the active project and environment.

---

# 17. Editing Content

Text editing flow:

```text
Select Text
↓
Resolve Source
↓
Create Change
↓
Preview Change
↓
Persist
↓
Validate
↓
Refresh Intelligence
```

The final saved value must exist in the actual source project.

---

# 18. Editing Component Props

For a structured component property:

```text
Select Component
↓
Inspector
↓
Select Prop
↓
Validate Value
↓
Adapter Transformation
↓
Persist
↓
Re-analyze
↓
Validate
```

The transformation must respect the project's framework.

---

# 19. Editing Styles

Style editing must use the active Styling Adapter.

Examples:

```text
Tailwind
→ Tailwind-compatible change

CSS Modules
→ CSS Module-compatible change

CSS Variables
→ Variable-compatible change

styled-components
→ styled-components-compatible change
```

Do not introduce a new styling system merely because the Editor has a control for a property.

---

# 20. Editing Design Tokens

When the selected property corresponds to an existing shared token:

```text
Selection
↓
Resolve Token
↓
Edit Token
↓
Update Dependents
↓
Preview
```

Prefer changing the existing source of truth rather than creating a duplicate value.

---

# 21. Media Editing

When an image or other asset is selected, the Editor should be able to connect it to Media Library operations.

Example:

```text
Select Image
↓
Resolve Asset
↓
Media Library
↓
Replace Asset
↓
Update Source Reference
↓
Validate
```

The Editor must not merely change a preview URL.

---

# 22. Links

Link editing may involve:

```text
Internal Route
External URL
Anchor
Email
Phone
Download
Custom Handler
```

The Editor must preserve the underlying semantics of the project.

It must not convert a framework-native route into a plain anchor without justification.

---

# 23. Component Insertion

Adding a component must follow:

```text
Select Target
↓
Component Library
↓
Compatibility Check
↓
Configure Props
↓
Insert
↓
Persist
↓
Re-analyze
↓
Validate
```

The Component Engine performs the actual project transformation.

---

# 24. Component Removal

Removal must inspect references and structure.

The Editor should indicate if the component:

* is reused;
* has dependent elements;
* has important assets;
* contains child content.

The underlying removal operation must be executed by the Component Domain.

---

# 25. Reordering

If the project's technology supports structural reordering safely, the Editor may expose it.

Examples:

```text
Move Up
Move Down
Change Parent
Move Into Container
```

The operation must map to the project's actual source representation.

If the project cannot safely support visual reordering, the control should not be shown as universally available.

---

# 26. Page Creation

The Editor can initiate page creation, but Page Domain/Adapter logic must create the real project structure.

Flow:

```text
New Page
↓
Define Route
↓
Select Structure
↓
Create through Page Capability
↓
Adapter Transformation
↓
Persist
↓
Re-analyze
↓
Preview
```

---

# 27. Page Duplication

Page duplication should be treated as a structured operation.

It must account for:

* route;
* layout;
* components;
* assets;
* metadata;
* framework rules;
* internal links.

Blind file copying is not sufficient for all frameworks.

---

# 28. Local Editor State

The Editor may maintain temporary unsaved state.

This state may include:

```text
Selected Element
Open Files
Cursor Position
Draft Changes
Panel State
Viewport
Undo Stack
```

Temporary state must not be confused with persisted project state.

---

# 29. Unsaved State

The Editor must clearly identify unsaved changes.

Possible states:

```text
Saved
Unsaved
Saving
Save Failed
Conflict
```

The UI must not report `Saved` until persistence has succeeded.

---

# 30. Change Manager

The Editor must have a Change Manager responsible for tracking edits before persistence.

Conceptually:

```text
User Change
↓
Change Manager
↓
Pending Changes
↓
Preview
↓
Validation
↓
Persist
```

The Change Manager must retain enough information for undo, redo and diff.

---

# 31. Change Object

A change should identify:

```text
Change ID
Project
File(s)
Operation
Source
Before State
After State
Origin
Timestamp
```

Origin may include:

```text
Human
AI
Visual Editor
Code Editor
External Change
```

---

# 32. Change Sources

The Editor must distinguish changes initiated by:

```text
Visual Editor
Code Editor
AI
External Tool
Git Checkout
Branch Switch
Generated Component
```

This is important for audit, conflict detection and user feedback.

---

# 33. Undo

Undo should revert the most recent Editor-managed change where possible.

Undo must operate on the actual editing model.

Undo must not silently modify unrelated external changes.

---

# 34. Redo

Redo should reapply the last undone Editor-managed change when the project state remains compatible.

If the project changed externally, redo may become invalid.

The Editor should invalidate unsafe redo operations.

---

# 35. Undo and Git

Undo is not a replacement for Git.

These concepts remain separate:

```text
Undo
→ Editor-level editing history

Git
→ Project version history
```

Undo must not automatically create commits.

---

# 36. Save

Save must persist changes to the real Source Project.

Flow:

```text
Pending Changes
↓
Validate
↓
Check Conflict
↓
Adapter Transformation if required
↓
Filesystem Persistence
↓
Read / Verify
↓
Update Project Intelligence
↓
Update Preview
↓
Mark Saved
```

---

# 37. Save Failure

If persistence fails:

```text
Save
↓
Failure
```

the Editor must retain the recoverable pending state.

It must not convert the state to `Saved`.

---

# 38. External Change During Editing

If the source file changes outside Nexo while the Editor has unsaved changes:

```text
Unsaved Local Change
+
External Source Change
=
CONFLICT
```

The Editor must preserve both contexts when possible.

It must not silently overwrite either side.

---

# 39. Conflict Resolution

The Editor should eventually support:

```text
Keep Local
Keep External
Compare
Merge
Reload
Cancel
```

The exact merge implementation depends on the source-editing subsystem.

The Editor must not invent a merge result without explicit rules.

---

# 40. External Change Without Local Edits

If no local changes exist:

```text
External Change
↓
Detect
↓
Refresh
↓
Update Preview
```

No conflict is necessary.

---

# 41. Source Modification Verification

After a write operation, the Editor/Engine should verify the expected source state.

Possible verification:

```text
File Exists
Content Updated
Parser Succeeds
Project Model Updated
Build remains valid when required
```

The depth of verification depends on the change.

---

# 42. Diff Engine

The Editor must provide a diff representation for meaningful changes.

Diffs should support:

```text
File
Before
After
Added
Removed
Modified
Moved
```

When applicable, the diff should identify the origin:

```text
Human
AI
Visual
Generated
```

---

# 43. Diff Is the Safety Boundary for AI Editing

When AI changes source, the Editor should be able to display its modifications as a diff.

Example:

```text
AI Task
↓
Generated Changes
↓
Diff
↓
Review
↓
Approve / Reject
```

Manual mode must not apply changes before required approval.

---

# 44. Code Editor and AI

AI-generated code may be inserted into the Code Editor as a proposed change.

The editor must preserve:

```text
Original
Proposed
Applied
Rejected
```

states where appropriate.

---

# 45. Visual Preview

Preview must use the actual project runtime.

The Editor must not create a separate approximate renderer to simulate the project unless the feature is explicitly defined as a separate visual approximation.

The normal preview should render the real project.

---

# 46. Preview Synchronization

After source changes:

```text
Save
↓
Project Runtime
↓
Development Server
↓
Preview Refresh
```

The Editor should update the visual state when the runtime indicates the new state is available.

---

# 47. Hot Reload

If the project's development environment supports hot reload, the Editor may use it.

The Editor must not assume every project supports hot reload.

Fallback:

```text
Refresh Preview
```

must remain available.

---

# 48. Preview Errors

If the preview fails after an edit, the Editor must distinguish:

```text
Source Error
Build Error
Runtime Error
Preview Error
Network Error
```

The user should be able to inspect relevant diagnostics.

---

# 49. Responsive Editing

The Editor must integrate with Responsive Lab.

The selected viewport must be part of editor state.

Example:

```text
Desktop
Tablet
Mobile
Custom
```

Changing viewport must not modify the project's source by itself.

It only changes the viewing context.

---

# 50. Breakpoint Editing

If a project uses framework or CSS-specific breakpoints, the Editor must derive breakpoint information from the actual project.

Do not assume fixed universal values such as:

```text
640
768
1024
1280
```

unless those values actually belong to the project's active styling system.

---

# 51. Accessibility Editing

Where supported, the Inspector may expose:

```text
Alt Text
ARIA Attributes
Labels
Roles
Heading Level
Language
```

These operations must preserve valid project semantics.

---

# 52. SEO Editing

Where project architecture supports it, Editor may expose:

```text
Title
Description
Canonical
Open Graph
Robots
Structured Data
```

The Editor must not assume that all SEO metadata exists in the same file or system.

The project Adapter must determine the correct representation.

---

# 53. Form Editing

Form editing may include:

```text
Fields
Labels
Required
Validation
Action
Method
Integration
Success State
Error State
```

The Editor must not break existing project logic by treating a custom React/Vue/Svelte form as a plain HTML form.

---

# 54. Carousel Editing

The Editor must support carousel configuration when a compatible carousel component exists.

Possible properties:

```text
Slides
Order
Images
Text
Links
Autoplay
Delay
Transition
Loop
Navigation
Pagination
Items Per View
Spacing
Responsive Behavior
```

The Editor must modify the actual carousel implementation/configuration.

It must not create a fake Editor-only configuration that is never persisted.

---

# 55. Universal Component Editing

The Editor should work against the Component Model rather than assuming one framework.

The same conceptual operation:

```text
Edit Button Text
```

may become different source operations in:

```text
React
Vue
Svelte
HTML
```

The Editor should request a universal capability and delegate representation to the adapter.

---

# 56. Editor Capability Detection

The Editor must determine available controls from:

```text
Project Model
Selected Resource
Adapter Capabilities
Component Schema
Permissions
Environment
```

A control must not appear as fully functional if the underlying capability is unsupported.

---

# 57. Permission-Aware Editor

Editor actions must respect the effective permissions of the user/agent.

Examples:

```text
Viewer
→ Read Only

Editor
→ Content Editing

Designer
→ Design Editing

Developer
→ Code / Runtime / Git as permitted
```

These are role examples, not substitutes for actual permission evaluation.

---

# 58. Agent Access to Editor Capabilities

AI does not need to interact with the visual Editor to perform a supported operation.

Instead:

```text
AI
↓
Control Plane
↓
Engine
↓
Editor-related Domain Capability
```

The visual Editor may then display the resulting change.

This means:

> Editor is a user experience layer, not a required execution mechanism.

---

# 59. Editor State Reconciliation

When Project Model changes externally:

```text
External Change
↓
Project Intelligence Update
↓
Editor State Comparison
↓
Invalidate Affected Selection / Drafts
↓
Refresh
```

The Editor must not continue editing a source representation known to be obsolete.

---

# 60. File Watchers

Where supported, the application may use filesystem watchers for responsive change detection.

Watchers are an optimization and detection mechanism.

They are not the only source of truth.

If watcher state is lost, the system must be able to perform explicit reconciliation.

---

# 61. Large Project Handling

The Editor must not render the entire project simultaneously.

It should use techniques appropriate to scale, such as:

```text
Lazy Loading
Virtualized Lists
Incremental Source Loading
Targeted Project Model Queries
```

The actual implementation should be selected after profiling realistic projects.

---

# 62. Editor Performance

High-cost operations such as:

* full project scan;
* full dependency analysis;
* large diff generation;
* visual regression;
* AI context construction

must not block the entire UI unnecessarily.

Use asynchronous Jobs where appropriate.

---

# 63. Editor Notifications

The Editor may present status such as:

```text
Saving
Saved
Build Running
Build Failed
External Change Detected
Conflict
AI Changes Available
Validation Failed
```

Notification state must come from real operation state.

---

# 64. No Fake Success

The Editor must never display:

```text
Saved
Published
Deployed
Fixed
Validated
```

unless the corresponding underlying operation actually succeeded.

---

# 65. Editor Recovery

When the application crashes or reloads, the Editor should be able to recover pending state when safely possible.

Recovery data must not be treated as the Source Project.

Recovered drafts must remain distinguishable from persisted source.

---

# 66. Editor Security

The Editor must not obtain elevated privileges simply because it needs to display a project.

Privileged operations must continue through:

```text
Authorization
↓
Nexo Engine
↓
Runtime
```

The browser should not have unrestricted filesystem or command access.

---

# 67. Editor + Git

The Editor may display Git state:

```text
Modified
Added
Deleted
Renamed
Untracked
```

However, Git state must come from the actual Git system.

The Editor must not maintain a fake Git status.

---

# 68. Editor + Commit

The Editor may provide a commit workflow, but commit belongs to Git Domain.

Flow:

```text
Editor
↓
Review Diff
↓
git.commit
↓
GitService
↓
Real Git
```

---

# 69. Editor + AI

AI-generated changes should appear as proposals when manual approval is required.

The Editor should provide:

```text
Files Changed
Diff
Diagnostics
Validation
Approve
Reject
```

The Editor must not silently approve AI changes.

---

# 70. Editor + Components

Component editing should use the Component Domain.

The Editor's job is to:

* select;
* inspect;
* configure;
* request changes;
* display results.

The Component Domain handles project transformation.

---

# 71. Editor + Media

Media changes should use the Media Domain.

The Editor should not directly manipulate asset files without going through the proper asset capabilities.

---

# 72. Editor + Design

Design changes should use Design Domain and Styling Adapters.

The Editor should not hardcode CSS strategies.

---

# 73. Editor + Responsive Lab

Responsive tools should operate through Responsive Domain capabilities.

The Editor should not implement a second independent viewport engine.

---

# 74. Editor + Project Intelligence

The Editor consumes Project Intelligence.

It should use the Project Model to understand:

```text
Pages
Routes
Components
Assets
Styles
Dependencies
```

The Editor should not build a parallel semantic project scanner.

---

# 75. Editor + Adapter System

Whenever an edit is technology-dependent:

```text
Editor
↓
Engine
↓
Adapter
↓
Source Transformation
```

The Editor must not contain:

```text
if React
if Vue
if Svelte
```

for deep source transformation behavior.

---

# 76. Editor + Runtime

Preview, builds and tests use Runtime capabilities.

The Editor must not directly launch operating-system processes.

---

# 77. Editor + Control Plane

Every important Editor operation should have a corresponding application/domain capability.

This ensures AI and other programmatic consumers can perform the same operation without using the UI.

---

# 78. API Representation

Examples:

```text
editor.selection.read
editor.change.create
editor.change.preview
editor.change.apply
editor.change.reject
editor.source.open
editor.source.save
```

These are conceptual capabilities.

The final Control Plane should expose underlying domain operations rather than creating an unnecessarily UI-specific public API.

---

# 79. Source Save Contract

A successful save means:

```text
Source Project
+
Expected Modification
+
Persistence Confirmed
```

It does not mean:

```text
UI State Updated
```

alone.

---

# 80. Acceptance Criteria

The Editor is correctly implemented when:

1. Visual edits modify the real Source Project.
2. Code edits modify real project files.
3. Inspector controls correspond to actual supported capabilities.
4. Source Mapping links visual elements to source when reliable.
5. Mapping uncertainty is represented.
6. Visual and code views use the same underlying project state.
7. Undo/redo does not silently overwrite external changes.
8. Save confirms real persistence.
9. Failed saves remain recoverable.
10. External changes can be detected.
11. Conflicts are represented.
12. Diff displays real changes.
13. AI changes can be reviewed.
14. Preview renders the actual project.
15. Framework-specific behavior is delegated to Adapters.
16. Git state comes from real Git.
17. Runtime operations use Runtime boundaries.
18. Permissions are enforced.
19. Unsupported operations are not presented as fully functional.
20. AI can perform supported Editor-related operations programmatically without Playwright.
21. Large projects can be handled without loading everything at once.
22. No UI state is treated as the authoritative Source Project.

---

# 81. K3 Swarm Implementation Protocol

Before implementing the Editor, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `02-PROJECT-INTELLIGENCE.md`.
3. Read `03-ADAPTER-SYSTEM.md`.
4. Read `04-RUNTIME-AND-SECURITY.md`.
5. Read `05-NEXO-ENGINE.md`.
6. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
7. Inspect the actual frontend stack selected for Nexo.
8. Verify current official documentation for the chosen editor/runtime libraries.
9. Implement Visual Editor and Code Editor as consumers of Engine capabilities.
10. Implement Source Mapping against Project Intelligence.
11. Test real edits against fixture projects.
12. Test external modification and conflict cases.
13. Test AI-generated changes through the same domain capabilities.
14. Verify that no privileged operation depends on Playwright.

---

# 82. Final Principle

The Nexo Editor is not the project.

It is a controlled interface for manipulating the project through Nexo capabilities.

The architectural relationship is:

```text
                    NEXO EDITOR
                         │
            ┌────────────┼────────────┐
            │            │            │
        Visual View   Code View   Inspector
            │            │            │
            └────────────┼────────────┘
                         │
                    NEXO ENGINE
                         │
              ┌──────────┼──────────┐
              │          │          │
           Project     Component   Design
              │          │          │
              └──────────┼──────────┘
                         │
                      ADAPTERS
                         │
                       RUNTIME
                         │
                    SOURCE PROJECT
```

The defining rule is:

> **The Editor may present and manipulate the project, but only the real project and the underlying Nexo capabilities determine what has actually been changed.**

```
```
