import { Queue, Worker, QueueScheduler, Job } from 'bullmq'
import { createThumbnail } from '../../jobs/createThumbnail'
import { enqueueWebhook, webhookQueue } from './webhook'

function queueSwitch(job: Job) {
  switch (job.name) {
    case 'thumbnail':
      return createThumbnail(job)
    default:
      console.error(`Job ${job.name} not found in ${job.queueName} queue`)
  }
}

export const thumbnailQueue = new Queue('thumbnail', {
  connection: {
    port: 6379,
    host: 'localhost',
  },
})

export const thumbnailQueueScheduler = new QueueScheduler(thumbnailQueue.name, {
  connection: {
    port: 6379,
    host: 'localhost',
  },
})

export const thumbnailWorker = new Worker(thumbnailQueue.name, async job => queueSwitch(job), {
  limiter: {
    max: 1,
    duration: 1000,
  },
  connection: {
    port: 6379,
    host: 'localhost',
  },
})

thumbnailWorker.on('completed', async job => {
  console.log(`${job.queueName} :: ${job.id} has completed!`)
  enqueueWebhook(job)
})

thumbnailWorker.on('failed', (job, err) => {
  console.log(`${job.queueName} :: ${job.id} has failed with ${err.message}`)
})

thumbnailWorker.on('progress', job => {
  console.log(`${job.queueName} :: ${job.id} has progress of ${job.progress}`)
})
