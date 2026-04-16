# Debugging Rubric for Hanging/Recursion Bugs
## 1. Trace the Full Call Chain
When a function is slow/hanging:
- **Don't**: Optimize the function in isolation
- **Do**: Map the complete call chain
  - Caller → Function → Dependencies → Does it loop back?
  - Check: Does the function call anything that eventually calls itself?
---
## 2. Identify Recursive Entry Points
For any interceptor, middleware, or hook:
| Check | Action |
|-------|--------|
| List intercepted entry points | Document all routes/paths it catches |
| List internal calls | Document all endpoints it calls internally |
| Find overlap | Any intersection = **recursion risk** |
| Test | Call endpoint X → does it trigger interceptor → call endpoint X again? |
**Red flag pattern**: Interceptor calls API client which hits the same interceptor.
---
## 3. Verify Timing Assumptions
When you see consistent delays:
1. Is delay from **external slowness** or **internal waiting**?
2. Are you waiting on a lock/promise that **you yourself are holding**?
3. **Distinguish**: External timeout vs. deadlock vs. recursive wait.
---
## 4. State Ownership Analysis
When you see "already in progress" / "locked" / "waiting":
- Who holds the state/lock?
- **Key question**: Is it another thread, or the same call stack re-entered?
- **Add to logs**: Caller identification if unclear.
---
## 5. Endpoint Exclusion Verification
For any request modifier (interceptors, middleware, hooks):
| Must Exclude | Why |
|--------------|-----|
| Its own dependencies | Prevents recursive calls |
| Authentication/refresh endpoints | These bootstrap the session |
| Public/unauthenticated routes | No CSRF/token needed |
| Health checks | Must always respond |
**Rule**: An interceptor must never intercept its own internal calls.
---
## 6. Apply the "5 Whys" to Timing Issues
Problem: "Operation takes N seconds"
Why 1? → Why 2? → Why 3? → Why 4? → Why 5? = Root cause
**Stop condition**: When you find code waiting on itself.
---
## 7. Self-Containment Test
For any async coordination logic:
| Test | Pass Criteria |
|------|---------------|
| Isolated call | Completes successfully |
| Re-entry while running | Completes or queues properly (no deadlock) |
| Concurrent calls | Properly coordinated (no race conditions) |
**Failure mode**: Recursive re-entry without guard conditions.
---
## Pre-Optimization Checklist
Before optimizing slow operations:
- [ ] Traced full call chain including dependencies
- [ ] Checked for recursive entry points
- [ ] Verified state ownership (who holds the lock)
- [ ] Confirmed endpoint exclusions exist
- [ ] Tested self-containment under re-entry
- [ ] Applied 5 Whys to timing patterns