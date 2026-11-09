# Writing Effective Skill Descriptions

The `description` field in YAML frontmatter is critical—it determines when Claude will automatically use your skill.

## What Makes a Good Description

**Be specific about triggers:**
- ✅ "Creates PDF invoices for Polish companies with proper VAT handling and KSeF compliance"
- ❌ "Helps with invoices"

**Include key terms users might say:**
- ✅ "Rotates, splits, and merges PDF documents. Use when user mentions PDF manipulation, page rotation, or combining PDFs"
- ❌ "PDF tool"

**Mention the output format:**
- ✅ "Generates weekly status reports as formatted markdown with task summaries and blockers"
- ❌ "Makes reports"

## Description Template

```
[Action verb] [specific output] for [target use case]. Use when [trigger phrases or situations].
```

## Examples by Category

### Document Generation
> "Generates professional cover letters tailored to job descriptions. Use when user mentions job applications, cover letters, or applying for positions."

### Data Processing  
> "Analyzes CSV files and produces summary statistics with visualizations. Use when user uploads spreadsheets or asks for data analysis."

### Automation
> "Organizes downloaded files into categorized folders based on file type and date. Use when user mentions Downloads folder, file organization, or cleaning up files."

## Testing Your Description

Ask yourself:
1. If a user said "[common request]", would this description match?
2. Does it distinguish this skill from similar skills?
3. Would Claude understand exactly what output to produce?

---

← Back to [Skill Creator](../SKILL.md)
