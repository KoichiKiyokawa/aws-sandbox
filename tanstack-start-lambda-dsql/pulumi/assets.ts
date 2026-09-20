import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import mime from "mime";

export function uploadAssets(bucket: aws.s3.Bucket, outputDirectory: string) {
  const directory = join(outputDirectory, "public", "assets");
  // Missing build output is an error; never silently deploy an incomplete app.
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter(file => statSync(join(directory, file)).isFile())
    .sort()
    .map(file => {
      const key = `assets/${file.replaceAll("\\", "/")}`;
      return new aws.s3.BucketObjectv2(key, {
        bucket: bucket.id,
        key,
        source: new pulumi.asset.FileAsset(join(directory, file)),
        contentType: mime.getType(file) ?? "application/octet-stream",
        cacheControl: "public,max-age=31536000,immutable",
      }, {
        // Old pages still reference old content hashes after a new release.
        // Removed assets leave Pulumi state but remain in S3, including on destroy.
        retainOnDelete: true,
      });
    });
}
