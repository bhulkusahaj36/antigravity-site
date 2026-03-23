---
name: revert
description: Revert the last N commits or a specific commit on the main branch.
disable-model-invocation: true
---
# Revert Workflow
This skill allows for safe undo of mistakes or features the user decided to revert.

## 1. Safety Check
Verify the target commit or depth (e.g., HEAD~1).

## 2. Execute Revert
1. `git reset --hard HEAD~$ARGUMENTS`
2. `git push origin main --force`

## 3. Post-Revert Clean Up
Ensure the local workspace is consistent with the reverted state.
