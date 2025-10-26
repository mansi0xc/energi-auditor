// Test script for ChainGPT integration
// Run with: npx tsx test-chaingpt.ts

import dotenv from 'dotenv';
import * as auditInit from './functions/auditInit.js';

// Load environment variables from .env.local and .env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testChainGPTAudit() {
  // Sample smart contract code (the same as in the user's example)
  const contractCode = `pragma solidity ^0.8.0;
contract Counter {
    uint256 private count;
    event CountChanged(uint256 newCount);
    constructor() {
        count = 0;
    }
    function increment() public {
        count += 1;
        emit CountChanged(count);
    }
}`;

  console.log('Testing ChainGPT Smart Contract Audit...\n');
  console.log('Contract Code:');
  console.log('='.repeat(50));
  console.log(contractCode);
  console.log('='.repeat(50));
  console.log();

  try {
    // Environment variables are loaded from .env.local and .env files above
    // Make sure CHAINGPT_API_KEY is set in your .env.local file
    const report = await auditInit.auditSmartContract(contractCode, 'TestCounter');

    console.log('Audit Results:');
    console.log('='.repeat(50));
    console.log(auditInit.formatAuditReport(report));

  } catch (error) {
    console.error('Audit failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'code' in error) {
      console.error('Error code:', (error as any).code);
    }
  }
}

// Run the test
testChainGPTAudit();
