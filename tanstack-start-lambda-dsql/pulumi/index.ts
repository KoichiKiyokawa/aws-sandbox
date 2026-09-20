import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { validateConfig } from "./config.ts";
import { createInfrastructure } from "./resources.ts";

const config = new pulumi.Config();
const region = aws.config.region;
if (!region) throw new Error("Set aws:region in Pulumi config.");
const resources = createInfrastructure(validateConfig({
  projectName: config.get("projectName"),
  lambdaMemoryMb: config.getNumber("lambdaMemoryMb"),
  deletionProtectionEnabled: config.getBoolean("deletionProtectionEnabled"),
}), region);

export const app_url = pulumi.interpolate`https://${resources.cdn.domainName}`;
export const lambda_function_name = resources.app.name;
export const dsql_endpoint = resources.endpoint;
export const dsql_cluster_arn = resources.database.arn;
export const assets_bucket = resources.assets.id;
export const aws_region = region;
