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
    var xmlhttp = undefined;
    
    try {
            xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e2) {
            xmlhttp = undefined;
        }
    }
    if ((xmlhttp == undefined) 
        && (typeof XMLHttpRequest != 'undefined')) {
        xmlhttp = new XMLHttpRequest();
    }
    return xmlhttp;
}

function Server()
{
    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.get = function(url) {
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open('GET', url);

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
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            req.send();
        });
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.getJSON = function(url) {
        return this.get(url).then(JSON.parse);
    }

    // Upload file 
    this.postFile = function(url, formdata) {
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open('POST', url);

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
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            req.send(formdata);
        });
    }

    this.postFileJSON = function(url, formdata) {
        return this.postFile(url, formdata).then(JSON.parse);
    }


    // Adapted from http://www.html5rocks.com/en/tutorials/es6/promises/
    this.post = function(url, data, contentType) {
        return new Promise(function(resolve, reject) {
            var req = newXMLHttpRequest();
            req.open('POST', url);
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
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            req.send(data);
        });
    }

    // From http://www.html5rocks.com/en/tutorials/es6/promises/
    this.postJSON = function(url, obj) {
        return this.post(url, JSON.stringify(obj),
                        "application/json;charset=UTF-8").then(JSON.parse);
    }
}
