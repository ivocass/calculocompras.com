import utils from '../utils';
import app from '../app';
import CurrencyUpdater from './currencyUpdater';

var Currency = function(id){

    log('Currency() - id:', id);

    var self = this;
    var _index = -1;
    var id = id;
    var name = '-1';
    var currentVal = 0;
    var fallbackVal = -1;
    var updatedVal = -1;
    var customVal = -1;
    var lastFallbackValDate = -1;    
    var lastUpdateDate = -1;    
    var lastCustomValDate = -1;
    var _usesCustomVal = false;
    var queryUrl = '';
    var isSelected = false;
    var currencyUpdater;

    this.getName = function(){
        return name;
    };

    this.getId = function(){
        return id;
    };
    
    this.getCurrentVal = function(){

        log('Currency - getCurrentVal()', id, currentVal);

        return currentVal;
    }

    this.setCurrentVal = function(val){

        log('Currency - setCurrentVal()', id, val);

        val = applyOffset(val);

        currentVal = val;

        updateSelectOption();
    }

    function applyOffset(val){

        if(id == 'ARS'){
            return val;
        }

        var offset = app.data.currencyOffset;

        if(!_usesCustomVal && offset != 0){
            
            if(updatedVal == -1){
                val = fallbackVal;
            }
            else{
                val = updatedVal;
            }

            if(offset >= -50 && offset <= 50){

                // offset is a percentage, so it should be divided by 100 and added to 1
                // e.g.: 17.4 * (1 + 2 / 100)   ===> 17.4 * 1.02
                val *= 1 + offset / 100;

                val = utils.formatCurrency(val);

                log('Currency - setCurrentVal() applied offset. id:', id, 'val:', val, 'offset:', offset);
            }
        }

        return val;
    }
    
    this.refresh = function(){

        log('Currency - refresh()', id);

        var val = -1;

        if(_usesCustomVal){
            val = customVal;
        }
        else{

            if(updatedVal == -1){
                val = fallbackVal;
            }
            else{
                val = updatedVal;
            }
        }

        this.setCurrentVal(val);
    };   

    this.setAutoMode = function (usesCustomVal){

        log('Currency - setAutoMode()', id, usesCustomVal);

        _usesCustomVal = usesCustomVal;

        if(_usesCustomVal){

            if(customVal == -1){
                customVal = self.getCurrentVal();
            }

            lastCustomValDate = Date.now();

            self.setCurrentVal(customVal);            
        }
        else{

            if(updatedVal > -1){

                self.setCurrentVal(updatedVal);
            }
            else{
                log('Currency - setAutoMode() - using fallbackVal', id, usesCustomVal, fallbackVal);
                self.setCurrentVal(fallbackVal);
            }
        }

        self.save();
    };

    this.setCustomVal = function(val){

        customVal = val;

        self.setCurrentVal(customVal);

        self.save();
    };

    this.setSelectedState = function(val){
        isSelected = val;

        if(isSelected){

            if(id != 'ARS'){
                currencyUpdater.wakeUp();
            }            
        }
        else{
            currencyUpdater.sleep();
        }
    };


    this.getLastUpdateDate = function(){
        return lastUpdateDate;
    };

    this.getLastUpdateDateReadable = function(){

        if(lastUpdateDate == -1){
            return '-1';
        }

        return new Date(lastUpdateDate).toLocaleString('es-AR');
    };
    
    this.getHasCustomVal = function(){
        return _usesCustomVal;
    };

    this.getIndex = function(){
        return _index;
    }

    this.load = function(index){

        _index = index;

        // load from config.js
        var data = app.config.currencies[_index];

        log('Currency - load() data.id', data.id);

        
        if(id != data.id){

            var errorMsg = 'Currency - load() - expected id: "' + id + '" doesnt match data.id: "' + data.id + '"';
            log(errorMsg);
            throw new Error(errorMsg);
        }

        name = data.name;
        fallbackVal = data.val;
        lastUpdateDate = data.lastUpdate;
        lastFallbackValDate = data.lastUpdate;
        queryUrl = app.config.currencyQueryUrl.replace('{1}', id);

        currencyUpdater = new CurrencyUpdater(id, queryUrl, onUpdateReady);

        self.setCurrentVal(fallbackVal);

        

        // load from localStorage
        var savedData = utils.getSavedItem(id);
        
        if(!savedData || savedData.id != id){
            log('Currency - load() - no saved data', savedData, id);
            return;
        }

        updatedVal = savedData.updatedVal;
        customVal = savedData.customVal;
        lastUpdateDate = savedData.lastUpdateDate;
        lastCustomValDate = savedData.lastCustomValDate;
        _usesCustomVal = savedData.usesCustomVal;

        log('Currency - load() - loading:', updatedVal, customVal, lastUpdateDate, lastCustomValDate, _usesCustomVal);
        
        if(_usesCustomVal == false){

            if(updatedVal > -1 &&
                lastUpdateDate > -1 &&
                lastUpdateDate > lastFallbackValDate){
        
                log('Currency - load() - loaded successfully. setting updatedVal:', updatedVal);
                self.setCurrentVal(updatedVal);
            }
            else{
                log('Currency - load() - FAILED to load:', id, updatedVal);
            }
        }
        else{

            if(customVal > -1){
                self.setCurrentVal(customVal);
            }
            else{
                // we keep using the fallbackVal that we just set
                _usesCustomVal = false;

                self.save();
            }            
        };        
        
    };


    this.save = function(){

        log('Currency - save()', id);

        localStorage.setItem(id, getSaveData());
    };

    function getSaveData(){

        var data = 
            {id:id, 
            updatedVal:updatedVal, 
            customVal:customVal, 
            lastUpdateDate:lastUpdateDate, 
            lastCustomValDate:lastCustomValDate, 
            usesCustomVal:_usesCustomVal};

        return JSON.stringify(data);
    }

    this.update = function(){

        log('Currency - update()', id);

        currencyUpdater.update();
    };

    function updateSelectOption(){

        log('Currency - updateSelectOption() - ' + id);

        switch(id){

            case 'USD':
                app.data.selectOptionUSD = 'USD (Dólar) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
            case 'EUR':
                app.data.selectOptionEUR = 'EUR (Euro) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
            case 'GBP':
                app.data.selectOptionGBP = 'GBP (Libra) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
        }
    }

    function onUpdateReady(update){

        log('Currency - onUpdateReady()', update.id, update.value, update.date);
        

        if(update.id != id){

            log('Currency - onUpdateReady() - ids dont match:', update.id, id);
            return;
        }

        if(update.date > lastUpdateDate){
            
            lastUpdateDate = update.date;
            updatedVal = update.value;
    
            log('Currency - onUpdateReady() - success', id);
    
            if(!_usesCustomVal){
                self.setCurrentVal(updatedVal);
            }
    
            self.save();

            app.currencyUpdated.dispatch(self);
        }
        else{
            log('Currency - onUpdateReady() - update.date is older than:', getLastUpdateDate());
        }
    }

}

export default Currency;