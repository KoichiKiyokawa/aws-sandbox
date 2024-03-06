import { execFile } from "child_process";
import path from "path";

export const handler = async () => {
  // https://github.com/aws-samples/prisma-lambda-cdk/blob/main/backend/migration-runner.ts
  try {
    const exitCode = await new Promise((resolve) => {
      execFile(
        path.resolve("./node_modules/prisma/build/index.js"),
        ["migrate", "deploy"],
        (error, stdout) => {
          console.log(stdout);
          if (error != null) {
            console.log(
              `prisma migrate deploy exited with error ${error.message}`
            );
            resolve(error.code ?? 1);
          } else {
            resolve(0);
          }
        }
      );
    });

    if (exitCode != 0) throw Error(`command failed with exit code ${exitCode}`);
    return {
      statusCode: 200,
      body: "Migration complete",
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
};
