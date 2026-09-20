# CloudFront + S3 + Lambda + Aurora DSQL

`resources.ts` defines the AWS resources in TypeScript; `assets.ts` publishes the Vite assets.
Operational commands live in the parent `mise.toml`, not package.json scripts.

- `/assets/*`: private S3 through CloudFront OAC, with immutable caching.
- Other paths: public Lambda Function URL; SSR/API caching is disabled and the managed AllViewerExceptHostHeader policy forwards cookies, query strings and authorization headers.
- Lambda: Node.js 22, arm64, 512 MiB by default, 30-second timeout, JSON logs retained for 14 days.
- DSQL: a single-region cluster with deletion protection enabled by default. IAM allows `DbConnectAdmin` only on that cluster. The application authenticates with IAM tokens and verifies TLS.
- Pulumi manages both infrastructure and application releases. New asset uploads are dependencies of the Lambda update. Assets removed from a later build remain in S3 via `retainOnDelete`, so already-open pages can continue loading their old content hashes.

The Function URL remains directly accessible, as before. Application authentication is not implemented.

## New environment

Run from `tanstack-start-lambda-dsql/`. Prerequisites: mise, Bash and AWS credentials.
Node, pnpm, Pulumi CLI and AWS CLI versions are pinned in `mise.toml`.

```sh
mise trust
mise install
mise run infra:install
mise exec -- pulumi -C pulumi login --local
mise exec -- pulumi -C pulumi stack init dev --secrets-provider passphrase
mise run app:deploy
```

Local login stores state under `~/.pulumi`; retain that directory and the stack passphrase.
For shared operation, select a shared S3 or Pulumi Cloud backend instead of `--local`.
`app:deploy` installs the locked dependencies, builds and tests the Lambda handler, then runs an interactive `pulumi up --refresh`. Preview and approval remain visible. It does not automatically approve AWS changes.

After deployment, initialize the database once:

```sh
DSQL_HOST=$(mise exec -- pulumi -C pulumi stack output dsql_endpoint) mise run db:setup
mise exec -- pulumi -C pulumi stack output app_url
```

`db:setup` creates the initial tables; it is not a schema migration runner.
For a non-default region also set `AWS_REGION` to the stack's `aws:region` when running `db:setup`.

## Configuration

Set values with `mise exec -- pulumi -C pulumi config set KEY VALUE`.

| Key | Default | Constraint |
| --- | --- | --- |
| `aws:region` | `ap-northeast-1` | Same region as Lambda and the single-region DSQL cluster |
| `projectName` | `tanstack-start-lambda-dsql` | 3–30 lowercase letters, digits or hyphens, starting with a letter |
| `lambdaMemoryMb` | `512` | Integer, 128–10240 |
| `deletionProtectionEnabled` | `true` | Boolean |

Stack configuration files are ignored because they are environment-specific. Preserve them with the state.
Explicit Lambda, IAM and log-group names preserve existing physical names. Use a different `projectName` for a second stack in the same account/region.

## Existing Terraform environment

Do not use the new-environment deployment command before importing an existing environment.
This migration changes ownership without intentionally recreating the 13 existing AWS resources.

1. **Before switching to this branch**, stop Terraform/app deployments and export the original state from the old checkout. Keep the old checkout, `.terraform.lock.hcl`, state and `.tfvars` until the migration is complete. From the project directory:

   ```sh
   mise exec -- terraform -chdir=terraform state pull > terraform-state.json
   ```

2. Switch to this branch, install the tools/dependencies, and initialize an empty Pulumi stack/backend as above, **without running app:deploy**. Copy the exported state to `pulumi/terraform-state.json` (ignored by Git).

3. Set the four configuration values to match the existing Terraform variables: `aws_region` → `aws:region`, `project_name` → `projectName`, `lambda_memory_mb` → `lambdaMemoryMb`, and `deletion_protection_enabled` → `deletionProtectionEnabled`. Preserve custom values rather than assuming defaults.

4. Generate and import the exact resource IDs:

   ```sh
   mise exec -- node pulumi/import-state.mjs pulumi/terraform-state.json > pulumi/import.json
   mise exec -- pulumi -C pulumi import --file import.json --generate-code=false --protect=false
   mise run app:build
   mise run infra:preview
   ```

   The manifest generator accepts this project's raw `terraform state pull` format only. It rejects missing, additional, indexed or module-scoped managed resources. It reads but does not modify Terraform state. IAM role policies and Lambda permissions use their required compound import IDs.

5. Review the preview. Expected changes are `ManagedBy=Pulumi` tags, asset-object registrations/uploads and deployment of the newly built Lambda code. Existing DSQL/S3/CloudFront/Lambda resources must not be replaced or deleted. Import may expose provider-default differences; reconcile those with the existing environment before applying.

6. Run `mise run infra:up` to apply that build. Verify the CloudFront app and DSQL access. Archive the old Terraform state/configuration and retire its apply/deploy jobs; do not run Terraform destroy or apply after transferring ownership.

The initial Pulumi deployment deliberately publishes the local build: Lambda code is no longer ignored. Existing S3 files that predate Pulumi remain untouched. After import, reverting Git alone does not transfer ownership back; any rollback to Terraform must first reconcile state with current AWS resources.

## Updates and verification

```sh
mise run app:deploy
```

For separate preview/apply, run `app:build`, `infra:preview`, then `infra:up` without rebuilding between preview and apply. Both infrastructure commands use the build currently in `app/.output`; do not run a Node-server build or another Lambda build concurrently. Pulumi computes archive/asset changes; there is no separate `aws lambda update-function-code`, ZIP shell script or code-ignore rule.

The outputs retain their previous names: `app_url`, `lambda_function_name`, `dsql_endpoint`, `dsql_cluster_arn`, `assets_bucket`, `aws_region`.
Only content-hashed files below `.output/public/assets/` are uploaded. Add explicit CloudFront routing and upload handling before introducing other public paths. SSR is uncached, so ordinary deployments do not require invalidation.

```sh
mise run infra:install
mise run infra:check
```

The check runs TypeScript and Node tests with Pulumi SDK mocks, without AWS credentials or a Pulumi login. Tests cover routing, IAM scope, DSQL configuration, asset ordering/metadata, config validation and import IDs. CI also builds and invokes the actual Lambda handler; the existing Node/database/browser tests remain enabled.
Mocks do not validate AWS provider import behavior or a real AWS preview/deployment. Those remain deployment-time checks.

## Removal

Set `deletionProtectionEnabled` to `false` and apply it before destroying the stack.
Because old assets are intentionally retained, empty the S3 bucket manually before `pulumi destroy`:

```sh
mise exec -- pulumi -C pulumi config set deletionProtectionEnabled false
mise run infra:up
bucket=$(mise exec -- pulumi -C pulumi stack output assets_bucket)
mise exec -- aws s3 rm "s3://$bucket" --recursive
mise exec -- pulumi -C pulumi destroy
```

The retained-file policy applies to stack destruction as well as ordinary updates. No automatic expiration is configured; old files continue using S3 storage until explicitly removed.
