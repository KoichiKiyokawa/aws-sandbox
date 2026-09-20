import assert from "node:assert/strict";
import test from "node:test";
import { validateConfig } from "../config.ts";

test("preserves Terraform defaults and boundary validation", () => {
  assert.deepEqual(validateConfig({}), {
    projectName: "tanstack-start-lambda-dsql",
    lambdaMemoryMb: 512,
    deletionProtectionEnabled: true,
  });
  for (const lambdaMemoryMb of [128, 10240]) {
    assert.equal(validateConfig({ lambdaMemoryMb }).lambdaMemoryMb, lambdaMemoryMb);
  }
  assert.equal(validateConfig({ deletionProtectionEnabled: false }).deletionProtectionEnabled, false);
});

test("rejects invalid AWS names and Lambda memory before resource registration", () => {
  for (const projectName of ["ab", "A-test", "1test", "a".repeat(31), "test_name"]) {
    assert.throws(() => validateConfig({ projectName }), /projectName/);
  }
  for (const lambdaMemoryMb of [127, 10241, 512.5, NaN, Infinity]) {
    assert.throws(() => validateConfig({ lambdaMemoryMb }), /lambdaMemoryMb/);
  }
});
