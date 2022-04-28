#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkDynamicRenderingStack } from '../lib/cdk-dynamic-rendering-stack';

const app = new cdk.App();
new CdkDynamicRenderingStack(app, 'CdkDynamicRenderingStack');
