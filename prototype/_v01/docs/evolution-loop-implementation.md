# Evolution Loop Completion — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Close the cross-run learning gap so lessons auto-record, auto-propagate, and auto-constrain future runs — making the evolution loop truly self-learning.

**Architecture:** Add 5 bridges to the existing prototype:

1. **Lesson recording API** — CLI + library function to append to JSONL files
2. **Lesson injection into prompts** — Orchestrator injects `lessons/index.yaml` into analyzer + mutator agents
3. **Mutation-to-lesson bridge** — Auto-record lesson when candidate is registered/promoted/rejected
4. **Cross-run state awareness** — Next run starts knowing previous outcomes
5. **Insanity check enforcement** — Orchestrator validates mutator output against lessons, not just trusting agent

**Tech Stack:** Node.js, JSONL (append-only), YAML, existing prototype infrastructure

**Canonical Mutation → Failure Type Mapping:**

| Mutation Type | Addresses This Failure Type | Notes |
|---|---|---|
| `prompt_tweak` | `prompt_failure` | Direct mapping |
| `step_management` | `search_failure` | Direct mapping |
| `schema_change` | `format_failure` | Direct mapping |
| `rubric_mutation` | `rubric_gap_failure` | Direct mapping |
| `parent_guideline` | _(varies)_ | Read from analyzer; usually `prompt_failure` or `recognition_failure` |
| `tool_change` | _(varies)_ | Read from analyzer; usually `search_failure` or `format_failure` |
| `verification_crosscheck` | `recognition_failure` | This is a teaching method, not a mutation type |

**Rule:** When auto-recording lessons, always read the **analyzer's `primary_failure_type`** first. Only fall back to this mapping when analyzer output is unavailable. The analyzer is the canonical source of truth for failure classification.

**Existing files to modify:**
- `scripts/lib/lessons.js`
- `scripts/lib/common.js`
- `scripts/cli.js`
- `scripts/orchestrator.js`
- `schemas/lesson.schema.yaml`
- `lessons/index.yaml` (regenerated format)

**New files to create:**
- `scripts/lib/evolution.js` — evolution loop glue: lesson injection builder, cross-run loader
- `docs/evolution-loop-implementation.md` — this plan

---

## Phase 1: Lesson Recording Infrastructure

### Task 1: Add `appendLesson` to lessons.js

**Objective:** Create a function that appends one lesson entry to the appropriate JSONL file and refreshes the index.

**Files:**
- Modify: `scripts/lib/lessons.js`

**The function:**

```javascript
/**
 * Append a lesson entry to lessons/learned.jsonl or lessons/failed.jsonl
 * and refresh the index.
 *
 * @param {Object} lesson
 * @param {string} lesson.failure_type - One of: search_failure, recognition_failure,
 *                                        format_failure, prompt_failure, rubric_gap_failure
 * @param {string} lesson.teaching_method - e.g., prompt_tweak, step_management,
 *                                           rubric_candidate_proposal, schema_change
 * @param {'PASSED'|'FAILED'|'PARTIAL'} lesson.result
 * @param {string} lesson.scenario - Human-readable scenario description
 * @param {string[]} [lesson.works_on] - Behavior shapes this applies to
 * @param {string} [lesson.run_id] - Which run produced this lesson
 * @param {string} [lesson.discovered_criterion] - Rubric criterion id if applicable
 */
function appendLesson(lesson) {
  const files = getLessonFiles();
  const bucket = lesson.result === 'FAILED' ? files.failed : files.learned;

  // Enforce append-only invariant
  const policy = loadLessonPolicy();
  if (policy.policy?.append_only !== true) {
    throw new Error('Append-only policy not set in lessons/index.yaml. Refusing to write.');
  }

  // Validate required fields
  const required = ['failure_type', 'teaching_method', 'result'];
  for (const key of required) {
    if (!lesson[key]) throw new Error(`Lesson missing required field: ${key}`);
  }

  // Validate result enum
  if (!['PASSED', 'FAILED', 'PARTIAL'].includes(lesson.result)) {
    throw new Error(`Invalid lesson result: ${lesson.result}. Must be PASSED, FAILED, or PARTIAL.`);
  }

  // Build the JSONL line
  const entry = {
    failure_type: lesson.failure_type,
    scenario: lesson.scenario || '',
    teaching_method: lesson.teaching_method,
    result: lesson.result,
    works_on: lesson.works_on || [],
    run_id: lesson.run_id || null,
    discovered_criterion: lesson.discovered_criterion || null,
    recorded_at: new Date().toISOString(),
  };

  // Append to bucket file
  const bucketPath = resolveWorkspacePath(bucket);
  fs.appendFileSync(bucketPath, JSON.stringify(entry) + '\n', 'utf8');

  // Refresh index
  refreshLessonIndex();

  console.log(`[Lessons] Recorded: ${lesson.result} — ${lesson.failure_type}/${lesson.teaching_method} (${lesson.run_id || 'no run'})`);
}
```

Also add a helper `getLessonFiles()`:

```javascript
function getLessonFiles() {
  const doc = loadLessonPolicy();
  return doc.files || {
    learned: 'lessons/learned.jsonl',
    failed: 'lessons/failed.jsonl',
  };
}
```

**Export both from module:**

```javascript
module.exports = {
  findLessons,
  refreshLessonIndex,
  summarizeLessonsForFailureType,
  appendLesson,          // NEW
  getLessonFiles,        // NEW
};
```

**Add fs import at top of lessons.js** (if not already):
```javascript
const fs = require('fs');
const { resolveWorkspacePath } = require('./common');
```

---

### Task 2: Add `record_lesson` CLI command

**Objective:** Expose lesson recording through the CLI so it can be called from orchestrator, manually, or from advance_formula/register_formula_candidate.

**Files:**
- Modify: `scripts/cli.js`

**Step 1: Add the CLI handler to cli.js**

Find the `registerFormulaCandidate` function (around line 438). After the `registerFormulaCandidate` block, add:

```javascript
function recordLesson(args) {
  const required = ['failure-type', 'teaching-method', 'result', 'scenario'];
  for (const key of required) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }

  const { appendLesson, refreshLessonIndex } = require('./lib/lessons');

  appendLesson({
    failure_type: args['failure-type'],
    teaching_method: args['teaching-method'],
    result: args.result.toUpperCase(),
    scenario: args.scenario,
    works_on: args['works-on'] ? args['works-on'].split(',').map(s => s.trim()) : [],
    run_id: args['run-id'] || null,
    discovered_criterion: args['discovered-criterion'] || null,
  });

  console.log(`Lesson recorded. Index refreshed.`);
}
```

**Step 2: Add usage line in the usage() function:**

```
  node scripts/cli.js record_lesson --failure-type search_failure --teaching-method step_management --result PASSED --scenario "..." [--run-id run-0016] [--works-on conditional_rendering,feature_flags] [--discovered-criterion conditional_flow_documentation]
```

**Step 3: Add to the command router**

Find the conditional chain that routes to handlers (around line 600+ in cli.js) and add:

```javascript
} else if (cmd === 'record_lesson') {
  recordLesson(args);
```

---

### Task 3: Auto-record lesson when registering formula candidate from mutator

**Objective:** When the register phase registers a formula candidate that came from the mutator, auto-record a tentative lesson (result: PARTIAL) linking the run, failure type, and teaching method. The failure type MUST come from the analyzer's diagnosis, not inferred from mutation type.

**Files:**
- Modify: `scripts/cli.js` — `registerFormulaCandidate` function

**Step 0: Add the canonical mutation→failure mapping (add to top of registerFormulaCandidate or as module-level constant)**

```javascript
// Canonical mapping: mutation type → the failure type it addresses.
// Missing entries mean the mapping is non-obvious — those failure types
// must be read from the analyzer output directly.
const MUTATION_TO_FAILURE = {
  prompt_tweak: 'prompt_failure',
  step_management: 'search_failure',
  schema_change: 'format_failure',
  rubric_mutation: 'rubric_gap_failure',
  // parent_guideline, tool_change: no 1:1 mapping — read from analyzer
  // recognition_failure: addressed by verification_crosscheck, not a mutation type
};
```

**Step 1: Modify `registerFormulaCandidate`**

Near the end of `registerFormulaCandidate`, after the candidate is written and validated, add:

```javascript
// Auto-record tentative lesson if candidate has mutation metadata
if (candidate.fine_tune_run && candidate.parent) {
  const { appendLesson } = require('./lib/lessons');

  // Read the analyzer output for the run to get the canonical failure type
  const runId = candidate.fine_tune_run;
  const analyzerPath = resolveWorkspacePath(path.posix.join('runs', runId, 'analyzer', 'output.yaml'));
  let failureType = null;

  if (fileExists(analyzerPath)) {
    const analyzerOutput = readYamlFile(analyzerPath);
    failureType = analyzerOutput.primary_failure_type || null;
  }

  // Fallback: if analyzer output unavailable, use canonical mapping
  if (!failureType) {
    const mutationSource = candidate.consolidated_mutations?.[0];
    failureType = mutationSource ? (MUTATION_TO_FAILURE[mutationSource.type] || 'recognition_failure') : null;
  }

  if (failureType) {
    const mutationSource = candidate.consolidated_mutations?.[0];
    appendLesson({
      failure_type: failureType,
      teaching_method: mutationSource?.type || 'unknown',
      result: 'PARTIAL',
      scenario: `Candidate registered from ${runId}. Analyzer diagnosed: ${failureType}. Pending human promotion.`,
      works_on: candidate.specializations || [],
      run_id: runId,
      discovered_criterion: null,
    });
  }
}
```

---

### Task 4: Upgrade lesson from PARTIAL to PASSED on formula promotion

**Objective:** When `advance_formula` promotes a candidate, read the analyzer output for the canonical failure type and record a PASSED lesson. Do NOT infer failure type from mutation type — the analyzer is the ground truth.

**Files:**
- Modify: `scripts/cli.js` — `advanceFormula` function

**Step 1: Modify `advanceFormula`**

Find the end of `advanceFormula` (around line 500+ in cli.js). After writing the promoted formula and updating state, add:

```javascript
// Record PASSED lesson on promotion
const fineTuneRun = formula.fine_tune_run;
const mutations = formula.consolidated_mutations || [];

if (fineTuneRun && mutations.length > 0) {
  const { appendLesson } = require('./lib/lessons');

  // Read analyzer output for canonical failure type
  const analyzerPath = resolveWorkspacePath(path.posix.join('runs', fineTuneRun, 'analyzer', 'output.yaml'));
  let diagnosedFailureType = null;
  if (fileExists(analyzerPath)) {
    const analyzerOutput = readYamlFile(analyzerPath);
    diagnosedFailureType = analyzerOutput.primary_failure_type || null;
  }

  for (const mutation of mutations) {
    // Use analyzer diagnosis if available, fall back to canonical mapping
    const failureType = diagnosedFailureType || MUTATION_TO_FAILURE[mutation.type] || 'recognition_failure';

    appendLesson({
      failure_type: failureType,
      teaching_method: mutation.type,
      result: 'PASSED',
      scenario: `Formula ${formula.id} v${formula.version} promoted from ${fineTuneRun}. Analyzer diagnosed: ${failureType}. Mutation: ${mutation.change}`,
      works_on: formula.specializations || [],
      run_id: fineTuneRun,
      discovered_criterion: null,
    });
  }
}
```

---

### Task 5: Record FAILED lesson on candidate rejection

**Objective:** When a rubric candidate is rejected, record a FAILED lesson. The failure type and teaching method are read from the candidate's `source` field (not hardcoded).

**Files:**
- Modify: `scripts/cli.js` — `rejectRubricCandidate` function

**Step 1: Modify `rejectRubricCandidate`**

Find the function (around line 330 in cli.js). Add near the end:

```javascript
// Record FAILED lesson on rejection
if (args.reason && args.id) {
  const { appendLesson } = require('./lib/lessons');

  // Map candidate source to failure type and teaching method
  const sourceMap = {
    rubric_gap_failure: { failure_type: 'rubric_gap_failure', teaching_method: 'rubric_candidate_proposal' },
    contextual_inference: { failure_type: 'recognition_failure', teaching_method: 'rubric_candidate_proposal' },
    schema_derived: { failure_type: 'format_failure', teaching_method: 'rubric_candidate_proposal' },
    seed_curation: { failure_type: 'prompt_failure', teaching_method: 'rubric_candidate_proposal' },
  };
  const sourceInfo = sourceMap[candidate.source] || {
    failure_type: 'rubric_gap_failure',
    teaching_method: 'rubric_candidate_proposal',
  };

  appendLesson({
    failure_type: sourceInfo.failure_type,
    teaching_method: sourceInfo.teaching_method,
    result: 'FAILED',
    scenario: `Rubric candidate rejected: ${args.id} (source: ${candidate.source || 'unknown'}). Reason: ${args.reason}`,
    run_id: candidate.discovered_in_run || null,
    discovered_criterion: args.id,
  });
}
```

---

## Phase 2: Lesson Injection into Agent Prompts

### Task 6: Add `buildLessonsContext` to lessons.js (shared across both paths)

**Objective:** Move the lesson context builder into `lessons.js` so both the CLI path (`cli.js` run_mutator / run_analyzer) and the orchestrator path use the same injection format. Currently the CLI `run_mutator` injects per-entry lesson details while the orchestrator plan would inject a compact summary — agents get different quality context depending on which path invoked them. This task unifies them.

**Files:**
- Modify: `scripts/lib/lessons.js`

**Step 1: Add `buildLessonsContext` to lessons.js**

Same function as described in Task 7's note, but placed in `lessons.js` so both paths import it:

```javascript
/**
 * Build a compact lessons context string for injection into agent prompts.
 * Extracts: what failure types have been seen, what teaching methods
 * have failed, and which methods are known to work.
 *
 * @param {Object} lessons - loaded lessons/index.yaml content
 * @returns {string} compact prompt-ready context block
 */
function buildLessonsContext(lessons) {
  if (!lessons || !lessons.lookup) return 'No lesson data available.';

  const byType = lessons.lookup.by_failure_type || {};
  const typeSummaries = [];

  for (const [failureType, bucket] of Object.entries(byType)) {
    const methodSummaries = [];
    for (const [method, methodBucket] of Object.entries(bucket.teaching_methods || {})) {
      const failedCount = methodBucket.results.FAILED || 0;
      const passedCount = methodBucket.results.PASSED || 0;
      const entries = methodBucket.entries || [];
      const lastEntry = entries[entries.length - 1];
      const lastScenario = lastEntry ? ` (e.g. ${lastEntry.scenario.substring(0, 80)})` : '';
      methodSummaries.push(`  - ${method}: ${passedCount} passed, ${failedCount} failed${lastScenario}`);
    }
    typeSummaries.push(`- ${failureType} (${bucket.total} lessons):\n${methodSummaries.join('\n')}`);
  }

  return typeSummaries.length > 0
    ? `## Known Lessons (${lessons.stats?.total_lessons || 0} total)\n\n${typeSummaries.join('\n')}\n`
    : 'No lesson data available.';
}
```

**Step 2: Export it**

```javascript
module.exports = {
  findLessons,
  refreshLessonIndex,
  summarizeLessonsForFailureType,
  appendLesson,          // from Task 1
  getLessonFiles,        // from Task 1
  buildLessonsContext,   // NEW — unified prompt injection format
};
```

---

### Task 6b: Replace CLI `run_mutator` lesson injection with `buildLessonsContext`

**Objective:** The CLI `run_mutator` currently injects per-entry lesson details via `summarizeLessonsForFailureType`. Switch it to use `buildLessonsContext` for consistency with the orchestrator path.

**Files:**
- Modify: `scripts/cli.js` — `runMutator` function

**Step 1: Update import**

```javascript
const { findLessons, refreshLessonIndex, buildLessonsContext } = require('./lib/lessons');
```

**Step 2: Replace the indexed lesson summary block (~line 1119-1124)**

Replace:
```
## Indexed lesson summary for failure_type "${failureType}"
Failed lessons:
${relevantLessons.failed.length > 0 ? ...}
Learned lessons:
${relevantLessons.learned.length > 0 ? ...}
```

With:
```
## Lesson History
${buildLessonsContext(lessonIndex)}
```

Also remove the now-unused `relevantLessons` variable (or keep for insanity check which still uses `findLessons` directly at line 1220-1226 — that's fine, keep it).

---

### Task 6c: Inject lessons into CLI `run_analyzer` (currently missing)

**Objective:** The CLI path's `run_analyzer` has zero lesson context. Add it so the analyzer can consider what's been tried before when diagnosing failures.

**Files:**
- Modify: `scripts/cli.js` — `runAnalyzer` function

**Step 1: Add import (~line 33)**

```javascript
const { buildLessonsContext, refreshLessonIndex } = require('./lib/lessons');
```

**Step 2: Load lessons and inject into the prompt (~line 1000, before the prompt template string)**

```javascript
// Load lesson context for diagnosis awareness
const lessonIndex = refreshLessonIndex();
const lessonContext = buildLessonsContext(lessonIndex);
```

**Step 3: Add to the prompt, after the "The 5-Type Failure Decision Tree" section and before "Key rules" (~line 1026)**:

```javascript

## Lesson History
${lessonContext}

## Lesson-Aware Diagnosis
- Check if this failure type has been seen before. What teaching methods have already been tried?
- If a previous attempt with the same (failure_type, teaching_method) already FAILED, flag it and suggest a different approach.
- Consider escalating mutation tiers: prompt_tweak → step_management → parent_guideline → schema_change → tool_change → rubric_mutation.
```

---

### Task 7: Load lessons into orchestrator at startup

**Objective:** The orchestrator loads `lessons/index.yaml` at the start of `main()` and passes it through to every phase that needs it. Uses `buildLessonsContext` from `lessons.js` (built in Task 6) — does NOT define its own version.

**Files:**
- Modify: `scripts/orchestrator.js`

**Step 1: Add import**

At the top of `orchestrator.js`, add:
```javascript
const { buildLessonsContext } = require('./lib/lessons');
```

**Step 2: Add lessons loading at main() start**

Find `main()` (around line 758 in orchestrator.js). After loading state/formula/project, add:

```javascript
// Load lessons for injection into agent prompts
let lessons = null;
try {
  const lessonsPath = resolveWorkspacePath('lessons/index.yaml');
  if (fileExists(lessonsPath)) {
    lessons = readYamlFile(lessonsPath);
    console.log(`[Orchestrator] Lessons loaded: ${lessons.stats?.total_lessons || 0} total`);
  }
} catch (err) {
  console.log(`[Orchestrator] Warning: Could not load lessons: ${err.message}`);
}
```

**Step 3: Pass `lessons` object through the phase pipeline**

Change the `executePhase` switch to pass `lessons`:

```javascript
case 'analyze':
  return executeAnalyzePhase({ formula, runId, project, lessons });
case 'mutate':
  return executeMutatePhase({ formula, runId, project, lessons });
```

---

### Task 8: Inject lessons into orchestrator analyze phase prompt

**Objective:** The orchestrator's analyze agent receives lesson context (via the shared `buildLessonsContext`) so it can consider what's been tried before when diagnosing failures.

**Files:**
- Modify: `scripts/orchestrator.js` — `executeAnalyzePhase` function

**Step 1: Modify function signature and prompt**

Change `executeAnalyzePhase({ formula, runId, project })` to `executeAnalyzePhase({ formula, runId, project, lessons })`.

Find the prompt builder inside `executeAnalyzePhase` (around line 450). After the evaluation results section, add:

```javascript
// Inject shared lesson context (same format as CLI path)
if (lessons) {
  const lessonContext = buildLessonsContext(lessons);
  prompt += `\n## Lesson History\n${lessonContext}\n`;
}
```

Also add to the "Your Task" section, after the bullet list:
```javascript
prompt += `\n### Lesson-Aware Diagnosis\n- Check if this failure type has been seen before. What teaching methods have already been tried?\n- If a previous attempt with the same (failure_type, teaching_method) already FAILED, flag it and suggest a different approach.\n- Consider escalating mutation tiers: prompt_tweak → step_management → parent_guideline → schema_change → tool_change → rubric_mutation.\n`;
```

---

### Task 9: Inject lessons into orchestrator mutate phase prompt

**Objective:** The mutator agent receives lesson context so it can produce mutation proposals that avoid previously failed approaches.

**Files:**
- Modify: `scripts/orchestrator.js` — `executeMutatePhase` function

**Step 1: Modify function signature and prompt**

Change `executeMutatePhase({ formula, runId, project })` to `executeMutatePhase({ formula, runId, project, lessons })`.

Find the prompt builder inside `executeMutatePhase` (around line 544). After the "Suggested Mutation" section, add:

```javascript
// Inject lesson context
if (lessons) {
  const lessonContext = buildLessonsContext(lessons);
  prompt += `\n## Lesson History\n${lessonContext}\n`;
}
```

Also add to or replace the "Rules" section with:
```javascript
Rules:
- Only modify the target step
- Preserve all other steps exactly
- Update the version number
- Add a mutation record to consolidated_mutations
- **Check lesson history for each (failure_type, teaching_method) pair you consider**
- If your proposed approach already FAILED for the same failure_type, you MUST:
  a) Propose a different approach (escalate to next mutation tier), OR
  b) Provide explicit justification for retrying (include in proposed_change.rationale)
`;
```

---

### Task 10: Orchestrator-side insanity check enforcement

**Objective:** After the mutator returns, the orchestrator validates the insanity check against actual lesson data — not just trusting the agent's self-report.

**Files:**
- Modify: `scripts/orchestrator.js` — `executeMutatePhase` function

**Step 1: Add validation after mutator response**

In `executeMutatePhase`, after `result` comes back from the agent (around line 590), add:

```javascript
// Orchestrator-side insanity check enforcement
const violation = validateInsanityCheck(result, lessons);
if (violation) {
  console.error(`[Orchestrator] ⚠ INSANITY CHECK FAILED: ${violation}`);
  console.error(`[Orchestrator] The mutator proposed a method that already failed for this failure type without justification.`);
  console.error(`[Orchestrator] Marking mutation as inconclusive. Stopping.`);

  writeYamlFile(path.join(mutatorDir, 'output.yaml'), {
    run_id: runId,
    status: 'insanity_check_failed',
    proposed_change: null,
    reason: violation,
    mutator_original: result,
  });

  return { status: 'complete', mutation: null };
}
```

Also add the validation function after `buildLessonsContext`:

```javascript
/**
 * Validates that the mutator's proposal doesn't repeat a known-failed
 * (failure_type, teaching_method) pair without justification.
 * Returns null if OK, or a string message if violation detected.
 */
function validateInsanityCheck(mutatorOutput, lessons) {
  if (!lessons || !lessons.lookup) return null;
  if (!mutatorOutput?.proposed_change?.type) return null;

  // Look up which failure type this mutation is addressing
  // The mutation type maps to likely failure types it addresses
  const proposedMethod = mutatorOutput.proposed_change.type;
  const byType = lessons.lookup.by_failure_type || {};

  for (const [failureType, bucket] of Object.entries(byType)) {
    const methodBucket = bucket.teaching_methods?.[proposedMethod];
    if (!methodBucket) continue;

    const failedCount = methodBucket.results.FAILED || 0;
    if (failedCount > 0) {
      // Check if mutator acknowledged this in its output
      const acknowledgedFailed = mutatorOutput.insanity_check?.method_already_failed === true;
      const hasJustification = mutatorOutput.insanity_check?.justification ||
        mutatorOutput.proposed_change?.rationale;

      if (!acknowledgedFailed || !hasJustification) {
        return `Method "${proposedMethod}" has ${failedCount} FAILED result(s) for failure type "${failureType}", but mutator did not acknowledge or justify.`;
      }
    }
  }

  return null;
}
```

---

## Phase 3: Cross-Run State Awareness

### Task 11: Evolution context module (scripts/lib/evolution.js)

**Objective:** Create a centralized module that assembles all cross-run context — previous run summaries, recent lesson activity, and candidate promotion history — for injection into agent prompts.

**Files:**
- Create: `scripts/lib/evolution.js`

**The module:**

```javascript
const { resolveWorkspacePath, readYamlFile, readJsonLines, listDir, fileExists } = require('./common');
const path = require('path');

/**
 * Load the full evolution context for a new run.
 * Returns a string suitable for prompt injection.
 *
 * Context includes:
 * - Active formula + rubric
 * - Recent runs summary (last 3 completed)
 * - Lesson index summary
 * - Pending candidate queue
 */
function loadEvolutionContext() {
  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));
  const queue = readYamlFile(resolveWorkspacePath('state/queue.yaml'));
  const formula = readYamlFile(resolveWorkspacePath(state.current_formula_ref));
  const rubric = readYamlFile(resolveWorkspacePath(state.current_rubric_snapshot_ref));

  let lessons = null;
  try {
    lessons = readYamlFile(resolveWorkspacePath('lessons/index.yaml'));
  } catch (_) {}

  const parts = [];

  // 1. Active formula info
  parts.push(`## Active Formula\n- ID: ${formula.id} v${formula.version}\n- Ecosystem: ${formula.ecosystem}\n- Steps: ${(formula.steps || []).map(s => s.id).join(' → ')}`);

  // 2. Active rubric
  parts.push(`\n## Active Rubric\n- Version: ${rubric.rubric_version || 'unknown'}\n- Active criteria: ${(rubric.active_criteria || []).join(', ')}`);

  // 3. Recent completed runs (last 3)
  const runsDir = resolveWorkspacePath('runs');
  if (fileExists(runsDir)) {
    const allRuns = listDir(runsDir)
      .filter(d => d.startsWith('run-'))
      .sort()
      .slice(-3);

    const runSummaries = [];
    for (const runId of allRuns) {
      const manifestPath = path.join(runsDir, runId, 'manifest.yaml');
      const evaluatorPath = path.join(runsDir, runId, 'evaluator', 'output.yaml');

      if (!fileExists(manifestPath)) continue;

      const manifest = readYamlFile(manifestPath);
      let evalScore = 'no evaluator output';
      try {
        const evalData = readYamlFile(evaluatorPath);
        evalScore = `overall_score=${evalData.overall_score}, recall=${evalData.recall?.score}, precision=${evalData.precision?.combined}`;
      } catch (_) {}

      runSummaries.push(`  - ${runId}: formula=${manifest.formula_ref}, eval=(${evalScore})`);
    }

    if (runSummaries.length > 0) {
      parts.push(`\n## Recent Runs\n${runSummaries.join('\n')}`);
    }
  }

  // 4. Lesson summary
  if (lessons) {
    const byType = lessons.lookup?.by_failure_type || {};
    const learnerEntries = [];
    const failedEntries = [];

    for (const [ft, bucket] of Object.entries(byType)) {
      for (const [method, mb] of Object.entries(bucket.teaching_methods || {})) {
        const failed = mb.results.FAILED || 0;
        const passed = mb.results.PASSED || 0;
        if (failed > 0) {
          failedEntries.push(`  - ${ft} × ${method}: ${failed} failure(s)`);
        }
        if (passed > 0) {
          learnerEntries.push(`  - ${ft} × ${method}: ${passed} success(es)`);
        }
      }
    }

    parts.push(`\n## Lessons Learned (${lessons.stats?.total_lessons || 0} total)`);
    if (learnerEntries.length > 0) {
      parts.push(`### What Has Worked\n${learnerEntries.join('\n')}`);
    } else {
      parts.push(`### What Has Worked\n  (none yet)`);
    }
    if (failedEntries.length > 0) {
      parts.push(`### What Has Failed (insanity prevention)\n${failedEntries.join('\n')}\nThese methods SHOULD NOT be retried without explicit justification.`);
    } else {
      parts.push(`### What Has Failed\n  (none yet)`);
    }
  }

  // 5. Pending queue
  const pendingFormulas = queue.pending_promotions?.formulas || [];
  const pendingRubrics = queue.pending_promotions?.rubric_criteria || [];
  if (pendingFormulas.length > 0 || pendingRubrics.length > 0) {
    parts.push(`\n## Pending Reviews`);
    if (pendingFormulas.length > 0) parts.push(`- Formula candidates: ${pendingFormulas.join(', ')}`);
    if (pendingRubrics.length > 0) parts.push(`- Rubric candidates: ${pendingRubrics.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Get the last run ID that was completed.
 */
function getLastRunId() {
  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));
  return state.last_prepared_run_id || null;
}

module.exports = {
  loadEvolutionContext,
  getLastRunId,
};
```

---

### Task 12: Inject evolution context into orchestrator startup

**Objective:** The orchestrator loads evolution context at startup and injects it into the analyze and mutate agent prompts.

**Files:**
- Modify: `scripts/orchestrator.js`

**Step 1: Add import**

At the top of `orchestrator.js`, add:
```javascript
const { loadEvolutionContext } = require('./lib/evolution');
```

**Step 2: Load evolution context in main()**

In `main()`, after lessons loading, add:
```javascript
// Load evolution context for cross-run awareness
let evolutionContext = null;
try {
  evolutionContext = loadEvolutionContext();
} catch (err) {
  console.log(`[Orchestrator] Warning: Could not load evolution context: ${err.message}`);
}
```

**Step 3: Pass into phase execution**

Update the phase execution calls:
```javascript
case 'analyze':
  return executeAnalyzePhase({ formula, runId, project, lessons, evolutionContext });
case 'mutate':
  return executeMutatePhase({ formula, runId, project, lessons, evolutionContext });
```

**Step 4: Inject into analyze prompt**

In `executeAnalyzePhase`, after the lesson context injection, add:
```javascript
if (evolutionContext) {
  prompt += `\n## Evolution Context (Cross-Run State)\n${evolutionContext}\n`;
}
```

**Step 5: Inject into mutate prompt**

In `executeMutatePhase`, after the lesson context injection, add:
```javascript
if (evolutionContext) {
  prompt += `\n## Evolution Context (Cross-Run State)\n${evolutionContext}\n`;
}
```

---

### Task 13: Record lesson after each run completes (gated)

**Objective:** After the orchestrator finishes all phases, record a lesson ONLY when there is meaningful learning to capture. The post-run recording reads the analyzer's canonical diagnosis (not heuristic inference from scores) and is gated on: analyzer produced a diagnosis AND a mutation was proposed AND the score is below threshold. High-scoring runs with no mutation produce no post-run lesson — their learning is already captured by Tasks 3-5 on promotion/rejection.

**Files:**
- Modify: `scripts/orchestrator.js` — `main()` function

**Step 1: Add gated post-run lesson recording**

In `main()`, after the phase loop completes and before the success banner (around line 790), add:

```javascript
// Record run completion lesson (GATED: only when there's meaningful learning)
try {
  const evaluatorPath = resolveWorkspacePath(path.posix.join('runs', runId, 'evaluator', 'output.yaml'));
  const mutatorPath = resolveWorkspacePath(path.posix.join('runs', runId, 'mutator', 'output.yaml'));
  const analyzerPath = resolveWorkspacePath(path.posix.join('runs', runId, 'analyzer', 'output.yaml'));

  const evaluatorExists = fileExists(evaluatorPath);
  const mutatorExists = fileExists(mutatorPath);
  const analyzerExists = fileExists(analyzerPath);

  // Gate: analyzer must have diagnosed a failure AND mutation proposed AND score below threshold
  if (evaluatorExists && mutatorExists && analyzerExists) {
    const evalData = readYamlFile(evaluatorPath);
    const mutatorData = readYamlFile(mutatorPath);
    const analyzerData = readYamlFile(analyzerPath);
    const { appendLesson } = require('./lib/lessons');

    const totalScore = evalData.overall_score || 0;
    const hasMutation = !!mutatorData?.proposed_change;
    const hasDiagnosis = !!analyzerData?.primary_failure_type;
    const scoreBelowThreshold = totalScore < 0.85;

    // Only record when there's a real learning signal
    if (hasDiagnosis && hasMutation && scoreBelowThreshold) {
      appendLesson({
        failure_type: analyzerData.primary_failure_type,
        teaching_method: mutatorData.proposed_change?.type || 'unknown',
        result: 'PARTIAL',
        scenario: `Run ${runId} completed. Score: ${totalScore}. Analyzer: ${analyzerData.primary_failure_type}. Mutation: ${mutatorData.proposed_change?.type}. Pending human review.`,
        run_id: runId,
      });
      console.log(`[Orchestrator] Lesson recorded for ${runId}: ${analyzerData.primary_failure_type}`);
    } else {
      console.log(`[Orchestrator] No lesson recorded for ${runId} — score=${totalScore}, mutation=${hasMutation}, diagnosis=${hasDiagnosis} (gated)`);
    }
  }
} catch (err) {
  console.log(`[Orchestrator] Warning: Could not record run completion lesson: ${err.message}`);
}
```

---

## Phase 4: Schema Updates

### Task 14: Update lesson schema to include recorded_at

**Objective:** The lesson schema needs a `recorded_at` timestamp field for ordering and auditing.

**Files:**
- Modify: `schemas/lesson.schema.yaml`

Add to the properties:
```yaml
  recorded_at:
    type: string
    description: "ISO 8601 timestamp when the lesson was recorded"
```

---

## Phase 5: Operational Notes

### Backward Compatibility

Existing JSONL entries (`lessons/learned.jsonl`, `lessons/failed.jsonl`) lack the `recorded_at` timestamp field added in Task 13. The `readLessonEntries` function in `lessons.js` handles missing fields gracefully — they default to `null`. No migration needed. New entries will include the timestamp.

### Deduplication

The system intentionally accumulates multiple lessons for the same (failure_type, teaching_method, result) pair. The index lookup already groups and counts by result type. For example, if `run-0021` produces a PARTIAL lesson (Task 12), then human promotes producing a PASSED lesson (Task 4), the index will show:
```
rubric_gap_failure:
  rubric_mutation: 1 passed, 1 partial
```

This is correct behavior — both the tentative and confirmed outcomes are recorded. The insanity check uses FAILED counts, not PARTIAL counts, so promotion noise doesn't affect enforcement.

### Lesson Staleness

Lessons from early runs (e.g., `run-0001` with `frontend-v001`) may not apply to later runs with evolved formulas. The current lookup doesn't account for formula version or temporal relevance. This is acceptable for now — the system is designed to learn from early mistakes and the formula evolves quickly enough that old lessons become irrelevant through PASSED sequels. A future enhancement could add formula version filtering to `findLessons`.

---

## Verification

After all tasks are complete, run these verification steps:

**1. Test lesson recording standalone:**
```bash
cd /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01
node scripts/cli.js record_lesson \
  --failure-type search_failure \
  --teaching-method step_management \
  --result PASSED \
  --scenario "verify lesson recording works" \
  --run-id test-001

# Verify the entry was appended
tail -1 lessons/learned.jsonl | jq .
```

**2. Verify lessons/index.yaml regenerated:**
```bash
node -e "
const { appendLesson, refreshLessonIndex } = require('./scripts/lib/lessons');
appendLesson({ failure_type: 'search_failure', teaching_method: 'step_management', result: 'PASSED', scenario: 'verify' });
"
# Check index has updated stats
cat state/current.yaml
```

**3. Run end-to-end test:**
```bash
node start.js --run-id test-evo-001 --no-lock
```

Verify:
- Lessons are loaded in orchestrator startup
- Both analyze and mutate prompts contain lesson context (unified `buildLessonsContext` format)
- Post-run lesson recorded ONLY if: analyzer diagnosed failure + mutation proposed + score < 0.85
- High-scoring run (no mutation) produces zero post-run lesson
- Lessons/index.yaml reflects new entries only from meaningful runs
- CLI path: `node scripts/cli.js run_analyzer --run-id test-evo-001` includes lesson context

**4. Verify gating behavior:**
```bash
# Create a high-scoring evaluator output (no failure)
# → Post-run should print: "No lesson recorded for test-evo-002 — gated"

# Create a low-scoring evaluator output with mutation
# → Post-run should print: "Lesson recorded for test-evo-003: search_failure"
```

**5. Clean up test entries:**
```bash
# Remove test entries from JSONL files (or just note them for future cleanup)
```

---

## Commit Strategy

After each task, commit with a descriptive message:

```bash
git add scripts/lib/lessons.js
git commit -m "feat(evolution): add appendLesson, getLessonFiles, buildLessonsContext"

git add scripts/cli.js
git commit -m "feat(evolution): add record_lesson CLI command + MUTATION_TO_FAILURE map"

git add scripts/cli.js
git commit -m "feat(evolution): auto-record lesson on formula registration (reads analyzer output)"

git add scripts/cli.js
git commit -m "feat(evolution): record PASSED lesson on formula promotion (reads analyzer)"

git add scripts/cli.js
git commit -m "feat(evolution): record FAILED lesson on rubric rejection (source-aware)"

git add scripts/cli.js
git commit -m "feat(evolution): inject lessons into CLI run_analyzer + unify run_mutator injection"

git add scripts/orchestrator.js
git commit -m "feat(evolution): load lessons at orchestrator startup + inject into analyze/mutate"

git add scripts/orchestrator.js
git commit -m "feat(evolution): orchestrator-side insanity check enforcement"

git add scripts/lib/evolution.js
git commit -m "feat(evolution): add cross-run evolution context module"

git add scripts/orchestrator.js
git commit -m "feat(evolution): inject evolution context into orchestrator prompts"

git add scripts/orchestrator.js
git commit -m "feat(evolution): gated post-run lesson recording (analyzer-diagnosis-based)"

git add schemas/lesson.schema.yaml
git commit -m "feat(evolution): add recorded_at timestamp to lesson schema"
```

---

## Summary: The Completed Evolution Loop

After implementation, the data flow becomes:

```
Run N ──→ Analyze (with unified lessons context — both CLI & orchestrator paths)
             │
             ▼
          Mutate (with unified lessons context + insanity check enforced by
             │     BOTH: orchestrator-side Task 10 AND CLI-side existing check)
             │
             ▼
          Register Candidate ──→ Auto-record PARTIAL lesson
             │                   (failure type from ANALYZER diagnosis, not inferred)
             │
             ▼
       [HUMAN REVIEWS]
          │            │
          ▼            ▼
    advance_formula   reject_candidate
          │            │
          ▼            ▼
   Record PASSED    Record FAILED
   lesson           lesson (source-aware: reads candidate.source)
   (reads analyzer)
          │
          ▼
   Post-run lesson recorded ONLY IF: analyzer diagnosed failure
                                     AND mutation proposed
                                     AND score < 0.85
          │
          ▼
   state/current.yaml updated
          │
          ▼
   Run N+1 starts with:
   ├── Promoted formula (carries mutation)
   ├── Lessons loaded (avoids past failures; gated — no noise)
   ├── Evolution context (sees last 3 runs, pending queue)
   └── Insanity check enforced by orchestrator + CLI
```

### Key Principles After Implementation

1. **Analyzer is the canonical failure type source** — auto-recording never guesses; it reads `primary_failure_type` from analyzer output
2. **Unified lesson injection** — `buildLessonsContext` in `lessons.js` used by both CLI and orchestrator paths
3. **Gated recording** — high-scoring runs with no mutations produce zero post-run lessons
4. **Source-aware rejection** — rubric candidate rejection uses `candidate.source` field, not hardcoded types
5. **No silent noise** — the index grows only by meaningful learning signals, not every run
