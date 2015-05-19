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

// 
// TODO: move to mongodb/mongoose?
// 
var fs = require("fs");

var _db = undefined;

function load()
{        
    var text;
    try {
        text = fs.readFileSync("db.json");
        _db = JSON.parse(text);        
    } catch (e) {
        createMaster(); 
    }
    
    loadTable("accounts");
    loadTable("groups");
    loadTable("devices");
    loadTable("datastreams");
    loadTable("locations");
    loadTable("experiments");
    loadTable("observers");
    loadTable("observations");
    loadTable("plants");
    loadTable("plantlocations");
    loadTable("sensordata");
    
    return _db;
}

function reload()
{
    load();
}

function init()
{
    if (_db)
        return _db;
    else load();
}
    
function createMaster()
{
    console.log("Initilising the database");
    try {
        fs.mkdirSync("db");
    } catch (e) {
        console.log("Failed to make dir db");
    }
    try {
        fs.mkdirSync("db/datastreams");    
    } catch (e) {
        console.log("Failed to make dir db/datastreams");
    }
    
    _db = {};
    saveMaster(_db);
}

function saveMaster()
{
    try {
        fs.renameSync("db.json", "db.json.backup");
    } catch (e) {
        // FIXME: not an error if file doesn't exist
    }
    fs.writeFileSync("db.json", JSON.stringify(_db, undefined, 2));
}

function loadTable(name)
{
    var path = "db/" + name + ".json";
    try {
	text = fs.readFileSync(path);
    } catch (e) {
        // Not an error if file doesn't exist
	_db[name] = [];
	return;
    }
    _db[name] = JSON.parse(text);
}

function saveTable(name)
{
    var path = "db/" + name + ".json";
    try {
        fs.renameSync(path, path + ".backup");
    } catch (e) {
        // FIXME: not an error if file doesn't exist
        }
    fs.writeFileSync(path, JSON.stringify(_db[name], undefined, 2));
}

function newId(name)
{
    var id = 1;
    var table = _db[name];
    for (var i = 0; i < table.length; i++) {
        if (table[i].id >= id) 
            id = table[i].id + 1;
    }
    return id;
}

//------------------------------------------

function getAccounts()
{
    return _db.accounts;
}

function getAccount(id)
{
    for (var i = 0; i < _db.accounts.length; i++) {
        if (_db.accounts[i].id == id
            || _db.accounts[i].email == id)
            return _db.accounts[i];
    }
    return undefined;
}

function insertAccount(account)
{
    _db.push(account);
    saveTable("accounts");
    return account;
}

function updateAccount(account)
{
    var a = getAccount(account.id);
    a.id = account.id;
    a.email = account.email;
    a.firstname = account.firstname;
    a.lastname = account.lastname;
    a.address1 = account.address1;
    a.address2 = account.address2;
    a.zipcode = account.zipcode;
    a.town = account.town;
    a.country = account.country;
    a.flowerpower = account.flowerpower;
    a.soil = account.soil;
    a.password = account.password;
    a.emailValidationToken = account.emailValidationToken;
    a.group = account.group;
    a.emailValidated = account.emailValidated;    
    saveTable("accounts");
    return account;
}

//------------------------------------------

function getGroups()
{
    return _db.groups;
}
    
function getGroup(id)
{
    for (var i = 0; i < _db.groups.length; i++) {
        if (_db.groups[i].id == id)
            return _db.groups[i];
    }
    return undefined;
}

function insertGroup(group)
{
    group.id = newId("groups");
    _db.groups.push(group);
    saveTable("groups");
    return group;
}

//------------------------------------------

function getDatastreams()
{
    return _db.datastreams;
}

function getDatastream(id)
{
    for (var i = 0; i < _db.datastreams.length; i++) {
        if (_db.datastreams[i].id == id)
            return _db.datastreams[i];
    }
    return undefined;
}

function insertDatastream(datastream)
{
    datastream.id = newId("datastreams");
    _db.datastreams.push(datastream);
    saveTable("datastreams");
    return datastream;
}

//------------------------------------------

function getDevices()
{
    return _db.devices;
}

function insertDevice(device)
{
    device.id = newId("devices");
    console.log("Insert device : " + JSON.stringify(device));
    _db.devices.push(device);
    saveTable("devices");
    return device;
}

function getDevice(id)
{
    for (var i = 0; i < _db.devices.length; i++) {
        if (_db.devices[i].id == id)
            return _db.devices[i];
    }
    return undefined;
}

function updateDevice(device)
{
    console.log("Update device device=" + JSON.stringify(device));
    var d = getDevice(device.id);
    d.account = device.account;
    d.name = device.name;
    d.datastreams = device.datastreams;
    d.type = device.type;
    if (d.type == "flowerpower") {
        if (!d.flowerpower) d.flowerpower = {};
        d.flowerpower.username = device.flowerpower.username;
        d.flowerpower.password = device.flowerpower.password;
        d.flowerpower.serial = device.flowerpower.serial;
        d.flowerpower.location = device.flowerpower.location;
        d.flowerpower.nickname = device.flowerpower.nickname;
    }
    console.log("Update device d=" + JSON.stringify(device));
    saveTable("devices");
    return account;
}

//------------------------------------------

function getExperiments()
{
    return _db.experiments;
}

function getExperiment(id)
{
    for (var i = 0; i < _db.experiments.length; i++) {
        if (_db.experiments[i].id == id)
            return _db.experiments[i];
    }
        return undefined;
}

//------------------------------------------

function getObservers()
{
    return _db.observers;
}

function insertObserver(observer)
{
    observer.id = newId("observers");
    _db.observers.push(observer);
    saveTable("observers");
    return observer;
}

function selectObservers(filter)
{
    var observers = [];
    for (var i = 0; i < _db.observers.length; i++) {
        if (filter.account &&
            filter.account != _db.observers[i].account)
            continue;
        if (filter.plant &&
            filter.plant != _db.observers[i].plant)
            continue;
        if (filter.experiment &&
            filter.experiment != _db.observers[i].experiment)
            continue;
        if (filter.location &&
            filter.location != _db.observers[i].location)
            continue;
        observers.push(_db.observers[i]);
    }
    return observers;
}

//------------------------------------------

function getObservations()
{
    return _db.observations;
}

function getObservation(id)
{
    for (var i = 0; i < _db.observations.length; i++) {
        if (_db.observations[i].id == id)
            return _db.observations[i];
    }
    return undefined;
}

function newObservationId()
{
    var id = 1;
    for (var i = 0; i < _db.observations.length; i++) {
        if (_db.observations[i].id >= id) 
            id = _db.observations[i].id + 1;
    }
    return id;
}

function insertObservation(observation)
{
    observation.id = newId("observations");
    _db.observations.push(observation);
    saveTable("observations");
    return observation;
}

function updateObservation(observation)
{
    var d = getObservation(observation.id);
    d.date = observation.date;
    d.location = observation.location;
    d.experiment = observation.experiment;
    d.plant = observation.plant;
    d.dateCreated = observation.dateCreated;
    d.dateUpload = observation.dateUpload;
    d.dateUser = observation.dateUser;
    d.deleted = observation.deleted;
    saveTable("observations");
    return d;
}

//------------------------------------------

function getLocations()
{
    return _db.locations;
}

function selectLocations(filter)
{
    var locations = [];
    for (var i = 0; i < _db.locations.length; i++) {
        if (filter.account &&
            filter.account != _db.locations[i].account)
            continue;
        locations.push(_db.locations[i]);
    }
    return locations;
}

function getLocation(id)
{
    for (var i = 0; i < _db.locations.length; i++) {
        if (_db.locations[i].id == id)
            return _db.locations[i];
    }
    return undefined;
}

function insertLocation(location)
{
    location.id = newId("locations"), 
    _db.locations.push(location);
    saveTable("locations");
    return location;
}

function updateLocation(location)
{
    var d = getLocation(location.id);
    d.account = location.account;
    d.name = location.name;
    d.device = location.device;
    saveTable("locations");
    return account;
}

//------------------------------------------

function getPlants()
{
    return _db.plants;
}
    
function getPlant(id)
{
    for (var i = 0; i < _db.plants.length; i++) {
        if (_db.plants[i].id == id)
            return _db.plants[i];
    }
    return undefined;
}

//------------------------------------------

function getSensorData()
{
    return _db.sensordata;
}

function getSensorDatum(id)
{
    for (var i = 0; i < _db.sensordata.length; i++) {
        if (_db.sensordata[i].id == id)
            return _db.sensordata[i];
    }
    return undefined;
}

function insertSensorDatum(datum)
{
    _db.sensordata.push(datum);
    saveTable("sensordata");
    return datum;
}

function updateSensorDatum(datum)
{
    saveTable("sensordata");
    return datum;
}

//------------------------------------------

module.exports = {
    init: init,
    reload: reload,

    saveTable: saveTable,

    getAccounts: getAccounts,
    getAccount: getAccount,
    insertAccount: insertAccount,
    updateAccount: updateAccount,

    getGroups: getGroups,
    getGroup: getGroup,
    insertGroup: insertGroup,

    getDatastreams: getDatastreams,
    getDatastream: getDatastream,
    insertDatastream: insertDatastream,

    getDevices: getDevices,
    getDevice: getDevice,
    insertDevice: insertDevice,
    updateDevice: updateDevice,

    getExperiments: getExperiments,
    getExperiment: getExperiment,

    getObservers: getObservers,
    insertObserver: insertObserver,
    selectObservers: selectObservers,
    
    getObservations: getObservations,
    getObservation: getObservation,
    insertObservation: insertObservation,
    updateObservation: updateObservation,

    getLocations: getLocations,
    selectLocations: selectLocations,
    getLocation: getLocation,
    insertLocation: insertLocation,
    updateLocation: updateLocation,

    getPlants: getPlants,
    getPlant: getPlant,

    getSensorData: getSensorData,
    getSensorDatum: getSensorDatum,
    insertSensorDatum: insertSensorDatum,
    updateSensorDatum: updateSensorDatum
}
