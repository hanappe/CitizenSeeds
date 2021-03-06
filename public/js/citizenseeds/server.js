/*  
    CitizenSeeds Server Interface
    
    Copyright (C) 2015  Sony Computer Science Laboratory Paris
    Author: Peter Hanappe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

function newXMLHttpRequest()
{
    return new XMLHttpRequest();
}

var Promise = Promise || ES6Promise.Promise;

function Server(root)
{
    var server = this;
    this.root = (root)? root + "/" : "";

    // Adapted from http://www.html5rocks.com/en/tutorials/es6/promises/
    this.request = function(method, url, data, contentType) {
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open(method, server.root + url);
            if (contentType) 
                req.setRequestHeader("Content-Type", contentType);

            req.onload = function() {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
                    resolve(req.response);
                }
                else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(url + ": " + req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            if (data) req.send(data);
            else req.send();
        });
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.get = function(url) {
        return this.request('GET', url);
/*        
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open('GET', server.root + url);

            req.onload = function() {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
                    resolve(req.response);
                }
                else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(url + ": " + req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            req.send();
        });
*/
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.getJSON = function(url) {
        return this.get(url).then(JSON.parse);
    }

    // Upload file 
    this.postFile = function(url, formdata, progressCallback) {
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();

            req.onload = function() {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
            	    if (progressCallback) progressCallback(100);
                    resolve(req.response);
                }
                else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(url + ": " + req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            if (progressCallback) {
            	progressCallback(0);
            }

            if (req.upload && req.upload.addEventListener) {
                req.upload.addEventListener("progress", function(e) {
                    if (progressCallback && e.lengthComputable) {
		        var pc = Math.round(100 * e.loaded / e.total);
		        progressCallback(pc);
                    }}, false);
            }
            
            // Make the request
            req.open('POST', server.root + url);
            req.send(formdata);
        });
    }

    this.postFileJSON = function(url, formdata, progressCallback) {
        return this.postFile(url, formdata, progressCallback).then(JSON.parse);
    }


    // Adapted from http://www.html5rocks.com/en/tutorials/es6/promises/
    this.post = function(url, data, contentType) {
        return this.request('POST', url, data, contentType);
/*
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open('POST', server.root + url);
            if (contentType) 
                req.setRequestHeader("Content-Type", contentType);

            req.onload = function() {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
                    resolve(req.response);
                }
                else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(url + ": " + req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            req.send(data);
        });
*/
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.postJSON = function(url, obj) {
        return this.post(url, JSON.stringify(obj),
                        "application/json;charset=UTF-8").then(JSON.parse);
    }

    // Adapted from http://www.html5rocks.com/en/tutorials/es6/promises/
    this.delete = function(url) {
        return this.request('DELETE', url);
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.deleteJSON = function(url) {
        return this.delete(url).then(JSON.parse);
    }
}
