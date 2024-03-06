import type { SSTConfig } from "sst";
import { Function, RDS, RemixSite, Script } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "sst-sandbox",
      region: "ap-northeast-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const rds = new RDS(stack, "db", {
        engine: "postgresql13.9",
        defaultDatabaseName: "remixSstRds",
        scaling: { minCapacity: "ACU_2", maxCapacity: "ACU_4" },
      });

      const { secret } = rds.cdk.cluster;
      const dbUsername = secret?.secretValueFromJson("username");
      const dbPassword = secret?.secretValueFromJson("password");
      const dbHost = secret?.secretValueFromJson("host");
      const dbPort = secret?.secretValueFromJson("port");
      const dbName = secret?.secretValueFromJson("dbname");

      const DATABASE_URL = `postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

      const PRISMA_SCHEMA_FILE_PATH = "prisma/schema.prisma";
      const PRISMA_BINARY_FILE_PATH =
        "node_modules/prisma/libquery_engine-linux-arm64-openssl-1.0.x.so.node";

      const site = new RemixSite(stack, "site", {
        bind: [rds],
        cdk: {
          // https://dev.classmethod.jp/articles/aws-cdk-nodejsfunction-prisma-deploy/
          server: {
            copyFiles: [
              { from: PRISMA_SCHEMA_FILE_PATH },
              { from: PRISMA_BINARY_FILE_PATH },
            ],
          },
        },
        nodejs: {
          install: ["@prisma/client"],
        },
        environment: {
          DATABASE_URL,
        },
      });
      stack.addOutputs({
        url: site.url,
      });

      const migrationFunc = new Function(stack, "migrate", {
        runtime: "container",
        handler: "functions/migrate",
        environment: {
          DATABASE_URL,
        },
        bind: [rds],
        timeout: "120 seconds",
      });
      rds.cdk.cluster.grantDataApiAccess(migrationFunc);

      new Script(stack, "migration", {
        onCreate: migrationFunc,
        onUpdate: migrationFunc,
      });
    });
  },
} satisfies SSTConfig;
