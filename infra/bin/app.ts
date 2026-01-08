#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SatelliteTrackerStack } from '../lib/satellite-tracker-stack';

const app = new cdk.App();
new SatelliteTrackerStack(app, 'SatelliteTrackerStack');