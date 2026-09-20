import assert from "node:assert/strict";
import test from "node:test";
import { createImportManifest } from "../import-state.mjs";

const types = [
  ["aws_dsql_cluster", "main", { identifier: "cluster123" }],
  ["aws_cloudwatch_log_group", "lambda", { name: "/aws/lambda/test" }],
  ["aws_iam_role", "lambda", { name: "test-lambda" }],
  ["aws_iam_role_policy", "lambda", { role: "test-lambda", name: "logs-and-dsql" }],
  ["aws_lambda_function", "app", { function_name: "test" }],
  ["aws_lambda_function_url", "app", { function_name: "test" }],
  ["aws_lambda_permission", "function_url", { function_name: "test", statement_id: "PublicFunctionUrl" }],
  ["aws_lambda_permission", "invoke_via_url", { function_name: "test", statement_id: "PublicInvokeViaFunctionUrlOnly" }],
  ["aws_s3_bucket", "assets", { id: "test-assets" }],
  ["aws_s3_bucket_public_access_block", "assets", { id: "test-assets" }],
  ["aws_cloudfront_origin_access_control", "assets", { id: "OAC123" }],
  ["aws_cloudfront_distribution", "app", { id: "DIST123" }],
  ["aws_s3_bucket_policy", "assets", { id: "test-assets" }],
];
const state = () => ({ resources: types.map(([type, name, attributes]) => ({ mode: "managed", type, name, instances: [{ attributes }] })) });

test("maps all 13 existing resources, including compound import IDs", () => {
  const { resources } = createImportManifest(state());
  assert.equal(resources.length, 13);
  assert.equal(resources.find(r => r.type === "aws:iam/rolePolicy:RolePolicy").id, "test-lambda:logs-and-dsql");
  assert.deepEqual(resources.filter(r => r.type === "aws:lambda/permission:Permission").map(r => r.id), [
    "test/PublicFunctionUrl", "test/PublicInvokeViaFunctionUrlOnly",
  ]);
  assert.equal(resources.find(r => r.type === "aws:lambda/functionUrl:FunctionUrl").id, "test");
});

test("rejects incomplete, indexed, or unexpected managed resources instead of silently omitting them", () => {
  const missing = state(); missing.resources.pop();
  assert.throws(() => createImportManifest(missing), /missing/i);
  const extra = state(); extra.resources.push({ mode: "managed", type: "aws_s3_bucket", name: "other", instances: [{ attributes: { id: "other" } }] });
  assert.throws(() => createImportManifest(extra), /unsupported/i);
  const indexed = state(); indexed.resources[0].instances[0].index_key = 0;
  assert.throws(() => createImportManifest(indexed), /indexed/i);
  const empty = state(); empty.resources[0].instances[0].attributes.identifier = "";
  assert.throws(() => createImportManifest(empty), /id/i);
});
