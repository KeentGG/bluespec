# Schemas

Validation contracts for machine-readable prototype artifacts.

These schemas define valid shapes for:
- formulas → `formula.schema.yaml`
- project configs → `project-config.schema.yaml`
- golden sets → `golden-set.schema.yaml`
- run manifests → `run-manifest.schema.yaml`
- rubric snapshots → `rubric-snapshot.schema.yaml`
- rubric candidates → `rubric-candidate.schema.yaml`
- seed rubrics → `seed-rubric.schema.yaml`
- lessons → `lesson.schema.yaml`

> `rubric.schema.yaml` is deprecated — its union shape (criterion | snapshot) matches no current artifact.
