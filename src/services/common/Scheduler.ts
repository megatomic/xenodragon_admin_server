
const scheduler = require('node-schedule');
const JsonDB = require('simple-json-db');
import * as Utils from 'src/common/Utils';

class Scheduler {

    private _jsonDB: any;

    constructor(dbPath:string) {

        this._jsonDB = new JsonDB(dbPath);
    }

    public getJsonDB() {
        return this._jsonDB;
    }

    public async addJob(groupID:string, date: Date, callback:any, param:any) {

        const jobID = groupID+Utils.getRandomString(false,12);

        const self = this;
        scheduler.scheduleJob(jobID, date, async function() {
            const jsonDB = self.getJsonDB();
            const data = jsonDB.get(jobID);
            await callback(data.param);

            jsonDB.delete(jobID);

            console.log('[SCHEDULER] job done!');
        });

        this._jsonDB.set(jobID,{date,param,callback});
        console.log('[SCHEDULER] registered(date=',date.toISOString()+')');

        return jobID;
    }

    public restartAllJobs(groupID:string,callback:any) {

        const json = this._jsonDB.JSON();
        const jobIDTable = Object.keys(json);

        let job;
        let data:any;
        for(let jobID of jobIDTable) {
            if(jobID.indexOf(groupID) >= 0) {
                job = scheduler.scheduledJobs[jobID];
                data = json[jobID];
                if(job === undefined || job === null) {
                    scheduler.scheduleJob(jobID,data.date,function() {
                        callback(data.param);
                    });
                } else {
                    job.cancel();
                    job.reschedule();
                }
            }
        }
    }
}

export default new Scheduler('./job_schedule_table.json');