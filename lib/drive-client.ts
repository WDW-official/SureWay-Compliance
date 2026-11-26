// Used only by the server-side submission worker. Never expose credentials to the browser.
export class DriveClient {
  constructor(private token: string, private request: typeof fetch = fetch) {}

  async shareWithReader(folder: string, email: string) {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folder)}/permissions`;
    let pageToken = '';
    do {
      const query = new URLSearchParams({ supportsAllDrives: 'true', fields: 'nextPageToken,permissions(type,emailAddress,deleted)', pageSize: '100', ...(pageToken ? { pageToken } : {}) });
      const page = await (await this.send(`${url}?${query}`)).json();
      if (page.permissions?.some((p: { type: string; emailAddress?: string; deleted?: boolean }) => !p.deleted && p.type === 'user' && p.emailAddress?.toLowerCase() === email.toLowerCase())) return;
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    await this.send(`${url}?supportsAllDrives=true&sendNotificationEmail=false`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', role: 'reader', emailAddress: email })
    });
  }

  private async send(url: string, init: RequestInit = {}) {
    const response = await this.request(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`);
    return response;
  }

  async save(parent: string, key: string, name: string, content?: Uint8Array, mime = 'application/octet-stream'): Promise<string> {
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const query = new URLSearchParams({
      q: `'${escape(parent)}' in parents and trashed = false and appProperties has { key='surewayKey' and value='${escape(key)}' }`,
      fields: 'files(id)', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true'
    });
    const existing = await (await this.send(`https://www.googleapis.com/drive/v3/files?${query}`)).json();
    if (existing.files?.[0]?.id) return existing.files[0].id;
    const metadata = { name, parents: [parent], appProperties: { surewayKey: key }, mimeType: content ? mime : 'application/vnd.google-apps.folder' };
    if (!content) {
      const folder = await (await this.send('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata)
      })).json();
      if (!folder.id) throw new Error('Google Drive folder ID missing');
      return folder.id;
    }
    const session = await this.send('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': mime }, body: JSON.stringify(metadata)
    });
    const location = session.headers.get('location');
    if (!location || new URL(location).origin !== 'https://www.googleapis.com') throw new Error('Invalid Google Drive upload session');
    const file = await (await this.send(location, {
      method: 'PUT', headers: { 'Content-Type': mime }, body: new Blob([new Uint8Array(content)])
    })).json();
    if (!file.id) throw new Error('Google Drive file ID missing');
    return file.id;
  }
}

export async function connectDrive() {
  const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID } = process.env;
  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN || !GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error('Google Drive is not configured');
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({ client_id: GOOGLE_DRIVE_CLIENT_ID, client_secret: GOOGLE_DRIVE_CLIENT_SECRET, refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN, grant_type: 'refresh_token' })
  });
  if (!response.ok) throw new Error(`Google Drive authorization failed (${response.status})`);
  const token = await response.json();
  if (!token.access_token) throw new Error('Google Drive access token missing');
  return new DriveClient(token.access_token);
}
