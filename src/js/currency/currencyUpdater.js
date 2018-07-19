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

import app from '../app';
import utils from '../utils';

var CurrencyUpdater = function(id, queryUrl, onUpdateSuccessful, onUpdateError){
    
    log('CurrencyUpdater() - id:', id, 'queryUrl:', queryUrl);

    var req = new XMLHttpRequest();
    var timerId = '';
    var sleeping = true;

    this.wakeUp = function(){
        
        log('CurrencyUpdater() - wakeUp()', id, app.config.updateCurrency);

        if(!app.config.updateCurrency){
            return;
        }

        sendRequest();

        clearInterval(timerId);
        timerId = setInterval(sendRequest, app.config.currencyUpdateInterval);
        sleeping = false;
    }

    this.sleep = function(){
        clearInterval(timerId);

        timerId = '';
        sleeping = true;
    };

    this.update = function(){
        sendRequest();
    };

    function sendRequest(){

        log('CurrencyUpdater() - sendRequest() - queryUrl:', queryUrl);

        req.open('GET', queryUrl, true);
        req.send();
    }

    req.onreadystatechange = function(){
        
        log('CurrencyUpdater() - req.onreadystatechange()', id, 'req.readyState:', req.readyState);

        if (req.readyState === XMLHttpRequest.DONE) {

            log('CurrencyUpdater() - req.onreadystatechange() - req.status:', req.status)

            if (req.status === 200) {


                // console.log('request:', req);

                try {

                    let responseObj = JSON.parse(req.responseText);

                    let rate = responseObj['Realtime Currency Exchange Rate']['5. Exchange Rate'];

                    if(!isNaN(rate) && rate > 0){

                        rate = parseFloat(rate).toFixed(2);

                        onUpdateSuccessful({id:id, value:rate, date:Date.now()});
                    }                    
                }
                catch(err) {

                    log('CurrencyUpdater() - req.onreadystatechange() - error caught! - reason', err.name)

                    if(onUpdateError){

                        onUpdateError("error getting rate");
                    }
                    else{
                        console.log('CurrencyUpdater - error getting rate', err);
                    }
                }
                
            } else {
                if(onUpdateError){

                    onUpdateError("error getting currency");
                }
                else{
                    console.log('CurrencyUpdater - error getting currency');
                }
            }
        }
    };
}

export default CurrencyUpdater;

/*

sample responseText

 { 'Realtime Currency Exchange Rate':
   { '1. From_Currency Code': 'USD',
     '2. From_Currency Name': 'United States Dollar',
     '3. To_Currency Code': 'ARS',
     '4. To_Currency Name': 'Argentine Peso',
     '5. Exchange Rate': '27.60950000',
     '6. Last Refreshed': '2018-07-18 19:51:28',
     '7. Time Zone': 'UTC' } 
}

*/