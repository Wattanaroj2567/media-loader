#!/usr/bin/env node
/**
 * Project skill initializer - creates a workspace skill from a template
 *
 * Usage:
 *   node init-skill.mjs <skill-name> --path .agents/skills
 *
 * Examples:
 *   node init-skill.mjs invoice-automation --path .agents/skills
 */

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, relative, resolve, sep } from "path";

const SKILL_TEMPLATE = `---
name: {{skill_name}}
description: "[TODO: Clear explanation of what this skill does and when to use it]"
version: 1.0.0
---

# {{skill_title}}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## When to Use

[TODO: Specific triggers for when this skill applies]

## Workflow

[TODO: Step-by-step instructions for executing the workflow]

### Step 1: [Action]

[Details]

### Step 2: [Action]

[Details]

## Sub-workflows

[TODO: If this skill has complex sub-procedures, link to reference files:]

For [specific situation], read \`references/[situation].md\`

## Resources

This skill may include:

### scripts/
Executable code for operations that need deterministic reliability.

### references/
Detailed documentation loaded into context only when needed.

### assets/
Templates, images, or files used in output (not loaded into context).

---
Delete any unneeded directories and this Resources section when done.
`;

const EXAMPLE_SCRIPT = `#!/usr/bin/env node
/**
 * Example helper script for {{skill_name}}
 *
 * Replace with actual implementation or delete if not needed.
 */

function main() {
  console.log("This is an example script for {{skill_name}}");
  // TODO: Add actual script logic here
}

main();
`;

const EXAMPLE_REFERENCE = `# Reference Documentation for {{skill_title}}

[TODO: Add detailed reference documentation here]

This file is loaded into context only when an agent determines it's needed,
keeping the main SKILL.md lean.

## When to Use This Reference

- [Specific situation 1]
- [Specific situation 2]

## Details

[Detailed information for this sub-workflow]
`;

/**
 * Convert hyphenated skill name to Title Case for display.
 */
function titleCaseSkillName(skillName) {
    return skillName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Replace template placeholders with actual values.
 */
function fillTemplate(template, skillName, skillTitle) {
    return template.replace(/\{\{skill_name\}\}/g, skillName).replace(/\{\{skill_title\}\}/g, skillTitle);
}

/**
 * Initialize a new skill directory with template SKILL.md.
 */
function initSkill(skillName, basePath) {
    const skillDir = resolve(basePath, skillName);

    if (existsSync(skillDir)) {
        console.error(`❌ Error: Skill directory already exists: ${skillDir}`);
        return null;
    }

    const skillTitle = titleCaseSkillName(skillName);

    try {
        // Create main skill directory
        mkdirSync(skillDir, { recursive: true });
        console.log(`✅ Created skill directory: ${skillDir}`);

        // Create SKILL.md
        const skillContent = fillTemplate(SKILL_TEMPLATE, skillName, skillTitle);
        writeFileSync(join(skillDir, "SKILL.md"), skillContent);
        console.log("✅ Created SKILL.md");

        // Create scripts/ with example
        const scriptsDir = join(skillDir, "scripts");
        mkdirSync(scriptsDir);
        const exampleScriptPath = join(scriptsDir, "example.mjs");
        writeFileSync(exampleScriptPath, fillTemplate(EXAMPLE_SCRIPT, skillName, skillTitle));
        chmodSync(exampleScriptPath, 0o755);
        console.log("✅ Created scripts/example.mjs");

        // Create references/ with example
        const referencesDir = join(skillDir, "references");
        mkdirSync(referencesDir);
        writeFileSync(join(referencesDir, "example-reference.md"), fillTemplate(EXAMPLE_REFERENCE, skillName, skillTitle));
        console.log("✅ Created references/example-reference.md");

        // Create assets/
        mkdirSync(join(skillDir, "assets"));
        console.log("✅ Created assets/ directory");

        console.log(`\n✅ Skill '${skillName}' initialized at ${skillDir}`);
        console.log("\nNext steps:");
        console.log("1. Edit SKILL.md - complete the TODOs and update description");
        console.log("2. Add scripts, references, or assets as needed");
        console.log("3. Delete any unused directories");
        console.log("4. Test the skill with a real workflow");

        return skillDir;
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        return null;
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
        console.log("Usage: node init-skill.mjs <skill-name> --path .agents/skills");
        console.log("Run from the project root. Output is restricted to that project's .agents/skills directory.");
        console.log("Example: node init-skill.mjs invoice-automation --path .agents/skills");
        process.exit(args.length === 0 ? 1 : 0);
    }

    const skillName = args[0];

    // Require an explicit project-local destination; never default to a user-level skills directory.
    const pathIndex = args.indexOf("--path");
    if (pathIndex === -1 || pathIndex + 1 >= args.length) {
        console.error("❌ Error: provide --path .agents/skills from the project root");
        process.exit(1);
    }
    const projectRoot = resolve(process.cwd());
    const basePath = resolve(args[pathIndex + 1]);
    const relativeTarget = relative(projectRoot, basePath).split(sep).join("/");
    const projectMarkers = [".git", "AGENTS.md", "CLAUDE.md", "GEMINI.md", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"];
    if (relativeTarget !== ".agents/skills" || !projectMarkers.some((marker) => existsSync(resolve(projectRoot, marker)))) {
        console.error("❌ Error: run from a project root and target only its .agents/skills directory");
        process.exit(1);
    }

    console.log(`🚀 Initializing skill: ${skillName}`);
    console.log(`   Location: ${basePath}`);
    console.log();

    const result = initSkill(skillName, basePath);
    process.exit(result ? 0 : 1);
}

main();
