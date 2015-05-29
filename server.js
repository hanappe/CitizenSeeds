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
var captcha = require("easy-captcha");
var randomstring = require("randomstring");
var XRegExp = require("xregexp").XRegExp;
var nodemailer = require("nodemailer");
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var oauth2 = require('./oauth2');
var gm = require('gm');
var mkdirp = require('mkdirp');
var exit = require('exit');
var log4js = require('log4js');
var ExifImage = require('exif').ExifImage;
var ejs = require('ejs');
var sanitizeHtml = require('sanitize-html');
var mime = require('mime');

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
    } else {
        var locations = database.selectLocations({ "account": account.id });
        if (locations.length == 0) {
            location = database.insertLocation({ "account": account.id, "name": "Ma parcelle" });
        } else if (locations.length == 1) {
            location = locations[0]; // easy
        } else {
            logger.debug("createObserver: locations: " + JSON.stringify(locations));
	    sendError(res, { "success": false, 
			     "message": "Can't handle multiple locations, yet" },
                      __line, __function);
            return;
        }
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

    var id = req.params.id;
    var experiment = database.getExperiment(id);
    if (!experiment) {
	sendError(res, { "message": "Bad experiment ID" },
                  __line, __function);
	return;
    }
    res.render('experiment', { "config": config, "experiment": experiment });
    
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
                 "dateCreated": obs.dateCreated,
                 "experimentId": obs.experiment,
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
    var location = (req.query.location)? req.query.location : undefined;
    var plant = (req.query.plant)? req.query.plant : undefined;
    var experiment = (req.query.experiment)? req.query.experiment : undefined;

    var items = [];
    var observations = database.getObservations();
    
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

    if (req.query.sort && req.query.sort == "plant")
        items.sort(function(a,b) { return a.plant - b.plant; });
    if (req.query.sort && req.query.sort == "location")
        items.sort(function(a,b) { return a.locationName.localeCompare(b.locationName); });
    if (req.query.sort && req.query.sort == "date")
        items.sort(function(a,b) { return a.date.localeCompare(b.date); });

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(items));
}

function validSize(s)
{
    return (s == "small" || s == "orig" || s = "thumbnail");
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
    logger.debug(JSON.stringify(req.files));
    logger.debug(JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    if (!req.files.photo) {
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

    if (!validDate(req.body.date)) {
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
	    "plant": plant.id
	});
    }

    var p = req.files.photo.path;
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
        var start = new Date(exp.startDate);
        var now = new Date();
        if (diff < 32
            && (d.getTime() < now.getTime())
            && (d.getTime() >= start.getTime()))
            observation.date = observation.dateCreated;
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
    if (req.locale == "fr") {
        res.writeHead(302, { 'Location': 'https://p2pfoodlab.net/CitizenSeedsInfo.fr.html' });
    } else {
        res.writeHead(302, { 'Location': 'https://p2pfoodlab.net/CitizenSeedsInfo.fr.html' });
    }
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

    var id = req.body.id;
    var email = req.body.email;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var address1 = req.body.address1;
    var address2 = req.body.address2;
    var zipcode = req.body.zipcode;
    var town = req.body.town;
    var country = req.body.country;
    var delivery = req.body.delivery;
    var flowerpower = req.body.flowerpower;
    var soil = req.body.soil;
    var participation = req.body.participation;
    var groupId = req.body.groupId;
    var groupName = req.body.groupName;
    var groupAddress = req.body.groupAddress;
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

    if (!req.session.captcha.valid) 
        return sendError(res, { "success": false,
                                "field": "captcha",
                                "message": "Captcha invalide. Veuillez vérifier votre saisie." },
                         __line, __function); 

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

    if (flowerpower !== true && flowerpower !== false)
        return sendError(res, { "success": false,
                                "field": "flowerpower",
                                "message": "Valeur invalide pour le champs 'flowerpower'." },
                          __line, __function); 

    logger.debug("createAccount @ 11");

    if (soil !== true && soil !== false)
        return sendError(res, { "success": false,
                                "field": "soil",
                                "message": "Valeur invalide pour le champs 'soil'." },
                         __line, __function); 

    logger.debug("createAccount @ 12");

    if (!validDelivery(delivery))
        return sendError(res, { "success": false,
                                "field": "soil",
                                "message": "Valeur invalide pour le lieu de RDV." },
                          __line, __function);     
    
    logger.debug("createAccount @ 13");

    if (!validParticipation(participation))
        return sendError(res, { "success": false,
                                "field": "participation",
                                "message": "Type de participation invalide." },
                          __line, __function); 

    logger.debug("createAccount @ 14");

    if (participation == "join") {
        group = database.getGroup(groupId);
        if (!group)
            return sendError(res, { "success": false,
                                    "field": "group",
                                    "message": "L'identifiant du groupe sélectionné semble érroné... Nos excuses. Merci de nous contacter." },
                             __line, __function); 
    } else if (participation == "create") {
        if (!validGroupName(groupName))
            return sendError(res, { "success": false,
                                    "field": "groupname",
                                    "message": "Le nom du groupe contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                             __line, __function); 
        if (!validAddress(groupAddress))
            return sendError(res, { "success": false,
                                    "field": "groupaddress",
                                    "message": "L'adresse du groupe contient des caractères que nous ne gérons pas (encore). Merci de les substituer." },
                             __line, __function);

        group = database.insertGroup({ "id": gid,
                                       "name": groupName,
                                       "address": groupAddress,
                                       "contact":  id });
    }

    logger.debug("createAccount @ 15");    
    logger.debug("createAccount @ 16");

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
                "soil": soil,
                "password": randomstring.generate(8),
                "emailValidationToken": randomstring.generate(16)
              };
    if (group) account.group = group.id;

    logger.debug("createAccount @ 17");

    account = database.insertAccount(account);
    
    logger.debug("createAccount @ 18");

    var r = { "success": true, 
	      "id": id, "email": email,
              "firstname": firstname, "lastname": lastname, 
	      "address1": address1, "address2": address2,
              "zipcode": zipcode, "town": town, "country": country };

    logger.debug("createAccount @ 1");

    if (amount) {
        r.cart = cart;
        r.amount = amount;
        r.button = button;
        r.payment = account.payment;
	//// DEBUG
        if (testPaypal) r.testPaypal = testPaypal; 
	//r.button = "VJ3UNF6ZUCC46";
	//// DEBUG
    }
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(r));

    logger.debug("createAccount @ 19");

    var url = "https://p2pfoodlab.net/CitizenSeeds/accounts/" + id + ".html?op=validate&token=" + account.emailValidationToken;
    
    sendMail(email,
             "[P2P Food Lab] Bienvenu !",
             "Bonjour " + id + ",\n\n"
             + "Nous sommes heureux que vous participez à l'expérience CitizenSeeds !\n\n"
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
             JSON.stringify({ "account": account, "participation": participation, "group": group }, undefined, 2));

    
    logger.debug("Request: createAccount: success: " + JSON.stringify(r));
}

function validateAccount(req, res)
{
    var id = req.params.id;
    var account = database.getAccount(id);
    
    if (!req.query.token)
        return "La clé de validation est manquante ?!";
    if (req.query.token == account.emailValidationToken) {
        if (account.emailValidated) {
            return "Votre adresse email a déjà été validée.";
        } else {
            account.emailValidated = true;
            database.updateAccount(account);
            return "Votre adresse email a été validée.";
        }
    }
    return "La validation de votre adresse email a échouée.";
}

function sendHomepage(req, res)
{
    var id = req.params.id;
    var account = database.getAccount(id);
    if (!account) {
        sendError(res, { "success": false, "message": "Bad ID: " + req.params.id });
        return;
    }
    var profile = database.getProfile(id);
    if (!profile) profile = {};
    res.render('homepage', { "config": config, "account": account, "profile": profile });
}

function sendProfile(req, res)
{
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

    res.render('profile', { "config": config,
                            "account": account,
                            "profile": profile,
                            "locations": locations,
                            "files": files
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
    
    if (req.query.op && req.query.op == "validate") {
        var message = validateAccount(req, res);
        res.writeHead(200, {"Content-Type": "text/plain; charset=utf-8"});
        res.end(message);
        return;
    }

    var copy = { "id": account.id };
    sendJson(res, copy);
}

function sendWhoami(req, res)
{
    res.writeHead(200, {"Content-Type": "application/json"});
    if (req.user) {
        res.end(JSON.stringify({ "id": req.user.id }));
    } else {
        res.end(JSON.stringify({ "message": "Who are you?" }));
    }
}

function login(req, res)
{
    logger.debug(JSON.stringify(req.session));
    var account = req.user;
    logger.debug("login: " + JSON.stringify(req.user));
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ "id": account.id }));
}

function logout(req, res)
{
    logger.debug(JSON.stringify(req.session));
    req.logout();
    req.session.destroy();
    //req.session.save();

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ "success": true }));
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
passport.use(new BasicStrategy(function(username, password, done) {
    var account = database.getAccount(username);
    if (!account) return done(null, false);
    if (account.password == password) return done(null, account);
    return done(null, false);
}));

passport.serializeUser(function(account, done) {
    done(null, account.id);
});

passport.deserializeUser(function(id, done) {
    var account = database.getAccount(id);
    done(null, account);
});


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
 * App
 */

var app = express();

app.use(multer({ dest: './uploads/'}));
app.use(session({ secret: "Je suis Charlie", 
		  resave: false, 
		  saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(locale(supported));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/captcha.jpg", captcha.generate());
app.get("/experiments/:id(\\d+).json", sendExperiment);
app.get("/experiments/:id(\\d+).html", sendExperimentPage);
app.get("/mobile/:id(\\d+).html",
        passport.authenticate('basic', { session: true }),
        sendMobileApp);

app.get("/observers.json", sendObservers);
app.post("/observers", 
         passport.authenticate('basic', { session: true }),
         createObserver);

app.get("/observations.json", sendObservations);
app.get("/observations/:id(\\d+).jpg", sendObservationImage);
app.get("/observations/:id(\\d+).json", sendObservationMeta);
app.post("/observations",
         passport.authenticate('basic', { session: true }),
         createObservation);
app.delete("/observations/:id(\\d+)",
           passport.authenticate('basic', { session: true }),
           deleteObservation);

app.get("/sensordata.json", sendSensorData);

app.get("/datastreams/:id(\\d+).json", sendDatastream);
app.get("/datastreams/:id(\\d+)/datapoints.json", sendDatapoints);

app.get("/groups.json", sendGroups);

app.get("/locations.json", sendLocations);
app.post("/locations",
         passport.authenticate('basic', { session: true }),
         createLocation);
app.post("/locations/:id",
         passport.authenticate('basic', { session: true }),
         updateLocation);

app.get("/plants.json", sendPlants);
app.post("/accounts", captcha.check, createAccount);
app.get("/accounts/:id.json", sendAccountInfo);
app.get("/people/:id.html", sendHomepage);
app.get("/people/:id/profile.html",
        passport.authenticate('basic', { session: true }),
        sendProfile);
app.post("/people/:id/profile",
         passport.authenticate('basic', { session: true }),
         updateProfile);
app.get("/whoami", sendWhoami);
app.get("/login",
        passport.authenticate('basic', { session: true }),
        login);
app.get("/logout", logout);

app.get("/reload", 
        passport.authenticate('basic', { session: true }),
        reload);

app.post("/files",
         passport.authenticate('basic', { session: true }),
         createFile);
app.delete("/files/:id(\\d+)",
           passport.authenticate('basic', { session: true }),
           deleteFile);

app.get("/", sendIndex);

app.use(express.static("public"));
app.set('view engine', 'ejs');


var config = { "port": 10201 };

try {
    text = fs.readFileSync("config.json");
    config = JSON.parse(text);        
} catch (e) {
    return;
}

logger.debug("Server starting on port " + config.port);
var server = app.listen(config.port, function () {});
