import 'server-only';
import { db } from './server';
import { download, type StoredFile } from './files';
import { money, services } from './catalog';
export async function queue(key: string, to: string, subject: string, text: string, phone?: string, files: StoredFile[] = []) {
  const database = await db();
  await database.collection('notification_jobs').updateOne({
    key
  }, {
    $setOnInsert: {
      key,
      to,
      subject,
      text,
      phone,
      files,
      emailSent: !to,
      whatsappSent: !phone,
      createdAt: new Date(),
      attempts: 0,
      status: 'pending'
    }
  }, {
    upsert: true
  });
  try {
    await deliver(key);
  } catch {/* Durable queue is retried by /api/jobs/notifications. */}
}
async function deliver(key: string) {
  const database = await db();
  const job = await database.collection('notification_jobs').findOneAndUpdate({
    key,
    status: 'pending',
    attempts: {
      $lt: 10
    }
  }, {
    $set: {
      status: 'sending',
      lockedAt: new Date()
    },
    $inc: {
      attempts: 1
    }
  }, {
    returnDocument: 'after'
  });
  if (!job) return;
  try {
    const documents = (job.files as StoredFile[]).map(download);
    const body = job.text + (documents.length ? '\n\nYour documents (links expire in 24 hours):\n' + documents.map(f => `${f.name}: ${f.url}`).join('\n') : '');
    if (!job.emailSent) {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error('Email notification provider is not configured');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': job.key
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [job.to],
          subject: job.subject,
          text: body
        })
      });
      if (!res.ok) throw new Error('Email delivery failed');
      await database.collection('notification_jobs').updateOne({
        key
      }, {
        $set: {
          emailSent: true
        }
      });
    }
    if (job.phone && !job.whatsappSent) {
      if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_TEMPLATE_NAME) throw new Error('WhatsApp provider is not configured');
      const res = await fetch(`https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: String(job.phone).replace(/\D/g, '').replace(/^0/, '234'),
          type: 'template',
          template: {
            name: process.env.WHATSAPP_TEMPLATE_NAME,
            language: {
              code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
            },
            components: [{
              type: 'body',
              parameters: [{
                type: 'text',
                text: job.subject
              }, {
                type: 'text',
                text: body.slice(0, 3000)
              }]
            }]
          }
        })
      });
      if (!res.ok) throw new Error('WhatsApp delivery failed');
      await database.collection('notification_jobs').updateOne({
        key
      }, {
        $set: {
          whatsappSent: true
        }
      });
    }
    await database.collection('notification_jobs').updateOne({
      key
    }, {
      $set: {
        status: 'sent',
        sentAt: new Date()
      },
      $unset: {
        lastError: ''
      }
    });
  } catch (e) {
    await database.collection('notification_jobs').updateOne({
      key
    }, {
      $set: {
        status: 'pending',
        lastError: e instanceof Error ? e.message : 'Notification failed'
      }
    });
    throw e;
  }
}
export async function retryNotifications() {
  const database = await db();
  await database.collection('notification_jobs').updateMany({
    status: 'sending',
    lockedAt: {
      $lt: new Date(Date.now() - 300000)
    }
  }, {
    $set: {
      status: 'pending'
    }
  });
  const jobs = await database.collection('notification_jobs').find({
    status: 'pending',
    attempts: {
      $lt: 10
    }
  }).limit(15).toArray();
  const results = await Promise.allSettled(jobs.map(j => deliver(j.key)));
  return {
    processed: jobs.length,
    failed: results.filter(r => r.status === 'rejected').length
  };
}
export async function notifyPaid(order: Record<string, unknown>) {
  const names = (order.services as string[]).map(id => services.find(s => s.id === id)?.name).join(', ');
  await queue(`paid-${order.reference}`, String(order.email), `SureWay: payment received · ${order.reference}`, `Hello ${order.name},\n\nYour payment of ${money(Number(order.total), true)} is confirmed.\nDocuments: ${names}\nVehicle: ${order.make} (${order.plate})\nReference: ${order.reference}\n\nTrack your request at ${process.env.APP_URL} using your reference and email. Our team will follow up with the next steps.`);
  if (process.env.TEAM_EMAIL) await queue(`team-${order.reference}`, process.env.TEAM_EMAIL, `New paid order · ${order.reference}`, `A new paid order is ready for processing. Reference: ${order.reference}. Review it in ${process.env.APP_URL}/admin.`);
}
