/*
MIT License

Copyright (c) 2017 Ivo Cass

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict"

import Promise from 'promise-polyfill'; 
import app from './app';
import utils from './utils';

import logger from './logger';

import Signal from './signal';
import TermsMgr from './termsMgr';
import Calculator from './calculator';
import Settings from './settings';
// import quoteGenerator from './quoteGenerator';
import Currency from './currency/currency';
import CurrencyManager from './currency/currencyManager';



Vue.config.devtools = false;

// ie polyfill
if (!window.Promise) {
window.Promise = Promise;
}

// ie polyfill
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === "number" &&
           isFinite(value) &&
           Math.floor(value) === value;
};


var App = function(){

    log('App()');    
    
    this.config = new Config();    
    this.data;

    var hasInitialized = false;    
    var termsMgr;
    var currencyManager;
    var settings;
    var calc;

    this.currencyUpdated = new Signal();
    this.currencySelected = new Signal();
    this.currencySliderToggled = new Signal();
    this.currencyOffsetToggled = new Signal();
    this.currencyModified = new Signal(); // dispatched after processed by Settings
    this.currencyOffsetModified = new Signal(); // dispatched after processed by Settings
    this.settingsChanged = new Signal();
    this.saveSettingRequested = new Signal();

    this.init = function(){

        log('App - init()');

        if(hasInitialized) return;
        hasInitialized = true;

        logger.setMaxEntries(this.config.loggerMaxEntries);

        utils.trackingEnabled = this.config.trackingEnabled;


        this.data = new Vue({
        el: '#app',
        data: {
            termsAndConditions:"cargando..",
            hasAcceptedTerms:false,
            alternativeDesignEnabled:false,
            alternateDetailsEnabled:false,
            mainColor:'#10c77b',
            currency:new Currency('USD'), // dummy currency for Vue, until the current one is set
            currencyUSD:new Currency('USD'),
            currencyEUR:new Currency('EUR'),
            currencyGBP:new Currency('GBP'),            
            currencyARS:new Currency('ARS'),
            currencies:[], 
            selectOptionUSD:'USD (Dólar) - $...',
            selectOptionEUR:'EUR (Euro) - $...',
            selectOptionGBP:'GBP (Libra) - $...',
            selectOptionARS:'ARS (Peso)',
            currencyOffset:app.config.currencyOffset,
            isOffsetCustom:false,
            valCompra:app.config.defaultPurchase,
            valCurrencyConversion:0,        
            valCurrencyConversionText:'$0',        
            valAfip:0,
            valCorreo:app.config.gestionCorreo,
            valFranchise:app.config.valFranchise,
            valTotal:0,
            showCompraPesos:true,
            showAfip:true,
            showCorreo:true,
            useFranchise:true,
            showInfoIcons:true,
            showCheckboxes:true,
            infoModalTitle:'',
            valCompraMax:app.config.valCompraMax,
            isCompraOutOfRange:false,
            showingSettings:false,
            version:app.config.version
        },
        methods: {
            
            // settings
            setMainColor:function(color){settings.setMainColor(color)},                    
            onCurrencyModified:function(event, id){settings.onCurrencyModified(event, id)},
            toggleDesign:function(){settings.toggleDesign()},
            toggleCustomCurrency:function(id){settings.toggleCustomCurrency(id)},
            toggleInfoIcons:function(){settings.toggleInfoIcons()},
            toggleCheckboxes:function(){settings.toggleCheckboxes()},            
            toggleCurrencyOffset:function(){settings.toggleCurrencyOffset()},
            onCurrencyOffsetModified:function(event){settings.onCurrencyOffsetModified(event)},

            // termsMgr
            onTermsCheckboxClicked:function(){termsMgr.onTermsCheckboxClicked()},
            onWelcomeContinueClicked:function(){termsMgr.onWelcomeContinueClicked()},
            
            // app
            openSettings:function(color){app.data.showingSettings = true},
            closeSettings:function(color){app.data.showingSettings = false},    
            showDetailsSection:function(){app.data.alternateDetailsEnabled = true},
            hideDetailsSection:function(){app.data.alternateDetailsEnabled = false},
            onFacebookClicked:function(){app.onFacebookClicked()},
            onExtensionClicked:function(name){app.onExtensionClicked(name)},

            // currencyManager
            onCurrencySelected:function(e){currencyManager.onCurrencySelected(e)},
            updateCurrency:function(id){currencyManager.updateCurrency(id)},

            // calc
            onLabelClicked:function(name){calc.onLabelClicked(name)},
            showInfoModal:function(id){calc.showInfoModal(id)},
        }
     });

        if(!this.config.loggerEnabled){
            logger.disable();
        }

        termsMgr = new TermsMgr();
        currencyManager = new CurrencyManager();
        settings = new Settings();
        calc = new Calculator();
    };

    this.onFacebookClicked = function(){

        utils.track('Facebook', 'Clicked');

        window.open('https://www.facebook.com/CalculoCompras','_blank');
    };

    this.onExtensionClicked = function(browserName){

        utils.track('Extension', 'Clicked', browserName);
    };
    
}

export default new App();

// $(document).ready(app.init);

app.init();