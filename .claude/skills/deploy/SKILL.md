---
name: deploy
description: Deploy the Antigravity website changes to GitHub.
disable-model-invocation: true
---
# Deploy Workflow
This skill automates the deployment of changes to the GitHub repository using the project's native batch script and portable Git environment.

## 1. Environment Check
Ensure `%LOCALAPPDATA%\PortableGit\bin` is available for `git` commands.

## 2. Execute Deployment
Run the following steps:
1. `git add .`
2. `git commit -m "$ARGUMENTS"`
3. `git push origin main`

Alternatively, invoke `deploy.bat` directly if environment variables are pre-configured.

## 3. Verify
Confirm that the push was successful and the GitHub Pages build is triggered.
