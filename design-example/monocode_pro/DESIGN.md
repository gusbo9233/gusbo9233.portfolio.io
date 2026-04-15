# Design System Strategy: The Architectural Portfolio

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Architect"**

This design system moves away from the "generic dev portfolio" template. Instead of a standard grid of cards, we treat the developer’s work as an editorial showcase. The philosophy is rooted in **Structural Minimalism**: using high-contrast typography, expansive negative space, and tonal depth to convey extreme technical competence. 

By utilizing intentional asymmetry—such as offset headers and staggered project layouts—we create a rhythmic flow that mirrors the complexity of clean code. The interface should feel less like a website and more like a high-end, interactive technical monograph.

---

## 2. Colors & Surface Philosophy
The palette is built on a foundation of `surface` (#0b1326), a deep, obsidian blue that provides a sophisticated "void" for content to inhabit. 

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. We define boundaries through **Tonal Transitions**. 
- To separate a hero section from a project gallery, shift from `surface` to `surface-container-low` (#131b2e). 
- To define a code snippet area, use `surface-container-highest` (#2d3449) against the main background.

### Surface Hierarchy & Nesting
Depth is created by nesting layers of light. 
- **Base Layer:** `surface` (#0b1326)
- **Primary Content Area:** `surface-container` (#171f33)
- **Interactive Floating Elements:** `surface-bright` (#31394d)

### The "Glass & Gradient" Rule
To inject "soul" into the tech-heavy aesthetic, use glassmorphism for navigation bars and floating action buttons. Use a background of `surface_container` at 70% opacity with a `backdrop-blur` of 20px. 
For CTAs, apply a subtle linear gradient from `primary` (#c0c1ff) to `primary_container` (#4446d2) at a 135-degree angle. This prevents the "flat" look and adds a premium, tactile quality.

---

## 3. Typography: Editorial Authority
The type system pairs the technical precision of **Space Grotesk** with the human-centric readability of **Manrope**.

- **Display & Headlines (Space Grotesk):** Used for "The Statement." These should be set with tight letter-spacing (-0.02em). Use `display-lg` (3.5rem) for hero statements to establish immediate authority.
- **Body & Titles (Manrope):** Used for the narrative. Manrope’s geometric yet friendly curves balance the sharp edges of the headlines.
- **Labels (Inter):** Used for technical metadata (e.g., GitHub stats, language tags). These should be set in `label-md` or `label-sm` with increased letter-spacing (0.05em) and all-caps for a "blueprint" feel.

---

## 4. Elevation & Depth
We eschew traditional drop shadows in favor of **Tonal Layering** and **Ambient Light**.

- **The Layering Principle:** Place `surface-container-lowest` cards on a `surface-container-low` section. This creates a "recessed" look, suggesting the content is etched into the interface.
- **Ambient Shadows:** For elements that must float (like tooltips or modals), use a shadow color derived from `on_surface` at 5% opacity, with a 32px blur and 16px offset. It should feel like a soft glow rather than a dark stain.
- **The "Ghost Border" Fallback:** If a container requires a boundary (e.g., a code block), use the `outline_variant` (#454652) at **15% opacity**. It should be felt, not seen.
- **Glassmorphism:** Apply to floating cards using `surface_container_high` with a 60% opacity and a subtle 1px "Ghost Border" on the top and left edges to simulate light hitting an edge.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text. Border radius `md` (0.375rem).
- **Secondary:** Transparent fill with a `ghost border`. On hover, transition to `surface_container_highest`.
- **Tertiary (Ghost):** No background, `primary` text. Use for low-emphasis actions like "View Source."

### Chips (Tech Tags)
- Use `secondary_container` (#39485a) for the background with `on_secondary_container` text. 
- Use the `sm` (0.125rem) radius for a sharper, more technical "microchip" appearance.

### Cards (Project Showcase)
- **Strictly no dividers.** Separate project title from description using `title-lg` and `body-md` typography scales and a 1.5rem vertical gap.
- On hover, a card should transition from `surface-container-low` to `surface-container-high` and slightly scale (1.02x) to indicate interactivity.

### Input Fields
- Understated. Use a bottom-only "Ghost Border" that transforms into a 2px `primary` line on focus. Labels should use `label-md` in `on_surface_variant`.

### GitHub Project Feed (Custom Component)
- A vertical list using `surface-container-lowest`. Use `tertiary` (#ffb784) for "Star" counts to provide a warm, vibrant accent against the cool blue-gray foundation.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use asymmetrical margins. A project description might be offset by 2 columns to the right of its title.
- **Do** use `primary_fixed_dim` (#c0c1ff) for high-importance keywords within body text.
- **Do** leverage whitespace as a functional element to group related technical concepts.

### Don’t:
- **Don’t** use pure black (#000000). Always use `surface` (#0b1326) to maintain tonal depth.
- **Don’t** use 100% opaque `outline` tokens for borders. It breaks the "Architectural" softness.
- **Don’t** use standard "cards with shadows" for everything. Try using background color shifts to define areas first.
- **Don’t** crowd the UI. If a section feels "full," double the padding. Professionalism is found in the "breathing room."