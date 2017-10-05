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

/*

about: lightweight logger
author: ivocass

version: 0.11
last updated: 20170908

-description:
stores lines in an array, then dumps to console upon request.
when 'maxEntries' is reached, it starts storing from index 0 again.

-usage:
log('some message');
log(isValid, array.length, moreParams);
then in the console: logger.show()

 */

var Logger = function(){

    var self = this;
    var enabled = true;
    var maxEntries = 2000;

    
    var logHistory = [];
    var logHistoryIndex = 0;
    var entryId = 0;
    

    function init(){

        window.logger = self;

        window.log = logEntry;
    }

    function logEntry(){

        var args = Array.prototype.slice.call(arguments).toString();

        logHistory[logHistoryIndex] = String(entryId) + ') ' + args;

        logHistoryIndex++;
        entryId++;

        if(logHistoryIndex == maxEntries){
            logHistoryIndex = 0;
        }
    }

    this.setMaxEntries = function(value){
        maxEntries = value;
    };

    this.disable = function(){
        enabled = false;
    };


    this.show = function(){

        console.log('---------------- LOG BEGINS ----------------');

        // TODO: if logHistory.length > logHistoryIndex, start from logHistoryIndex + 1, then go from 0 to logHistoryIndex
        for(var i = 0; i < logHistory.length; i++){

            console.log(logHistory[i]);
        }

        console.log('---------------- LOG ENDS ------------------');
    };


    init();
}

export default new Logger();

