module.exports.id=module.id;
module.exports.modelData = { tableName:"t_SaleTempD", idFields:["ChID","SrcPosID"],
    fields:["ChID","SrcPosID","ProdID","UM","Qty","RealQty","PriceCC_wt","SumCC_wt","PurPriceCC_wt","PurSumCC_wt","BarCode",
        "RealBarCode","PLID","UseToBarQty","PosStatus","ServingTime","CSrcPosID","ServingID","CReasonID","PrintTime",
        "CanEditQty","EmpID","EmpName","CreateTime","ModifyTime","TaxTypeID","AllowZeroPrice"]
};
module.exports.changeLog = [
    /*
     alter table t_SaleTempD add OrderID int default NULL
     alter table t_SaleTempD add FactServingTime smalldatetime default NULL

     */
    { changeID:"t_SaleTempD__1", changeDatetime:"2019-11-24 17:41:00", changeObj:"t_SaleTempD",
        changeVal:"alter table t_SaleTempD add OrderID int default NULL", field:"OrderID"
    },
    { changeID:"t_SaleTempD__2", changeDatetime:"2019-11-24 17:42:00", changeObj:"t_SaleTempD",
        changeVal:"alter table t_SaleTempD add FactServingTime smalldatetime default NULL", field:"FactServingTime"
    }
];