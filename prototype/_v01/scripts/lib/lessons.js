const fs = require('fs');

const {
  readText,
  readYamlFile,
  resolveWorkspacePath,
  timestamp,
  writeYamlFile,
} = require('./common');

function loadLessonPolicy() {
  const policyPath = resolveWorkspacePath('lessons/index.yaml');
  return readYamlFile(policyPath) || {};
}

function readLessonEntries(relativePath, bucket) {
  const filePath = resolveWorkspacePath(relativePath);
  const lines = readText(filePath)
    .split('\n')
    .map((line) => line.trim());

  return lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => Boolean(line))
    .map(({ line, lineNumber }) => {
      const record = JSON.parse(line);
      return {
        bucket,
        source_ref: `${relativePath}#${lineNumber}`,
        line_number: lineNumber,
        failure_type: record.failure_type || 'unknown',
        teaching_method: record.teaching_method || 'unknown',
        result: record.result || 'UNKNOWN',
        scenario: record.scenario || '',
        works_on: Array.isArray(record.works_on) ? record.works_on : [],
        run_id: record.run_id || null,
        discovered_criterion: record.discovered_criterion || null,
      };
    });
}

function buildLookup(entries) {
  const byFailureType = {};

  for (const entry of entries) {
    if (!byFailureType[entry.failure_type]) {
      byFailureType[entry.failure_type] = {
        total: 0,
        results: { PASSED: 0, FAILED: 0, PARTIAL: 0 },
        teaching_methods: {},
      };
    }

    const failureBucket = byFailureType[entry.failure_type];
    failureBucket.total += 1;
    failureBucket.results[entry.result] = (failureBucket.results[entry.result] || 0) + 1;

    if (!failureBucket.teaching_methods[entry.teaching_method]) {
      failureBucket.teaching_methods[entry.teaching_method] = {
        total: 0,
        results: { PASSED: 0, FAILED: 0, PARTIAL: 0 },
        entries: [],
      };
    }

    const methodBucket = failureBucket.teaching_methods[entry.teaching_method];
    methodBucket.total += 1;
    methodBucket.results[entry.result] = (methodBucket.results[entry.result] || 0) + 1;
    methodBucket.entries.push({
      source_ref: entry.source_ref,
      result: entry.result,
      scenario: entry.scenario,
      run_id: entry.run_id,
      bucket: entry.bucket,
    });
  }

  return byFailureType;
}

function refreshLessonIndex() {
  const doc = loadLessonPolicy();
  const files = doc.files || {
    learned: 'lessons/learned.jsonl',
    failed: 'lessons/failed.jsonl',
  };

  const learnedEntries = readLessonEntries(files.learned, 'learned');
  const failedEntries = readLessonEntries(files.failed, 'failed');
  const entries = [...learnedEntries, ...failedEntries];

  const indexed = {
    ...doc,
    generated_at: timestamp(),
    stats: {
      total_lessons: entries.length,
      learned_count: learnedEntries.length,
      failed_count: failedEntries.length,
    },
    lookup: {
      by_failure_type: buildLookup(entries),
    },
    entries,
  };

  writeYamlFile(resolveWorkspacePath('lessons/index.yaml'), indexed);
  return indexed;
}

function findLessons(index, filters = {}) {
  const entries = index.entries || [];
  return entries.filter((entry) => {
    if (filters.failure_type && entry.failure_type !== filters.failure_type) return false;
    if (filters.teaching_method && entry.teaching_method !== filters.teaching_method) return false;
    if (filters.result && entry.result !== filters.result) return false;
    if (filters.bucket && entry.bucket !== filters.bucket) return false;
    return true;
  });
}

function summarizeLessonsForFailureType(index, failureType) {
  const relevant = findLessons(index, { failure_type: failureType });
  return {
    failed: relevant.filter((entry) => entry.result === 'FAILED'),
    learned: relevant.filter((entry) => entry.result === 'PASSED'),
    partial: relevant.filter((entry) => entry.result === 'PARTIAL'),
  };
}

function getLessonFiles() {
  const doc = loadLessonPolicy();
  return doc.files || {
    learned: 'lessons/learned.jsonl',
    failed: 'lessons/failed.jsonl',
  };
}

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
  findLessons,
  refreshLessonIndex,
  summarizeLessonsForFailureType,
  appendLesson,
  getLessonFiles,
  buildLessonsContext,
};
