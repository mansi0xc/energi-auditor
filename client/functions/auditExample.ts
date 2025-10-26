// Example usage of the refined audit module
import {
  auditSmartContract,
  summarizeVulnerabilities,
  calculateRiskScore,
  formatAuditReport,
  passesSecurityCheck,
  filterVulnerabilitiesBySeverity,
  groupVulnerabilitiesByFunction,
  AuditError,
} from './auditInit';

// Example smart contract code
const exampleContract = `
pragma solidity ^0.8.0;

contract VulnerableToken {
    mapping(address => uint256) public balances;
    
    function transfer(address to, uint256 amount) public {
        // Missing balance check - potential integer underflow
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        // Reentrancy vulnerability
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success);
        balances[msg.sender] = 0;
    }
}
`;

// Example usage
export async function runAuditExample() {
  try {
    // 1. Run the audit
    console.log('🔍 Starting smart contract audit...');
    const report = await auditSmartContract(
      exampleContract,
      'VulnerableToken',
      { timeout: 120000 } // 2 minutes timeout
    );

    // 2. Get vulnerability summary
    const summary = summarizeVulnerabilities(report);
    console.log('📊 Vulnerability Summary:', summary);

    // 3. Calculate risk score
    const riskScore = calculateRiskScore(report);
    console.log(`⚠️  Risk Score: ${riskScore}/100`);

    // 4. Check if it passes security requirements
    const passes = passesSecurityCheck(report, 0, 1); // Allow max 1 HIGH vulnerability
    console.log(`✅ Passes Security Check: ${passes}`);

    // 5. Filter critical and high vulnerabilities
    const criticalAndHigh = filterVulnerabilitiesBySeverity(report, ['CRITICAL', 'HIGH']);
    console.log(`🚨 Critical/High Vulnerabilities: ${criticalAndHigh.length}`);

    // 6. Group vulnerabilities by function
    const byFunction = groupVulnerabilitiesByFunction(report);
    console.log('📁 Vulnerabilities by Function:');
    byFunction.forEach((vulns, funcName) => {
      console.log(`  - ${funcName}: ${vulns.length} issues`);
    });

    // 7. Display formatted report
    const formattedReport = formatAuditReport(report);
    console.log('\n' + formattedReport);

    // 8. Example of handling specific vulnerability data
    report.vulnerabilities.forEach((vuln) => {
      if (vuln.severity === 'CRITICAL') {
        console.log(`\n🚨 CRITICAL Issue in function "${vuln.function || 'unknown'}":`);
        console.log(`   Title: ${vuln.title}`);
        console.log(`   Category: ${vuln.category || 'N/A'}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
      }
    });

    return report;
  } catch (error) {
    if (error instanceof AuditError) {
      console.error(`❌ Audit Error [${error.code}]:`, error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
    throw error;
  }
}

// Example: Batch audit multiple contracts
export async function batchAudit(contracts: Array<{ code: string; name: string }>) {
  const results = await Promise.allSettled(
    contracts.map(({ code, name }) => 
      auditSmartContract(code, name).then(report => ({
        name,
        report,
        riskScore: calculateRiskScore(report),
        passes: passesSecurityCheck(report),
      }))
    )
  );

  // Process results
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`✅ Successfully audited: ${successful.length}`);
  console.log(`❌ Failed audits: ${failed.length}`);

  return {
    successful: successful.map(r => (r as any).value),
    failed: failed.map(r => ({
      reason: (r as any).reason,
    })),
  };
}
