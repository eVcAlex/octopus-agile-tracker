import { z } from 'zod';

// Zod's JIT compiler probes for `new Function` support, which the site's
// Content-Security-Policy (no 'unsafe-eval') blocks. Our payloads are small, so
// skip the probe. Must run before any schema is created, so import it first.
z.config({ jitless: true });
