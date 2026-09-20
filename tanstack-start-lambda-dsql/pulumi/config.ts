export interface InfrastructureConfig {
  projectName: string;
  lambdaMemoryMb: number;
  deletionProtectionEnabled: boolean;
}

export function validateConfig(input: Partial<InfrastructureConfig>): InfrastructureConfig {
  const config = {
    projectName: input.projectName ?? "tanstack-start-lambda-dsql",
    lambdaMemoryMb: input.lambdaMemoryMb ?? 512,
    deletionProtectionEnabled: input.deletionProtectionEnabled ?? true,
  };
  if (!/^[a-z][a-z0-9-]{2,29}$/.test(config.projectName)) {
    throw new Error("projectName must be 3–30 lowercase letters, digits or hyphens, starting with a letter.");
  }
  if (!Number.isInteger(config.lambdaMemoryMb) || config.lambdaMemoryMb < 128 || config.lambdaMemoryMb > 10240) {
    throw new Error("lambdaMemoryMb must be an integer between 128 and 10240.");
  }
  return config;
}
