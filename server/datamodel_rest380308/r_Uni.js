module.exports.id=module.id;
module.exports.modelData = { tableName:"r_Uni",idField:"RefTypeID",
    fields:["RefTypeID","RefID","RefName","Notes"]
};
module.exports.changeLog = [
    {changeID:"r_Uni__1", changeDatetime:"2019-11-24 15:11:00", changeObj:"r_Uni",
        changeVal:"update r_Emps set ShiftPostID=0"},
    {changeID:"r_Uni__2", changeDatetime:"2019-11-24 15:12:00", changeObj:"r_Uni",
        changeVal:"delete from r_Uni where RefTypeID=10606 and RefID<>0"},
    {changeID:"r_Uni__3", changeDatetime:"2019-11-24 15:15:00", changeObj:"r_Uni",
        changeVal:"update r_Uni set Notes='unknown',RefName='Нет роли' where RefTypeID=10606 and RefID=0"},
    {changeID:"r_Uni__4", changeDatetime:"2019-11-24 15:16:00", changeObj:"r_Uni",
        changeVal:"insert into r_Uni(RefTypeID, RefID, RefName, Notes) values (10606, -1,'сисадмин','sysadmin');"},
    {changeID:"r_Uni__5", changeDatetime:"2019-11-24 15:17:00", changeObj:"r_Uni",
        changeVal:"update r_Emps set ShiftPostID=-1 where EmpID in (0,1)"},
    {changeID:"r_Uni__6", changeDatetime:"2019-11-24 15:18:00", changeObj:"r_Uni",
        changeVal:"insert into r_Uni(RefTypeID, RefID, RefName, Notes) values (10606, 1,'Управляющий (директор)','admin');"},
    {changeID:"r_Uni__7", changeDatetime:"2019-11-24 15:19:00", changeObj:"r_Uni",
        changeVal:"insert into r_Uni(RefTypeID, RefID, RefName, Notes) values (10606, 2,'Менеджер','manager');"},
    {changeID:"r_Uni__8", changeDatetime:"2019-11-24 15:20:00", changeObj:"r_Uni",
        changeVal:"insert into r_Uni(RefTypeID,RefID,RefName,Notes) values(10606, 4,'Повар','cook')"}
];