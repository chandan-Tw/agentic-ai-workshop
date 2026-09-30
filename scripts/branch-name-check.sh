#!/bin/bash
# Sensor: Enforce wh-*-** naming convention for work branches

set -e

CURRENT_BRANCH=$(git branch --show-current)

# Allow main/master/develop branches
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" || "$CURRENT_BRANCH" == "develop" ]]; then
  echo "✅ BRANCH-NAME-CHECK: On protected branch: $CURRENT_BRANCH"
  exit 0
fi

# Check wh-{id}-{desc} pattern
if [[ "$CURRENT_BRANCH" =~ ^wh-[0-9]+-[a-z0-9-]+$ ]]; then
  echo "✅ BRANCH-NAME-CHECK: Branch name follows convention: $CURRENT_BRANCH"
  exit 0
fi

echo "❌ BRANCH-NAME-CHECK: Branch name does not follow wh-{id}-{desc} convention"
echo "   Current branch: $CURRENT_BRANCH"
echo "   Expected pattern: wh-2-employee-can-register-for-an-available-training-session"
exit 1
