import { S3Client } from "@aws-sdk/client-s3";
const {fromIni} = require("@aws-sdk/credential-providers");
const AwsS3Client = new S3Client({
    region: 'ap-northeast-2'
});

// credentials: fromIni({profile: 'gitlab-runner'})
export {AwsS3Client};