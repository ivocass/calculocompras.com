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

var Config = function (){
    
        this.welcomeMainColor = '#10c77b';
        this.mainColor = '#10c77b';
        this.colorLuminanceChange = 0.06;
        this.colors = [{name:'Emerald', hex:'#10c77b'}, {name:'Green', hex:'#3dba55'}, {name:'Gold', hex:'#cda20a'}, {name:'Rose', hex:'#d24d57'}, {name:'Red', hex:'#db3237'}, {name:'Violet', hex:'#7c54d0'}, {name:'Carbon', hex:'#252525'}, {name:'Material Blue', hex:'#4a84f0'}];
        this.defaultCurrencyId = 'USD';
        this.currencies = [{id:'USD', name:'Dólar', val:17.19, lastUpdate:1503959578067}, {id:'EUR', name:'Euro', val:20.51, lastUpdate:1503959578067}, {id:'GBP', name:'Libra', val:22.24, lastUpdate:1503959578067}, {id:'ARS', name:'Peso', val:1, lastUpdate:1503959578067}];
        this.currencyQueryUrl = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.xchange%20where%20pair%20in%20(%22{1}ARS%22)&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";
        this.currencyUpdateInterval = 15 * 60 * 1000;
        this.gestionCorreo = 120;
        this.defaultPurchase = 100;        
        this.valCompraMax = 200;
        this.updateCurrency = true;
        this.runTests = false;
        this.loggerEnabled = true;
        this.loggerMaxEntries = 2000;
        this.version = 0.113;
    };