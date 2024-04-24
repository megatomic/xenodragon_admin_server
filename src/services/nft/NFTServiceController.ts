import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,getResultForm,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as constants from 'src/common/constants';
import * as nftDataHandler from './NFTServiceDataHandler';
import * as settingDataHandler from '../settings/SettingServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as walletDataHandler from 'src/services/wallet/WalletServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as ndo from 'src/services/nft/NFTDataObject';
import * as sdo from 'src/services/settings/SettingDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as Utils from 'src/common/Utils';
import axios from 'axios';
import path from 'path';

import {processMinting,processNFTTransfer,processNFTList,processOwnerOfNFT,processHugeNFTList,processMetadataBaseURI} from 'src/services/common/NFTContractManager';
import NFTMetadataStorageManager,{NFTSTORAGE_ACL_PUBLIC,NFTSTORAGE_ACL_PRIVATE} from './NFTMetadataStorageManager';
import { Result } from 'ethers';

require('dotenv').config();

const NFT_SEASON_NO = 2; // 2차 민팅
export const NFT_IMAGE_DRAGON_BASEURI = 'https://nstep-xeno-nft.s3.ap-northeast-2.amazonaws.com/images/dragon/{fileId}.gif';
export const NFT_IMAGE_GEAR_BASEURI = 'https://nstep-xeno-nft.s3.ap-northeast-2.amazonaws.com/images/gear/{fileId}.gif';

let metadataStorageManager:NFTMetadataStorageManager = new NFTMetadataStorageManager("nstep-xeno-nft");

//console.log("configData=",clientConfigManager.getConfigData());


const router = Router();

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessNotificationRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

    // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
    let resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req,res, sqlDataManager,<string>reqInfo.adminID,<string>reqInfo.authToken);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    // DB로부터 계정 조회
    resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqInfo.adminID);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;
    
    // 로그인 유저가 policyType 권한이 있는지 체크
    if(aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo,policyKey) === false) {
        resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()];
    }

    return resultInfo;
}

const requestNFTAttributesCreationToGameServer = async (serverType:string,groupID:number,nftType:string,attrIDList:any):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    try {
        // let targetURL = cmnSvcProcessor.getGameServerURL(serverType,'/Resource/Dragons/Generates/k-stadium/xenonft');
        // if(nftType !== 'Dragon') {
        //     targetURL = cmnSvcProcessor.getGameServerURL(serverType,'/Resource/Gears/Generates/k-stadium/xenonft');
        // }

        // 속성 검증을 위한 새로운 게임서버 URL을 호출.
        let targetURL = cmnSvcProcessor.getGameServerURL(serverType,`/Resource/Dragons/GeneratesEx/k-stadium/xenonft/${groupID}`);
        if(nftType.toUpperCase() !== 'DRAGON') {
            targetURL = cmnSvcProcessor.getGameServerURL(serverType,`/Resource/Gears/GeneratesEx/k-stadium/xenonft/${groupID}`);
        }
    
        const attrIDQtyPairList:any[] = [];
        for(let attrIDQtyPair of attrIDList) {
            attrIDQtyPairList.push({"GroupID":groupID,"AttributeID":attrIDQtyPair.attributeID,"Level":0, "PressCount":attrIDQtyPair.qty});
        }

        console.log('[GAME SERVER] attrIDQtyPairList=',attrIDQtyPairList);
        console.log('[GAME SERVER] targetURL=',targetURL);
    
        const res = await axios.post(targetURL,attrIDQtyPairList,{ headers: {'Content-type': 'application/json'} });
        console.log('[GAME SERVER] response=',res);

        if(res.status !== 200) {
            resultInfo.resultCode = ResultCode.ADMINAPI_NFT_GENERATEFAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_GENERATEFAILED.toString()];
            resultInfo.data = {status:res.status};
        } else {
            resultInfo.data = res.data.responseList;
        }
        
      } catch(err) {
        console.log(err);
    
        resultInfo.resultCode = ResultCode.ADMINAPI_NFT_GENERATEFAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_GENERATEFAILED.toString()];
        resultInfo.data = err;
      }

      return resultInfo;
};

// NFT속성 생성 요청
const makeNFTAttrInfoListFromRaw = (reqGroupID:number,nftAttrList:any): any => {

    console.log('nftAttrList=',JSON.stringify(nftAttrList,null,2));
    
    const resultList:ndo.NFTAttributeInfo[] = [];
    const resultList2:object[] = [];

    let nftAttrInfo:ndo.NFTAttributeInfo;
    let traitList:any[];
    let traitInfo:any;
    let gearPartType;
    let itemGrade;
    for(let attrInfo of nftAttrList) {
        const tokenIDList = [];
        for(let assetInfo of attrInfo.assetInfos) {
            traitList = [];
            gearPartType = 0;
            itemGrade='';
            for(let tinfo of assetInfo.assetProperties) {
                traitInfo = {
                    traitType:tinfo.traitName,
                    level:tinfo.level,
                    value:tinfo.traitValue,
                    displayType:tinfo.displayType,
                    maxValue:tinfo.maxValue
                };
                traitList.push(traitInfo);

                if(tinfo.traitName.trim().toUpperCase() === 'GRADE') {
                    itemGrade = tinfo.traitValue.trim().toUpperCase();
                }
                if(tinfo.traitName.trim().toUpperCase() === 'PART') {
                    const traitValue = tinfo.traitValue.trim().toUpperCase();
                    if(traitValue === 'BODY') {
                        gearPartType = 1;
                    } else if(traitValue === 'WING') {
                        gearPartType = 2;
                    } else if(traitValue === 'TAIL') {
                        gearPartType = 3;
                    }
                }
            }

            nftAttrInfo = {
                reqGroupID:reqGroupID,
                tokenId: assetInfo.tokenId,
                packageId:'0',
                attributeId: attrInfo.attributeId.toString(),
                itemType: (assetInfo.itemType.toUpperCase() === "DRAGON" ? 0 : 1),
                grade:itemGrade,
                partType: gearPartType,
                metadata: {
                    name:assetInfo.assetMetas[0].assetName,
                    desc:assetInfo.assetMetas[0].assetDesc,
                    imageURL:assetInfo.assetMetas[0].assetImage,
                    animationURL:(assetInfo.assetMetas[0].assetAni===null?"":assetInfo.assetMetas[0].assetAni),
                    externalURL:(assetInfo.assetMetas[0].assetExt===null?"":assetInfo.assetMetas[0].assetExt),
                    attributes:traitList
                },
                boxID:0
            };
    
            tokenIDList.push(assetInfo.tokenId);

            resultList.push(nftAttrInfo);
        }
        resultList2.push({attributeID:attrInfo.attributeId,tokenIDList:[...tokenIDList]});
    }

    return [resultList,resultList2];
}

// 2차 민팅시 드래곤의 경우만 4개의 그룹으로 나누고 각 그룹별 등급비율이 일정하게 배치!!
const makeDragonGroupTable = (nftAttrList:any):any => {
            
    console.log("==== makeDragonGroupTable() ====");
    // console.log("nftAttrList=",JSON.stringify(nftAttrList,null,2));

    const groupSSR = [];
    const groupSR = [];
    const groupR = [];
    const groupA = [];
    for(let i=0;i<nftAttrList.length;i++) {
        if(nftAttrList[i].grade.toUpperCase() === "SSR") {
            groupSSR.push(nftAttrList[i]);
        } else if(nftAttrList[i].grade.toUpperCase() === "SR") {
            groupSR.push(nftAttrList[i]);
        } else if(nftAttrList[i].grade.toUpperCase() === "R") {
            groupR.push(nftAttrList[i]);
        } else if(nftAttrList[i].grade.toUpperCase() === "A") {
            groupA.push(nftAttrList[i]);
        }
    }

    // console.log(`groupSSR=${JSON.stringify(groupSSR)}`);
    // console.log(`groupSR=${JSON.stringify(groupSR)}`);
    // console.log(`groupR=${JSON.stringify(groupR)}`);
    // console.log(`groupA=${JSON.stringify(groupA)}`);

    const groupTable1 = [];
    const groupTable2 = [];
    const groupTable3 = [];
    const groupTable4 = [];
    const numSSR = Math.floor(groupSSR.length/4);
    const numSR = Math.floor(groupSR.length/4);
    const numR = Math.floor(groupR.length/4);
    const numA = Math.floor(groupA.length/4);
    let randTable = [1,2,0,3];
    for(let i=0;i<4;i++) {
        for(let j=0;j<numSSR;j++) {
            if(i === 0) {
                groupTable1.push(groupSSR[randTable[i]*numSSR+j]);
            } else if(i === 1) {
                groupTable2.push(groupSSR[randTable[i]*numSSR+j]);
            } else if(i === 2) {
                groupTable3.push(groupSSR[randTable[i]*numSSR+j]);
            } else {
                groupTable4.push(groupSSR[randTable[i]*numSSR+j]);
            }
        }
    }
    randTable = [2,0,3,1];
    for(let i=0;i<4;i++) {
        for(let j=0;j<numSR;j++) {
            if(i === 0) {
                groupTable1.push(groupSR[randTable[i]*numSR+j]);
            } else if(i === 1) {
                groupTable2.push(groupSR[randTable[i]*numSR+j]);
            } else if(i === 2) {
                groupTable3.push(groupSR[randTable[i]*numSR+j]);
            } else {
                groupTable4.push(groupSR[randTable[i]*numSR+j]);
            }
        }
    }
    randTable = [3,2,0,1];
    for(let i=0;i<4;i++) {
        for(let j=0;j<numR;j++) {
            if(i === 0) {
                groupTable1.push(groupR[randTable[i]*numR+j]);
            } else if(i === 1) {
                groupTable2.push(groupR[randTable[i]*numR+j]);
            } else if(i === 2) {
                groupTable3.push(groupR[randTable[i]*numR+j]);
            } else {
                groupTable4.push(groupR[randTable[i]*numR+j]);
            }
        }
    }
    randTable = [0,2,1,3];
    for(let i=0;i<4;i++) {
        for(let j=0;j<numA;j++) {
            if(i === 0) {
                groupTable1.push(groupA[randTable[i]*numA+j]);
            } else if(i === 1) {
                groupTable2.push(groupA[randTable[i]*numA+j]);
            } else if(i === 2) {
                groupTable3.push(groupA[randTable[i]*numA+j]);
            } else {
                groupTable4.push(groupA[randTable[i]*numA+j]);
            }
        }
    }

    console.log('groupTable1=',JSON.stringify(groupTable1,null,2));
    console.log('groupTable2=',JSON.stringify(groupTable2,null,2));
    console.log('groupTable3=',JSON.stringify(groupTable3,null,2));
    console.log('groupTable4=',JSON.stringify(groupTable4,null,2));

    const resultTable = [];
    for(let i=0;i<groupTable1.length;i++) {
        resultTable.push({...groupTable1[i],boxID:1});
    }
    for(let i=0;i<groupTable2.length;i++) {
        resultTable.push({...groupTable2[i],boxID:2});
    }
    for(let i=0;i<groupTable3.length;i++) {
        resultTable.push({...groupTable3[i],boxID:3});
    }
    for(let i=0;i<groupTable4.length;i++) {
        resultTable.push({...groupTable4[i],boxID:4});
    }

    console.log('resultTable=',JSON.stringify(resultTable,null,2));

    return resultTable;
};

const generateNFTAttributes = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] generateNFTAttributes()");

    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToGenerateNFTAttrsInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqGenerateNFTAttrsInfo:ndo.ReqGenerateNFTAttrsInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqGenerateNFTAttrsInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqGenerateNFTAttrsInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        let internalPropInfo = null;
        let propInfo1 = null;
        let propInfo2 = null;
        let dbQueryInfo = null;
        if(reqGenerateNFTAttrsInfo.groupID === undefined || reqGenerateNFTAttrsInfo.groupID === 0 || reqGenerateNFTAttrsInfo.packageType === 1) {
            dbQueryInfo = await settingDataHandler.queryDBInternalPropInfo(sqlDataManager);
            if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
                return;
            }
    
            internalPropInfo = dbQueryInfo.data;

            // 모든 서버에서 가져온 req_group_id값중 가장 큰 값을 최종 group_id로 사용!
            propInfo1 = sdo.getInternalPropInfo(internalPropInfo,"req_group_id_counter");
            propInfo2 = sdo.getInternalPropInfo(internalPropInfo,"package_id_counter");
        }

        // 내부 관리 테이블에서 가장 최근 갱신된 group_id 값을 가져옴.
        if(reqGenerateNFTAttrsInfo.groupID === undefined || reqGenerateNFTAttrsInfo.groupID === 0) {
            reqGenerateNFTAttrsInfo.groupID = propInfo1!.propInt;
            propInfo1!.propInt = propInfo1!.propInt+1;
            sdo.setInternalPropInfo(internalPropInfo,"req_group_id_counter",propInfo1!.propInt,propInfo1!.propString,propInfo1!.propData);
        }

        // 게임서버에 NFT속성정보 생성 요청하기
        resultInfo = await requestNFTAttributesCreationToGameServer(reqGenerateNFTAttrsInfo.serverType,reqGenerateNFTAttrsInfo.groupID,reqGenerateNFTAttrsInfo.nftType,reqGenerateNFTAttrsInfo.attrIDList);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }
        
        let [nftAttrList,tokenIDListTable] = makeNFTAttrInfoListFromRaw(reqGenerateNFTAttrsInfo.groupID,resultInfo.data);

        // 패키지 구성(드래곤1+기어4)이 설정되어 있다면,
        const packageIDTable = [];
        if(reqGenerateNFTAttrsInfo.packageType === 1) {
            
            for(let i=0;i<nftAttrList.length;i++) {
                if(reqGenerateNFTAttrsInfo.packageIDTable.length !== nftAttrList.length || nftAttrList[i].itemType === 0) { // 드래곤일 경우 패키지ID 새로 생성
                    nftAttrList[i].packageId = propInfo2!.propInt.toString();
                    packageIDTable.push(nftAttrList[i].packageId);
                    propInfo2!.propInt++;
                } else { 
                    nftAttrList[i].packageId = reqGenerateNFTAttrsInfo.packageIDTable[i];
                    packageIDTable.push(reqGenerateNFTAttrsInfo.packageIDTable[i]);
                }

                console.log('packageID:',nftAttrList[i].packageId,', tokenId:',nftAttrList[i].tokenId,', type:',nftAttrList[i].itemType);
            }

            sdo.setInternalPropInfo(internalPropInfo,"package_id_counter",propInfo2!.propInt,propInfo2!.propString,propInfo2!.propData);
        }

        let dbUpdateInfo = null;
        if(internalPropInfo !== null) {
            dbUpdateInfo = await settingDataHandler.updateDBInternalPropInfo(sqlDataManager,internalPropInfo);
            if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
                return;
            }
        }

        // NFT 속성데이터를 DB에 저장.
        dbQueryInfo = await nftDataHandler.insertDBNFTItemList(sqlDataManager,reqGenerateNFTAttrsInfo,nftAttrList);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // 마지막 속성생성 요청이 완료되면 민팅정보를 DB에 저장.
        dbUpdateInfo= getResultForm(0,"",{insertId:-1});

        let logID = -1;
        if(reqGenerateNFTAttrsInfo.finalReq === true) {
            let packageInfoTable:any = [];
            if(reqGenerateNFTAttrsInfo.packageType === 1) {

                //console.log('reqMintNFTInfo.packageIDTable=',JSON.stringify(reqMintNFTInfo.packageIDTable,null,2));
                const resultInfo2 = await nftDataHandler.queryDBPackageInfoList(sqlDataManager, reqGenerateNFTAttrsInfo.groupID.toString(), packageIDTable);
                if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
                    cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
                    return;
                }
                packageInfoTable = resultInfo2.data;
            }

            const attrIDList:any = reqGenerateNFTAttrsInfo.totalAttrIDList;
            const attrInfoTable = [];
            for(let attrInfo of attrIDList) {
                attrInfoTable.push({attributeID:attrInfo.attributeID,type:reqGenerateNFTAttrsInfo.nftType,qty:attrInfo.qty,grade:attrInfo.grade});
            }

            const actLogInfo:ndo.ActivityLogInfo = {
                logID:-1,
                reqGroupID: reqGenerateNFTAttrsInfo.groupID.toString(),
                activityType: constants.NFT_ACTIVITYTYPE_MINTING,
                activityCount: reqGenerateNFTAttrsInfo.mintingCount,
                desc: reqGenerateNFTAttrsInfo.desc,
                quantity: reqGenerateNFTAttrsInfo.totalTokenNum,
                data: JSON.stringify(attrInfoTable),
                creationTime:"",
                targetAddress:"",
                packageType: reqGenerateNFTAttrsInfo.packageType,
                packageData: JSON.stringify(packageInfoTable),
                state:1
            };
            dbUpdateInfo = await nftDataHandler.insertDBNFTActLogInfo(sqlDataManager, actLogInfo);
            if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
                return;
            }

            logID = dbUpdateInfo.data.insertId;

            if(reqGenerateNFTAttrsInfo.nftType.toUpperCase() === 'DRAGON' && Math.floor(attrIDList.length/4)*4 === attrIDList.length) {
                const updatedBoxInfoList = makeDragonGroupTable(attrIDList);
                dbUpdateInfo = await nftDataHandler.updateDBNFTItemBoxID(sqlDataManager,reqGenerateNFTAttrsInfo.groupID, reqGenerateNFTAttrsInfo.mintingCount, updatedBoxInfoList);
                if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
                    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
                    return;
                }
            }
            //console.log('dbUpdateInfo=',dbUpdateInfo);
        }

        dbQueryInfo.data = {logID,reqGroupID:reqGenerateNFTAttrsInfo.groupID,totalNum:nftAttrList.length,packageIDTable,tokenIDListTable};

        // 환경설정 조회 활동로그 DB에 저장
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqGenerateNFTAttrsInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_CREATE,"");

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] generateNFTAttributes()");
};
router.post('/nftattrs/generate', generateNFTAttributes);

const reallocatePackageIDToMintingInfo = (orgPackageID:number, orgActLogInfo:ndo.ActivityLogInfo, orgItemInfoList:any[]): ResultInfo => {

    let packageID = orgPackageID;
    const tokenPackageIDTable = [];
    const actLogInfo = {...orgActLogInfo};
    const itemInfoList = [...orgItemInfoList];

    const packageInfoTable = JSON.parse(actLogInfo.packageData);

    // nft_log_info 테이블에서 해당 민팅항목 레코드의 package_data값을 보정.
    for(let packageInfo of packageInfoTable) {
        packageInfo.packageID = packageID;
        for(let tokenID of packageInfo.tokenIDTable) {
            tokenPackageIDTable.push({tokenID,packageID});
        }
        packageID++;
    }

    actLogInfo.packageData = JSON.stringify(packageInfoTable);

    // nft_item_info 테이블에서 해당 각 레코드의 패키지ID값 보정.
    for(let itemInfo of itemInfoList) {
        for(let item of tokenPackageIDTable) {
            if(item.tokenID === itemInfo.tokenID) {
                itemInfo.packageID = item.packageID;
            }
        }
    }

    const resultInfo = getResultForm(ResultCode.SUCCESS,"",{newPackageID:packageID,newActLogInfo:actLogInfo,newItemInfoList:itemInfoList});
    return resultInfo;
};

// 민팅중인 정보를 타 서버DB로 복사
const copyMintingInfoToServer = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] copyMintingInfoToServer()");

    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToCopyMintingInfoToServer(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqCopyMintingInfoToServer:ndo.ReqCopyMintingInfoToServer = resultInfo.data;

        // 복사할 타겟 서버 DB에 이미 해당 groupID로 민팅된 항목이 있을 수 있음.
        // 따라서, 모든 서버DB에 저장된 req_group_id_counter중에서 가장 큰 값을 선택.
        // 소스 서버DB에서 가져온 데이터에 새 groupID를 부여한 뒤, 타겟 서버DB에 저장.
        
        const serverTypeTable = [constants.SERVER_TYPE_INTERNAL,constants.SERVER_TYPE_QA,constants.SERVER_TYPE_REVIEW,constants.SERVER_TYPE_LIVE];
        for(let i=0;i<serverTypeTable.length;i++) {
            if(serverTypeTable[i] === reqCopyMintingInfoToServer.serverType.toUpperCase()) {
                serverTypeTable.splice(i,1);
            }
        }
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqCopyMintingInfoToServer.serverType);
        const targetSQLDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqCopyMintingInfoToServer.targetServerType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqCopyMintingInfoToServer, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        let dbQueryInfo = await settingDataHandler.queryDBInternalPropInfo(sqlDataManager);
        let dbQueryInfo1 = await settingDataHandler.queryDBInternalPropInfo(targetSQLDataManager);

        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS || dbQueryInfo1.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // 타겟 서버 DB의 req_group_id값 타겟 group_id로 사용!
        let targetInternalPropList = dbQueryInfo1.data;
        let propInfo = sdo.getInternalPropInfo(dbQueryInfo.data,"req_group_id_counter");
        let targetPropInfo = sdo.getInternalPropInfo(targetInternalPropList,"req_group_id_counter");
        let targetPropInfo2 = sdo.getInternalPropInfo(targetInternalPropList,"package_id_counter");
        let targetPropInfo3 = sdo.getInternalPropInfo(targetInternalPropList,"minting_counter");

        const orgGroupID = reqCopyMintingInfoToServer.groupID;
        let targetGroupID = targetPropInfo!.propInt;
        let targetMintingCount = targetPropInfo3!.propInt;


        // logID에 해당하는 민팅정보를 DB에서 조회
        resultInfo = await nftDataHandler.queryDBNFTActLog(sqlDataManager,reqCopyMintingInfoToServer.logID);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        let actLogInfo = resultInfo.data;
        actLogInfo.reqGroupID = targetGroupID;
        actLogInfo.activityCount = targetMintingCount;
        
        console.log('actLogInfo=',actLogInfo);

        // groupID에 해당하는 속성&토큰정보를 DB에서 조회.
        let resultInfo2 = await nftDataHandler.queryDBGroupNFTTokenList(sqlDataManager,orgGroupID,-1,-1);
        if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
            return;
        }

        // 조회한 항목에 대해 req_group_id값만 위에서 구한 최신값으로 변경.(타겟 DB에 이미 존재하는 req_group_id가 있으면 않됨)
        let itemInfoList = resultInfo2.data.itemInfoList;
        for(let itemInfo of itemInfoList) {
            itemInfo.reqGroupID = targetGroupID;
            itemInfo.mintingCount = targetMintingCount;
        }

        if(actLogInfo.packageType === 1) { // 민팅타입이 '패키지'이면,
            // 기존에 생성된 토큰ID가 패키지에 묶여 있다면 타겟 DB에 복사시, 타겟 DB의 package_id_counter값을 기반으로 재할당 해주어야 기존 것과 겹칠 일이 없음.
            let targetPackageID = targetPropInfo2!.propInt;
            resultInfo = reallocatePackageIDToMintingInfo(targetPackageID,actLogInfo,itemInfoList);
            if(resultInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
                return;
            }

            targetPackageID = resultInfo.data.newPackageID;
            actLogInfo = resultInfo.data.newActLogInfo;
            itemInfoList = resultInfo.data.newItemInfoList;

            sdo.setInternalPropInfo(targetInternalPropList,"package_id_counter",targetPackageID,targetPropInfo2!.propString,targetPropInfo2!.propData);
        }

        // S3 업로드 및 민팅 처리가 해당 플랫폼에서 않되었으므로 무조건 1단계로 설정.
        actLogInfo.state = 1;

        // 타겟 서버DB로 ActLog 정보를 복사.
        resultInfo = await nftDataHandler.insertDBNFTActLogInfo(targetSQLDataManager,actLogInfo);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 타겟 서버DB에 복사될 각 아이템도 1단계로 설정.
        for(let itemInfo of itemInfoList) {
            itemInfo.state = 0;
        }

        // 타겟 서버DB로 생성된 속성및 토큰 정보를 복사.

        console.log("itemInfoList=",JSON.stringify(itemInfoList,null,2));
        resultInfo = await nftDataHandler.insertDBGroupNFTTokenList(targetSQLDataManager,itemInfoList);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 타겟 groupID값 및 minting count값을 타겟 서버DB에 저장.
        targetMintingCount++;
        sdo.setInternalPropInfo(targetInternalPropList,"minting_counter",targetMintingCount,targetPropInfo3!.propString,targetPropInfo3!.propData);

        targetGroupID++;
        sdo.setInternalPropInfo(targetInternalPropList,"req_group_id_counter",targetGroupID,targetPropInfo!.propString,targetPropInfo!.propData);
        let dbUpdateInfo = await settingDataHandler.updateDBInternalPropInfo(targetSQLDataManager,targetInternalPropList);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
            return;
        }

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(targetSQLDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] copyMintingInfoToServer()");
}
router.post('/mintinfo/copy', copyMintingInfoToServer);

// 민팅중인 정보 삭제
const deleteMintingLogAndData = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] deleteMintingLogAndData()");

    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToDeleteActLogAndData(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqDeleteActLogAndData:ndo.ReqDeleteActLogAndData = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqDeleteActLogAndData.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqDeleteActLogAndData, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // logID에 해당하는 민팅정보를 DB에서 조회
        resultInfo = await nftDataHandler.queryDBNFTActLog(sqlDataManager,reqDeleteActLogAndData.logID);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const actLogInfo = resultInfo.data;

        // 이미 민팅이 완료된 항목은 삭제 불가 처리!!
        if(actLogInfo.state === 0) {
            resultInfo.resultCode = ResultCode.NFT_MINTINGLIST_CANT_DELETE_MINTEDITEM;
            resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        
        } else {
            resultInfo = await nftDataHandler.deleteDBNFTActLog(sqlDataManager,reqDeleteActLogAndData.logID);

            // NFT DB에서 속성데이터를 삭제.
            const dbQueryInfo = await nftDataHandler.deleteDBNFTItemList(sqlDataManager,actLogInfo.reqGroupID,-1);
            if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
                return;
            }

            if(actLogInfo.state === 1) { // 속성생성 단계까지 완료한 경우

            } else if(actLogInfo.state === 2) { // 메타데이터 업로드 단계까지 완료한 경우

            }
        }

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] deleteMintingLogAndData()");
}
router.post('/actlog/delete', deleteMintingLogAndData);

// NFT 속성 삭제
const deleteNFTAttributes = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] deleteNFTAttributes()");

    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToDeleteNFTAttrsInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqDeleteNFTAttrsInfo:ndo.ReqDeleteNFTAttrsInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqDeleteNFTAttrsInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqDeleteNFTAttrsInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // NFT DB에서 속성데이터를 삭제.
        const dbQueryInfo = await nftDataHandler.deleteDBNFTItemList(sqlDataManager,reqDeleteNFTAttrsInfo.groupID,reqDeleteNFTAttrsInfo.mintingCount);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] deleteNFTAttributes()");
};
router.post('/nftattrs/delete', deleteNFTAttributes);

// 게임서버에서 준 NFT속성정보를 내부 DB형식으로 변환
function convertGameserverNFTFormatToDBRecord(rawData:any):any {

};

export const metadataTemplate:any = {
    name: "Xenodragon NFT",
    seasonNo: NFT_SEASON_NO,
    groupID: 0, // 그룹ID
    type:"",
    description: "Xenodragon is a remarkable NFT Project.",
    image: "",
    animation_url: "https://www.naver.com",
    external_url: "",
    reveal_flag:0,
    attributes: [
     ],
   localization: {
      "uri": "ipfs://QmWS1VAdMD353A6SDk9wNyvkT14kyCiZrNDYAad4w1tKqT/{locale}.json",
      "default": "en",
      "locales": ["en", "ko", "jp"]
    }
};

// 메타데이터 생성 및 S3에 저장
function generateMetadata(groupID:number,attrList:any,dataOnly:boolean):any {

    console.log('attrList=',attrList);

    metadataTemplate.groupID = groupID;

    const metadataInfoList = [];
    let metadata:any = {name:"",description:"",image:"",animation_url:"",external_url:"",reveal_flag:0,attributes:[],localization:{}};
    for(let i=0;i<attrList.length;i++) {
        metadata = {...metadataTemplate};
        metadata.attributes = [];
        metadata.name = attrList[i].item_data.name;
        metadata.type = attrList[i].item_type;
        metadata.description = attrList[i].item_data.desc;
        if(metadata.type === 0) {
            metadata.image = NFT_IMAGE_DRAGON_BASEURI.replace('{fileId}',attrList[i].item_data.imageURL);
        } else {
            metadata.image = NFT_IMAGE_GEAR_BASEURI.replace('{fileId}',attrList[i].item_data.imageURL);
        }

        metadata.animation_url = attrList[i].item_data.animationURL;
        metadata.external_url = attrList[i].item_data.externalURL;
        for(let j=0;j<attrList[i].item_data.attributes.length;j++) {
            metadata.attributes.push({
                trait_type:attrList[i].item_data.attributes[j].traitType,
                level:attrList[i].item_data.attributes[j].level,
                value:attrList[i].item_data.attributes[j].value,
                displayType:attrList[i].item_data.attributes[j].displayType,
                maxValue:attrList[i].item_data.attributes[j].maxValue
            });
        }

        if(dataOnly === true) {
            metadataInfoList.push(metadata);
        } else {
            metadataInfoList.push({type:(attrList[i].item_type===0?'Dragon':'Gear'), filename:`xenodragon-${attrList[i].token_id}.json`, tokenID:attrList[i].token_id.toString(), data:JSON.stringify(metadata,null,2)});
        }
    }

    return metadataInfoList;
}

function generateMetadata2(attrList:any):any {

    console.log('attrList=',attrList);

    const testData = {
        name: "Xenodragon NFT",
        seasonNo: NFT_SEASON_NO,
        type:"",
        description: "Xenodragon is a remarkable NFT Project.",
        image: "",
        animation_url: "https://www.naver.com",
        external_url: "",
        reveal_flag:0,
        attributes: [
         ],
       localization: {
          "uri": "ipfs://QmWS1VAdMD353A6SDk9wNyvkT14kyCiZrNDYAad4w1tKqT/{locale}.json",
          "default": "en",
          "locales": ["en", "ko", "jp"]
        }
    };

    const metadataInfoList = [];
    let metadata:any = {name:"",description:"",image:"",animation_url:"",external_url:"",reveal_flag:0,attributes:[],localization:{}};
    for(let i=0;i<attrList.length;i++) {
        metadata = {...testData};
        metadata.attributes = [];
        metadata.name = attrList[i].metadata.name;
        metadata.type = attrList[i].itemType;
        metadata.description = attrList[i].metadata.desc.replaceAll("\n","");
        if(metadata.type === 0) {
            metadata.image = NFT_IMAGE_DRAGON_BASEURI.replace('{fileId}',attrList[i].metadata.imageURL);
        } else {
            metadata.image = NFT_IMAGE_GEAR_BASEURI.replace('{fileId}',attrList[i].metadata.imageURL);
        }

        metadata.animation_url = attrList[i].metadata.animationURL;
        metadata.external_url = attrList[i].metadata.externalURL;
        for(let j=0;j<attrList[i].metadata.attributes.length;j++) {
            metadata.attributes.push({
                trait_type:attrList[i].metadata.attributes[j].traitType,
                level:attrList[i].metadata.attributes[j].level,
                value:attrList[i].metadata.attributes[j].value,
                displayType:attrList[i].metadata.attributes[j].displayType,
                maxValue:attrList[i].metadata.attributes[j].maxValue
            });
        }

        metadataInfoList.push({type:(attrList[i].itemType===0?'Dragon':'Gear'), filename:`xenodragon-${attrList[i].tokenId}.json`, tokenID:attrList[i].tokenId.toString(), data:JSON.stringify(metadata,null,2)});
    }

    return metadataInfoList;
}

async function uploadMetadata(serverType:string,metadataInfoList:any):Promise<any> {

    console.log("[1] serverType=",serverType);
    
    const metadataBasePath = cmnSvcProcessor.getNFTMetadataBasePath(serverType);

    const promiseTable = [];
    const tokenIDList = [];
    for(let i=0;i<metadataInfoList.length;i++) {
        tokenIDList.push(metadataInfoList[i].tokenID);
        promiseTable.push(metadataStorageManager.uploadToBucket(metadataBasePath,metadataInfoList[i].filename,NFTSTORAGE_ACL_PUBLIC,metadataInfoList[i].data,{index:i}));
    }

    let resultInfo = getResultForm(ResultCode.SUCCESS,"",{tokenIDList});
    try {
        await Promise.all(promiseTable);

    } catch(err) {
        console.log('err=',err);
        resultInfo.resultCode = ResultCode.AWS_S3_UPLOADOBJ_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.AWS_S3_UPLOADOBJ_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

const uploadMetadataToStorage = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] uploadMetadataToStorage()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToUploadMetadataInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUploadMetadataInfo:ndo.ReqUploadMetadataInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUploadMetadataInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUploadMetadataInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 reqGroupID로 NFT속성정보 목록 가져오기
        const dbQueryInfo = await nftDataHandler.queryDBNFTItemList(sqlDataManager,-1,"All",-1,reqUploadMetadataInfo.mintingCount,"","");
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // NFT속성정보를 이용하여 메타데이터 생성
        const metadataInfoList = generateMetadata(reqUploadMetadataInfo.groupID,dbQueryInfo.data,false);

        console.log('metadataInfoList=',metadataInfoList);

        // 생성된 메타데이터정보를 S3에 파일로 저장
        resultInfo = await uploadMetadata(reqUploadMetadataInfo.serverType,metadataInfoList);

        // DB에 민팅정보의 상태를 2로 업데이트(메타데이터 업로드 단계 성공)
        const actLogInfo:ndo.ActivityLogInfo = {
            logID:reqUploadMetadataInfo.logID,
            reqGroupID: reqUploadMetadataInfo.groupID.toString(),
            activityType: 0,
            activityCount: reqUploadMetadataInfo.mintingCount,
            desc: reqUploadMetadataInfo.desc,
            quantity: 0,
            data: "",
            creationTime:"",
            targetAddress:"",
            packageType: 0,
            packageData: "",
            state:2
        };
        const dbUpdateInfo = await nftDataHandler.updateDBNFTActLogInfo(sqlDataManager, actLogInfo);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // DB에 NFT속성 상태값을 1('metadata uploaded')로 변경
        const dbUpateInfo = await nftDataHandler.updateDBNFTItemState(sqlDataManager,reqUploadMetadataInfo.mintingCount,constants.NFT_MINT_STATE_METADATAUPLOADED);

        dbUpateInfo.data = resultInfo.data;

        // 환경설정 변경 활동로그 DB에 저장
        const logDetailInfo:string = ``;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUploadMetadataInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_UPLOADMETADATA,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] uploadMetadataToStorage()");
};
router.post('/metadata/upload', uploadMetadataToStorage);

// 기간,아이템타입으로 해당 NFT의 속성정보 조회하기
const queryMintedNFTAttrInfoList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryMintedNFTAttrInfoList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryMintedNFTAttrInfoList(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqMintedNFTAttrListInfo:ndo.ReqMintedNFTAttrListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqMintedNFTAttrListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqMintedNFTAttrListInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 해당 기간동안 민팅한 특정타입의 NFT 목록 조회하기
        resultInfo = await nftDataHandler.queryDBNFTItemList(sqlDataManager,-1,reqMintedNFTAttrListInfo.itemType,reqMintedNFTAttrListInfo.partType,-1,reqMintedNFTAttrListInfo.startTime,reqMintedNFTAttrListInfo.endTime);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        let curTokenID=null;
        const attrInfoTable = [];
        try {
            // 각 토큰ID별로 게임서버에서 메타데이터 속성정보를 가져옴.
            const attrInfoList = resultInfo.data;

            console.log('[1] attrInfoList=',JSON.stringify(attrInfoList,null,2));

            if(Array.isArray(attrInfoList) === true) {
                let count=0;
                for(let attrInfo of attrInfoList) {
                    curTokenID = attrInfo.token_id;
                    let targetURL = cmnSvcProcessor.getGameServerURL(reqMintedNFTAttrListInfo.serverType,`/Blockchain/Assets/Token/k-stadium/xenonft/${curTokenID}`);
            
                    console.log('[GAME SERVER] targetURL=',targetURL);
                
                    const res = await axios.get(targetURL,{ headers: {'Content-type': 'application/json'} });
                    console.log('[GAME SERVER] response=',res);
                    console.log('[GAME SERVER] data=',JSON.stringify(res.data,null,2));
            
                    if(res.status !== 200) {
                        resultInfo.resultCode = ResultCode.ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED;
                        resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED.toString()];
                        resultInfo.data = {status:res.status};
                    } else {
                        attrInfoTable.push({ attributeId:res.data.id,assetInfos:[res.data] });
                    }
                }
            }
            
        } catch(err) {
            console.log(err);
        
            resultInfo.resultCode = ResultCode.ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED.toString()]+`(tokenID:${curTokenID})`;
            resultInfo.data = err;
        }

        let metadataInfoList = [];
        if(attrInfoTable.length > 0) {
            // 게임서버에서 받은 속성정보를 내부 포맷으로 변경.
            const [dbAttrInfoTable,tokenIDList] = makeNFTAttrInfoListFromRaw(0,attrInfoTable);

            console.log('[2] dbAttrInfoTable=',JSON.stringify(dbAttrInfoTable,null,2));

            // 내부포맷의 속성정보를 이용하여 메타데이터 생성
            metadataInfoList = generateMetadata2(dbAttrInfoTable);

            console.log('[3] metadataInfoList=',JSON.stringify(metadataInfoList,null,2));

            resultInfo.data = {totalCount:metadataInfoList.length,list:metadataInfoList};
        } else {
            resultInfo.data = {totalCount:0,list:[]};
        }

        // // DB에서 스마트컨트랙트 주소 조회하기
        // let resultInfo2 = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        // const contractAddress = sdo.getSettingItemValue(resultInfo2.data,'NFT','contract_address');

        // // 메타데이터 base uri 가져오기(새 민팅때 정보 표시용)
        // resultInfo2 = await processMetadataBaseURI(reqMintedNFTAttrListInfo.serverType,{contractAddress});
        // if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
        //     cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
        //     return;
        // }

        resultInfo.data = {metadataBaseURI:'test',totalCount:metadataInfoList.length,list:metadataInfoList};

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryMintedNFTAttrInfoList()");
};
router.post('/metadata/attrlist', queryMintedNFTAttrInfoList);

// 기존 메타데이터 업데이트
const updateMetadataToStorage = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateMetadataToStorage()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToUpdateMetadataInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUpdateMetadataInfo:ndo.ReqUpdateMetadataInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateMetadataInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateMetadataInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 메타데이터 목록을 S3에 업데이트
        console.log("metadataInfoList=",JSON.stringify(reqUpdateMetadataInfo.metadataInfoList));

        resultInfo = await uploadMetadata(reqUpdateMetadataInfo.serverType,reqUpdateMetadataInfo.metadataInfoList); // reqUpdateMetadataInfo.serverType

        // 환경설정 변경 활동로그 DB에 저장
        const logDetailInfo:string = `{}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateMetadataInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_UPDATEMETADATA,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateMetadataToStorage()");
};
router.post('/metadata/update', updateMetadataToStorage);

// NFT 민팅 처리
const requestMintingComplete = async (serverType:string,tokenIDList:number[]):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    try {
        let targetURL = cmnSvcProcessor.getGameServerURL(serverType,'/Resource/Assets/Mints/k-stadium/xenonft');
    
        const mintedTokenIDList:any[] = [];
        for(let tokenID of tokenIDList) {
            mintedTokenIDList.push({
                "TokenId":tokenID.toString()
            });
        }

        console.log('[GAME SERVER] mintedTokenIDList=',JSON.stringify(mintedTokenIDList,null,2));
        console.log('[GAME SERVER] targetURL=',targetURL);
    
        const res = await axios.post(targetURL,mintedTokenIDList,{ headers: {'Content-type': 'application/json'} });
        console.log('[GAME SERVER] response=',res);

        if(res.status !== 200) {
            resultInfo.resultCode = ResultCode.ADMINAPI_NFT_CONFIRMFAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_CONFIRMFAILED.toString()];
            resultInfo.data = {status:res.status};
        } else {
            resultInfo.data = {mintingNum:tokenIDList.length,res:res.data.responseList};
        }
        
      } catch(err) {
        console.log(err);
    
        resultInfo.resultCode = ResultCode.ADMINAPI_NFT_CONFIRMFAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_CONFIRMFAILED.toString()];
        resultInfo.data = err;
      }

      return resultInfo;
};

    // internal functions
    // function _checkIfSameTokenExist(uint256[] memory tokenIDTable) internal view returns (uint256) {

    //     for(uint256 i=0;i<tokenIDTable.length;i++) {
    //         for(uint256 j=0;j<tokenIDTable.length;j++) {
    //             if(i != j && tokenIDTable[i] == tokenIDTable[j]) {
    //                 return tokenIDTable[i];
    //             }
    //         }
    //     }

    //     for(uint256 i=0;i<_allTokenTable.length;i++) {
    //         for(uint256 j=0;j<tokenIDTable.length;j++) {
    //             if(_allTokenTable[i] == tokenIDTable[j]) {
    //                 return tokenIDTable[j];
    //             }
    //         }
    //     }

    //     return 0;
    // }

// 새로 민팅할 토큰ID(들)을 기존 민팅된 토큰목록과 비교하는 것에 추가해서,
// 민팅할 토큰ID목록내에서도 동일한게 있는지 체크하기 위해 다음과 같이 로직을 구성함.
const checkIfSameTokenIDExist = (dbTokenIDList:any, mintingInfoList:any) => {

    let tokenIDListToMint = [];

    if(mintingInfoList.length === 1) {
        tokenIDListToMint = [...mintingInfoList[0].tokenIDList];

    } else if(mintingInfoList.length > 1) {
        for(let mintingInfo of mintingInfoList) {
            tokenIDListToMint.push(mintingInfo.tokenId);
        }
    }

    for(let i=0;i<tokenIDListToMint.length;i++) {
        for(let j=0;j<tokenIDListToMint.length;j++) {
            if(i !== j && tokenIDListToMint[i] === tokenIDListToMint[j]) {
                return 1;
            }
        }
    }

    for(let i=0;i<tokenIDListToMint.length;i++) {
        for(let j=0;j<dbTokenIDList.length;j++) {
            if(tokenIDListToMint[i] === dbTokenIDList[j]) {
                return 2;
            }
        }
        dbTokenIDList.push(tokenIDListToMint[i]);
    }

    return 0;
};

const mintNFTToContract = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] mintNFTToContract()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToMintNFTInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqMintNFTInfo:ndo.ReqMintNFTInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqMintNFTInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqMintNFTInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 새로 민팅할 토큰들과 기존 민팅된 토큰들이 중복되지 않는지 체크.
        resultInfo = await nftDataHandler.queryDBMintedTokenIDList(sqlDataManager, -1, constants.NFT_MINT_STATE_MINTED);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 민팅할 토큰들중 동일한 토큰이 있거나, 기존 민팅된 토큰들 사이에서 동일한 토큰이 있는지 체크
        const resultFlag = checkIfSameTokenIDExist(resultInfo.data,reqMintNFTInfo.mintingInfoList);
        if(resultFlag  > 0) {
            if(resultFlag === 1) {
                resultInfo.resultCode = ResultCode.NFT_MINTING_SAMETOKEN_EXIST1;
            } else {
                resultInfo.resultCode = ResultCode.NFT_MINTING_SAMETOKEN_EXIST2;
            }
            resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        const contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');

        // 스마트 컨트랙트에 민팅 요청하기
        resultInfo = await processMinting(reqMintNFTInfo.serverType,reqMintNFTInfo.mintingInfoList,{contractAddress});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }
        
        // 게임서버에 민팅완료 통보
        resultInfo = await requestMintingComplete(reqMintNFTInfo.serverType,resultInfo.data);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에 NFT속성 상태값을 2('minted')로 변경
        let dbUpateInfo = await nftDataHandler.updateDBNFTItemState(sqlDataManager,reqMintNFTInfo.mintingCount,constants.NFT_MINT_STATE_MINTED);
        if(dbUpateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        console.log('reqMintNFTInfo.finalReq=',reqMintNFTInfo.finalReq);
        
        if(reqMintNFTInfo.finalReq === true) {
            let packageInfoTable:any = [];
            if(reqMintNFTInfo.packageIDTable !== undefined && reqMintNFTInfo.packageIDTable.length > 0) {

                console.log('reqMintNFTInfo.packageIDTable=',JSON.stringify(reqMintNFTInfo.packageIDTable,null,2));
                const resultInfo2 = await nftDataHandler.queryDBPackageInfoList(sqlDataManager, reqMintNFTInfo.reqGroupID, reqMintNFTInfo.packageIDTable);
                if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
                    cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
                    return;
                }
                packageInfoTable = resultInfo2.data;
            }

            const actLogInfo:ndo.ActivityLogInfo = {
                logID:reqMintNFTInfo.logID,
                reqGroupID: reqMintNFTInfo.reqGroupID,
                activityType: constants.NFT_ACTIVITYTYPE_MINTING,
                activityCount: reqMintNFTInfo.mintingCount,
                desc: reqMintNFTInfo.desc,
                quantity: reqMintNFTInfo.totalMintingNum,
                data: reqMintNFTInfo.tokenGenData,
                creationTime:'',
                targetAddress:reqMintNFTInfo.mintingInfoList[0].targetAddress,
                packageType: reqMintNFTInfo.packageType,
                packageData: JSON.stringify(packageInfoTable),
                state: 0
            };
            dbUpateInfo = await nftDataHandler.updateDBNFTActLogInfo(sqlDataManager, actLogInfo);
            if(dbUpateInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
                return;
            }

            // 환경설정 조회 활동로그 DB에 저장
            await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");
        }

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] mintNFTToContract()");
};
router.post('/mintnft', mintNFTToContract);

const checkMetadataIntegrity = async (serverType:string, metadataURLList:string[]):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',{code:0,message:"",data:null});

    let jsonMetadata;
    let metadataFullPath;
    let metadataBasePath;
    let fileName;
    let tokenID;
    const failedTokenIDTable = [];
    for await(let metadataURL of metadataURLList) {

        const url = new URL(metadataURL);

        metadataFullPath = url.pathname;

        metadataBasePath = path.dirname(metadataFullPath);
        metadataBasePath = metadataBasePath.substring(1,metadataBasePath.length);
        fileName = path.basename(metadataFullPath);

        console.log(`metadataBasePath=${metadataBasePath}, fileName=${fileName}`);

        tokenID = fileName.split('-')[1].split('.')[0];
        jsonMetadata = await metadataStorageManager.downloadFromBucket(metadataBasePath,fileName.trim()); // `xenodragon-${tokenID}.json`
        if(jsonMetadata === null) {
            console.log(`[METADATA] download failed.(tokenID=${tokenID})`);

            failedTokenIDTable.push(tokenID);
        } else {
            console.log(`[METADATA] download success.(tokenID=${tokenID})`);
        }
    }

    if(failedTokenIDTable.length > 0) {
        resultInfo.data.code = ResultCode.NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED;
        resultInfo.data.message = ReqValidationErrorMsg[ResultCode.NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED.toString()];
        resultInfo.data.data = [...failedTokenIDTable];
    }

    return resultInfo;
};

const checkNFTIntegrity = async (serverType:string,contractAddress:string, targetAddress:string, tokenIDList:number[]):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',{code:0,message:"",data:null});

    const metadataURLTable = [];
    const absentTokenIDTable = [];

    // 스마트 컨트랙트에 민팅된 토큰정보 요청하기
    resultInfo = await processHugeNFTList(serverType,targetAddress,{contractAddress});
    if(resultInfo.resultCode === ResultCode.SUCCESS) {
        const addressedNFTInfoTable = resultInfo.data;
        resultInfo.data = {code:0,message:'',data:null};

        console.log('targetAddress=',targetAddress);
        console.log('tokenIDList=',tokenIDList);
        console.log('addressedNFTInfoTable=',addressedNFTInfoTable);

        let found;
        for(let dbTokenID of tokenIDList) {
            found = false;
            for (let nftInfo of addressedNFTInfoTable) {
                if(nftInfo.tokenID === dbTokenID.toString()) {
                    metadataURLTable.push(nftInfo.metadataURL);
                    found = true;
                    break;
                }
            }

            if(found === false) { // db에 있는 토큰ID가 컨트랙트상에 민팅되지 않은 경우
                absentTokenIDTable.push(dbTokenID);                
            }
        }

        resultInfo.data.data = {metadataURLTable:metadataURLTable};
        if(absentTokenIDTable.length > 0) {
            resultInfo.data.code = ResultCode.NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND;
            resultInfo.data.message = ReqValidationErrorMsg[ResultCode.NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND.toString()];
            resultInfo.data.data = {metadataURLTable:metadataURLTable,absentTokenIDTable};
        }
    }

    //console.log('resultInfo=',JSON.stringify(resultInfo,null,2));

    return resultInfo;
};

// 민팅된 NFT정보(토큰정보 및 메타데이터)에 대한 검증을 수행.(갯수 확인, 메타데이터 누락 여부 체크 등)
const checkMintedNFTInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] checkMintedNFTInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToCheckNFTInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqCheckNFTInfo:ndo.ReqCheckNFTInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqCheckNFTInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqCheckNFTInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 새로 민팅할 토큰들과 기존 민팅된 토큰들이 중복되지 않는지 체크.
        resultInfo = await nftDataHandler.queryDBMintedTokenIDList(sqlDataManager, reqCheckNFTInfo.groupID, constants.NFT_MINT_STATE_MINTED);
        if(resultInfo.resultCode !== ResultCode.SUCCESS && resultInfo.resultCode !== ResultCode.DB_QUERY_EMPTY) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에서 컨트랙트 주소와 메타데이터 Base URI 정보 조회하기
        const dbQueryInfo = await settingDataHandler.queryDBSettingItemList(sqlDataManager);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // DB에서 그룹ID별 민팅 정보 조회하기
        resultInfo = await nftDataHandler.queryDBGroupNFTTokenList(sqlDataManager,reqCheckNFTInfo.groupID, reqCheckNFTInfo.mintingCount, constants.NFT_MINT_STATE_MINTED);
        if(resultInfo.resultCode !== 0) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에서 스마트컨트랙트 주소 조회하기
        const contractAddress = sdo.getSettingItemValue(dbQueryInfo.data,'NFT','contract_address');
        const metadataBaseURI = sdo.getSettingItemValue(dbQueryInfo.data,'NFT','metadata_base_uri');

        // 이미 다른 주소로 전송된 토큰은 검증에서 제외:전송목록에서 검증을 수행해야 함.
        let transferedTokenNum=0;
        const tokenIDList = [];
        for(let i=0;i<resultInfo.data.itemInfoList.length;i++) {
            const itemInfo = resultInfo.data.itemInfoList[i];
            if(itemInfo.state > constants.NFT_MINT_STATE_MINTED) {
                transferedTokenNum++;
            } else {
                tokenIDList.push(itemInfo.tokenID);
            }
        }

        //{tokenID:nftAttr.token_id,itemType:nftAttr.item_type,partType:nftAttr.part_type,packageID:nftAttr.package_id}
        const targetAddress = resultInfo.data.targetAddress;

        // 민팅된 토큰갯수가 맞는지 검증
        if(reqCheckNFTInfo.quantity !== tokenIDList.length) {
            console.log('[1]resultInfo='+JSON.stringify(resultInfo,null,2));
            resultInfo.resultCode = ResultCode.SUCCESS;
            if(transferedTokenNum > 0) {
                resultInfo.data = {code:ResultCode.NFTCHECK_NFT_INTEGRITY_ALREADYTRANSFERED,message:ReqValidationErrorMsg[ResultCode.NFTCHECK_NFT_INTEGRITY_ALREADYTRANSFERED.toString()],data:{transferedTokenNum}};
            } else {
                resultInfo.data = {code:ResultCode.NFTCHECK_QUANITTY_NOTMISMATCHED,message:ReqValidationErrorMsg[ResultCode.NFTCHECK_QUANITTY_NOTMISMATCHED.toString()],data:{transferedTokenNum}};
            }
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 타겟주소에 실제 토큰이 있는지 여부 검증
        resultInfo = await checkNFTIntegrity(reqCheckNFTInfo.serverType,contractAddress,targetAddress,tokenIDList);
        if(resultInfo.resultCode !== 0 || resultInfo.data.code !== 0) {
            console.log('[2]resultInfo='+JSON.stringify(resultInfo,null,2));
            if(resultInfo.data.code !== undefined && resultInfo.data.code !== 0) {
                resultInfo.data = {code:resultInfo.data.code,message:resultInfo.data.message+`(누락갯수:${resultInfo.data.data.absentTokenIDTable.length})`,data:resultInfo.data.data}; // ResultCode.NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND
            }
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 컨트랙트에서 받아온 메타데이터정보로 S3에 메타데이터 실제 존재여부 검증
        resultInfo = await checkMetadataIntegrity(reqCheckNFTInfo.serverType,resultInfo.data.data.metadataURLTable);
        if(resultInfo.resultCode !== 0 || resultInfo.data.code !== 0) {
            console.log('[3]resultInfo='+JSON.stringify(resultInfo,null,2));
            if(resultInfo.data.code !== 0) {
                resultInfo.data = {code:resultInfo.data.code,message:resultInfo.data.message,data:resultInfo.data.data}; // ResultCode.NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED
            }
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        resultInfo.data = {code:0,message:""};
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] checkMintedNFTInfo()");
};
router.post('/checknft/mint', checkMintedNFTInfo);


// 전송된 NFT정보(토큰정보 및 메타데이터)에 대한 검증을 수행.(갯수 확인, 메타데이터 누락 여부 체크 등)
const checkTransferedNFTInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] checkTransferedNFTInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToCheckNFTInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqCheckNFTInfo:ndo.ReqCheckNFTInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqCheckNFTInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqCheckNFTInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 컨트랙트 주소와 메타데이터 Base URI 정보 조회하기
        let dbQueryInfo = await settingDataHandler.queryDBSettingItemList(sqlDataManager);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }
    
        // DB에서 스마트컨트랙트 주소 조회하기
        const contractAddress = sdo.getSettingItemValue(dbQueryInfo.data,'NFT','contract_address');


        // DB에서 활동로그 조회하기
        dbQueryInfo = await nftDataHandler.queryDBNFTTransferLog(sqlDataManager, reqCheckNFTInfo.groupID);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        const targetAddress = dbQueryInfo.data.targetAddress;

        // DB에서 특정 주소로 전송된 토큰ID만을 조회.
        resultInfo = await nftDataHandler.queryDBTransferedTokenIDList(sqlDataManager, reqCheckNFTInfo.groupID);
        if(resultInfo.resultCode !== ResultCode.SUCCESS && resultInfo.resultCode !== ResultCode.DB_QUERY_EMPTY) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const tokenIDList = resultInfo.data;

        // 전송된 토큰갯수가 맞는지 검증
        if(reqCheckNFTInfo.quantity !== tokenIDList.length) {
            console.log('[1]resultInfo='+JSON.stringify(resultInfo,null,2));
            resultInfo.resultCode = ResultCode.SUCCESS;
            resultInfo.data = {code:ResultCode.NFTCHECK_QUANITTY_NOTMISMATCHED,message:ReqValidationErrorMsg[ResultCode.NFTCHECK_QUANITTY_NOTMISMATCHED.toString()],data:{}};
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 타겟주소에 실제 토큰이 있는지 여부 검증
        resultInfo = await checkNFTIntegrity(reqCheckNFTInfo.serverType,contractAddress,targetAddress,tokenIDList);
        if(resultInfo.resultCode !== 0 || resultInfo.data.code !== 0) {
            console.log('[2]resultInfo='+JSON.stringify(resultInfo,null,2));
            if(resultInfo.data.code !== 0) {
                resultInfo.data = {code:resultInfo.data.code,message:ReqValidationErrorMsg[resultInfo.data.code.toString()]+`(누락갯수:${resultInfo.data.data.absentTokenIDTable.length})`,data:resultInfo.data.data}; // ResultCode.NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND
            }
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 컨트랙트에서 받아온 메타데이터정보로 S3에 메타데이터 실제 존재여부 검증
        resultInfo = await checkMetadataIntegrity(reqCheckNFTInfo.serverType,resultInfo.data.data.metadataURLTable);
        if(resultInfo.resultCode !== 0 || resultInfo.data.code !== 0) {
            console.log('[3]resultInfo='+JSON.stringify(resultInfo,null,2));
            if(resultInfo.data.code !== 0) {
                resultInfo.data = {code:resultInfo.data.code,message:ReqValidationErrorMsg[resultInfo.data.code.toString()],data:resultInfo.data.data}; // ResultCode.NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED
            }
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        resultInfo.data = {code:0,message:""};
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] checkTransferedNFTInfo()");
};
router.post('/checknft/transfer', checkTransferedNFTInfo);

// 특정 지갑주소가 소유한 NFT 목록 조회하기
const queryNFTList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryNFTList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryNFTList(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryNFTListInfo:ndo.ReqQueryNFTListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryNFTListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryNFTListInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        const contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');

        // 스마트 컨트랙트에 민팅된 토큰정보 요청하기
        resultInfo = await processNFTList(reqQueryNFTListInfo.serverType,reqQueryNFTListInfo.onlyTokenInfo,reqQueryNFTListInfo.address,reqQueryNFTListInfo.offset,reqQueryNFTListInfo.queryNum,{contractAddress});

        // 환경설정 조회 활동로그 DB에 저장
        //await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryNFTList()");
};
router.post('/nftlist', queryNFTList);

const makeNFTCurPropInfo = (rawData:any) => {

    const getPropValue = (attrTable:any[],attrName:string) => {
        for(let attrInfo of attrTable) {
            if(attrInfo.traitName === attrName) {
                return attrInfo.traitValue;
            }
        }
        return "null";
    };

    let nftCurPropInfo = null;
    if(rawData.itemType.toUpperCase() === 'DRAGON') {
        nftCurPropInfo = {
            tokenID:rawData.tokenId,
            itemType:rawData.itemType,
            level:rawData.level,
            attributes:[
                {trait_type:"Grade",value:getPropValue(rawData.assetProperties,"Grade")},
                {trait_type:"Element",value:getPropValue(rawData.assetProperties,"Element")},
                {trait_type:"Level",value:getPropValue(rawData.assetProperties,"Level")},
                {trait_type:"Skill",value:getPropValue(rawData.assetProperties,"Skill")},
                {trait_type:"Skill Name",value:getPropValue(rawData.assetProperties,"Skill Name")},
                {trait_type:"Skill Desc",value:getPropValue(rawData.assetProperties,"Skill Desc")},
                {trait_type:"Skill Icon",value:getPropValue(rawData.assetProperties,"Skill Icon")},
                {trait_type:"Spirit",value:getPropValue(rawData.assetProperties,"Spirit")},
                {trait_type:"Attack Damage",value:getPropValue(rawData.assetProperties,"Attack Damage")},
                {trait_type:"Defense",value:getPropValue(rawData.assetProperties,"Defense")},
                {trait_type:"Max HP",value:getPropValue(rawData.assetProperties,"Max HP")},
                {trait_type:"Critical Damage Rate",value:getPropValue(rawData.assetProperties,"Critical Damage Rate")},
                {trait_type:"Critical Rate",value:getPropValue(rawData.assetProperties,"Critical Rate")},
                {trait_type:"Attack Speed",value:getPropValue(rawData.assetProperties,"Attack Speed")},
                {trait_type:"AttackRange",value:getPropValue(rawData.assetProperties,"AttackRange")},
                {trait_type:"Power",value:getPropValue(rawData.assetProperties,"Power")}
            ]
        }
    } else {
        nftCurPropInfo = {
            tokenID:rawData.tokenId,
            itemType:rawData.itemType,
            level:rawData.level,
            partType:getPropValue(rawData.assetProperties,"Part"),
            attributes:[
                {trait_type:"Part",value:getPropValue(rawData.assetProperties,"Part")},
                {trait_type:"Grade",value:getPropValue(rawData.assetProperties,"Grade")},
                {trait_type:"Element",value:getPropValue(rawData.assetProperties,"Element")},
                {trait_type:"Level",value:getPropValue(rawData.assetProperties,"Level")},
                {trait_type:"Skill",value:getPropValue(rawData.assetProperties,"Skill")},
                {trait_type:"Skill Name",value:getPropValue(rawData.assetProperties,"Skill Name")},
                {trait_type:"Skill Desc",value:getPropValue(rawData.assetProperties,"Skill Desc")},
                {trait_type:"Skill Icon",value:getPropValue(rawData.assetProperties,"Skill Icon")}
            ]
        };

        let found = false;
        for(let attrInfo of rawData.assetProperties) {
            if(found === true) {
                nftCurPropInfo.attributes.push({trait_type:attrInfo.traitName,value:attrInfo.traitValue});
            }
            if(attrInfo.traitName === "Skill Icon") {
                found = true;
            }
        }
    }

    return nftCurPropInfo;
};

// 특정 토큰ID에 대한 현재 속성값 조회하기
const getNFTCurPropInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getNFTCurPropInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToGetNFTCurProp(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqGetNFTCurPropInfo:ndo.ReqGetNFTCurPropInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqGetNFTCurPropInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqGetNFTCurPropInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임서버에서 속성정보 조회하기
        try {
            let targetURL = cmnSvcProcessor.getGameServerURL(reqGetNFTCurPropInfo.serverType,`/Blockchain/Infos/Token/k-stadium/xenonft/${reqGetNFTCurPropInfo.tokenID}`);
        
            console.log('[GAME SERVER] tokenID=',reqGetNFTCurPropInfo.tokenID);
            console.log('[GAME SERVER] targetURL=',targetURL);
        
            const res = await axios.get(targetURL,{ headers: {'Content-type': 'application/json'} });
            console.log('[GAME SERVER] response=',res);
            console.log('[GAME SERVER] data=',JSON.stringify(res.data,null,2));
    
            if(res.status !== 200) {
                resultInfo.resultCode = ResultCode.ADMINAPI_NFT_GETCURPROP_FAILED;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_CONFIRMFAILED.toString()];
                resultInfo.data = {status:res.status};
            } else {
                resultInfo.data = makeNFTCurPropInfo(res.data);
            }
            
        } catch(err) {
            console.log(err);
        
            resultInfo.resultCode = ResultCode.ADMINAPI_NFT_GETCURPROP_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_NFT_CONFIRMFAILED.toString()];
            resultInfo.data = err;
        }
        
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] getNFTCurPropInfo()");
};
router.post('/curprop', getNFTCurPropInfo);

// groupID로 민팅한 NFT 목록 조회하기
const queryNFTListForGroupMinting = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryNFTListForGroupMinting()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryNFTListForGroup(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryNFTListInfo:ndo.ReqQueryNFTListForGroupInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryNFTListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryNFTListInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 groupID를 가지고 민팅한 NFT 토큰 목록을 조회
        resultInfo = await nftDataHandler.queryDBGroupNFTTokenList(sqlDataManager,reqQueryNFTListInfo.groupID, reqQueryNFTListInfo.mintingCount, (reqQueryNFTListInfo.allStates===true?-1: constants.NFT_MINT_STATE_MINTED));

        // 환경설정 조회 활동로그 DB에 저장
        //await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryNFTListForGroupMinting()");
};
router.post('/group/nftlist', queryNFTListForGroupMinting);

// 지갑주소에 대한 특정 NFT 소유여부 조회
const queryOwnerOfNFT = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryOwnerOfNFT()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryOwnerOfNFT(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryOwnerOfNFTInfo:ndo.ReqQueryOwnerOfNFTInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryOwnerOfNFTInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryOwnerOfNFTInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        const contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');

        // 컨트랙트에서 지갑주소에 대한 NFT 소유여부를 조회
        resultInfo = await processOwnerOfNFT(reqQueryOwnerOfNFTInfo.serverType, reqQueryOwnerOfNFTInfo.address, reqQueryOwnerOfNFTInfo.tokenID, {contractAddress});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 환경설정 조회 활동로그 DB에 저장
        //await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryOwnerOfNFT()");
};
router.post('/isowner', queryOwnerOfNFT);

// NFT 민팅/소각 활동 로그 조회
const queryNFTActLogList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryNFTActLogList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryNFTActLogListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryNFTActLogListInfo:ndo.ReqQueryNFTActLogListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryNFTActLogListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryNFTActLogListInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        const contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');

        // 메타데이터 base uri 가져오기(새 민팅때 정보 표시용)
        resultInfo = await processMetadataBaseURI(reqQueryNFTActLogListInfo.serverType,{contractAddress});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에서 활동로그 조회하기
        let queryNum = parseInt(<string>process.env.QUERY_NUM_PERPAGE);
        if(reqQueryNFTActLogListInfo.queryNum !== undefined && reqQueryNFTActLogListInfo.queryNum >= 0) {
            queryNum = reqQueryNFTActLogListInfo.queryNum;
        }
        const dbQueryInfo = await nftDataHandler.queryDBNFTActLogList(sqlDataManager,reqQueryNFTActLogListInfo,queryNum);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        resultInfo.data = {metadataBaseURI:resultInfo.data,actlog:dbQueryInfo.data};

        // 환경설정 조회 활동로그 DB에 저장
        //await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryNFTActLogList()");
};
router.post('/log/actlist', queryNFTActLogList);

// 마켓스토어에서 판매할 NFT목록 및 패키지 정보 전송.
const sendTransferInfoToMarketServer = async (transferID:number,reqTransferNFTInfo:ndo.ReqTransferNFTInfo,packageInfoTable:any):Promise<ResultInfo> => {

    console.log('====================================================');

    type ItemInfo = {
        itemType: number
    };

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const challengeCode = Utils.getRandomID(10000000);

    const targetAddressTable = [];
    // if(reqTransferNFTInfo.packageIDTable.length > 0) {
    //     targetAddressTable.push({"itemType":10,"address":reqTransferNFTInfo.targetAddress});
    // } else {
        const table1:any[] = [];
        let found = false;
        for(let info of reqTransferNFTInfo.itemInfoList) {
            found = false;
            for(let el of table1) {
                if(el === (<ItemInfo>info).itemType) {
                    found = true;
                    break;
                }
            }
            if(found === false) {
                table1.push((<ItemInfo>info).itemType);
            }
        }
    
        for(let itemType of table1) {
            targetAddressTable.push({"itemType":itemType,"address":reqTransferNFTInfo.targetAddress});
        }
    //}

    const pkgInfoTable = [];
    for(let packageID of reqTransferNFTInfo.packageIDTable) {
        for(let packageInfo of packageInfoTable) {
            if(packageID === parseInt(packageInfo.packageID)) {
                pkgInfoTable.push(packageInfo);
            }
        }
    }

    const nftInfoList = [];
    for(let itemInfo of reqTransferNFTInfo.itemInfoList) {
        for(let packageInfo of pkgInfoTable) {
            if(itemInfo.packageID === parseInt(packageInfo.packageID)) {
                nftInfoList.push({tokenID:itemInfo.tokenID,itemType:itemInfo.itemType,partType:itemInfo.partType,packageID:itemInfo.packageID.toString()});
            }
        }
    }

    const bodyInfo = {
        "transferID":transferID, // 전송 일련번호
        "challengeCode":challengeCode, // 챌린지 코드(응답 데이터에 포함)
        "sourceAddress":reqTransferNFTInfo.sourceAddress,
        "targetAddressMode": 0, // 0: 일괄 전송, 1: 드래곤/기어 구분 전송
        "targetAddressTable":targetAddressTable,
        "nftInfoList":nftInfoList, // [{tokenID:'2342423',itemType:0,partType:0,packageID:'234234234'},...]
        "packageInfoList":pkgInfoTable // [{packageID:'asdfas',tokenIDTable:['asdfasd','asdfasdfasd','asdfasdf']},{},...]
    }

    try {
        let targetURL = cmnSvcProcessor.getMarketServerURL(reqTransferNFTInfo.serverType,'/shops/pakcages');
    
        console.log('[MARKET SERVER] bodyInfo=',JSON.stringify(bodyInfo,null,2));
        console.log('[MARKET SERVER] targetURL=',targetURL);
    
        const res = await axios.post(targetURL,bodyInfo,{ headers: {'Content-type': 'application/json'} });
        console.log('[MARKET SERVER] response=',res);

        if(res.data.resultCode !== 0 || res.data.challengeCode === undefined || res.data.challengeCode !== challengeCode) {
            resultInfo.resultCode = ResultCode.MARKETAPI_TRANSFER_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.MARKETAPI_TRANSFER_FAILED.toString()];
            resultInfo.data = {status:res.status};
        } else {
            resultInfo.data = res.data.responseList;
        }
        
    } catch(err) {
        console.log(err);
    
        resultInfo.resultCode = ResultCode.MARKETAPI_TRANSFER_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.MARKETAPI_TRANSFER_FAILED.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
};

// NFT 전송하기
const transferNFT = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] transferNFT()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToTransferNFT(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqTransferNFTInfo:ndo.ReqTransferNFTInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqTransferNFTInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqTransferNFTInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);

        console.log('resultInfo=',resultInfo);
        let contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');
        console.log('contractAddress=',contractAddress);

        // 운영툴에서 대상 컨트랙트 주소를 지정했다면 그 주소를 사용!!
        if(reqTransferNFTInfo.targetContractAddress !== undefined && reqTransferNFTInfo.targetContractAddress.trim() !== '') {
            contractAddress = reqTransferNFTInfo.targetContractAddress;
        }

        // DB에서 지갑주소에 대한 개인키 조회하기
        const dbQueryInfo = await walletDataHandler.queryDBWallet(sqlDataManager,reqTransferNFTInfo.sourceAddress);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        console.log('resultInfo=',resultInfo);
        let senderPrivateKey = dbQueryInfo.data.walletKey;

        // 스마트 컨트랙트에 전송 요청하기
        resultInfo = await processNFTTransfer(reqTransferNFTInfo.serverType,reqTransferNFTInfo.sourceAddress,reqTransferNFTInfo.targetContractAddress,reqTransferNFTInfo.targetAddress,reqTransferNFTInfo.tokenIDList,{privateKey:senderPrivateKey,contractAddress});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에 NFT전송 로그를 기록
        //let dbUpateInfo = await nftDataHandler.updateDBNFTItemState(sqlDataManager,reqMintNFTInfo.mintingCount,constants.NFT_MINT_STATE_MINTED);

        console.log('reqTransferNFTInfo.finalReq=',reqTransferNFTInfo.finalReq);
        
        if(reqTransferNFTInfo.finalReq === true) {
            const transferLogInfo:ndo.TransferLogInfo = {
                logID: -1,
                groupID: parseInt(reqTransferNFTInfo.groupID),
                comment: reqTransferNFTInfo.comment,
                sourceAddress: reqTransferNFTInfo.sourceAddress,
                targetAddress: reqTransferNFTInfo.targetAddress,
                quantity: reqTransferNFTInfo.totalTransferNum,
                creationTime: '',
                data: ''
            };
            resultInfo = await nftDataHandler.insertDBNFTTransferLogInfo(sqlDataManager, transferLogInfo);
    
            // '마켓통보' flag가 설정된 경우 마켓API 호출
            if(reqTransferNFTInfo.marketTrigger !== undefined && reqTransferNFTInfo.marketTrigger === 1) {
                let resultInfo2 = await nftDataHandler.queryDBPackgaeInfoFroGroupID(sqlDataManager, reqTransferNFTInfo.groupID);
                if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
                    cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
                    return;
                }
    
                resultInfo2 = await sendTransferInfoToMarketServer(resultInfo.data.insertId,reqTransferNFTInfo,resultInfo2.data);
                if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
                    cmnSvcProcessor.sendResponse(res,resultInfo2,sqlDataManager);
                    return;
                }
            }
        }

        // DB에 NFT속성 상태값을 3('transfered')로 변경
        let dbUpateInfo = await nftDataHandler.updateDBNFTItemStateWithTokenList(sqlDataManager,reqTransferNFTInfo.tokenIDList,constants.NFT_MINT_STATE_TRANSFERED);

        // 환경설정 조회 활동로그 DB에 저장
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqTransferNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_TRANSFER,"");

        cmnSvcProcessor.sendResponse(res,dbUpateInfo,sqlDataManager);
        
    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] transferNFT()");
};
router.post('/transfer', transferNFT);

// NFT 전송 활동 로그 조회
const queryNFTTransferLogList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryNFTTransferLogList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ndo.convertReqParamToQueryNFTTransferLogListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryNFTTransferLogListInfo:ndo.ReqQueryNFTTransferLogListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryNFTTransferLogListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryNFTTransferLogListInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        const contractAddress = sdo.getSettingItemValue(resultInfo.data,'NFT','contract_address');

        // DB에서 활동로그 조회하기
        const dbQueryInfo = await nftDataHandler.queryDBNFTTransferLogList(sqlDataManager,reqQueryNFTTransferLogListInfo.pageNo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        resultInfo.data = {contractAddress:contractAddress,translog:dbQueryInfo.data};

        // 환경설정 조회 활동로그 DB에 저장
        //await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqMintNFTInfo.adminID,activityType.ADMINACTIVITY_TYPE_NFT_MINT,"");

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryNFTTransferLogList()");
};
router.post('/log/transfer/list', queryNFTTransferLogList);

export default router;