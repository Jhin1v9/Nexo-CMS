````md
# NEXO CMS — COMPONENT AND MEDIA ENGINE

## 1. Document Status

**Document:** `08-COMPONENT-AND-MEDIA-ENGINE.md`  
**Product:** Nexo CMS  
**Document Type:** Engineering Specification  
**Audience:** Nexo Digital Engineering Team, K3 Agent Swarm, AI Coding Agents  
**Status:** Engineering Specification  
**Authority:** Defines the universal Component Engine, Component Library, Component Studio integration and Media Engine.

This document defines how Nexo represents, creates, modifies, stores, validates and reuses components and media across different project technologies.

The fundamental requirement is:

> **Components and media must be reusable through Nexo without forcing the source project into a Nexo-specific technology.**

---

# 2. Objective

The Component and Media Engine must provide a universal abstraction for concepts such as:

```text
Component
Page Section
Hero
Button
Carousel
Gallery
Form
FAQ
Testimonials
Maps
Video
WhatsApp Widget
Custom Embed
Image
Video
SVG
Asset
````

while preserving the project's actual implementation.

A component created for a Next.js project does not have to be physically represented the same way as a component created for Vue, Svelte or plain HTML.

Nexo provides the universal capability.

The Adapter determines the real source representation.

---

# 3. Architecture

```text
                         COMPONENT / MEDIA ENGINE
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
      Component Model          Media Model          Library Model
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                              NEXO ENGINE
                                    │
                           PROJECT ADAPTERS
                                    │
                                RUNTIME
                                    │
                            SOURCE PROJECT
```

---

# 4. Core Principle

The Nexo component system must not become a second framework.

It must not impose:

```text
Nexo Component Runtime
Nexo JSX
Nexo CSS
Nexo Component Syntax
```

on every project.

Instead:

```text
Universal Nexo Component Definition
                ↓
Project Adapter
                ↓
Real Project Representation
```

---

# 5. Component Types

The initial component system must support multiple classes of components.

## 5.1 Native Project Component

A component already implemented inside the project.

Example:

```text
src/components/Hero.tsx
```

Nexo detects and manages it.

---

## 5.2 Nexo Library Component

A reusable component stored in the Nexo Component Library and designed to be inserted into compatible projects.

---

## 5.3 Generated Project Component

A component created by Nexo specifically for a project.

---

## 5.4 External Component

A component supplied through:

* custom code;
* embed;
* external widget;
* iframe;
* script;
* third-party integration.

---

## 5.5 Composite Component

A component composed from existing components.

Example:

```text
Hero
├── Heading
├── Paragraph
├── Button
└── Image
```

---

# 6. Component Identity

Every managed component must have a stable identity within its scope.

Conceptually:

```text
Component
├── ID
├── Name
├── Scope
├── Source
├── Version
├── Schema
├── Capabilities
└── Metadata
```

Possible scopes:

```text
Project
Workspace
Library
```

A Project Component and Global Component must not be confused.

---

# 7. Component Ownership

A component must have an explicit owner/scope.

Examples:

```text
Project Component
→ Project

Global Component
→ Workspace

External Component
→ Integration / Provider
```

The component system must not assume that every component is globally reusable.

---

# 8. Component Source

A managed component must identify its source representation.

Possible source:

```text
Project File
Multiple Project Files
Generated Source
External Script
External Widget
Library Package
Integration
```

The source reference must remain traceable.

---

# 9. Component Schema

A component may expose structured properties.

Conceptually:

```text
Component
├── Identity
├── Props
├── Variants
├── Slots
├── Events
├── Assets
├── Styles
├── Responsive Rules
└── Metadata
```

The exact schema must be serializable and machine-readable.

---

# 10. Props

Props represent configurable component inputs.

Example:

```text
Hero
├── title
├── description
├── image
├── buttonLabel
└── buttonUrl
```

Each property should have:

```text
Name
Type
Default
Required
Description
Validation
```

---

# 11. Property Types

The component system should support common types:

```text
String
Number
Boolean
Image
Video
URL
Color
Rich Text
Enum
Array
Object
Component Reference
Slot
```

Additional types may be introduced through the Component Schema.

---

# 12. Validation

Props must be validated before a component mutation is applied.

Example:

```text
buttonUrl
```

must not silently accept structurally invalid values when the component contract requires a URL.

Validation should occur before source mutation whenever possible.

---

# 13. Variants

Components may expose variants.

Example:

```text
Button
├── primary
├── secondary
├── outline
└── ghost
```

Variants must be represented in the component schema and translated through the appropriate adapter.

---

# 14. Slots

Components may allow content insertion through slots or equivalent project mechanisms.

Example:

```text
Card
└── Content Slot
```

The Component Engine must distinguish:

```text
Fixed Prop
```

from:

```text
Composable Slot
```

---

# 15. Responsive Properties

Components may expose viewport-specific properties.

Example:

```text
Columns
Desktop: 4
Tablet: 2
Mobile: 1
```

The implementation must use the project's actual responsive mechanism.

Nexo must not assume a universal breakpoint system.

---

# 16. Component Compatibility

Before inserting a component into a project, Nexo must evaluate:

```text
Framework Compatibility
Styling Compatibility
Runtime Compatibility
Dependencies
Asset Requirements
Build Requirements
Version Constraints
```

Possible result:

```text
COMPATIBLE
PARTIAL
INCOMPATIBLE
UNKNOWN
```

---

# 17. No Forced Compatibility

If a component is incompatible, the system must not silently rewrite the project into another stack to make it work.

For example:

```text
Tailwind Component
```

must not cause a CSS Modules project to acquire Tailwind automatically unless the user explicitly requests that migration.

---

# 18. Component Dependencies

Components may depend on:

```text
Other Components
Packages
Assets
Styles
Utilities
External Integrations
```

Dependencies must be declared or detected where possible.

---

# 19. Dependency Analysis

Before publishing a project component globally, Nexo must inspect dependencies.

Example:

```text
Client-specific Hero
↓
uses local API
uses private asset
uses client-specific utility
```

This component must not automatically be published as universally reusable.

---

# 20. Component Creation Flow

The standard flow is:

```text
Request
↓
Resolve Project
↓
Resolve Adapter Set
↓
Validate Definition
↓
Check Dependencies
↓
Generate Source Representation
↓
Persist
↓
Re-analyze
↓
Validate
↓
Register Component
```

---

# 21. Component Creation Must Use Existing Project Conventions

When creating a component, the system should inspect existing project conventions such as:

```text
Naming
Directory Structure
Imports
Formatting
Styling
Component Patterns
Testing
Exports
```

A newly created component should fit the project instead of introducing an unrelated coding style.

---

# 22. Component Update Flow

```text
Resolve Component
↓
Resolve Source
↓
Validate Change
↓
Resolve Adapter
↓
Transform Source
↓
Persist
↓
Re-analyze
↓
Validate
↓
Return Diff
```

The Component Engine must not modify source blindly.

---

# 23. Component Deletion

Before deleting a component, inspect:

```text
References
Routes
Pages
Other Components
Assets
Exports
Tests
```

If active references are found, the system must report the impact.

Automatic cascading deletion should not occur without explicit rules.

---

# 24. Component Duplication

Duplicating a component must create a new component identity.

The clone should not accidentally share mutable state with the original.

References to assets and dependencies must be reviewed.

---

# 25. Component Promotion

A Project Component may be promoted to Workspace Library.

Flow:

```text
Project Component
↓
Dependency Analysis
↓
Compatibility Analysis
↓
Remove / Resolve Private References
↓
Review Metadata
↓
Version
↓
Publish
```

Promotion must not expose private project secrets or resources.

---

# 26. Component Versioning

Library components must be versioned.

A component version should identify:

```text
Component
Version
Source
Dependencies
Compatibility
Changes
Published At
```

A project using version `X` must not silently change to version `Y`.

---

# 27. Component Update Policy

Updating a library component in a project must be an explicit operation.

Flow:

```text
Update Available
↓
Compatibility Check
↓
Impact Analysis
↓
Diff
↓
Approve
↓
Apply
↓
Validate
```

Automatic updates require an explicit policy.

---

# 28. Component Deprecation

A component may become deprecated.

Deprecated does not mean immediately deleted.

The Library should provide:

```text
Current
Deprecated
Unsupported
Removed
```

states.

---

# 29. Component Library

The Component Library must support:

```text
Search
Filter
Preview
Compatibility
Version
Dependencies
Scope
Tags
Documentation
```

The Library must distinguish:

```text
Workspace Component
Project Component
External Component
Built-in Component
```

---

# 30. Component Library Search

Search should operate against structured metadata.

Possible filters:

```text
Framework
Category
Version
Tags
Scope
Compatibility
Source
```

---

# 31. Component Preview

A component preview should render the actual implementation whenever possible.

The preview must not substitute a fake implementation that differs materially from the component that will be inserted.

---

# 32. Component Documentation

A component may include:

```text
Description
Props
Variants
Slots
Dependencies
Usage
Examples
Compatibility
Version
```

Documentation should be accessible to both humans and AI agents.

---

# 33. AI Component Access

AI must be able to use component capabilities programmatically.

Examples:

```text
component.list
component.read
component.create
component.update
component.delete
component.publish
```

AI must not need to interact with Component Studio UI.

---

# 34. Component Tools

The AI Tool layer may expose component operations as structured tools.

Example:

```text
component.create
```

Input:

```text
name
description
props
variants
layout
assets
```

Output:

```text
componentId
filesChanged
diagnostics
status
```

The actual schema belongs to the Control Plane.

---

# 35. Built-In Components

The first Nexo component library should contain useful, practical components.

Initial candidates:

```text
Hero
Section
Container
Heading
Text
Button
Image
Gallery
Carousel
Card
Grid
Form
FAQ
Testimonials
Pricing
Video
Map
WhatsApp
Social Links
Footer
Custom Embed
```

The initial set is extensible.

---

# 36. Carousel Component

Carousel is a high-priority built-in component.

It must support, where technically appropriate:

```text
Slides
Image
Title
Description
Link
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

These properties must become real project configuration/source.

The Editor must not store carousel behavior only inside Nexo metadata.

---

# 37. Custom Embed Component

A Custom Embed component may contain:

```text
HTML
CSS
JavaScript
iframe
External Widget
External Script
```

Because this can introduce security risks, Custom Embed must pass through Integration and Security controls.

---

# 38. WhatsApp Component

A WhatsApp component may represent:

```text
Phone Number
Message
Label
Position
Icon
Target
```

The exact implementation depends on project conventions.

It must be implemented as a real component or integration in the target project.

---

# 39. Form Component

The Form component must distinguish:

```text
Presentation
Validation
Submission
Integration
Success State
Error State
```

A form cannot be considered functional merely because its UI is rendered.

The submission path must actually exist and be validated.

---

# 40. Map Component

Map integrations must distinguish:

```text
Static Map
Iframe
External Map Provider
API-backed Map
```

The component must not assume a specific provider unless the project configuration requires it.

---

# 41. Media Engine

The Media Engine manages project assets.

Supported classes may include:

```text
Image
SVG
Video
Audio
Font
PDF
Document
Other static asset
```

---

# 42. Media Identity

Every managed asset should have a stable identity where the Nexo tracks it.

Conceptually:

```text
Asset
├── ID
├── Type
├── Source
├── Metadata
├── Dimensions when applicable
├── References
└── Scope
```

---

# 43. Media Sources

An asset may originate from:

```text
Local Project
Uploaded File
Generated File
External URL
CDN
Library
Integration
```

The Media Engine must distinguish local source files from remote resources.

---

# 44. Media Upload

Upload flow:

```text
Select File
↓
Validate
↓
Security Check
↓
Process
↓
Store / Copy
↓
Index
↓
Register
```

A successful upload means the actual asset exists at the intended destination.

---

# 45. Media Validation

Validation should include where applicable:

```text
File Type
MIME Type
Size
Dimensions
Encoding
Security
Name
Path
```

Do not trust only the filename extension.

---

# 46. Image Processing

The Media Engine may support:

```text
Resize
Crop
Format Conversion
Compression
Optimization
Metadata Handling
```

Processing must preserve the original when the operation is defined as non-destructive.

---

# 47. Original Asset Preservation

When image editing is performed non-destructively, the system should preserve the original asset where practical.

The UI must distinguish:

```text
Original
Processed
Derived
```

---

# 48. Media Replacement

Media replacement must update real references.

Flow:

```text
Resolve Asset
↓
Find References
↓
Select Replacement
↓
Validate Compatibility
↓
Update References
↓
Persist
↓
Re-analyze
↓
Verify
```

Replacing an image in the Nexo UI must not merely change a preview URL.

---

# 49. Media Reference Tracking

The engine should track where assets are used when it can determine references reliably.

Example:

```text
Asset:
hero.webp

References:
Home Hero
About Page
Carousel
```

---

# 50. Unused Asset Detection

The Media Engine may identify assets with no known references.

Possible states:

```text
Used
Unused
Unknown
External
Generated
```

`Unknown` must not be treated as `Unused`.

---

# 51. Media Deletion

Before deletion, inspect references.

If known references exist:

```text
DELETE
```

should normally require confirmation or be blocked depending on policy.

The system must not silently break active project references.

---

# 52. Media Naming

The system should preserve project naming conventions.

Do not introduce arbitrary names like:

```text
image-final-final-2.webp
```

when the project has established naming conventions.

AI-generated assets should be assigned deterministic names appropriate to the project.

---

# 53. Asset Paths

Asset storage path must be determined by Project Intelligence and adapters.

Do not assume all projects use:

```text
/public
```

or:

```text
/src/assets
```

---

# 54. Media Optimization

Optimization should not alter the project unexpectedly.

Example:

```text
Original:
photo.png

Optimization:
photo.webp
```

must update all required references and maintain a valid fallback strategy when applicable.

---

# 55. External Media

If an asset is external:

```text
https://example.com/image.webp
```

the Media Engine must not attempt to delete or modify the external resource as if it were a local file.

It may manage the reference.

---

# 56. Asset Security

Media uploads must be checked for potentially unsafe files.

The exact security mechanism is defined by the Runtime/Security specification.

The system must not blindly execute uploaded content.

---

# 57. Media and AI

AI should be able to query media programmatically:

```text
media.list
media.read
media.search
media.upload
media.replace
```

AI should receive metadata appropriate to the task.

Binary asset content should only be provided when required.

---

# 58. Media and Editor

The Visual Editor should be able to open Media Library from an asset selection.

Flow:

```text
Select Asset
↓
Media
↓
Choose Replacement
↓
Update Source Reference
```

---

# 59. Component and Media Relationship

Components frequently depend on media.

Example:

```text
Hero
└── hero-image.webp
```

The Component Engine and Media Engine must preserve this relationship.

Deleting an asset should not silently leave a component referencing a missing file.

---

# 60. Component and Design Relationship

Components may depend on:

```text
Design Tokens
Styles
Theme
Typography
Variables
```

The Component Model should represent these dependencies where possible.

---

# 61. Component and Integration Relationship

Components may contain external integrations.

Example:

```text
Map
→ Google Maps iframe
```

or:

```text
Chat Widget
→ External Script
```

Such dependencies must be explicitly represented.

---

# 62. Component Serialization

Component definitions stored in Nexo Library must be serializable and versionable.

They must not depend on a live browser instance.

---

# 63. Component Portability

A component is portable only when its dependencies are understood.

A component may be:

```text
Portable
Partially Portable
Project-Specific
Non-Portable
```

The library must communicate this.

---

# 64. Project-Specific Components

A Project Component can safely depend on project-specific code.

However, it must not automatically become a globally reusable component.

---

# 65. Global Components

A Global Component must avoid hidden dependence on:

```text
Project Secrets
Private APIs
Private Files
Unknown Utilities
Project-Specific Environment Variables
```

Dependencies must be explicit.

---

# 66. Component Security

Components that contain executable code must be treated as code.

The Component Engine must not consider all components harmless visual assets.

A component may contain:

```text
JavaScript
Server-side code
Network requests
External scripts
Dynamic execution
```

and must therefore follow the appropriate security model.

---

# 67. Media Security

Media must be treated as untrusted input until validated.

Do not assume:

```text
.png
.jpg
.svg
```

is automatically safe simply because the extension appears harmless.

SVG in particular may contain active content depending on how it is processed or rendered.

The exact sanitization and serving policy must be defined by Security.

---

# 68. Component Installation

Installing a library component into a project must be a real project mutation.

Flow:

```text
Select Component
↓
Compatibility Check
↓
Dependency Check
↓
Resolve Adapter
↓
Generate Source
↓
Add Assets
↓
Register References
↓
Validate
```

The UI must not simply add component metadata.

---

# 69. Component Removal from Library

Removing a library component must not automatically remove copies already installed into projects.

Project-installed components and library entries have different lifecycles unless the architecture explicitly defines linked components.

---

# 70. Linked Components

Future linked component behavior may allow projects to track a library component.

If implemented, the relationship must be explicit.

The project must never change silently because a global component changed.

---

# 71. Component Migration

When a component changes its schema between versions, migration may be required.

Example:

```text
v1:
buttonText

v2:
label
```

The migration must define how old project usage maps to the new schema.

---

# 72. Media Migration

If an asset system changes location or format, migration must update actual references.

Metadata-only migration is insufficient.

---

# 73. Component Validation

Before a component is considered valid, the system should validate:

```text
Schema
Source
Dependencies
References
Adapter Compatibility
Build
Relevant Tests
```

The exact validation depth depends on project configuration.

---

# 74. Library Validation

A global component should pass a compatibility and dependency validation before publication.

At minimum:

```text
Source Integrity
Dependency Resolution
No Secret Leakage
No Private Project References
Schema Validity
Compatibility
```

---

# 75. AI Component Generation

AI may generate components through the Component Engine.

Flow:

```text
AI Request
↓
Component Definition
↓
Permission
↓
Component Validation
↓
Adapter
↓
Source Generation
↓
Diff
↓
Apply
↓
Build / Test
```

AI must not bypass Component Domain to directly generate arbitrary project source when a structured component operation exists.

---

# 76. AI Media Generation

If future AI providers can generate media, the output must enter through Media Engine operations.

The generated asset must receive:

* identity;
* metadata;
* source;
* project placement;
* references.

It must not appear as a UI-only temporary object.

---

# 77. Component Library as AI Knowledge

The Component Library should be queryable by AI.

AI should be able to discover:

```text
Available Components
Props
Variants
Compatibility
Dependencies
Examples
Versions
```

This reduces the need for AI to invent components that already exist.

---

# 78. Component Usage Recommendation

When AI receives a request such as:

> Create a carousel.

it should first be able to determine whether:

```text
Compatible Carousel Component
```

already exists.

Preferred flow:

```text
Search Library
↓
Check Compatibility
↓
Reuse Existing Component
```

instead of automatically creating a new duplicate component.

---

# 79. Duplication Prevention

Before creating a new global component, the system should check for existing compatible components.

The goal is to prevent:

```text
Carousel
Carousel2
CarouselNew
CarouselFinal
CarouselFinal2
```

from accumulating in the library.

---

# 80. Component Naming

Names must follow project and library conventions.

The system should prefer semantic names:

```text
Hero
ContactForm
ImageGallery
WhatsAppButton
Testimonials
```

rather than implementation-specific or generated names.

---

# 81. Component Metadata

Component metadata should support:

```text
Name
Description
Category
Tags
Version
Author
Scope
Compatibility
Dependencies
Created At
Updated At
```

Author may represent:

```text
Human
AI
System
External Provider
```

---

# 82. Media Metadata

Media metadata may include:

```text
Name
Type
Dimensions
Size
Source
Alt Text
Caption
Created At
Updated At
References
```

Metadata must not contain secrets.

---

# 83. Accessibility Metadata

Components and assets should support accessibility-related metadata where applicable.

Examples:

```text
Alt Text
Accessible Label
Role
Keyboard Behavior
Focus Behavior
```

Accessibility behavior must be represented in the actual source project.

---

# 84. SEO Metadata

Components that contribute SEO-critical information may expose relevant metadata.

Example:

```text
Image Alt
Structured Content
Heading Level
Link semantics
```

The exact SEO integration is handled through project-specific adapters.

---

# 85. Component Performance

The Component Engine must avoid generating unnecessary dependencies or source complexity.

A simple component should not automatically introduce:

* heavy libraries;
* duplicated CSS;
* unnecessary JavaScript;
* redundant assets.

Generated implementation must be proportionate to the component's requirements.

---

# 86. Dependency Minimization

When an existing project capability can implement the component without adding a dependency, prefer the existing capability.

Example:

A simple carousel does not automatically justify adding a large carousel library.

The decision must consider:

```text
Existing Dependencies
Project Architecture
Accessibility
Performance
Maintenance
Feature Requirements
```

---

# 87. Built-In vs Project Component

A built-in Nexo component is a reusable definition provided by the product.

A project component is actual source code belonging to the project.

The system must not confuse:

```text
Library Template
```

with:

```text
Installed Project Source
```

---

# 88. Component Installation Must Be Reversible

When possible, installation should produce identifiable changes that can be:

* reviewed;
* diffed;
* reverted;
* removed.

Git remains the ultimate project-level recovery mechanism.

---

# 89. Media Installation Must Be Reversible

Adding media should create identifiable source changes.

Removing the asset should be possible without deleting unrelated files.

---

# 90. Acceptance Criteria

The Component and Media Engine is correctly implemented when:

1. Components have stable identities.
2. Project and global components are distinguished.
3. Component schemas are structured.
4. Props are validated.
5. Components can contain variants.
6. Components can contain slots where supported.
7. Compatibility is checked before installation.
8. Framework-specific source generation is delegated to adapters.
9. Components can be versioned.
10. Components can be promoted to a global library.
11. Project-specific dependencies are detected before promotion.
12. Media assets have stable identities where required.
13. Media uploads are validated.
14. Media replacement updates real source references.
15. Asset deletion checks references.
16. External media is distinguished from local media.
17. Component installation modifies the real Source Project.
18. Media operations modify the real Source Project.
19. AI can use component and media capabilities programmatically.
20. The UI is not required for component or media operations.
21. Existing project conventions are preserved.
22. Styling systems are preserved.
23. Components do not silently add unrelated dependencies.
24. Unsupported framework operations are reported instead of guessed.
25. Component and asset operations are auditable.
26. Component and media changes produce real, reviewable project modifications.

---

# 91. K3 Swarm Implementation Protocol

Before implementing this subsystem, the Swarm must:

1. Read `01-SYSTEM-ARCHITECTURE.md`.
2. Read `02-PROJECT-INTELLIGENCE.md`.
3. Read `03-ADAPTER-SYSTEM.md`.
4. Read `04-RUNTIME-AND-SECURITY.md`.
5. Read `05-NEXO-ENGINE.md`.
6. Read `06-CONTROL-PLANE-AND-AGENT-API.md`.
7. Inspect the actual project/framework conventions.
8. Define the Component Model and schema.
9. Define the Media Model.
10. Implement compatibility checks.
11. Implement adapter-backed source generation.
12. Implement real source persistence.
13. Implement re-analysis after mutations.
14. Add fixture projects.
15. Test supported and unsupported stacks.
16. Test asset references.
17. Test component dependencies.
18. Test AI access through the same capabilities.
19. Research official framework documentation before implementing framework-specific behavior.
20. Never replace an unknown framework behavior with an invented generic implementation.

---

# 92. Final Principle

The Component and Media Engine exists to make reusable content structures possible without turning Nexo into another proprietary framework.

The architecture is:

```text
Universal Component / Media Model
              ↓
        Nexo Capability
              ↓
      Project Compatibility
              ↓
           Adapter
              ↓
      Real Source Mutation
              ↓
     Project Re-analysis
              ↓
          Validation
```

The fundamental rule is:

> **Nexo controls the concept; the project controls the implementation.**

A carousel in Nexo may be a React component, Vue component, Svelte component, plain HTML/CSS/JavaScript implementation or an existing library component.

Nexo must know what a carousel means.

The Adapter must know how that carousel actually exists in the target project.

The final result must always be real project source, not an editor-only illusion.

```
```
