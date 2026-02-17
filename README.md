# vanguard

A high-performance API gateway with rate limiting, aggregation, and observability.

## Features

| Feature | Description |
|---------|-------------|
| Rate Limiting | Redis-based request throttling |
| Request Aggregation | Combine multiple API calls into one |
| Observability | Prometheus metrics & structured logging |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

## Configuration

Server runs on port `4000` by default. Override with the `PORT` environment variable.

```bash
PORT=8080 pnpm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Compile TypeScript to JavaScript |
| `pnpm run start` | Start production server |

## Benchmarks

Tested with autocannon, 4 cores for gateway + 4 cores for mock backend.

### GET /api/users (300 connections, 30s)

| Metric | Value |
|--------|-------|
| Avg Latency | 10.1 ms |
| Req/Sec | ~28,340 (avg) |
| Total Requests | 851k |
| Throughput | 5.55 MB/s |

### POST /api/users (300 connections, 30s, JSON body)

| Metric | Value |
|--------|-------|
| Avg Latency | 19.57 ms |
| Req/Sec | ~14,968 (avg) |
| Total Requests | 449k |
| Throughput | 3.91 MB/s |

## Tech Stack

- [Fastify](https://www.fastify.io/) - Web framework
- [Redis](https://redis.io/) - Rate limiting store
- [Prometheus](https://prometheus.io/) - Metrics
- [Pino](https://getpino.io/) - Logging

## License

ISC
