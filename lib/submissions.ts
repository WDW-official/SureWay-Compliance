import 'server-only';
import { db, hash } from './server';
import { connectDrive } from './drive-client';
import { download, type StoredFile } from './files';
import { queue } from './notifications';

// The work marker is inserted with the submission, so a crash after saving cannot lose it.
// Receipts and archive retries have separate durable progress markers.
export async function processSubmissions() {
  const database = await db();
  const deadline = Date.now() + 150000;
  let processed = 0, failed = 0;
  // Alternate priority so a busy order queue cannot starve enquiry receipts.
  const collections = Math.floor(Date.now() / 60000) % 2 ? ['orders', 'enquiries'] : ['enquiries', 'orders'];
  for (const collection of collections) {
    if (processed) break;
    const records = database.collection(collection);
    const record = await records.findOneAndUpdate({
      submissionState: 'pending',
      $or: [{ submissionLockedUntil: { $exists: false } }, { submissionLockedUntil: { $lt: new Date() } }],
      submissionAttempts: { $lt: 10 }
    }, {
      $set: { submissionLockedUntil: new Date(Date.now() + 15 * 60000) }
    }, { returnDocument: 'after', sort: { createdAt: 1 } });
    if (!record) continue;
    processed++;
    const key = `${collection}-${record._id}`;
    try {
      const reference = record.reference || `ENQ-${record._id}`;
      await queue(`received-${key}`, record.email,
        `SureWay: request received · ${reference}`,
        `Hello ${record.name},\n\nWe have received your ${collection === 'orders' ? 'order details and supporting documents. Payment must be confirmed before processing begins' : record.kind + ' enquiry'}.\nReference: ${reference}\n\nOur team will follow up with the next steps.`, record.phone);

      const drive = await connectDrive();
      const folder = await drive.save(process.env.GOOGLE_DRIVE_FOLDER_ID!, key, `${reference} - ${record.name}`);
      // Export only customer submission fields; access tokens and internal job data stay in MongoDB.
      const fields = ['name', 'email', 'phone', 'reference', 'kind', 'company', 'fleetSize', 'message', 'documents', 'services', 'vehicleType', 'make', 'plate', 'delivery', 'address', 'channel', 'pricing', 'total', 'createdAt', 'consent'];
      const details = Object.fromEntries(fields.filter(f => record[f] !== undefined && (f !== 'documents' || collection === 'enquiries')).map(f => [f, record[f]]));
      const detailsId = await drive.save(folder, `${key}-details`, 'submission.json', Buffer.from(JSON.stringify(details, null, 2)), 'application/json');
      const driveFiles: Record<string, { id: string; name: string }> = { ...record.driveFiles };
      for (const file of (record.uploads || []) as StoredFile[]) {
        const fileKey = hash(`${key}-${file.publicId}`);
        if (driveFiles[fileKey]) continue;
        if (Date.now() >= deadline) {
          // Continue a large archive on the next cron invocation, without counting a failure.
          await records.updateOne({ _id: record._id }, { $unset: { submissionLockedUntil: '' } });
          return { processed, failed };
        }
        const response = await fetch(download(file).url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('Supporting document download failed');
        const content = new Uint8Array(await response.arrayBuffer());
        if (content.length !== file.bytes || content.length > 10 * 1024 * 1024) throw new Error('Supporting document size mismatch');
        const id = await drive.save(folder, fileKey, file.name, content);
        driveFiles[fileKey] = { id, name: file.name };
        await records.updateOne({ _id: record._id }, { $set: { [`driveFiles.${fileKey}`]: driveFiles[fileKey] }, $addToSet: { archivedFileKeys: fileKey } });
      }
      await drive.shareWithReader(folder, record.email);
      const links = [{ id: detailsId, name: 'Submission details' }, ...Object.values(driveFiles)]
        .map(file => `${file.name}: https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`).join('\n');
      // Persist the email before marking the archive complete. Its stable key prevents repeat emails on retry.
      await queue(`drive-ready-${key}`, record.email, `SureWay: your Google Drive files · ${reference}`,
        `Hello ${record.name},\n\nYour submission has been saved to Google Drive.\nReference: ${reference}\n\n${links}\n\nSubmission folder: https://drive.google.com/drive/folders/${encodeURIComponent(folder)}\n\nAccess is shared with ${record.email}. Open these links using that account.\n\nThe SureWay team`);
      await records.updateOne({ _id: record._id }, {
        $set: { submissionState: 'archived', driveFolderId: folder, archivedAt: new Date() },
        $unset: { submissionError: '', submissionLockedUntil: '' }
      });
    } catch (error) {
      failed++;
      await records.updateOne({ _id: record._id }, {
        $set: { submissionError: error instanceof Error ? error.message : 'Submission delivery failed' },
        $inc: { submissionAttempts: 1 },
        // Leave the lease in place as a retry delay, preventing a tight retry loop.
      });
    }
  }
  return { processed, failed };
}
