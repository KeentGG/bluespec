# Rubric Candidate Review Workflow

Store discovered rubric criteria here before probation or promotion. Files in this folder must never affect official scoring directly.

---

## Lifecycle

```
analyzer diagnoses rubric_gap_failure
    → mutator packages rubric_candidate artifact
    → agent calls register_rubric_candidate
    → candidate lands here with status: candidate
    → reviewer evaluates (this workflow)
    → approved → status: probation | rejected → status: rejected
    → probation candidates promoted via promote_rubric_snapshot
```

---

## Reviewer Checklist

For each candidate in this folder, answer these questions before approving or rejecting.

### 1. Repeated Evidence — Has this gap appeared in multiple runs?

**Question:** Does `evidence_count >= 2` OR `first_observed_run != last_observed_run`?

**Why it matters:** A gap seen once may be a noisy fluke. A gap seen across multiple runs is more likely a genuine systemic blind spot.

**What to check:**
- `evidence_count` field — number of runs that observed this gap
- `first_observed_run` and `last_observed_run` — temporal spread
- `recall_misses_triggered` — which specific misses in each run triggered the diagnosis

**If NO:** Flag for probation tracking. Low confidence until second observation.

---

### 2. Low Overlap — Is this criterion genuinely new?

**Question:** Does this criterion describe behavior NOT already covered by `rubric.active_criteria`?

**Why it matters:** Adding redundant criteria dilutes the rubric without improving coverage. The system should grow its coverage, not echo it.

**What to check:**
- Compare candidate `description` against `rubrics/snapshots/<current>/rubric.yaml` active criteria
- Check `source` field — `rubric_gap_failure` from the analyzer is more credible than hand-wavey `contextual_inference`

**If OVERLAP EXISTS:** Reject. A duplicate criterion adds no value.

---

### 3. Positive Holdout Effect — Will this improve future specs?

**Question:** Is there reason to believe specs scored under this criterion would be meaningfully better?

**Why it matters:** A criterion that sounds plausible but has no clear path to improving spec quality is speculative. Governance should be skeptical of speculative additions.

**What to check:**
- `rationale` field — does the candidate explain WHY this criterion would catch real misses?
- `failure_type` from analyzer — `search_failure` and `recognition_failure` suggest the formula can learn to close the gap without a new criterion. `rubric_gap_failure` suggests the gap is genuinely outside what any formula can self-correct.
- `evaluator_score` — low scores (< 0.6) suggest systemic miss; check whether the miss is in scope for the rubric

**If NOT CLEAR:** Probation with spot-check. Don't activate without a holdout run showing improvement.

---

### 4. Acceptable Precision Tradeoff — Will this create false positives?

**Question:** Would well-written specs fail this criterion unfairly?

**Why it matters:** Every criterion risks false positives. A criterion that fires on good specs creates noise and erodes trust in the rubric.

**What to check:**
- `precision_concern` field — did the analyzer flag any false-positive risk?
- `weight_recommendation` — high weight (>> 1.0) means this criterion has strong opinion; high opinion + precision concern = reject or probation
- `description` — vague or broadly-scoped criteria are higher precision risk

**If HIGH RISK:** Send to probation. Spot-check on holdout before activation.

---

### 5. Provenance Audit — Is the candidate well-sourced?

**Question:** Does the candidate have sufficient provenance to be evaluated, not just intuited?

**Why it matters:** A candidate with rich provenance is verifiable and debuggable. A candidate with minimal provenance is a guess.

**Minimum required fields:**
- `id` — stable snake_case identifier
- `description` — specific, not vague
- `source` — how it was discovered
- `discovered_in_run` — traceable to a specific run
- `failure_type` — which analyzer failure type triggered this

**Recommended provenance fields:**
- `source_run` — run where gap was identified
- `evaluator_score` — context for severity
- `analyzer_confidence` — how certain the analyzer was
- `recall_misses_triggered` — concrete misses, not general claims
- `scored_specs_examined` — what the judgment was based on
- `evidence_refs` — files/specs that demonstrate the gap

**If PROVENANCE IS THIN:** Probation. Require richer sourcing before activation.

---

## Promotion Rules Summary

| Condition | Action |
|---|---|
| `evidence_count >= 2` OR multiple runs | Approve → probation |
| Single run, thin provenance | Probation (watch for second observation) |
| Overlaps with existing criterion | Reject |
| High precision concern + high weight | Reject or probation with spot-check |
| `failure_type` is search/recognition/prompt | Reject — formula can self-correct |
| `failure_type` is rubric_gap_failure + thin rationale | Reject — not a genuine gap |

---

## Commands

```bash
# Approve a candidate — moves to probation
node scripts/cli.js approve_rubric_candidate --id <criterion_id> --target-state probation --notes "..."

# Reject a candidate — marks rejected
node scripts/cli.js reject_rubric_candidate --id <criterion_id> --reason "..." --notes "..."

# After approving probation candidates, promote to next snapshot
node scripts/cli.js promote_rubric_snapshot --notes "..."

# Check pending reviews
cat state/queue.yaml
```

---

## Probation Rules

A criterion in `probation` status:
- Is NOT used for official scoring in the current snapshot
- Is visible in `rubrics/snapshots/<next>/rubric.yaml` only after `promote_rubric_snapshot`
- Must accumulate `probation_runs_remaining` decrementing across runs before eligibility for `active`
- Is tracked in shadow mode for holdout effect measurement

---

## Current Candidates

Use this space to track active review sessions:

```
# Review session: <date>
# Candidate: <id>
# Status: [in_review | approved | rejected]
# Notes:

