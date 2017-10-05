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

export default function Settings(){

    var self = this;
    var dolarInputCustom;
    
    
    function init(){

        
        var showInfoIcons = utils.getSavedItem('showInfoIcons');
        var showCheckboxes = utils.getSavedItem('showCheckboxes');
        var showFranquicia = utils.getSavedItem('showFranquicia');
        var alternativeDesignEnabled = utils.getSavedItem('alternativeDesignEnabled');

        

        dolarInputCustom = $('#dolar-input-custom').get(0);
        
        app.valCompra = app.config.defaultPurchase;
        
        // it may be null, true, false
        if(alternativeDesignEnabled === null) alternativeDesignEnabled = app.data.alternativeDesignEnabled; // set to default
        app.data.alternativeDesignEnabled = alternativeDesignEnabled;
        $('#sliderToggleDesign').prop('checked', app.data.alternativeDesignEnabled);

        ga('send', {
            hitType: 'event',
            eventCategory: 'Settings',
            eventAction: 'loaded',
            eventLabel: 'alternativeDesignEnabled',
            eventValue: app.data.alternativeDesignEnabled
        });

        loadMainColor();

        // it may be null, true, false
        if(showInfoIcons === null) showInfoIcons = app.data.showInfoIcons; // set to default
        app.data.showInfoIcons = showInfoIcons;
        $('#sliderToggleInfo').prop('checked', app.data.showInfoIcons);

        // it may be null, true, false
        if(showCheckboxes === null) showCheckboxes = app.data.showCheckboxes; // set to default
        app.data.showCheckboxes = showCheckboxes;
        $('#sliderToggleCheckboxes').prop('checked', app.data.showCheckboxes);
        

        if(showFranquicia !== null && (showFranquicia === true || showFranquicia === false)){
            app.data.showFranquicia = showFranquicia;
        }

        app.saveSettingRequested.add(onSaveSettingRequested);

    }

    this.toggleDesign = function (){

        app.data.alternativeDesignEnabled = $('#sliderToggleDesign').prop('checked');

        this.setMainColor(app.data.mainColor);

        localStorage.setItem('alternativeDesignEnabled',  app.data.alternativeDesignEnabled);
    };

    // todo: is 'important' necessary?
    this.setMainColor = function(color){

        log('Settings - setMainColor() color:', color)

        $(document.body).css('background-color', color, 'important');
        $('#app').css('background-color', color, 'important');
        $('#settings .settings-header').css('background-color', color, 'important');
        $('#infoModal .modal-header').css('background-color', color, 'important');
        
        // dont change when on the welcome screen
        if(app.data.hasAcceptedTerms){
            $('#termsModal .modal-header').css('background-color', color, 'important');
            $('#terms-ok-btn').css('background-color', color, 'important');
        }
        
        // $('#contact-link').css('color', color, 'important');        
        $('.checkbox-check').css('color', color, 'important');
        // $('#price-compra-input').css('color', color, 'important');
        // $('#compra-stuff .form-control').css('color', color, 'important');
        // $('.arrow .fa-caret-down').css('color', color, 'important');
        $('#settings .panel-left').css('background-color', color, 'important');


        if(app.data.alternativeDesignEnabled){
            $('#section-purchase').css('background-color', color);
            $('#section-expenses').css('background-color', color);
            $('#section-total').css('background-color', 'white');
            $('#section-total').css('color', color);

            $('#app-links button').css('color', color);
        }
        else{
            $('#section-purchase').css('background-color', utils.changeColorLuminance(color, -app.config.colorLuminanceChange));
            $('#section-expenses').css('background-color', color);
            $('#section-total').css('background-color', utils.changeColorLuminance(color, app.config.colorLuminanceChange));

            $('#section-total').css('color', 'white');
            $('#app-links button').css('color', 'white');           
        }


        localStorage.setItem('mainColor', color);

        app.data.mainColor = color;
    };


    this.onCurrencyModified = function(event, id){
        
        if(!event || !event.srcElement){

            throw new Error('Settings - onCurrencyModified() - "!event || !event.srcElement"');
        }

        var val = event.srcElement.value;

        if(isNaN(val)){
            $(event.srcElement).addClass('input-error');
            return;
        }

        val = Number(val);

        if(val <= 0){
            $(event.srcElement).addClass('input-error');
        }
        else{
            $(event.srcElement).removeClass('input-error');

            app.currencyModified.dispatch({id:id, value:val});
            
            app.settingsChanged.dispatch();
        }
    };

    this.toggleCustomCurrency = function(id){
        
        var signalData = {id:id, value:false};

        // if 'checked' is true, 'value' is false (it affects 'usesCustomValue')
        if(!$('#sliderToggle' + id).prop('checked')){
        
            signalData.value = true;
        }

        app.currencySliderToggled.dispatch(signalData);

        app.settingsChanged.dispatch();
    };

    this.toggleInfoIcons = function(){

        app.data.showInfoIcons = $('#sliderToggleInfo').prop('checked');
         
        
        localStorage.setItem('showInfoIcons', app.data.showInfoIcons);
    };

    this.toggleCheckboxes = function(){

        app.data.showCheckboxes = $('#sliderToggleCheckboxes').prop('checked');         
        
        localStorage.setItem('showCheckboxes', app.data.showCheckboxes);
    };
    


    function loadMainColor(){
        
        var mainColor = utils.getSavedItem('mainColor');

        if(mainColor !== null){
            
            self.setMainColor(mainColor);

            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'loaded',
                eventLabel: 'mainColor',
                eventValue: mainColor
            });
              
        }
        else{
            self.setMainColor(app.config.mainColor);
        }
    }

    function onSaveSettingRequested(setting){
        localStorage.setItem(setting.name, setting.value);
    }

    init();
}