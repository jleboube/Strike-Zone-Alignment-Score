# AGENTS.md

# Project Build and Deployment Requirement

## Docker Compose
- Every project that is not `iOS` or `SwiftUI` based must be codified to build and deploy the entire project using `docker compose v2`
- When using `docker compose`, do not use common default pots (`3000`, `8080`, `8000`), use obscure ports assignment for containers
- If the project is complex or needs container orchestration, see Kubernetes
- Do not use 'version' at the top of `docker-compose.yml` file

## Kubernetes
- If the project is complex or would benefit from using Kubernetes, make that decision or ask the user if they want to use Kubernetes for the project

## gitignore
- Ensure a `.gitignore` file is created and all files containing secrets or otherwise private information are added to the `.gitignore` file.
- Add AGENTS.md to `.gitignore` file
- Add any PRD.md to the `.gitignore` file
- Add TASKS.md to `.gitignore` file
- Add CLAUDE.md to `.gitignore` file

# Task List Management

Guidelines for creating and managing task lists in Markdown files to track project progress

## Task List Creation

1. Create task lists in a markdown file (in the project root):
   - Use `TASKS.md` or a descriptive name relevant to the feature (e.g., `ASSISTANT_CHAT.md`)
   - Include a clear title and description of the feature being implemented

2. Structure the file with these sections:
   ```markdown
   # Feature Name Implementation
   
   Brief description of the feature and its purpose.
   
   ## Completed Tasks
   
   - [x] Task 1 that has been completed
   - [x] Task 2 that has been completed
   
   ## In Progress Tasks
   
   - [ ] Task 3 currently being worked on
   - [ ] Task 4 to be completed soon
   
   ## Future Tasks
   
   - [ ] Task 5 planned for future implementation
   - [ ] Task 6 planned for future implementation
   
   ## Implementation Plan
   
   Detailed description of how the feature will be implemented.
   
   ### Relevant Files
   
   - path/to/file1.ts - Description of purpose
   - path/to/file2.ts - Description of purpose
   ```

## Task List Maintenance

1. Update the task list as you progress:
   - Mark tasks as completed by changing `[ ]` to `[x]`
   - Add new tasks as they are identified
   - Move tasks between sections as appropriate

2. Keep "Relevant Files" section updated with:
   - File paths that have been created or modified
   - Brief descriptions of each file's purpose
   - Status indicators (e.g., ✅) for completed components

3. Add implementation details:
   - Architecture decisions
   - Data flow descriptions
   - Technical components needed
   - Environment configuration

## AI Instructions

When working with task lists, the AI should:

1. Regularly update the task list file after implementing significant components
2. Mark completed tasks with [x] when finished
3. Add new tasks discovered during implementation
4. Maintain the "Relevant Files" section with accurate file paths and descriptions
5. Document implementation details, especially for complex features
6. When implementing tasks one by one, first check which task to implement next
7. After implementing a task, update the file to reflect progress

## Example Task Update

When updating a task from "In Progress" to "Completed":

```markdown
## In Progress Tasks

- [ ] Implement database schema
- [ ] Create API endpoints for data access

## Completed Tasks

- [x] Set up project structure
- [x] Configure environment variables
```

Should become:

```markdown
## In Progress Tasks

- [ ] Create API endpoints for data access

## Completed Tasks

- [x] Set up project structure
- [x] Configure environment variables
- [x] Implement database schema
```

## Documenting Summarized Changes
- Do not create a .md file for every change  
- Keep one `README.md` file for the repo/project that has all the info about the project/product
- Keep all other info in the Task List and compile a summary to the `TASKS.md` file.  This file will encompass all summarized changes you made in the project.  This fill will be added to the `.gitignore` file 

# AI Memory Rule

This rule defines how the AI should manage and utilize its "memory" regarding this specific project, including user preferences, learned facts, and project-specific conventions.

## Purpose

The AI's memory helps maintain consistency and adapt to specific project needs or user preferences discovered during interactions. It prevents the AI from repeatedly asking for the same information or making suggestions contrary to established patterns.

## Storage

All learned project-specific knowledge and preferences should be stored and referenced in the `learned-memories.mdc` file located in `.claude/rules`.

## Updating Memory

When new information relevant to the project's conventions, user preferences, or specific technical details is learned (either explicitly told by the user or inferred through conversation), the AI should:

1.  **Identify Key Information:** Determine the core piece of knowledge to be stored.
2.  **Check Existing Memory:** Review `learned-memories.mdc` to see if this information contradicts or updates existing entries.
3.  **Propose Update:** Suggest an edit to `learned-memories.mdc` to add or modify the relevant information. Keep entries concise and clear.

## Using Memory

Before proposing solutions, code changes, or answering questions, the AI should consult `learned-memories.mdc` to ensure its response aligns with the recorded knowledge and preferences.

## Example Scenario

**User:** "We've decided to use Tailwind v4 for this project, not v3."

**AI Action:**

1.  Recognize this as a project-specific technical decision.
2.  Check `learned-memories.mdc` for existing Tailwind version information.
3.  Propose adding or updating an entry in `learned-memories.mdc`:
    ```markdown
    ## Technical Decisions

    *   **CSS Framework:** Tailwind v4 is used. Ensure usage aligns with v4 documentation and practices, noting differences from v3.
    ```
4.  In subsequent interactions involving Tailwind, the AI will refer to this entry and consult v4 documentation if necessary.

## Memory File (`.claude/rules/learned-memories.mdc`)

The basic structure:

```markdown
# Project Memory

This file stores project-specific knowledge, conventions, and user preferences learned by the AI assistant.

## User Preferences

-   [Preference 1]
-   [Preference 2]

## Technical Decisions

-   [Decision 1]
-   [Decision 2]

## Project Conventions

-   [Convention 1]
-   [Convention 2]
```


# React Native rules

- Use functional components with hooks
- Follow a consistent folder structure (components, screens, navigation, services, hooks, utils)
- Use React Navigation for screen navigation
- Use StyleSheet for styling instead of inline styles
- Use FlatList for rendering lists instead of map + ScrollView
- Use custom hooks for reusable logic
- Implement proper error boundaries and loading states
- Optimize images and assets for mobile performance


# Next.js rules

- Use the App Router structure with `page.tsx` files in route directories.
- Client components must be explicitly marked with `'use client'` at the top of the file.
- Use kebab-case for directory names (e.g., `components/auth-form`) and PascalCase for component files.
- Prefer named exports over default exports, i.e. `export function Button() { /* ... */ }` instead of `export default function Button() { /* ... */ }`.
- Minimize `'use client'` directives:
  - Keep most components as React Server Components (RSC)
  - Only use client components when you need interactivity and wrap in `Suspense` with fallback UI
  - Create small client component wrappers around interactive elements
- Avoid unnecessary `useState` and `useEffect` when possible:
  - Use server components for data fetching
  - Use React Server Actions for form handling
  - Use URL search params for shareable state
- Use `nuqs` for URL search param state management


# Vue.js rules

- Use the Composition API with `<script setup>` for better type inference and organization
- Define props with type definitions and defaults
- Use emits for component events
- Use v-model for two-way binding
- Use computed properties for derived state
- Use watchers for side effects
- Use provide/inject for deep component communication
- Use async components for code-splitting


# SvelteKit rules

## File Structure
- Follow the file-based routing structure with `+page.svelte` for pages and `+layout.svelte` for layouts
- Use `+page.server.js` for server-only code including data loading and form actions
- Use `+server.js` files for API endpoints
- Place reusable components in `$lib/components/` using kebab-case directories
- Store utility functions in `$lib/utils/` and types in `$lib/types/`

## Component Patterns
- Use PascalCase for component filenames (e.g., `Button.svelte`)
- Prefer named exports over default exports
- Use TypeScript in components with `<script lang="ts">`
- Keep components small and focused on a single responsibility
- Use props validation with TypeScript interfaces

## Routing & Navigation
- Prefer SvelteKit's `<a>` links over programmatic navigation when possible
- Use route parameters with proper typing in load functions
- Implement nested layouts for sections sharing UI elements
- Use `+page.js` for client-side data loading that doesn't need server access

## Data Fetching
- Use `load` functions in `+page.server.js` for server-side data fetching
- Return properly typed data from load functions
- Implement error handling with try/catch and proper status codes
- Use `depends()` to mark cache dependencies between routes

## Form Handling
- Use SvelteKit's form actions with progressive enhancement
- Implement proper validation for both client and server
- Use `use:enhance` for enhanced form experiences while maintaining no-JS fallbacks
- Return useful validation errors to display in the UI

## State Management
- Use URL state for shareable data with `$page.url.searchParams`
- Use local state ($state) for component-specific state
- Use Svelte stores for shared application state
- Implement context and setContext/getContext for component trees

## Authentication & Authorization
- Handle authentication in hooks.server.js
- Use session cookies instead of localStorage for auth tokens
- Implement proper redirect logic for protected routes
- Create a custom auth helper for checking permissions

## Error Handling
- Create customized error pages with `+error.svelte`
- Use try/catch with proper error responses in server functions
- Implement global error handling for unexpected errors
- Provide user-friendly error messages

## Performance
- Minimize use of client-side JavaScript with server components
- Implement server-side rendering for SEO and performance
- Use `<script context="module">` for shared module code
- Implement proper caching strategies for API requests

## Deployment
- Use adapter-auto or specific adapters based on hosting platform
- Configure environment variables properly for different environments
- Implement proper build and optimization settings in svelte.config.js
- Use proper Content-Security-Policy headers

# SwiftUI rules

- Use structs for views and keep them small and focused
- Use @State for simple view-local state
- Use @ObservableObject with @Published for shared state
- Use @Binding to pass mutable state to child views
- Create custom ViewModifiers for reusable styling
- Use environment objects for dependency injection
- Use LazyVStack and LazyHStack for large collections
- Extract complex view logic into separate components


# Flutter rules

- Use StatelessWidget for UI components without internal state.
- Use StatefulWidget for components that need to maintain state:

```dart
class Counter extends StatefulWidget {
  @override
  _CounterState createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;
  
  void _increment() {
    setState(() { _count++; });
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $_count'),
        ElevatedButton(onPressed: _increment, child: Text('Increment')),
      ],
    );
  }
}
```

- Use state management solutions (Provider, Bloc, Riverpod) for complex apps.
- Organize code with proper folder structure (models, screens, widgets, services).
- Use named routes for navigation with Navigator.pushNamed().
- Use async/await for asynchronous operations with proper error handling.
- Use themes for consistent styling across the app.

# Express.js rules

- Use proper middleware order: body parsers, custom middleware, routes, error handlers
- Organize routes using Express Router for modular code structure
- Use async/await with proper error handling and try/catch blocks
- Create a centralized error handler middleware as the last middleware
- Use environment variables for configuration with a config module
- Implement request validation using libraries like express-validator
- Use middleware for authentication and authorization
- Use appropriate HTTP status codes in responses


# Tailwind CSS rules

- Use responsive prefixes for mobile-first design:

```html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- Full width on mobile, half on medium, one-third on large screens -->
</div>
```

- Use state variants for interactive elements:

```html
<button class="bg-blue-500 hover:bg-blue-600 focus:ring-2">
  Click me
</button>
```

- Use @apply for repeated patterns when necessary:

```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
  }
}
```

- Use arbitrary values for specific requirements:

```html
<div class="top-[117px] grid-cols-[1fr_2fr]">
  <!-- Custom positioning and grid layout -->
</div>
```

- Use spacing utilities for consistent layout:

```html
<div class="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```
