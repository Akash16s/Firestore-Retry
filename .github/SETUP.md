# GitHub Actions Setup

## Required Secrets

To use the deployment workflow, add this secret to your GitHub repository:

1. Go to your repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
    - **Name**: `NPM_TOKEN`
    - **Value**: Your npm authentication token

## Getting NPM Token

1. Login to npm: `npm login`
2. Create an access token:
    ```bash
    npm token create --type=automation
    ```
3. Copy the token and add it to GitHub secrets

## How it works

- **CI Workflow**: Runs on every push/PR to `main` branch
- **Deploy Workflow**: Runs when you create a GitHub release

## Publishing a new version

1. Update version in `package.json`
2. Commit and push changes
3. Create a new release on GitHub
4. The package will automatically be published to npm
