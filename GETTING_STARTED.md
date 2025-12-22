# Getting Started with MCP Observatory

Quick guide to get MCP Observatory up and running locally.

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **pnpm** 9+ (install: `npm install -g pnpm`)
- **Docker** (for local QuestDB) ([download](https://www.docker.com/))

## Installation

### 1. Install Dependencies

```bash
cd mcp-observatory
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 2. Setup Environment Variables

Create `.env.local` files in each package:

**packages/api/.env.local**

```bash
API_SECRET=your-secret-key-here
ENVIRONMENT=development
```

**packages/web/.env.local**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 3. Start Local Database (Optional for MVP)

```bash
# Start QuestDB with Docker
docker run -p 9000:9000 \
  -p 8812:8812 \
  -p 9009:9009 \
  --name questdb \
  questdb/questdb:latest
```

Access QuestDB console at http://localhost:9000

Load schema:

```bash
# Copy schema to container
docker cp packages/api/src/db/schema.sql questdb:/tmp/

# Execute in QuestDB console or via REST API
```

## Development

### Run All Packages

```bash
# Run everything in development mode
pnpm dev
```

This starts:

- **SDK**: TypeScript watch mode (auto-rebuild on changes)
- **API**: Wrangler dev server at http://localhost:8787
- **Web**: Next.js dev server at http://localhost:3000

### Run Individual Packages

```bash
# SDK only
cd packages/sdk
pnpm dev

# API only
cd packages/api
pnpm dev

# Web only
cd packages/web
pnpm dev
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Test Individual Packages

```bash
# Test SDK
cd packages/sdk
pnpm test

# Test with coverage
pnpm test -- --coverage
```

## Building

### Build All Packages

```bash
pnpm build
```

### Build Individual Packages

```bash
# Build SDK (creates dist/)
cd packages/sdk
pnpm build

# Build Web (creates .next/)
cd packages/web
pnpm build
```

## Quick Test: SDK Integration

### 1. Create a Test MCP Server

```typescript
// test-server.ts
import { createObservatory } from '@lukrlier/mcp-observatory-sdk';

const observatory = createObservatory({
  apiKey: 'test-key-123',
  endpoint: 'http://localhost:8787/v1/ingest',
  debug: true,
});

// Simulate tool calls
setInterval(() => {
  observatory.trackToolCall({
    toolName: 'test_tool',
    parameters: { test: true },
    duration: Math.random() * 1000,
    success: Math.random() > 0.1,
  });
}, 2000);

// Graceful shutdown
process.on('SIGINT', async () => {
  await observatory.shutdown();
  process.exit(0);
});
```

### 2. Run the Test

```bash
# Make sure API is running (pnpm dev in packages/api)
cd packages/sdk
pnpm build
node test-server.ts
```

You should see debug logs showing events being sent to the API.

### 3. Verify in Dashboard

Open http://localhost:3000 and navigate to the dashboard to see real-time data.

## Deployment

### Deploy API to Cloudflare

```bash
cd packages/api

# Login to Cloudflare (first time only)
pnpm wrangler login

# Deploy
pnpm deploy
```

### Deploy Web to Vercel

```bash
cd packages/web

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## Project Structure

```
mcp-observatory/
├── packages/
│   ├── sdk/           # TypeScript SDK (@lukrlier/mcp-observatory-sdk)
│   │   ├── src/       # Source code
│   │   └── dist/      # Built package (after pnpm build)
│   │
│   ├── api/           # Cloudflare Workers API
│   │   ├── src/       # Source code
│   │   │   ├── routes/      # API routes
│   │   │   ├── middleware/  # Auth, validation
│   │   │   └── db/          # Database schemas
│   │   └── wrangler.toml    # Cloudflare config
│   │
│   └── web/           # Next.js Dashboard
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # React components
│       │   └── lib/         # Utilities
│       └── next.config.ts   # Next.js config
│
├── scripts/           # Build and deployment scripts
├── tests/            # Integration tests
├── claudedocs/       # Project documentation
│
├── pnpm-workspace.yaml  # Monorepo config
├── turbo.json           # Turborepo config
└── package.json         # Root package.json
```

## Common Issues

### Issue: `pnpm install` fails

**Solution**: Make sure you have pnpm 9+ installed:

```bash
npm install -g pnpm@latest
pnpm --version
```

### Issue: API returns 401 Unauthorized

**Solution**: Check that you're sending the correct API key in the Authorization header:

```bash
curl -X POST http://localhost:8787/v1/ingest \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"events":[],"serverId":"test","sdkVersion":"0.1.0"}'
```

### Issue: Next.js build fails

**Solution**: Clear Next.js cache and rebuild:

```bash
cd packages/web
rm -rf .next
pnpm build
```

### Issue: Turbo cache issues

**Solution**: Clear Turbo cache:

```bash
pnpm clean
rm -rf .turbo
pnpm install
```

## Next Steps

1. **Implement Dashboard Features**
   - Real-time charts with Recharts
   - Cost tracking tables
   - API keys management

2. **Add Authentication**
   - NextAuth.js setup
   - GitHub OAuth

3. **Setup Production Database**
   - QuestDB Cloud or Fly.io deployment
   - Supabase for PostgreSQL

4. **Deploy**
   - Cloudflare Workers (API)
   - Vercel (Web)
   - Fly.io (QuestDB)

## Resources

- [SDK Documentation](./packages/sdk/README.md)
- [API Documentation](./packages/api/README.md)
- [Web Documentation](./packages/web/README.md)
- [Database Architecture](./claudedocs/database-architecture.md)
- [Business Analysis](../claudedocs/mcp-observatory-deep-dive.md)

## Support

- GitHub Issues: [Report a bug](https://github.com/LuKrlier/mcp-observatory/issues)
- Discord: [Join the community](#)
- Email: contact@lurlier.fr

## License

MIT - See [LICENSE](./LICENSE) for details.
