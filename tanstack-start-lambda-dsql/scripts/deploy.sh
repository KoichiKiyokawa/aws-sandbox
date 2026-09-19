#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
region=$(terraform -chdir=terraform output -raw aws_region)
bucket=$(terraform -chdir=terraform output -raw assets_bucket)
function_name=$(terraform -chdir=terraform output -raw lambda_function_name)
(cd app && pnpm install --frozen-lockfile && pnpm build:lambda && pnpm test:lambda)
# Upload first and retain old hashed assets for pages open during deployment.
aws s3 sync app/.output/public/assets/ "s3://$bucket/assets/" --region "$region" --cache-control 'public,max-age=31536000,immutable'
archive=$(mktemp -d)
trap 'rm -rf "$archive"' EXIT
(cd app/.output/server && zip -qr "$archive/lambda.zip" .)
aws lambda update-function-code --region "$region" --function-name "$function_name" --zip-file "fileb://$archive/lambda.zip" > /dev/null
aws lambda wait function-updated-v2 --region "$region" --function-name "$function_name"
terraform -chdir=terraform output -raw app_url
