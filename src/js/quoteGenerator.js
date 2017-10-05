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

import utils from './utils';
import app from './app';

// loads quotes.txt and gets a daily quote (one line per day)
var quoteGenerator = function(){
    

    var quotes;

    utils.loadFile('assets/quotes.txt').then((txt) => {
        quotes = txt.split('\n');

        if(quotes.length == 0){
            console.log('quoteGenerator - error after loading quotes');
            return;
        }

        var quote = quotes[getIndex()];

        if(!quote || quote == ''){
            console.log('quoteGenerator - error getting quote');
            return;
        }

        app.onQuoteReady.dispatch(quote);
    })
    .catch((reason) => {
        console.log('quoteGenerator - error loading quotes. reason:', reason);
    });

    function getIndex(){

        var date = new Date();
        var timezoneOffset = date.getTimezoneOffset() * 60000;
        var now = date.getTime() - timezoneOffset;
        var day = Math.floor(now / 86400000); // The number of 'local' days since Jan 1, 1970

        return day % quotes.length;
    }
   
}

export default new quoteGenerator();