import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, getResultForm, ResultInfo, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import { isBooleanObject, isNumberObject } from 'util/types';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as ndo from './NFTDataObject';
import * as Utils from 'src/common/Utils';
import * as constants from 'src/common/constants';
import * as sdo from '../settings/SettingDataObject';
import {convertDBRecordToSettingItemInfo} from '../settings/SettingServiceDataHandler';

// nft_log_info 테이블의 레코드(json)을 ActivityLogInfo 객체로 변환
export const convertDBRecordToActivityLogInfo = (record: any): ndo.ActivityLogInfo => {
    const logInfo: ndo.ActivityLogInfo = {
        logID: record.log_id,
        activityType: record.activity_type,
        activityCount: record.activity_count,
        quantity: record.quantity,
        desc: record.activity_desc,
        reqGroupID: record.req_group_id,
        creationTime: record.creation_time,
        data: record.activity_data,
        targetAddress: record.target_address,
        packageType: record.package_type,
        packageData: record.package_data,
        state: record.state
    };
  
    return logInfo;
  };

  export const convertDBRecordToTransferLogInfo = (record: any): ndo.TransferLogInfo => {
    const logInfo: ndo.TransferLogInfo = {
      logID: record.log_id,
      groupID: record.group_id,
      comment: record.comment,
      sourceAddress: record.source_address,
      targetAddress: record.target_address,
      quantity: record.quantity,
      data: record.data,
      creationTime: record.creation_time
  };

  return logInfo;
  };

// 생성된 NFT 속성정보 목록을 DB에 추가
export const insertDBNFTItemList = async (sqlDataManager:SQLDataManager, reqNewAdminInfo:ndo.ReqGenerateNFTAttrsInfo, nftAttrList:ndo.NFTAttributeInfo[]):Promise<any> => {

    const fieldNameList = `(req_group_id, token_id, package_id, attribute_id, item_type, part_type, item_data, state, minting_count, minting_time, market_box_id)`;

    let fieldValueList = '';
    let itemData:string = '';

    type metadataType = {
      desc:string
    }
    for(let i=0;i<nftAttrList.length;i++) {
        if(fieldValueList !== '') {
            fieldValueList += ',';
        }

        (<metadataType>nftAttrList[i].metadata).desc = (<metadataType>nftAttrList[i].metadata).desc.replace(/\n/gi,'');
        itemData = JSON.stringify(nftAttrList[i].metadata);
        fieldValueList += `('${nftAttrList[i].reqGroupID}','${nftAttrList[i].tokenId}',${nftAttrList[i].packageId},'${nftAttrList[i].attributeId}',${nftAttrList[i].itemType},${nftAttrList[i].partType},'${cmnSvcProcessor.escapeSpecialCharsForJSON(itemData)}',${constants.NFT_MINT_STATE_CREATED},${reqNewAdminInfo.mintingCount},'${Utils.getStdNowString()}',0)`;
    }

    console.log('[DB] fieldValueList=',fieldValueList);
    
    // 생성만 하고 민팅을 않한 채, 다시 같은 회차로 생성을 요청할 경우, 기존 회차에 이미 생성한 NFT속성이 있다면 먼저 삭제함!!
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    if(reqNewAdminInfo.restartMintingCount === true) {
      let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.nft_item_info where minting_count=${reqNewAdminInfo.mintingCount};`;
      let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    }

    const sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.nft_item_info ${fieldNameList} values ${fieldValueList};`;
    const resultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// DB에서 생성된 NFT 속성정보 목록을 삭제
export const deleteDBNFTItemList = async (sqlDataManager:SQLDataManager, groupID:number, mintingCount:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements;
  if(mintingCount < 0) {
    sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.nft_item_info where req_group_id=${groupID};`;
  } else {
    sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.nft_item_info where req_group_id=${groupID} and minting_count=${mintingCount};`;
  }

  const resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

  return resultInfo;
};

// DB에서 NFT 속성목록 조회하기
export const queryDBNFTItemList = async (sqlDataManager:SQLDataManager, reqGroupID:number, itemType:string, partType:number, mintingCount:number, startTime:string, endTime:string):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    
    let whereFields1 = '';
    let whereFields2 = '';
    let whereFields3 = '';
    if(itemType.toUpperCase() !== 'ALL') {
      whereFields1 = `where item_type=${(itemType.toUpperCase() === 'DRAGON' ? 0:1)}`;
    }

    if(mintingCount > 0) {
      whereFields2 = `${whereFields1 != '' ? 'and ' : 'where '} minting_count=${mintingCount}`;
    }

    if(startTime !== '') {
      whereFields3 = `${(whereFields1 != '')||(whereFields2 != '') ? 'and ' : 'where '} minting_time between '${startTime}' and '${endTime}'`;
    }
  
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_item_info ${whereFields1} ${whereFields2} ${whereFields3}`;

    if(reqGroupID >= 0) {
      sqlStatements += `${(whereFields1 != '')||(whereFields2 != '')||(whereFields3 != '') ? 'and ' : 'where '} req_group_id=${reqGroupID}`;
    }

    if(partType >= 0) {
      if(reqGroupID >= 0) {
        sqlStatements += ` and part_type=${partType}`;
      } else {
        sqlStatements += `${(whereFields1 != '')||(whereFields2 != '')||(whereFields3 != '') ? 'and ' : 'where '} part_type=${partType}`;
      }
    }

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    } else {
      const nftAttrList = [...resultInfo.data];
      const nftAttrList2 = [];
      let metadata;
      for(let nftAttr of nftAttrList) {
        metadata = nftAttr.item_data;
        if(typeof nftAttr.item_data == "string") {
          nftAttr.item_data = nftAttr.item_data.replaceAll('\n','');
          metadata = JSON.parse(nftAttr.item_data);
        }
        metadata.externalURL = (metadata.externalURL===null?"":metadata.externalURL);
        nftAttrList2.push({...nftAttr,item_data:metadata});
      }
      resultInfo.data = nftAttrList2;
    }
    
    return resultInfo;
};

// DB에서 민팅된 토큰ID목록 조회하기
export const queryDBMintedTokenIDList = async (sqlDataManager:SQLDataManager,groupID:number,state:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let whereField1 = (groupID >= 0?`req_group_id=${groupID} and`:``);
  let sqlStatements;
  if(state < 0) {
    sqlStatements = `select token_id from ${dbmsInfo.defaultDatabase}.nft_item_info where ${whereField1} state>=0`;
  } else {
    sqlStatements = `select token_id from ${dbmsInfo.defaultDatabase}.nft_item_info where ${whereField1} state=${state}`;
  }
  
  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
  return resultInfo;
};

// DB에서 특정 주소로 전송된 토큰ID목록 조회하기
export const queryDBTransferedTokenIDList = async (sqlDataManager:SQLDataManager,groupID:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements = `select token_id from ${dbmsInfo.defaultDatabase}.nft_item_info where req_group_id=${groupID} and state=3`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
  const tokenIDList = [];
  for(let tokenInfo of resultInfo.data) {
    tokenIDList.push(BigInt(tokenInfo.token_id));
  }

  resultInfo.data = [...tokenIDList];
  return resultInfo;
};

// DB에서 그룹민팅한 NFT 토큰정보 조회하기
export const queryDBGroupNFTTokenList = async (sqlDataManager:SQLDataManager, groupID:number, mintingCount:number, state:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let whereField1 = ``;
  if(mintingCount >= 0) {
    whereField1 = ` and minting_count=${mintingCount}`;
  }

  let whereField2 = ``;
  if(state >= 0) {
    whereField2 = `and state=${state}`;
  }
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_item_info where req_group_id=${groupID} ${whereField1} ${whereField2}`;
  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  // reqGroupID에 해당하는 민팅정보에서 minting address를 가져오기
  sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_log_info where req_group_id=${groupID}`;
  const resultInfo2 = await sqlDataManager.querySQL(sqlStatements, null);
  const targetAddress = resultInfo2.data[0].target_address;

  if(resultInfo.data !== null && resultInfo.data.length !== undefined && resultInfo.data.length > 0) {
    const nftAttrList = [...resultInfo.data];
    const nftAttrList2 = [];
    const nftAttrList3 = [];
    for(let nftAttr of nftAttrList) {
        nftAttrList2.push(nftAttr.token_id);
        nftAttrList3.push({tokenID:nftAttr.token_id,attributeID:nftAttr.attribute_id,reqGroupID:-1,itemData:nftAttr.item_data,state:nftAttr.state,itemType:nftAttr.item_type,partType:nftAttr.part_type,packageID:nftAttr.package_id,mintingCount:nftAttr.minting_count,boxID:nftAttr.market_box_id});
    }
    resultInfo.data = {tokenIDList:nftAttrList2,itemInfoList:nftAttrList3,targetAddress};
  } else {
    resultInfo.resultCode = ResultCode.DB_QUERY_EMPTY;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.DB_QUERY_EMPTY.toString()];
  }

  return resultInfo;
};

// 그룹민팅한 NFT 토큰정보를 DB에 추가하기
export const insertDBGroupNFTTokenList = async (sqlDataManager:SQLDataManager, nftTokenInfoList:any[]):Promise<any> => {

  const fieldNameList = `(req_group_id, token_id, package_id, attribute_id, item_type, part_type, item_data, state, minting_count, minting_time, market_box_id)`;

  let fieldValueList = '';
  let itemData:string = '';

  type metadataType = {
    desc:string
  }
  for(let i=0;i<nftTokenInfoList.length;i++) {
      if(fieldValueList !== '') {
          fieldValueList += ',';
      }

      itemData = JSON.stringify(nftTokenInfoList[i].itemData);
      fieldValueList += `('${nftTokenInfoList[i].reqGroupID}','${nftTokenInfoList[i].tokenID}',${nftTokenInfoList[i].packageID},'${nftTokenInfoList[i].attributeID}',${nftTokenInfoList[i].itemType},${nftTokenInfoList[i].partType},'${cmnSvcProcessor.escapeSpecialCharsForJSON(itemData)}',${nftTokenInfoList[i].state},${nftTokenInfoList[i].mintingCount},'${Utils.getStdNowString()}',${nftTokenInfoList[i].boxID})`;
  }

  console.log('[DB] fieldValueList=',fieldValueList);
  
  // 생성만 하고 민팅을 않한 채, 다시 같은 회차로 생성을 요청할 경우, 기존 회차에 이미 생성한 NFT속성이 있다면 먼저 삭제함!!
  const dbmsInfo = sqlDataManager.getDBMSInfo();

  const sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.nft_item_info ${fieldNameList} values ${fieldValueList};`;
  const resultInfo = await sqlDataManager.querySQL(sqlStatements,null);

  return resultInfo;
};

// DB에서 패키지ID가 동일한 토큰 목록 조회하기
export const queryDBPackageInfoList = async (sqlDataManager:SQLDataManager, reqGroupID:string, packageIDTable:string[]):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = "";
  for(let packageID of packageIDTable) {
    sqlStatements += `select package_id,token_id from ${dbmsInfo.defaultDatabase}.nft_item_info where req_group_id=${parseInt(reqGroupID)} and package_id=${parseInt(packageID)};`;
  }

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  if(resultInfo.data !== null && resultInfo.data.length !== undefined && resultInfo.data.length > 0) {
    const packageInfoList = [...resultInfo.data];
    //console.log('packageInfoList=',packageInfoList);

    const table1 = [];
    if(packageInfoList.length > 0) {
      if(Array.isArray(packageInfoList[0]) === true) {
        for(let packageInfo of packageInfoList) {
          const tokenIDList = [];
          let packageID;
    
          for(let unitInfo of packageInfo) {
            packageID = unitInfo.package_id.toString();
            tokenIDList.push(unitInfo.token_id.toString());
          }
          table1.push({packageID,tokenIDTable:[...tokenIDList]});
        }
      } else {
        let packageID="";
        const tokenIDList = [];
        for(let packageInfo of packageInfoList) {
          packageID = packageInfo.package_id.toString();
          tokenIDList.push(packageInfo.token_id.toString());
        }
        table1.push({packageID,tokenIDTable:[...tokenIDList]});
      }
    }

    resultInfo.data = table1;
  }

  return resultInfo;
};

// DB에서 groupID가 동일한 패키지정보 조회하기
export const queryDBPackgaeInfoFroGroupID = async (sqlDataManager:SQLDataManager, groupID:string):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select package_data from ${dbmsInfo.defaultDatabase}.nft_log_info where req_group_id=${groupID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  if(resultInfo.data !== null && resultInfo.data.length !== undefined && resultInfo.data.length > 0) {

    console.log('resultInfo.data=',JSON.stringify(resultInfo.data,null,2));

    const packageInfoTable = [];
    for(let packageData of resultInfo.data) {
      const packageInfo = JSON.parse(packageData.package_data);
      for(let info of packageInfo) {
        packageInfoTable.push(info);
      }
    }

    resultInfo.data = packageInfoTable;
  } else {
    resultInfo.resultCode = ResultCode.DB_QUERY_EMPTY;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.DB_QUERY_EMPTY.toString()];
  }

  return resultInfo;
};

// NFT 속성목록의 상태값을 변경
export const updateDBNFTItemState = async (sqlDataManager:SQLDataManager, mintingCount:number, state:number):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let sqlStatements = `update ${dbmsInfo.defaultDatabase}.nft_item_info set state=${state} where minting_count=${mintingCount}`;  
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    return resultInfo;
};

// NFT 속성목록의 market_box_id값을 변경
export const updateDBNFTItemBoxID = async (sqlDataManager:SQLDataManager, groupID:number, mintingCount:number, updatedBoxInfoList:any):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements = '';
  for(let i=0;i<updatedBoxInfoList.length;i++) {
    sqlStatements += `update ${dbmsInfo.defaultDatabase}.nft_item_info set market_box_id=${updatedBoxInfoList[i].boxID} where req_group_id=${groupID} and minting_count=${mintingCount} and attribute_id='${updatedBoxInfoList[i].attributeID}';`;
  }

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

export const updateDBNFTItemStateWithTokenList = async (sqlDataManager:SQLDataManager, tokenIDList:string[], state:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements = '';
  for(let tokenID of tokenIDList) {
    sqlStatements += `update ${dbmsInfo.defaultDatabase}.nft_item_info set state=${state} where token_id=${tokenID};`;  
  }

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

export const insertDBNFTActLogInfo = async (sqlDataManager:SQLDataManager, actLogInfo:ndo.ActivityLogInfo):Promise<any> => {

    const fieldNameList = `(req_group_id, activity_type, activity_count, activity_desc, quantity, activity_data, creation_time, target_address, package_type, package_data, state)`;

    let fieldValueList = `('${actLogInfo.reqGroupID}',${actLogInfo.activityType},${actLogInfo.activityCount},'${actLogInfo.desc}',${actLogInfo.quantity},'${actLogInfo.data}','${Utils.getStdNowString()}','${actLogInfo.targetAddress}',${actLogInfo.packageType},'${actLogInfo.packageData}',${actLogInfo.state})`;

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.nft_log_info ${fieldNameList} values ${fieldValueList}`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

export const updateDBNFTActLogInfo = async (sqlDataManager:SQLDataManager, actLogInfo:ndo.ActivityLogInfo):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements = ``;
  if(actLogInfo.state === 2) { // 메타데이터 업로드 완료 상태
    sqlStatements = `update ${dbmsInfo.defaultDatabase}.nft_log_info set activity_desc='${actLogInfo.desc}', state=${actLogInfo.state} where log_id=${actLogInfo.logID};`;

  } else if(actLogInfo.state === 0) { // 민팅 완료 상태
    const updateFieldsList = `activity_desc='${actLogInfo.desc}',quantity=${actLogInfo.quantity},activity_data='${actLogInfo.data}',target_address='${actLogInfo.targetAddress}',package_type=${actLogInfo.packageType},package_data='${actLogInfo.packageData}',state=${actLogInfo.state}`;
    sqlStatements = `update ${dbmsInfo.defaultDatabase}.nft_log_info set ${updateFieldsList} where log_id=${actLogInfo.logID};`;
  }
  
  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

export const queryDBNFTActLog = async (sqlDataManager:SQLDataManager, logID:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  const sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_log_info where log_id=${logID};`;
  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const logInfo = convertDBRecordToActivityLogInfo(resultInfo.data[0]);
  resultInfo.data = logInfo;

  return resultInfo;
};

export const deleteDBNFTActLog = async (sqlDataManager:SQLDataManager, logID:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.nft_log_info where log_id=${logID};`;
  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

export const queryDBNFTActLogList = async (sqlDataManager:SQLDataManager, reqQueryNFTActLogListInfo:ndo.ReqQueryNFTActLogListInfo, queryNum:number):Promise<any> => {

    let pNo = reqQueryNFTActLogListInfo.pageNo;
    if (reqQueryNFTActLogListInfo.pageNo < 1) {
      pNo = 1;
    }

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements;
    if(queryNum > 0) {
      sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_log_info where activity_type=${reqQueryNFTActLogListInfo.activityType} order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
    } else {
      sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_log_info where activity_type=${reqQueryNFTActLogListInfo.activityType} order by creation_time desc;`;
    }
    sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.nft_log_info where activity_type=${reqQueryNFTActLogListInfo.activityType};`;

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    let logList: any[] = [];
    if (resultInfo.data !== null && resultInfo.data.length > 0) {
      logList = [...resultInfo.data[0]];
    }
  
    let totalRecordCount = logList.length;
    if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
      totalRecordCount =   resultInfo.data[1][0]['count(*)'];
    }
  
    console.log('totalRecCount=',totalRecordCount);
  
    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    }
  
    const logInfoList: ndo.ActivityLogInfo[] = [];
    let logInfo: ndo.ActivityLogInfo;
    for (let logRecord of logList) {
      logInfo = convertDBRecordToActivityLogInfo(logRecord);
      logInfoList.push(logInfo);
    }
    resultInfo.data = {totalCount:totalRecordCount, list:logInfoList};
  
    return resultInfo;
};

export const insertDBNFTTransferLogInfo = async (sqlDataManager:SQLDataManager, transferLogInfo:ndo.TransferLogInfo):Promise<any> => {

  const fieldNameList = `(group_id, comment, source_address, target_address, quantity, data, creation_time)`;

  let fieldValueList = `(${transferLogInfo.groupID},'${transferLogInfo.comment}','${transferLogInfo.sourceAddress}','${transferLogInfo.targetAddress}',${transferLogInfo.quantity},'${transferLogInfo.data}','${Utils.getStdNowString()}')`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.nft_translog_info ${fieldNameList} values ${fieldValueList}`;

  let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

  return resultInfo;
};

export const queryDBNFTTransferLogList = async (sqlDataManager:SQLDataManager, pageNo:number, queryNum:number):Promise<any> => {

  let pNo = pageNo;
  if (pageNo < 1) {
    pNo = 1;
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_translog_info order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.nft_translog_info;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  let logList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    logList = [...resultInfo.data[0]];
  }

  let totalRecordCount = logList.length;
  if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
    totalRecordCount =   resultInfo.data[1][0]['count(*)'];
  }

  console.log('totalRecCount=',totalRecordCount);

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  const logInfoList: ndo.TransferLogInfo[] = [];
  let logInfo: ndo.TransferLogInfo;
  for (let logRecord of logList) {
    logInfo = convertDBRecordToTransferLogInfo(logRecord);
    logInfoList.push(logInfo);
  }
  resultInfo.data = {totalCount:totalRecordCount, list:logInfoList};

  return resultInfo;
};

export const queryDBNFTTransferLog = async (sqlDataManager:SQLDataManager, groupID:number):Promise<any> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.nft_translog_info where group_id=${groupID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  if(resultInfo.resultCode === ResultCode.SUCCESS) {
    resultInfo.data = convertDBRecordToTransferLogInfo(resultInfo.data[0]);
  }

  return resultInfo;
};