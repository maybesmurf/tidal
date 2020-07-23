const AWS = require('aws-sdk');
const dispatchJob = require('./lib/dispatchJob');

const db = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

const { CDN_BUCKET, TIDAL_BUCKET, TIDAL_TABLE } = process.env;

module.exports.handler = async ({ Records }) => {
  for (const event of Records) {
    console.log(JSON.stringify(event));
    const oldVideo = AWS.DynamoDB.Converter.unmarshall(event.dynamodb.OldImage);
    const newVideo = AWS.DynamoDB.Converter.unmarshall(event.dynamodb.NewImage);

    if (Object.keys(oldVideo).length && Object.keys(newVideo).length) {
      const versions = Object.values(newVideo.versions)

      for (const version of versions) {
        const [oldVersion] = Object.values(oldVideo.versions).filter((old) => {
          if (old.preset === version.preset) {
            return true;
          }
        })

        console.log(version.preset, oldVersion.segmentsCompleted === newVideo.segmentCount - 1, version.segmentsCompleted === newVideo.segmentCount);

        if ((oldVersion.segmentsCompleted === newVideo.segmentCount - 1) && (version.segmentsCompleted === newVideo.segmentCount)) {
          console.log(`concatinating ${version.preset}`);
          await dispatchJob('concatinating', {
            s3_in: `s3://${TIDAL_BUCKET}/segments/${newVideo.id}/${version.preset}`,
            s3_out: `s3://${CDN_BUCKET}/v/${newVideo.id}/${version.preset}.${version.ext}`,
          });

          await db
            .update({
              Key: { id: newVideo.id },
              TableName: TIDAL_TABLE,
              UpdateExpression: 'set #versions.#preset.#status = :concatinating',
              ExpressionAttributeValues: { ':concatinating': 'concatinating' },
              ExpressionAttributeNames: {
                '#versions': 'versions',
                '#preset': version.preset,
                '#status': 'concatinating',
              },
            })
            .promise();
        }
      }
    }
  }
};
