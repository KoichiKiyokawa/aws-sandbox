import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as pulumi from "@pulumi/pulumi";

const registered: pulumi.runtime.MockResourceArgs[] = [];
pulumi.runtime.setMocks({
  newResource(args) {
    registered.push(args);
    const state = { ...args.inputs };
    state.arn = `arn:aws:mock:ap-northeast-1:123456789012:${args.type}/${args.name}`;
    if (args.type === "aws:dsql/cluster:Cluster") state.identifier = "test-cluster";
    if (args.type === "aws:lambda/functionUrl:FunctionUrl") state.functionUrl = "https://test.lambda-url.ap-northeast-1.on.aws/";
    if (args.type === "aws:s3/bucket:Bucket") state.bucketRegionalDomainName = "test-assets.s3.ap-northeast-1.amazonaws.com";
    if (args.type === "aws:cloudfront/distribution:Distribution") state.domainName = "test.cloudfront.net";
    return { id: `${args.name}-id`, state };
  },
  call(args) { return args.inputs; },
}, "tanstack-start-lambda-dsql", "test", false);

const outputDirectory = mkdtempSync(join(tmpdir(), "pulumi-test-"));
mkdirSync(join(outputDirectory, "public/assets/nested"), { recursive: true });
mkdirSync(join(outputDirectory, "server"));
writeFileSync(join(outputDirectory, "public/assets/main-abc.js"), "export {};");
writeFileSync(join(outputDirectory, "public/assets/nested/style-def.css"), "body {}");
writeFileSync(join(outputDirectory, "server/index.mjs"), "export const handler = () => {};");
after(() => rmSync(outputDirectory, { recursive: true, force: true }));
const { createInfrastructure } = await import("../resources.ts");
const resources = createInfrastructure({
  projectName: "test-app", lambdaMemoryMb: 512, deletionProtectionEnabled: true,
}, "ap-northeast-1", outputDirectory);
const resolve = <T>(value: pulumi.Output<T>) => new Promise<T>(done => { value.apply(result => { done(result); }); });
// Await every registration, including resources that are not stack outputs.
await Promise.all(Object.values(resources).flat().filter(value => value instanceof pulumi.Resource).map(value => resolve(value.urn)));
const input = (type: string, name?: string) => {
  const resource = registered.find(r => r.type === type && (!name || r.name === name));
  assert.ok(resource, `Missing ${type} ${name ?? ""}`);
  return resource.inputs;
};

test("separates dynamic and immutable asset routes without caching SSR/API responses", () => {
  const cdn = input("aws:cloudfront/distribution:Distribution");
  assert.equal(cdn.defaultCacheBehavior.targetOriginId, "lambda");
  assert.equal(cdn.defaultCacheBehavior.cachePolicyId, "413f160a-8c7d-4f44-9df3-4b5a84be39ad");
  assert.equal(cdn.defaultCacheBehavior.originRequestPolicyId, "b689b0a8-53d0-40ab-baf2-68738e2966ac");
  assert.deepEqual(cdn.defaultCacheBehavior.allowedMethods, ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]);
  assert.equal(cdn.orderedCacheBehaviors[0].pathPattern, "/assets/*");
  assert.equal(cdn.orderedCacheBehaviors[0].targetOriginId, "assets");
  assert.equal(cdn.orderedCacheBehaviors[0].cachePolicyId, "658327ea-f89d-4fab-a63d-7e88639e58f6");
  assert.equal(cdn.origins[1].domainName, "test.lambda-url.ap-northeast-1.on.aws");
});

test("restricts S3 reads to this distribution and asset prefix", async () => {
  const block = input("aws:s3/bucketPublicAccessBlock:BucketPublicAccessBlock");
  for (const key of ["blockPublicAcls", "blockPublicPolicy", "ignorePublicAcls", "restrictPublicBuckets"]) assert.equal(block[key], true);
  const policy = JSON.parse(input("aws:s3/bucketPolicy:BucketPolicy").policy).Statement[0];
  assert.deepEqual(policy.Principal, { Service: "cloudfront.amazonaws.com" });
  assert.equal(policy.Resource, `${await resolve(resources.assets.arn)}/assets/*`);
  assert.equal(policy.Condition.StringEquals["AWS:SourceArn"], await resolve(resources.cdn.arn));
});

test("preserves Lambda runtime, DSQL endpoint and narrowly scoped IAM permissions", async () => {
  const app = input("aws:lambda/function:Function");
  assert.equal(app.name, "test-app");
  assert.equal(app.runtime, "nodejs22.x");
  assert.deepEqual(app.architectures, ["arm64"]);
  assert.equal(app.handler, "index.handler");
  assert.equal(app.environment.variables.PGHOST, "test-cluster.dsql.ap-northeast-1.on.aws");
  assert.equal(app.environment.variables.PGSSLMODE, "verify-full");
  assert.equal(app.environment.variables.DSQL_REGION, "ap-northeast-1");
  assert.equal(input("aws:dsql/cluster:Cluster").deletionProtectionEnabled, true);
  assert.equal(input("aws:cloudwatch/logGroup:LogGroup").retentionInDays, 14);
  const statements = JSON.parse(input("aws:iam/rolePolicy:RolePolicy").policy).Statement;
  assert.deepEqual(statements[1].Action, ["dsql:DbConnectAdmin"]);
  assert.equal(statements[1].Resource, await resolve(resources.database.arn));
  assert.deepEqual(statements[0].Action, ["logs:CreateLogStream", "logs:PutLogEvents"]);
  assert.equal(statements[0].Resource, `${await resolve(resources.logs.arn)}:*`);
});

test("allows public Function URL invocation without granting direct InvokeFunction", () => {
  assert.equal(input("aws:lambda/functionUrl:FunctionUrl").authorizationType, "NONE");
  const url = input("aws:lambda/permission:Permission", "function_url");
  assert.equal(url.action, "lambda:InvokeFunctionUrl");
  assert.equal(url.functionUrlAuthType, "NONE");
  const invoke = input("aws:lambda/permission:Permission", "invoke_via_url");
  assert.equal(invoke.action, "lambda:InvokeFunction");
  assert.equal(invoke.invokedViaFunctionUrl, true);
});

test("uploads nested assets with MIME/cache metadata before registering Lambda", () => {
  const objects = registered.filter(r => r.type === "aws:s3/bucketObjectv2:BucketObjectv2");
  assert.deepEqual(objects.map(r => r.inputs.key).sort(), ["assets/main-abc.js", "assets/nested/style-def.css"]);
  assert.equal(objects.find(r => r.inputs.key.endsWith(".js"))!.inputs.contentType, "text/javascript");
  assert.equal(objects.find(r => r.inputs.key.endsWith(".css"))!.inputs.contentType, "text/css");
  const lambdaIndex = registered.findIndex(r => r.type === "aws:lambda/function:Function");
  for (const object of objects) {
    assert.equal(object.inputs.cacheControl, "public,max-age=31536000,immutable");
    assert.ok(registered.indexOf(object) < lambdaIndex);
  }
});
