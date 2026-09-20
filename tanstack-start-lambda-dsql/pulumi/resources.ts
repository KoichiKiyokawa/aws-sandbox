import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { uploadAssets } from "./assets.ts";
import type { InfrastructureConfig } from "./config.ts";

export function createInfrastructure(config: InfrastructureConfig, region: string, outputDirectory = "../app/.output") {
  const { projectName, lambdaMemoryMb, deletionProtectionEnabled } = config;
  const tags = { Project: projectName, ManagedBy: "Pulumi" };
  const database = new aws.dsql.Cluster("main", {
    deletionProtectionEnabled,
    tags: { ...tags, Name: projectName },
  });
  const endpoint = pulumi.interpolate`${database.identifier}.dsql.${region}.on.aws`;
  const logs = new aws.cloudwatch.LogGroup("lambda", {
    name: `/aws/lambda/${projectName}`, retentionInDays: 14, tags,
  });
  const role = new aws.iam.Role("lambda", {
    name: `${projectName}-lambda`, tags,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: "sts:AssumeRole", Principal: { Service: "lambda.amazonaws.com" } }],
    }),
  });
  const policy = new aws.iam.RolePolicy("lambda", {
    name: "logs-and-dsql", role: role.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        { Sid: "WriteApplicationLogs", Effect: "Allow", Action: ["logs:CreateLogStream", "logs:PutLogEvents"], Resource: pulumi.interpolate`${logs.arn}:*` },
        { Sid: "ConnectToSandboxDatabase", Effect: "Allow", Action: ["dsql:DbConnectAdmin"], Resource: database.arn },
      ],
    }),
  });
  const assets = new aws.s3.Bucket("assets", { bucketPrefix: `${projectName}-`, tags });
  const assetFiles = uploadAssets(assets, outputDirectory);
  const app = new aws.lambda.Function("app", {
    name: projectName,
    description: "TanStack Start sandbox with Aurora DSQL connection settings",
    role: role.arn,
    runtime: "nodejs22.x",
    architectures: ["arm64"],
    handler: "index.handler",
    code: new pulumi.asset.FileArchive(`${outputDirectory}/server`),
    memorySize: lambdaMemoryMb,
    timeout: 30,
    environment: { variables: {
      NODE_ENV: "production", PGHOST: endpoint, PGPORT: "5432",
      PGDATABASE: "postgres", PGUSER: "admin", PGSSLMODE: "verify-full", DSQL_REGION: region,
    } },
    loggingConfig: { logFormat: "JSON", logGroup: logs.name },
    tags,
  }, {
    // Publish every new static asset before switching the SSR/API code.
    dependsOn: [policy, ...assetFiles],
  });
  const url = new aws.lambda.FunctionUrl("app", {
    functionName: app.name, authorizationType: "NONE", invokeMode: "BUFFERED",
  });
  const urlPermission = new aws.lambda.Permission("function_url", {
    statementId: "PublicFunctionUrl", action: "lambda:InvokeFunctionUrl",
    function: app.name, principal: "*", functionUrlAuthType: url.authorizationType,
  });
  const invokePermission = new aws.lambda.Permission("invoke_via_url", {
    statementId: "PublicInvokeViaFunctionUrlOnly", action: "lambda:InvokeFunction",
    function: app.name, principal: "*", invokedViaFunctionUrl: true,
  }, { dependsOn: [url] });

  const publicAccess = new aws.s3.BucketPublicAccessBlock("assets", {
    bucket: assets.id, blockPublicAcls: true, blockPublicPolicy: true,
    ignorePublicAcls: true, restrictPublicBuckets: true,
  });
  const oac = new aws.cloudfront.OriginAccessControl("assets", {
    name: `${projectName}-assets`, originAccessControlOriginType: "s3",
    signingBehavior: "always", signingProtocol: "sigv4",
  });
  const cdn = new aws.cloudfront.Distribution("app", {
    enabled: true, isIpv6Enabled: true, comment: projectName, tags,
    origins: [
      { originId: "assets", domainName: assets.bucketRegionalDomainName, originAccessControlId: oac.id },
      {
        originId: "lambda", domainName: url.functionUrl.apply(value => new URL(value).hostname),
        customOriginConfig: { httpPort: 80, httpsPort: 443, originProtocolPolicy: "https-only", originSslProtocols: ["TLSv1.2"] },
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: "lambda", viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
      cachedMethods: ["GET", "HEAD"], compress: true,
      // Managed-CachingDisabled / Managed-AllViewerExceptHostHeader.
      cachePolicyId: "413f160a-8c7d-4f44-9df3-4b5a84be39ad",
      originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    },
    orderedCacheBehaviors: [{
      pathPattern: "/assets/*", targetOriginId: "assets", viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"], cachedMethods: ["GET", "HEAD"], compress: true,
      // Managed-CachingOptimized; only Vite content-hashed files.
      cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    }],
    restrictions: { geoRestriction: { restrictionType: "none" } },
    viewerCertificate: { cloudfrontDefaultCertificate: true },
  });
  const bucketPolicy = new aws.s3.BucketPolicy("assets", {
    bucket: assets.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow", Principal: { Service: "cloudfront.amazonaws.com" }, Action: "s3:GetObject",
        Resource: pulumi.interpolate`${assets.arn}/assets/*`,
        Condition: { StringEquals: { "AWS:SourceArn": cdn.arn } },
      }],
    }),
  });
  return { database, endpoint, logs, role, policy, app, url, urlPermission, invokePermission, assets, assetFiles, publicAccess, oac, cdn, bucketPolicy };
}
