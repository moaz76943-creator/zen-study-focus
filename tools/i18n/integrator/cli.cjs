#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {run}=require('./index.cjs');
const usage='Usage: node tools/i18n/integrator/cli.cjs [--check]';
try{
  if(process.argv.slice(2).some(arg=>!['--check'].includes(arg)))throw Error(usage);
  const result=run({root:path.resolve(__dirname,'../../..'),check:process.argv.includes('--check')});
  console.log('DF99_INTEGRATOR_OK '+JSON.stringify(result));
}catch(error){console.error('DF99_INTEGRATOR_FAIL '+error.message);process.exitCode=1;}
