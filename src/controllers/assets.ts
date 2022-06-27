import Joi from 'joi'
import { v4 as uuidv4 } from 'uuid'
import { getQueueByName } from '../config/queues'
import { ImportAssetData, ThumbnailJobData } from '../types'

export async function createAssetThumbnail(req, res) {
  const { assetId } = req.params

  const schema = Joi.object({
    output: Joi.string().uri().required(),
    width: Joi.number().min(1).max(10000).required(),
    height: Joi.number().min(1).max(10000).required(),
    fit: Joi.string().uri().default('cover').valid('cover', 'contain', 'fill', 'inside', 'outside'),
  })

  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
  })
  if (error) return res.status(400).json(error)

  const thumbnailJob: ThumbnailJobData = {
    assetId,
    fit: value.fit,
    width: value.width,
    height: value.height,
    output: value.output.replace('$assetId', assetId).replace('$id', uuidv4()),
  }

  const queue = getQueueByName('thumbnail')
  if (queue) await queue.queue.add('thumbnail', thumbnailJob)
  return res.sendStatus(202)
}

export async function createAsset(req, res) {
  const schema = Joi.object({
    input: Joi.string().uri().required(),
    output: Joi.string().uri().required(),
  })

  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
  })
  if (error) return res.status(400).json(error)

  const importId = uuidv4()
  const importAssetJob: ImportAssetData = {
    id: importId,
    input: value.input,
    output: value.output.replace('$id', importId),
  }

  const importQueue = getQueueByName('import')
  if (importQueue) await importQueue.queue.add('import', importAssetJob)

  return res.json({ id: importId })
}
