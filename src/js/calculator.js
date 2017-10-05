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

import app from './app';
import utils from './utils';

export default function Calculator(){
    
    log('Calculator()');

    // todo: use better names to identify html elements
    var priceCompraInput;
    var currencyConversionText;
    var priceAfip;
    var priceCorreo;
    var priceFranquicia;
    var valTotalSpan;    
    var data = null;
    var prevInput = '';

    

    function init(){

        log('Calculator - init()');

        data = app.data;
        
        priceCompraInput = $('#price-compra-input').get(0);
        currencyConversionText = $('#currency-conversion-text').get(0);
        priceAfip = $('#price-afip').get(0);
        priceCorreo = $('#price-correo').get(0);
        priceFranquicia = $('#price-franquicia').get(0);
        valTotalSpan = $('#val-total').get(0);
        prevInput = data.valCompra;
        
        document.body.addEventListener('wheel', mouseWheelListener);
        priceCompraInput.addEventListener('keyup', onPriceCompraInputChanged);

        app.currencyUpdated.add(onCurrencyUpdated);
        app.settingsChanged.add(updateTotal);
                
        updatePrice(priceCompraInput, data.valCompra);

        processNewCompraVal();
                
        updateTotal();

        if(app.config.runTests){
            runTests();
        }
        
        
        app.currencySelected.add(processNewCompraVal);
    }

    init();
    
    this.showInfoModal = function(id){
        
        $('.info-modal-content').addClass('d-none');

        data.infoModalTitle = $(id).data('title');
        
        $(id).removeClass('d-none');
    }

    function onCurrencyUpdated(){

        log('Calculator() - onCurrencyUpdated()');

        processNewCompraVal();
    }

    function onPriceCompraInputChanged(e){
        
        // firefox allows other characters in input even with type="number"
        // this code helps (but first needs to be tested in mac and mobile)
        // var key = e.keyCode;
        // const KEY_BACKSPACE = 8;
        // const KEY_DEL = 46;
        // const KEY_PERIOD = 190;
        // const KEY_NUMPAD_PERIOD = 110;        
        // const KEY_HOME = 36;
        // const KEY_END = 35;

        // // numbers, numpad numbers, arrows
        // var allowedKeys = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, KEY_BACKSPACE, KEY_DEL, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, KEY_PERIOD, KEY_NUMPAD_PERIOD, 37, 38, 39, 40, KEY_HOME, KEY_END];

        // if (allowedKeys.indexOf(key) == -1)
        // {
        //     priceCompraInput.value = prevInput;
            
        //     return;
        // }

        // prevInput = priceCompraInput.value;

        processNewCompraVal();
    }

    function processNewCompraVal(){

        log('Calculator() - processNewCompraVal()', priceCompraInput.value);

        if(Number(priceCompraInput.value) < 0){
            priceCompraInput.value = 0;
        }

        data.valCompra = Number(priceCompraInput.value);         

        data.isCompraOutOfRange = getIsCompraOutOfRange();

        updateTotal();
    }

    function mouseWheelListener(e){

        if(data.showingSettings){
            return;
        }
        
        let val = Number(priceCompraInput.value);

        var step = 1;

        if(e.shiftKey){
            step = 10;
        }
        else
        if(e.altKey){
            step = 0.1;
        }

        if(e.deltaY < 0){
            val += step;
        }
        else{
            val -= step;
        }

        if(val < 0){
            val = 0;
        }

        val = formatPrice(val);

        priceCompraInput.value = val;

        processNewCompraVal();
    }

    this.onLabelClicked = function(name){
        
        log('Calculator - onLabelClicked', name);

        switch(name){
            
            case 'afip':
                data.showAfip = !data.showAfip;
            break;
            
            case 'correo':
                data.showCorreo = !data.showCorreo;
            break;
            
            case 'franquicia':
                data.showFranquicia = !data.showFranquicia;

                app.saveSettingRequested.dispatch({name:'showFranquicia', value:data.showFranquicia});
            break;
        }

        updateTotal();
    }

    // todo: stop using english and spanish for f#$k's sake...
    function getIsCompraOutOfRange(){

        // get valCompra in USD
        var valCompraUSD = data.valCompra;
        
        // if we are not using USD
        if(data.currency != data.currencyUSD){

            let valCompraARS = data.valCompra;
            
            // if we are not using ARS
            if(data.currency != data.currencyARS){

                // convert to ARS
                valCompraARS = data.valCompra * data.currency.getCurrentVal();
            }
            
            // then convert to USD
            valCompraUSD = valCompraARS / data.currencyUSD.getCurrentVal();
            
        }

        if(valCompraUSD > data.valCompraMax){

            log('Calculator - getIsCompraOutOfRange()', data.valCompra, valCompraUSD, true);
            return true;
        }

        log('Calculator - getIsCompraOutOfRange()', data.valCompra, valCompraUSD, false);

        return false;
    }

    function updatePrice(priceLabel, value){

        // console.log('Calculator - updatePrice()', priceLabel, value);

        value = formatPrice(value);

        if(priceLabel.tagName == 'INPUT'){
            priceLabel.value = value;
        }
        else{
            priceLabel.innerHTML = value;
        }        
    }

    function formatPrice(val){

        val = parseFloat(val).toFixed(2);

        if(Number.isInteger(Number(val))){
            
            return parseFloat(val).toFixed(0);
        }

        return val;
    }


    function updateTotal(){

        var currencyModifier = data.currency.getCurrentVal();   
        
        var valPurchase = data.valCompra * currencyModifier;

        var valAfip = data.showAfip? valPurchase * 0.5 : 0;    
        var valCorreo = data.showCorreo? app.config.gestionCorreo : 0;
        var valFranquicia = data.showFranquicia? -25 * data.currencyUSD.getCurrentVal() : 0;
        
        var valAfipTemp = valAfip;
        
        if(data.showAfip && data.showFranquicia){
            
            // if afip is 10 usd, franchise will be -10
            if(valFranquicia * -1 > valAfipTemp){
                valFranquicia = -valAfipTemp;
            }

            valAfipTemp += valFranquicia;

            if(valAfipTemp < 0){
                valAfipTemp = 0;
            }
        }

        var valTotal = valPurchase + valAfipTemp + valCorreo;

        // console.log('data.valTotal', data.valTotal, data.valPesos, data.valAfip, data.valCorreo);

        
        if(data.currency.getId() == 'ARS'){
            
            // currencyConversionText will show peso to dollar

            data.valCurrencyConversion = data.valCompra / data.currencyUSD.getCurrentVal();
            
            data.valCurrencyConversionText = 'U$S{1}';
        }        
        else{

            // currencyConversionText will show peso from other currencies

            data.valCurrencyConversion = valPurchase;
            
            data.valCurrencyConversionText = '${1}';
        }

        data.valCurrencyConversion = formatPrice(data.valCurrencyConversion);
        data.valCurrencyConversionText =  data.valCurrencyConversionText.replace('{1}', data.valCurrencyConversion)
        

        data.valAfip = formatPrice(valAfip);
        data.valCorreo = formatPrice(valCorreo);
        data.valFranquicia = formatPrice(valFranquicia);
        data.valTotal = formatPrice(valTotal);

        if(data.valCompra == 0){
            data.valTotal = '?';
        }

        log('Calculator - updateTotal() -', data.currency.getCurrentVal(), valPurchase, valAfipTemp, valCorreo, valTotal);
    }

    function runTests(){

        console.log('<<<<<<<<<<<<<<<<< Calculator - runTests() - STARTED >>>>>>>>>>>>>>>>');

        console.log('--------- TEST 1 ---------');

        data.valCompra = 123.45;
        data.currencyUSD.setCurrentVal(18.12);
        data.gestionCorreo = 120;
        data.valFranquicia = -25 * data.valDolar;

        data.showAfip = true;
        data.showCorreo = true;
        data.showFranquicia = true;

        updateTotal();

        // force render
        app.data.$mount();
        
        utils.assertEquals('currencyConversionText.innerHTML', currencyConversionText.innerHTML, "$2236.91");
        utils.assertEquals('priceAfip.innerHTML', priceAfip.innerHTML, "$1118.46");
        utils.assertEquals('priceCorreo.innerHTML', priceCorreo.innerHTML, "$120");
        utils.assertEquals('priceFranquicia.innerHTML', priceFranquicia.innerHTML, "$-453");
        utils.assertEquals('valTotalSpan.innerHTML', valTotalSpan.innerHTML, "3022.37");
        

        // get the total independently
        var valPesos = data.valCompra * data.currencyUSD.getCurrentVal();
        var valAfip = valPesos * 0.5;
        var valCorreo = 120;
        var valFranquicia = -25 * data.currencyUSD.getCurrentVal();

        var valAfipTemp = valAfip + valFranquicia;

        if(valAfipTemp < 0){
            valAfipTemp = 0;
        }
        
        var valTotal = valPesos + valAfipTemp + valCorreo;

        utils.assertEquals('valPesos', valPesos, 2236.914);
        utils.assertEquals('valAfip', valAfip, 1118.457);
        utils.assertEquals('valFranquicia', valFranquicia, -453);
        utils.assertEquals('valAfipTemp', valAfipTemp, 665.4570000000001);
        utils.assertEquals('valTotal', valTotal, 3022.371);
        
        utils.assertEquals('data.valAfip', data.valAfip, formatPrice(valAfip));
        utils.assertEquals('data.valFranquicia', data.valFranquicia, formatPrice(valFranquicia));
        utils.assertEquals('data.valTotal', data.valTotal, formatPrice(valTotal));


        console.log('--------- TEST 2 ---------');

        data.valCompra = 42.42;
        data.currency = data.currencyEUR;
        data.currencyEUR.setCurrentVal(22.54);
        data.gestionCorreo = 120;
        data.valFranquicia = 0;

        data.showAfip = true;
        data.showCorreo = true;
        data.showFranquicia = false;

        updateTotal();

        // force render
        app.data.$mount();

        utils.assertEquals('currencyConversionText.innerHTML', currencyConversionText.innerHTML, "$956.15");
        utils.assertEquals('priceAfip.innerHTML', priceAfip.innerHTML, "$478.07");
        utils.assertEquals('priceCorreo.innerHTML', priceCorreo.innerHTML, "$120");
        utils.assertEquals('priceFranquicia.innerHTML', priceFranquicia.innerHTML, "$0");
        utils.assertEquals('valTotalSpan.innerHTML', valTotalSpan.innerHTML, "1554.22");
        

        // get the total independently
        valPesos = data.valCompra * data.currency.getCurrentVal();
        valAfip = valPesos * 0.5;
        valCorreo = 120;
        valFranquicia = 0;

        valAfipTemp = valAfip + valFranquicia;

        if(valAfipTemp < 0){
            valAfipTemp = 0;
        }

        valTotal = valPesos + valAfipTemp + valCorreo;

        utils.assertEquals('valPesos', valPesos, 956.1468);
        utils.assertEquals('valAfip', valAfip, 478.0734);
        utils.assertEquals('valFranquicia', valFranquicia, 0);
        utils.assertEquals('valAfipTemp', valAfipTemp, valAfip);
        utils.assertEquals('valTotal', valTotal, 1554.2202);
        
        utils.assertEquals('data.valAfip', data.valAfip, formatPrice(valAfip));
        utils.assertEquals('data.valFranquicia', data.valFranquicia, formatPrice(valFranquicia));
        utils.assertEquals('data.valTotal', data.valTotal, formatPrice(valTotal));


        console.log('<<<<<<<<<<<<<<<<< Calculator - runTests() - ENDED >>>>>>>>>>>>>>>>');
    }

}

