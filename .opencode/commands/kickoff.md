# WorkshopHub Kickoff

Use this command to start work on a WorkshopHub Trello card. Do not implement code as part of kickoff.

## Workflow

1. Identify the Trello card.

   - If the user supplied a Trello card ID or URL, use it.
   - Otherwise, use `Question` to ask for the Trello card ID or URL and wait for the answer.
   - Use `trelloReadCard` to read the card title, description, checklist, labels, and current list/column.
   - If the card cannot be read, report the error and stop.

2. Resolve missing requirements.

   - Review the card content for acceptance criteria, scope, dependencies, and ambiguities.
   - Use `Question` to ask only the clarifying questions needed to create an actionable story. Wait for the answers before continuing.
   - Incorporate the answers into the story content.

3. Update the Trello card status.

   - If the card is not already in the `In Progress` column, use the transition tool to move it to `In Progress`.
   - If the card is already in `In Progress`, do not transition it. Instead, use `trelloWriteCard` to leave a comment recording that kickoff was attempted while the card was already in `In Progress`.
   - If the transition or comment fails, report the failure and stop before creating the branch.

4. Save the story.

   - Create the `./stories` directory if it does not exist.
   - Save a Markdown story at `./stories/wh-{id}-{desc}.md`, where `{id}` is the Trello card identifier and `{desc}` is a short lowercase kebab-case description derived from the card title.
   - Include the card ID and title, problem or goal, scope, acceptance criteria, dependencies, assumptions, and any answers provided through `Question`.
   - Do not overwrite an existing story file without using `Question` to confirm the replacement.
   - If the story cannot be written, report the error and stop before creating the branch.

5. Create and check out the work branch:

   ```sh
   git switch -c wh-{id}-{desc}
   ```

   Use the same sanitized `{id}` and `{desc}` in the filename and branch name. If the branch already exists, use `Question` to confirm whether to check it out instead; never delete or reset an existing branch.

6. Confirm the final branch name to the user, then stop immediately. Do not implement the story, commit changes, push, or perform any additional work after branch confirmation.

## Safety rules

- Always read the card with `trelloReadCard` before changing its status or writing the story.
- Always use `Question` for missing card identification, required clarifications, and confirmation before replacing an existing story or checking out an existing branch.
- Treat `In Progress` as the exact target column name.
- Do not silently invent requirements, card IDs, branch names, or acceptance criteria.
- Keep the story and branch description short, lowercase, and kebab-case; preserve the card's original title inside the story.
- Do not commit, push, reset, delete branches, or modify unrelated files during kickoff.
