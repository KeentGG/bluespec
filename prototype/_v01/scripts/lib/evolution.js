const { resolveWorkspacePath, readYamlFile, listDir, fileExists } = require('./common');
const path = require('path');

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

  parts.push(`## Active Formula\n- ID: ${formula.id} v${formula.version}\n- Ecosystem: ${formula.ecosystem}\n- Steps: ${(formula.steps || []).map(s => s.id).join(' → ')}`);

  parts.push(`\n## Active Rubric\n- Version: ${rubric.rubric_version || 'unknown'}\n- Active criteria: ${(rubric.active_criteria || []).join(', ')}`);

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

  const pendingFormulas = queue.pending_promotions?.formulas || [];
  const pendingRubrics = queue.pending_promotions?.rubric_criteria || [];
  if (pendingFormulas.length > 0 || pendingRubrics.length > 0) {
    parts.push(`\n## Pending Reviews`);
    if (pendingFormulas.length > 0) parts.push(`- Formula candidates: ${pendingFormulas.join(', ')}`);
    if (pendingRubrics.length > 0) parts.push(`- Rubric candidates: ${pendingRubrics.join(', ')}`);
  }

  return parts.join('\n');
}

function getLastRunId() {
  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));
  return state.last_prepared_run_id || null;
}

module.exports = {
  loadEvolutionContext,
  getLastRunId,
};
