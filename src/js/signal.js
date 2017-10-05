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

//_____________________________

/**
* author: ivocass
* date created: 2011
* date modified: 20170810
* description: lightweight and awesome signal. ported from AS3.
* version: 0.13
* 
*/
export default function Signal(){
	
	var listeners = [];
	var amount = 0;
	
	var stepping = false;
	
	var hasColdListeners = false;
	
	this.destroy = function(){

		for (var i = 0; i < listeners.length; i++) 
		{
			listeners[i].callbackFunction = null;
		}
		
		listeners = null;
		amount = 0;
	}
	
	this.reset = function(){

		this.destroy();
		
		listeners = [];
		
		stepping = false;
		hasColdListeners = false;
	}
	
	
	
	this.add = function(callback, removeOnFirstCallback = false)
	{
		if (getListenerIndex(callback) > -1)
		{
			throw new Error("Attempt to add a callback twice.");
		}
		
		var listener = new SignalListener(callback);
		listener.removeOnFirstCallback = removeOnFirstCallback;
		
		listeners.push(listener);
		amount++;
	}
	
	
	this.rem = function(callback, safeRemove = false){

		var index = getListenerIndex(callback);
		
		if (index == -1)
		{
			if (safeRemove)
			{
				return;
			}
			else
			{
				throw new Error("Attempt to remove an unregistered callback.");
			}
		}
		
		if (stepping)
		{
			listeners[index].isCold = true;
			listeners[index].callbackFunction = null;
			
			hasColdListeners = true;
		}
		else
		{
			listeners.splice(index, 1);
			amount--;
		}
	}
	
	var getListenerIndex =  function(callback){

		for (var i = 0; i < amount; i++) 
		{
			if (listeners[i].callbackFunction == callback)
			{
				return i;
			}
		}
		
		return -1;
	}
	
	this.dispatch = function(param = null){
		
		if (stepping)
		{
			throw new Error("Attempt to dispatch a signal while stepping.");
		}
		
		stepping = true;
		
		for (var i = 0; i < amount; i++) 
		{
			var listener = listeners[i];
			
			if (listener.isCold) continue;
			
			if (listener.paramsRequired == 0)
			{
				listener.callbackFunction();
			}
			else
			if (listener.paramsRequired == 1)
			{
				listener.callbackFunction(param);
				
			}
			else
			if (listener.paramsRequired == 2)
			{
				listener.callbackFunction(this, param);
			}
			
			
			if (listener.removeOnFirstCallback)
			{
				listener.callbackFunction = null;
				listener.isCold = true;
				hasColdListeners = true;
			}				
		}
		
		
		if (hasColdListeners)
		{
			for (i = amount - 1; i > -1; i--) 
			{
				if (listeners[i].isCold)
				{
					listeners.splice(i, 1);
					amount--;
				}
			}
			
			hasColdListeners = false;
		}
		
		stepping = false;
	}
	
}

var SignalListener = function(callbackFunction){

	this.callbackFunction = callbackFunction;

	this.removeOnFirstCallback = false;

	this.isCold = false;

	this.paramsRequired = callbackFunction.length; // 0:none, 1:param, 2:signal and param

}