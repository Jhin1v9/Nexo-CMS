````md
# NEXO CMS — DESIGN AND RESPONSIVE LAB

## 1. Document Status

**Document:** `09-DESIGN-AND-RESPONSIVE-LAB.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the Design Engine and Responsive Lab responsible for visual styling, design tokens, responsive inspection, viewport testing and layout diagnostics.

This subsystem must allow Nexo to deeply customize the visual presentation of a project while preserving the project's existing technological and styling architecture.

---

# 2. Objective

The Design and Responsive subsystem must allow users and authorized AI agents to:

- inspect visual styles;
- modify colors;
- modify gradients;
- modify typography;
- modify spacing;
- modify borders;
- modify radius;
- modify shadows;
- modify design variables;
- modify themes;
- inspect responsive behavior;
- test arbitrary viewport sizes;
- detect overflow;
- detect unwanted text wrapping;
- stress test layouts;
- compare visual states;
- validate responsive behavior.

The system must modify the actual project source.

It must not maintain a fake design layer that exists only inside Nexo.

---

# 3. Core Principle

The central rule is:

> **Nexo must adapt itself to the project's design language instead of forcing every project into a Nexo design language.**

Examples:

```text
Tailwind Project
→ Prefer Tailwind conventions

CSS Modules Project
→ Prefer CSS Modules

CSS Variables Project
→ Prefer CSS Variables

styled-components Project
→ Prefer styled-components

Plain CSS Project
→ Prefer existing CSS structure
````

The Design Engine must use the appropriate Styling Adapter.

---

# 4. Architecture

```text
                    DESIGN + RESPONSIVE LAB
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     Design Engine       Responsive Engine       Preview
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                         NEXO ENGINE
                               │
                       STYLING ADAPTER
                               │
                           RUNTIME
                               │
                        SOURCE PROJECT
```

---

# 5. Design Engine Responsibilities

The Design Engine owns concepts such as:

```text
Colors
Gradients
Typography
Spacing
Borders
Radius
Shadows
Tokens
Variables
Themes
Visual States
```

It does not own:

* framework parsing;
* filesystem execution;
* Git;
* deployment;
* authentication;
* browser rendering implementation.

Those responsibilities belong to other subsystems.

---

# 6. Design Property Model

A design property should be represented structurally.

Conceptual properties:

```text
color
background
backgroundGradient
fontFamily
fontSize
fontWeight
lineHeight
letterSpacing
padding
margin
gap
width
height
border
borderRadius
boxShadow
opacity
```

The actual available properties depend on the selected resource and project capabilities.

---

# 7. Design Property Source

Every editable design value should identify its source when possible.

Possible sources:

```text
Direct Value
CSS Variable
Design Token
Tailwind Utility
Theme Configuration
Component Prop
Styled Component Rule
Inline Style
Unknown
```

This prevents the Editor from modifying the wrong layer.

---

# 8. Design Source of Truth

When a value is controlled by a reusable source of truth, the Design Engine should prefer modifying that source.

Example:

```text
--primary-color
```

used throughout the project should be modified directly rather than replacing every occurrence with a hardcoded color.

---

# 9. Color Model

Colors should support standard project-compatible representations such as:

```text
HEX
RGB
RGBA
HSL
HSLA
OKLCH
CSS Variables
Theme Tokens
Framework-specific values
```

The system must preserve the project's preferred representation when possible.

---

# 10. No Forced Color Conversion

The Design Engine must not convert an entire project from:

```text
HSL
```

to:

```text
HEX
```

just because the Nexo color picker prefers HEX.

The UI representation and source representation are separate concerns.

---

# 11. Color Editing

Color edit flow:

```text
Select Element
↓
Resolve Color Property
↓
Resolve Source
↓
Edit Color
↓
Generate Source Mutation
↓
Preview
↓
Validate
↓
Persist
```

The final value must exist in the actual project source.

---

# 12. Gradients

Gradient editing should support, where technically appropriate:

```text
Linear
Radial
Conic
Multiple Stops
Angle
Position
Opacity
```

The final representation must use the styling system already present in the project.

---

# 13. Gradient Preservation

If a project already uses a gradient token or variable:

```text
--hero-gradient
```

prefer modifying the existing representation instead of generating an unrelated gradient rule.

---

# 14. Typography

Typography editing may include:

```text
Font Family
Font Size
Weight
Line Height
Letter Spacing
Text Transform
Text Decoration
Text Alignment
```

The Design Engine should detect whether typography is controlled through:

```text
CSS
CSS Variable
Theme
Tailwind
Component Props
Framework Typography System
```

before modifying it.

---

# 15. Font Management

The system should be capable of identifying font sources such as:

```text
Local Font
Web Font
Google Font
Font File
CSS Import
Framework Font System
```

It must not automatically download or replace fonts unless explicitly requested.

---

# 16. Spacing

Spacing properties may include:

```text
Margin
Padding
Gap
Grid Gap
Column Gap
Row Gap
```

The Engine should prefer the project's spacing tokens or utilities when available.

---

# 17. Spacing Token Detection

If the project uses reusable spacing tokens:

```text
--space-md
```

or an equivalent system, the Design Engine should use them instead of introducing arbitrary values when the requested operation logically targets an existing token.

---

# 18. Borders

Supported properties may include:

```text
Border Width
Border Style
Border Color
Border Radius
Individual Sides
```

The system should preserve shorthand or longhand conventions where possible.

---

# 19. Border Radius

Radius editing should support:

```text
Global Radius
Top Left
Top Right
Bottom Right
Bottom Left
```

If the project uses a shared token, modify the token when appropriate.

---

# 20. Shadows

Shadow editing may include:

```text
Offset X
Offset Y
Blur
Spread
Color
Opacity
Multiple Shadows
```

The implementation must preserve the syntax actually used by the project.

---

# 21. Responsive Design Model

Responsive behavior must be modeled separately from desktop styling.

A property may vary by viewport.

Example:

```text
Desktop:
4 columns

Tablet:
2 columns

Mobile:
1 column
```

The system must represent these relationships without assuming universal breakpoint values.

---

# 22. Breakpoint Detection

The Responsive Engine must detect breakpoints from the actual project where possible.

Potential sources include:

```text
CSS Media Queries
Tailwind Configuration
Theme Configuration
Framework System
CSS Variables
Component Logic
```

The engine must not assume generic breakpoints such as:

```text
640
768
1024
1280
```

unless those values are actually present in the project.

---

# 23. Responsive Adapter

Responsive operations may depend on the Styling Adapter and Framework Adapter.

Example:

```text
Tailwind Project
→ Responsive utility classes

CSS Modules
→ Media queries

styled-components
→ Media query logic inside style definitions
```

The Design Engine must not implement one universal source representation.

---

# 24. Viewport Model

The Responsive Lab must support arbitrary viewport sizes.

A viewport should contain at least:

```text
Width
Height
Device Pixel Ratio when supported
Orientation
```

Optional information may include:

```text
User Agent
Touch Capability
Reduced Motion
Color Scheme
```

when the preview system supports these conditions.

---

# 25. Preset Viewports

The Responsive Lab may provide presets such as:

```text
Mobile
Tablet
Laptop
Desktop
Wide Desktop
```

Presets must be configurable.

The system must not treat presets as universal truth.

---

# 26. Custom Viewport

Users must be able to specify arbitrary dimensions.

Example:

```text
Width:
375

Height:
812
```

or:

```text
Width:
1366

Height:
768
```

The system should not restrict users to predefined devices.

---

# 27. Responsive Preview

The preview flow is:

```text
Select Project
↓
Select Viewport
↓
Start / Reuse Preview
↓
Render
↓
Inspect
```

The preview must use the actual project runtime.

---

# 28. Orientation

The Responsive Lab should support:

```text
Portrait
Landscape
```

when the rendering environment supports orientation simulation.

---

# 29. Responsive Diagnostics

The Lab should detect issues such as:

```text
Horizontal Overflow
Vertical Overflow
Content Clipping
Text Overflow
Unwanted Wrapping
Broken Grid
Broken Flex Layout
Fixed Element Overflow
Viewport-Dependent Bugs
```

Diagnostics must be based on actual rendered behavior.

---

# 30. Horizontal Overflow

Horizontal overflow should identify:

```text
Element
Bounding Box
Viewport
Overflow Amount
Potential Source
```

when the browser provides sufficient information.

---

# 31. Text Wrapping Detection

The system must be able to detect when text wraps unexpectedly.

Examples:

```text
Button text breaks into two lines
Heading creates unexpected third line
Navigation item wraps
Card title exceeds intended layout
```

The diagnostic should identify the affected element whenever possible.

---

# 32. Stress Testing

Stress Testing intentionally challenges layouts.

Examples:

```text
Very Long Heading
Very Long Button Text
Long Paragraph
Multiple Carousel Items
Large Image
Small Viewport
Large Viewport
Missing Image
Unexpected Content
Dynamic Data Length
```

Stress content must not automatically be written into the actual Source Project.

It is test data.

---

# 33. Stress Test Isolation

Stress testing should operate against:

```text
Temporary Test State
Preview Environment
Non-Persistent Rendering
```

unless the user explicitly requests applying a fix.

---

# 34. Responsive Diagnostic Result

A diagnostic result should include:

```text
Issue ID
Severity
Viewport
Element
Source Mapping when available
Description
Evidence
Suggested Fixes when available
```

Example:

```text
Issue:
Horizontal Overflow

Viewport:
375x812

Element:
Navigation Container

Overflow:
27px
```

---

# 35. Severity

Diagnostics should distinguish at least:

```text
INFO
WARNING
ERROR
CRITICAL
```

Severity must be based on measurable impact where possible.

---

# 36. No False Positives as Facts

The engine should distinguish:

```text
Confirmed Issue
Potential Issue
Unknown
```

If browser evidence is insufficient to prove a bug, report it as uncertain rather than definite.

---

# 37. Source Mapping from Diagnostics

A responsive issue should link back to the source when reliable.

Example:

```text
Viewport Issue
↓
Element
↓
Component
↓
Source File
↓
Line / Column
```

The mapping uses Project Intelligence and Source Mapping.

---

# 38. AI Responsive Diagnostics

AI should be able to consume structured diagnostics.

Example:

```text
Issue:
overflow

Viewport:
390x844

Element:
Hero Section

Source:
src/components/Hero.tsx

Evidence:
27px horizontal overflow
```

AI should not need to inspect screenshots alone when structured browser diagnostics are available.

---

# 39. AI Responsive Fix

AI may request:

```text
responsive.diagnose
```

followed by an authorized source modification.

Flow:

```text
Diagnose
↓
AI Analysis
↓
Proposed Fix
↓
Diff
↓
Apply
↓
Re-render
↓
Re-diagnose
```

---

# 40. Fix Verification

A responsive fix must be verified against the issue that motivated it.

Example:

```text
Before:
overflow = 27px

Apply Fix

After:
overflow = 0px
```

The system should record the verification result when measurable.

---

# 41. Regression Detection

A fix at one viewport must not silently break another.

The Responsive Lab should support comparing:

```text
Before
After
Multiple Viewports
```

when feasible.

---

# 42. Responsive Regression Matrix

A responsive validation may include:

```text
Mobile
Tablet
Desktop
Custom Sizes
```

The exact matrix can be configured.

---

# 43. Visual Comparison

The system should support comparison between render states.

Possible modes:

```text
Side-by-Side
Overlay
Difference
```

Visual comparison must use actual rendered project output.

---

# 44. Snapshot Model

A visual snapshot may contain:

```text
Project
Viewport
Source State
Timestamp
Preview URL / Reference
Image
Diagnostics
```

Snapshots must not be treated as the Source Project.

---

# 45. Visual Regression

Visual Regression should compare known states.

Example:

```text
Baseline
↓
New Render
↓
Comparison
↓
Difference
```

The exact image-diff algorithm must be selected based on reliability and performance.

---

# 46. Browser Engine

The Responsive Lab requires a real browser rendering environment for meaningful diagnostics.

The implementation may use an appropriate browser automation/rendering technology.

However, browser automation is used to render and test the project, not as the Nexo Control Plane.

---

# 47. Browser Capability Detection

The Responsive Lab should detect whether the rendering environment supports:

```text
Viewport Resize
Screenshots
DOM Inspection
Bounding Boxes
Computed Styles
Console Logs
Network Information
Performance Data
```

Do not assume every browser environment exposes identical functionality.

---

# 48. Computed Style Inspection

The Lab may inspect computed styles to diagnose problems.

Example:

```text
Element
Width
Height
Overflow
Display
Position
Font Size
Line Height
```

The system must distinguish computed style from source style.

A computed value alone does not tell the Engine where the source definition lives.

---

# 49. DOM Inspection

DOM inspection can provide rendering information.

However:

```text
DOM
≠
Source Code
```

The system must use Source Mapping when translating browser nodes back into project source.

---

# 50. Responsive Source Mapping

When a diagnostic identifies:

```text
div
```

the system should attempt to map it to:

```text
Component
Source File
Source Node
```

using Project Intelligence.

Do not assume DOM element order equals source order.

---

# 51. Design Tokens

The Design Engine should provide token detection.

Potential token types:

```text
Color
Spacing
Typography
Radius
Shadow
Breakpoint
Container Width
```

Tokens may be stored in different project systems.

The Engine must preserve the project's representation.

---

# 52. Theme Detection

The system should identify themes where supported:

```text
Light
Dark
Brand Theme
Custom Theme
```

Themes may be represented through:

```text
CSS Variables
Classes
Attributes
Configuration
Component State
```

The appropriate Adapter determines implementation.

---

# 53. Theme Editing

Theme changes should modify the project's existing theme system.

Do not introduce a parallel Nexo theme implementation into the project unless the user explicitly requests a Nexo-generated theme architecture.

---

# 54. Design System Detection

The Design Engine should attempt to identify whether the project already contains a design system.

Possible evidence:

```text
Tokens
Theme
Shared Components
Typography System
Spacing Scale
Color Palette
UI Library
```

If a design system exists, editing should prefer it.

---

# 55. Preserve Existing Design System

The system must not create a second design system because the existing one is difficult to understand.

The preferred sequence is:

```text
Detect Existing System
↓
Understand
↓
Reuse
↓
Modify
```

not:

```text
Ignore Existing System
↓
Create Nexo System
```

---

# 56. Gradient and Color Token Handling

If multiple elements use the same token:

```text
--brand-primary
```

the system should maintain that relationship after editing.

A visual editor operation should not silently detach an element from the shared token without explicit intent.

---

# 57. Responsive Token Handling

If a project defines responsive constants or tokens, the system should reuse them rather than inserting arbitrary values.

---

# 58. Layout Diagnostics

The Responsive Lab should identify common structural problems:

```text
Fixed width larger than viewport
Overflowing flex child
Grid minimum width issue
Unbreakable text
Absolute-positioned element overflow
Viewport-dependent margin
Image intrinsic size overflow
```

The system must distinguish observed behavior from inferred cause.

---

# 59. Suggested Fixes

Diagnostics may include possible fix strategies.

Example:

```text
Observed:
27px overflow.

Potential Causes:
fixed-width child
horizontal padding
unbreakable content

Suggested Inspection:
NavigationContainer
```

Suggestions must be presented as hypotheses unless verified.

---

# 60. No Automatic Blind Fix

The Responsive Lab must not automatically change source simply because a diagnostic exists.

The flow for automatic repair is:

```text
Detect
↓
Understand
↓
Propose
↓
Authorize
↓
Modify
↓
Validate
```

The system must never use:

```text
Problem
↓
Guess
↓
Write CSS
```

as the default behavior.

---

# 61. Responsive AI Autonomy

In autonomous AI mode, AI may perform the complete repair loop if policy allows:

```text
Diagnose
↓
Plan
↓
Modify
↓
Build / Render
↓
Validate
↓
Retry if authorized
```

Every source mutation remains subject to the normal authorization and Runtime boundaries.

---

# 62. Device Presets

The system may provide common presets but must not imply perfect simulation of every physical device.

A preset represents viewport conditions defined by Nexo, not an exact reproduction of hardware.

---

# 63. Browser Differences

Responsive results may vary across browsers.

The system should record browser/runtime information when relevant.

The Nexo must not claim universal browser compatibility from one browser engine unless explicitly configured and tested.

---

# 64. CSS Feature Detection

The system should identify browser support requirements when relevant.

When an edit relies on a feature whose support depends on browser version, the implementation agent must consult current official browser compatibility documentation.

---

# 65. Performance Diagnostics

Future versions may expose:

```text
Large Images
Long Main Thread Tasks
Layout Shift
Excessive DOM
Render Blocking
```

These are optional extensions unless explicitly prioritized.

Do not expand Responsive Lab scope indefinitely during initial implementation.

---

# 66. Design API

The Design Engine should expose structured capabilities such as:

```text
design.read
design.update
design.token.read
design.token.update
theme.read
theme.update
```

These capabilities must be accessible to UI and authorized AI through the same Nexo Engine.

---

# 67. Responsive API

The Responsive Engine should expose capabilities such as:

```text
responsive.viewport.create
responsive.preview
responsive.diagnose
responsive.stressTest
responsive.compare
responsive.snapshot
```

The exact public API contracts are defined by the Control Plane document.

---

# 68. Design Permissions

Design operations should support permissions such as:

```text
design.read
design.write
design.tokens.write
theme.write
```

The exact permission names belong to the Security/Control Plane specifications.

---

# 69. Responsive Permissions

Responsive analysis may be lower risk than source mutation.

Conceptually:

```text
responsive.read
responsive.diagnose
responsive.modify
```

must remain distinguishable.

---

# 70. Design and Git

Design changes modify the actual project.

Git sees them as ordinary source changes.

The Design Engine must not create a fake design history disconnected from Git.

---

# 71. Responsive and Git

Diagnostics themselves do not need to become Git changes.

Only source fixes become Git changes.

---

# 72. Design and Components

Component styling must remain connected to its source component.

Editing a component's appearance should update the component's actual styling representation when appropriate.

---

# 73. Component-Level Design

A component may define:

```text
Props
Styles
Tokens
Variants
Responsive Rules
```

The Design Engine must respect the component's schema and styling architecture.

---

# 74. Global vs Local Styling

The Engine must distinguish:

```text
Global Style
Theme
Token
Component Style
Instance Style
```

A user changing one button instance should not accidentally modify a global button token unless that is the explicit target.

---

# 75. Scope Resolution

Before modifying a style, the system should determine:

```text
What is selected?
Where does the current value come from?
Is it inherited?
Is it tokenized?
Is it component-level?
Is it global?
```

Only then should the system decide which source to modify.

---

# 76. Cascade Awareness

For CSS-based projects, the Design Engine must account for cascading behavior where relevant.

A visually observed style may be caused by:

```text
Inherited Rule
More Specific Selector
Inline Rule
Class
Media Query
Pseudo-class
CSS Variable
```

The engine must not assume the nearest source line is necessarily the source of the computed value.

---

# 77. Responsive Cascade Awareness

A value may change because of a media query or responsive utility.

The Editor must indicate responsive context when relevant.

---

# 78. Style Mutation Safety

Before modifying a shared selector/token, the engine should determine potential impact.

Example:

```text
Change:
.button background

Potential Impact:
17 usages
```

A user should know when an apparently local edit has global impact.

---

# 79. Impact Analysis

Design changes should be able to report:

```text
Affected Components
Affected Pages
Affected Tokens
Affected Viewports
Affected Instances
```

when determinable.

---

# 80. Acceptance Criteria

The Design and Responsive subsystem is correctly implemented when:

1. Existing styling systems are detected.
2. Design changes use the project's real styling language.
3. Colors can be edited without forcing representation conversion.
4. Gradients can be edited.
5. Typography can be edited.
6. Spacing can be edited.
7. Borders, radius and shadows can be edited.
8. Existing tokens can be detected and preserved.
9. Themes can be detected and edited where supported.
10. Responsive breakpoints are derived from actual project configuration when possible.
11. Arbitrary viewport sizes are supported.
12. Responsive preview uses the real project.
13. Overflow can be detected.
14. Text wrapping problems can be detected.
15. Stress testing is available.
16. Stress content is not persisted accidentally.
17. Diagnostics contain evidence.
18. Uncertainty is represented.
19. Source Mapping is used where possible.
20. AI can consume responsive diagnostics programmatically.
21. AI fixes can be validated through re-rendering.
22. Design and responsive changes modify actual source.
23. Global and local style scopes are distinguished.
24. The system does not silently create a second design system.
25. UI and AI use the same Design/Responsive capabilities.

---

# 81. K3 Swarm Implementation Protocol

Before implementing this subsystem, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `02-PROJECT-INTELLIGENCE.md`.
3. Read `03-ADAPTER-SYSTEM.md`.
4. Read `04-RUNTIME-AND-SECURITY.md`.
5. Read `05-NEXO-ENGINE.md`.
6. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
7. Inspect actual styling conventions of supported fixture projects.
8. Verify current official documentation for the selected browser/rendering tooling.
9. Implement design operations through Styling Adapters.
10. Implement responsive rendering through the real Runtime.
11. Test at arbitrary viewport sizes.
12. Test overflow and wrapping diagnostics.
13. Test design token preservation.
14. Test global-vs-local style scope.
15. Test external source changes.
16. Test AI diagnostic and repair workflows.
17. Never invent framework-specific styling behavior.

---

# 82. Final Principle

The Design and Responsive Lab must provide a powerful visual engineering environment without turning the project into a Nexo-specific visual abstraction.

The architecture is:

```text
                    DESIGN REQUEST
                           ↓
                    NEXO ENGINE
                           ↓
              PROJECT + STYLE CONTEXT
                           ↓
                    STYLE ADAPTER
                           ↓
                    REAL SOURCE
                           ↓
                    REAL PREVIEW
                           ↓
                    DIAGNOSTICS
                           ↓
                    VERIFIED RESULT
```

The core rule is:

> **Nexo must understand how the project already expresses design, then modify that language instead of replacing it.**

The Responsive Lab must do the same for responsive behavior:

> **Measure the real rendered project, identify real problems, map them back to real source, and verify the actual fix.**

```
```
