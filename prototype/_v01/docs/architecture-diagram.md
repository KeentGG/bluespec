# Prototype Architecture Diagram

This document visualizes how the evolution prototype is organized today: folders, lifecycle scripts, mutable state, immutable runs, and the future agent layer.

---

## 1. High-Level Architecture

```mermaid
flowchart TB
  subgraph Human[Human-authored control plane]
    Docs[docs/<br/>policy + decisions + data model]
    Config[config/<br/>prototype + project config]
    Prompts[prompts/<br/>future role contracts]
    Goldens[goldens/<br/>human behavior anchors]
    Seeds[formulas/seed + rubrics/seed<br/>baseline generation + evaluation]
    Schemas[schemas/<br/>validation contracts]
  end

  subgraph Tooling[Current executable layer]
    CLI[scripts/cli.js<br/>Node orchestration CLI]
    Common[scripts/lib/common.js<br/>file/path/YAML helpers]
    Validation[scripts/lib/validation.js<br/>AJV schema validation]
  end

  subgraph LiveState[Mutable runtime state]
    Current[state/current.yaml<br/>active refs + next run id]
    Queue[state/queue.yaml<br/>pending reviews/promotions]
  end

  subgraph History[Immutable / append-only artifacts]
    Runs[runs/run-000X/<br/>manifest + frozen inputs + future outputs]
    Snapshots[rubrics/snapshots/vXXX/<br/>frozen official rubric versions]
    Lessons[lessons/*.jsonl<br/>worked/failed teaching methods]
    Candidates[formulas/candidates + rubrics/candidates<br/>proposals awaiting governance]
  end

  subgraph Future[Future agent execution layer]
    Generator[Generator]
    Evaluator[Evaluator]
    Analyzer[Analyzer]
    Mutator[Mutator]
    Providers[integrations/providers/*<br/>local / opencode / hermes]
    Hooks[integrations/hooks/*<br/>optional lifecycle hooks]
  end

  Docs --> CLI
  Config --> CLI
  Schemas --> Validation
  Common --> CLI
  Validation --> CLI
  CLI --> Current
  CLI --> Queue
  CLI --> Runs
  CLI --> Candidates
  CLI --> Snapshots
  Goldens --> Runs
  Seeds --> Runs
  Prompts --> Future
  Providers --> Generator
  Providers --> Evaluator
  Providers --> Analyzer
  Providers --> Mutator
  Generator --> Runs
  Evaluator --> Runs
  Analyzer --> Candidates
  Mutator --> Candidates
  Hooks -. observe/enrich .-> Runs
```

---

## 2. Folder Structure by Responsibility

```mermaid
flowchart LR
  Root[prototype/_v01]

  Root --> A[config/<br/>workspace + project refs]
  Root --> B[docs/<br/>architecture + decisions + scope]
  Root --> C[schemas/<br/>artifact validation]
  Root --> D[prompts/<br/>future AI role contracts]
  Root --> E[goldens/<br/>behavior anchors]
  Root --> F[formulas/<br/>seed / candidates / promoted / archive]
  Root --> G[rubrics/<br/>seed / snapshots / candidates / shadow]
  Root --> H[lessons/<br/>append-only learning memory]
  Root --> I[runs/<br/>immutable run history]
  Root --> J[state/<br/>mutable live pointers]
  Root --> K[integrations/<br/>providers + hooks + contracts]
  Root --> L[scripts/<br/>current CLI implementation]
```

---

## 3. Current Script Surface

```mermaid
flowchart TB
  CLI[scripts/cli.js]

  CLI --> Init[init_run<br/>create run scaffold + manifest]
  CLI --> Freeze[freeze_inputs<br/>copy refs into run inputs]
  CLI --> Validate[validate_artifacts<br/>schema-check current artifacts]
  CLI --> Candidate[register_rubric_candidate<br/>store candidate + queue review]

  Init --> M1[runs/run-000X/manifest.yaml]
  Init --> M2[state/current.yaml]

  Freeze --> F1[runs/run-000X/inputs/formula.yaml]
  Freeze --> F2[runs/run-000X/inputs/rubric.yaml]
  Freeze --> F3[runs/run-000X/inputs/golden-set.yaml]
  Freeze --> F4[runs/run-000X/inputs/project.yaml]
  Freeze --> F5[runs/run-000X/inputs/resolved-inputs.yaml]

  Validate --> V1[schemas/*.yaml]

  Candidate --> C1[rubrics/candidates/<id>.yaml]
  Candidate --> C2[state/queue.yaml]
```

---

## 4. Initial Run Lifecycle

```mermaid
sequenceDiagram
  participant User
  participant CLI as scripts/cli.js
  participant State as state/current.yaml
  participant Run as runs/run-0001/
  participant Queue as state/queue.yaml
  participant Candidate as rubrics/candidates/

  User->>CLI: init_run
  CLI->>State: read active refs + next_run_id
  CLI->>Run: create run-0001/ + manifest.yaml
  CLI->>State: set last_prepared_run_id + increment next_run_id

  User->>CLI: freeze_inputs --run-id run-0001
  CLI->>Run: copy formula/rubric/golden/project into inputs/
  CLI->>Run: write resolved-inputs.yaml

  User->>CLI: validate --run-id run-0001
  CLI->>Run: validate manifest
  CLI->>State: validate current refs through schemas

  User->>CLI: register_rubric_candidate ... --run-id run-0001
  CLI->>Candidate: write conditional_flow_documentation.yaml
  CLI->>Queue: enqueue rubric review + pending promotion

  User->>CLI: validate --candidate conditional_flow_documentation
  CLI->>Candidate: validate candidate schema
```

---

## 5. What `run-0001` Contains Today

```text
runs/run-0001/
├── manifest.yaml
├── inputs/
│   ├── formula.yaml
│   ├── rubric.yaml
│   ├── golden-set.yaml
│   ├── project.yaml
│   └── resolved-inputs.yaml
├── generator/
├── evaluator/
├── analyzer/
└── mutator/
```

### Purpose of each generated file

- `manifest.yaml` — declares the run identity and references used
- `inputs/formula.yaml` — frozen formula for reproducibility
- `inputs/rubric.yaml` — frozen official rubric snapshot
- `inputs/golden-set.yaml` — frozen evaluation anchor
- `inputs/project.yaml` — frozen project config; currently points at `dashboard-v2`
- `inputs/resolved-inputs.yaml` — provenance note for what was copied and when
- `generator/`, `evaluator/`, `analyzer/`, `mutator/` — placeholders for future agent outputs

---

## 6. State vs History

```mermaid
flowchart LR
  subgraph Mutable[Mutable]
    S1[state/current.yaml]
    S2[state/queue.yaml]
  end

  subgraph Immutable[Immutable or append-only]
    R1[runs/run-000X/]
    R2[rubrics/snapshots/vXXX/]
    R3[lessons/learned.jsonl]
    R4[lessons/failed.jsonl]
  end

  S1 -->|points to| R2
  S1 -->|selects| A[config/projects/*.yaml]
  S1 -->|selects| B[formulas/seed or promoted]
  S1 -->|selects| C[goldens/projects/*]
  S2 -->|queues review for| D[rubrics/candidates/*.yaml]
```

Core rule:

- `state/` is allowed to change
- `runs/` and official rubric snapshots should be treated as historical record

---

## 7. Future Agentic Architecture

Today, the prototype is mostly lifecycle tooling. The future agent loop plugs into the empty role folders already present in each run.

```mermaid
flowchart TB
  Prepare[init_run + freeze_inputs] --> Gen[run_generator]
  Gen --> Eval[run_evaluator]
  Eval --> Analyze[run_analyzer]
  Analyze --> Mutate[run_mutator]
  Analyze --> RubricCandidate[register_rubric_candidate]
  Mutate --> FormulaCandidate[register_formula_candidate - future]
  RubricCandidate --> Governance[promote_rubric_snapshot - future]
  FormulaCandidate --> Advance[advance_formula - future]
```

That future loop preserves the same design rule:

> agents propose artifacts, scripts govern lifecycle, files preserve memory.
