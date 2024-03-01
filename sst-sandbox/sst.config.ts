import type { SSTConfig } from "sst";
import { RDS, RemixSite } from "sst/constructs";

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

      const site = new RemixSite(stack, "site", {
        bind: [rds],
        cdk: {
          // https://dev.classmethod.jp/articles/aws-cdk-nodejsfunction-prisma-deploy/
          server: {
            copyFiles: [
              { from: "prisma/schema.prisma" },
              {
                from: "node_modules/prisma/libquery_engine-linux-arm64-openssl-1.0.x.so.node",
              },
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
    });
  },
} satisfies SSTConfig;
