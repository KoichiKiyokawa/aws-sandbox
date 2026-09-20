import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Input: terraform state pull (raw state v4), not terraform show -json.
// Names match resources.ts. This only generates a manifest; it never changes either state.
const mappings = {
  "aws_dsql_cluster.main": ["aws:dsql/cluster:Cluster", "main", a => a.id],
  "aws_cloudwatch_log_group.lambda": ["aws:cloudwatch/logGroup:LogGroup", "lambda", a => a.name],
  "aws_iam_role.lambda": ["aws:iam/role:Role", "lambda", a => a.name],
  "aws_iam_role_policy.lambda": ["aws:iam/rolePolicy:RolePolicy", "lambda", a => a.role && a.name && `${a.role}:${a.name}`],
  "aws_lambda_function.app": ["aws:lambda/function:Function", "app", a => a.function_name],
  "aws_lambda_function_url.app": ["aws:lambda/functionUrl:FunctionUrl", "app", a => a.function_name],
  "aws_lambda_permission.function_url": ["aws:lambda/permission:Permission", "function_url", a => a.function_name && a.statement_id && `${a.function_name}/${a.statement_id}`],
  "aws_lambda_permission.invoke_via_url": ["aws:lambda/permission:Permission", "invoke_via_url", a => a.function_name && a.statement_id && `${a.function_name}/${a.statement_id}`],
  "aws_s3_bucket.assets": ["aws:s3/bucket:Bucket", "assets", a => a.id],
  "aws_s3_bucket_public_access_block.assets": ["aws:s3/bucketPublicAccessBlock:BucketPublicAccessBlock", "assets", a => a.id],
  "aws_cloudfront_origin_access_control.assets": ["aws:cloudfront/originAccessControl:OriginAccessControl", "assets", a => a.id],
  "aws_cloudfront_distribution.app": ["aws:cloudfront/distribution:Distribution", "app", a => a.id],
  "aws_s3_bucket_policy.assets": ["aws:s3/bucketPolicy:BucketPolicy", "assets", a => a.id],
};

export function createImportManifest(state) {
  if (!Array.isArray(state.resources)) throw new Error("Expected raw Terraform state with resources.");
  const found = new Map();
  for (const resource of state.resources.filter(r => r.mode === "managed")) {
    const address = `${resource.type}.${resource.name}`;
    const mapping = mappings[address];
    if (!mapping || resource.module || found.has(address)) throw new Error(`Unsupported resource: ${address}`);
    const instances = resource.instances ?? [];
    if (instances.length !== 1 || instances[0].index_key !== undefined || instances[0].deposed) {
      throw new Error(`Unsupported indexed or deposed resource: ${address}`);
    }
    const [type, name, getId] = mapping;
    const id = getId(instances[0].attributes ?? {});
    if (typeof id !== "string" || !id) throw new Error(`Missing import ID: ${address}`);
    found.set(address, { type, name, id });
  }
  for (const address of Object.keys(mappings)) {
    if (!found.has(address)) throw new Error(`Missing resource: ${address}`);
  }
  return { resources: Object.keys(mappings).map(address => found.get(address)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error("Usage: node import-state.mjs /path/to/terraform-state.json");
  console.log(JSON.stringify(createImportManifest(JSON.parse(readFileSync(process.argv[2], "utf8"))), null, 2));
}
