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

                try {
                    var xmlDoc = utils.stringToXML(req.responseText);                    
                    var rate = xmlDoc.documentElement.getElementsByTagName('Rate')[0].childNodes[0].nodeValue;

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

<query xmlns:yahoo="http://www.yahooapis.com/v1/base.rng" yahoo:count="1" yahoo:created="2017-08-11T18:07:52Z" yahoo:lang="en-US">
    <diagnostics>
        <url execution-start-time="1" execution-stop-time="2" execution-time="1"><![CDATA[http://www.datatables.org/yahoo/finance/yahoo.finance.xchange.xml]]></url>
        <publiclyCallable>true</publiclyCallable>
        <cache execution-start-time="4" execution-stop-time="4" execution-time="0" method="GET" type="MEMCACHED"><![CDATA[e1b28fd8ab8a7bf21a52162f420f1447]]></cache>
        <url execution-start-time="4" execution-stop-time="5" execution-time="1"><![CDATA[http://download.finance.yahoo.com/d/quotes.csv?s=USDARS=X&amp;f=snl1d1t1ab]]></url>
        <query execution-start-time="4" execution-stop-time="5" execution-time="1"><![CDATA[select * from csv where url='http://download.finance.yahoo.com/d/quotes.csv?s=USDARS=X&amp;f=snl1d1t1ab' and columns='Symbol,Name,Rate,Date,Time,Ask,Bid']]></query>
        <javascript execution-start-time="2" execution-stop-time="5" execution-time="2" instructions-used="18668" table-name="yahoo.finance.xchange" />
        <user-time>6</user-time>
        <service-time>2</service-time>
        <build-version>2.0.164</build-version>
    </diagnostics>
    <results>
        <rate id="USDARS">
            <Name>USD/ARS</Name>
            <Rate>17.7150</Rate>
            <Date>8/11/2017</Date>
            <Time>5:50pm</Time>
            <Ask>17.7200</Ask>
            <Bid>17.7150</Bid>
        </rate>
    </results>
</query>
*/