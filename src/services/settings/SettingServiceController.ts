
import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,getResultForm,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as settingDataHandler from './SettingServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as sdo from 'src/services/settings/SettingDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';
import axios from 'axios';
import * as Utils from 'src/common/Utils';
import * as constants from 'src/common/constants';

import {processMetadataBaseURISetting,processMetadataBaseURI} from 'src/services/common/NFTContractManager';
import ClientConfigManager from 'src/services/common/ClientConfigManager';
import {verifyOTPCode} from 'src/common/OTPManager';
import { verify } from 'crypto';

require('dotenv').config();

//let clientConfigManager:ClientConfigManager = new ClientConfigManager("projectxd","ConfigData.json");
let clientConfigManager:ClientConfigManager = new ClientConfigManager("projectxd","ConfigData_v2.json");

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

// 환경설정 정보 목록 요청
const getSettingItemList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getSettingItemList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToQuerySettingItemListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqSettingListInfo:sdo.ReqQuerySettingItemListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqSettingListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqSettingListInfo, aclManager.ACL_POLICY_SETTING_VIEW);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 환경설정 항목들을 DB에서 조회
        const dbQueryInfo = await settingDataHandler.queryDBSettingItemList(sqlDataManager);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        console.log('setting_info=',dbQueryInfo.data);
        
        // DB에서 스마트컨트랙트 주소 조회하기
        const contractAddress = sdo.getSettingItemValue(dbQueryInfo.data,'NFT','contract_address');

        // 메타데이터 base uri 가져오기(새 민팅때 정보 표시용)
        resultInfo = await processMetadataBaseURI(reqSettingListInfo.serverType,{contractAddress});
        const metadataBaseURI = sdo.getSettingItemValue(dbQueryInfo.data,'NFT','metadata_base_uri');
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        if(resultInfo.data !== metadataBaseURI) {
            dbQueryInfo.data = sdo.addSettingItemValue(dbQueryInfo.data,'NFT','metadata_base_uri_contract',resultInfo.data);
        }

        // DB에 설정값이 없을 경우 디폴트값을 DB에 저장.
        // if(dbQueryInfo.resultCode === ResultCode.SUCCESS && dbQueryInfo.data.length === 0) {

        // }

        // 환경설정 조회 활동로그 DB에 저장
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSettingListInfo.adminID,activityType.ADMINACTIVITY_TYPE_SETTING_VIEWLIST,"");

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

    serviceLogger.logDebug("##### [END] getSettingItemList()");
};
router.get('/list', getSettingItemList);

// 환경설정 사항(들) 설정변경
const processMetadataBaseURIChange = async (serverType:string,modifiedSettingItemTable:any,nftInfo:any):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    let newItem = null;
    for await (let item of modifiedSettingItemTable) {
        if(item.groupID === constants.SETTINGS_GROUP_NFT && item.itemName === constants.SETTINGS_ITEM_METADATABASEURI && item.valueTable[0] !== null && item.valueTable[0].trim() !== "" && item.valueTable[1] === 'update') {

            try {
                resultInfo = await processMetadataBaseURISetting(serverType,item.valueTable[0].trim(),nftInfo);
                console.log('[SAVE URI TO CONTRACT] resultInfo=',resultInfo);

                newItem = {...item};
                newItem.valueTable[1] = "";
                resultInfo.data = newItem;
                break;

            } catch (err) {
                resultInfo.resultCode = ResultCode.SETTING_NFT_UPDATEMETADATAURI_FAILED;
                resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
                newItem = null;
                break;
            }
        }
    }

    return resultInfo;
};

const requestTokenSwapInfoToGameServer = async (serverType:string, settingItemTable:sdo.SettingItemInfo[]):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    try {
        const xdsRangeTable = sdo.getSettingItemValueList(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_XDSRANGE); // [0]:최소값, [1]:최대값
        const xdcRangeTable = sdo.getSettingItemValueList(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_XDCRANGE); // [0]:최소값, [1]:최대값
        const excRateTable = sdo.getSettingItemValueList(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_EXCRATE); // [0]:XDS, [1]:XDC
        const feeType = sdo.getSettingItemValueList(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_FEETYPE); // 0:고정값, 1:비율값
        const feeRateTable = sdo.getSettingItemValueList(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_FEEVALUE); // [0]:XDS->XDC rate, [1]:XDC->XDS rate
        const gasAmount = sdo.getSettingItemValue(settingItemTable,constants.SETTINGS_GROUP_TOKEN,constants.SETTINGS_ITEM_GASAMOUNT);

        let targetURL1 = cmnSvcProcessor.getGameServerURL(serverType,'/Blockchain/Infos/AddSwap/k-stadium/XDS/XDC');
        let targetURL2 = cmnSvcProcessor.getGameServerURL(serverType,'/Blockchain/Infos/AddSwap/k-stadium/XDC/XDS');
    
        const feeTypeValue = parseInt(feeType[0]);
        let feeValue1 = 0.0;
        let feeValue2 = 0.0;
        if(feeTypeValue === 0) { // 고정방식
            feeValue1 = parseFloat(feeRateTable[0]);
            feeValue2 = parseFloat(feeRateTable[1]);
        } else {
            feeValue1 = Math.floor(parseFloat(feeRateTable[0])*100.0);
            feeValue2 = Math.floor(parseFloat(feeRateTable[1])*100.0);
        }

        const bodyInfoOfXDS2XDC = {
            "Id":0,
            "OriginTokenId": 0,
            "TargetTokenId": 0,
            "Rate": Math.floor((parseFloat(excRateTable[1])/parseFloat(excRateTable[0]))*10000.0),
            "FeeType": parseInt(feeType[0]),
            "FeeValue": feeValue1,
            "GasFee": parseInt(gasAmount),
            "ApplyDate": Utils.getStdNowUTCString(),
            "OriginMin": parseInt(xdsRangeTable[0]),
            "OriginMax": parseInt(xdsRangeTable[1])
        }

        const bodyInfoOfXDC2XDS = {
            "Id":0,
            "OriginTokenId": 0,
            "TargetTokenId": 0,
            "Rate": Math.floor((parseFloat(excRateTable[0])/parseFloat(excRateTable[1]))*10000.0),
            "FeeType": parseInt(feeType[0]),
            "FeeValue": feeValue2,
            "GasFee": parseInt(gasAmount),
            "ApplyDate": Utils.getStdNowUTCString(),
            "OriginMin": parseInt(xdcRangeTable[0]),
            "OriginMax": parseInt(xdcRangeTable[1])
        }

        console.log('[GAME SERVER] bodyInfoOfXDS2XDC=',bodyInfoOfXDS2XDC);
        console.log('[GAME SERVER] targetURL1=',targetURL1);
        console.log('[GAME SERVER] bodyInfoOfXDC2XDS=',bodyInfoOfXDC2XDS);
        console.log('[GAME SERVER] targetURL2=',targetURL2);
    
        const res1 = await axios.post(targetURL1,bodyInfoOfXDS2XDC,{ headers: {'Content-type': 'application/json'} });
        console.log('[GAME SERVER] response1=',res1);

        const res2 = await axios.post(targetURL2,bodyInfoOfXDC2XDS,{ headers: {'Content-type': 'application/json'} });
        console.log('[GAME SERVER] response2=',res2);

        if(res1.status !== 200) {
            resultInfo.resultCode = ResultCode.ADMINAPI_SWAP_XDS2XDC_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_SWAP_XDS2XDC_FAILED.toString()];
            resultInfo.data = {status:res1.status};
        } else {
            if(res2.status !== 200) {
                resultInfo.resultCode = ResultCode.ADMINAPI_SWAP_XDC2XDS_FAILED;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_SWAP_XDC2XDS_FAILED.toString()];
                resultInfo.data = {status:res2.status};
            }
        }
        
      } catch(err) {
        console.log(err);
    
        resultInfo.resultCode = ResultCode.ADMINAPI_SWAP_XDS2XDC_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_SWAP_XDS2XDC_FAILED.toString()];
        resultInfo.data = err;
      }

      return resultInfo;
};

const updateSettingItemTable = (settingItemTable:sdo.SettingItemInfo[], modifiedSettingList:any) => {

    //console.log('curSettingItemTable=',JSON.stringify(settingItemTable,null,2));
    //console.log('modifiedSettingList=',JSON.stringify(modifiedSettingList,null,2));

    let value1;
    let value2;
    let value3;
    for(let item of modifiedSettingList) {
        const curValueTable = sdo.getSettingItemValueList(settingItemTable,item.groupID,item.itemName);
        if(item.valueTable[0].trim() !== "") {
            value1 = item.valueTable[0];
        } else {
            value1 = curValueTable[0];
        }
        if(item.valueTable[1].trim() !== "") {
            value2 = item.valueTable[1];
        } else {
            value2 = curValueTable[1];
        }
        if(item.valueTable[2].trim() !== "") {
            value3 = item.valueTable[2];
        } else {
            value3 = curValueTable[2];
        }
        settingItemTable = sdo.setSettingItemValue(settingItemTable,item.groupID,item.itemName,value1,value2,value3);

        //console.log('settingItemTable=',JSON.stringify(settingItemTable,null,2));
    }
    
    return settingItemTable;
};

const wasTokenSwapSettingModified = (settingTable:any) => {

    for(let item of settingTable) {
        if(item.groupID === constants.SETTINGS_GROUP_TOKEN) {
            return true;
        }
    }
    return false;
};

const wasMetadataBaseURISettingModified = (settingTable:any) => {

    for(let item of settingTable) {
        if(item.groupID === constants.SETTINGS_GROUP_NFT && item.itemName === constants.SETTINGS_ITEM_METADATABASEURI) {
            return true;
        }
    }
    return false;
};

const isOTPMandatorySettingIncluded = (settingItemTable:any) => {

    for(let item of settingItemTable) {
        if(item.groupID === constants.SETTINGS_GROUP_TOKEN) {
            return true;
        }
    }
    return false;
};

const updateSettingItems = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateSettingItems()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToUpdateSettingItemListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUpdateSetItemListInfo:sdo.ReqUpdateSettingItemListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateSetItemListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateSetItemListInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // OTP로 검증해야할 설정항목이 있다면 OTP체크!!
        if(cmnSvcProcessor.isLiveOp(reqUpdateSetItemListInfo.serverType) === true && isOTPMandatorySettingIncluded(reqUpdateSetItemListInfo.settingItemTable) === true && verifyOTPCode(reqUpdateSetItemListInfo.serverType,reqUpdateSetItemListInfo.otpCode) === false) {
            resultInfo.resultCode = ResultCode.OTP_VERIFICATION_FAILED;
            resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 스마트컨트랙트 주소 조회하기
        resultInfo = await settingDataHandler.queryDBNFTSettingInfo(sqlDataManager);
        let dbSettingInfo = resultInfo.data;
        const contractAddress = sdo.getSettingItemValue(dbSettingInfo,constants.SETTINGS_GROUP_NFT,constants.SETTINGS_ITEM_CONTRACTADDRESS);

        // NFT 메타데이터 URI가 변경되었다면 스마트컨트랙트에 저장
        if(wasMetadataBaseURISettingModified(reqUpdateSetItemListInfo.settingItemTable) === true) {
            resultInfo = await processMetadataBaseURIChange(reqUpdateSetItemListInfo.serverType,reqUpdateSetItemListInfo.settingItemTable,{contractAddress});
            if(resultInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
                return;
            }
        }

        // 변경사항만 기존 설정값에 반영하기
        dbSettingInfo = updateSettingItemTable(dbSettingInfo,reqUpdateSetItemListInfo.settingItemTable);

        console.log('newSettingTable=',JSON.stringify(dbSettingInfo,null,2));

        // 게임서버에 스왑관련 변경사항 전송하기
        if(wasTokenSwapSettingModified(reqUpdateSetItemListInfo.settingItemTable) === true) {
            resultInfo = await requestTokenSwapInfoToGameServer(reqUpdateSetItemListInfo.serverType,dbSettingInfo);
            if(resultInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
                return;
            }
        }

        // 수정요청된 환경설정 사항(들)을 DB에 반영
        const dbUpdateInfo = await settingDataHandler.updateSettingItems(sqlDataManager,dbSettingInfo);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
            return;
        }

        // 환경설정 변경 활동로그 DB에 저장
        const logDetailInfo:string = `{"settingInfoList":${JSON.stringify(reqUpdateSetItemListInfo.settingItemTable,null,2)}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateSetItemListInfo.adminID,activityType.ADMINACTIVITY_TYPE_SETTING_UPDATE,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateSettingItems()");
};
router.post('/update', updateSettingItems);


// 클라이언트 설정정보 조회 요청
const getClientConfig = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getClientConfig()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToQuerySettingItemListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqSettingListInfo:sdo.ReqQuerySettingItemListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqSettingListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqSettingListInfo, aclManager.ACL_POLICY_SETTING_VIEW);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // S3로부터 클라이언트 설정파일 읽어오기
        const result = await clientConfigManager.downloadFromBucket(reqSettingListInfo.serverType);
        if(result === null) {
            resultInfo.resultCode = ResultCode.SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED.toString()];
            return;
        }

        resultInfo = getResultForm(ResultCode.SUCCESS,'',clientConfigManager.getConfigData());

        // 환경설정 조회 활동로그 DB에 저장
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSettingListInfo.adminID,activityType.ADMINACTIVITY_TYPE_SETTING_VIEWCLIENTCONFIG,"");

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

    serviceLogger.logDebug("##### [END] getClientConfig()");
};
router.get('/clientconfig/list', getClientConfig);

// 클라이언트 설정정보 업데이트 요청
const updateClientConfig = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateSettingItems()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToUpdateClientSettingInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUpdateClientConfigInfo:sdo.ReqUpdateClientConfigInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateClientConfigInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateClientConfigInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 클라이언트 설정정보를 S3에 반영하기
        clientConfigManager.putConfigData(reqUpdateClientConfigInfo.clientConfig);
        const result = await clientConfigManager.uploadToBucket(reqUpdateClientConfigInfo.serverType);
        if(result === false) {
            resultInfo.resultCode = ResultCode.SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED.toString()];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }


        // 환경설정 변경 활동로그 DB에 저장
        const logDetailInfo:string = JSON.stringify(reqUpdateClientConfigInfo.clientConfig);
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateClientConfigInfo.adminID,activityType.ADMINACTIVITY_TYPE_SETTING_UPDATE,logDetailInfo);

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

    serviceLogger.logDebug("##### [END] updateSettingItems()");
};
router.get('/clientconfig/update', updateClientConfig);

export default router;