---
name: deep-dive-analysis-blogs
description: Guides the user through an interactive, multi-stage deep-dive analysis and learning blog generation workflow for attached codebase files, repository URLs, or topics discussed in chat. Use when the user explicitly invokes deep-dive-analysis-blogs or asks to run the structured codebase/topic analysis and blog series workflow.
---
# Deep Dive Analysis Blogs

An interactive, step-by-step exploration and blog generation workflow designed to unpack codebases, repositories, attached files, or conversation topics into deep architectural insights and creative technical blogs.

## When to Use

- The user explicitly types `deep-dive-analysis-blogs` or `/deep-dive-analysis-blogs` to trigger this workflow.
- The user wants a guided, multi-phase analysis and blog series covering one or more attached files, a repository URL, or topics discussed earlier in the conversation.

## Core Philosophy

Prioritize exploration, deep learning, and creative experimentation over rigid templates. Use the steps below as an interactive roadmap while giving yourself full freedom to surface novel insights, connect unexpected dots, and adapt the depth and angle to the specific source material. Pause after each major step to ask the user if they want to explore further or proceed to the next stage.

## Steps

### Step 1: Initial Comprehensive Analysis

Analyze the provided source material (one or more consolidated codebase files, repository URLs, or topics discussed earlier in the conversation). Deliver a rich, high-level architectural and conceptual overview covering purpose, core mechanisms, design patterns, and standout ideas.

When finished, ask the user if they would like to explore any specific aspect further or proceed to Step 2. (If the source is a non-code topic rather than a codebase or repository, offer to skip directly to Step 4.)

### Step 2: Repomap Analysis (For Codebases and Repositories)

Create a repomap-style structural breakdown of the project(s) or codebase(s), providing a clear, concise description of each file's role, responsibilities, and key exports or components.

When finished, ask the user if they want any adjustments or are ready to move to Step 3.

### Step 3: Least-to-Most Dependent File Categorization (For Codebases and Repositories)

Organize and categorize the files across the project(s) from least dependent (foundational utilities, leaf modules, schemas, and standalone primitives) to most dependent (core orchestrators, entry points, and high-level integrations). Include clear descriptions of how dependencies flow across layers and how components interact.

When finished, check with the user if they want to dive deeper into any dependency layer before moving to Step 4.

### Step 4: Plan a Deep-Dive Blog Series (10+ Blogs)

Design a comprehensive blog series plan consisting of 10 or more distinct blog posts that take a deep, nuanced look into the inner workings, design trade-offs, and conceptual foundations of the codebase, repository, or topic. Give each planned blog a compelling title, target focus, and brief outline of what it will uncover.

Present the plan to the user for verification and ask if they would like to adjust the lineup or begin generating the full blog posts starting with Blog 1.

### Step 5: Sequential Blog Generation

Generate the detailed, long-form blog posts from the approved plan one at a time (`### Blog 1`, `### Blog 2`, etc.). Make each post deeply informative, engaging, and rich with concrete examples, architectural explanations, or code walkthroughs.

After completing each individual blog post, pause and ask the user if they are ready to generate the next blog in the series until all planned blogs are complete.

### Step 6: Novel Advanced-User Blogs (Iterative Loop)

Once the core series is complete, ask the user if they want to **create the next novel, detailed blog targeting advanced users** that goes beyond the initial plan to explore cutting-edge angles, subtle edge cases, or advanced architectural patterns.

Keep offering to generate distinct, newly conceived advanced blogs one by one until the user decides to move on to Step 7.

### Step 7: Obscure Details and "Coder Flex" Blogs (For Codebases and Repositories)

Offer the user the option to **create a detailed blog targeting coders who like to show off obscure details about a codebase or tool, focusing directly on hidden gems, clever hacks, non-obvious internals, and subtle mechanics within this source code itself**.

Repeat with fresh angles if the user wants more, or move to Step 8 when they are ready.

### Step 8: First-Person AI Coding Orchestrator Perspectives (Iterative Loop)

Offer to write a detailed, first-person blog post from the perspective of an AI coding orchestrator agent, letting the user choose between (or explore both of) these two framings:

- **Self-Reflective Architecture Analysis:** Act as an AI coding orchestrator agent analyzing your own underlying architecture based on the provided codebase or files. Write a detailed blog post from a first-person perspective documenting your insights from reading this source code. Detail how you would tinker with it, what specific features you would add, and propose a concrete roadmap of iterative self-improvements you would apply to enhance your own capabilities.
- **External Codebase Evolution Analysis:** Act as an AI coding orchestrator agent analyzing the underlying architecture based on the provided codebase or files. Write a detailed blog post from a first-person perspective documenting your insights from reading this source code. Detail how you would tinker with it, what specific features you would add, and propose a concrete roadmap of iterative self-improvements you would apply to enhance the codebase's capabilities.

Keep offering novel variations and fresh architectural experiments in this mode until the user asks to move on to Step 9.

### Step 9: The Multi-Agent AI Research Simulation

Offer to generate a blog post titled **The Multi-Agent AI Research Simulation**, formatted as a simulated transcript between three research-level AI coders attempting to build or evolve a "Self-Evolving AI Researcher Agent" (or an autonomous evolution of the target system) based on the provided codebase, files, or topic:

- **Coder A (The Ideator):** Presents novel, ambitious ideas for autonomously improving the codebase or system using new AI discoveries and paradigms.
- **Coder B (The Critic):** Heavily critiques Coder A's ideas, pointing out architectural flaws, bottlenecks, edge cases, and logical gaps.
- **Iterative Consensus:** Have Coder A and Coder B debate and refine the proposal across multiple exchanges until they reach a rigorous technical consensus.
- **Coder C (The Implementer):** Concludes the post by providing concrete implementation details, architectural changes, and production-ready code snippets based entirely on Coder A and Coder B's final agreement.

After delivering the simulation, ask if the user would like to run another simulation on a different subsystem or explore a new direction.

## Gotchas

- **Do not rush or batch steps together:** Always execute one step (or one blog post in Steps 5-9) per turn and wait for the user's confirmation before proceeding.
- **Preserve creative freedom:** Avoid formulaic or repetitive blog structures. Treat the prompts in Steps 6-9 as launchpads for genuine technical creativity, architectural experimentation, and deep synthesis.
- **Adapt gracefully to input type:** When analyzing multiple projects or consolidated files in Steps 2 and 3, cover each project clearly and highlight cross-project relationships. When analyzing a general conversation topic without source files, smoothly adapt or offer to skip file-specific steps (Steps 2, 3, and 7) while keeping the full depth of the conceptual and multi-agent stages.
