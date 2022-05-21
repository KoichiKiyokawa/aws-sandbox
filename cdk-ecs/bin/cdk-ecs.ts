#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkEcsStack } from '../lib/cdk-ecs-stack';



const app = new cdk.App()

const stage: string = app.node.tryGetContext('stage')
if (!stage.match(/^(stg|prd)$/)) {
console.warn('Invalid context. stage must be stg or prd.')
process.exit(1)
}
let tagOrDigest: string | undefined
const tag: string = app.node.tryGetContext('tag')
if (tag) {
tagOrDigest = `:${tag}`
}
const digest: string = app.node.tryGetContext('digest')
if (!tag && digest) {
tagOrDigest = `@${digest}`
}
if (!tagOrDigest) {
console.warn('Invalid context. tag or digest must be required.')
process.exit(1)
}

const env = app.node.tryGetContext(stage)
console.log({ stage, env, tagOrDigest })

new ServiceStack(app, 'ServiceStack', {
stackName: 'ServiceStack',
env,
cpu: 512,
memory: 1024,
tagOrDigest
})