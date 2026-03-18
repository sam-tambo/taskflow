## Git Workflow Rules
- After completing each feature, always run these exact commands:
  git stash -u 2>/dev/null || true
  git pull origin master
  git stash pop 2>/dev/null || true
  git add -A
  git commit -m "feat: [describe what was built]"
  git push origin master
- Never create branches, never open PRs
- If git pull has conflicts, prefer the local version