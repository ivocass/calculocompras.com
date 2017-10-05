import app from '../app';

import utils from '../utils';


var CurrencyManager = function(){

    log('CurrencyManager()');

    

    function init(){

        log('CurrencyManager - init()');

        // don't include ARS (as it shouldn't be in Configuración)
        app.data.currencies.push(app.data.currencyUSD, app.data.currencyEUR, app.data.currencyGBP); 

        app.data.currencyUSD.load(0);
        app.data.currencyEUR.load(1);
        app.data.currencyGBP.load(2);
        app.data.currencyARS.load(3);

        

        var selectedCurrencyId = utils.getSavedItem('selectedCurrencyId');

        if(selectedCurrencyId == null || selectedCurrencyId == undefined || selectedCurrencyId == ''){
            
            selectedCurrencyId = app.config.defaultCurrencyId;

            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'loaded',
                eventLabel: 'selectedCurrencyId',
                eventValue: selectedCurrencyId
            });
        }

        app.data.currency = getCurrencyById(selectedCurrencyId);

        $('#currency-select').prop('selectedIndex', app.data.currency.getIndex());

        app.data.currency.setSelectedState(true);

        log('CurrencyManager - init() - app.data.currency.getId():', app.data.currency.getId());


        app.currencySliderToggled.add(onCurrencySliderToggled);
        app.currencyModified.add(onCurrencyModified);
    }

    this.updateCurrency = function (id){

        var currency = getCurrencyById(id);

        if(currency){
            currency.update();
        }
    };

    function onCurrencySliderToggled(data){

        var currency = getCurrencyById(data.id);
        
        if(currency){
            currency.setAutoMode(data.value);
        }
    }

    function onCurrencyModified(data){

        var currency = getCurrencyById(data.id);

        if(currency){
            currency.setCustomVal(data.value);
        }
    }


    function getCurrencyById(id){

        log('CurrencyManager - getCurrencyById()', id);

        switch(id){
            
            case 'USD':
                return app.data.currencyUSD;
            
            case 'EUR':
                return app.data.currencyEUR;
            
            case 'GBP':
                return app.data.currencyGBP;
            
            case 'ARS':
                return app.data.currencyARS;
        }

        throw new Error('CurrencyManager - getCurrencyById() - unrecognized currency id:' + id);

        return null;
    }


    this.onCurrencySelected =  function(e){

        
        
        if(e == null || e.target.selectedIndex == undefined){
            throw new Error('CurrencyManager - onCurrencySelected()');
        }

        var id = app.config.currencies[e.target.selectedIndex].id;
        
        log('CurrencyManager - onCurrencySelected()', id);

        var selectedCurrency = getCurrencyById(id);
        
        if(!selectedCurrency || selectedCurrency == app.data.currency){
            return;
        }

        app.data.currency.setSelectedState(false);

        app.data.currency = selectedCurrency;

        app.data.currency.setSelectedState(true);

        app.currencySelected.dispatch();

        app.saveSettingRequested.dispatch({name:'selectedCurrencyId', value:id});
    }

    this.onCurrencyModified = function(event, id){


    };

    init();
}

export default CurrencyManager;