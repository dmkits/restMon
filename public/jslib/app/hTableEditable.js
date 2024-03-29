/**
 * Created by dmkits on 16.02.17.
 */
define(["dojo/_base/declare", "app/hTableSimpleFiltered", "dijit/ProgressBar","dijit/Dialog","dijit/registry", "app/request"],
    function(declare, hTableSimpleFiltered, ProgressBar,Dialog,registry, Request){
        return declare("HTableEditable", [hTableSimpleFiltered], {
            allowEditRowProp:"<!$allow_edit$!>",
            constructor: function(args,parentName){
                declare.safeMixin(this,args);
            },
            setData: function(data){
                this.inherited(arguments,[data]);
                var tableData=this.htData;
                for(var c=0;c<this.htVisibleColumns.length;c++){
                    var visColData=this.htVisibleColumns[c];
                    if(visColData.type==="autocomplete") this.loadAutocompleteColumnValues(visColData, tableData);
                }                                                                                       //console.log("HTableEditable setData htVisibleColumns",this.htVisibleColumns);
            },
            setAutocompleteColumnValues: function(colData,tableData){                                    //console.log("HTableEditable setAutocompleteColumnValues",colData.data);
                colData.sourceValues={}; colData.source=[];
                for(var r=0;r<tableData.length;r++){
                    var value=tableData[r][colData.data];
                    if(!colData.sourceValues[value]){
                        colData.sourceValues[value]=true;
                        colData.source.push(value);
                    }
                }
            },
            loadAutocompleteColumnValues: function(colData, tableData){
                var thisInstance=this;
                if(!colData.sourceURL){
                    thisInstance.setAutocompleteColumnValues(colData,tableData);
                    return;
                }
                colData.sourceValues={};colData.source=[];
                Request.getJSONData({url:colData.sourceURL, resultItemName:"items"}
                    ,function(resultItems){
                        if(!resultItems){
                            thisInstance.setAutocompleteColumnValues(colData,tableData);
                            return;
                        }
                        for(var r=0;r<resultItems.length;r++){
                            var resultItemsData=resultItems[r], value=resultItemsData[colData.data];
                            if(colData.sourceValues[value]===undefined){
                                colData.sourceValues[value]=resultItemsData;
                                colData.source.push(value);
                            }
                        }
                    })
            },
            getAutocompleteColumnValueForItem: function(colItemName, itemValue, valueItemName){
                for(var c=0;c<this.htVisibleColumns.length;c++){
                    var visColData=this.htVisibleColumns[c];
                    if(visColData.data===colItemName&&visColData.type==="autocomplete"){
                        if(!visColData.sourceValues) return undefined;
                        var sourceValuesItemData= visColData.sourceValues[itemValue];
                        if(!sourceValuesItemData) return undefined;
                        return sourceValuesItemData[valueItemName];
                    }
                }
            },
            setChangeSettings: function(){
                var parent= this;
                var parentCellValueRenderer=this.handsonTable.getSettings().cellValueRenderer;
                this.handsonTable.updateSettings({
                    cellValueRenderer:function (instance, td, row, col, prop, value, cellProperties) {
                        parentCellValueRenderer(instance, td, row, col, prop, value, cellProperties);
                        var rowSourceData= instance.getContentRow(row);
                        if(rowSourceData){
                            var colType=parent.htVisibleColumns[col].type;
                            if(colType === "autocomplete"
                                &&td.lastChild&&td.lastChild.tagName==="DIV"
                                &&td.lastChild.className&&td.lastChild.className.indexOf("htAutocompleteArrow")>=0){    //console.log("HTableEditable cellValueRenderer autocomplete",td,td.className);
                                if(rowSourceData[parent.allowEditRowProp] != true) td.lastChild.setAttribute("style","display:none");
                                else td.lastChild.removeAttribute("style");
                            }
                        }
                        if(rowSourceData&&rowSourceData[parent.allowEditRowProp]==true) td.classList.add('hTableRowInEditMode');//markAsEditMode-row data not stored to server
                        var markAsError= false;
                        for(var dataItemName in rowSourceData)
                            if(rowSourceData[dataItemName]!==undefined
                                && (dataItemName.indexOf("<!$error$!>")>=0 || (dataItemName.indexOf("<!$error_")>=0&&dataItemName.indexOf("$!>")>=0)) ){
                                markAsError=true; break;
                            }
                        if(!markAsError && rowSourceData && (!parent.getRowIDName()||rowSourceData[parent.getRowIDName()]===undefined )) markAsError=true;
                        if(markAsError){ td.classList.add('hTableErrorRow'); }//markAsError
                        //markAsError= (instance.rowIDName&&(rowID===undefined||rowID==null));
                        //if (!markAsError) {
                        //    for(var dataItemName in rowSourceData){
                        //        var rowItemData= rowSourceData[dataItemName];
                        //        markAsError= (rowItemData&&dataItemName.indexOf("$error_")>=0);
                        //        if (markAsError) break;
                        //    }
                        //}
                        //if(markAsNotStored){ td.classList.add('hTableErrorRow'); }//markAsError
                        return cellProperties;
                    }
                });
                this.handsonTable.updateSettings({
                    cells: function (row/*index in data*/, col, prop) {                                 //console.log("HTableEditable cells row=",row, parent.readOnly);
                        var cellProps={readOnly:true, renderer:this.cellValueRenderer};
                        if(parent.readOnly==true) return cellProps;
                        var colData;
                        if(this.columns&&(colData=this.columns[col])&&colData.readOnly==true) return cellProps;
                        var rowData;
                        if((rowData=this.instance.getSourceData()[row])!==undefined && rowData!==null && rowData[parent.allowEditRowProp]===true)
                            cellProps.readOnly=false;
                        return cellProps;
                    }
                });
                //minSpareCols:0, minSpareRows: parent.htAddRows, //var isAllowInsertRow= this.htAddRows>0; allowInsertRow:isAllowInsertRow,
                if(this.allowFillHandle===true)
                    this.handsonTable.updateSettings({ fillHandle:{autoInsertRow:false, direction:'vertical'} });
                this.handsonTable.updateSettings({
                    beforeChange: function(change,source){                                              //console.log("HTableEditable beforeChange source=", source, " change=", change, change[0][3]);
                        if(source==='loadData') return;
                        if(change.length==1){//changed 1 cell
                            var newValue= change[0][3];
                            if(newValue && (typeof newValue==='string' || newValue instanceof String)) change[0][3]=newValue.trim();
                            return;
                        }
                        for(var i=0; i<change.length; i++){
                            var newValue= change[i][3];
                            if(newValue && (typeof newValue==='string' || newValue instanceof String)) change[i][3]=newValue.trim();
                        }
                    },
                    afterChange: function(change,source){                                               //console.log("HTableEditable afterChange source=",source," change=",change);
                        if(source==='loadData' || !parent.onChangeRowsData) return;
                        if(change.length==1){//changed 1 cell
                            var rowInd=change[0][0],prop= change[0][1], oldVal= change[0][2];           //console.log("HTableEditable afterChange changed 1 cell row=",rowInd," cell=",prop," oldVal=",oldVal);
                            var rowData=this.getContentRow(rowInd), oldRowData= {}, changedRowsItems={};
                            for(var itemName in rowData) oldRowData[itemName]=rowData[itemName];
                            changedRowsItems[prop]=true; oldRowData[prop]=oldVal;
                            var changedRowData= parent.getChangedRowsData(rowData,oldRowData,changedRowsItems); //console.log("HTableEditable afterChange changed 1 cell",rowData,oldRowData);
                            parent.onChangeRowsData(changedRowData);
                            return;
                        }
                        //changed many cells
                        var changedRowsData=[],changedRowsOldData=[], changedRowsItems=[];
                        for(var i=0; i<change.length; i++){
                            var rowInd=change[i][0], prop= change[i][1], oldVal= change[i][2];
                            var changedRowItems= changedRowsItems[rowInd];
                            if(!changedRowItems){
                                changedRowItems={};
                                changedRowsItems[rowInd]=changedRowItems;
                            }
                            changedRowItems[prop]=true;
                            var changedRowData= changedRowsData[rowInd], oldRowData= changedRowsOldData[rowInd];
                            if(!changedRowData){
                                changedRowData= this.getContentRow(rowInd);
                                changedRowsData[rowInd]=changedRowData;
                                oldRowData= {};
                                for(var itemName in changedRowData) oldRowData[itemName]=changedRowData[itemName];
                                changedRowsOldData[rowInd]=oldRowData;
                            }
                            oldRowData[prop]=oldVal;
                        }                                                                               //console.log("HTableEditable afterChange changed many cell",changedRowsData,changedRowsOldData,changedRowsItems);
                        var changedRows= parent.getChangedRowsData();
                        for(var rowInd in changedRowsData){                                             //console.log("HTableEditable afterChange changed many cell",changedRowsData[rowInd],changedRowsOldData[rowInd]);
                            changedRows.addRowData(changedRowsData[rowInd],changedRowsOldData[rowInd],changedRowsItems[rowInd]);
                        }
                        parent.onChangeRowsData(changedRows);
                    }
                });
            },
            postCreate: function(){
                this.createHandsonTable();
                this.setHandsonTableFilterSettings();
                this.setChangeSettings();
            },

            setRowAllowEditProp: function(rowData, editPropValue){
                if(editPropValue===undefined) editPropValue=true;
                rowData[this.allowEditRowProp]= editPropValue;
                return rowData;
            },
            allowEditRow: function(rowData, editPropValue){
                this.setRowAllowEditProp(rowData, editPropValue);
                this.handsonTable.render();
                var rowsData=[]; rowsData[0]=rowData;
                this.onUpdateContent({updatedRows:rowsData});
                return rowData;
            },
            allowEditSelectedRow: function(){
                var selectedRow= this.getSelectedRow();
                if(!selectedRow) return;
                this.allowEditRow(selectedRow);
            },
            allowEditRows: function(rowsData){
                for(var rowIndex in rowsData) this.setRowAllowEditProp(rowsData[rowIndex]);
                this.handsonTable.render();
                this.onUpdateContent({updatedRows:rowsData});
            },
            isRowEditable: function(rowData){
                if(!rowData) return false;
                if(rowData[this.allowEditRowProp]==true) return true;
                return false;
            },
            isSelectedRowEditable: function(){
                var selectedRow= this.getSelectedRow();
                if(!selectedRow) return false;
                if(this.isRowEditable(selectedRow)) return true;
                return false;
            },
            isExistsEditableRows: function(){
                var tableContentData= this.getData();
                if(!tableContentData||tableContentData.length==0) return false;
                for(var rowInd=0;rowInd<tableContentData.length;rowInd++){
                    var rowData=tableContentData[rowInd];
                    if(this.isRowEditable(rowData)) return true;
                }
                return false;
            },
            getContentEditableRows: function(){
                var editableContentRowsData=[], contentRowsData=this.handsonTable.getContent();
                for(var row=0;row<contentRowsData.length;row++){
                    var contentRowData=contentRowsData[row];
                    if(this.isRowEditable(contentRowData))editableContentRowsData.push(contentRowData);
                }
                return editableContentRowsData;
            },
            /*
             * params: {posItemName, posIndexItemName}
             */
            getPrevRowDataItemValue: function(rowData,itemName){
                if(this.getData().length==0) return undefined;
                var prevRowData=null;
                for(var rowInd=0;rowInd<this.getData().length;rowInd++){
                    if(this.getData()[rowInd]===rowData&&rowInd>0) prevRowData=this.getData()[rowInd-1];
                }
                if(!prevRowData) return undefined;
                return prevRowData[itemName];
            },
            /**
             * params { editPropValue, addData, callUpdateContent }
             * do render table content
             */
            updateRowAllDataItems: function(rowData,newRowData,params){
                for(var itemName in rowData) rowData[itemName]= (newRowData)?newRowData[itemName]:null;
                var editPropValue= (params&&params.editPropValue!==undefined)? params.editPropValue : true;
                rowData[this.allowEditRowProp]= editPropValue;
                if(rowData==this.getSelectedRow()) this.handsonTable.getSettings().setDataSelectedProp(rowData);
                if(params.addData)
                    for(var itemName in params.addData) rowData[itemName]= params.addData[itemName];
                this.handsonTable.render();
                if(params.callUpdateContent!=false){
                    var rowsData=[]; rowsData[0]=rowData;
                    this.onUpdateContent({updatedRows:rowsData});
                }
                return rowData;
            },
            insertRowsAfterSelected: function(count,dataValuesForNewRows){
                if(this.readOnly){
                    console.error("HTableEditable.insertRowsAfterSelected FAILED! TABLE IN READONLY MODE!");
                    return;
                }
                var selectedRowData= this.getSelectionLastRow(), selectRowIndex= -1;
                var data=this.getData(), dataLength=data.length;
                for(var rowInd=0; rowInd<dataLength; rowInd++){
                    if(data[rowInd]===selectedRowData){
                        selectRowIndex=rowInd; break;
                    }
                }                                                                                       //console.log("HTableEditable insertRowsAfterSelected",selectedRowData,dataValuesForNewRows);
                var valuesForNewRows;
                if(dataValuesForNewRows){
                    valuesForNewRows={};
                    if(this.getRowIDName()) valuesForNewRows[this.getRowIDName()]=null;
                    for(var rowItem in dataValuesForNewRows)
                        if(rowItem.indexOf("<!$")<0&&rowItem.indexOf("$!>")<0 && rowItem!==this.getRowIDName())
                            valuesForNewRows[rowItem]=dataValuesForNewRows[rowItem];
                }
                var newChangedRowsData = this.getChangedRowsData();
                for(var ri=dataLength+count-1; ri>selectRowIndex; ri--){
                    if(ri>selectRowIndex+count){
                        data[ri] = data[ri-count];
                    }else{
                        var insertingRowData=this.setRowAllowEditProp({}), newRowData=this.setRowAllowEditProp({});
                        for(var colInd=0; colInd<this.getColumns().length; colInd++){
                            var col=this.getColumns()[colInd], prop=col["data"];
                            insertingRowData[prop]=null; newRowData[prop]=null;
                        }
                        data[ri]= insertingRowData;
                        if(this.getRowIDName()){
                            newRowData[this.getRowIDName()]= null; insertingRowData[this.getRowIDName()]= null;
                        }
                        if(valuesForNewRows)
                            for(var rowItem in valuesForNewRows) insertingRowData[rowItem] = valuesForNewRows[rowItem];
                        newChangedRowsData.insertRowData(insertingRowData, newRowData);
                    }
                }                                                                                       //console.log("HTableEditable insertRowsAfterSelected valuesForNewRows=",valuesForNewRows);
                this.filterContentData();
                var thisInstance=this;
                //setTimeout(function(){
                thisInstance.onChangeRowsData(newChangedRowsData, {inserted:true});
                //}, 1);
                this.setSelectedRow(selectRowIndex+1);
            },
            insertRowAfterSelected: function(dataValuesForNewRow){
                this.insertRowsAfterSelected(1,dataValuesForNewRow);
            },
            /*
             * params { callUpdateContent }
             */
            deleteRow: function(deleteRowData,params){
                if(this.readOnly){
                    console.error("HTableEditable.deleteRow FAILED! TABLE IN READONLY MODE!");
                    return;
                }
                var deleteRowIndex= -1, newSelectedRow=null, newSelection=[];
                var data=this.getData(), dataLength=data.length;
                if(dataLength<=0) return;
                for(var rowInd=0; rowInd<dataLength; rowInd++){
                    if(data[rowInd]===deleteRowData){
                        if(!newSelectedRow){
                            if(rowInd+1<dataLength){
                                newSelectedRow=data[rowInd+1]; newSelection[rowInd]=newSelectedRow;
                            }else if(rowInd-1>=0){
                                newSelectedRow=data[rowInd-1]; newSelection[rowInd-1]=newSelectedRow;
                            }
                        }
                        deleteRowIndex=rowInd; break;
                    }
                }                                                                                       //console.log("HTableEditable deleteRow",deleteRowData,deleteRowIndex,newSelectedRow,newSelection);
                if(deleteRowIndex<0){
                    this.setSelection(null,null);
                    return;
                }
                for(var rowInd=deleteRowIndex; rowInd<dataLength-1; rowInd++) data[rowInd]=data[rowInd+1];
                data.length=dataLength-1;
                this.setSelection(newSelectedRow,newSelection);                                         //console.log("HTableEditable deleteRow params=",params,deleteRowData,newSelectedRow,newSelection);
                if(params&&params.callUpdateContent===false) return;
                var rowsData=[]; rowsData[0]=deleteRowData;
                var filtered= this.filterContentData();
                this.onUpdateContent({filtered:filtered, deletedRows:rowsData});
            },
            /**
             * params: { filtered, updatedRows, insertedRows, deletedRows }
             */
            onUpdateContent: function(params){
                //TODO actions on/after update table content (after set/reset/reload/clear table content data) (params filtered has value)
                //TODO actions and after call updateRowData({rowData,newRowData})
                //TODO actions after set/clear table filters (params filtered has value)
                //TODO actions after set table data props values (params updatedRows has value) by calls allowEditRow/allowEditRows/updateRowAllDataItems
                //TODO actions after end change row callbacks by user change table content (e.t. paste)
                //TODO actions after deleted table row (params deletedRows has value)
            },

            getChangedRowsData: function (newRowData,oldRowData,changedRowItems){
                function ChangedData(itemName,newRowData,oldRowData,isChanged){
                    this.itemName=itemName; this.values=newRowData; this.oldValues=oldRowData; this.isDataChanged=isChanged;
                    this.getValue= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        if(value===undefined&&oldValue!==undefined) return oldValue;
                        return value;
                    };
                    this.setValue= function(newValue){                                                      //console.log("ChangedData setValue ",this.itemName,newValue);
                        if(newValue===undefined) newValue=null;
                        if(typeof(newValue)=="number"&&isNaN(newValue+0)) this.values[this.itemName]=""; else this.values[this.itemName] = newValue;
                        return this;
                    };
                    this.setValues= function(newValue,oldValue){
                        if(typeof(newValue)=="number"&&isNaN(newValue+0)) this.values[this.itemName]=""; else this.values[this.itemName] = newValue;
                        if(typeof(oldValue)=="number"&&isNaN(oldValue+0)) this.oldValues[this.itemName]=""; else this.oldValues[this.itemName] = oldValue;
                        return this;
                    };
                    this.isUNDEFNULL= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value===null);
                    };
                    this.isZERO= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value!==undefined&&value!==null&&value===0);
                    };
                    this.isUNDEFNULLZERO= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value===null||value===0);
                    };
                    this.isEMPTY= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value===null||value.toString().trim()==="");
                    };
                    this.isEMPTYZERO= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value===null||value==0||value.toString().trim()==="");
                    };
                    this.isChanged= function(){
                        if(this.isDataChanged===true) return true;
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value!==oldValue);
                    };
                    this.isValueChanged= function(){
                        var value=this.values[this.itemName],oldValue=this.oldValues[this.itemName];
                        return (value===undefined||value!==oldValue);
                    };
                }
                function newChangedRowData(newRowData,oldRowData,changedRowItems){
                    var newInstance= { values:newRowData, oldValues:oldRowData };
                    newInstance.data= function(){
                        return this.values;
                    };
                    newInstance.item= function(itemName){
                        var item=this[itemName];
                        if(!item){
                            item= new ChangedData(itemName, this.values, this.oldValues);
                            this[itemName]=item;
                        }
                        return item;
                    };
                    newInstance.addItemData= function(itemName,newValues,oldValues,isChanged){
                        var rowItemData=this[itemName];
                        if(!rowItemData){
                            rowItemData=new ChangedData(itemName, newValues, oldValues, isChanged);
                            this[itemName]=rowItemData;
                        }
                        return this;
                    };
                    for(var rowItemName in newRowData)
                        newInstance.addItemData(rowItemName, newRowData,oldRowData, (changedRowItems)?changedRowItems[rowItemName]:true);
                    return newInstance;
                }
                function newChangedRowsData(){
                    var newInstance= [];
                    newInstance.insertRowData= function(newRowData,oldRowData){
                        this.unshift(newChangedRowData(newRowData,oldRowData));
                    };
                    newInstance.addRowData= function(newRowData,oldRowData,changedRowItems){
                        this.push(newChangedRowData(newRowData,oldRowData,changedRowItems));
                    };
                    return newInstance;
                }

                var newChangedRowsData= newChangedRowsData();
                if(newRowData) newChangedRowsData.addRowData(newRowData,oldRowData,changedRowItems);
                return newChangedRowsData;
            },
            /**
             * params = { inserted:true/false }
             */
            onChangeRowsData: function(changedRowsData,onChangeRowsDataParams){                             //console.log("HTableEditable.onChangeRowsData changedRowsData=",changedRowsData,onChangeRowsDataParams);
                var thisInstance=this;
                /* rowsCallback.params = { table:<this instance>, <other added in onChangeRowData params> } */
                var changeRowsDataProcess= function(i,changedRowsData,params,callUpdateContent){
                    var changedRowData=changedRowsData[i];
                    if(!changedRowData){
                        thisInstance.handsonTable.render();
                        if(onChangeRowsDataParams&&onChangeRowsDataParams.inserted) thisInstance.onUpdateContent({insertedRows:changedRowsData});
                        else thisInstance.onUpdateContent({updatedRows:changedRowsData});
                        return;
                    }
                    setTimeout(function(){
                        thisInstance.onChangeRowData(changedRowData,params,function(){
                            changeRowsDataProcess(i+1,changedRowsData,params,callUpdateContent);            //console.log("HTableEditable.onChangeRowsData rowsCallback for change=",i+1);
                        });
                    },1);
                };
                changeRowsDataProcess(0,changedRowsData,{table:thisInstance},false);
                //thisInstance.handsonTable.render();
            },
            /**
             * changedRowData, params = { table:<this instance>, <other added in onChangeRowData params> }, nextChangedRowAction
             * without fail call nextCallback on the over onChangeRowData!
             */
            onChangeRowData: function(changedRowData,onChangeRowDataParams,nextChangedRowAction){           //console.log("HTableEditable.onChangeRowData changedRowData=",changedRowData);
                //TODO actions after user change (or paste) content table row cell data
                nextChangedRowAction();//without fail call this!
            },
            /**
             * rowChangeActionFunction(changedRowData, thisInstance, rowChangeActionsParams, nextRowChangeAction)
             */
            addOnChangeRowAction: function(rowChangeActionFunction){
                if(!this.onChangeRowActions){
                    this.onChangeRowActions=[];
                    var thisInstance=this;
                    var onChangeRowActionsProcess= function(i,changedRowData,thisInstance,rowChangeActionsParams,callUpdateContent,nextRowChangeActions){
                        var onChangeRowActionFunction=thisInstance.onChangeRowActions[i];
                        if(!onChangeRowActionFunction){
                            //if (callUpdateContent===true) thisInstanceDetailTable.handsonTable.render();//render after end row callbacks
                            nextRowChangeActions();
                            return;
                        }
                        onChangeRowActionFunction(changedRowData, thisInstance, rowChangeActionsParams,function(callUpdateContentNext){
                            callUpdateContentNext= (callUpdateContentNext===undefined)? false : callUpdateContentNext;
                            onChangeRowActionsProcess(i+1,changedRowData,thisInstance,rowChangeActionsParams,callUpdateContent||callUpdateContentNext,nextRowChangeActions);
                        });
                    };
                    this.onChangeRowData= function(changedRowData,params,nextCallback){                     console.log("HTableEditable.onChangeRowData changedRowData=",changedRowData);
                        onChangeRowActionsProcess(0,changedRowData,thisInstance,params,true,nextCallback);
                    };
                }
                this.onChangeRowActions.push(rowChangeActionFunction);
                return this;
            },

            /**
             * params: {url, condition, rowData, showErrorDialog, callUpdateContent}
             */
            getRowDataFromURL: function(params,postCallback){
                if(!this.getRowIDName()) return;
                var rowData=params.rowData, newData = {};
                var thisInstance = this;                                                                //console.log("HTableEditable storeRowDataByURL storingData=",storingData,params.callUpdateContent);
                Request.getJSONData({url:params.url,condition:params.condition, consoleLog:true, showErrorDialog:params.showErrorDialog}
                    ,function(result,error){
                        if(!result){
                            rowData["<!$error$!>"]= "Не удалось получить результат операции с сервера!";
//                        instance.setErrorsCommentsForRow(storeRow,resultItem);
                            if(postCallback) postCallback(result,error,rowData);
                            return;
                        }
                        var resultItem = result["item"], errors={};
                        if(!resultItem) errors['<!$error_item$!>']="Не удалось получить данные результата операции с сервера!";
                        if(!error&&resultItem){
                            thisInstance.updateRowAllDataItems(rowData, resultItem,
                                {editPropValue:true, addData:errors, callUpdateContent:params.callUpdateContent} );
                            if(postCallback) postCallback(result,error,rowData);
                            return;
                        }
                        if(error) errors["<!$error$!>"] = error;
                        if(!resultItem)resultItem=newData;
                        thisInstance.updateRowAllDataItems(rowData,resultItem,
                            {editPropValue:true, addData:errors, callUpdateContent:params.callUpdateContent} );//console.log("HTableEditable.storeRowDataByURL resultItem=",resultItem);
                        //instance.setErrorsCommentsForRow(storeRow,storeRowData);
                        if(postCallback) postCallback(result,error,rowData);
                    })
            },
            /**
             * params: {url, condition, rowData, showErrorDialog, callUpdateContent}
             * postCallback = function(result,error,rowData,errorMsg)
             */
            storeRowDataByURL: function(params,postCallback){
                if(!this.getRowIDName()) return;
                var rowData=params.rowData, storingData = {};
                for(var dataItem in rowData)
                    if(dataItem.indexOf("<!$")<0&&dataItem.indexOf("$!>")<0) storingData[dataItem] = rowData[dataItem];
                var thisInstance = this;
                Request.postJSONData({url:params.url,condition:params.condition,data:storingData, consoleLog:true,showErrorDialog:params.showErrorDialog}
                    ,function(result,error){
                        var errors={}, errorMsg;
                        if(error){ errors["<!$error$!>"] = error.message; errorMsg=error.message; }
                        if(!result){
                            if(!error) {
                                errors["<!$error$!>"] = "Не удалось получить результат операции с сервера!";
                                errorMsg=errors["<!$error$!>"];
                            }
                            thisInstance.updateRowAllDataItems(rowData, rowData,
                                {editPropValue:true, addData:errors, callUpdateContent:params.callUpdateContent} );
                            //instance.setErrorsCommentsForRow(storeRow,resultItem);
                            if(postCallback) postCallback(result,error,rowData,errorMsg);
                            return;
                        }
                        var resultItem = result["resultItem"], updateCount = result["updateCount"], errors={};
                        if(error||!resultItem||!updateCount>0){
                            errorMsg=errorMsg||"";
                            if(!resultItem){
                                errors['<!$error_resultItem$!>']="Не удалось получить данные результата операции с сервера!";
                                errorMsg+=errors['<!$error_resultItem$!>'];
                            }
                            if(!updateCount>0){
                                errors["<!$error_updateCount$!>"]= "Данные не были сохранены на сервере!";
                                errorMsg+=errors['<!$error_updateCount$!>'];
                            }
                            thisInstance.updateRowAllDataItems(rowData, resultItem||storingData,
                                {editPropValue:true, addData:errors, callUpdateContent:false});             //console.log("HTableEditable.storeRowDataByURL resultItem=",resultItem);
                            //instance.setErrorsCommentsForRow(storeRow,storeRowData);
                            if(postCallback) postCallback(result,error,rowData,errorMsg);
                            return;
                        }
                        thisInstance.updateRowAllDataItems(rowData, resultItem,
                            {editPropValue:false, addData:errors, callUpdateContent:params.callUpdateContent} );
                        if(postCallback) postCallback(result,error,rowData);
                    })
            },
            /**
             * params: {url, condition, callUpdateContent}
             */
            storeSelectedRowDataByURL: function(params){
                if(!params || !this.getSelectedRow()) return;
                params.rowData= this.getSelectedRow();
                if(!this.isRowEditable(params.rowData)) return;
                var thisInstance=this;
                thisInstance.loadingGif.show();
                this.storeRowDataByURL(params,/*postCallback*/function(){
                    thisInstance.loadingGif.hide();
                });
            },
            /**
             * storeParams: {url, condition, rowsData, callUpdateContent,
             *      progressDialogContentHeight, progressDialogStartMessage, progressDialogFinishedMessage, progressDialogStoppedMessage
             *      progressDialogStoreRowMessage, progressDialogStoreRowMessageSuccess, progressDialogStoreRowMessageFail
             * }
             */
            storeRowsDataByURL: function(storeParams){                                                       //console.log("HTableEditable storeRowsDataByURL rowsData=",params.rowsData);
                if(!storeParams||!storeParams.rowsData){
                    console.error("HTableEditable.storeRowsDataByURL FAILED! NO DATA FOR STORE!");
                    return;
                }
                var storingRowData=[];
                for(var rowInd in storeParams.rowsData){
                    var rowData=storeParams.rowsData[rowInd];
                    if(this.isRowEditable(rowData)) storingRowData.push(rowData);
                }
                if(!storeParams.progressDialogContentHeight)storeParams.progressDialogContentHeight=300;
                if(!storeParams.progressDialogStartMessage)storeParams.progressDialogStartMessage="НАЧАТО СОХРАНЕНИЕ ВЫДЕЛЕННЫХ СТРОК...";
                if(!storeParams.progressDialogFinishedMessage)storeParams.progressDialogFinishedMessage="СОХРАНЕНИЕ ВЫДЕЛЕННЫХ СТРОК ЗАВЕРШЕНО.";
                if(!storeParams.progressDialogStoppedMessage)storeParams.progressDialogStoppedMessage="СОХРАНЕНИЕ ВЫДЕЛЕННЫХ СТРОК ОСТАНОВЛЕНО!";
                if(!storeParams.progressDialogStoreRowMessage)storeParams.progressDialogStoreRowMessage="Сохранение строки";
                if(!storeParams.progressDialogStoreRowMessageSuccess)storeParams.progressDialogStoreRowMessageSuccess="Данные сохранены.";
                if(!storeParams.progressDialogStoreRowMessageFail)storeParams.progressDialogStoreRowMessageFail="Не удалось сохранить данные!";
                if(!storeParams.progressDialog)storeParams.progressDialog=this.updateRowsActionDialog(storeParams,storingRowData.length);
                storeParams.progressDialog.addMsgLine(storeParams.progressDialogStartMessage);
                storeParams.progressStopped=false;storeParams.progressFinished=false;
                var finalCallUpdateContent=storeParams.callUpdateContent;
                storeParams.callUpdateContent=false; storeParams.showErrorDialog=false;
                var htableInstance=this;
                this._storeRowsDataByURLProcess(this,storingRowData,0,storeParams,/*finishedAction*/function(storingRowData,storeParams){
                    if(storeParams.progressStopped)storeParams.progressDialog.addMsgLine(storeParams.progressDialogStoppedMessage);
                    else storeParams.progressDialog.addMsgLine(storeParams.progressDialogFinishedMessage);
                    if(finalCallUpdateContent!==false)htableInstance.onUpdateContent({updatedRows:storingRowData});
                });
            },
            _storeRowsDataByURLProcess: function(htableInstance,storingRowsData,rowInd,storeParams, finishedAction){
                storeParams.rowData=storingRowsData[rowInd];
                if(!storeParams.rowData||storeParams.progressDialog.progressStopped){
                    if(storeParams.progressDialog.progressStopped) storeParams.progressStopped=true;
                    else{
                        storeParams.progressFinished=true; storeParams.progressDialog.setFinished();
                    }
                    setTimeout(function(){ finishedAction(storingRowsData,storeParams); },10);
                    return;
                }
                htableInstance.setSelectedRow(storeParams.rowData);
                storeParams.progressCounter=rowInd+1; storeParams.progressDialog.setProgress(storeParams.progressCounter);
                storeParams.progressDialog.addMsgLine(storeParams.progressCounter+": "+storeParams.progressDialogStoreRowMessage+" ...");
                htableInstance.storeRowDataByURL(storeParams,/*postCallback*/function(result,error,rowData,errorMsg){
                    if(errorMsg) storeParams.progressDialog.setMsg(storeParams.progressCounter+": "+storeParams.progressDialogStoreRowMessageFail+" "+errorMsg);
                    else storeParams.progressDialog.setMsg(storeParams.progressCounter+": "+storeParams.progressDialogStoreRowMessageSuccess);
                    htableInstance._storeRowsDataByURLProcess(htableInstance,storingRowsData,rowInd+1,storeParams, finishedAction);
                });
            },
            /**
             * params: {url, condition, rowData, callUpdateContent}
             */
            deleteRowDataByURL: function(params,postCallback){
                if(this.readOnly){
                    console.error("HTableEditable.deleteRowDataByURL FAILED! TABLE IN READONLY MODE!");
                    return;
                }
                if(!params.rowData || !this.getRowIDName()) return;
                var rowData=params.rowData, rowIDNames=this.getRowIDNames(), deletingData= null;
                for(var rowIDNameItem in rowIDNames){
                    var rowIDValueItem=rowData[rowIDNameItem];
                    if(rowIDValueItem!==undefined&&rowIDValueItem!==null){
                        if(!deletingData) deletingData = {};
                        deletingData[rowIDNameItem] = rowIDValueItem;
                    }
                }
                if(!deletingData){
                    console.error("HTableEditable.deleteRowDataByURL ERROR! NO ROW ID VALUES!");
                    return;
                }
                var thisInstance = this;                                                                    //console.log("HTableEditable deleteRowDataByURL deletingData",deletingData);
                Request.postJSONData({url:params.url,condition:params.condition,data:deletingData},
                    function(result,error){                                                                 //console.log("HTableEditable deleteRowDataByURL result",result);
                        var errors={};
                        if(error) errors["<!$error$!>"] = error;
                        if(!result){
                            errors["<!$error$!>"]= "Не удалось получить результат операции с сервера!";
                            thisInstance.updateRowAllDataItems(rowData, rowData,
                                {editPropValue:false, addData:errors, callUpdateContent:params.callUpdateContent});
                            //instance.setErrorsCommentsForRow(storeRow,resultItem);
                            if(postCallback) postCallback(result,error,rowData);
                            return;
                        }
                        var resultItem = result["resultItem"], updateCount = result["updateCount"];
                        if(error||!updateCount>0||!resultItem){
                            if(!resultItem) errors['<!$error_resultItem$!>']="Не удалось получить данные результата операции с сервера!";
                            if(!updateCount>0) errors["<!$error_updateCount$!>"]= "Данные не были удалены на сервере!";
                            thisInstance.updateRowAllDataItems(rowData, rowData,
                                {editPropValue:false, addData:errors, callUpdateContent:params.callUpdateContent} );
                            //instance.setErrorsCommentsForRow(storeRow,storeRowData);
                            if(postCallback) postCallback(result,error,rowData);
                            return;
                        }
                        for(var delRowIDNameItem in rowIDNames){
                            var deletingRowIDValue=deletingData[delRowIDNameItem], deletedRowIDValue=resultItem[delRowIDNameItem];
                            if(deletingRowIDValue!=deletedRowIDValue) {
                                errors['<!$error_resultItemID$!>']="Не удалось получить корректный результат операции с сервера!";
                                thisInstance.updateRowAllDataItems(rowData, rowData,
                                    {editPropValue:false, addData:errors, callUpdateContent:params.callUpdateContent} );
                                //instance.setErrorsCommentsForRow(storeRow,storeRowData);
                                if(postCallback) postCallback(result,error,rowData);
                                return;
                            }
                        }
                        thisInstance.deleteRow(rowData,{callUpdateContent:params.callUpdateContent});//this call onUpdateContent
                        if(postCallback) postCallback(result,error,rowData);
                    })
            },
            /**
             * params: {url, condition}
             */
            deleteSelectedRowDataByURL: function(params){
                if(this.readOnly){
                    console.error("HTableEditable.deleteSelectedRowDataByURL FAILED! TABLE IN READONLY MODE!");
                    return;
                }
                if(!params || !this.getRowIDName() || !this.getSelectedRow()) return;
                params.rowData= this.getSelectedRow();
                var rowData=params.rowData, rowIDNames=this.getRowIDNames();                            //console.log("HTableEditable.deleteSelectedRowDataByURL params=",params,"rowIDNames",rowIDNames);
                for(var rowIDNameItem in rowIDNames){
                    var rowIDValueItem=rowData[rowIDNameItem];
                    if(rowIDValueItem===null||rowIDValueItem===undefined){
                        this.deleteRow(params.rowData);//this call onUpdateContent
                        return;
                    }
                }
                params.callUpdateContent= true;
                var thisInstance=this;
                thisInstance.loadingGif.show();
                this.deleteRowDataByURL(params,/*postCallback*/function(){
                    thisInstance.loadingGif.hide();
                });//this call onUpdateContent
            }
        });
});