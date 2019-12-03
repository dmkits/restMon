var dataModel=require(appDataModelPath),
    dateFormat = require('dateformat');
var t_SaleTemp= require(appDataModelPath+"t_SaleTemp"), t_SaleTempD= require(appDataModelPath+"t_SaleTempD"),
    r_Prods=require(appDataModelPath+"r_Prods"), z_Vars=require(appDataModelPath+"z_Vars");

module.exports.validateModule = function(errs, nextValidateModuleCallback){
    dataModel.initValidateDataModels([t_SaleTemp,t_SaleTempD,r_Prods,z_Vars], errs,
        function(){
            nextValidateModuleCallback();
        });
};

module.exports.routes=[//-- App routes --
    { path: '/pageRestKitchenOrdersForCooking', componentUrl: '/mobile/pageRestKitchenOrdersForCooking', options:{clearPreviousHistory:true,ignoreCache:true}, define:true },
    { path: '/pageRestKitchenOrdersForCookingSettings', componentUrl: '/mobile/pageRestKitchenOrdersForCookingSettings', options:{ignoreCache:true} }
];
module.exports.moduleViewURL = "/mobile/pageRestKitchenOrdersForCooking";
module.exports.moduleViewPath = "mobile/pageRestKitchenOrdersForCooking.html";
module.exports.init = function(app){
    app.get("/mobile/pageRestKitchenOrdersForCookingSettings", function(req,res){
        res.sendFile(appViewsPath+'mobile/pageRestKitchenOrdersForCookingSettings.html');
    });
    var tSaleTempDTableColumns=[
        {data: "ChID", name: "ChID", width: 85, type: "text", dataSource:"t_SaleTempD", identifier:true, readOnly:true, visible:false},
        {data: "SrcPosID", name: "№ п/п", width: 45, type: "numeric", dataSource:"t_SaleTempD", identifier:true },
        {data: "ProdID", name: "Код товара", width: 50, type: "text", dataSource:"t_SaleTempD", visible:true},
        {data: "Barcode", name: "Штрихкод", width: 75, type: "text", dataSource:"t_SaleTempD", visible:false},
        {data: "ProdName", name: "Наименование товара", width: 350, type: "text",
            dataSource:"r_Prods", sourceField:"ProdName", linkCondition:"r_Prods.ProdID=t_SaleTempD.ProdID" },
        {data: "UM", name: "Ед. изм.", width: 55, type: "text", align:"center", dataSource:"t_SaleTempD", sourceField:"UM"},
        {data: "Qty", name: "Кол-во", width: 50, type: "numeric", dataSource:"t_SaleTempD"},
        {data: "PrintTime", name: "Время печати", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD"},
        {data: "sPrintTime", name: "Время печати", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD",
            dataFunction:"convert(varchar(20),DATEPART(hour,PrintTime))+':'+convert(varchar(20),DATEPART(minute,PrintTime))+' '+convert(varchar(20),PrintTime,4)"},
        {data: "sPrintTimeSmall", name: "Время печати", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD",
            dataFunction:"convert(varchar(20),DATEPART(hour,PrintTime))+':'+convert(varchar(20),DATEPART(minute,PrintTime))"+
                "+' '+convert(varchar(20),DATEPART(day,PrintTime))+'.'+convert(varchar(20),DATEPART(month,PrintTime))"},
        {data: "OrderID", name: "Номер заказа", width: 50, type: "text", dataSource:"t_SaleTempD", visible:true},
        {data: "ServingTime", name: "Время подачи", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD"},
        {data: "FactServingTime", name: "Время выдачи", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD"},
        {data: "FactServingTimeout", name: "Прошло с выдачи", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD",
            dataFunction:"datediff(minute,FactServingTime,GETDATE())"},
        {data: "WaitTime", name: "Время ожидания", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD",
            dataFunction:"convert(varchar(20),DATEPART(hour,GETDATE()-PrintTime))+':'+convert(varchar(20),DATEPART(minute,GETDATE()-PrintTime))"},
        {data: "sWaitTime", name: "Время ожидания", width: 60, type: "dateAsText",align:"center", dataSource:"t_SaleTempD",
            dataFunction:"CASE When FactServingTime is null Then convert(varchar(20),DATEPART(hour,GETDATE()-PrintTime))+':'+convert(varchar(20),DATEPART(minute,GETDATE()-PrintTime)) "+
                "Else 'ГОТОВО '+convert(varchar(20),datediff(minute,FactServingTime,GETDATE()))+' мин' END"}
    ];
    app.get("/mobile/restKitchOrdsForCook/getDataForRestKitchOrdsForCookDataTable", function(req,res){
        z_Vars.getDataItem(req.dbUC,{fields:["VarValue"],conditions:{"VarName=":"i_RestKitCats"}},
            function(resultGetVarRestKitCats){//i_RestKitCats	Категории для заказа: Кухня
                if(resultGetVarRestKitCats.error||!resultGetVarRestKitCats.item){
                    res.send({error:"Failed get cats filter for get SaleTempD data items!<br> Reason:"+(resultGetVarRestKitCats.error||"No Data."),
                        errorMessage:"Не удалось получить фильтр категорий для списка товаров в заказах на кухню!"});
                    return;
                }
                var conditions={"PrintTime is not null":null,
                        "((FactServingTime is null and PosStatus=1) or datediff(minute,FactServingTime,GETDATE())<=5)":null
                    },
                    iRestKitCatsFilter="r_Prods.PCatID in ("+resultGetVarRestKitCats.item["VarValue"]+")";
                conditions[iRestKitCatsFilter]=null;
                t_SaleTempD.getDataItemsForTable(req.dbUC,{tableColumns:tSaleTempDTableColumns, conditions:conditions,
                        order:"CASE When FactServingTime is null Then 1 Else -datediff(minute,FactServingTime,GETDATE()) END, PrintTime"},
                    function(result){
                        res.send(result);
                    });
            });
    });
     /**
      * prodData = { ProdID, UM, Barcode, TNewQty }
      */
     t_SaleTempD.updKitchOrdForCookState= function(dbUC,value,resultCallback){
         z_Vars.getDataItem(dbUC,{fields:["VarValue"],conditions:{"VarName=":"i_RestKitCats"}},
             function(resultGetVarRestKitCats){//i_RestKitCats	Категории для заказа: Кухня
                 if(resultGetVarRestKitCats.error||!resultGetVarRestKitCats.item){
                     res.send({error:"Failed get cats filter for get SaleTempD data item!<br> Reason:"+(resultGetVarRestKitCats.error||"No Data."),
                         errorMessage:"Не удалось получить фильтр категорий для обновления статуса заказа на кухню!"});
                     return;
                 }
                 var conditions={"PrintTime is not null":null, "FactServingTime is null":null, "PosStatus=":1},
                     iRestKitCatsFilter="r_Prods.PCatID in ("+resultGetVarRestKitCats.item["VarValue"]+")";
                 conditions[iRestKitCatsFilter]=null;
                 var condFindOrder= (value&&value.toString().length==13/*barcode EAN13*/)?"dbo.if_GetDCardID(OrderID,20)=":"OrderID=";
                 conditions[condFindOrder]= value;
                 t_SaleTempD.getDataItem(dbUC,{conditions:conditions,
                         fields:["t_SaleTempD.ChID","SrcPosID","t_SaleTempD.ProdID","t_SaleTempD.UM","Qty","PLID","PosStatus","ServingTime","PrintTime","EmpID","EmpName",
                             "FactServingTime"],
                         joinedSources:{"r_Prods":"r_Prods.ProdID=t_SaleTempD.ProdID"}},
                     function(resultGetSaleTempDOrder){
                         if(resultGetSaleTempDOrder.error||!resultGetSaleTempDOrder.item){
                             resultCallback({error:"Failed find item in SaleTempD by OrderID!<br>"+(resultGetSaleTempDOrder.error||"No data!"),
                                 errorMessage:"Не удалось найти заказ на кухню для обновления статуса!"});
                             return;
                         }
                         var saleTDOrderData= resultGetSaleTempDOrder.item,
                             updTableData= {"ChID":saleTDOrderData["ChID"],"SrcPosID":saleTDOrderData["SrcPosID"],
                                 "PosStatus":2,"FactServingTime":dateFormat(Date.now(), "yyyy-mm-dd HH:MM:00")};
                         t_SaleTempD.updTableDataItem(dbUC,{tableColumns:tSaleTempDTableColumns, idFields:["ChID","SrcPosID"],
                                 updTableFieldsData:updTableData},
                             function(result){
                                 if(result.error){
                                     result.errorMessage= "Не удалось обновить статус заказа на кухню!<br>"+result.errorMessage;
                                 }
                                 resultCallback(result);
                             });
                     });
             });
     };
     app.post("/mobile/restKitchOrdsForCook/updKitchOrdForCookStateByValue", function(req,res){
         var storingData=req.body, value=(storingData)?storingData["value"]:null;                               console.log('/mobile/restKitchOrdsForCook/updKitchOrdForCookStateByValue req.body',req.body);
         t_SaleTempD.updKitchOrdForCookState(req.dbUC,value,function(result){
             res.send(result);
         });
     });
     //app.post("/mobile/restKitchOrdsForCook/storeNewQtyData", function(req,res){
     //    var storingData=req.body, parentChID=storingData["parentChID"],excDData={SrcPosID:storingData["SrcPosID"]};   console.log('/mobile/exc/storeNewQtyData req.body',req.body);
     //    t_ExcD.storeExcDProdDataWNewQty(req.dbUC,parentChID,excDData,storingData["NewQty"],function (result){
     //        res.send(result);
     //    });
     //});
};