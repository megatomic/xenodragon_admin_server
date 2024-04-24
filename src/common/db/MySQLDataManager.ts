
const dbms = require('mysql2/promise');
const appRootPath = require('app-root-path');
import {ResultCode, getResultForm, ResultInfo, ReqValidationErrorMsg} from 'src/common/ResponseManager';

const tables:any = {
    user:'user_info',
    dungeon:'dungeon_info'
}

const g_poolTable = new Map<string,any>();

import SQLDataManager from './SQLDataManager';

export default class MySQLDataManager extends SQLDataManager {

    private _dbID:string;
    private _dbInfo:any;
    private _pool:any;
    private _connection:any;

    public static getConnectionPool(dbID:string, dbInfo:any) {
        let pool = g_poolTable.get(dbID);
        if(pool === null || pool === undefined) {
            pool = dbms.createPool(dbInfo);
            g_poolTable.set(dbID,pool);

            //console.log("[MYSQL] pool=",pool);
        }
        return pool;
    }

    constructor(dbID:string,dbInfo:any) {
        super();

        this._dbID = dbID;
        this._dbInfo = dbInfo;
        this._connection = null;
        this._pool = MySQLDataManager.getConnectionPool(dbID,dbInfo);

        //console.log('[DBINFO] ',dbInfo);
    }

    public getPool() {
        return this._pool;
    }

    public getDBMSInfo() {
        const dbInfo = {defaultDatabase:this._dbInfo.adminDatabase,...this._dbInfo};
        return dbInfo;
    }

    public async connect() {

        this.disconnect();

        try {
            this._connection = await this._pool.getConnection(async (conn:any) => conn);
            console.log("[MYSQL] db connected:dbInfo=",this._dbInfo);

        } catch(err) {
            this._connection = null;
        }
    }

    public wasConnected() {
        if(this._connection === null) {
            return false;
        } else {
            return true;
        }
    }

    public disconnect() {

        if(this._connection !== null) {
            this._connection.release();
            this._connection = null;
        }
    }

    public async querySQL(sqlStatements:string, params:any):Promise<any> {

        let result:ResultInfo;
        const sqlType = SQLDataManager.getSQLType(sqlStatements);

        console.log(`sql:${sqlStatements}, sqlType:${sqlType}, param:${params}`);

        try {
            result = await this._querySQL(sqlStatements, sqlType, params);

        } catch(err:any) {

            console.log(err);
            
            if(err.code === "ECONNRESET") { // DBMS에서 접속을 끊은 connection이라면, 새로 connection 객체 생성.
                console.log(`[MYSQL] connection closed by DBMS. New connection obtained from pool.`);

                await this.connect();
                result = await this.querySQL(sqlStatements, params);

            } else if(err.code === 'ER_DUP_ENTRY') {
                result = getResultForm(ResultCode.DB_INSERT_DUPLICATEDKEY_FOUND,ReqValidationErrorMsg[ResultCode.DB_INSERT_DUPLICATEDKEY_FOUND],{});

            } else {
                let errorStr = "";
                if(SQLDataManager.getSQLType(sqlStatements) === SQLDataManager.SQLTYPE_UPDATE) {
                    errorStr = `update error:${sqlStatements}`,{func:'querySQL()'};
                } else if(SQLDataManager.getSQLType(sqlStatements) === SQLDataManager.SQLTYPE_INSERT) {
                    errorStr = `insert error:${sqlStatements}`,{func:'querySQL()'};
                } else if(SQLDataManager.getSQLType(sqlStatements) === SQLDataManager.SQLTYPE_DELETE) {
                    errorStr = `delete error:${sqlStatements}`,{func:'querySQL()'};
                } else {
                    errorStr = `select error:${sqlStatements}`,{func:'querySQL()'};
                }
                
                result = getResultForm(ResultCode.DB_QUERY_INTERNALERROR,errorStr,{});
            }
        }

        return result;
    }

    async _querySQL(sqlStatements:string, sqlType:number, params:any):Promise<any> {

        let result:ResultInfo;
        
        if(sqlType === SQLDataManager.SQLTYPE_SELECT || sqlType === SQLDataManager.SQLTYPE_INSERT) {
            const [rows] = await this._connection.query(sqlStatements,(params !== null ? params : null));

            if(rows.length === 0) {
                result = getResultForm(ResultCode.DB_QUERY_EMPTY,"",{});
            } else {
                result = getResultForm(ResultCode.SUCCESS,"",rows);
            }
        } else {
            await this._connection.query(sqlStatements);
            result = getResultForm(ResultCode.SUCCESS,"",{});
        }

        return result;
    }
}