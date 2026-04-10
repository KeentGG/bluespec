# Evolution System

> How spec formulas are trained, evaluated, and improved -- inspired by neural network training.
> Status: ACTIVE DISCUSSION

---

## The Training Analogy

The end goal is to follow how basic neural models are made: they follow a training phase, do back propagation and figure out the flaw, error, and reward correct behavior. That's the end goal in the first milestone -- to make a harness for this to make this possible.

The analogy:

```
Neural Net Training          Blueprint Mode
-------------------          -----------
Labeled training data   <->  Golden set (human-provided behaviors)
Forward pass            <->  Run formula, generate specs
Loss function           <->  Precision + recall against golden set
Backpropagation         <->  Analyzer diagnoses failures
Weight update           <->  Mutator adjusts formula
Epoch                   <->  Evolution cycle
Validation set          <->  Hold-out project for testing generalization
```

This is evolutionary search, not just backprop. Each formula is an organism, fitness is spec quality, mutation is prompt/step/format tweaks.

---

## The Core Loop

```
1. Generate a candidate formula (prompts + steps + format + validation)
2. Run it against a codebase
3. Evaluate output quality (completeness? accuracy? coverage? human rating?)
4. Identify what failed and why
5. Mutate the formula to fix weaknesses
6. Repeat
```

It's not feasible for one person alone to do this process. There needs to be a team of AI agents that will do this automatedly.

---

## Golden Set Evaluation

Instead of trying to define "good spec" abstractly, anchor it to concrete reality.

### How It Works

The human provides a list of known hard-to-find business logic behaviors from a brownfield project. Examples from actual codebases:

- "In dashboard, when editing a project, it should route to gate/edit but with condition to check whether agreement has been ticked off or not"
- "Only show download button if report progress has made it to download page in the first place"
- Lots of behaviors where initial observations are made as a list by a human

Then another agent checks if a spec has been made to document each of those behaviors. And we're not just documenting behaviors, but everything -- colors, layout, etc.

### Recall

```
Human provides:
  golden_behaviors = [
    "editing project routes to gate/edit only if agreement ticked",
    "download button only visible after report reaches download page",
    "modal closes on ESC key only when not in edit mode",
    ... etc
  ]

Run formula against codebase -> produces specs

Agent checks:
  for each behavior in golden_behaviors:
    is there a spec that documents this?
    YES -> recall hit
    NO  -> recall miss (formula failed to find this)

Fitness = recall / total_golden_behaviors
```

### Precision

The formula might generate specs for behaviors that don't actually exist (hallucinated business logic):

```
Human spot-checks:
  for random sample of generated specs:
    does this behavior actually exist in the code?
    YES -> precision hit
    NO  -> precision miss (formula hallucinated)
```

### The Loss Function

Full picture: **precision + recall as the loss function.**

We cannot 100% find imperfections. Even perfect ones have trade-offs. But having a golden set gives us a concrete, measurable signal.

The human effort goes into curating golden sets, not into writing the spec format. Over time, as the loop runs, the formula catches more and more automatically. The human input shrinks as the formula improves. It's like labeling training data -- expensive upfront, but the model learns to do the rest.

---

## Tiered Mutation System

When the formula fails, mutations have escalating severity. If a simple prompt failed, maybe there's a degree of changes:

| Tier | Change Type | Examples |
|------|-------------|---------|
| 1 | Prompt tweaks | Re-word prompt, add detailed prompt, add instruction to read more codebase |
| 2 | Step management | Add new basic step, step insertion, re-order steps |
| 3 | Parent guideline | Re-word base instructions |
| 4 | Format/schema changes | Add block type, change YAML schema |
| 5 | Tool change / overall formula | Add explicit instruction in base guidelines, change tools used |

The rule: if tier 1 failed, don't try tier 1 again. Escalate to tier 2. If tier 2 failed, escalate to tier 3. This is the "insanity prevention" -- never teach the same fault with the same teaching method since it's called insanity.

---

## Teaching Method Tracker

The system needs to track what teaching methods have been tried and whether they worked:

### The Knowledge Base

```
lessons_learned:
  - failure_type: "recognition_failure"
    scenario: "Agent missed conditional UI visibility"
    first_tried: "Add explicit prompt: look for conditional rendering"
    result: FAILED - agent still missed it
    second_tried: "Add verification step: cross-check rendered components against business rules file"
    result: PASSED - conditional visibility caught
    teaching_method: "verification_crosscheck"
    works_on: ["conditional_rendering", "feature_flags", "permission_gating"]

  - failure_type: "search_failure"
    scenario: "Agent didn't explore shared utility module"
    first_tried: "Add explore dependencies to prompt"
    result: PARTIAL - found some, missed transitive deps
    second_tried: "Add dependency graph traversal as explicit step before exploration"
    result: PASSED
    teaching_method: "pre_step_dependency_graph"
    works_on: ["shared_modules", "transitive_deps", "monorepo_packages"]
```

### Rules

- **Never try the same teaching method on the same failure type twice** -- if it failed before, it'll fail again
- **Tag what worked and what it works on** -- so the mutator can reuse proven methods on similar failures
- **Tag what failed and why** -- so the analyzer doesn't suggest it again
- **If the lesson was learned**, analyzer should be aware of it and document that kind of teaching method works on that kind of scenario
- **If not**, analyzer should try to "teach" mutator agent again in another way

This is reinforcement learning at the formula level. The reward signal is "did the fix actually improve recall/precision on the next run?"

### Mutator Needs Systematic Exploration

If prompt changes failed, maybe the problem isn't the prompt -- maybe it's missing a step entirely. The mutator needs to explore the space systematically, not just rephrase the same prompt.

Possible mutation categories:
- Prompt changes -- different wording, more specific instructions
- Step insertion -- add a new step before or after
- Step reordering -- exploration before analysis instead of after
- Format changes -- add a new block type, change schema
- Tool changes -- use grep instead of read, add AST parsing
- Verification changes -- stricter gate, different check criteria
- Context changes -- include more files, include fewer files

---

## The Feedback Loop on Diagnosis

The analyzer's "lesson learned fix" needs to be verified -- did the fix actually work? If not, it will try to "teach" mutator agent again in another way, avoiding the same teaching method since it's called insanity.

We document everything assuming the agent's session is their last run and will be taken over by another agent session. Agents have limited context -- even with some AI tools having compacted conversation, sometimes having fresh context makes the agent think clearly.

---

## The Analyzer Agent: Make or Break

The Analyzer Agent diagnosis is the make or break of this project. Even with the smartest and most forward-thinking model, if the multi-agent can't figure out on their own how to learn from mistakes, then the spec system is just a bunch of markdown files serving as a wiki documentation.

### Failure Categories

The analyzer must identify WHY the formula missed something:

- **Search failure** -- didn't look in the right files
- **Recognition failure** -- saw the code but didn't understand the behavior
- **Format failure** -- understood it but the spec schema had no place to put it
- **Prompt failure** -- instructions didn't ask for this kind of behavior

Each failure type requires a different mutation. Getting the diagnosis right is what makes the evolutionary loop converge instead of randomly flailing.

---

## Further Reading

- [Multi-Agent Harness](09-multi-agent-harness.md) -- The agents that run the evolution loop
- [Spec Formula](07-spec-formula.md) -- What gets evolved
- [Research](10-research.md) -- Papers on evolutionary prompt optimization, learning from failure
