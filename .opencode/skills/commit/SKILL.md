# WorkshopHub Commit

Use this skill only to create a local Git commit for WorkshopHub. Never push.

## Workflow

1. Check the current branch:

   ```sh
   git branch --show-current
   ```

   Refuse immediately if the branch is `main`. Do not stage or commit anything.

2. Inspect the worktree and summarize the proposed change:

   ```sh
   git status --short
   git diff --stat
   git diff --cached --stat
   ```

   Show the user the status and a short diff summary. Review the complete diff as needed to determine which files are relevant.

3. Extract a Trello card number from the branch name. Accept a token matching `WH-[0-9]+` anywhere in the branch name, case-insensitively, and normalize it to uppercase. For example, `feature/WH-2-booking-flow` yields `WH-2`.

   If no card number is present, ask the user for the Trello card number and wait. Do not invent one and do not continue without the user's answer.

4. Propose a conventional commit message containing the card prefix, for example:

   ```text
   WH-2: feat(api): add booking validation
   ```

   Use a conventional type such as `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, or `chore`. Ask the user to confirm the exact message before staging or committing. If they reject it, revise it and ask again.

5. Before staging, inspect the files that would be committed. Refuse to proceed if the relevant changes contain secrets or credentials, including `.env` files, private keys, tokens, passwords, API keys, database credentials, or other sensitive values. Never stage a suspected secret. Ask the user to remove or redact it first.

6. Stage only files relevant to the confirmed change. Prefer explicit paths:

   ```sh
   git add -- path/to/relevant-file
   ```

   Never use `git add -A` or `git add .` when that could include unrelated files. Recheck the staged status and diff, and stop if unrelated files or secrets are present.

7. Create the commit with the confirmed message:

   ```sh
   git commit -m "WH-2: feat(scope): concise description"
   ```

   Never use `--no-verify`. Git hooks must run. If the commit fails, report the failure and do not bypass the hook.

8. After a successful commit, report the commit result and stop. Do not run `git push`, suggest pushing as part of this workflow, or perform any remote operation.

## Non-negotiable safety rules

- Never commit on `main`.
- Never commit secrets or suspected credentials.
- Never use `git commit --no-verify` or otherwise bypass hooks.
- Never commit until the user confirms the exact message.
- Never push.