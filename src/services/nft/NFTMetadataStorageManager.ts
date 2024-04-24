import * as serviceLogger from 'src/services/common/ServiceLogger';
import {ResultCode} from 'src/common/ResponseManager';
import {AwsS3Client} from 'src/common/AwsS3Manager';
import { GetObjectCommand,PutObjectCommand,PutObjectAclCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path = require("path");

export const NFTSTORAGE_ACL_PUBLIC = "public-read";
export const NFTSTORAGE_ACL_PRIVATE = "bucket-owner-read";

// 클라이언트 설정정보 관리 클래스
export default class NFTMetadataStorageManager {

    private _bucketName: string;

    constructor(bucketName:string) {

        this._bucketName = bucketName;
    }

    public async downloadFromBucket(keyPath:string, filename:string):Promise<object|null> {

        return new Promise((resolve) => {
            let resultData:string|null = null;
            let jsonData = null;
            try {
                const downParams = {
                    Bucket: this._bucketName,
                    // Add the required 'Key' parameter using the 'path' module.
                    Key: `${keyPath}/${filename}`
                  };
                  
                console.log("[AWS][S3] downParams=",downParams);
                AwsS3Client.send(new GetObjectCommand(downParams)).then(function(value) {
                    console.log('value=',value);
                    resolve(value);

                }).catch(function(err) {
                    console.log('err=',err);
                    resolve(null);
                });
                // const result2:any = await result.Body?.transformToString();
                // jsonData = JSON.parse(result2);
    
            } catch(err) {
                console.log(err);
            }
            return jsonData;
        });
    }

    public async uploadToBucket(keyPath:string, filename:string, initACLString:string, metadata:any, options:any):Promise<Boolean> {

        return new Promise((resolve, reject) => {

            const uploadParams = {
                ACL: initACLString, // ACL: "private", "public-read", "public-read-write", "bucket-owner-read"
                Bucket: this._bucketName,
                // Add the required 'Key' parameter using the 'path' module.
                Key: `${keyPath}/${filename}`,
                // Add the required 'Body' parameter
                Body: metadata
              };

            console.log("[AWS][S3] uploadParams=",uploadParams);
            AwsS3Client.send(new PutObjectCommand(uploadParams)).then(function(value) {
                console.log("[AWS][S3]  uploadToBucket() complete("+options.index+")");
                resolve(true);

            }).catch(function(err) {
                console.log("[AWS][S3]  uploadToBucket() failed("+options.index+"):err=",JSON.stringify(err,null,2));
                console.log("[AWS][S3]  uploadToBucket() filename=",filename);
                reject(false);
            });
        });
    }

    public async changeMetadataACL(keyPath:string, filename:string, aclString:string):Promise<Boolean> {

        try {
            const aclParams = {
                ACL: aclString, // ACL: "private", "public-read", "public-read-write", "bucket-owner-read"
                Bucket: this._bucketName,
                // Add the required 'Key' parameter using the 'path' module.
                Key: `${keyPath}/${filename}`
              };
            const resultData = await AwsS3Client.send(new PutObjectAclCommand(aclParams));
            console.log("[AWS][S3] changeMetadataACL() result=",JSON.stringify(resultData));

        } catch(err) {
            console.log("[AWS][S3] changeMetadataACL() err=",err);
            return false;
        }
        return true;
    }
};