import SQLDataManager from "./SQLDataManager";

export default class FileSQLDataManager extends SQLDataManager {

    constructor(dbinfo:any) {
        super();
    }

    public getDBMSInfo():any {

    }

    public async connect():Promise<any> {

    }

    public wasConnected():boolean {
        return false;
    }

    public disconnect():void {

    }

    public async querySQL(sqlStatements:string, param:any):Promise<any> {

    }
}