/*  
    CitizenSeeds server 

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

var http = require("http");
var url = require("url")
var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var multer = require("multer");
var locale = require("locale");
var supported = [ "en", "fr" ];
var session = require("express-session");
//var captcha = require("easy-captcha");
var randomstring = require("randomstring");
var XRegExp = require("xregexp").XRegExp;
var nodemailer = require("nodemailer");
var passport = require('passport');
//var BasicStrategy = require('passport-http').BasicStrategy;
var LocalStrategy = require('passport-local').Strategy;
var gm = require('gm');
var mkdirp = require('mkdirp');
var exit = require('exit');
var log4js = require('log4js');
var ExifImage = require('exif').ExifImage;
var ejs = require('ejs');
var sanitizeHtml = require('sanitize-html');
var mime = require('mime');
//var sys = require("sys");
var FlowerPower = require('node-flower-power');
var bcrypt = require('bcrypt-nodejs');
var FileStore = require('session-file-store')(session);

var config = { "port": 10201 };

try {
    text = fs.readFileSync("config.json");
    config = JSON.parse(text);        
} catch (e) {
    return;
}


mkdirp("log/", function(err) {
    if (err) {
	console.log("Failed to create the log directory");
        exit(1);
    }
});

log4js.configure({
    appenders: [
	{ type: 'console' },
	{ type: 'file', filename: 'log/all.log', category: 'p2pfoodlab' }
    ]
});

var logger = log4js.getLogger('p2pfoodlab');
logger.setLevel('DEBUG');

var database = require("./db");                                                                                          
database.init();   

/*
 * Mail
 */

var _transporter = undefined;

function sendMailCallback(error, info)
{
    if (error){
        logger.error(error);
    } else {
        logger.debug("Message sent: " + info.response);
    }
}

function sendMail(to, subject, text)
{
    var options = { "host": "localhost", 
		    "port": 25, 
		    "ignoreTLS": true,
		    "debug": true };
    if (!_transporter)
        _transporter = nodemailer.createTransport(options);

    var message = { "from": "P2PFoodLab <contact@p2pfoodlab.net>",
                    "to": to,
                    "subject": subject,
                    "text": text };
    _transporter.sendMail(message, sendMailCallback);
}

/*
 * Utilities
 */      

function pad(num)
{
    var norm = Math.abs(Math.floor(num));
    return (norm < 10 ? "0" : "") + norm;
}

function convertDate(s)
{
    if (s.length > 19)
        return new Date(s);

    var now = new Date();
    var tzo = -now.getTimezoneOffset();
    var dif = tzo >= 0 ? "+" : "-";
    var tz = dif + pad(tzo / 60) + ":" + pad(tzo % 60);

    if (s.length > 10)
        return new Date(s + tz);
    else return new Date(s + " 00:00:00" + tz);
}

function convertExifDate(d)
{
    var Y = parseInt(d.substr(0, 4));
    var M = parseInt(d.substr(5, 2)) - 1;
    var D = parseInt(d.substr(8, 2));
    var h = parseInt(d.substr(11, 2));
    var m = parseInt(d.substr(14, 2));
    var s = parseInt(d.substr(17, 2));
    return new Date(Y, M, D, h, m, s);
}

function sendJson(res, m)
{
    logger.debug("send: " + JSON.stringify(m));
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(m));
    return false;
}

function sendError(res, m, line, fun)
{
    m.error = true;
    m.success = false;
    logger.error("sendError: " + JSON.stringify(m) + ", line=" + line + ", function=" + fun);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(m));
    return false;
}

Object.defineProperty(global, '__stack', {
    get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
    get: function() {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
    get: function() {
        return __stack[1].getFunctionName();
    }
});

/*
 * Observers
 */

function sendObservers(req, res)
{
    logger.debug("Request: sendObservers");

    var experiment = (req.query.experiment)? req.query.experiment : undefined;
    var locationId = (req.query.location)? req.query.location : undefined;
    var plantId = (req.query.plant)? req.query.plant : undefined;
    var accountId = (req.query.account)? req.query.account : undefined;

    var items = [];
    var observers = database.getObservers();
    
    for (var i = 0; i < observers.length; i++) {
        var obs = observers[i];
        if (experiment && obs.experiment != experiment) continue;
        if (plantId && obs.plant != plantId) continue; 
        if (locationId && obs.location != locationId) continue;
        if (accountId && obs.account != accountId) continue;

        var location = database.getLocation(obs.location);
        var plant = database.getPlant(obs.plant);
        //var account = database.getAccount(obs.account);

        //logger.debug("Request: getting profile for " + obs.id);

        var profile = database.getProfile(obs.account);
        if (!profile) profile = {};

        var copy = { "id": obs.id,
                     "date": obs.date,
                     "locationId": location.id,
                     "locationName": location.name,
                     "locationCity": location.city,
                     "locationCountry": location.country,
                     "deviceId": location.device,
                     "plantId": plant.id,
                     "plantFamily": plant.family,
                     "plantVariety": plant.variety,
                     "accountId": location.account,
                     "blog": profile.blog,
                     "vlog": profile.vlog,
                     "experimentId": obs.experiment };

        items.push(copy);
    }

    if (req.query.sort && req.query.sort == "plant")
        items.sort(function(a,b) { return a.plant - b.plant; });
    if (req.query.sort && req.query.sort == "location")
        items.sort(function(a,b) { return a.locationName.localeCompare(b.locationName); });
    if (req.query.sort && req.query.sort == "account")
        items.sort(function(a,b) { return a.accountId.localeCompare(b.accountId); });

    //logger.debug("Observers: ", JSON.stringify(items));

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(items));
}

function createObserver(req, res)
{
    logger.debug("createObserver ", JSON.stringify(req.user));

    if (!req.body.experimentId) {
	sendError(res, { "success": false, 
			 "message": "No experiment ID" },
                  __line, __function);    
        return;
    }
    var experiment = database.getExperiment(req.body.experimentId);
    if (!experiment) {
	sendError(res, { "success": false, 
			 "message": "Bad experiment id" },
                  __line, __function);
	return;
    }    

    if (!req.body.plantId) {
	sendError(res, { "success": false, 
			 "message": "No plant ID" },
                  __line, __function);    
        return;
    }
    var plant = database.getPlant(req.body.plantId);
    if (!plant) {
	sendError(res, { "success": false, 
			 "message": "Bad plant id" },
                  __line, __function);
	return;
    }    
    var account = req.user;
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" },
                  __line, __function);
	return;
    }    

    var location = undefined;
    if (req.body.locationId) {
        location = database.getLocation(req.body.locationId);
        if (!location) {
	    sendError(res, { "success": false, 
			     "message": "Bad location id" },
                      __line, __function);
	    return;
        }
    } else if (req.body.locationName) {
        if (!validLocationName(req.body.locationName)) {
	    sendError(res, { "success": false, 
			     "message": "Invalid name (we think...)" },
                      __line, __function);    
            return;
        }
        location = database.insertLocation({ "account": account.id, "name": req.body.locationName });
    } else {
        var locations = database.selectLocations({ "account": account.id });
        /*if (locations.length == 0) {
          location = database.insertLocation({ "account": account.id, "name": "Ma parcelle" });
          } else if (locations.length >= 1) {*/
        logger.debug("createObserver: locations: " + JSON.stringify(locations));
	sendError(res, { "success": false, 
                         "type":  "select",
                         "select":  locations,
			 "message": "Please select or create a location" },
                  __line, __function);
        return;
        //}
    }
    
    var observers = database.selectObservers({ "account": account.id,
                                               "location": location.id,
                                               "experiment": experiment.id,
                                               "plant": plant.id });
    if (observers.length != 0) {
	sendError(res, { "success": false, 
			 "message": "Vous avez déjà une ligne "
                         + "d'observations pour cette plante." },
                  __line, __function);
        return;
    }
    
    var observer = database.insertObserver({ 
	"experiment": experiment.id, 
	"plant": plant.id,
	"location": location.id, 
	"account": account.id 
    });

    var r = { "id": observer.id ,
              "locationId": location.id,
              "locationName": location.name,
              "plantId": plant.id,
              "plantFamily": plant.family,
              "plantVariety": plant.variety,
              "accountId": account.id,
              "experimentId": experiment.id };
    
    sendJson(res, r);
}

/*
 * Experiment
 */      

function sendExperiment(req, res)
{
    var id = req.params.id;
    var exp = database.getExperiment(id);

    var e = { "id": exp.id,
              "name": exp.name,
              "prettyname": exp.prettyname,
              "year": exp.year,
              "startDate": exp.startDate };

    e.plants = [];
    for (var i = 0; i < exp.plants.length; i++) {
        var plant = database.getPlant(exp.plants[i].id);
        var p = { "id": plant.id,
                  "family": plant.family,
                  "variety": plant.variety,
                  "note": exp.plants[i].note };
        e.plants.push(p);
    }

    logger.debug("sendExperiment: Sending: " + JSON.stringify(e));
    
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(e));
}

function Template(name)
{
    this.name = name;

    this.replaceVariable = function(content, key, value) {
        return content.replace(new RegExp("\\$\\{" + key + "\\}", 'g'), value);
    }

    this.replaceVariables = function(content, vars) {
        for (var key in vars) 
            content = this.replaceVariable(content, key, vars[key]);
        return content;
    }
    
    this.generate = function(res, vars) {
        var template = this;
        fs.readFile("templates/" + this.name + ".html", "utf-8", function (err, content) {
	    if (err) 
	        sendError(res, { "message": "Failed to read template '" + name + "'" },
                          __line, __function);
	    else {
                content = template.replaceVariables(content, vars);
	        res.writeHead(200, {"Content-Type": "text/html"});
	        res.end(content); 
	    }
        });

    }
}


function sendExperimentPage(req, res)
{
    logger.debug("Request: sendExperimentPage");
    logger.debug("ID: " + req.params.id);
    logger.debug("Account: " + JSON.stringify(req.user));
    logger.debug("StartAt: " + req.query.startat);

    var id = req.params.id;
    var experiment = database.getExperiment(id);
    if (!experiment) {
	sendError(res, { "message": "Bad experiment ID" },
                  __line, __function);
	return;
    }
    //var startAt = "2015-05-02";
    //var startAt = "today";
    var startAt = "beginning";
    if (validDate(req.query.startat)) {
	startAt = req.query.startat;
    }
    var account = null;
    if (req.user && req.user.id) {
        var a = database.getAccount(req.user.id);
        if (a) account = { "id": a.id };
    }
    res.render('experiment', { "config": config,
                               "experiment": experiment,
                               "startAt": startAt,
                               "account": account,
                               "r": config.baseUrl + "/experiments/" + experiment.id  + ".html" });
    
    //var vars = { "experimentId": experiment.id, 
    //	         "experimentName": experiment.prettyname,
    //	         "baseUrl": config.baseUrl };    
    //  new Template("experiment").generate(res, vars);
}

function sendMobileApp(req, res)
{
    logger.debug("Request: sendMobileApp");
    logger.debug("ID: " + req.params.id);

    var id = req.params.id;
    var experiment = database.getExperiment(id);
    if (!experiment) {
	sendError(res, { "message": "Bad experiment ID" },
                  __line, __function);
	return;
    }
    res.render('mobile', { "config": config, "experiment": experiment });
    //new Template("mobile").generate(res, vars);
}


/*
 * Jpeg images
 */      

function saveJpegLarge(path, basedir, file,
                       errCallback, doneCallback)
{
    var orig = basedir + "large/" + file.id + ".jpg";

    mkdirp(basedir + "large/", function(err) { 
	if (err) {
            logger.error(err);
	    errCallback(new Error("Failed to create the directories", __function, __line));
	} else {
	    gm(path).resize(1200, 800).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    errCallback(new Error("Failed to save large image", __function, __line));

		} else {
                    doneCallback(file);
                }
	    });
        }
    });
}

function saveJpegSmall(path, basedir, file,
                       errCallback, doneCallback)
{
    var orig = basedir + "small/" + file.id + ".jpg";

    mkdirp(basedir + "small/", function(err) { 
	if (err) {
            logger.error(err);
	    errCallback(new Error("Failed to create the directories", __function, __line));
	} else  {
	    gm(path).resize(640, 480).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    errCallback(new Error("Failed to save small image", __function, __line));
		} else {
		    saveJpegLarge(path, basedir, file, errCallback, doneCallback);
                }
	    });
        }
    });
}

function saveJpegThumbnail(path, basedir, file,
                           errCallback, doneCallback)
{
    var orig = basedir + "thumbnail/" + file.id + ".jpg";

    mkdirp(basedir + "thumbnail/", function(err) { 
	if (err) {
            logger.error(err);
	    errCallback(new Error("Failed to create the directories", __function, __line));
	} else  {
	    gm(path).resize(150, 100).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    errCallback(new Error("Failed to save thumbnail image", __function, __line));
		} else {
		    saveJpegSmall(path, basedir, file, errCallback, doneCallback);
                }
	    });
        }
    });
}

function saveJpegOrig(path, basedir, file,
                      errCallback, doneCallback)
{
    var orig = basedir + "orig/" + file.id + ".jpg";

    mkdirp(basedir + "orig/", function(err) { 
	if (err) {
            logger.error(err);
	    errCallback(new Error("Failed to create the directories", __function, __line));
	} else  {
	    gm(path).write(orig, function(err) {
		if (err) {
                    logger.error(err);
		    errCallback(new Error("Failed to save original image", __function, __line));
		} else {
		    saveJpegThumbnail(path, basedir, file, errCallback, doneCallback);
                }
	    });
        }
    });
}

function getJpegExif(path, file, errCallback, doneCallback)
{
    try {
        new ExifImage({ image : path }, function (error, exifData) {
            if (error)
                errCallback(error);
            else {
                doneCallback(file, exifData);
            }
        });
    } catch (error) {
        errCallback(error);
    }
}

function convertJpeg(path, basedir, file, 
                     errCallback, doneCallback)
{
    saveJpegOrig(path, basedir, file, errCallback, doneCallback);
}

/*
 * Observations
 */      

function observationPath(obs, size)
{
    return ("observations/"
            + obs.location + "/"
            + obs.plant + "/"
            + size + "/"
            + obs.id + ".jpg");
}

function formatObservation(obs)
{
    var loca = database.getLocation(obs.location);
    var pl = database.getPlant(obs.plant);

    var copy = { "id": obs.id,
                 "date": obs.date,
                 "dateUpload": obs.dateUpload,
                 "dateCreated": obs.dateCreated,
                 "experimentId": obs.experiment,
                 "comment": obs.comment,
                 "locationId": loca.id,
                 "locationName": loca.name,
                 "plantId": pl.id,
                 "plantFamily": pl.family,
                 "plantVariety": pl.variety,
                 "accountId": loca.account };
    
    copy.orig = observationPath(obs, "orig");
    copy.small = observationPath(obs, "small");
    copy.thumbnail = observationPath(obs, "thumbnail");

    return copy;
}

function sendObservations(req, res)
{
    logger.debug("Request: sendObservations");
    logger.debug("Account: " + JSON.stringify(req.user));

    var fromDate = (req.query.from)? convertDate(req.query.from) : undefined;
    var toDate = (req.query.to)? convertDate(req.query.to) : undefined;
    var days = (req.query.days)? req.query.days : undefined;
    var location = (req.query.location)? req.query.location : undefined;
    var plant = (req.query.plant)? req.query.plant : undefined;
    var experiment = (req.query.experiment)? req.query.experiment : undefined;

    var items = [];
    var observations = database.getObservations();

    if (days) {
        toDate = new Date();
        fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    }
    
    for (var i = 0; i < observations.length; i++) {
        var obs = observations[i];
        if (obs.deleted) continue;
        if (plant && obs.plant != plant) continue;
        if (location && obs.location != location) continue;
        if (experiment && obs.experiment != experiment) continue;

        var date = convertDate(obs.date);
        if (fromDate && date.getTime() < fromDate.getTime()) continue;
        if (toDate && date.getTime() > toDate.getTime()) continue;
        
        items.push(formatObservation(obs));
    }

    if (req.query.sort) {
        if (req.query.sort == "plant")
            items.sort(function(a,b) { return a.plant - b.plant; });
        else if (req.query.sort == "location")
            items.sort(function(a,b) { return a.locationName.localeCompare(b.locationName); });
        else if (req.query.sort == "date")
            items.sort(function(a,b) { return a.date.localeCompare(b.date); });
        else if (req.query.sort == "upload")
            items.sort(function(a,b) { return a.dateUpload.localeCompare(b.dateUpload); });
    }

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(items));
}

function validSize(s)
{
    return (s == "small" || s == "orig" || s == "thumbnail");
}

function sendObservationImage(req, res)
{
    var id = req.params.id;

    if (req.query.size && !validSize(req.query.size)) {
	res.status(400).send("Bad Request");
        return;
    }
    var size = (req.query.size)? req.query.size : "small";
    var obs = getObservation(loadData(), id);
    if (!obs) {
	res.status(400).send("Bad Request");
        return;
    }
    var img = fs.readFileSync(obs.path);
    res.writeHead(200, {"Content-Type": "image/jpeg" });
    res.end(img, "binary"); 
}

function sendObservationMeta(req, res)
{
    var id = req.params.id;
    var obs = database.getObservation(id);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(formatObservation(obs)));
}

function deleteObservation(req, res)
{
    var id = req.params.id;
    var account = req.user;

    logger.debug("deleteObservation: " + id);
    
    var observation = database.getObservation(id);
    if (!observation) {
	sendError(res, { "message": "Bad ID" }, __line, __function);
        return;
    }
    var location = database.getLocation(observation.location);
    if (!location) {
	sendError(res, { "message": "Internal server error (couldn't find associated location)" },
                  __line, __function);
        return;
    }
    if (location.account != account.id) {
	sendError(res, { "message": "This observation does not seem to belong to you..." },
                  __line, __function);
        return;
    }
    observation.deleted = true;
    database.updateObservation(observation);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(formatObservation(observation)));    
}

function createObservation(req, res)
{
    logger.debug("File: " + JSON.stringify(req.file));
    //logger.debug("Body: " + JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    if (!req.file) {
	sendError(res, { "success": false, 
			 "message": "No photo" },
                  __line, __function);
	return;
    }

    if (!req.body.locationId) {
	sendError(res, { "success": false, 
			 "message": "No location" },
                  __line, __function);    
        return;
    }

    if (!req.body.experimentId) {
	sendError(res, { "success": false, 
			 "message": "No experiment ID" },
                  __line, __function);    
        return;
    }

    logger.debug("Date ", req.body.date);
    if (!validISODate(req.body.date)) {
	sendError(res, { "success": false, 
			 "message": "No date" },
                  __line, __function);    
        return;
    }
    
    var account = req.user;

    var plant = database.getPlant(req.body.plantId);
    if (!plant) {
	sendError(res, { "success": false, 
			 "message": "Bad plant id" },
                  __line, __function);
	return;
    }    

    var comment = req.body.comment;
    /* FIXME: valid comment... */

    var location = database.getLocation(req.body.locationId);
    if (!location) {
	sendError(res, { "success": false, 
			 "message": "Bad location" },
                  __line, __function);    
        return;
    }    
    if (account.id != location.account) {
	sendError(res, { "success": false, 
			 "message": "Not your location" },
                  __line, __function);    
        return;
    }

    var experiment = database.getExperiment(req.body.experimentId);
    if (!experiment) {
	sendError(res, { "success": false, 
			 "message": "Bad experiment" },
                  __line, __function);    
        return;
    }    

    var observation;
    if (req.body.id) {
	observation = database.getObservation(req.body.id);
	if (!observation) {
	    sendError(res, { "success": false, 
			     "message": "Bad observation id" },
                      __line, __function);    
            return;
	}
	if (observation.location != location.id) {
	    sendError(res, { "success": false, 
			     "message": "Observation doesn't match location" },
                      __line, __function);    
            return;
	}
	if (observation.experiment != experiment.id) {
	    sendError(res, { "success": false, 
			     "message": "Observation doesn't match experiment ID" },
                      __line, __function);    
            return;
	}
    } else {
        observation = database.insertObservation({ 
	    "location": location.id, 
	    "experiment": experiment.id, 
	    "date": req.body.date,
            "dateUpload": new Date().toISOString(),
            "dateUser": req.body.date,
            "comment": comment,
	    "plant": plant.id
	});
    }

    var p = req.file.path;
    var basedir = "public/observations/" + location.id + "/" + plant.id + "/";

    getJpegExif(p, observation,
                function(err) {
                    logger.error(err);
                    convertJpeg(p, basedir, observation,
                                function(err) {
                                    logger.error(err);
	                            sendError(res, { "message": "Failed to save the image" }, __line, __function);
                                },
                                function(r) {
                                    sendJson(res, formatObservation(observation));
                                });
                },
                function(obs, exifData) {
                    fixObservationDate(observation, exifData);
                    convertJpeg(p, basedir, observation,
                                function(err) {
                                    logger.error(err);
	                            sendError(res, { "message": "Failed to save the image" }, __line, __function);
                                },
                                function(r) {
                                    sendJson(res, formatObservation(observation));
                                });
                });
}

function fixObservationDate(observation, exifData)
{
    logger.debug(JSON.stringify(exifData));
    if (exifData && exifData.exif && exifData.exif.CreateDate) {
        var d = convertExifDate(exifData.exif.CreateDate);
        observation.dateCreated = d.toISOString();
        var d2 = new Date(observation.date);
        // If the date of the exif photo capture is less
        // than 7 days different then the date of the
        // indicated by the participant, use the exif date
        // instead.
        var diff = (d2.getTime() - d.getTime()) / 24 / 60 / 60 / 1000;
        var exp = database.getExperiment(observation.experiment);
        var start = new Date(exp.startDate.year, exp.startDate.month-1, exp.startDate.day);
        var now = new Date();

        var t = "Date EXIF: " + d + "\n";
        t += "Date observation (user): " + d2 + "\n";
        t += "Date now: " + now + "\n";
        t += "Date start exp.: " + start + "\n";
        t += "Diff (days): " + diff + "\n";
        logger.debug(t);
        sendMail("peter@hanappe.com", "New photo upload", t);

        logger.debug("Math.abs(diff): " + (Math.abs(diff)));
        logger.debug("d.getTime() : " + (d.getTime()));
        logger.debug("now.getTime() : " + (now.getTime()));
        logger.debug("start.getTime() : " + (start.getTime()));
        logger.debug("Math.abs(diff) < 15: " + (Math.abs(diff) < 15));
        logger.debug("d.getTime() < now.getTime() : " + (d.getTime() < now.getTime()));
        logger.debug("d.getTime() >= start.getTime() : " + (d.getTime() >= start.getTime()));

        if (Math.abs(diff) < 15
            && (d.getTime() < now.getTime())
            && (d.getTime() >= start.getTime())) {
            observation.date = observation.dateCreated;
            logger.debug("Changing observation date to EXIF data");
        } else {
            logger.debug("Keeping user's observation date");
        }
        database.updateObservation(observation);
    }
}

/*
 * SensorData
 */

function sendSensorData(req, res)
{
    logger.debug("Request: sendSensorData");
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(database.getSensorData()));
}

/*
 * Datastreams
 */      

function sendDatastream(req, res)
{
    logger.debug("Request: sendDatastream");
    logger.debug("Account: " + req.user);

    var id = req.params.id;
    var datastream = database.getDatastream(id);
    if (!datastream) {
	sendError(res, { "message": "Bad datastream ID" },
                  __line, __function);
	return;
    }
    
    var copy = { "id": datastream.id,
                 "name": datastream.name,
                 "property": datastream.property,
                 "unit": datastream.unit,
                 "description": datastream.description };

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(copy));
}

function datastreamPath(id)
{
    return ("db/datastreams/" + id + ".json");
}

function sendDatapoints(req, res)
{
    var id = req.params.id;

    logger.debug("Request: sendDatapoints id=" + id);

    var datastream = database.getDatastream(id);
    if (!datastream) {
	sendError(res, { "message": "Bad datastream ID" },
                  __line, __function);
	return;
    }

    var fromDate = (req.query.from)? convertDate(req.query.from) : undefined;
    var toDate = (req.query.to)? convertDate(req.query.to) : undefined;

    var data = fs.readFile(datastreamPath(id), function (err, data) {
	if (err) sendError(res, { "message": "Failed to read the data" },
                           __line, __function);
	else { 
	    var a = JSON.parse(data);
	    var r = [];
	    for (var i = 0; i < a.length; i++) {
		var d = new Date(a[i].date);
		if (fromDate && d.getTime() < fromDate.getTime()) 
		    continue;
		if (toDate && toDate.getTime() < d.getTime()) 
		    continue;
		r.push(a[i]);
	    }
	    //r.sort(function(a, b) { return a.date.localeCompare(b.date); }); // FIXME
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(r));
	}
    });
}

/*
 * Groups
 */      

function sendGroups(req, res)
{
    logger.debug("Request: sendGroups");
    var list = [];
    var groups = database.getGroups();
    for (var i = 0; i < groups.length; i++) {
        list.push({ "id": groups[i].id,
                    "name": groups[i].name,
                    "address": groups[i].address });
    }
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(list));
}

/*
 * Locations
 */      

function sendLocations(req, res)
{
    logger.debug("Request: sendLocations");
    var list = [];
    var account = (req.query.account)? req.query.account : undefined;
    var locations = database.getLocations();
    for (var i = 0; i < locations.length; i++) {
        if (account && locations[i].account != account)
            continue;
        
        list.push({ "id": locations[i].id,
                    "name": locations[i].name,
                    "account": locations[i].account,
                    "device": locations[i].device });
    }
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(list));
}

function createLocation(req, res)
{
    logger.debug("createLocation ", JSON.stringify(req.user));

    var name = "Ma parcelle";
    if (req.body.name) {
        if (!validLocationName(req.body.name)) {
	    sendError(res, { "success": false, 
			     "message": "Bad location name" },
                      __line, __function);    
            return;
        }
        name = req.body.name;
    }

    var account = req.user;
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" },
                  __line, __function);
	return;
    }    

    var location = database.insertLocation({ 
	"name": name, 
	"account": account.id
    });
    
    sendJson(res, location);
}

function updateLocation(req, res)
{
    logger.debug("updateLocation ", JSON.stringify(req.body));

    var id = req.params.id;
    var location = database.getLocation(id);
    var account = req.user;
    var field = req.body.field;
    var value = req.body.value;
    
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" },
                  __line, __function);
	return;
    }    
    if (!location) {
	sendError(res, { "success": false, 
			 "message": "Bad location ID" },
                  __line, __function);
	return;
    }    
    if (location.account != account.id) {
	sendError(res, { "success": false, 
			 "message": "Unauthorized" },
                  __line, __function);
	return;
    }        
    if (!field) {
	sendError(res, { "success": false, 
			 "message": "No field" },
                  __line, __function);    
        return;
    }

    if (field == "name") {
        if (!validLocationName(value)) {
	    sendError(res, { "success": false, 
			     "message": "Invalid name (we think...)" },
                      __line, __function);    
            return;
        }
        location.name = value;

    } else if (field == "city") {
        if (!validTown(value)) {
	    sendError(res, { "success": false, 
			     "message": "Invalid name for a city (we think...)" },
                      __line, __function);    
            return;
        }
        location.city = value;

    } else if (field == "country") {
        if (!validCountry(value)) {
	    sendError(res, { "success": false, 
			     "message": "Invalid name for a country (we think...)" },
                      __line, __function);    
            return;
        }
        location.country = value;

    } else {
        sendError(res, { "success": false, 
		         "message": "Unknown field: " + field },
                  __line, __function);
        return;
    }
    
    database.updateLocation(location);
    sendJson(res, { "success": true });
}

/*
 * Plants
 */      

function sendPlants(req, res)
{
    logger.debug("Request: sendPlants");
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(database.getPlants()));
}


/*
 * Index / with locale
 */      
function sendIndex(req, res)
{
    logger.debug("Request: sendIndex");
    res.writeHead(302, { 'Location': config.baseUrl + '/experiments/6.html' });
/*    if (req.locale == "fr") {
        res.writeHead(302, { 'Location': 'https://p2pfoodlab.net/CitizenSeedsInfo.fr.html' });
    } else {
        res.writeHead(302, { 'Location': 'https://p2pfoodlab.net/CitizenSeedsInfo.fr.html' });
    }*/
    res.end();
}

function validUsername(s)
{
    if (!s || s.length < 3 || s.length > 24)
        return false;
    var unicodeWord = XRegExp("^\\p{L}[0-9\\p{L}]{2,23}$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validEmail(s)
{
    if (!s || s.length < 6 || s.length > 100)
        return false;
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    logger.debug(s);
    return re.test(s);
}

function validFirstname(s)
{
    if (s.length > 100)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}\\s-]*$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validLastname(s)
{
    if (s.length > 100)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}\\s-]*$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validAddress(s)
{
    if (s.length > 100)
        return false;
    var unicodeWord = XRegExp("^[0-9\\p{L}\\s,-]+$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validZipcode(s)
{
    if (s.length > 20)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}0-9\\s]*$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validTown(s)
{
    if (s.length > 50)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}\\s-]*$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validCountry(s)
{
    if (s.length > 50)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}\\s-]*$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validDelivery(s)
{
    if (!s || (s != "-" 
	       && s != "cristinogarcia" 
	       && s != "cristinogarcia2" 
	       && s != "sony" 
	       && s != "lapaillasse" 
	       && s != "lasemeuse" 
	       && s != "planetelilas" 
	       && s != "okno"))
        return false;
    return true;
}

function validGroupName(s)
{
    if (s.length > 100)
        return false;
    var unicodeWord = XRegExp("^[\\p{L}\\s-]+$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validLocationName(s)
{
    if (s.length > 100)
        return false;
    var unicodeWord = XRegExp("^[0-9\\p{L}\\s,-]+$");
    if (!unicodeWord.test(s))
        return false;
    return true;
}

function validParticipation(s)
{
    if (!s || (s != "individual" && s != "join" && s != "create"))
        return false;
    return true;
}

function validISODate(s)
{
    var dateReg = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/;
    if (!s || !s.match(dateReg))
        return false;
    return true;
}

function validDate(s)
{
    var dateReg = /^\d{4}-\d{2}-\d{2}$/;
    if (!s || !s.match(dateReg))
        return false;
    return true;
}

function validURL(s)
{
    return true; /// FIXME!
}

function createAccount(req, res)
{
    logger.debug("Request: createAccount: body=" + JSON.stringify(req.body));

    var experiment = req.body.experiment;
    var id = req.body.id;
    var email = req.body.email;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var address1 = req.body.address1;
    var address2 = req.body.address2;
    var zipcode = req.body.zipcode;
    var town = req.body.town;
    var country = req.body.country;
    var flowerpower = req.body.flowerpower;
    var btdevice = req.body.btdevice;
    var btinfo = req.body.btinfo;
    var account = database.getAccount(id);
    var group = undefined;

    logger.debug("createAccount @ 1");

    if (account)
        return sendError(res, { "success": false,
                                "field": "username",
                                "message": "Le pseudonyme que vous avez choisi est déjà utilisé. Merci d'en choisir un autre." },
                         __line, __function); 

    logger.debug("createAccount @ 2");

    /*    if (!req.session.captcha.valid) 
          return sendError(res, { "success": false,
          "field": "captcha",
          "message": "Captcha invalide. Veuillez vérifier votre saisie." },
          __line, __function); 
    */
    
    logger.debug("createAccount @ 3");

    if (!validUsername(id))
        return sendError(res, { "success": false,
                                "field": "username",
                                "message": "Le pseudonyme que vous avez choisi n'est pas valide. Merci d'en choisir un autre." },
                         __line, __function); 

    logger.debug("createAccount @ 4");

    if (!validEmail(email))
        return sendError(res, { "success": false,
                                "field": "email",
                                "message": "Veuillez vérifier votre adresse email. Elle ne semble pas valide." },
                         __line, __function); 

    logger.debug("createAccount @ 5");

    if (!validFirstname(firstname))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre prénom contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                         __line, __function); 

    logger.debug("createAccount @ 6");

    if (!validLastname(lastname))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre nom contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                         __line, __function); 

    logger.debug("createAccount @ 7");

    if (!validAddress(address1) || (address2 != "" && !validAddress(address2)))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre adresss contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                         __line, __function); 

    if (!validZipcode(zipcode))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre code postal contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                         __line, __function); 

    logger.debug("createAccount @ 8");

    if (!validTown(town))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre nom de ville contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                         __line, __function); 

    logger.debug("createAccount @ 9");

    if (!validCountry(country))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Veuillez vérifier le nom du pays. Merci !" },
                         __line, __function); 

    logger.debug("createAccount @ 10");

    if (flowerpower != "yes" && flowerpower != "no")
        return sendError(res, { "success": false,
                                "field": "flowerpower",
                                "message": "Valeur invalide pour le champs 'flowerpower'." },
                         __line, __function); 

    logger.debug("createAccount @ 11");

    account = { "id": id,
                "email": email,
                "firstname": firstname,
                "lastname": lastname,
                "address1": address1,
                "address2": address2,
                "zipcode": zipcode,
                "town": town,
                "country": country,
                "flowerpower": flowerpower,
                "password": randomstring.generate(8),
                "emailValidationToken": randomstring.generate(16),
                "experiment": experiment
              };

    logger.debug("createAccount @ 17");

    account = database.insertAccount(account);
    
    logger.debug("createAccount @ 18");

    var r = { "success": true, 
	      "id": id, "email": email,
              "firstname": firstname, "lastname": lastname, 
	      "address1": address1, "address2": address2,
              "zipcode": zipcode, "town": town, "country": country };

    logger.debug("createAccount @ 1");

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(r));

    logger.debug("createAccount @ 19");

    var url = "https://p2pfoodlab.net/CitizenSeeds/people/" + id + ".html?op=validate&token=" + account.emailValidationToken;
    
    sendMail(email,
             "[P2P Food Lab] Bienvenu !",
             "Bonjour " + id + ",\n\n"
             + "Nous sommes heureux que vous participez à l'expérience CitizenSeeds '16 !\n\n"
             + "Pour valider votre compte, nous aimerions vérifier votre email.\n"
             + "Merci de suivre le lien suivant :\n" + url + "\n\n"
             + "Nous vous rappelons vos identifients : \n"
             + "  Pseudonyme : " + id + "\n"
             + "  Mot de passe : " + account.password + "\n\n"
             + "Envoyez vos suggestions et questions à contact@p2pfoodlab.net.\n\n"
             + "À très bientôt !\n");

    logger.debug("createAccount @ 20");

    sendMail("peter@hanappe.com",
             "New registration for CitizenSeeds: " + id,
             JSON.stringify({ "account": account }, undefined, 2));
    
    logger.debug("Request: createAccount: success: " + JSON.stringify(r));
}

function validateAccount(req, res)
{
    var id = req.params.id;
    var account = database.getAccount(id);
    
    if (!req.query.token)
        return "Problème : la clé de validation est manquante ?! Si le problème persiste, écrivez-nous au contact@p2pfoodlab.net.";
    if (req.query.token == account.emailValidationToken) {
        if (account.emailValidated) {
            return "C'est bon, votre adresse email a déjà été validée.";
        } else {
            account.emailValidated = true;
            database.updateAccount(account);
            return "Merci ! Votre adresse email a été validée.";
        }
    }
    return "Problème : la validation de votre adresse email a échouée. Si cela n'aurait pas du arriver, écrivez-nous au contact@p2pfoodlab.net.";
}

function sendHomepage(req, res)
{
    logger.debug("sendHomepage: Visitor account: " + JSON.stringify(req.user));

    var id = req.params.id;
    logger.debug("sendHomepage id=", JSON.stringify(id));
    var account = database.getAccount(id);
    if (!account) {
        sendError(res, { "success": false, "message": "Bad ID: " + req.params.id });
        return;
    }
    if (req.query.op && req.query.op == "validate") {
        var message = validateAccount(req, res);
        res.writeHead(200, {"Content-Type": "text/plain; charset=utf-8"});
        res.end(message);
        return;
    }
    var profile = database.getProfile(id);
    logger.debug("sendHomepage ", JSON.stringify(profile));
    if (!profile) profile = {};
    logger.debug("rendering homepage");
    res.render('homepage', { "config": config,
                             "account": account,
                             "profile": profile,
                             "r": config.baseUrl + "/people/" + account.id  + ".html"});
}

function sendProfile(req, res)
{
    logger.debug("sendProfile: Visitor account: " + JSON.stringify(req.user));

    var id = req.params.id;
    var account = req.user;
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" },
                  __line, __function);
	return;
    }    
    if (id != account.id) {
	sendError(res, { "success": false, 
			 "message": "Unauthorized" },
                  __line, __function);
	return;
    }    
    var profile = database.getProfile(id);
    if (!profile) profile = {};
    var locations = database.selectLocations({ "account": id });
    var files = database.selectFiles({ "account": id });
    var devices = database.selectDevices({"type": "flowerpower", "account": account.id})

    res.render('profile', { "config": config,
                            "account": account,
                            "profile": profile,
                            "locations": locations,
                            "files": files,
                            "devices": devices,
                            "r": config.baseUrl + "/people/" + account.id  + "/profile.html"
                          });
}

function updateProfile(req, res)
{
    logger.debug("updateProfile ", JSON.stringify(req.body));

    var id = req.params.id;
    var account = req.user;
    var field = req.body.field;
    var value = req.body.value;
    
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" },
                  __line, __function);
	return;
    }    
    if (id != account.id) {
	sendError(res, { "success": false, 
			 "message": "Unauthorized" },
                  __line, __function);
	return;
    }        
    if (!field) {
	sendError(res, { "success": false, 
			 "message": "No field" },
                  __line, __function);    
        return;
    }

    var insert = false;
    var profile = database.getProfile(id);
    if (!profile) {
        profile = database.insertProfile({ "id": id });
    }

    if (field == "description") {
        if (value)
            profile.description = sanitizeHtml(value, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]) });
        else profile.description = "";
        
    } else if (field == "blog") {
        profile.blog = value;
    } else if (field == "vlog") {
        profile.vlog = value;
    } else {
        sendError(res, { "success": false, 
		         "message": "Unknown field: " + field },
                  __line, __function);
        return;
    }
    
    database.updateProfile(profile);
    sendJson(res, { "success": true });
}

function sendAccountInfo(req, res)
{
    logger.debug(JSON.stringify(req.session));

    var id = req.params.id;
    var account = database.getAccount(id);
    var message;
    
    if (!account) {
        sendJson(res, { "id": null });
	return;
    }
    
    var copy = { "id": account.id };
    sendJson(res, copy);
}

function sendAccountDevices(req, res)
{
    logger.debug("sendAccountDevices: Account: " + JSON.stringify(req.user));

    if (!req.user || !req.user.id)
        return sendError(res, { "success": false, "message": "Not logged in." });
        
    if (req.user.id != req.params.id)
        return sendError(res, { "success": false, "message": "Unauthorized." });

    var devices = database.selectDevices({"type": "flowerpower", "account": req.user.id});
    var list = [];
    for (var i = 0; i < devices.length; i++) {
        list.push({"id": devices[i].id,
                   "account": "peter",
                   "name": devices[i].name,
                   "type": "flowerpower",
                   "datastreams": devices[i].datastreams,
                   "flowerpower": {
                       "serial": devices[i].flowerpower.serial,
                       "location": devices[i].flowerpower.location,
                       "plant_nickname": devices[i].flowerpower.plant_nickname,
                       "nickname": devices[i].flowerpower.nickname,
                       "test": "test"
                   }});
    }
    sendJson(res, list);    
}

function reload(req, res)
{
    logger.debug("Reloading DB");
    var key1 = req.query.key;
    if (!key1)
        return sendError(res, { "success": false, "message": "Bad request." });
    var key2 = config.reloadKey;
    if (!key2)
        return sendError(res, { "success": false, "message": "Server configuration error." });
    if (key1 != key2) 
        return sendError(res, { "success": false, "message": "Not authorized." });
    database.reload();
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ "success": true }));
}


/*
 * Authentication
 */
passport.use(new LocalStrategy(
    function(username, password, cb) {
        logger.debug("passport.use, username: " + username);
        var account = database.getAccount(username);
        if (!account) { return cb(null, false); }
        if (account.password != password) { return cb(null, false); }
        return cb(null, account);
    }));

/* passport.use(new BasicStrategy(function(username, password, done) {
   var account = database.getAccount(username);
   if (!account) return done(null, false);
   if (account.password == password) return done(null, account);
   return done(null, false);
   }));
*/

passport.serializeUser(function(account, done) {
    done(null, account.id);
});

passport.deserializeUser(function(id, done) {
    var account = database.getAccount(id);
    done(null, account);
});

function apiIsLoggedIn(req, res, next)
{
    if (req.isAuthenticated()) {
        logger.debug("API: Logged in");
        return next();
    }
    logger.debug("API: Not logged in");
    return sendError(res, { "success": false, "message": "Not authorized." });
}

function isLoggedIn(req, res, next)
{
    logger.debug("isLoggedIn: Visitor account: " + JSON.stringify(req.user));
    logger.debug("isLoggedIn: returnTo=" + req.url);
    if (req.isAuthenticated()) {
        logger.debug("Logged in");
        return next();
    }
    logger.debug("Not logged in");
    req.session.returnTo = req.session.returnTo || req.url;
    res.redirect(config.baseUrl + "/login");
}

/*
 * Files
 */

function createFile(req, res)
{
    logger.debug(JSON.stringify(req.files));
    logger.debug(JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    if (!req.files.bits) {
	sendError(res, { "success": false, 
			 "message": "No data" },
                  __line, __function);
	return;
    }

    if (mime.lookup(req.files.bits.path) != "image/jpeg") {
	sendError(res, { "success": false, 
			 "message": "Only JPG images are supported for now. Sorry." },
                  __line, __function);
	return;
    }
    
    var account = req.user;
    var date = new Date().toISOString();

    var file = database.insertFile({ 
	"account": account.id, 
	"type": "image", 
	"mime": "image/jpeg", 
        "date": date,
        "dateUpload": date
    });

    var p = req.files.bits.path;
    var basedir = "public/files/" + account.id + "/";

    convertJpeg(p, basedir, file,
                function(err) {
                    logger.error(err);
	            sendError(res, { "message": "Failed to save the image" }, __line, __function);
                },
                function(r) {
                    file.orig = "files/" + account.id + "/orig/" + file.id + ".jpg";
                    file.small = "files/" + account.id + "/small/" + file.id + ".jpg";
                    file.thumbnail = "files/" + account.id + "/thumbnail/" + file.id + ".jpg";
                    database.updateFile(file);
                    sendJson(res, file);
                });
}

function deleteFile(req, res)
{
    var id = req.params.id;
    var account = req.user;

    logger.debug("deleteFile: " + id);
    
    var file = database.getFile(id);
    if (!file) {
	sendError(res, { "message": "Bad ID" }, __line, __function);
        return;
    }
    if (file.account != account.id) {
	sendError(res, { "message": "Unauthorized" }, __line, __function);
        return;
    }
    database.deleteFile(file);
    sendJson(res, { "success": true });    
}

/*
 * Messages
 */

function sendMessages(req, res)
{
    logger.debug("Request: sendMessages");
    logger.debug("Account: " + JSON.stringify(req.user));

    var experiment = (req.query.experiment)? req.query.experiment : undefined;
    var account = (req.query.account)? req.query.account : undefined;
    var thread = (req.query.thread)? req.query.thread : undefined;

    var messages = database.selectMessages({ "experiment": experiment,
                                             "account": account,
                                             "thread": thread });
    /*for (var i = 0; i < messages.length; i++) {
    //messages[i].text = messages[i].text.replace(/^\s+|\s+$/gm, '');
    messages[i].shorttext = messages[i].text.substr(0, 42).replace(/[\n\r]/g, " ");
    console.log(messages[i].shorttext);
    }
    database.saveTable("messages");
    */
    
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(messages));
}

function createMessage(req, res)
{
    logger.debug(JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    var text = req.body.text;
    if (!text) {
	sendError(res, { "success": false, 
			 "message": "No data" },
                  __line, __function);
	return;
    }
    /*text = text.replace(/^\s+|\s+$/gm, '');
      if (!text) {
      sendError(res, { "success": false, 
      "message": "No data" },
      __line, __function);
      return;
      }
    */
    
    var subject = req.body.subject;
    var account = req.user;
    var date = new Date().toISOString();
    var shorttext = text.substr(0, 42).replace(/[\n\r]/g, " ");
    
    var message = database.insertMessage({ 
	"account": account.id, 
        "date": date,
	"thread": req.body.thread, 
	"experiment": req.body.experiment, 
        "subject": subject,
        "text": text,
        "shorttext": shorttext
    });

    sendJson(res, message);        

    sendMail("peter@hanappe.com", account.id + " posted a message", text);
}

function deleteMessage(req, res)
{
    var id = req.params.id;
    var account = req.user;

    logger.debug("deleteMessage: " + id);
    
    var message = database.getMessage(id);
    if (!message) {
	sendError(res, { "message": "Bad ID" }, __line, __function);
        return;
    }
    if (message.account != account.id) {
	sendError(res, { "message": "Unauthorized" }, __line, __function);
        return;
    }
    database.deleteMessage(message);
    sendJson(res, { "success": true });    
}

/*
 *  Devices
 */

function getSensor(sensors, id)
{
    for (var i = 0; i < sensors.length; i++) {
        if (sensors[i].sensor_serial == id)
            return sensors[i];
    }
    return null;
}

function obtainFlowerPowerDevices(req, res)
{
    logger.debug("Request: obtainFlowerPowerDevices");

    var email = req.query.email;
    var password = req.query.password;

    logger.debug("Email: " + email);

    if (!email || !password) {
    	sendError(res, { "message": "Merci de renseigner votre login et mot de passe pour accéder aux services de Parrot/FlowerPower" },
                  __line, __function);
        return;
    }
    
    var auth = {
	username: email,
	password: password,
	client_id: 'hanappe@csl.sony.fr',
	client_secret: '9pqsuENHVHtgw13MBCNcr8s91Vsw73WB8RwR0ES5VZeXFTkx'
    };

    var api = new FlowerPower(auth, function(err, data) {
	if (err) {
	    logger.error(JSON.stringify(err));
    	    sendError(res, { "message": "Failed to log into FlowerPower server" }, __line, __function);
            return;
	} else {
	    logger.debug('Logged in');
            api.getGarden(function(err, plants, sensors) {
                logger.debug("Plants: " + JSON.stringify(plants));
                if (err) {
	            logger.error(JSON.stringify(err));
    	            sendError(res, { "message": "Failed to obtain FlowerPower info" }, __line, __function);
                    return;
                }
                var list = [];
                for (var i = 0; i < plants.length; i++) {
                    var sensor = getSensor(sensors, plants[i].sensor_serial);
                    if (!sensor) continue;
                    var device = {
                        "account": "peter",
                        "name": plants[i].plant_nickname,
                        "type": "flowerpower",
                        "flowerpower": {
                            "username": email,
                            "password": password,
                            "serial": sensor.sensor_serial,
                            "location": plants[i].location_identifier,
                            "plant_nickname": plants[i].plant_nickname,
                            "nickname": sensor.nickname
                        }};
                    list.push(device);
                }
                logger.debug("List: " + JSON.stringify(list));
                sendJson(res, list);    
	    });
        }
    });
}

function testFlowerPowerDevice(req, res, device)
{
    var auth = {
	username: device.flowerpower.username,
	password: device.flowerpower.password,
	client_id: 'hanappe@csl.sony.fr',
	client_secret: '9pqsuENHVHtgw13MBCNcr8s91Vsw73WB8RwR0ES5VZeXFTkx'
    };

    var api = new FlowerPower(auth, function(err, data) {
	if (err) {
	    logger.error(JSON.stringify(err));
    	    sendError(res, { "message": "Failed to log into FlowerPower server" }, __line, __function);
            return;

	} else {
            var today = new Date();
            var lastweek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7,
                                    today.getHours(), today.getMinutes(), today.getSeconds());
            
            api.getSamples({ "id": device.flowerpower.location,
                             "from": lastweek.toISOString(),
                             "to": today.toISOString() },
                           function(err, samples, events, fertilizer) {
                               if (err) {
                                   logger.error(err);
    	                           sendError(res, { "message": JSON.stringify(err) }, __line, __function);
                               } else {
                                   sendJson(res, { "success": true });
                               }
                           });
        }
    });
}

function handleDeviceOp(req, res)
{
    logger.debug("Request: handleDeviceOp");

    var op = req.query.op;
    var id = req.params.id;
    var account = req.user;

    logger.debug("op=" + op + ", id=" + id);
    
    var device = database.getDevice(id);
    if (!device) {
	sendError(res, { "message": "Bad ID" }, __line, __function);
        return;
    }
    if (device.account != account.id) {
	sendError(res, { "message": "Unauthorized" }, __line, __function);
        return;
    }
    if (op == "test" && device.type == "flowerpower") {
    	testFlowerPowerDevice(req, res, device);
    } else {
    	sendError(res, { "message": "Invalid op" }, __line, __function);
    }
}

function createDevice(req, res)
{
    logger.debug("Create device " + JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    if (req.body.type != "flowerpower") {
	sendError(res, { "success": false, 
			 "message": "Bad device type" },
                  __line, __function);
	return;
    }

    var account = req.user;
    var dev = req.body;
    var fp = dev.flowerpower;
    if (!account || !account.id) {
	sendError(res, { "success": false, 
			 "message": "Unauthorized" },
                  __line, __function);
	return;
    }
    if (!fp) {
	sendError(res, { "success": false, 
			 "message": "Invalid data" },
                  __line, __function);
	return;
    }
    if (!validEmail(fp.username)) {
	sendError(res, { "success": false, 
			 "message": "Bad username" },
                  __line, __function);
	return;
    }
    if (!fp.password || !fp.password.length || fp.password.length > 20) {
	sendError(res, { "success": false, 
			 "message": "Bad login" },
                  __line, __function);
	return;
    }
    if (!fp.serial || !fp.serial.length || fp.serial.length > 32) {
	sendError(res, { "success": false, 
			 "message": "Bad serial" },
                  __line, __function);
	return;
    }
    if (!fp.nickname || !fp.nickname.length || fp.nickname.length > 100) {
	sendError(res, { "success": false, 
			 "message": "Bad nickname" },
                  __line, __function);
	return;
    }
    if (!fp.location || !fp.location.length || fp.location.length > 32) {
	sendError(res, { "success": false, 
			 "message": "Bad location ID" },
                  __line, __function);
	return;
    }
    if (!fp.plant_nickname || !fp.plant_nickname.length || fp.plant_nickname.length > 100) {
	sendError(res, { "success": false, 
			 "message": "Bad plant name" },
                  __line, __function);
	return;
    }
    if (!dev.name || !dev.name.length || dev.name.length > 100) {
	sendError(res, { "success": false, 
			 "message": "Bad plant name" },
                  __line, __function);
	return;
    }

    var d = database.selectDevices({"type": "flowerpower", "account": req.user.id});
    for (var i = 0; i < d.length; i++) {
        if (d[i].flowerpower.serial == fp.serial
            && d[i].flowerpower.nickname == fp.nickname
            && d[i].flowerpower.plant_nickname == fp.plant_nickname
            && d[i].flowerpower.location == fp.location) {
	    sendError(res, { "success": false, 
			     "message": "The device is already registered!" },
                      __line, __function);
            return;
        }
    }
    
    var temperature = {                                                                                                  
        "name": "temperature",                                                                                           
        "property": "temperature",                                                                                       
        "unit": "Celsius",                                                                                               
        "description": "Temperature"                                                                                     
    };                                                                                                                   
    database.insertDatastream(temperature);                                                                              
    
    var humidity = {                                                                                                     
        "name": "soilhumidity",                                                                                          
        "property": "soilhumidity",                                                                                      
        "unit": "%",                                                                                                     
        "description": "Humidite du sol"                                                                                 
    };                                                                                                                   
    database.insertDatastream(humidity);                                                                                 
    
    var sunlight = {                                                                                                     
        "name": "sunlight",                                                                                              
        "property": "par",                                                                                               
        "unit": "umole/m2/s",                                                                                            
        "description": "Lumiere"                                                                                         
    };                                                                                                                   
    database.insertDatastream(sunlight);                                                                                 
    
    var device = database.insertDevice({ 
	"account": account.id, 
        "name": dev.name,
        "datastreams": [ temperature.id, humidity.id, sunlight.id ],
        "type": "flowerpower",
        "flowerpower": {
            "username": fp.username,
            "password": fp.password,
            "serial": fp.serial,
            "nickname": fp.nickname,
            "plant_nickname": fp.plant_nickname,
            "location": fp.location
        }
    });

    sendJson(res, device);
}

function deleteDevice(req, res)
{
    var id = req.params.id;
    var account = req.user;

    logger.debug("deleteDevice: " + id);
    
    var device = database.getDevice(id);
    if (!device) {
	sendError(res, { "message": "Bad ID" }, __line, __function);
        return;
    }
    if (device.account != account.id) {
	sendError(res, { "message": "Unauthorized" }, __line, __function);
        return;
    }
    database.deleteDevice(device);
    sendJson(res, { "success": true });    
}

/*
 * App
 */

var app = express();

//app.use(multer({ dest: './uploads/'}));
var multer = require('multer');
var upload = multer({ dest: './uploads' });



app.use(session({ secret: "Je suis Charlie", 
		  resave: false, 
		  saveUninitialized: false,
                  store: new FileStore({
                      path: "db/sessions",
                      ttl: 31536000,
                      encrypt: true
                  })
                }));
app.use(passport.initialize());
app.use(passport.session());
app.use(locale(supported));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/about.html',
        function(req, res) {
            res.render('about', { "config": config,
                                  "account": req.user,
                                  "r": config.baseUrl + "/about.html" });
        });

//app.get("/captcha.jpg", captcha.generate());
app.get("/experiments/:id(\\d+).json", sendExperiment);
app.get("/experiments/:id(\\d+).html", sendExperimentPage);

app.get("/mobile/:id(\\d+).html",
        passport.authenticate('local', { failureRedirect: config.baseUrl + "/login", successReturnToOrRedirect: '/' }),
        sendMobileApp);

app.get("/observers.json", sendObservers);
app.post("/observers", apiIsLoggedIn, createObserver);
app.get("/observations.json", sendObservations);
app.get("/observations/:id(\\d+).jpg", sendObservationImage);
app.get("/observations/:id(\\d+).json", sendObservationMeta);
app.post("/observations", apiIsLoggedIn, upload.single('photo'), createObservation);
app.delete("/observations/:id(\\d+)", apiIsLoggedIn, deleteObservation);

app.get("/sensordata.json", sendSensorData);

app.get("/datastreams/:id(\\d+).json", sendDatastream);
app.get("/datastreams/:id(\\d+)/datapoints.json", sendDatapoints);

app.get("/groups.json", sendGroups);

app.get("/locations.json", sendLocations);
app.post("/locations", apiIsLoggedIn, createLocation);
app.post("/locations/:id", apiIsLoggedIn, updateLocation);

app.get("/plants.json", sendPlants);
app.post("/accounts" /*, captcha.check*/, createAccount);
app.get("/accounts/:id.json", sendAccountInfo);
app.get("/people/:id.html", sendHomepage);
app.get("/people/:id/profile.html", isLoggedIn, sendProfile);
app.post("/people/:id/profile", apiIsLoggedIn, updateProfile);
app.get("/people/:id/devices.json", apiIsLoggedIn, sendAccountDevices);

app.get("/reload", 
        passport.authenticate('local', { failureRedirect: config.baseUrl + "/login", successReturnToOrRedirect: '/' }),
        reload);

app.post("/files", apiIsLoggedIn, createFile);
app.delete("/files/:id(\\d+)", apiIsLoggedIn, deleteFile);

app.get("/messages", sendMessages);
app.post("/messages", apiIsLoggedIn, createMessage);

app.get("/devices/flowerpowers.json", obtainFlowerPowerDevices);
app.get("/devices/:id(\\d+)", apiIsLoggedIn, handleDeviceOp);
app.post("/devices", apiIsLoggedIn, createDevice);
app.delete("/devices/:id(\\d+)", apiIsLoggedIn, deleteDevice);

app.get('/login',
        function(req, res) {
            logger.debug("login: Visitor account: " + JSON.stringify(req.user));
            var r = (req.query && req.query.r)? req.query.r : null;
            res.render('login', { "r": r, "config": config });
        });

app.post('/login', 
         function(req, res, next) {
             //logger.debug("login: r=" + JSON.stringify(req.query || req.query.r));
             //var rs = (req.query && req.query.r)? req.query.r : '/';
             //var re = (req.query && req.query.r)? config.baseUrl + '/login?r=' + req.query.r : config.baseUrl + '/login';
             //var opt = { failureRedirect: re, successRedirect: rs };
             passport.authenticate('local', opt)(req, res, next);
         },
         function (req, res) {
             req.session.save(function (err) {
                 var r = "/";
                 if (req.isAuthenticated()) {
                     r = (req.query && req.query.r)? req.query.r : '/';
                 } else { 
                     r = (req.query && req.query.r)? config.baseUrl + '/login?r=' + req.query.r : config.baseUrl + '/login';
                 }
                 res.redirect(r);
             });
         });

app.post('/login.json',
         function(req, res, next) {
             passport.authenticate('local', function(err, user, info) {
                 if (err) { sendError(res, err); }
                 else if (!user) { sendError(res, 'Connexion sans succès'); }
                 else sendJson(res, { "id": user.username });
             })(req, res, next);
         });
         
app.get('/logout',
        function(req, res){
            req.logout();
            res.redirect('/');
        });

app.get('/whoami.json',
        function(req, res){
            res.writeHead(200, {"Content-Type": "application/json"});
            if (req.user) 
                res.end(JSON.stringify({ "id": req.user.id }));
            else
                res.end("null");
        });

app.get("/", sendIndex);

/*
  var plotter = require('./plotter');
  function sendGraph(req, res)
  {
  res.writeHead(200, {"Content-Type": "image/svg+xml"});
  res.end(plotter.plotGraph(null));
  }
  app.get("/graphs", sendGraph);
*/

app.use(express.static("public"));
app.set('view engine', 'ejs');


logger.debug("Server starting on port " + config.port);
var server = app.listen(config.port, function () {});
