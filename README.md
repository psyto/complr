# Complr

AI-Native Compliance Intelligence for Asia's Crypto Markets.

Complr is a multi-jurisdiction compliance engine that covers **MAS** (Singapore), **SFC** (Hong Kong), and **FSA** (Japan). It uses LLMs to interpret regulatory text, check transactions against jurisdiction-specific rules, generate SAR/STR reports, and extract structured obligations from regulatory documents.

## Features

- **Regulatory Queries** -- Ask natural language questions about crypto regulations and get jurisdiction-specific answers grounded in actual regulatory text
- **Transaction Compliance Checks** -- Submit a single transaction and get compliance results across all 3 jurisdictions simultaneously, including Travel Rule applicability, KYC requirements, and action items
- **SAR/STR Generation** -- Auto-draft Suspicious Transaction Reports in regulator-specific formats (FSA STR, MAS STR, SFC STR) in seconds
- **Obligation Extraction** -- Feed in regulatory documents and get structured, actionable obligations with thresholds, penalties, and suggested controls

## Quickstart

```bash
# Install dependencies
npm install

# Run the demo (all 4 features)
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/demo.ts

# Start the REST API server
ANTHROPIC_API_KEY=sk-ant-... npm run start:server

# Start the interactive CLI
ANTHROPIC_API_KEY=sk-ant-... npm start
```

## Architecture

```
src/
  index.ts                  # Complr class -- main entry point
  types.ts                  # Shared types and interfaces
  utils.ts                  # JSON extraction from LLM responses
  demo.ts                   # Demo script (4 features)
  cli.ts                    # Interactive REPL
  api/server.ts             # Express REST API
  data/seed-regulations.ts  # Seed regulatory data (8 documents)
  regulatory/
    analyzer.ts             # LLM-powered regulatory analysis
    knowledge-base.ts       # In-memory document store with search
  policy/
    engine.ts               # Multi-jurisdiction compliance engine
  reports/
    generator.ts            # SAR/STR report generation
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/query` | Regulatory knowledge base query |
| POST | `/check` | Transaction compliance check |
| POST | `/report` | SAR/STR report generation |
| POST | `/analyze` | Obligation extraction from documents |

## Jurisdictions

| Regulator | Region | Travel Rule Threshold |
|-----------|--------|----------------------|
| **MAS** | Singapore | S$1,500 (~USD 1,100) |
| **SFC** | Hong Kong | HK$8,000 (~USD 1,025) |
| **FSA** | Japan | Zero (all transactions) |

## Seed Regulatory Data

The knowledge base ships with 8 regulatory documents covering:

- MAS Payment Services Act (DPT licensing, Travel Rule, tokenisation guide)
- SFC ASPIRe roadmap, Travel Rule under AMLO, Stablecoins Ordinance
- FSA Travel Rule (JVCEA), crypto tax reform proposal

## Development

```bash
npm run build       # Compile TypeScript
npm run dev         # Watch mode
npm run typecheck   # Type check without emitting
```

## License

Proprietary. All rights reserved.
