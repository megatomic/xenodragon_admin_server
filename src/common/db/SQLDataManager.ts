export default abstract class SQLDataManager {

    public static SQLTYPE_SELECT = 1;
    public static SQLTYPE_INSERT = 2;
    public static SQLTYPE_UPDATE = 3;
    public static SQLTYPE_DELETE = 4;

    private _inUse: boolean;

    constructor() {

        this._inUse = false;
    }

    setUse(flag:boolean) {
        this._inUse = flag;
    }

    isInUse() {
        return this._inUse;
    }

    public static getSQLType(sql:string):number {
        if(sql === null || sql === undefined || sql.trim() === "") {
            return -1;
        }

        const sqlStatements = sql.toLowerCase();
        if(sqlStatements.indexOf('select') >= 0) {
            return SQLDataManager.SQLTYPE_SELECT;
        } else if(sqlStatements.indexOf('insert') >= 0) {
            return SQLDataManager.SQLTYPE_INSERT;
        } else if(sqlStatements.indexOf('update') >= 0) {
            return SQLDataManager.SQLTYPE_UPDATE;
        } else if(sqlStatements.indexOf('delete') >= 0) {
            return SQLDataManager.SQLTYPE_DELETE;
        } else {
            return SQLDataManager.SQLTYPE_SELECT;
        }
    }

    public abstract getDBMSInfo():any; // virtual
    public abstract connect():Promise<any>; // virtual
    public abstract wasConnected():boolean; // virtual
    public abstract disconnect():void; // virtual
    public abstract querySQL(sqlStatements:string, param:any):Promise<any>; // virtual
}

module.exports = SQLDataManager;