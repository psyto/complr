# @complr/sdk

Compliance Middleware SDK for Asia's crypto markets. Embed multi-jurisdiction compliance checks (MAS, SFC, FSA) into any exchange or VASP with a single npm package.

## Installation

```bash
npm install @complr/sdk
```

## Quick Start

```typescript
import { ComplrClient } from "@complr/sdk";

const complr = new ComplrClient({
  apiKey: "complr_...",
  baseUrl: "https://api.complr.dev", // or your self-hosted instance
});
```

## Core Compliance

### Transaction Check

```typescript
const result = await complr.checkTransaction({
  transactionId: "tx_001",
  timestamp: new Date().toISOString(),
  senderWallet: "0xabc...",
  recipientWallet: "0xdef...",
  amount: "25000",
  currency: "USDC",
  chain: "ethereum",
  senderKycLevel: "standard",
  recipientKycLevel: "basic",
});

console.log(result.overallStatus); // "compliant" | "requires_action" | "blocked"
console.log(result.jurisdictions); // per-jurisdiction breakdown
console.log(result.actionItems);   // what needs to be done
```

### Batch Check

Check up to 50 transactions in parallel:

```typescript
const batch = await complr.checkBatch(transactions, ["MAS", "SFC"]);

console.log(batch.summary);
// { total: 50, compliant: 42, requiresAction: 7, blocked: 1 }
```

### Wallet Screening

LLM-powered wallet risk assessment:

```typescript
const screen = await complr.screenWallet("0xabc...", "ethereum", "MAS");

console.log(screen.riskScore);    // 0-100
console.log(screen.riskLevel);    // "low" | "medium" | "high" | "critical"
console.log(screen.sanctions);    // true/false
console.log(screen.flags);        // specific risk flags
```

### SAR/STR Report Generation

```typescript
const report = await complr.generateReport(
  transaction,
  ["Structuring pattern", "Unknown recipient"],
  "FSA"
);

console.log(report.format);             // "fsa_str"
console.log(report.suspicionNarrative); // professional narrative
```

### Regulatory Query

```typescript
const { answer } = await complr.query(
  "What are the Travel Rule requirements for transfers above S$1,500?",
  "MAS"
);
```

## Webhooks

### Register a Webhook

```typescript
const wh = await complr.registerWebhook(
  "https://your-app.com/webhooks/complr",
  ["check.blocked", "screen.high_risk", "report.generated"],
  "your-webhook-secret"
);
```

### Handle Incoming Webhooks

```typescript
import express from "express";
import { webhookMiddleware } from "@complr/sdk";

const app = express();

app.post(
  "/webhooks/complr",
  express.json(),
  webhookMiddleware("your-webhook-secret", (event) => {
    console.log(event.event, event.data);
    // "check.blocked", "screen.high_risk", "report.generated", "check.completed"
  })
);
```

Or verify manually:

```typescript
import { verifyWebhookSignature, parseWebhookPayload } from "@complr/sdk";

const isValid = verifyWebhookSignature(rawBody, signatureHeader, secret);
const payload = parseWebhookPayload(rawBody, signatureHeader, secret);
```

### Manage Webhooks

```typescript
const webhooks = await complr.listWebhooks();
await complr.removeWebhook(webhooks[0].id);
```

## Usage Tracking

```typescript
const usage = await complr.getUsage();

console.log(usage.totalRequests);
console.log(usage.totalChecks);
console.log(usage.totalScreenings);
```

## Configuration

```typescript
const complr = new ComplrClient({
  apiKey: "complr_...",       // Required
  baseUrl: "https://...",     // Default: https://api.complr.dev
  timeout: 30_000,            // Request timeout in ms (default: 30s)
  maxRetries: 3,              // Retry count for failures (default: 3)
});
```

## Built-in Features

- **Automatic retry** with exponential backoff for network errors
- **Rate limit handling** -- backs off when receiving 429 responses
- **Request timeout** -- configurable per-client
- **Full TypeScript types** -- all request/response types exported

## Webhook Events

| Event | Trigger |
|-------|---------|
| `check.completed` | Any compliance check finishes |
| `check.blocked` | A transaction is blocked by compliance rules |
| `screen.high_risk` | Wallet screening returns high or critical risk |
| `report.generated` | A SAR/STR report is generated |

## Supported Jurisdictions

| Code | Regulator | Region | Travel Rule Threshold |
|------|-----------|--------|----------------------|
| `MAS` | Monetary Authority of Singapore | Singapore | S$1,500 |
| `SFC` | Securities and Futures Commission | Hong Kong | HK$8,000 |
| `FSA` | Financial Services Agency | Japan | Zero (all transactions) |

## License

Proprietary. All rights reserved.
