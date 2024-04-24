import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,ReqValidationErrorMsg, getResultForm} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,DBSOURCE_MARKET,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import dayjs, { ManipulateType } from 'dayjs';
import * as toolDataHandler from './ToolServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as nftServiceController from 'src/services/nft/NFTServiceController';
import * as walletDataHandler from 'src/services/wallet/WalletServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import * as activityType from 'src/services/common/AdminActivityType';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as tdo from 'src/services/tools/ToolDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as constants from 'src/common/constants';

require('dotenv').config();

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

//  게임서버 DB 테이블 조회
const queryGameDBTable = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryGameDBTable()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToQueryGameDBTable(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryDBTableInfo:tdo.ReqQueryDBTableInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryDBTableInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqQueryDBTableInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryDBTableInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임서버 DB 테이블 조회
        const dbQueryInfo = await toolDataHandler.queryDBGameDBTable(sqlDataManager2,reqQueryDBTableInfo.dbName,reqQueryDBTableInfo.tableName);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryGameDBTable()");
};
router.post('/gamedbtable/query', queryGameDBTable);


// 아레나 테이블 업데이트
const updateArenaTableInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateArenaTableInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToSaveArenaInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqSaveArenaInfo:tdo.ReqSaveArenaInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqSaveArenaInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqSaveArenaInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에 아레나 데이터 업데이트
        const dbQueryInfo = await toolDataHandler.updateDBArenaTableInfo(sqlDataManager,reqSaveArenaInfo.tableName,reqSaveArenaInfo.tableData);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        // 아레나 테이블 업데이트 활동로그 DB에 저장
        const logDetailInfo = `{"tableName":"${reqSaveArenaInfo.tableName}"}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSaveArenaInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOOL_UPDATEARENATABLE,logDetailInfo);

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

    serviceLogger.logDebug("##### [END] updateArenaTableInfo()");
};
router.post('/arena/update', updateArenaTableInfo);

// 시즌 정보를 마켓에 등록
const registerSeasonInfoToMarket = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] registerSeasonInfoToMarket()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToRegisterSeasonInfoToMarket(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqRegisterSeasonInfoToMarketInfo:tdo.ReqRegisterSeasonInfoToMarketInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqRegisterSeasonInfoToMarketInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqRegisterSeasonInfoToMarketInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqRegisterSeasonInfoToMarketInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 시즌정보를 마켓DB에 등록
        const dbUpdateInfo = await toolDataHandler.registerMarketSeasonInfo(sqlDataManager2,reqRegisterSeasonInfoToMarketInfo.seasonInfo,reqRegisterSeasonInfoToMarketInfo.seasonActivationFlag);

        // 마켓 시즌정보 업데이트 활동로그 DB에 저장
        const logDetailInfo = `{"seasonInfo":"${JSON.stringify(reqRegisterSeasonInfoToMarketInfo.seasonInfo)}","seasonActivationFlag":${reqRegisterSeasonInfoToMarketInfo.seasonActivationFlag}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqRegisterSeasonInfoToMarketInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOOL_REGISTERSEASONTOMARKET,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] registerSeasonInfoToMarket()");
};
router.post('/market/season/register', registerSeasonInfoToMarket);


const makeNFTMarketRegistrationInfo = async (adminSQLManager:SQLDataManager, seasonInfo:any, itemType:string, price:number, mintingInfoTable:any):Promise<any> => {

    const gearNameTable=[constants.GEAR_TYPE_HEAD,constants.GEAR_TYPE_BODY,constants.GEAR_TYPE_WING,constants.GEAR_TYPE_TAIL];
    const resultInfo = getResultForm(ResultCode.SUCCESS,"",null);

    const marketRegistrationInfoTable = [];
    const marketRegistrationInfo:any = {
        address:"",
        type:1, // 1:드래곤, 2:기어
        geartype:null,
        category:(itemType==='package'?4:1), // 1:일반, 4:패키지
        title:"",
        itemurl:"",
        revealed:0,
        revealurl:"",
        price:0.0,
        networkId:4, // 4:드래곤,5:기어,6:패키지
        tokenId: "",
        packageId: "",
        metadata: "",
        mupdated: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        soldout:0,
        enabled:1,
        timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss")
    };

    // DB에서 이름으로 지갑주소정보 조회하기
    const dbQueryInfo = await walletDataHandler.queryDBWalletByTag(adminSQLManager,'마켓 운영자 계정');
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        dbQueryInfo.resultCode = ResultCode.WALLET_CANT_FIND_MARKETOPADDRESS;
        dbQueryInfo.message = ReqValidationErrorMsg[dbQueryInfo.resultCode.toString()];
        return dbQueryInfo;
    }

    let metadataTemplate;
    let packageCount=0;
    for(let mintingInfo of mintingInfoTable) {
        marketRegistrationInfo.address = dbQueryInfo.data.walletAddress;
        marketRegistrationInfo.type = mintingInfo.itemType+1;
        marketRegistrationInfo.geartype = (mintingInfo.itemType===0?null:gearNameTable[mintingInfo.partType]);
        marketRegistrationInfo.category = (mintingInfo.packageId!=="0"?4:1);
        marketRegistrationInfo.title = mintingInfo.itemData.name;
        marketRegistrationInfo.price = price;

        if(marketRegistrationInfo.category === 4) {
            packageCount++;
        }

        if(mintingInfo.itemType===0) {
            marketRegistrationInfo.itemurl = nftServiceController.NFT_IMAGE_DRAGON_BASEURI.replace('{fileId}',mintingInfo.itemData.imageURL);
            marketRegistrationInfo.revealurl = "https://s3.ap-northeast-2.amazonaws.com/nstep.marketplace/statics/unveil/unveil_dragon.png";
            if(mintingInfo.packageId!=="0") {
                marketRegistrationInfo.networkId = 6;
            } else {
                marketRegistrationInfo.networkId = 4;
            }
        } else {
            marketRegistrationInfo.itemurl = nftServiceController.NFT_IMAGE_GEAR_BASEURI.replace('{fileId}',mintingInfo.itemData.imageURL);
            marketRegistrationInfo.revealurl = "https://s3.ap-northeast-2.amazonaws.com/nstep.marketplace/statics/unveil/unveil_gear.png";
            if(mintingInfo.packageId!=="0") {
                marketRegistrationInfo.networkId = 6;
            } else {
                marketRegistrationInfo.networkId = 5;
            }
        }
        marketRegistrationInfo.tokenId = mintingInfo.tokenId;
        marketRegistrationInfo.packageId = mintingInfo.packageId;

        metadataTemplate = {...nftServiceController.metadataTemplate,attributes:[...nftServiceController.metadataTemplate.attributes]};

        metadataTemplate.groupID = mintingInfo.reqGroupId;
        metadataTemplate.name = mintingInfo.itemData.name;
        metadataTemplate.type = mintingInfo.itemType;
        metadataTemplate.description = mintingInfo.itemData.desc;
        if(mintingInfo.itemType===0) {
            metadataTemplate.image = nftServiceController.NFT_IMAGE_DRAGON_BASEURI.replace('{fileId}',mintingInfo.itemData.imageURL);
        } else {
            metadataTemplate.image = nftServiceController.NFT_IMAGE_GEAR_BASEURI.replace('{fileId}',mintingInfo.itemData.imageURL);
        }

        metadataTemplate.animation_url = mintingInfo.itemData.animationURL;
        metadataTemplate.external_url = mintingInfo.itemData.externalURL;
        for(let j=0;j<mintingInfo.itemData.attributes.length;j++) {
            metadataTemplate.attributes.push({
                trait_type:mintingInfo.itemData.attributes[j].traitType,
                level:mintingInfo.itemData.attributes[j].level,
                value:mintingInfo.itemData.attributes[j].value,
                displayType:mintingInfo.itemData.attributes[j].displayType,
                maxValue:mintingInfo.itemData.attributes[j].maxValue
            });
        }

        //console.log('metadataTemplate=',JSON.stringify(metadataTemplate));

        marketRegistrationInfo.metadata = {...metadataTemplate};

        marketRegistrationInfoTable.push(JSON.parse(JSON.stringify(marketRegistrationInfo)));

        // 특정 패키지에 속하는 5개의 아이템 항목 추가후 '패키지 항목'을 별도로 추가.
        if(packageCount === 5) {
            marketRegistrationInfo.geartype = null;
            marketRegistrationInfo.type = 4;
            marketRegistrationInfo.title = 'Package';
            marketRegistrationInfo.itemurl = "https://s3.ap-northeast-2.amazonaws.com/nstep.marketplace/statics/unveil/unveil_package.png";
            marketRegistrationInfo.revealurl = null;
            marketRegistrationInfo.revealed = 1;
            marketRegistrationInfo.tokenId = marketRegistrationInfo.packageId;
            marketRegistrationInfo.metadata.name = "Packages";
            marketRegistrationInfo.metadata.type = 4;
            marketRegistrationInfo.metadata.reveal_flag = 1;
            marketRegistrationInfo.metadata.image = marketRegistrationInfo.itemurl;
            marketRegistrationInfo.metadata.tokenId = marketRegistrationInfo.tokenId;
            marketRegistrationInfo.metadata.attributes = [{"trait_type":"Grade","level":0,"value":"SSR","displayType":"text","maxValue":0}];
            marketRegistrationInfoTable.push(JSON.parse(JSON.stringify(marketRegistrationInfo)));

            packageCount = 0;
        }
    }

    resultInfo.data = marketRegistrationInfoTable;
    
    return resultInfo;
};

// 마켓 유저정보 조회
const queryMarketUserList = async (req: Request, res: Response) => {

  serviceLogger.logDebug("##### [START] queryMarketUserList()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await tdo.convertReqParamToQueryMarketUserList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqQueryMarketUserListInfo: tdo.ReqQueryMarketUserListInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqQueryMarketUserListInfo.serverType
      )
    );
    const sqlDataManager2: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_MARKET,
        reqQueryMarketUserListInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqQueryMarketUserListInfo,
      aclManager.ACL_POLICY_SETTING_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      cmnSvcProcessor.releaseDataManager(sqlDataManager2);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    //console.log(`itemType:${reqRegisterNFTToMarketInfo.itemType}, mintingInfoTable=${JSON.stringify(reqRegisterNFTToMarketInfo.mintingInfoTable)}`);

    // 마켓DB에서 유저정보 조회
    const dbQueryInfo = await toolDataHandler.queryMarketUserList(
      sqlDataManager2,
      reqQueryMarketUserListInfo.queryFilterInfo,
      reqQueryMarketUserListInfo.pageNo,
      parseInt(<string>process.env.QUERY_NUM_PERPAGE)
    );



    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryMarketUserList()");
};
router.post('/market/user/list', queryMarketUserList);

// NFT 정보를 마켓에 등록
const registerNFTInfoToMarket = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] registerNFTInfoToMarket()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToRegisterNFTToMarket(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqRegisterNFTToMarketInfo:tdo.ReqRegisterNFTToMarketInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqRegisterNFTToMarketInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqRegisterNFTToMarketInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqRegisterNFTToMarketInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;


        //console.log(`itemType:${reqRegisterNFTToMarketInfo.itemType}, mintingInfoTable=${JSON.stringify(reqRegisterNFTToMarketInfo.mintingInfoTable)}`);

        // 요청 데이터를 마켓에 등록할 수 있는 형식으로 변환
        resultInfo = await makeNFTMarketRegistrationInfo(sqlDataManager,reqRegisterNFTToMarketInfo.seasonInfo,reqRegisterNFTToMarketInfo.itemType,reqRegisterNFTToMarketInfo.price,reqRegisterNFTToMarketInfo.mintingInfoTable);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const marketRegistrationInfoList = resultInfo.data;
        //console.log('marketRegistrationInfo=',JSON.stringify(marketRegistrationInfoList,null,2));

        // NFT민팅정보를 마켓DB에 등록
        const dbUpdateInfo = await toolDataHandler.registerMarketNFTInfo(sqlDataManager2,reqRegisterNFTToMarketInfo.seasonInfo,reqRegisterNFTToMarketInfo.itemType,marketRegistrationInfoList);

        // 마켓 NFT정보 등록 활동로그 DB에 저장
        const logDetailInfo = `{"itemType":"${reqRegisterNFTToMarketInfo.itemType}","itemNum":${reqRegisterNFTToMarketInfo.mintingInfoTable.length}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqRegisterNFTToMarketInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOOL_REGISTERNFTTOMARKET,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] registerNFTInfoToMarket()");
};
router.post('/market/nft/register', registerNFTInfoToMarket);

// 마켓 일반설정: 게임 다운로드 정보 조회
const queryMarketDownloadURLInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryMarketDownloadURLInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToQueryMarketDownloadURLInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryMarketDownloadURLInfo:ReqBaseInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryMarketDownloadURLInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqQueryMarketDownloadURLInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryMarketDownloadURLInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 마켓DB에서 마켓다운로드 주소정보 조회
        const dbQueryInfo = await toolDataHandler.queryMarketDownloadURLInfo(sqlDataManager2);

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryMarketDownloadURLInfo()");
};
router.post('/market/setting/downloadurl', queryMarketDownloadURLInfo);

// 마켓 일반설정: 게임 다운로드 정보 업데이트
const updateMarketDownloadURLInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateMarketDownloadURLInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToUpdateMarketDownloadURLInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUpdateMarketDownloadURLInfo:tdo.ReqUpdateMarketDownloadURLInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateMarketDownloadURLInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqUpdateMarketDownloadURLInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateMarketDownloadURLInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임 다운로드주소 정보를 마켓DB에 등록
        const dbUpdateInfo = await toolDataHandler.updateMarketDownloadURLInfo(sqlDataManager2,reqUpdateMarketDownloadURLInfo.apkDownloadURL,reqUpdateMarketDownloadURLInfo.iosMarketURL,reqUpdateMarketDownloadURLInfo.androidMarketURL);

        // 활동로그 DB에 저장
        const logDetailInfo = `{"apkDownloadURL":"${reqUpdateMarketDownloadURLInfo.apkDownloadURL}","iosMarketURL":"${reqUpdateMarketDownloadURLInfo.iosMarketURL}","androidMarketURL":"${reqUpdateMarketDownloadURLInfo.androidMarketURL}"}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateMarketDownloadURLInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOOL_UPDATEDOWNLOADURL,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateMarketDownloadURLInfo()");
};
router.post('/market/setting/downloadurl/update', updateMarketDownloadURLInfo);

// 마켓 일반설정: 마켓 점검설정 정보 조회
const queryMarketMaintenanceInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryMarketMaintenanceInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToQueryMarketMaintenanceLInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryMarketMaintenanceInfo:ReqBaseInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryMarketMaintenanceInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqQueryMarketMaintenanceInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryMarketMaintenanceInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 마켓DB에서 점검정보 조회
        const dbQueryInfo = await toolDataHandler.queryMarketMaintenanceInfo(sqlDataManager2);

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryMarketMaintenanceInfo()");
};
router.post('/market/setting/maintenance', queryMarketMaintenanceInfo);

// 마켓 일반설정: 마켓 점검설정 정보 업데이트
const updateMarketMaintenanceInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateMarketMaintenanceInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await tdo.convertReqParamToUpdateMarketMaintenanceLInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUpdateMarketMaintenanceInfo:tdo.ReqUpdateMarketMaintenanceInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateMarketMaintenanceInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_MARKET,reqUpdateMarketMaintenanceInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateMarketMaintenanceInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;


        // NFT민팅정보를 마켓DB에 등록
        const dbUpdateInfo = await toolDataHandler.updateMarketMaintenanceInfo(sqlDataManager2,reqUpdateMarketMaintenanceInfo.activeFlag,reqUpdateMarketMaintenanceInfo.startTime,reqUpdateMarketMaintenanceInfo.endTime,reqUpdateMarketMaintenanceInfo.title,reqUpdateMarketMaintenanceInfo.content);

        // 마켓 NFT정보 등록 활동로그 DB에 저장
        const logDetailInfo = `{"activeFlag":"${reqUpdateMarketMaintenanceInfo.activeFlag}","startTime":"${reqUpdateMarketMaintenanceInfo.startTime}","endTime":"${reqUpdateMarketMaintenanceInfo.endTime}","title":"${reqUpdateMarketMaintenanceInfo.title}"}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateMarketMaintenanceInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOOL_UPDATEMAINTENANCEINFO,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateMarketMaintenanceInfo()");
};
router.post('/market/setting/maintenance/update', updateMarketMaintenanceInfo);

// 마켓 일반설정: 마켓 화이트리스트 조회
const queryMarketWhitelistInfo = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryMarketWhitelistInfo()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await tdo.convertReqParamToQueryMarketWhitelistInfo(
      req
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqQueryMarketWhitelistInfo: tdo.ReqQueryMarketWhitelistInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqQueryMarketWhitelistInfo.serverType
      )
    );
    const sqlDataManager2: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_MARKET,
        reqQueryMarketWhitelistInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqQueryMarketWhitelistInfo,
      aclManager.ACL_POLICY_SETTING_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      cmnSvcProcessor.releaseDataManager(sqlDataManager2);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 마켓DB에서 점검정보 조회
    const dbQueryInfo = await toolDataHandler.queryMarketWhitelistInfo(
      sqlDataManager2
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryMarketWhitelistInfo()");
};
router.post("/market/setting/whitelist/list", queryMarketWhitelistInfo);

// 마켓 일반설정: 마켓 새 화이트리스트 등록
const registerNewMarketWhiteUser = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] registerNewMarketWhiteUser()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await tdo.convertReqParamToRegisterNewMarketWhiteUserInfo(
      req
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqRegisterNewMarketWhiteUserInfo: tdo.ReqRegisterNewMarketWhiteUserInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqRegisterNewMarketWhiteUserInfo.serverType
      )
    );
    const sqlDataManager2: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_MARKET,
        reqRegisterNewMarketWhiteUserInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqRegisterNewMarketWhiteUserInfo,
      aclManager.ACL_POLICY_SETTING_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      cmnSvcProcessor.releaseDataManager(sqlDataManager2);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 마켓DB에서 점검정보 조회
    const dbQueryInfo = await toolDataHandler.registerNewMarketWhiteUser(
      sqlDataManager2,
      reqRegisterNewMarketWhiteUserInfo.keyword
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] registerNewMarketWhiteUser()");
};
router.post("/market/setting/whitelist/new", registerNewMarketWhiteUser);

// 마켓 일반설정: 마켓 화이트리스트 상태 변경
const changeMarketWhiteUserState = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] changeMarketWhiteUserState()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await tdo.convertReqParamToChangeMarketWhiteUserStateInfo(
      req
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqQueryMarketMaintenanceInfo: tdo.ReqChangeMarketWhiteUserStateInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqQueryMarketMaintenanceInfo.serverType
      )
    );
    const sqlDataManager2: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_MARKET,
        reqQueryMarketMaintenanceInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqQueryMarketMaintenanceInfo,
      aclManager.ACL_POLICY_SETTING_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      cmnSvcProcessor.releaseDataManager(sqlDataManager2);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 마켓DB에서 점검정보 조회
    const dbQueryInfo = await toolDataHandler.changeMarketWhiteUserState(
      sqlDataManager2,
      reqQueryMarketMaintenanceInfo.userID,
      reqQueryMarketMaintenanceInfo.activationFlag
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] changeMarketWhiteUserState()");
};
router.post("/market/setting/whitelist/changestate", changeMarketWhiteUserState);

export default router;