import cron from 'node-cron';
import { runGenerateJob } from '../jobs/generate.job.js';
import { runMediaJob } from '../jobs/media.job.js';
import { runPublishJob } from '../jobs/publish.job.js';
import { runEngageJob } from '../jobs/engage.job.js';
import { runReplyJob } from '../jobs/reply.job.js';

export function startScheduler() {
  cron.schedule('0 9 * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runGenerateJob();
      console.log(JSON.stringify({ timestamp, job: 'generate', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'generate', error: e.message }));
    }
  });

  cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runGenerateJob();
      console.log(JSON.stringify({ timestamp, job: 'generate_hourly', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'generate_hourly', error: e.message }));
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runMediaJob();
      console.log(JSON.stringify({ timestamp, job: 'media', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'media', error: e.message }));
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runPublishJob();
      console.log(JSON.stringify({ timestamp, job: 'publish', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'publish', error: e.message }));
    }
  });

  cron.schedule('0 */2 * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runEngageJob();
      console.log(JSON.stringify({ timestamp, job: 'engage', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'engage', error: e.message }));
    }
  });

  cron.schedule('*/15 * * * *', async () => {
    const timestamp = new Date().toISOString();
    try {
      const result = await runReplyJob();
      console.log(JSON.stringify({ timestamp, job: 'reply', result }));
    } catch (e) {
      console.error(JSON.stringify({ timestamp, job: 'reply', error: e.message }));
    }
  });
}
