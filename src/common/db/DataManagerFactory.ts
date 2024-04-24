import SQLDataManager  from './SQLDataManager';
import MySQLDataManager from './MySQLDataManager';
import FileSQLDataManager from './FileSQLDataManager';
import * as constants from 'src/common/constants';
import {local_admin_dbinfo, review_admin_dbinfo, qa_admin_dbinfo, live_admin_dbinfo, dev_market_dbinfo, qa_market_dbinfo, review_market_dbinfo, live_market_dbinfo} from 'settings/dbconfig';

let _dataManagerPool = [];

export const DBSOURCE_ADMIN = 1;
export const DBSOURCE_GAMESERVER = 2;
export const DBSOURCE_STATISTICS = 3;
export const DBSOURCE_MARKET = 4;

export const getSQLDataManager = async (dbSource:number,serverType:string) => {

    let dbinfo:any;
    
    if(dbSource === DBSOURCE_ADMIN) {
        dbinfo = local_admin_dbinfo;
        if(serverType.toUpperCase() === constants.SERVER_TYPE_REVIEW) {
            dbinfo = review_admin_dbinfo;
        } else if(serverType.toUpperCase() === constants.SERVER_TYPE_QA) {
            dbinfo = qa_admin_dbinfo;
        } else if(serverType.toUpperCase() === 'CBT' || serverType.toUpperCase() === constants.SERVER_TYPE_LIVE) {
            dbinfo = live_admin_dbinfo;
        }
    } else if(dbSource === DBSOURCE_MARKET) {
        dbinfo = dev_market_dbinfo;
        if(serverType.toUpperCase() === constants.SERVER_TYPE_REVIEW) {
            dbinfo = review_market_dbinfo;
        } else if(serverType.toUpperCase() === constants.SERVER_TYPE_QA) {
            dbinfo = qa_market_dbinfo;
        } else if(serverType.toUpperCase() === 'CBT' || serverType.toUpperCase() === constants.SERVER_TYPE_LIVE) {
            dbinfo = live_market_dbinfo;
        }
    } else {
        dbinfo = local_admin_dbinfo;
        if(serverType.toUpperCase() === constants.SERVER_TYPE_REVIEW) {
            dbinfo = review_admin_dbinfo;
        } else if(serverType.toUpperCase() === constants.SERVER_TYPE_QA) {
            dbinfo = qa_admin_dbinfo;
        } else if(serverType.toUpperCase() === constants.SERVER_TYPE_LIVE) {
            dbinfo = live_admin_dbinfo;
        }
    }

    let sqlDataManager = null;
    if(process.env.DB_TYPE === 'mysql') {
        sqlDataManager = new MySQLDataManager(`${dbSource}-${serverType}`,dbinfo);
    } else {
        sqlDataManager = new FileSQLDataManager(dbinfo);
    }

    try {
        await sqlDataManager.connect();
        return sqlDataManager;
    } catch(err) {
        return null;
    }
};

export const releaseSQLDataManager = (sqlDataManager:SQLDataManager) => {

    if(sqlDataManager.wasConnected() === true) {
        sqlDataManager.disconnect();
    }
};