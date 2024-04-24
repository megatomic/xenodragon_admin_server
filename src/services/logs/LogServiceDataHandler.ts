import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo } from 'src/common/ResponseManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as ldo from './LogDataObject';
import * as Utils from 'src/common/Utils';

// ActivityLogInfo 객체를 message_info 테이블의 레코드(json)으로 변환
export const convertActivityLogInfoToDBRecord = (logInfo: ldo.ActivityLogInfo): any => {
  const recordObj = {
    log_id: logInfo.logID,
    admin_id: logInfo.adminID,
    activity_id: logInfo.activityID,
    activity_detail: logInfo.activityDetail,
    creation_time: logInfo.creationTime,
  };

  return recordObj;
};

// message_info 테이블의 레코드(json)을 ActivityLogInfo 객체로 변환
export const convertDBRecordToActivityLogInfo = (record: any): ldo.ActivityLogInfo => {
  const logInfo: ldo.ActivityLogInfo = {
    logID: record.log_id,
    adminID: record.admin_id,
    activityID: record.activity_id,
    activityName: <string>activityType.activityLogNameTable.get(record.activity_id),
    activityDetail: record.activity_detail,
    creationTime: record.creation_time,
  };

  return logInfo;
};

// 이벤트 목록 조회
export const queryDBActivityLogList = async (sqlDataManager: SQLDataManager, reqActivityLogListInfo: ldo.ReqActivityLogListInfo, queryNum: number): Promise<any> => {
  let pNo = reqActivityLogListInfo.pageNo;
  if (reqActivityLogListInfo.pageNo < 1) {
    pNo = 1;
  }

  let whereField = '';
  if (reqActivityLogListInfo.queryFilterInfo.filterActivityType !== activityType.ADMINACTIVITY_TYPE_ALL) {
    whereField = `where activity_id='${reqActivityLogListInfo.queryFilterInfo.filterActivityType}'`;
  }

  let whereField2 = '';
  if (reqActivityLogListInfo.queryFilterInfo.filterStartTime !== null || reqActivityLogListInfo.queryFilterInfo.filterEndTime !== null) {
    let startDate = '1900-01-01 00:00:00';
    let endDate = '2099-12-30 00:00:00';

    if (reqActivityLogListInfo.queryFilterInfo.filterStartTime !== null) {
      startDate = reqActivityLogListInfo.queryFilterInfo.filterStartTime;
    }

    if (reqActivityLogListInfo.queryFilterInfo.filterEndTime !== null) {
      endDate = reqActivityLogListInfo.queryFilterInfo.filterEndTime;
    }

    whereField2 = `${whereField != '' ? 'and ' : 'where '} creation_time between '${startDate}' and '${endDate}'`;
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.log_info ${whereField} ${whereField2} order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.log_info ${whereField} ${whereField2};`;

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

  const logInfoList: ldo.ActivityLogInfo[] = [];
  let logInfo: ldo.ActivityLogInfo;
  for (let logRecord of logList) {
    logInfo = convertDBRecordToActivityLogInfo(logRecord);
    logInfoList.push(logInfo);
  }
  resultInfo.data = {totalCount:totalRecordCount, list:logInfoList};

  return resultInfo;
};

// 새 이벤트 항목 등록
export const registerDBNewActivityLog = async (sqlDataManager: SQLDataManager, activityLogInfo: ldo.ActivityLogInfo): Promise<any> => {
  const fieldNameList = `(admin_id, activity_id, activity_detail, creation_time)`;
  const fieldValueList = `'${activityLogInfo.adminID}', '${activityLogInfo.activityID}', '${activityLogInfo.activityDetail}', '${Utils.getStdNowString()}'`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.log_info ${fieldNameList} values (${fieldValueList})`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};
