import test from 'node:test';
import assert from 'node:assert/strict';
import { DriveClient } from '../lib/drive-client';

test('shares only the submission folder with the sender as a reader', async () => {
  const calls: string[] = [];
  const drive = new DriveClient('test-token', async (url, init) => {
    calls.push(String(url));
    assert.match(String(url), /files\/submission-folder\/permissions/);
    if (init?.method !== 'POST') return Response.json({ permissions: [] });
    assert.deepEqual(JSON.parse(String(init.body)), { type: 'user', role: 'reader', emailAddress: 'customer@example.com' });
    assert.match(String(url), /sendNotificationEmail=false/);
    return Response.json({ id: 'permission-id' });
  });
  await drive.shareWithReader('submission-folder', 'customer@example.com');
  assert.equal(calls.length, 2);
});

test('sharing retries reuse existing recipient access, including paginated permissions', async () => {
  let calls = 0;
  const drive = new DriveClient('test-token', async (url, init) => {
    calls++;
    assert.notEqual(init?.method, 'POST');
    if (calls === 1) return Response.json({ nextPageToken: 'page2', permissions: [] });
    assert.equal(new URL(String(url)).searchParams.get('pageToken'), 'page2');
    return Response.json({ permissions: [{ type: 'user', emailAddress: 'CUSTOMER@example.com' }] });
  });
  await drive.shareWithReader('folder', 'customer@example.com');
  assert.equal(calls, 2);
});

test('a rejected sharing request fails the archive step for retry before the link email', async () => {
  const drive = new DriveClient('test-token', async (_url, init) => init?.method === 'POST'
    ? new Response(null, { status: 403 }) : Response.json({ permissions: [] }));
  await assert.rejects(drive.shareWithReader('folder', 'customer@example.com'), /Google Drive request failed \(403\)/);
});

test('Drive retry reuses an existing archive without another upload', async () => {
  let requests = 0;
  const drive = new DriveClient('test-token', async (url, init) => {
    requests++;
    assert.match(String(url), /appProperties/);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token');
    return Response.json({ files: [{ id: 'existing-file' }] });
  });
  assert.equal(await drive.save('parent', 'submission-file', 'document.pdf', new Uint8Array([1])), 'existing-file');
  assert.equal(requests, 1);
});

test('Drive creates a folder and uploads original bytes through a resumable session', async () => {
  let requests = 0;
  const bytes = new Uint8Array([0, 255, 10, 13, 42]);
  const drive = new DriveClient('test-token', async (url, init) => {
    requests++;
    if (String(url).includes('q=')) return Response.json({ files: [] });
    if (String(url).includes('uploadType=resumable')) {
      const metadata = JSON.parse(String(init?.body));
      assert.deepEqual(metadata.parents, ['folder-id']);
      assert.equal(metadata.appProperties.surewayKey, 'file-key');
      return new Response(null, { headers: { location: 'https://www.googleapis.com/upload/session-test' } });
    }
    if (init?.method === 'PUT') {
      assert.deepEqual(new Uint8Array(await (init.body as Blob).arrayBuffer()), bytes);
      return Response.json({ id: 'file-id' });
    }
    const metadata = JSON.parse(String(init?.body));
    assert.equal(metadata.mimeType, 'application/vnd.google-apps.folder');
    assert.deepEqual(metadata.parents, ['root-id']);
    return Response.json({ id: 'folder-id' });
  });
  assert.equal(await drive.save('root-id', 'folder-key', 'Customer request'), 'folder-id');
  assert.equal(await drive.save('folder-id', 'file-key', 'document.pdf', bytes), 'file-id');
  assert.equal(requests, 5);
});

test('Drive exposes provider failures for retry', async () => {
  const drive = new DriveClient('test-token', async () => new Response(null, { status: 503 }));
  await assert.rejects(drive.save('parent', 'key', 'file'), /Google Drive request failed/);
});

test('Drive rejects unexpected upload hosts before forwarding credentials', async () => {
  let requests = 0;
  const drive = new DriveClient('test-token', async () => {
    requests++;
    return requests === 1 ? Response.json({ files: [] }) : new Response(null, { headers: { location: 'https://example.com/upload' } });
  });
  await assert.rejects(drive.save('parent', 'key', 'file', new Uint8Array([1])), /Invalid Google Drive upload session/);
  assert.equal(requests, 2);
});
