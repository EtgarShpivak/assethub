import { google } from 'googleapis';
import { Readable } from 'stream';

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

export async function createDriveFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  return res.data.id!;
}

export async function uploadFileToDrive(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  parentFolderId: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [parentFolderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, webViewLink',
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink! };
}

export async function getDriveFileStream(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res.data as Readable;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

export async function listDriveFolder(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, imageMediaMetadata)',
    pageSize: 1000,
  });
  return res.data.files || [];
}

export async function ensureFolderPath(
  rootFolderId: string,
  pathSegments: string[]
): Promise<string> {
  const drive = getDriveClient();
  let currentParentId = rootFolderId;

  for (const segment of pathSegments) {
    const res = await drive.files.list({
      q: `'${currentParentId}' in parents and name = '${segment}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (res.data.files && res.data.files.length > 0) {
      currentParentId = res.data.files[0].id!;
    } else {
      currentParentId = await createDriveFolder(segment, currentParentId);
    }
  }

  return currentParentId;
}
