// Simple test script that doesn't require API key
// Tests the validation and utility functions

import * as auditInit from './functions/auditInit.js';

function testValidation() {
  console.log('Testing validation functions...\n');

  // Test contract code validation
  try {
    auditInit.validateContractCode('pragma solidity ^0.8.0; contract Test {}');
    console.log('✅ Valid contract code passed validation');
  } catch (error) {
    console.log('❌ Valid contract code failed validation:', error instanceof Error ? error.message : String(error));
  }

  // Test empty contract code
  try {
    auditInit.validateContractCode('');
    console.log('❌ Empty contract code should have failed');
  } catch (error) {
    console.log('✅ Empty contract code properly rejected:', error instanceof Error ? error.message : String(error));
  }

  // Test oversized contract code
  try {
    const largeCode = 'contract Test {}'.repeat(10000); // Create large code
    auditInit.validateContractCode(largeCode);
    console.log('❌ Oversized contract code should have failed');
  } catch (error) {
    console.log('✅ Oversized contract code properly rejected:', error instanceof Error ? error.message : String(error));
  }
}

function testUtilityFunctions() {
  console.log('\nTesting utility functions...\n');

  // Create a mock audit report
  const mockReport = {
    contractName: 'TestContract',
    language: 'Solidity' as const,
    summary: 'Test audit report',
    vulnerabilities: [
      {
        id: 'test-1',
        title: 'Test Critical Vulnerability',
        description: 'This is a test critical vulnerability',
        severity: 'CRITICAL' as const,
        recommendation: 'Fix this critical issue',
        function: 'testFunction',
        lines: [10, 15],
        category: 'Access Control'
      },
      {
        id: 'test-2',
        title: 'Test Medium Vulnerability',
        description: 'This is a test medium vulnerability',
        severity: 'MEDIUM' as const,
        recommendation: 'Fix this medium issue',
        category: 'Logic Error'
      }
    ],
    linesOfCode: 50,
    auditedAt: new Date(),
    auditEngineVersion: 'Test-Version',
    rawResponse: null
  };

  // Test summary function
  const summary = auditInit.summarizeVulnerabilities(mockReport);
  console.log('Vulnerability Summary:', summary);

  // Test risk score calculation
  const riskScore = auditInit.calculateRiskScore(mockReport);
  console.log('Risk Score:', riskScore);

  // Test format function
  const formatted = auditInit.formatAuditReport(mockReport);
  console.log('\nFormatted Report Preview:');
  console.log('='.repeat(50));
  console.log(formatted.substring(0, 300) + '...');
}

// Run tests
testValidation();
testUtilityFunctions();
console.log('\n✅ All local tests completed successfully!');
