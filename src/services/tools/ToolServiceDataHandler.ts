import SQLDataManager from "src/common/db/SQLDataManager";
import {
  ResultCode,
  ResultInfo,
  getResultForm,
  ReqValidationErrorMsg,
} from "src/common/ResponseManager";
import * as cmnSvcProcessor from "src/services/common/CommonServiceProcessor";
import * as activityType from "src/services/common/AdminActivityType";
import * as tdo from "./ToolDataObject";
import * as Utils from "src/common/Utils";
import * as constants from "src/common/constants";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { bool } from "aws-sdk/clients/signer";

dayjs.extend(utc);

export const convertDBRecordToMarketUserInfo = (
  record: any
): tdo.MarketUserInfo => {
  const userInfo: tdo.MarketUserInfo = {
    userID: record.uid,
    name: record.name,
    email: record.email,
    walletAddress: record.address,
    nationCode: record.nationCode,
    timestamp: record.timestamp,
  };

  return userInfo;
};

// 게임서버 DB테이블 조회 처리
export const queryDBGameDBTable = async (
  sqlDataManager: SQLDataManager,
  dbName: string,
  tableName: string
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbName}.${tableName}`;
  let sqlStatements2 = `show columns from ${dbName}.${tableName}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );
  const tableData = resultInfo.data;

  const resultInfo2: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements2,
    null
  );
  const tableColumnData = resultInfo2.data;

  if (resultInfo.data.length === 0) {
    resultInfo.data = { columnInfo: tableColumnData, tableData: [] };
  } else {
    resultInfo.data = { columnInfo: tableColumnData, tableData: tableData };
  }

  return resultInfo;
};

// 아레나 테이블에 데이터 업데이트 처리
export const updateDBArenaTableInfo = async (
  sqlDataManager: SQLDataManager,
  tableName: string,
  tableData: any
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let resultInfo = getResultForm(ResultCode.SUCCESS, "", null);
  let sqlStatements;
  try {
    sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.${tableName};`;
    resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

    // if(resultInfo.resultCode !== ResultCode.SUCCESS) {

    // }

    // sqlStatements = `update ${dbmsInfo.defaultDatabase}.notification_info set activation_flag=${reqEventActivationInfo.activationFlag === true ? 1 : 0} where event_id = ${
    //     reqEventActivationInfo.notiID
    // }`;
    // resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  } catch (err: any) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      resultInfo.resultCode = ResultCode.TOOL_ARENA_UPDATE_TABLENOTFOUND;
      resultInfo.message =
        ReqValidationErrorMsg[
          ResultCode.TOOL_ARENA_UPDATE_TABLENOTFOUND.toString()
        ];
    } else {
      resultInfo.resultCode = ResultCode.SYSTEM_INTERNALERROR;
      resultInfo.message =
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()];
    }
  }

  return resultInfo;
};

// 시즌정보를 마켓DB에 업데이트
export const registerMarketSeasonInfo = async (
  sqlDataManager: SQLDataManager,
  seasonInfo: any,
  seasonActiveFlag: boolean
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let resultInfo = getResultForm(ResultCode.SUCCESS, "", null);

  // item_shop_seasons 테이블에 등록
  resultInfo = await sqlDataManager.querySQL(
    `select idx from ${dbmsInfo.marketDatabase}.item_shop_seasons where name='Season #${seasonInfo.seasonNo}'`,
    null
  );
  if (
    resultInfo.resultCode !== ResultCode.SUCCESS &&
    resultInfo.resultCode !== ResultCode.DB_QUERY_EMPTY
  ) {
    return resultInfo;
  }

  let fieldNameList: string = "";
  let fieldValueList: string = "";
  let sqlStatements: string = "";
  let timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");
  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    let fieldNameList = `(name, enabled, timestamp)`;
    let fieldValueList = `('Season #${seasonInfo.seasonNo}', ${
      seasonActiveFlag === true ? 1 : 0
    }, '${timestamp}')`;

    sqlStatements = `insert into ${dbmsInfo.marketDatabase}.item_shop_seasons ${fieldNameList} values ${fieldValueList};`;
  } else {
    sqlStatements = `update ${
      dbmsInfo.marketDatabase
    }.item_shop_seasons set enabled=${
      seasonActiveFlag === true ? 1 : 0
    },timestamp='${timestamp}' where idx=${resultInfo.data[0].idx};`;
  }

  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // item_shop_type 테이블에 등록
  resultInfo = await sqlDataManager.querySQL(
    `select idx from ${dbmsInfo.marketDatabase}.item_shop_types where sidx=${seasonInfo.seasonNo}`,
    null
  );
  if (
    resultInfo.resultCode !== ResultCode.SUCCESS &&
    resultInfo.resultCode !== ResultCode.DB_QUERY_EMPTY
  ) {
    return resultInfo;
  }

  console.log("idx2 table=", resultInfo.data);

  // 이미 item_shop_type에 해당 시즌의 데이터가 들어가 있으면 업데이트
  const itemShopTypeIdxTable = [];
  if (resultInfo.resultCode === ResultCode.SUCCESS) {
    for (let info of resultInfo.data) {
      itemShopTypeIdxTable.push(info.idx);
    }
  }

  fieldNameList = `(sidx, type, name, enabled, timestamp)`;
  fieldValueList = "";
  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      fieldValueList += ",";
    }
    if (i === 0) {
      fieldValueList += `(${seasonInfo.seasonNo},0,'Mystery Box - Dragon', ${
        seasonInfo.cardDragonActiveFlag === true ? 1 : 0
      }, '${timestamp}')`;
      sqlStatements += `update ${
        dbmsInfo.marketDatabase
      }.item_shop_types set enabled=${
        seasonInfo.cardDragonActiveFlag === true ? 1 : 0
      }, timestamp='${timestamp}' where idx=${itemShopTypeIdxTable[i]};`;
    } else if (i === 1) {
      fieldValueList += `(${seasonInfo.seasonNo},1,'Mystery Box - Gear', ${
        seasonInfo.cardGearActiveFlag === true ? 1 : 0
      }, '${timestamp}')`;
      sqlStatements += `update ${
        dbmsInfo.marketDatabase
      }.item_shop_types set enabled=${
        seasonInfo.cardGearActiveFlag === true ? 1 : 0
      }, timestamp='${timestamp}' where idx=${itemShopTypeIdxTable[i]};`;
    } else if (i === 2) {
      fieldValueList += `(${seasonInfo.seasonNo},2,'Mystery Box - Land', 0, '${timestamp}')`;
    } else {
      fieldValueList += `(${seasonInfo.seasonNo},4,'Mystery Box - Package', ${
        seasonInfo.cardPackageActiveFlag === true ? 1 : 0
      }, '${timestamp}')`;
      sqlStatements += `update ${
        dbmsInfo.marketDatabase
      }.item_shop_types set enabled=${
        seasonInfo.cardPackageActiveFlag === true ? 1 : 0
      }, timestamp='${timestamp}' where idx=${itemShopTypeIdxTable[i]};`;
    }
  }

  if (itemShopTypeIdxTable.length === 0) {
    sqlStatements = `insert into ${dbmsInfo.marketDatabase}.item_shop_types ${fieldNameList} values ${fieldValueList};`;
  }
  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 민팅정보를 마켓DB에 등록하기
export const registerMarketNFTInfo = async (
  sqlDataManager: SQLDataManager,
  seasonInfo: any,
  itemType: string,
  marketRegistrationInfoList: any
): Promise<any> => {
  let fieldNameList = `(address, type, geartype, category, title, itemurl, revealed, revealurl, price, networkId, tokenId, packageId, metadata, mupdated, soldout, enabled, timestamp)`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  //console.log('dbmsInfo=',dbmsInfo);

  let fieldValueList = "";
  let packageCheckFlagTable = [];
  for (let i = 0; i < marketRegistrationInfoList.length; i++) {
    if (fieldValueList !== "") {
      fieldValueList += ",";
    }

    fieldValueList += `('${marketRegistrationInfoList[i].address}',
        ${marketRegistrationInfoList[i].type},
        '${marketRegistrationInfoList[i].geartype}',
        ${seasonInfo.seasonCategoryNo},
        '${marketRegistrationInfoList[i].title}',
        '${marketRegistrationInfoList[i].itemurl}',
        ${marketRegistrationInfoList[i].revealed},
        '${marketRegistrationInfoList[i].revealurl}',
        ${marketRegistrationInfoList[i].price},
        ${marketRegistrationInfoList[i].networkId},
        '${marketRegistrationInfoList[i].tokenId}',
        ${marketRegistrationInfoList[i].packageId},
        '${cmnSvcProcessor.escapeSpecialCharsForJSON(
          JSON.stringify(marketRegistrationInfoList[i].metadata)
        )}',
        '${marketRegistrationInfoList[i].mupdated}',
        ${marketRegistrationInfoList[i].soldout},
        ${marketRegistrationInfoList[i].enabled},
        '${marketRegistrationInfoList[i].timestamp}')`;

    if (marketRegistrationInfoList[i].type === 4) {
      packageCheckFlagTable.push(true);
    } else {
      packageCheckFlagTable.push(false);
    }
  }

  //console.log('fieldValueList=',fieldValueList);

  let resultInfo = getResultForm(ResultCode.SUCCESS, "", null);

  // item_shop 테이블에 등록
  let sqlStatements = `insert into ${dbmsInfo.marketDatabase}.item_shop ${fieldNameList} values ${fieldValueList}`;
  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.resultCode = ResultCode.MARKET_REGISTER_NFT_INSERTERROR1;
    resultInfo.message =
      ReqValidationErrorMsg[resultInfo.resultCode.toString()];
    return resultInfo;
  }

  const firstInsertId = resultInfo.data.insertId;
  console.log("firstInsertId=", firstInsertId);

  let itemShopIndexTable = [];
  let itemShopPackageIndexTable = [];
  for (let i = 0; i < marketRegistrationInfoList.length; i++) {
    itemShopIndexTable.push(firstInsertId + i);
    if (packageCheckFlagTable[i] === true) {
      itemShopPackageIndexTable.push(firstInsertId + i);
    }
  }

  // item_shop_cards 테이블에 등록
  fieldNameList = `(address, type, category, title, itemurl, revealed, revealurl, price, networkId, metadata, discount, package, canBuy, enabled, timestamp)`;
  fieldValueList = "";

  // item_shop_cards 테이블로부터 해당 아이템타입의 idx값 조회
  if (itemType === "dragon") {
    sqlStatements = `select * from ${dbmsInfo.marketDatabase}.item_shop_types where sidx=${seasonInfo.seasonNo} and type=0;`;
  } else if (itemType === "package") {
    sqlStatements = `select * from ${dbmsInfo.marketDatabase}.item_shop_types where sidx=${seasonInfo.seasonNo} and type=4;`;
  } else {
    sqlStatements = `select * from ${dbmsInfo.marketDatabase}.item_shop_types where sidx=${seasonInfo.seasonNo} and type=1;`;
  }

  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.resultCode = ResultCode.MARKET_REGISTER_NFT_NO_SEASONINFO;
    resultInfo.message =
      ReqValidationErrorMsg[resultInfo.resultCode.toString()];
    return resultInfo;
  }

  console.log("item_shop_cards.result.data=", resultInfo.data);

  const itemTypeIndex = resultInfo.data[0].idx;
  let title = "";
  if (itemType === "dragon") {
    title = "Mystery box - Dragon";
    for (let i = 0; i < 4; i++) {
      if (i > 0) {
        fieldValueList += ",";
      }
      fieldValueList += `(
                '${marketRegistrationInfoList[0].address}',
                ${itemTypeIndex},
                ${seasonInfo.seasonCategoryNo},
                '${title}',
                '${marketRegistrationInfoList[0].itemurl}',
                ${marketRegistrationInfoList[0].revealed},
                '${marketRegistrationInfoList[0].revealurl}',
                ${marketRegistrationInfoList[0].price},
                ${marketRegistrationInfoList[0].networkId},
                '${cmnSvcProcessor.escapeSpecialCharsForJSON(
                  JSON.stringify(marketRegistrationInfoList[0].metadata)
                )}',
                0, 0, 1, 1,
                '${marketRegistrationInfoList[i].timestamp}')`;
    }
  } else if (itemType.indexOf("gear") >= 0) {
    if (itemType === "gear.head") {
      title = "Mystery box - Gear(Head)";
    } else if (itemType === "gear.body") {
      title = "Mystery box - Gear(Body)";
    } else if (itemType === "gear.wing") {
      title = "Mystery box - Gear(Wing)";
    } else if (itemType === "gear.tail") {
      title = "Mystery box - Gear(Tail)";
    }
    fieldValueList = `(
            '${marketRegistrationInfoList[0].address}',
            ${itemTypeIndex},
            ${seasonInfo.seasonCategoryNo},
            '${title}',
            '${marketRegistrationInfoList[0].itemurl}',
            ${marketRegistrationInfoList[0].revealed},
            '${marketRegistrationInfoList[0].revealurl}',
            ${marketRegistrationInfoList[0].price},
            ${marketRegistrationInfoList[0].networkId},
            '${cmnSvcProcessor.escapeSpecialCharsForJSON(
              JSON.stringify(marketRegistrationInfoList[0].metadata)
            )}',
            0, 0, 1, 1,
            '${marketRegistrationInfoList[0].timestamp}')`;
  } else if (itemType === "package") {
    title = "Mystery box - Package";
    const packageMetadata =
      '{"name":"Packages","type":4,"description":"DESCRITION OF Adora-Levan","image":"https://s3.ap-northeast-2.amazonaws.com/nstep.marketplace/statics/unveil/unveil_package.png","reveal_flag":1,"attributes":[{"trait_type":"Grade","level":0,"value":"SSR","displayType":"text","maxValue":0}],"tokenId":28051665}';
    for (let i = 0; i < 4; i++) {
      if (i > 0) {
        fieldValueList += ",";
      }
      fieldValueList += `(
                '${marketRegistrationInfoList[0].address}',
                ${itemTypeIndex},
                ${seasonInfo.seasonCategoryNo},
                '${title}',
                '${marketRegistrationInfoList[0].itemurl}',
                ${marketRegistrationInfoList[0].revealed},
                '${marketRegistrationInfoList[0].revealurl}',
                ${marketRegistrationInfoList[0].price},
                ${marketRegistrationInfoList[0].networkId},
                ${packageMetadata},
                0, 1, 1, 1,
                '${marketRegistrationInfoList[i].timestamp}')`;
    }
  }

  sqlStatements = `insert into ${dbmsInfo.marketDatabase}.item_shop_cards ${fieldNameList} values ${fieldValueList}`;
  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.resultCode = ResultCode.MARKET_REGISTER_NFT_INSERTERROR2;
    resultInfo.message =
      ReqValidationErrorMsg[resultInfo.resultCode.toString()];
    return resultInfo;
  }

  resultInfo = await sqlDataManager.querySQL(
    `select idx,title from ${dbmsInfo.marketDatabase}.item_shop_cards where type=${itemTypeIndex} and category=${seasonInfo.seasonCategoryNo}`,
    null
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  console.log(`item_shop_cards=${JSON.stringify(resultInfo.data, null, 2)}`);

  const itemShopCardIndexTable = [];
  if (itemType.indexOf("gear") >= 0) {
    let gearType;
    if (itemType === "gear.head") {
      gearType = constants.GEAR_TYPE_HEAD;
    } else if (itemType === "gear.body") {
      gearType = constants.GEAR_TYPE_BODY;
    } else if (itemType === "gear.wing") {
      gearType = constants.GEAR_TYPE_WING;
    } else if (itemType === "gear.tail") {
      gearType = constants.GEAR_TYPE_TAIL;
    }
    for (let i = 0; i < resultInfo.data.length; i++) {
      if (resultInfo.data[i].title.indexOf(gearType) >= 0) {
        itemShopCardIndexTable.push(resultInfo.data[i].idx);
        break;
      }
    }
  } else {
    for (let i = 0; i < resultInfo.data.length; i++) {
      itemShopCardIndexTable.push(resultInfo.data[i].idx);
    }
  }

  // item_shop_cards_idx 테이블에 등록
  fieldNameList = `(cidx,sidx,enabled,timestamp)`;
  fieldValueList = "";

  if (itemShopPackageIndexTable.length > 0) {
    // 패키지 등록
    for (let i = 0; i < itemShopPackageIndexTable.length; i++) {
      if (fieldValueList !== "") {
        fieldValueList += ",";
      }

      fieldValueList += `(${
        itemShopCardIndexTable[i % itemShopCardIndexTable.length]
      },
            ${itemShopPackageIndexTable[i]},
            1,
            '${dayjs().format("YYYY-MM-DD HH:mm:ss")}')`;
    }
  } else {
    for (let i = 0; i < marketRegistrationInfoList.length; i++) {
      if (fieldValueList !== "") {
        fieldValueList += ",";
      }

      fieldValueList += `(${
        itemShopCardIndexTable[i % itemShopCardIndexTable.length]
      },
            ${itemShopIndexTable[i]},
            1,
            '${dayjs().format("YYYY-MM-DD HH:mm:ss")}')`;
    }
  }

  sqlStatements = `insert into ${dbmsInfo.marketDatabase}.item_shop_cards_idx ${fieldNameList} values ${fieldValueList}`;
  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.resultCode = ResultCode.MARKET_REGISTER_NFT_INSERTERROR3;
    resultInfo.message =
      ReqValidationErrorMsg[resultInfo.resultCode.toString()];
    return resultInfo;
  }

  return resultInfo;
};

// 마켓DB에서 유저정보 조회하기
export const queryMarketUserList = async (
  sqlDataManager: SQLDataManager,
  queryFilterInfo: any,
  pageNo: number,
  queryNum: number
): Promise<any> => {
  let pNo = pageNo;
  if (pageNo < 1) {
    pNo = 1;
  }

  let whereField = "";
  if (queryFilterInfo.targetWalletAddress.trim() !== "") {
    if (queryFilterInfo.targetWalletAddress.trim() === "0x") {
      whereField = `where address like "${queryFilterInfo.targetWalletAddress}%"`;
    } else {
      whereField = `where address="${queryFilterInfo.targetWalletAddress}"`;
    }
  } else if (queryFilterInfo.targetUserEmail.trim() !== "") {
    whereField = `where email like "%${queryFilterInfo.targetUserEmail}%"`;
  } else if (queryFilterInfo.targetUserKeyword.trim() !== "") {
    whereField = `where (uid="${queryFilterInfo.targetUserKeyword}" or name like "%${queryFilterInfo.targetUserKeyword}%" or nationCode="${queryFilterInfo.targetUserKeyword}")`;
  }

  let whereField2 = "";
  if (
    queryFilterInfo.filterStartTime !== null ||
    queryFilterInfo.filterEndTime !== null
  ) {
    let startDate = "1900-01-01 00:00:00";
    let endDate = "2099-12-30 00:00:00";

    if (queryFilterInfo.filterStartTime !== null) {
      startDate = queryFilterInfo.filterStartTime;
    }

    if (queryFilterInfo.filterEndTime !== null) {
      endDate = queryFilterInfo.filterEndTime;
    }

    whereField2 = `${
      whereField != "" ? "and " : "where "
    } timestamp between '${startDate}' and '${endDate}'`;
  }

  //console.log(`queryFilterInfo=${JSON.stringify(queryFilterInfo,null,2)}`);

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${
    dbmsInfo.marketDatabase
  }.account ${whereField} ${whereField2} order by timestamp desc limit ${queryNum} offset ${
    (pNo - 1) * queryNum
  };`;
  sqlStatements += `select count(*) from ${dbmsInfo.marketDatabase}.account ${whereField} ${whereField2};`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );

  let userList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    userList = [...resultInfo.data[0]];
  }

  let totalRecordCount = userList.length;
  if (
    resultInfo.data[1][0] !== undefined &&
    resultInfo.data[1][0]["count(*)"] !== undefined
  ) {
    totalRecordCount = resultInfo.data[1][0]["count(*)"];
  }

  console.log("totalRecCount=", totalRecordCount);

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  const userInfoList: tdo.MarketUserInfo[] = [];
  let userInfo: tdo.MarketUserInfo;
  for (let userRecord of userList) {
    userInfo = convertDBRecordToMarketUserInfo(userRecord);
    userInfoList.push(userInfo);
  }
  resultInfo.data = { totalCount: totalRecordCount, list: userInfoList };

  return resultInfo;
};

// 마켓DB에서 게임다운로드주소 정보 조회하기
export const queryMarketDownloadURLInfo = async (
  sqlDataManager: SQLDataManager
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.marketDatabase}.download_url`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const tableData = resultInfo.data[0];

  resultInfo.data = {
    apkDownloadURL: tableData.homepage,
    iosMarketURL: tableData.ios,
    androidMarketURL: tableData.android,
    timestamp: tableData.timestamp,
  };
  return resultInfo;
};

// 게임다운로드주소 정보를 마켓DB에 업데이트
export const updateMarketDownloadURLInfo = async (
  sqlDataManager: SQLDataManager,
  apkDownloadURL: string,
  iosMarketURL: string,
  androidMarketURL: string
): Promise<any> => {
  let timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.marketDatabase}.download_url set homepage="${apkDownloadURL}", ios="${iosMarketURL}", android="${androidMarketURL}", timestamp="${timestamp}" where idx=1;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );

  return resultInfo;
};

// 마켓DB에서 점검정보 조회하기
export const queryMarketMaintenanceInfo = async (
  sqlDataManager: SQLDataManager
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.marketDatabase}.maintanance_information`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const tableData = resultInfo.data[0];

  const startTimeLocal = dayjs(tableData.start)
    .add(9, "hour")
    .format("YYYY-MM-DD HH:mm:ss");
  const endTimeLocal = dayjs(tableData.end)
    .add(9, "hour")
    .format("YYYY-MM-DD HH:mm:ss");
  resultInfo.data = {
    activeFlag: tableData.enabled === 0 ? false : true,
    startTime: startTimeLocal,
    endTime: endTimeLocal,
    title: tableData.title,
    content: tableData.message,
  };
  return resultInfo;
};

// 마켓 점검정보를 마켓DB에 업데이트
export const updateMarketMaintenanceInfo = async (
  sqlDataManager: SQLDataManager,
  activeFlag: boolean,
  startTime: string,
  endTime: string,
  title: string,
  content: string
): Promise<any> => {
  let timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const startTimeUTC = dayjs(startTime).utc().format("YYYY-MM-DD HH:mm:ss");
  const endTimeUTC = dayjs(endTime).utc().format("YYYY-MM-DD HH:mm:ss");

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${
    dbmsInfo.marketDatabase
  }.maintanance_information set enabled=${
    activeFlag === true ? 1 : 0
  }, start="${startTimeUTC}", end="${endTimeUTC}", title="${title}", message="${content}", timestamp="${timestamp}" where type=0;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );

  return resultInfo;
};

// 마켓 화이트리스트 조회
export const queryMarketWhitelistInfo = async (
  sqlDataManager: SQLDataManager
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.marketDatabase}.maintanance_whitelist`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  //console.log(`resultInfo.data=${JSON.stringify(resultInfo.data)}`);
  const tableData = resultInfo.data;

  const whiteTable = [];
  let userID;
  for await (let user of tableData) {
    if (user.uid.indexOf("_") >= 0) {
      userID = user.uid.substring(1);
    } else {
      userID = user.uid;
    }
    sqlStatements = `select uid,name,email,address,nationCode from ${dbmsInfo.marketDatabase}.account where uid="${userID}"`;
    const resultInfo2: ResultInfo = await sqlDataManager.querySQL(
      sqlStatements,
      null
    );

    //console.log(`resultInfo2.data=${JSON.stringify(resultInfo2.data)}`);
    if (resultInfo2.resultCode !== ResultCode.SUCCESS) {
      return resultInfo2;
    }

    whiteTable.push({
      uid: resultInfo2.data[0].uid,
      name: resultInfo2.data[0].name,
      walletAddress: resultInfo2.data[0].address,
      isActive: user.uid === resultInfo2.data[0].uid,
    });
  }

  resultInfo.data = whiteTable;

  return resultInfo;
};

// 마켓 새 화이트유저 등록
export const registerNewMarketWhiteUser = async (
  sqlDataManager: SQLDataManager,
  keyword: string
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = null;
  if (keyword.indexOf("0x") === 0) {
    sqlStatements = `select * from ${dbmsInfo.marketDatabase}.account where address="${keyword}"`;
  } else {
    sqlStatements = `select * from ${dbmsInfo.marketDatabase}.account where uid="${keyword}"`;
  }

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );

  console.log(`resultInfo.data=${JSON.stringify(resultInfo.data)}`);

  const userID = resultInfo.data[0].uid;
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  sqlStatements = `select * from ${dbmsInfo.marketDatabase}.maintanance_whitelist where uid like "%${userID}%"`;
  resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
    if (resultInfo.resultCode !== ResultCode.SUCCESS && resultInfo.resultCode != ResultCode.DB_QUERY_EMPTY) {
      return resultInfo;
    }

    if(resultInfo.data.length > 0) {
        resultInfo.resultCode = 999;
        return resultInfo;
    }

    resultInfo = await sqlDataManager.querySQL(
      `insert into ${dbmsInfo.marketDatabase}.maintanance_whitelist (uid) values ("${userID}")`,
      null
    );

    return resultInfo;
};

// 마켓 화이트유저 상태 변경
export const changeMarketWhiteUserState = async (
  sqlDataManager: SQLDataManager,
  userID: string,
  activationFlag: boolean
): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${
    dbmsInfo.marketDatabase
  }.maintanance_whitelist set uid="${
    activationFlag === true ? userID : "_" + userID
  }" where uid like "%${userID}%" limit 1;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(
    sqlStatements,
    null
  );

  return resultInfo;
};
