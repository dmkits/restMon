/**
 * Created by dmkits on 30.12.16.
 */
define(["dojo/_base/declare", "dijit/layout/ContentPane", "app/request"],
    function(declare, ContentPane, Request){
        /**
         * ContentController for loadData and store changed data this ContentController elements.
         * @param parameters: dataIDName, stateElementID
         * use setDataIDName for set data ID name
         * use addControlElementObject for add element to controller
         * use setContentData for set controller elements values
         * use loadDataFromUrl for set controller elements values from url
         * use storeDataByUrl for store controller elements values to url
         * use deleteDataByUrl for delete controller elements values to url
         * set onContentUpdated for do action after controller's content has updated/reloaded
         * set onContentChanged for do action after user changed value of controller element
         * set dataEnabledChecker = true/false/function(dataItems, dataItemName,dataItemValue,dataEl)
         *      for check if enable/disable data element on set/change data value
         */
        return declare("ContentController", [ContentPane], {
            data: undefined,
            dataIDName: undefined,
            elements: {},
            constructor: function(args,parentName){
                this.srcNodeRef = document.getElementById(parentName);
                this.domNode = this.srcNodeRef;
                this.data= undefined;
                this.dataIDName= undefined;
                this.elements= {};
                this.dataEnabledChecker= false;
                declare.safeMixin(this,args);
            },
            setDataIDName: function(dataIDName){
                this.dataIDName= dataIDName;
            },
            addControlElementObject: function(elementObj,itemName){
                this.elements[itemName] = elementObj;
                var declaredClass = elementObj.declaredClass, instance = this;
                elementObj.onChange = function (newValue) {
                    instance.onElementChanged(instance, itemName, elementObj);
                };
                if(declaredClass.indexOf("TextBox") >= 0) {
                    elementObj.on("keyup", function (event) {
                        instance.onElementChanged(instance, itemName, elementObj);
                    });
                }else if(declaredClass.indexOf("DateTextBox") >= 0){
                }else if(declaredClass.indexOf("Select") >= 0){
                    this.setSelectDropDown(elementObj);
                } //else
                elementObj.set("disabled",true);
                return this;
            },
            setContent: function(){
                // TODO actions for set content data. use this.setContentData or this.loadDataFromUrl
                // TODO use this.setContentData(newData)
                // TODO or use this.loadDataFromUrl({ url:"/...", condition:"..." })
            },
            /*
             * it's for reload
             */
            clearData: function(){
                if(!this.data) return;
                for(var dataItemName in this.data) this.data[dataItemName]=null;
            },
            /**
             * set new data items for all elements
             * params= { onlyValues, callContentUpdated, result, error,
             *      loadedResultItem, updatedResultItem, deletedResultItem, updateCount }
             * call onContentUpdated(newData,params,idIsChanged) if callContentUpdated!==false
             */
            setContentData: function(newData,params){                                                           //console.log("ContentController.setContentData newData=",newData,params);
                if(newData===this.data&&!this.isContentChanged()) return;
                if(!params) params= {};
                var thisInstance=this;
                if(!newData){
                    this.data= newData;
                    for(var itemName in this.elements)
                        this.setControlElementData(itemName, null, false, false);
                    if(params.callContentUpdated===false) return;
                    setTimeout(function(){
                        thisInstance.onContentUpdated(newData,params,true);
                    },0);
                    return;
                }
                var oldDataIDValue,newDataIDValue;
                if(this.data&&this.dataIDName) oldDataIDValue= this.data[this.dataIDName];
                if(params.onlyValues){
                    newDataIDValue= null; this.data= [];
                }else{
                    if(newData && this.dataIDName) newDataIDValue= newData[this.dataIDName];
                    this.data= newData;
                }
                var enable = false;
                if(this.dataEnabledChecker&&typeof(this.dataEnabledChecker)!=="function")
                    enable= this.dataEnabledChecker;//dataEnabledChecker = true/false/function(dataItems,dataItemName,dataItemValue,dataEl)
                for(var itemName in this.elements){
                    var dataItemNewValue=newData[itemName], newDataItem= {value:dataItemNewValue}, dataEl = this.elements[itemName];
                    if(dataEl.labelDataItem) newDataItem[dataEl.labelDataItem]= newData[dataEl.labelDataItem];
                    if(this.dataEnabledChecker&&typeof(this.dataEnabledChecker)=="function")
                        enable= this.dataEnabledChecker(newData, itemName,dataItemNewValue, dataEl);//dataEnabledChecker = true/false/function(dataItems,dataItemName,dataItemValue,dataEl)
                    this.setControlElementData(itemName, newDataItem, enable, params.onlyValues);
                }
                if(params.callContentUpdated===false) return;
                var idIsChanged= (!this.data)?true:oldDataIDValue!==newDataIDValue;
                setTimeout(function(){
                    thisInstance.onContentUpdated(newData,params,idIsChanged);
                },0);
            },
            /**
             * set new data items values only for data items elements
             * call onContentUpdated(newData,params,idIsChanged) if callContentUpdated!==false
             */
            setContentDataItems: function(newDataItemsValues,params){
                if(!newDataItemsValues) return;
                if(!params) params= {};
                if(!params.onlyValues&&!this.data) this.data={};

                var oldDataIDValue,newDataIDValue;
                if(this.data&&this.dataIDName) oldDataIDValue= this.data[this.dataIDName];
                if(!params.onlyValues&&this.dataIDName&&newDataItemsValues.hasOwnProperty(this.dataIDName)) newDataIDValue= newDataItemsValues[this.dataIDName];

                var enable = false;
                if(this.dataEnabledChecker&&typeof(this.dataEnabledChecker)!=="function")
                    enable= this.dataEnabledChecker;//dataEnabledChecker = true/false/function(dataItems,dataItemName,dataItemValue,dataEl)
                for(var itemName in newDataItemsValues){
                    var dataItemNewValue=newDataItemsValues[itemName], newDataItem= {value:dataItemNewValue}, dataEl = this.elements[itemName];
                    if(!params.onlyValues) this.data[itemName]=dataItemNewValue;
                    if(!dataEl) continue;
                    if(dataEl.labelDataItem) newDataItem[dataEl.labelDataItem]= newDataItemsValues[dataEl.labelDataItem];
                    if(this.dataEnabledChecker&&typeof(this.dataEnabledChecker)=="function")
                        enable= this.dataEnabledChecker(newDataItemsValues, itemName,dataItemNewValue, dataEl);//dataEnabledChecker = true/false/function(dataItems,dataItemName,dataItemValue,dataEl)
                    this.setControlElementData(itemName, newDataItem, enable, params.onlyValues);
                }
                if(params.callContentUpdated===false) return;
                var idIsChanged= (this.dataIDName&&newDataItemsValues.hasOwnProperty(this.dataIDName))?oldDataIDValue!==newDataIDValue:false,
                    thisInstance=this;
                setTimeout(function(){
                    thisInstance.onContentUpdated(newDataItemsValues,params,idIsChanged);
                },0);
            },
            /**
             * params: { url, conditions, method:"get"/"post", onlyValues:true/false, data }
             * params.data only for post method
             * call setContentData(newData, {...}), newData= request result.item
             * if postaction call postaction(resultItem,error,result)
             * call setContentData do callback onContentUpdated(newData,params,idIsChanged)
             */
            loadDataFromUrl: function(params,postaction){                                                       //console.log("ContentController.loadDataFromUrl url=",this.url," condition=",condition);
                if(!params) return;
                if(!params.method) params.method="get";
                if(params.setOnlyControlElementsValues==undefined) params.setOnlyControlElementsValues=false;
                var thisInstance = this;
                if(params.method=="get"){
                    Request.getJSONData({url:params.url, conditions:params.conditions},
                        function(result,error){
                            var resultItem=(result)?result["item"]:null;
                            thisInstance.setContentData(resultItem,{onlyValues:params.onlyValues, error:error, result:result, loadedResultItem:resultItem});
                            if(postaction)postaction(resultItem,error,result);
                        });
                    return;
                }
                if (params.method!="post") return;
                Request.postJSONData({url:params.url, conditions:params.conditions, data:params.data, consoleLog:true},
                    function(result,error){
                        var resultItem=(result)?result["item"]:null;
                        thisInstance.setContentData(resultItem,{onlyValues:params.onlyValues, error:error, result:result, loadedResultItem:resultItem});
                        if(postaction)postaction(resultItem,error,result);
                    });
            },
            /**
             * params: { url, condition, data, onlyValues:true/false }
             * call setContentData(newData, {...}), if request.updateCount>0 newData= request result.resultItem else newData = this.data
             * if postaction call postaction(success,result,resultItem,resultError,updateCount)
             * call setContentData do callback onContentUpdated(newData,params,idIsChanged)
             */
            storeDataByUrl: function(params,postaction){
                if(!params) return;
                var dataToPost = params.data;
                if(!dataToPost) dataToPost={};
                if(this.data&&this.dataIDName) dataToPost[this.dataIDName]= this.data[this.dataIDName];
                for(var item in this.elements){
                    var value, elementObj = this.elements[item];
                    if(elementObj){
                        value = this.elements[item].value;
                        if(elementObj.declaredClass.indexOf("CheckBox") >= 0){
                            if(elementObj.checked==true) value=1; else value=0;
                        }
                        if(value!=undefined && value instanceof Date) value = moment(value).format("YYYY-MM-DD");
                    }
                    dataToPost[item] = value;
                }
                var thisInstance = this;
                Request.postJSONData({url: params.url, condition: params.condition, data: dataToPost},
                    function(result,error){                                                                     //console.log("ContentController.storeDataByUrl postJSONData dataToPost=",dataToPost," data=",result);
                        var resultItem=(result)?result["resultItem"]:null, updateCount=(result)?result["updateCount"]:null,
                            resultError=(result)?result["error"]:null;
                        if(error||resultError||updateCount!=1){
                            thisInstance.onContentUpdated(thisInstance.data,
                                {onlyValues:params.onlyValues, error:error, result:result,
                                    updatedResultItem:resultItem, updateCount:updateCount, resultError:resultError},
                                false);
                            if(postaction)postaction(result,resultItem,error);
                            return;
                        }
                        thisInstance.setContentData(resultItem,
                            {onlyValues:params.onlyValues, error:error, result:result,
                                updatedResultItem:resultItem, updateCount:updateCount, resultError:resultError});
                        if(postaction)postaction(result,resultItem,error,updateCount);
                    });
            },
            /**
             * params: { url, condition, data, onlyValues:true/false }
             * call setContentData(newData, {...}), if request.updateCount>0 newData= request result.resultItem else newData = this.data
             * if postaction call postaction(success,result,resultItem,resultError,updateCount)
             * call setContentData do callback onContentUpdated(newData,params,idIsChanged)
             */
            deleteDataByUrl: function(params,postaction){
                if(!params) return;
                var dataToPost = params.data;
                if(!dataToPost) dataToPost={};
                if(this.data&&this.dataIDName) dataToPost[this.dataIDName]= this.data[this.dataIDName];
                var thisInstance = this;
                Request.postJSONData({url: params.url, condition: params.condition, data: dataToPost},
                    function(result,error){                                                                     //console.log("ContentController.deleteDataByUrl postJSONData dataToPost=",dataToPost," data=",result);
                        var resultItem=(result)?result["resultItem"]:null, updateCount=(result)?result["updateCount"]:null,
                            resultError=(result)?result["error"]:null;
                        if(error||resultError||updateCount!=1){
                            thisInstance.onContentUpdated(thisInstance.data,
                                {onlyValues:params.onlyValues, error:error, result:result,
                                    deletedResultItem:resultItem, updateCount:updateCount, resultError:resultError},
                                false);
                            if(postaction)postaction(result,resultItem,error);
                            return;
                        }
                        thisInstance.setContentData(null,
                            {onlyValues:params.onlyValues, error:error, result:result,
                                deletedResultItem:resultItem, updateCount:updateCount, resultError:error});
                        if(postaction)postaction(result,resultItem,error,updateCount);
                    });
            },

            /**
             * params= { onlyValues, callContentUpdated, result, error,
             *      loadedResultItem, updatedResultItem, deletedResultItem, updateCount }
             */
            onContentUpdated: function(contentData,params,idIsChanged){
                // TODO actions on content data has been updated by call setContentData() or loadDataFromUrl()
                // TODO or storeDataByUrl() or deleteDataByUrl
            },
            onContentChanged: function(isContentChanged){
                // TODO actions on content has been changed by user or element value has been changed
            },

            postCreate: function(){
            },
            setSelectDropDown: function(selectObj){
                selectObj.selectToggleDropDown= selectObj.toggleDropDown;
                selectObj.toggleDropDown= function(){                                                                   //console.log("ContentController.setSelectDropDown toggleDropDown");
                    Request.getJSONData({url: selectObj.loadDropDownURL},
                        function(result,error){
                            var options=selectObj.get("options"),value = selectObj.get("value");
                            if(result&&result.items){
                                selectObj.set("options",result.items);
                                selectObj.set("value",value);
                            } else if(result&&!result.items) console.error("ContentController.setSelectDropDown loadDropDown getJSONData data error:",result);
                            selectObj.selectToggleDropDown();
                        });
                };
            },

            getContentData: function(){
                return this.data;
            },
            getContentDataItem: function(itemName){
                if(!this.data) return null;
                return this.data[itemName];
            },
            getContentDataIDValue: function(){
                if (!this.data||!this.dataIDName) return undefined;
                return this.data[this.dataIDName];
            },

            setControlElementData: function(itemName,newDataItem,enabled,markElement){                          //console.log("setControlElementData itemName=",itemName," elements=",this.elements, this);
                var elementObj = this.elements[itemName], newValue;
                if(newDataItem&&newDataItem.value!=undefined) newValue= newDataItem.value;
                if(newValue==undefined) newValue= null;
                if(enabled==undefined) enabled= true;
                elementObj.set("disabled",!enabled);
                if(elementObj.declaredClass.indexOf("Select")>=0){
                    if(newValue!==null){
                        var labelItemName=elementObj.labelDataItem, newLabel=newValue;
                        if(newDataItem&&newDataItem[labelItemName]!=undefined) newLabel =newDataItem[labelItemName];
                        var newOption = { label: newLabel, value: newValue, selected: true };
                        if(!elementObj.options || elementObj.options.length == 0) elementObj.set("options", [newOption]);
                        else if(elementObj.options && elementObj.options.length > 0){
                            var founded = false;
                            for(var i in elementObj.options)
                                if(elementObj.options[i]["value"]==newValue){ founded= true; break; }
                            if(founded == false) elementObj.options.push(newOption);
                        }
                    }
                }
                elementObj.set("value", newValue, false);
                if(markElement==undefined) markElement= false;
                this.markElementAsChanged(elementObj, markElement);
                //if (markElemens === true || markElemens === false) {
                //    this.markElementAsChanged(elementObj, markElemens);
                //    break;
                //}
                //var dataIDValue = null;
                //if (this.dataIDName && this.data && this.data[this.dataIDName] !== undefined) dataIDValue = this.data[this.dataIDName];
                //var isMarked = (dataIDValue == null);
                //if (isMarked == false) {
                //    var dataValue = this.data[item];
                //    var isEquals = ( ((dataValue === undefined || dataValue == null || dataValue == '') && (newValue === undefined || newValue == null || newValue == ''))
                //    || (dataValue.toString() == newValue.toString())  );
                //    isMarked = !isEquals;
                //}
                //this.markElementAsChanged(elementObj, !isEquals);
            },
            isElementDataEquals: function(instance,itemName,elementObj){                                        //console.log("ContentController.isElementDataEquals ",itemName,elementObj.value,elementObj.get("value"),elementObj.displayedValue);
                var dataValue = instance.data[itemName];
                if(dataValue===undefined) return false;
                var elementObjValue = elementObj.get("value");
                if((elementObjValue instanceof Date) && !(dataValue instanceof Date)){
                    dataValue = new Date(dataValue);
                    dataValue.setHours(0, 0, 0, 0);
                    elementObjValue.setHours(0, 0, 0, 0);
                }
                if(elementObj.declaredClass.indexOf("CheckBox") >= 0){
                    if(elementObj.checked==true) elementObjValue=1; else elementObjValue=0;
                }
                if(elementObjValue != null) elementObjValue = elementObjValue.toString();
                if(dataValue != null) dataValue = dataValue.toString();
                var result = (elementObjValue == dataValue) || (elementObjValue == "" && dataValue == null);    //console.log("ContentController.isElementDataEquals ",itemName,elementObjValue,elementObj.get("value"),dataValue,result /*,elementObjValue instanceof Date,dataValue instanceof Date*/);
                return result;
            },
            markElementAsChanged: function(elementObj,markAsChanged){                                           //console.log("ContentController.markElementAsChanged markAsChanged",markAsChanged,elementObj);
                var markNode = null, declaredClass = elementObj.declaredClass;
                if(declaredClass.indexOf("TextBox")>=0){ markNode = elementObj.textbox; }
                else if(declaredClass.indexOf("DateTextBox") >= 0){ markNode = elementObj.textbox; }
                else if(declaredClass.indexOf("Select") >= 0){ markNode = elementObj.textDirNode; } //else //markNode=
                if(markAsChanged){
                    elementObj.domNode.classList.add("contentControllerMarkedElement");
                    //elementObj.domNode.style.color= 'red';
                    if(markNode) markNode.style.color='red';
                }else{
                    elementObj.domNode.classList.remove("contentControllerMarkedElement");
                    //elementObj.domNode.style.color= '';
                    if(markNode) markNode.style.color='';
                }
            },
            onElementChanged: function (instance,itemName,elementObj){
                var isMarkElement = false;
                if(!this.data || (this.dataIDName&&this.data[this.dataIDName]===null)) isMarkElement=true;
                if(isMarkElement==false)
                    isMarkElement = !instance.isElementDataEquals(instance, itemName, elementObj);
                instance.markElementAsChanged(elementObj, isMarkElement);                                       //console.log("ContentController.onElementChanged isMarkElement=",isMarkElement);
                if(isMarkElement==true){
                    instance.displayStateMessageonContentChanged(true);
                    instance.onContentChanged(true);
                }else{
                    var isContentChanged= instance.isContentChanged();
                    instance.displayStateMessageonContentChanged(isContentChanged);
                    instance.onContentChanged(isContentChanged);
                }
            },
            isContentChanged: function(){                                                                       //console.log("ContentController.isContentChanged data=",this.data," dataIDName=",this.dataIDName);
                if(this.data==null) return false;
                if(this.dataIDName&&this.data[this.dataIDName]===null) return true;
                var isChanged = false;
                for(var item in this.elements){
                    var elementObj = this.elements[item];
                    if(this.isElementDataEquals(this, item, elementObj)==false){ isChanged = true; break; }
                }                                                                                               //console.log("ContentController.isContentChanged return=",isChanged);
                return isChanged;
            },

            stateElementID: null,
            setStateElement: function(stateElementID){
                this.stateElementID = stateElementID;
                this.setDefaultStateMessages();
            },
            stateMessages: [],
            setDefaultStateMessages: function(){
                this.stateMessages["loadError"]= "<div><b style='color:red'>Не удалось загрузить данные с сервера!<br>Нет связи с сервером.</br></div>";
                this.stateMessages["readData"]= "<div>Просмотр данных.</div>";
                this.stateMessages["noData"]= "<div>Нет данных.</div>";
                this.stateMessages["newData"]= "<div><b style='color:red'>Новая запись.</b></div>"
                    +"<div><b>Для сохранения новой записи выберите действие \"Сохранить данные\".</b></div>"
                    +"<div><b>Для отмены создания новой записи выберите действие \"Отменить изменение\".</b></div>";
                this.stateMessages["updateData"]= "<div><b style='color:red'>Изменение данных.</b></div>"
                    +"<div><b>Для сохранения изменений выберите действие \"Сохранить данные\".</b></div>"
                    +"<div><b>Для отмены изменений выберите действие \"Отменить изменение\".</b></div>";
                this.stateMessages["updateOK"]= "<div><b>Данные сохранены на сервере.</b></div>";
                this.stateMessages["updateError"]= "<div><b style='color:red'>Не удалось сохранить данные на сервере!<br> </br></div>";
            },
            getStateMessage: function(stateMessagesItemName){/*stateMessagesItemName = loadError/readData/noData/newData/updateData/postOK/postError or other*/
                if(!this.stateMessages) return "";
                var stateMessage = this.stateMessages[stateMessagesItemName];
                if(!stateMessage) return "";
                return stateMessage;
            },
            displayStateMessage: function(stateMessagesItemName){                              //console.log("ContentController.displayStateMessage stateElementID=",this.stateElementID," ",stateMessagesItemName," ",this.stateMessages[stateMessagesItemName]);
                if(this.stateElementID){
                    var messageElement= document.getElementById(this.stateElementID);
                    if(messageElement) messageElement.innerHTML = this.getStateMessage(stateMessagesItemName);
                }
            },
            displayStateMessageonContentUpdated: function(updateResult){
                if(this.data===null||this.data===undefined)  this.displayStateMessage("noData");
                else if(updateResult===undefined) {//data loaded
                    if(this.getContentDataIDValue()===null) this.displayStateMessage("newData");
                    else this.displayStateMessage("readData");
                }else{//updateResult!==undefined - data updated
                    if(updateResult===false) this.displayStateMessage("updateError");
                    else this.displayStateMessage("updateOK");
                }
            },
            displayStateMessageonContentChanged: function(isContentChanged){
                if(this.data===null) this.displayStateMessage("noData");
                else{
                    if(isContentChanged!==true) this.displayStateMessage("readData");
                    else{
                        if(this.getContentDataIDValue()===null) this.displayStateMessage("newData");
                        else this.displayStateMessage("updateData");
                    }
                }
            }
        });
    });
