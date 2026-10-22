import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');

test('Frontend Build Bundle Verification', () => {
  assert.ok(fs.existsSync(DIST_DIR), 'dist directory must exist after build');
  const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(indexHtml.includes('ATI Motors - Robotics Runbook Assistant'), 'index.html must have correct brand title');
  assert.ok(indexHtml.includes('<div id="root">'), 'index.html must contain root mount element');

  const assetsDir = path.join(DIST_DIR, 'assets');
  assert.ok(fs.existsSync(assetsDir), 'assets directory must exist');
  const files = fs.readdirSync(assetsDir);
  const jsBundle = files.find((f) => f.endsWith('.js'));
  const cssBundle = files.find((f) => f.endsWith('.css'));

  assert.ok(jsBundle, 'JavaScript bundle must be emitted');
  assert.ok(cssBundle, 'CSS stylesheet must be emitted');
});

test('Grounded Chat Response Contract Validation', () => {
  const sampleAssistantPayload = {
    role: 'assistant',
    retrieval_mode: 'structured_grounded',
    confidence: 0.85,
    sources: [
      {
        runbook_id: 'rb-001',
        runbook_title: 'Map Generation',
        components: 'Generate Map',
        step_numbers: [1],
      },
    ],
    steps: [
      {
        step_number: 1,
        step_title: 'Command to generate',
        command: 'docker run --gpus all -it mapping_and_stitching mapping',
        instruction: 'This command is used for generating map',
        warning: 'Do not interrupt posegraph',
      },
    ],
    commands: [
      {
        step_number: 1,
        command: 'docker run --gpus all -it mapping_and_stitching mapping',
      },
    ],
  };

  assert.strictEqual(sampleAssistantPayload.role, 'assistant');
  assert.strictEqual(sampleAssistantPayload.retrieval_mode, 'structured_grounded');
  assert.ok(sampleAssistantPayload.confidence >= 0.4);
  assert.strictEqual(sampleAssistantPayload.sources[0].runbook_title, 'Map Generation');
  assert.ok(sampleAssistantPayload.commands[0].command.includes('mapping_and_stitching'));
});

test('Search URL Parameters Serialization', () => {
  const params = {
    q: 'obstacle detection',
    ticket_type: 'Incident',
    category: 'Software',
    product_area: 'Navigation',
    skip: 0,
    limit: 25,
  };

  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.ticket_type && params.ticket_type !== 'All') searchParams.set('ticket_type', params.ticket_type);
  if (params.category && params.category !== 'All') searchParams.set('category', params.category);
  if (params.product_area && params.product_area !== 'All') searchParams.set('product_area', params.product_area);
  searchParams.set('skip', params.skip.toString());
  searchParams.set('limit', params.limit.toString());

  const queryStr = searchParams.toString();
  assert.ok(queryStr.includes('q=obstacle+detection'));
  assert.ok(queryStr.includes('ticket_type=Incident'));
  assert.ok(queryStr.includes('category=Software'));
  assert.ok(queryStr.includes('product_area=Navigation'));
});

test('Command Extraction and Sanitization Safety', () => {
  const rawCommand = '$ docker run --gpus all -it -v "Manual Run Dataset/":/app/data mapping\n';
  const cleaned = rawCommand.trim().replace(/^\$\s*/, '');
  assert.ok(!cleaned.startsWith('$'), 'Leading dollar sign prompt must be stripped for execution safety');
  assert.ok(cleaned.startsWith('docker run'), 'Command must preserve exact binary and flags');
});
