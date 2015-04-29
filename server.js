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
var gm = require('gm');
var mkdirp = require('mkdirp');
var exit = require('exit');

var log4js = require('log4js');
log4js.configure({
    appenders: [
	{ type: 'console' },
	{ type: 'file', filename: 'log/all.log', category: 'p2pfoodlab' }
    ]
});
mkdirp("log/", function(err) {
    if (err) {
	console.log("Failed to create the log directory");
        exit(1);
    }
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

function sendJson(res, m)
{
    logger.debug("send: " + JSON.stringify(m));
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(m));
    return false;
}

function sendError(res, m)
{
    m.error = true;
    m.success = false;
    logger.error("sendError: " + JSON.stringify(m));
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(m));
    return false;
}

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
			 "message": "No experiment ID" });    
        return;
    }
    var experiment = database.getExperiment(req.body.experimentId);
    if (!experiment) {
	sendError(res, { "success": false, 
			 "message": "Bad experiment id" });
	return;
    }    

    if (!req.body.plantId) {
	sendError(res, { "success": false, 
			 "message": "No plant ID" });    
        return;
    }
    var plant = database.getPlant(req.body.plantId);
    if (!plant) {
	sendError(res, { "success": false, 
			 "message": "Bad plant id" });
	return;
    }    
    var account = req.user;
    if (!account) {
	sendError(res, { "success": false, 
			 "message": "Login failed" });
	return;
    }    

    var locations = database.selectLocations({ "account": account.id });
    var location;
    
    if (locations.length == 0) {
        location = database.insertLocation({ "account": account.id, "name": "" });
    } else if (locations.length == 1) {
        location = locations[0]; // easy
    } else {
        logger.debug("createObserver: locations: " + JSON.stringify(locations));
	sendError(res, { "success": false, 
			 "message": "Can't handle multiple locations, yet" });
        return;
    }

    var observers = database.selectObservers({ "account": account.id,
                                               "location": location.id,
                                               "experiment": experiment.id,
                                               "plant": plant.id });
    if (observers.length != 0) {
	sendError(res, { "success": false, 
			 "message": "Vous avez déjà une ligne "
                         + "d'observations pour cette plante." });
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
    for (var i = 0; i < exp.plants.length; i++)
        e.plants.push(database.getPlant(exp.plants[i]));
    
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
	        sendError(res, { "message": "Server error" });
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
	sendError(res, { "message": "Bad experiment ID" });
	return;
    }
    var vars = { "experimentId": experiment.id, 
	         "experimentName": experiment.prettyname,
	         "baseUrl": config.baseUrl };    
    new Template("experiment").generate(res, vars);
}

function sendMobileApp(req, res)
{
    logger.debug("Request: sendMobileApp");
    logger.debug("ID: " + req.params.id);

    var id = req.params.id;
    var experiment = database.getExperiment(id);
    if (!experiment) {
	sendError(res, { "message": "Bad experiment ID" });
	return;
    }
    var vars = { "experimentId": experiment.id, 
	         "experimentName": experiment.prettyname,
	         "baseUrl": config.baseUrl };    
    new Template("mobile").generate(res, vars);
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

function sendObservations(req, res)
{
    logger.debug("Request: sendObservations");
    logger.debug("Account: " + req.user);

    var fromDate = (req.query.from)? convertDate(req.query.from) : undefined;
    var toDate = (req.query.to)? convertDate(req.query.to) : undefined;
    var location = (req.query.location)? req.query.location : undefined;
    var plant = (req.query.plant)? req.query.plant : undefined;
    var experiment = (req.query.experiment)? req.query.experiment : undefined;

    var items = [];
    var observations = database.getObservations();
    
    for (var i = 0; i < observations.length; i++) {
        var obs = observations[i];
        if (plant && obs.plant != plant) continue;
        if (location && obs.location != location) continue;
        if (experiment && obs.experiment != experiment) continue;

        var date = convertDate(obs.date);
        if (fromDate && date.getTime() < fromDate.getTime()) continue;
        if (toDate && date.getTime() > toDate.getTime()) continue;

        var loca = database.getLocation(obs.location);
        var pl = database.getPlant(obs.plant);

        var copy = { "id": obs.id,
                     "date": obs.date,
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

        items.push(copy);
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
    var location = database.getLocation(obs.location);
    var copy = { "id": obs.id,
                 "date": obs.date,
                 "locationId": location.id,
                 "locationName": location.name,
                 "plant": obs.plant,
                 "accountId": location.account };
    
    copy.orig = observationPath(obs, "orig");
    copy.small = observationPath(obs, "small");
    copy.thumbnail = observationPath(obs, "thumbnail");
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(copy));
}

function saveObservationLarge(res, path, basedir, observation)
{
    var orig = basedir + "large/" + observation.id + ".jpg";

    mkdirp(basedir + "large/", function(err) { 
	if (err) 
	    sendError(res, { "message": "Failed to create the directories" });
	else 
	    gm(path).resize(1200, 800).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    sendError(res, { "message": "Failed to save large" });
		} else {
                    var location = database.getLocation(observation.location);
                    var plant = database.getPlant(observation.plant);
                    var copy = { "id": observation.id,
                                 "date": observation.date,
                                 "experimentId": observation.experiment,
                                 "locationId": location.id,
                                 "locationName": location.name,
                                 "plantId": plant.id,
                                 "plantFamily": plant.family,
                                 "plantVariety": plant.variety,
                                 "accountId": location.account };
        
                    copy.orig = observationPath(observation, "orig");
                    copy.small = observationPath(observation, "small");
                    copy.thumbnail = observationPath(observation, "thumbnail");
		    sendJson(res, copy);
		}
	    });
    });
}

function saveObservationSmall(res, path, basedir, observation)
{
    var orig = basedir + "small/" + observation.id + ".jpg";

    mkdirp(basedir + "small/", function(err) { 
	if (err) 
	    sendError(res, { "message": "Failed to create the directories" });
	else 
	    gm(path).resize(640, 480).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    sendError(res, { "message": "Failed to save small" });
		} else 
		    saveObservationLarge(res, path, basedir, observation);
	    });
    });
}

function saveObservationThumbnail(res, path, basedir, observation)
{
    var orig = basedir + "thumbnail/" + observation.id + ".jpg";

    mkdirp(basedir + "thumbnail/", function(err) { 
	if (err) 
	    sendError(res, { "message": "Failed to create the directories" });
	else 
	    gm(path).resize(150, 100).write(orig, function(err) {
		if (err)  {
                    logger.error(err);
		    sendError(res, { "message": "Failed to save thumbnail" });
		} else 
		    saveObservationSmall(res, path, basedir, observation);
	    });
    });
}

function saveObservationOrig(res, path, basedir, observation)
{
    var orig = basedir + "orig/" + observation.id + ".jpg";

    mkdirp(basedir + "orig/", function(err) { 
	if (err) 
	    sendError(res, { "message": "Failed to create the directories" });
	else 
	    gm(path).write(orig, function(err) {
		if (err) {
                    logger.error(err);
		    sendError(res, { "message": "Failed to save original photo" });
		} else 
		    saveObservationThumbnail(res, path, basedir, observation);
	    });
    });
}

function createObservation(req, res)
{
    logger.debug(JSON.stringify(req.files));
    logger.debug(JSON.stringify(req.body));
    logger.debug("Account ", JSON.stringify(req.user));

    if (!req.files.photo) {
	sendError(res, { "success": false, 
			 "message": "No photo" });
	return;
    }

    if (!req.body.locationId) {
	sendError(res, { "success": false, 
			 "message": "No location" });    
        return;
    }

    if (!req.body.experimentId) {
	sendError(res, { "success": false, 
			 "message": "No experiment ID" });    
        return;
    }

    if (!validDate(req.body.date)) {
	sendError(res, { "success": false, 
			 "message": "No date" });    
        return;
    }

    var account = req.user;

    var plant = database.getPlant(req.body.plantId);
    if (!plant) {
	sendError(res, { "success": false, 
			 "message": "Bad plant id" });
	return;
    }    

    var location = database.getLocation(req.body.locationId);
    if (!location) {
	sendError(res, { "success": false, 
			 "message": "Bad location" });    
        return;
    }    
    if (account.id != location.account) {
	sendError(res, { "success": false, 
			 "message": "Not your location" });    
        return;
    }

    var experiment = database.getExperiment(req.body.experimentId);
    if (!experiment) {
	sendError(res, { "success": false, 
			 "message": "Bad experiment" });    
        return;
    }    

    var observation;
    if (req.body.id) {
	observation = database.getObservation(req.body.id);
	if (!observation) {
	    sendError(res, { "success": false, 
			     "message": "Bad observation id" });    
            return;
	}
	if (observation.location != location.id) {
	    sendError(res, { "success": false, 
			     "message": "Observation doesn't match location" });    
            return;
	}
	if (observation.experiment != experiment.id) {
	    sendError(res, { "success": false, 
			     "message": "Observation doesn't match experiment ID" });    
            return;
	}
    } else {
        observation = database.insertObservation({ 
	    "location": location.id, 
	    "experiment": experiment.id, 
	    "date": req.body.date,
	    "plant": plant.id
	});
    }

    var p = req.files.photo.path;
    var basedir = "public/observations/" + location.id + "/" + plant.id + "/";
    
    saveObservationOrig(res, p, basedir, observation);
}

/*
 * Datastreams
 */      

function sendDatastream(req, res)
{
    logger.debug("Request: sendObservations");
    logger.debug("Account: " + req.user);

    var id = req.params.id;
    var datastream = database.getDatastream(id);
    if (!datastream) {
	sendError(res, { "message": "Bad datastream ID" });
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
	sendError(res, { "message": "Bad datastream ID" });
	return;
    }

    var fromDate = (req.query.from)? convertDate(req.query.from) : undefined;
    var toDate = (req.query.to)? convertDate(req.query.to) : undefined;

    var data = fs.readFile(datastreamPath(id), function (err, data) {
	if (err) sendError(res, { "message": "Failed to read the data" });
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
 * Plants
 */      

function sendPlants(req, res)
{
    logger.debug("Request: sendPlants");
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(database.getPlants()));
}

function sendPlantLocations(req, res)
{
    logger.debug("Request: sendPlantLocations");
    var list = [];
    var id = req.params.id;
    var locations = database.getPlantLocations();
    for (var i = 0; i < locations.length; i++) {
	if (locations[i].plant == id) {
	    var location = database.getLocation(locations[i].location);
	    if (!location) continue; // FIXME
	    var account = database.getAccount(location.account);
	    if (!account) continue; // FIXME
	    list.push({"id": location.id, 
		       "name": location.name,
		       "accountId": account.id,
		       "accountGroup": account.group,
		       "deviceId": location.device });
	}
    }
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(list));
}


/*
 * Index / with locale
 */      
function sendIndex(req, res)
{
    logger.debug("Request: sendIndex");
    res.writeHead(200, {"Content-Type": "text/html"});
    var path = "public/index.html";
    if (req.locale == "fr") {
        path = "public/index.fr.html";
    }
    var page = fs.readFileSync(path); // FIXME: async
    res.end(page); 
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
                                "message": "Le pseudonyme que vous avez choisi est déjà utilisé. Merci d'en choisir un autre." }); 

    logger.debug("createAccount @ 2");

    if (!req.session.captcha.valid) 
        return sendError(res, { "success": false,
                                "field": "captcha",
                                "message": "Captcha invalide. Veuillez vérifier votre saisie." }); 

    logger.debug("createAccount @ 3");

    if (!validUsername(id))
        return sendError(res, { "success": false,
                                "field": "username",
                                "message": "Le pseudonyme que vous avez choisi n'est pas valide. Merci d'en choisir un autre." }); 

    logger.debug("createAccount @ 4");

    if (!validEmail(email))
        return sendError(res, { "success": false,
                                "field": "email",
                                "message": "Veuillez vérifier votre adresse email. Elle ne semble pas valide." }); 

    logger.debug("createAccount @ 5");

    if (!validFirstname(firstname))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre prénom contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 

    logger.debug("createAccount @ 6");

    if (!validLastname(lastname))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre nom contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 

    logger.debug("createAccount @ 7");

    if (!validAddress(address1) || (address2 != "" && !validAddress(address2)))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre adresss contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 

    if (!validZipcode(zipcode))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre code postal contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 

    logger.debug("createAccount @ 8");

    if (!validTown(town))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Votre nom de ville contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 

    logger.debug("createAccount @ 9");

    if (!validCountry(country))
        return sendError(res, { "success": false,
                                "field": "address",
                                "message": "Veuillez vérifier le nom du pays. Merci !" }); 

    logger.debug("createAccount @ 10");

    if (flowerpower !== true && flowerpower !== false)
        return sendError(res, { "success": false,
                                "field": "flowerpower",
                                "message": "Valeur invalide pour le champs 'flowerpower'." }); 

    logger.debug("createAccount @ 11");

    if (soil !== true && soil !== false)
        return sendError(res, { "success": false,
                                "field": "soil",
                                "message": "Valeur invalide pour le champs 'soil'." }); 

    logger.debug("createAccount @ 12");

    if (!validDelivery(delivery))
        return sendError(res, { "success": false,
                                "field": "soil",
                                "message": "Valeur invalide pour le lieu de RDV." });     
    
    logger.debug("createAccount @ 13");

    if (!validParticipation(participation))
        return sendError(res, { "success": false,
                                "field": "participation",
                                "message": "Type de participation invalide." }); 

    logger.debug("createAccount @ 14");

    if (participation == "join") {
        group = database.getGroup(groupId);
        if (!group)
            return sendError(res, { "success": false,
                                    "field": "group",
                                    "message": "L'identifiant du groupe sélectionné semble érroné... Nos excuses. Merci de nous contacter." }); 
    } else if (participation == "create") {
        if (!validGroupName(groupName))
            return sendError(res, { "success": false,
                                    "field": "groupname",
                                    "message": "Le nom du groupe contient des caractères que nous ne gérons pas (encore). Merci de les substituer." }); 
        if (!validAddress(groupAddress))
            return sendError(res, { "success": false,
                                    "field": "groupaddress",
                                    "message": "L'adresse du groupe contient des caractères que nous ne gérons pas (encore). Merci de les substituer." });

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

    var url = "https://p2pfoodlab.net/n/accounts/" + id + "?op=validate&token=" + account.emailValidationToken;
    
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

function sendAccount(req, res)
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
    req.session.destroy();
    //req.session.save();
    //req.logout();

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

app.get("/datastreams/:id(\\d+).json", sendDatastream);
app.get("/datastreams/:id(\\d+)/datapoints.json", sendDatapoints);

app.get("/groups.json", sendGroups);

app.get("/plants.json", sendPlants);
app.get("/plants/:id(\\d+)/locations.json", sendPlantLocations);
app.post("/accounts", captcha.check, createAccount);
app.get("/accounts/:id", sendAccount);
app.get("/login",
        passport.authenticate('basic', { session: true }),
        login);
app.get("/logout", logout);

app.get("/", sendIndex);

app.use(express.static("public"));


var config = { "port": 10201 };

try {
    text = fs.readFileSync("config.json");
    config = JSON.parse(text);        
} catch (e) {
    return;
}

logger.debug("Server starting on port " + config.port);
var server = app.listen(config.port, function () {});
