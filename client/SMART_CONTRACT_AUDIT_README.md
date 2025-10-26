# Smart Contract Auditing with ChainGPT

This project now uses **ChainGPT's Smart Contract Auditor API** for automated smart contract security analysis.

## Setup

### 1. Environment Variables

Create a `.env.local` file in the client directory and add your ChainGPT API key:

```bash
CHAINGPT_API_KEY=your_chaingpt_api_key_here
```

### 2. API Configuration

The audit system is configured to use:
- **API Endpoint**: `https://api.chaingpt.org/chat/stream`
- **Model**: `smart_contract_auditor`
- **Authentication**: Bearer token with your API key

## Usage

### Basic Usage

```typescript
import { auditSmartContract } from './functions/auditInit';

const contractCode = `
pragma solidity ^0.8.0;
contract MyContract {
    uint256 public value;
    function setValue(uint256 _value) public {
        value = _value;
    }
}
`;

try {
    const report = await auditSmartContract(contractCode, 'MyContract');
    console.log(`Found ${report.vulnerabilities.length} vulnerabilities`);
} catch (error) {
    console.error('Audit failed:', error.message);
}
```

### Advanced Usage with Options

```typescript
const report = await auditSmartContract(
    contractCode,
    'MyContract',
    {
        timeout: 120000, // 2 minutes
        includeInfo: true,
        apiUrl: 'https://api.chaingpt.org/chat/stream' // custom endpoint
    }
);
```

## API Reference

### `auditSmartContract(contractCode, contractName?, options?)`

**Parameters:**
- `contractCode` (string): Solidity or Vyper smart contract source code
- `contractName` (string, optional): Name for the contract (defaults to "UnnamedContract")
- `options` (AuditOptions, optional): Configuration options

**Returns:** Promise<AuditReport>

**Throws:** AuditError with specific error codes:
- `MISSING_API_KEY`: No API key provided
- `UNAUTHORIZED`: Invalid API key
- `RATE_LIMITED`: API rate limit exceeded
- `INSUFFICIENT_CREDITS`: Not enough API credits
- `TIMEOUT`: Request timed out
- `API_ERROR`: General API error

### Audit Report Structure

```typescript
interface AuditReport {
    contractName: string;
    language: ContractLanguage; // "Solidity" | "Vyper" | "Unknown"
    summary: string;
    vulnerabilities: Vulnerability[];
    linesOfCode?: number;
    auditedAt: Date;
    auditEngineVersion?: string;
    rawResponse: unknown;
}
```

### Vulnerability Structure

```typescript
interface Vulnerability {
    id: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    recommendation: string;
    function?: string;
    lines?: number[];
    category?: string;
}
```

## Utility Functions

### `summarizeVulnerabilities(report)`

Returns a summary of vulnerabilities by severity:

```typescript
interface VulnerabilitySummary {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    total: number;
}
```

### `filterVulnerabilitiesBySeverity(report, severities)`

Filter vulnerabilities by severity levels:

```typescript
const highSeverity = filterVulnerabilitiesBySeverity(report, ['HIGH', 'CRITICAL']);
```

### `calculateRiskScore(report)`

Returns a risk score from 0 (low risk) to 100 (high risk):

```typescript
const riskScore = calculateRiskScore(report);
```

### `formatAuditReport(report)`

Returns a formatted string representation of the audit report.

## Environment Setup

Before running tests, create a `.env.local` file in the client directory:

```bash
# Create .env.local file
CHAINGPT_API_KEY=your_actual_api_key_here
```

Get your API key from [ChainGPT](https://chaingpt.org/).

## Testing

Run the test script to verify the integration:

```bash
cd client
npx tsx test-chaingpt.ts
```

Or if you have tsx installed globally:

```bash
tsx test-chaingpt.ts
```

For local testing without API key (tests utility functions only):

```bash
npx tsx test-local.ts
```

## Migration from Gemini

This system was previously using Google's Gemini API. The key changes in this migration:

1. **API Endpoint**: Changed from Gemini to ChainGPT
2. **Environment Variable**: Changed from `GEMINI_API_KEY` to `CHAINGPT_API_KEY`
3. **Request Format**: Updated to use ChainGPT's expected JSON format
4. **Response Handling**: Updated to handle streaming responses
5. **Error Codes**: Added ChainGPT-specific error handling (402 for insufficient credits)

## Supported Contract Languages

- **Solidity**: Full support
- **Vyper**: Basic support
- **Unknown**: Fallback for unrecognized languages

## Security Considerations

- API keys are loaded from environment variables for security
- Contract code is validated before sending to the API
- Maximum contract size is limited to 100KB
- All API requests use HTTPS
- Timeout is set to 90 seconds by default
