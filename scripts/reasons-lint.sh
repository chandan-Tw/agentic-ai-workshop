#!/bin/bash
# Sensor: Enforce REASONS canvas structure exists in prompt files
# Checks that all 7 REASONS sections are present and non-empty

set -e

PROMPT_DIR="spdd/prompt"
REQUIRED_SECTIONS=("Requirements" "Entities" "Approach" "Structure" "Operations" "Norms" "Safeguards")

if [ ! -d "$PROMPT_DIR" ]; then
  echo "❌ REASONS-LINT: spdd/prompt/ directory not found"
  exit 1
fi

FAILED=0

for file in "$PROMPT_DIR"/*.md; do
  if [ ! -f "$file" ]; then
    continue
  fi

  filename=$(basename "$file")
  echo "Checking $filename..."

  for section in "${REQUIRED_SECTIONS[@]}"; do
    # Check if section header exists
    if ! grep -q "^## $section" "$file"; then
      echo "❌ REASONS-LINT: $filename missing section: $section"
      FAILED=1
      continue
    fi

    # Check if section has content (at least one non-empty line after header)
    content=$(awk "/^## $section/{found=1; next} found && /^## /{exit} found && NF>0{print}" "$file")
    if [ -z "$content" ]; then
      echo "❌ REASONS-LINT: $filename section $section is empty"
      FAILED=1
    fi
  done
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "❌ REASONS-LINT: Some prompt files have incomplete REASONS structure"
  exit 1
fi

echo "✅ REASONS-LINT: All prompt files have complete REASONS structure"
