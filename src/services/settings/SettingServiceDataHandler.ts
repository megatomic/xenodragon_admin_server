import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, getResultForm, ResultInfo } from 'src/common/ResponseManager';
import { isBooleanObject, isNumberObject } from 'util/types';
import * as sdo from './SettingDataObject';
import * as Utils from 'src/common/Utils';

export const convertDBRecordToSettingItemInfo = (record: any): sdo.SettingItemInfo => {
  const itemInfo: sdo.SettingItemInfo = {
    settingID: record.setting_id,
    groupID: record.group_id,
    itemName: record.item_name,
    itemValue1: record.item_value1,
    itemValue2: record.item_value2,
    itemValue3: record.item_value3,
  };

  return itemInfo;
};

export const convertDBRecordToInternalPropInfo = (record: any): sdo.InternalPropInfo => {

  const itemInfo: sdo.InternalPropInfo = {
    propID: record.prop_id,
    propName: record.prop_name,
    propInt: record.prop_int,
    propString: record.prop_string,
    propData: record.prop_data
  };

  return itemInfo;
};

// 환경설정 항목들을 DB에서 조회
export const queryDBSettingItemList = async (sqlDataManager: SQLDataManager): Promise<any> => {
  // let pNo = reqQuerySettingItemListInfo.pageNo;
  // if(reqQuerySettingItemListInfo.pageNo < 1) {
  //     pNo = 1;
  // }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.setting_info`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const settingItemList = [...resultInfo.data];
  resultInfo.data = settingItemList[0];

  let itemInfoList: sdo.SettingItemInfo[] = [];
  let itemInfo: sdo.SettingItemInfo;
  for (let itemRecord of settingItemList) {
    itemInfo = convertDBRecordToSettingItemInfo(itemRecord);
    itemInfoList.push(itemInfo);
  }
  resultInfo.data = itemInfoList;

  return resultInfo;
};

// 변경요청된 설정항목(들)을 DB에 갱신
export const updateSettingItems = async (sqlDataManager: SQLDataManager, settingItemTable:sdo.SettingItemInfo[]): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();

  //console.log('settingItemTable=',settingItemTable);
  
  let sqlStatements = '';
  for (let item of settingItemTable) {
    if(item.itemValue1 !== null && item.itemValue1.trim() !== '') {
      sqlStatements += `update ${dbmsInfo.defaultDatabase}.setting_info set item_value1='${item.itemValue1}', item_value2='${item.itemValue2}', item_value3='${item.itemValue3}', update_time='${Utils.getStdNowString()}' where group_id='${item.groupID}' and item_name='${item.itemName}';`;
    }
  }

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

export const queryDBNFTSettingInfo = async (sqlDataManager:SQLDataManager):Promise<ResultInfo> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.setting_info`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const settingItemList = [...resultInfo.data];
  resultInfo.data = settingItemList[0];

  let itemInfoList: sdo.SettingItemInfo[] = [];
  let itemInfo: sdo.SettingItemInfo;
  for (let itemRecord of settingItemList) {
    itemInfo = convertDBRecordToSettingItemInfo(itemRecord);
    itemInfoList.push(itemInfo);
  }
  resultInfo.data = itemInfoList;

  return resultInfo;
};

// 내부 관리용 데이터 조회
export const queryDBInternalPropInfo = async (sqlDataManager:SQLDataManager):Promise<ResultInfo> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.internal_info`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const internalPropInfoList = [...resultInfo.data];
  resultInfo.data = internalPropInfoList[0];

  let itemInfoList: sdo.InternalPropInfo[] = [];
  let itemInfo: sdo.InternalPropInfo;
  for (let itemRecord of internalPropInfoList) {
    itemInfo = convertDBRecordToInternalPropInfo(itemRecord);
    itemInfoList.push(itemInfo);
  }
  resultInfo.data = itemInfoList;

  return resultInfo;
};

// 내부 관리용 데이터 업데이트
export const updateDBInternalPropInfo = async (sqlDataManager:SQLDataManager,internalPropInfo:sdo.InternalPropInfo[]):Promise<ResultInfo> => {

  const dbmsInfo = sqlDataManager.getDBMSInfo();

  let sqlStatements=``;
  for(let propInfo of internalPropInfo) {
    sqlStatements += `update ${dbmsInfo.defaultDatabase}.internal_info set prop_int=${propInfo.propInt}, prop_string="${propInfo.propString}", prop_data="${propInfo.propData}" where prop_name="${propInfo.propName}";`;
  }

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};