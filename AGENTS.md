# GreenWay 2.0 Development Guidelines & Agent Workflow

## Core Agent Workflow
When the user asks to change, fix, or update any UI element, feature, or behavior (from descriptions, code snippets, or uploaded screenshots):
1. **Locate Immediately**: Search the codebase (`grep_search`, `find_by_name`) to pinpoint the exact file(s) and component(s) involved.
2. **Analyze Carefully**: Read and analyze the component structure, state management, props, and styling.
3. **Execute Immediately**: Implement the requested change directly and accurately according to the user's exact instructions without unnecessary delays or intermediate approval steps for UI/layout tweaks.
4. **Verify**: Verify the edits using static analysis (`npx tsc --noEmit`) to guarantee clean compilation with zero regressions.
5. **Report Clearly**: Provide a concise summary of the changes made with clickable file links.

## Design & UI Guidelines
- **Premium, Typography-Driven Minimalist Vibe**: Keep layouts clean, balanced, and free of unnecessary decorative clutter, verbose helper text, or redundant icons.
- **Consistent Radius & Inputs**: Form inputs, buttons, and popovers use `rounded-xl`, subtle border (`border-border`), and appropriate height (`h-10` or `h-9`).
- **Balanced Grids**: Multi-column form fields (such as Target Audience & Notice Type) must use balanced grids (`grid-cols-2 gap-3`) so inputs share width symmetrically.

## Operational Constraints
- **Local Filesystem Only**: Always inspect and edit the actual files directly on your PC in the `GreenWay` folder (`c:\web\GreenWay\GreenWay2.0`). Never check or reference git history, remotes, or branches.
- **Strictly No Git**: Never suggest, run, or check any git commands (`git diff`, `git status`, `git log`, etc.). Work exclusively with the local files on the machine.
