# Concept 7: Failure Diagnosis

> Can we diagnose why specs missed behaviors using the 5-type taxonomy?

---

## Goal

Build the analyzer subagent and lesson tracking. The analyzer reads evaluator output, rolling set, and lesson history, then diagnoses WHY behaviors were missed using the 5-type failure taxonomy.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/agents/analyzer.md` | Hidden subagent for diagnosis | ~30 |
| `prompts/analyzer.md` | Analyzer role contract | ~50 |
| `scripts/lib/lessons.js` | Lesson append + index + context builder | ~80 |

---

## Implementation Steps

### Step 1: Create `.opencode/agents/analyzer.md`

```markdown
---
description: Diagnoses why specs missed behaviors using 5-type failure taxonomy
mode: subagent
hidden: true
permission:
  read: allow
  glob: allow
  grep: allow
  edit: allow
  bash: deny
  task: deny
---

You are a failure analyst. Your job is to diagnose why specs missed known behaviors.

## Inputs
- Evaluator output from `runs/<run-id>/evaluator/`
- Golden set from `runs/<run-id>/inputs/golden-set.yaml`
- Rolling set from `runs/rollingset/`
- Lesson history from `lessons/index.yaml`
- Current formula from `runs/<run-id>/inputs/formula.yaml`

## Task
1. Read evaluator output (golden-results, structure-review, fact-check)
2. Read the rolling set to see what previous runs found
3. Read lesson history to avoid retrying failed methods
4. Apply the 5-type failure decision tree to each missed behavior
5. Compare current run vs rolling set (what's missing?)
6. Write diagnosis output

## Output: `runs/<run-id>/analyzer/output.yaml`
```yaml
run_id: run-XXXX
analyzed_at: timestamp
primary_failure_type: search_failure | recognition_failure | format_failure | prompt_failure | rubric_gap_failure
diagnosis: |
  Why behaviors were missed.
failure_tier: step_management | prompt_tweak | rubric_mutation
affected_steps:
  - explore
  - analyze
suggested_mutation:
  type: step_management
  target_step: explore
  change: |
    What to change in the explore prompt
confidence: 0.85
```

## 5-Type Failure Taxonomy
Apply in order, stop at first match:
1. search_failure — explore didn't find the files
2. recognition_failure — found files but missed the pattern
3. format_failure — spec failed schema validation
4. prompt_failure — formula never asked for this
5. rubric_gap_failure — criterion absent from rubric (only after 1-4 exhausted)

## Rules
- Analyzer sees EVERYTHING (needs full context to compare)
- Read lesson history before diagnosing
- Do NOT default to rubric_gap_failure
- Exhaust lower-tier explanations first
```

### Step 2: Create `prompts/analyzer.md`

```markdown
# Analyzer Role Contract

## Identity
You are a failure analyst. You diagnose why the formula missed or hallucinated behavior.

## Inputs
- Evaluator output (golden-results, structure-review, fact-check)
- Rolling set (what previous runs found)
- Lesson history (what methods failed before)
- Current formula (what instructions were used)

## Task
1. For each recall miss in evaluator output, apply the 5-type failure decision tree
2. Check: did explore find the files? (search_failure)
3. Check: did explore recognize the pattern? (recognition_failure)
4. Check: did spec pass validation? (format_failure)
5. Check: did formula ask for this? (prompt_failure)
6. Check: is criterion missing from rubric? (rubric_gap_failure)
7. Compare current run vs rolling set
8. Write diagnosis to `runs/<run-id>/analyzer/output.yaml`

## Output
- primary_failure_type
- diagnosis with evidence
- suggested_mutation
- confidence

## Rules
- Apply taxonomy in order, stop at first match
- Exhaust lower-tier before proposing rubric gaps
- Read lesson history before suggesting mutations
- Do NOT auto-apply mutations — suggest only
```

### Step 3: Create `scripts/lib/lessons.js`

```javascript
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

function resolveWorkspacePath(relativePath) {
  return path.join(WORKSPACE_ROOT, relativePath);
}

function appendLesson(lesson) {
  const bucket = lesson.result === 'FAILED'
    ? 'lessons/failed.jsonl'
    : 'lessons/learned.jsonl';

  const entry = {
    failure_type: lesson.failure_type,
    teaching_method: lesson.teaching_method,
    result: lesson.result,
    scenario: lesson.scenario || '',
    run_id: lesson.run_id || null,
    recorded_at: new Date().toISOString(),
  };

  const filePath = resolveWorkspacePath(bucket);
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');

  refreshLessonIndex();
  console.log(`[Lessons] Recorded: ${lesson.result} — ${lesson.failure_type}/${lesson.teaching_method}`);
}

function refreshLessonIndex() {
  const learnedPath = resolveWorkspacePath('lessons/learned.jsonl');
  const failedPath = resolveWorkspacePath('lessons/failed.jsonl');
  const indexPath = resolveWorkspacePath('lessons/index.yaml');

  const learned = readJsonLines(learnedPath);
  const failed = readJsonLines(failedPath);

  const byFailureType = {};

  [...learned, ...failed].forEach(entry => {
    const ft = entry.failure_type;
    if (!byFailureType[ft]) {
      byFailureType[ft] = { total: 0, teaching_methods: {} };
    }
    byFailureType[ft].total++;

    const method = entry.teaching_method;
    if (!byFailureType[ft].teaching_methods[method]) {
      byFailureType[ft].teaching_methods[method] = {
        results: { PASSED: 0, FAILED: 0, PARTIAL: 0 },
        entries: [],
      };
    }
    byFailureType[ft].teaching_methods[method].results[entry.result]++;
    byFailureType[ft].teaching_methods[method].entries.push({
      scenario: entry.scenario,
      run_id: entry.run_id,
      recorded_at: entry.recorded_at,
    });
  });

  const index = {
    lookup: { by_failure_type: byFailureType },
    stats: {
      total_lessons: learned.length + failed.length,
      learned_count: learned.length,
      failed_count: failed.length,
      last_updated: new Date().toISOString(),
    },
  };

  fs.writeFileSync(indexPath, YAML.stringify(index, null, 2), 'utf8');
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function buildLessonsContext(lessons) {
  if (!lessons || !lessons.lookup) return 'No lesson data available.';

  const byType = lessons.lookup.by_failure_type || {};
  const typeSummaries = [];

  for (const [failureType, bucket] of Object.entries(byType)) {
    const methodSummaries = [];
    for (const [method, methodBucket] of Object.entries(bucket.teaching_methods || {})) {
      const failedCount = methodBucket.results.FAILED || 0;
      const passedCount = methodBucket.results.PASSED || 0;
      methodSummaries.push(`  - ${method}: ${passedCount} passed, ${failedCount} failed`);
    }
    typeSummaries.push(`- ${failureType} (${bucket.total} lessons):\n${methodSummaries.join('\n')}`);
  }

  return typeSummaries.length > 0
    ? `## Known Lessons (${lessons.stats?.total_lessons || 0} total)\n\n${typeSummaries.join('\n')}\n`
    : 'No lesson data available.';
}

module.exports = {
  appendLesson,
  refreshLessonIndex,
  buildLessonsContext,
};
```

---

## Verification

```bash
cd prototype/_v02

# Create lesson files
touch lessons/learned.jsonl lessons/failed.jsonl

# Record a test lesson
node -e "
const { appendLesson, refreshLessonIndex } = require('./scripts/lib/lessons');
appendLesson({
  failure_type: 'search_failure',
  teaching_method: 'prompt_tweak',
  result: 'FAILED',
  scenario: 'Agent missed auth routing after prompt wording change',
  run_id: 'run-0001'
});
appendLesson({
  failure_type: 'search_failure',
  teaching_method: 'step_management',
  result: 'PASSED',
  scenario: 'Added file verification sub-step',
  run_id: 'run-0002'
});
"

# Check index was generated
cat lessons/index.yaml

# Build context for injection
node -e "
const { buildLessonsContext } = require('./scripts/lib/lessons');
const YAML = require('yaml');
const fs = require('fs');
const index = YAML.parse(fs.readFileSync('lessons/index.yaml', 'utf8'));
console.log(buildLessonsContext(index));
"
```

**Expected:**
- `lessons/index.yaml` shows lookup by failure_type and teaching_method
- Context builder produces prompt-ready text
- Failed methods are flagged (don't retry)

---

## What This Proves

The system can learn from mistakes:
- Lessons track what worked and what failed
- Analyzer reads lesson history before diagnosing
- Insanity prevention: won't retry failed methods
- 5-type taxonomy gives structured diagnosis

---

## What Comes Next

Concept 8 (Mutation) needs:
- A mutator subagent that reads analyzer diagnosis + lessons
- Contamination guardrail to keep mutations project-agnostic
