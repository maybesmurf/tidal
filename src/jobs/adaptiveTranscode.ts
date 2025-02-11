import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'
import { ffmpeg } from '../lib/ffmpeg'
import { PACKAGE_DIR, shaka } from '../lib/packaging'
import { downloadFile, s3URI, uploadDir } from '../lib/s3'
import { AdaptiveTranscodeJob, AdaptiveTranscodeType } from '../types'

export async function adaptiveTranscodeJob(job: AdaptiveTranscodeJob) {
  console.log(chalk.blue('transcode job starting...'))
  const { input, transcodeCommands, packagingCommand, output } = job.data

  console.info(chalk.blue('creating temporary directory'))
  const tmpDir = await fs.mkdtemp('/tmp/tidal-transcode-')

  const audioTranscodes = transcodeCommands.filter(
    ({ type }) => type === AdaptiveTranscodeType.audio
  )
  const videoTranscodes = transcodeCommands.filter(
    ({ type }) => type === AdaptiveTranscodeType.video
  )

  try {
    console.info(chalk.blue('downloading source material'))
    const sourceFilePath = `${tmpDir}/${path.basename(input)}`
    await downloadFile(sourceFilePath, input)

    let progressInt = 0

    for (const audioTranscode of audioTranscodes) {
      console.info(chalk.blue(`processing ${audioTranscode.type} transcode`))
      console.info(chalk.blue(`running command: ${audioTranscode.cmd}`))
      await ffmpeg(`-i ${sourceFilePath} ${audioTranscode.cmd} ${audioTranscode.outputFilename}`, {
        cwd: tmpDir,
      })
      progressInt++
      await job.updateProgress((progressInt / transcodeCommands.length) * 100)
    }

    for (const videoTranscode of videoTranscodes) {
      console.info(chalk.blue(`processing ${videoTranscode.type} transcode`))
      console.info(chalk.blue(`running command: ${videoTranscode.cmd}`))
      await ffmpeg(`-i ${sourceFilePath} ${videoTranscode.cmd} ${videoTranscode.outputFilename}`, {
        cwd: tmpDir,
      })
      progressInt++
      await job.updateProgress((progressInt / transcodeCommands.length) * 100)
    }

    console.info(chalk.blue(`packaging assets`))
    console.info(chalk.blue(`running command: ${packagingCommand}`))
    await shaka(packagingCommand, { cwd: tmpDir })

    console.info(chalk.blue(`uploading assets to destination`))
    await uploadDir(`${tmpDir}/${PACKAGE_DIR}`, s3URI(output).Key, s3URI(output).Bucket)

    console.info(chalk.blue(`finished adaptive transcode`))
  } catch (error) {
    console.error(chalk.red(error))
    throw error
  } finally {
    await job.updateProgress(100)
    console.info(chalk.blue(`removing ${tmpDir}`))
    await fs.remove(tmpDir)
  }
}
