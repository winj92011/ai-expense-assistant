# Automatic Publish Flow

This project uses GitHub as the source of truth and Vercel as the deployment target.

## Current flow

1. Codex prepares and reviews a change.
2. Approved changes are written to the GitHub repository.
3. Vercel detects the update on `main` and starts a production deployment.

## Practical rule

- Small verified changes can go directly to `main`.
- Larger or risky changes should use a preview branch first.
- API keys and Feishu secrets stay in Vercel Environment Variables, never in the repository.
