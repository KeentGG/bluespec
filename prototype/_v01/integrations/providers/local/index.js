async function generate(messages, options = {}) {
  const { temperature = 0.3, model = 'local-stub' } = options;
  const start = Date.now();

  const lastMessage = messages[messages.length - 1];
  const userContent = typeof lastMessage === 'object' ? lastMessage.content : lastMessage;
  const uc = userContent.toLowerCase();

  let role = 'unknown';
  let output = '';

  if (uc.includes('###current_step###')) {
    if (uc.includes('###current_step### explore')) {
      role = 'generator.explore';
      output = buildExploreOutput();
    } else if (uc.includes('###current_step### analyze')) {
      role = 'generator.analyze';
      output = buildAnalyzeOutput();
    } else if (uc.includes('###current_step### draft')) {
      role = 'generator.draft';
      output = buildDraftOutput();
    } else if (uc.includes('###current_step### verify')) {
      role = 'generator.verify';
      output = buildVerifyOutput();
    } else if (uc.includes('###current_step### cross_ref')) {
      role = 'generator.cross_ref';
      output = buildCrossRefOutput();
    } else {
      role = 'generator.generic';
      output = buildGenericOutput('generator.generic');
    }
  } else if (uc.includes('###role### evaluator')) {
    role = 'evaluator';
    output = buildEvaluatorOutput(uc);
  } else if (uc.includes('###role### analyzer')) {
    role = 'analyzer';
    output = buildAnalyzerOutput(uc);
  } else if (uc.includes('###role### mutator')) {
    role = 'mutator';
    output = buildMutatorOutput(uc);
  } else if (uc.includes('mutator') || uc.includes('mutation') || uc.includes('candidate_formula')) {
    role = 'mutator';
    output = buildMutatorOutput(uc);
  } else if (uc.includes('analyzer') || uc.includes('diagnosis') || uc.includes('failure_type')) {
    role = 'analyzer';
    output = buildAnalyzerOutput(uc);
  } else if (uc.includes('evaluator') || uc.includes('score') || uc.includes('recall') || uc.includes('precision')) {
    role = 'evaluator';
    output = buildEvaluatorOutput(uc);
  } else {
    role = 'generic';
    output = buildGenericOutput('generic');
  }

  const latency = Date.now() - start;
  const inputLen = userContent.length;
  const outputLen = output.length;

  return {
    content: output,
    usage: {
      prompt_tokens: Math.ceil(inputLen / 4),
      completion_tokens: Math.ceil(outputLen / 4),
      total_tokens: Math.ceil(inputLen / 4) + Math.ceil(outputLen / 4),
    },
    metadata: {
      model,
      temperature,
      latency_ms: latency,
      role,
    },
  };
}

function buildExploreOutput() {
  return `step: explore
step_number: 1
status: complete
confidence: 0.85
summary: "Explored project structure and identified key behavioral areas"
files_analyzed:
  - src/index.ts
  - src/state.ts
  - src/components/App.tsx
artifacts_produced:
  - explored_behaviors.yaml
unresolved_questions:
  - "Confirm whether legacy auth module is still in use"
flags_for_analyzer: []
`;
}

function buildAnalyzeOutput() {
  return `step: analyze
step_number: 2
status: complete
confidence: 0.79
summary: "Mapped discovered behaviors to spec-ready units"
files_analyzed:
  - src/state.ts
  - src/components/App.tsx
artifacts_produced:
  - behavior_map.yaml
unresolved_questions:
  - "Some state transitions lack clear triggers — treated as event-driven"
flags_for_analyzer:
  - "State machine patterns detected; boundary definitions are ambiguous"
`;
}

function buildDraftOutput() {
  return `step: draft
step_number: 3
status: complete
confidence: 0.76
summary: "Drafted 3 spec files covering auth session, app state, and layout"
files_analyzed: []
artifacts_produced:
  - specs/auth.session.yaml
  - specs/app.state.yaml
  - specs/app.layout.yaml
unresolved_questions:
  - "Data table behavior may need separate spec depending on user feedback"
flags_for_analyzer: []
`;
}

function buildVerifyOutput() {
  return `step: verify
step_number: 4
status: complete
confidence: 0.83
summary: "Verified schema validity and reference consistency; no contradictions detected"
files_analyzed: []
artifacts_produced:
  - verification_report.yaml
unresolved_questions: []
flags_for_analyzer: []
`;
}

function buildCrossRefOutput() {
  return `step: cross_ref
step_number: 5
status: complete
confidence: 0.81
summary: "Linked related specs and evidence; created reference map"
files_analyzed: []
artifacts_produced:
  - reference_map.yaml
unresolved_questions:
  - "Cross-ref with golden set pending evaluator run"
flags_for_analyzer: []
`;
}

function buildGenericOutput(role) {
  return `role: ${role}
status: complete
confidence: 0.70
summary: "Local stub output — replace with real provider"
`;
}

function buildEvaluatorOutput(uc) {
  const hasPrecisionLoss = uc.includes('precision') || uc.includes('false_positive');
  const precisionBlock = hasPrecisionLoss ? `
precision_findings:
  - spec: specs/app.state.yaml
    concern: "State transitions documented but trigger conditions implied rather than explicit"
    severity: low
` : '';

  return `status: complete
confidence: 0.82
summary: "Evaluated 3 specs against active rubric and golden set"
recall_hits:
  - criterion: conditional_flow_documentation
    spec: specs/app.state.yaml
    evidence: "spec captures state transitions and conditional rendering"
    weight: 0.81
  - criterion: schema_valid
    spec: specs/auth.session.yaml
    evidence: "all required fields present"
    weight: 1.0
recall_misses:
  - criterion: completeness_inputs_outputs
    spec: specs/app.layout.yaml
    gap: "Layout spec does not document responsive breakpoint behavior"
    severity: medium
${precisionBlock}
consistency_findings:
  - type: reference_resolution
    status: pass
    details: "All cross-spec references resolve correctly"
rubric_gap_candidates: []
overall_score: 0.74
tokens_used: 1240
`;
}

function buildAnalyzerOutput(uc) {
  const isRecallMiss = uc.includes('recall_miss') || uc.includes('miss');
  const failureType = isRecallMiss ? 'recognition_failure' : 'search_failure';

  return `status: complete
confidence: 0.76
primary_failure_type: ${failureType}
diagnosis: "The formula explored the right files but failed to interpret state-machine boundary patterns as spec-worthy behavior. The explore phase identified the files but the draft phase collapsed state transitions into a single monolithic state block."
failure_tier: prompt_tweak
suggested_mutation: "Add explicit state-machine boundary detection to the explore phase instructions; refine draft phase prompt to list state transitions as a required spec section"
expected_effect: "Improve recall on stateful UI behaviors without affecting other coverage areas"
evidence_refs:
  - generator/steps/step-1-explore.yaml
  - generator/steps/step-3-draft.yaml
rubric_gap_proposed: false
rubric_gap_proposal: null
`;
}

function buildMutatorOutput(uc) {
  const isRecallMiss = uc.includes('recall_miss') || uc.includes('miss');
  const mutation = isRecallMiss
    ? `proposed_change:
  type: prompt_tweak
  target_step: draft
  current_prompt_section: "Document state transitions and conditional flows explicitly"
  proposed_addition: "For each stateful component, enumerate: (1) all possible states, (2) transition triggers, (3) guard conditions, (4) side effects. Do not collapse states into a single description."
  expected_improvement: "recall on state_machine_boundary criterion"
  risk: low
  rationale: "This is a targeted prompt addition that expands what the draft step asks for without changing the formula structure"`
    : `proposed_change:
  type: step_management
  target_step: explore
  change: "Add sub-step for state-machine boundary detection before analyze phase"
  expected_improvement: "coverage on stateful behavior patterns"
  risk: medium
  rationale: "Search failure suggests explore phase needs explicit state-machine boundary enumeration step before analyze"`

  return `status: complete
confidence: 0.71
${mutation}
insanity_check:
  method_already_failed: false
  failed_runs: []
  justification: "No prior attempt used prompt_tweak on draft phase for recognition_failure"
tokens_used: 890
`;
}

module.exports = { generate };
