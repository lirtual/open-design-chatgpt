import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { startServer } from './dist/server.js';

const EXPECTED_TOOLS = [
  'list_projects',
  'get_project',
  'list_files',
  'get_file',
  'search_files',
  'get_artifact',
  'create_project',
  'create_artifact',
  'write_file',
  'delete_file',
  'list_skills',
  'get_preview',
  'export_artifact',
].sort();

const FORBIDDEN_TOOLS = [
  'collect_brief',
  'confirm_brief',
  'delete_project',
  'list_plugins',
  'list_agents',
  'start_vela_login',
  'get_vela_login_status',
  'start_run',
  'get_run',
  'cancel_run',
];

function firstText(result) {
  const item = result?.content?.find((entry) => entry?.type === 'text');
  return typeof item?.text === 'string' ? item.text : '';
}

function allText(result) {
  return (result?.content ?? [])
    .filter((entry) => entry?.type === 'text' && typeof entry?.text === 'string')
    .map((entry) => entry.text)
    .join('\n');
}

function structured(result) {
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const text = firstText(result);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function assertToolSuccess(result, name) {
  assert.notEqual(result?.isError, true, `${name} failed: ${firstText(result)}`);
  return result;
}

function assertToolError(result, name, expectedText) {
  assert.equal(result?.isError, true, `${name} unexpectedly succeeded`);
  if (expectedText) {
    assert.match(firstText(result), expectedText, `${name} returned unexpected error`);
  }
}

const started = await startServer({ port: 0, returnServer: true });
const baseUrl = started.url;
const server = started.server;
const projectId = `mcp-acceptance-${randomUUID()}`;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/cli.js', 'mcp', '--daemon-url', baseUrl],
  cwd: process.cwd(),
  env: {
    ...process.env,
    OD_MCP_PROFILE: 'chatgpt',
    OD_MCP_CHATGPT_PROJECTS: '',
    OD_MCP_STDIO_IDLE_EXIT_MS: '0',
  },
  stderr: 'inherit',
});

const client = new Client(
  { name: 'open-design-chatgpt-acceptance', version: '1.0.0' },
  { capabilities: {} },
);

const report = {
  protocol: 'stdio',
  profile: 'chatgpt',
  daemonUrl: baseUrl,
  projectId,
  checks: [],
};

function passed(name, details = {}) {
  report.checks.push({ name, status: 'passed', ...details });
  console.log(`PASS ${name}`);
}

try {
  await client.connect(transport);
  passed('initialize/connect');

  const toolList = await client.listTools();
  const names = toolList.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, EXPECTED_TOOLS);
  for (const forbidden of FORBIDDEN_TOOLS) assert(!names.includes(forbidden));
  passed('restricted tools/list', { tools: names });

  const hidden = await client.callTool({
    name: 'start_run',
    arguments: { project: projectId },
  });
  assertToolError(hidden, 'start_run', /not available/i);
  passed('hidden tool rejected in dispatch');

  const unauthorized = await client.callTool({
    name: 'get_project',
    arguments: { project: 'not-authorized-project' },
  });
  assertToolError(unauthorized, 'get_project unauthorized', /authorized/i);
  passed('unauthorized project rejected');

  const created = assertToolSuccess(await client.callTool({
    name: 'create_project',
    arguments: { id: projectId, name: 'MCP acceptance project' },
  }), 'create_project');
  passed('create_project', { response: structured(created) });

  const projects = assertToolSuccess(await client.callTool({
    name: 'list_projects',
    arguments: {},
  }), 'list_projects');
  const listed = structured(projects).projects ?? [];
  assert(listed.some((project) => project.id === projectId), 'created project missing from list_projects');
  assert(listed.every((project) => project.id === projectId), 'list_projects leaked a non-authorized project');
  passed('list_projects allowlist filtering');

  const htmlV1 = '<!doctype html><html><body><h1>MCP acceptance v1</h1></body></html>';
  assertToolSuccess(await client.callTool({
    name: 'write_file',
    arguments: {
      project: projectId,
      path: 'index.html',
      content: htmlV1,
      precondition: { missing: true },
    },
  }), 'write_file create');
  passed('write_file missing:true');

  const readV1 = assertToolSuccess(await client.callTool({
    name: 'get_file',
    arguments: { project: projectId, path: 'index.html' },
  }), 'get_file v1');
  const readV1Data = structured(readV1);
  assert.match(readV1Data.contentDigest ?? '', /^[a-f0-9]{64}$/);
  const digestV1 = readV1Data.contentDigest;
  passed('get_file full digest', { digest: digestV1 });

  const stale = await client.callTool({
    name: 'write_file',
    arguments: {
      project: projectId,
      path: 'index.html',
      content: '<h1>stale</h1>',
      precondition: { contentDigest: '0'.repeat(64) },
    },
  });
  assertToolError(stale, 'stale write', /FILE_VERSION_CONFLICT|409/i);
  passed('stale overwrite rejected');

  const htmlV2 = '<!doctype html><html><body><h1>MCP acceptance v2</h1></body></html>';
  assertToolSuccess(await client.callTool({
    name: 'write_file',
    arguments: {
      project: projectId,
      path: 'index.html',
      content: htmlV2,
      precondition: { contentDigest: digestV1 },
    },
  }), 'write_file replace');
  passed('conditioned overwrite');

  const readV2 = assertToolSuccess(await client.callTool({
    name: 'get_file',
    arguments: { project: projectId, path: 'index.html' },
  }), 'get_file v2');
  const readV2Data = structured(readV2);
  assert.match(readV2Data.contentDigest ?? '', /^[a-f0-9]{64}$/);
  assert.notEqual(readV2Data.contentDigest, digestV1);
  const digestV2 = readV2Data.contentDigest;
  assert(allText(readV2).includes('MCP acceptance v2'));
  passed('read-after-write', { digest: digestV2 });

  const preview = assertToolSuccess(await client.callTool({
    name: 'get_preview',
    arguments: { project: projectId, fileName: 'index.html' },
  }), 'get_preview');
  const previewData = structured(preview);
  assert.equal(previewData.previewScope, 'same-machine');
  assert.equal(typeof previewData.previewUrl, 'string');
  passed('get_preview same-machine URL');

  const exported = assertToolSuccess(await client.callTool({
    name: 'export_artifact',
    arguments: {
      project: projectId,
      fileName: 'index.html',
      format: 'html',
    },
  }), 'export_artifact html');
  const exportData = structured(exported);
  assert.equal(exportData.encoding, 'base64');
  assert.equal(exportData.mime, 'text/html');
  assert(Number(exportData.byteLength) > 0);
  const exportedHtml = Buffer.from(exportData.dataBase64, 'base64').toString('utf8');
  assert(exportedHtml.includes('MCP acceptance v2'));
  passed('HTML export');

  assertToolSuccess(await client.callTool({
    name: 'delete_file',
    arguments: {
      project: projectId,
      path: 'index.html',
      precondition: { contentDigest: digestV2 },
    },
  }), 'delete_file');
  const deletedResp = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}/raw/index.html`);
  assert.equal(deletedResp.status, 404);
  passed('conditioned delete');

  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.error = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  await fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  }).catch(() => {});
  await new Promise((resolve) => server.close(() => resolve()));
}
