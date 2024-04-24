import { Request, Response, NextFunction, Router } from 'express';
import { ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as walletDataHandler from 'src/services/wallet/WalletServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import { createHashedPassword, makePasswordHashed } from 'src/common/CryptoManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as aao from 'src/services/auth/AuthDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as wdo from 'src/services/wallet/WalletDataObject';
import * as activityType from 'src/services/common/AdminActivityType';
import JWTManager from 'src/services/common/JWTManager';
import * as Utils from 'src/common/Utils';

import {processWalletBalanceInfo} from 'src/services/common/WalletContractManager';
import {processERC20TokenTransfer,processMarketContractInfo,processMarketContractSettingInfo,processMarketContractSettingInfoUpdate,processMarketBalanceTransfer} from 'src/services/common/NFTContractManager';

const requestIP = require('request-ip');

const router = Router();

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessWalletRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

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

    const loginAccountInfo:ado.AccountInfo = ado.convertDBToAccountRecordInfo(resultInfo.data,false);
    resultInfo.data = loginAccountInfo;
    
    // 로그인 유저가 policyType 권한이 있는지 체크
    // if(aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo,policyKey) === false) {
    //     resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
    // }

    return resultInfo;
}

// 지갑 목록 조회하기
const getWalletBalanceInfo = async (req: Request, res: Response): Promise<any> => {
  
    serviceLogger.logDebug("##### [START] getWalletBalanceInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToWalletBalanceInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqWalletBalanceInfo:wdo.ReqWalletBalanceInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqWalletBalanceInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqWalletBalanceInfo, aclManager.ACL_POLICY_ACCOUNT_VIEWLIST);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 특정 지갑의 잔액정보 조회
        resultInfo = await processWalletBalanceInfo(reqWalletBalanceInfo.serverType,reqWalletBalanceInfo.address,{});

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

    serviceLogger.logDebug("##### [END] getWalletBalanceInfo()");
};
router.post('/balanceinfo', getWalletBalanceInfo);

// 지갑 목록 조회하기
const queryWalletListInfo = async (req: Request, res: Response): Promise<any> => {
  
    serviceLogger.logDebug("##### [START] queryWalletListInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToWalletListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqWalletListInfo:wdo.ReqWalletListInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqWalletListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqWalletListInfo, aclManager.ACL_POLICY_ACCOUNT_VIEWLIST);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 지갑목록 조회
        const dbQueryInfo = await walletDataHandler.queryDBWalletList(sqlDataManager,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        const walletInfoList = dbQueryInfo.data.list;
        const walletInfoList2 = [];

        // 각 지갑별 코인잔액 조회하기
        for await(let walletInfo of walletInfoList) {
            const resultInfo2 = await processWalletBalanceInfo(reqWalletListInfo.serverType,walletInfo.walletAddress,{walletKey:walletInfo.walletKey});
            walletInfoList2.push({walletAddress:walletInfo.walletAddress,walletName:walletInfo.walletName,walletKey:walletInfo.walletKey,balanceInfo:{ksta:resultInfo2.data.ksta,nst:resultInfo2.data.nst,xdc:resultInfo2.data.xdc}});
        }

        if(walletInfoList2.length > 0) {
            dbQueryInfo.data.list = walletInfoList2;
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

    serviceLogger.logDebug("##### [END] queryWalletListInfo()");
};
router.post('/list', queryWalletListInfo);


// 새지갑 등록
const addNewWallet = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] addNewWallet()");

    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await wdo.convertReqParamToAddWalletInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqAddWalletInfo:wdo.ReqAddWalletInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAddWalletInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqAddWalletInfo, aclManager.ACL_POLICY_ACCOUNT_REGISTER);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // 새 지갑을 DB에 추가
      const dbUpdateInfo = await walletDataHandler.addDBNewWallet(sqlDataManager,reqAddWalletInfo);
      if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
          return;
      }

      // 새 지갑 등록 활동로그 DB에 저장
      const logDetailInfo:string = `{"walletAddress":${reqAddWalletInfo.walletAddress},"walletName":${reqAddWalletInfo.walletName},"walletKey":${reqAddWalletInfo.walletKey.length+'자리'}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAddWalletInfo.adminID,activityType.ADMINACTIVITY_TYPE_WALLET_ADDNEW,logDetailInfo);

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

    serviceLogger.logDebug("##### [END] addNewWallet()");
};
router.post('/new', addNewWallet);


// 지갑정보 업데이트
const updateWallet = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateWallet()");

    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await wdo.convertReqParamToUpdateWalletInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqUpdateWalletInfo:wdo.ReqUpdateWalletInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateWalletInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqUpdateWalletInfo, aclManager.ACL_POLICY_ACCOUNT_REGISTER);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // 지갑정보를 DB에 업데이트
      const dbUpdateInfo = await walletDataHandler.updateDBWalletInfo(sqlDataManager,reqUpdateWalletInfo);
      if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
          return;
      }

      // 새 지갑 등록 활동로그 DB에 저장
      const logDetailInfo:string = `{"walletName":${reqUpdateWalletInfo.walletName},"walletKey":${reqUpdateWalletInfo.walletKey.length+'자리'}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateWalletInfo.adminID,activityType.ADMINACTIVITY_TYPE_WALLET_UPDATE,logDetailInfo);

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

    serviceLogger.logDebug("##### [END] updateWallet()");
};
router.post('/update', updateWallet);


// 지갑 삭제
const deleteWallet = async (req: Request, res: Response) => {
    serviceLogger.logDebug('##### [START] deleteWallet()');
  
    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await wdo.convertReqParamToDeleteWalletInfo(req);
      if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, null);
        return;
      }
      const reqDeleteWalletInfo: wdo.ReqDeleteWalletInfo = resultInfo.data;
    
      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqDeleteWalletInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqDeleteWalletInfo, aclManager.ACL_POLICY_ACCOUNT_REGISTER);
      if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
        return;
      }
    
      const loginAccountInfo: ado.AccountInfo = resultInfo.data;
    
      // 이벤트 삭제
      const dbUpdateInfo = await walletDataHandler.deleteDBWallet(sqlDataManager, reqDeleteWalletInfo);
      if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
        return;
      }
    
      // 이벤트 삭제 활동로그 DB에 저장
      const logDetailInfo: string = `{"walletAddress":${reqDeleteWalletInfo.walletAddress}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqDeleteWalletInfo.adminID, activityType.ADMINACTIVITY_TYPE_WALLET_DELETE, logDetailInfo);
    
      cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);

    } catch(err) {
      console.log(err);

      const resultInfo = {
          resultCode: ResultCode.SYSTEM_INTERNALERROR,
          message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
          data:err
      };

      cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }
  
    serviceLogger.logDebug('##### [END] deleteWallet()');
  };
router.post('/delete', deleteWallet);

// ERC20 코인/토큰 전송하기
const transferERC20Token = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] transferERC20Token()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToTransferToken(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqTransferTokenInfo:wdo.ReqTransferTokenInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqTransferTokenInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqTransferTokenInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 지갑주소에 대한 개인키 조회하기
        const dbQueryInfo = await walletDataHandler.queryDBWallet(sqlDataManager,reqTransferTokenInfo.senderWalletAddress);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        console.log('resultInfo=',resultInfo);
        let senderPrivateKey = dbQueryInfo.data.walletKey;

        // 토큰전송 요청하기
        resultInfo = await processERC20TokenTransfer(reqTransferTokenInfo.serverType, reqTransferTokenInfo.initReq, reqTransferTokenInfo.tokenInfo, reqTransferTokenInfo.targetAddressList,{privateKey:senderPrivateKey});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에 NFT전송 로그를 기록
        //let dbUpateInfo = await nftDataHandler.updateDBNFTItemState(sqlDataManager,reqMintNFTInfo.mintingCount,constants.NFT_MINT_STATE_MINTED);

        // 환경설정 조회 활동로그 DB에 저장
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqTransferTokenInfo.adminID,activityType.ADMINACTIVITY_TYPE_TOKEN_TRANSFER,"");

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

    serviceLogger.logDebug("##### [END] transferERC20Token()");
};
router.post('/token/transfer', transferERC20Token);

// 마켓 매출 조회하기
const getMarketContractInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getMarketContractInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToGetMarketContractInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqGetMarketContractInfo:wdo.ReqGetMarketContractInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqGetMarketContractInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqGetMarketContractInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 마켓 컨트랙트 타입('B2C','C2C')에 따른 판매 컨트랙트에서 KSTA/NST/XDC 잔액 조회하기
        resultInfo = await processMarketContractInfo(reqGetMarketContractInfo.serverType,reqGetMarketContractInfo.contractType,reqGetMarketContractInfo.balanceInfo,{});
        if(resultInfo.resultCode != ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
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

    serviceLogger.logDebug("##### [END] getMarketContractInfo()");
};
router.post('/marketcontract/info', getMarketContractInfo);

// 마켓 매출 전송하기
const transferMarketBalanceToAddress = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] transferMarketBalanceToAddress()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToTransferMarketBalanceToAddress(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqTransferMarketBalanceInfo:wdo.ReqTransferMarketBalanceInfo = resultInfo.data;

        if(reqTransferMarketBalanceInfo.serverType === 'LIVE') {
            reqTransferMarketBalanceInfo.ownerAddress = process.env.LIVE_MARKET_OPERATOR_ADDRESS!;
        } else {
            reqTransferMarketBalanceInfo.ownerAddress = process.env.QA_MARKET_OPERATOR_ADDRESS!;
        }

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqTransferMarketBalanceInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqTransferMarketBalanceInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        let ownerPrivateKey = process.env.LIVE_MARKET_OPERATOR_PRIVATEKEY;
        if(reqTransferMarketBalanceInfo.serverType.toUpperCase() !== 'LIVE') {
            ownerPrivateKey = process.env.QA_MARKET_OPERATOR_PRIVATEKEY;
        }

        // 토큰전송 요청하기
        resultInfo = await processMarketBalanceTransfer(reqTransferMarketBalanceInfo.serverType, reqTransferMarketBalanceInfo.ownerAddress, reqTransferMarketBalanceInfo.contractType, reqTransferMarketBalanceInfo.itemType, reqTransferMarketBalanceInfo.tokenType,
                    reqTransferMarketBalanceInfo.amount, reqTransferMarketBalanceInfo.targetAddress,{privateKey:ownerPrivateKey});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB에 NFT전송 로그를 기록
        //let dbUpateInfo = await nftDataHandler.updateDBNFTItemState(sqlDataManager,reqMintNFTInfo.mintingCount,constants.NFT_MINT_STATE_MINTED);

        // 토큰 전송 활동로그 DB에 저장
        const detailInfo = {contractType:reqTransferMarketBalanceInfo.contractType,itemType:reqTransferMarketBalanceInfo.itemType,coinType:reqTransferMarketBalanceInfo.tokenType,amount:reqTransferMarketBalanceInfo.amount,targetAddress:reqTransferMarketBalanceInfo.targetAddress};
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqTransferMarketBalanceInfo.adminID,activityType.ADMINACTIVITY_TYPE_MARKET_BALANCE_TRANSFER,JSON.stringify(detailInfo));

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

    serviceLogger.logDebug("##### [END] transferMarketBalanceToAddress()");
};
router.post('/marketcontract/transfer', transferMarketBalanceToAddress);

// 마켓 컨트랙트 설정정보 조회
const queryMarketContractSettingInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryMarketContractSettingInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToQueryMarketContractSettingInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqQueryMarketContractSettingInfo:wdo.ReqQueryMarketContractSettingInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryMarketContractSettingInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqQueryMarketContractSettingInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 마켓 컨트랙트 타입('B2C','C2C')에 따른 판매 컨트랙트에서 KSTA/NST/XDC 잔액 조회하기
        resultInfo = await processMarketContractSettingInfo(reqQueryMarketContractSettingInfo.serverType,reqQueryMarketContractSettingInfo.contractType,{});
        if(resultInfo.resultCode != ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
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

    serviceLogger.logDebug("##### [END] queryMarketContractSettingInfo()");
};
router.post('/marketcontract/settinginfo', queryMarketContractSettingInfo);

// 마켓 컨트랙트 설정정보 업데이트
const updateMarketContractSettingInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateMarketContractSettingInfo()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await wdo.convertReqParamToUpdateMarketContractSettingInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqUpdateMarketContractSettingInfo:wdo.ReqUpdateMarketContractSettingInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateMarketContractSettingInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessWalletRequest(req, res, sqlDataManager, reqUpdateMarketContractSettingInfo, aclManager.ACL_POLOCIY_NFT_MINT);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        let ownerPrivateKey = process.env.LIVE_MARKET_OPERATOR_PRIVATEKEY;
        if(reqUpdateMarketContractSettingInfo.serverType.toUpperCase() !== 'LIVE') {
            ownerPrivateKey = process.env.QA_MARKET_OPERATOR_PRIVATEKEY;
        }

        // 마켓 컨트랙트 타입('B2C','C2C')에 따른 판매 컨트랙트에서 KSTA/NST/XDC 잔액 조회하기
        resultInfo = await processMarketContractSettingInfoUpdate(reqUpdateMarketContractSettingInfo.serverType,reqUpdateMarketContractSettingInfo.contractType,reqUpdateMarketContractSettingInfo.contractSettingInfo,{privateKey:ownerPrivateKey});
        if(resultInfo.resultCode != ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
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

    serviceLogger.logDebug("##### [END] updateMarketContractSettingInfo()");
};
router.post('/marketcontract/settinginfo/update', updateMarketContractSettingInfo);

export default router;
