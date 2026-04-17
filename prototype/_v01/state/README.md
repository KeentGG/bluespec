# State

Mutable live state for the prototype workspace.

- `current.yaml` tracks active refs and the next run ID
- `queue.yaml` tracks pending reviews and promotions
- `locks/` is reserved for future orchestration locking
- `checkpoints/` is reserved for future resumable workflow state

Unlike `runs/`, this folder is intentionally mutable.
