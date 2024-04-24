import * as serviceLogger from 'src/services/common/ServiceLogger';
import {ResultCode} from 'src/common/ResponseManager';
import {AwsS3Client} from 'src/common/AwsS3Manager';
import { GetObjectCommand,PutObjectCommand } from '@aws-sdk/client-s3';
import path = require("path");


const CONFIGDATA_PATH_LOCAL = 'PatchInternalHost';
const CONFIGDATA_PATH_REVIEW = 'PatchDevHost';
const CONFIGDATA_PATH_QA = 'PatchQAHost';
const CONFIGDATA_PATH_LIVE = 'PatchLiveHost';

// 클라이언트 설정정보 관리 클래스
export default class ClientConfigManager {

    private _bucketName: string;
    private _baseFilename: string;

    private _configData: object|null;

    constructor(bucketName:string,baseFilename:string) {

        this._bucketName = bucketName;
        this._baseFilename = baseFilename;

        this._configData = null;
    }

    // 클라이언트 설정데이터 얻기(json객체)
    public getConfigData():object|null {

        return this._configData;
    }

    public putConfigData(newConfig:object) {

        this._configData = newConfig;
    }

    public getKeyPath(serverType:string):string {

        let keyPath = CONFIGDATA_PATH_LOCAL;
        if(serverType.toUpperCase() === 'LIVE') {
            keyPath = CONFIGDATA_PATH_LIVE;
        } else if(serverType.toUpperCase() === 'QA') {
            keyPath = CONFIGDATA_PATH_QA;
        } else if(serverType.toUpperCase() === 'REVIEW') {
            keyPath = CONFIGDATA_PATH_REVIEW;
        }

        return keyPath;
    }

    public async downloadFromBucket(serverType:string):Promise<object|null> {

        const keyPath = this.getKeyPath(serverType);

        let resultData:string|null = null;
        try {
            const downParams = {
                Bucket: this._bucketName,
                // Add the required 'Key' parameter using the 'path' module.
                Key: `${keyPath}/${this._baseFilename}`
              };
            const result = await AwsS3Client.send(new GetObjectCommand(downParams));
            const result2:any = await result.Body?.transformToString();
            this._configData = JSON.parse(result2);

        } catch(err) {
            console.log(err);
            this._configData = null;
        }
        return this._configData;
    }

    public async uploadToBucket(serverType:string):Promise<Boolean> {

        const keyPath = this.getKeyPath(serverType);

        try {
            const uploadParams = {
                ACL: "public-read",
                Bucket: this._bucketName,
                // Add the required 'Key' parameter using the 'path' module.
                Key: `${keyPath}/${this._baseFilename}`,
                // Add the required 'Body' parameter
                Body: JSON.stringify(this._configData)
              };
            const resultData = await AwsS3Client.send(new PutObjectCommand(uploadParams));
            console.log("[AWS][S3] uploadToBucket() result=",JSON.stringify(resultData));

        } catch(err) {
            console.log("[AWS][S3] uploadToBucket() err=",err);
            return false;
        }
        return true;
    }
};