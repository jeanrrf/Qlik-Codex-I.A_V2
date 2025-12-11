# Vector Store Migration to Turso - Implementation Plan

## 📋 Overview

Migrate the vector store from local SQLite (better-sqlite3) to Turso, a distributed edge SQLite database, to enable:
- Multi-region deployment with edge replication
- Better scalability for production workloads
- Data persistence across server restarts
- Shared vector store across multiple instances

## 🎯 Goals

1. **Zero Downtime**: Migrate without service interruption
2. **Data Preservation**: Maintain all existing vector embeddings
3. **API Compatibility**: No changes to existing API endpoints
4. **Performance**: Maintain or improve current performance metrics
5. **Cost Effective**: Stay within budget constraints

## 🏗️ Architecture Changes

### Current Architecture
```
VectorStore (better-sqlite3)
└── Local SQLite DB (server/data/qlik-codex.db)
    └── vector_documents table
```

### Target Architecture
```
VectorStore (Turso)
├── Turso Edge Database (distributed)
│   ├── Primary region (closest to deployment)
│   └── Edge replicas (optional, for global distribution)
└── Local SQLite fallback (development mode)
```

## 📦 Dependencies

### New Dependencies to Add
```json
{
  "dependencies": {
    "@libsql/client": "^0.4.0"  // Turso SDK for Node.js
  }
}
```

### Configuration Changes
```env
# New environment variables
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
TURSO_SYNC_URL=  # Optional: for local replica sync
USE_TURSO=true   # Feature flag for migration
```

## 🔧 Implementation Steps

### Phase 1: Setup & Preparation (1-2 hours)

1. **Create Turso Database**
   ```bash
   # Install Turso CLI
   brew install tursodatabase/tap/turso  # macOS
   # or
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Login to Turso
   turso auth login
   
   # Create database
   turso db create qlik-codex-vectors --location sao  # São Paulo region
   
   # Get connection details
   turso db show qlik-codex-vectors
   turso db tokens create qlik-codex-vectors
   ```

2. **Add Configuration**
   - Update `server/src/lib/config.ts` to include Turso settings
   - Add feature flag for gradual rollout
   - Keep backward compatibility with local SQLite

3. **Install Dependencies**
   ```bash
   cd server
   npm install @libsql/client
   ```

### Phase 2: Database Adapter Pattern (2-3 hours)

Create an abstraction layer to support both SQLite and Turso:

```typescript
// server/src/lib/databaseAdapter.ts
export interface DatabaseAdapter {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
}

export interface Statement {
  run(...params: any[]): RunResult;
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

// Implementations
class SQLiteAdapter implements DatabaseAdapter { ... }
class TursoAdapter implements DatabaseAdapter { ... }

export function createDatabaseAdapter(): DatabaseAdapter {
  if (config.useTurso && config.tursoUrl) {
    return new TursoAdapter(config.tursoUrl, config.tursoAuthToken);
  }
  return new SQLiteAdapter();
}
```

### Phase 3: Vector Store Refactoring (2-3 hours)

1. **Update VectorStore class**
   ```typescript
   // Replace direct Database usage with adapter
   constructor() {
     this.db = createDatabaseAdapter();
     // ... rest of initialization
   }
   ```

2. **Handle async operations**
   - Turso client is async-first
   - Update all database calls to support promises
   - Maintain backward compatibility

3. **Connection pooling**
   - Implement connection reuse for Turso
   - Add retry logic for network failures
   - Implement circuit breaker pattern

### Phase 4: Migration Script (1-2 hours)

```typescript
// server/src/scripts/migrateTurso.ts
async function migrateToTurso() {
  const localDb = initSqliteDb();
  const tursoDb = createTursoClient();
  
  // 1. Create schema in Turso
  await createTursoSchema(tursoDb);
  
  // 2. Copy all vector documents
  const documents = getAllDocuments(localDb);
  await batchInsertToTurso(tursoDb, documents);
  
  // 3. Verify data integrity
  await verifyMigration(localDb, tursoDb);
  
  console.log('Migration complete!');
}
```

### Phase 5: Testing (2-3 hours)

1. **Unit Tests**
   - Mock Turso client
   - Test adapter pattern
   - Test connection failures

2. **Integration Tests**
   - Test with real Turso database
   - Test migration script
   - Test fallback to SQLite

3. **Performance Tests**
   - Benchmark embedding insertion
   - Benchmark search queries
   - Compare with local SQLite

### Phase 6: Deployment (1-2 hours)

1. **Gradual Rollout**
   - Deploy with `USE_TURSO=false` (SQLite mode)
   - Run migration script to populate Turso
   - Enable `USE_TURSO=true` for testing
   - Monitor performance and errors
   - Roll out to production

2. **Monitoring**
   - Add Turso-specific metrics
   - Track connection pool usage
   - Monitor query latency
   - Set up alerts for failures

## 📁 Files to Create/Modify

### New Files
1. `server/src/lib/databaseAdapter.ts` - Database abstraction layer
2. `server/src/lib/tursoClient.ts` - Turso-specific implementation
3. `server/src/scripts/migrateTurso.ts` - Migration script
4. `server/test/lib/tursoAdapter.test.ts` - Adapter tests
5. `server/docs/TURSO_MIGRATION.md` - Migration guide

### Modified Files
1. `server/src/services/vectorStore.ts` - Use adapter instead of direct DB
2. `server/src/lib/config.ts` - Add Turso configuration
3. `server/package.json` - Add @libsql/client dependency
4. `server/.env.example` - Document Turso environment variables
5. `server/README.md` - Update deployment instructions

## 🔒 Security Considerations

1. **Token Management**
   - Store Turso auth token in environment variables
   - Never commit tokens to repository
   - Rotate tokens regularly

2. **Network Security**
   - Use TLS for all Turso connections (enabled by default)
   - Implement rate limiting on Turso API calls
   - Add request timeout limits

3. **Data Access**
   - Implement row-level security if needed
   - Audit database access logs
   - Encrypt sensitive metadata fields

## 💰 Cost Analysis

### Turso Pricing (as of Dec 2024)
- **Starter Plan**: Free
  - 500 databases
  - 9 GB total storage
  - 1 billion row reads/month
  - Perfect for initial deployment

- **Scaler Plan**: $29/month
  - Unlimited databases
  - 100 GB storage
  - 1 billion row reads/month
  - Good for production

### Estimated Usage
- Vector documents: ~1000 docs × 3KB = ~3MB
- Row reads: ~10,000/day = ~300k/month
- **Recommendation**: Start with free tier

## 📊 Performance Expectations

### Latency
- Local SQLite: 1-5ms
- Turso (same region): 10-30ms
- Turso (edge replica): 5-15ms

### Throughput
- Local SQLite: 10,000 ops/sec
- Turso: 1,000-5,000 ops/sec (network limited)

### Recommendation
- Use local replica sync for read-heavy workloads
- Cache frequently accessed embeddings (already implemented)

## 🎓 Learning Resources

1. **Turso Documentation**
   - https://docs.turso.tech/
   - https://docs.turso.tech/sdk/ts/quickstart

2. **LibSQL Client**
   - https://github.com/tursodatabase/libsql-client-ts

3. **Migration Best Practices**
   - https://docs.turso.tech/tutorials/migrate-from-sqlite

## ✅ Success Criteria

- [ ] All existing tests pass with Turso adapter
- [ ] Migration script successfully transfers all data
- [ ] API endpoints work identically with Turso
- [ ] Performance is within acceptable range (±50% of SQLite)
- [ ] Zero data loss during migration
- [ ] Rollback plan tested and documented

## 🚨 Rollback Plan

If issues occur:

1. **Immediate Rollback**
   ```bash
   # Set environment variable
   USE_TURSO=false
   
   # Restart service
   pm2 restart qlik-codex
   ```

2. **Data Recovery**
   - Keep SQLite backup for 30 days
   - Document last known good state
   - Have Turso export script ready

## 📅 Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Setup & Preparation | 1-2 hours | Turso account |
| Database Adapter | 2-3 hours | Setup complete |
| Vector Store Refactor | 2-3 hours | Adapter done |
| Migration Script | 1-2 hours | Refactor done |
| Testing | 2-3 hours | All code done |
| Deployment | 1-2 hours | Tests pass |
| **Total** | **9-15 hours** | |

## 🎯 Next Steps

1. **Review this plan** with stakeholders
2. **Create Turso account** and database
3. **Implement adapter pattern** first (most critical)
4. **Write migration script** with rollback support
5. **Test thoroughly** in development
6. **Deploy to staging** for validation
7. **Gradual production rollout** with monitoring

---

**Status**: 📋 PLAN READY - Awaiting approval to proceed

**Author**: Copilot Agent  
**Date**: December 2024  
**Estimated Effort**: 9-15 hours
