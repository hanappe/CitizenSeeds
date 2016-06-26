
var _notebookController = undefined;

function Notebook()
{
    this.locations = [];
    this.observers = [];
    this.observations = [];

    this.findLocationIndex = function(id) {
        for (var i = 0; i < this.locations.length; i++) {
            if (this.locations[i].id == id) 
                return i;
        }
        return -1;
    }

    this.addLocation = function(location) {
        this.locations.push(location);
        this.observers.push([]);
        this.observations.push([]);
    }

    this.importLocations = function(locations) {
        for (var i = 0; i < locations.length; i++)
            this.addLocation(locations[i]);
    }

    this.findObserverIndex = function(lindex, plantId) {
        for (var i = 0; i < this.observers[lindex].length; i++) {
            if (this.observers[lindex][i].plantId == plantId) 
                return i;
        }
        return -1;
    }

    this.importObservers = function(observers) {
        for (var i = 0; i < observers.length; i++) {
            var observer = observers[i];
            var index = this.findLocationIndex(observer.locationId);
            if (index < 0) continue; // FIXME: something wrong with the data on the server
            this.observers[index].push(observer);
        }
    }

    this.addObservation = function(observation) {
        var lindex = this.findLocationIndex(observation.locationId);
        if (lindex < 0) return; // FIXME: something wrong with the data on the server
        var pindex = this.findObserverIndex(lindex, observation.plantId);
        if (pindex < 0)  return; // FIXME: something wrong with the data on the server
        this.observations[lindex][pindex] = observation;
    }
}

function NotebookController(notebook)
{
    this.notebook = notebook;

    this.createView = function() {
        this.view = new NotebookView(notebook);
        var div = document.getElementById("MobileApp");
        div.appendChild(this.view.div);
    }

    this.createView();    
}

function NotebookView(notebook)
{ 
    var self = this;
    this.init("NotebookView", "NotebookView container");
    this.notebook = notebook;
    
    this.updateView = function() {
        this.removeComponents();
        for (var i = 0; i < this.notebook.locations.length; i++) {
            var view = new NotebookLocationView(notebook, i);
            this.addComponent(view);
        }
        var button = new Button("AddLocationButton", "NewLocation u-full-width",
                                "Ajouter une nouvelle parcelle de cultures",
                                function() { if (confirm("Vraiment ajouter une nouvelle parcelle ?")) { self.addLocation(); }});
        this.addComponent(button);
    }

    this.addLocation = function() {
        var location =  { };
        _server.postJSON("locations", location).then(function (r) {
            if (r.error) alert(r.message);
            else {
                self.notebook.addLocation(r);
                self.updateView();
            }
        }); 
    }
    
    this.updateView();    
    
}
NotebookView.prototype = new UIComponent();


function NotebookLocationView(notebook, index)
{
    var self = this;
    
    this.init("NotebookLocationView_" + index, "NotebookLocationView row");
    this.notebook = notebook;
    this.index = index;
    
    this.updateView = function() {
        this.removeComponents();
        this.plantSelector = undefined;
        var location = this.notebook.locations[this.index];
        if (location.name)
            this.addText(location.name, "NotebookLocationName");
        else
            this.addText("Chez moi", "NotebookLocationName");

        var observers = this.notebook.observers[this.index];
        for (var i = 0; i < observers.length; i++) {
            var view = new NotebookObserverView(notebook, index, i);
            this.addComponent(view);
        }

        var button = new Button("AddObserverButton", "NewObserver u-full-width",
                                "Rajouter une légume dans ma liste d'observations",
                                function() { self.showPlantSelector(); } );
        this.addComponent(button);
    }

    this.hasObserver = function(id) {
        var observers = this.notebook.observers[this.index];
        for (var i = 0; i < observers.length; i++) {
            if (observers[i].plantId == id)
                return true;
        }
        return false;
    }

    this.hidePlantSelector = function() {
        if (this.plantSelector) {
            this.removeComponent(this.plantSelector);
            this.plantSelector = undefined;
            return;
        }
    }
    
    this.showPlantSelector = function() {
        if (this.plantSelector) {
            this.removeComponent(this.plantSelector);
            this.plantSelector = undefined;
            return;
        }
        var plantsAvailable = [];
        var plantsExp = _experiment.plants;

        for (var i = 0; i < plantsExp.length; i++) {
            if (!this.hasObserver(plantsExp[i].id))
                plantsAvailable.push(plantsExp[i]);
        }
        if (!this.plantSelector) {
            this.plantSelector = new PlantSelectorList(this);
            this.addComponent(this.plantSelector);
        }
        this.plantSelector.show(this, plantsAvailable);
    }

    this.addObserver = function(id) {
        var location = this.notebook.locations[this.index];
        var observer = {
            "locationId": location.id,
            "experimentId": _experiment.id,
            "plantId": id
        };
        _server.postJSON("observers", observer).then(function (r) {
            if (r.error) alert(r.message);
            else {
                self.notebook.observers[self.index].push(r);
                self.updateView();
            }
        }); 
        this.removeComponent(this.plantSelector);
        this.plantSelector = undefined;
    }

    this.updateView();    
}
NotebookLocationView.prototype = new UIComponent();


function PlantSelectorList(parent)
{
    this.init("PlantSelectorList", "PlantSelectorList");

    this.show = function(parent, list) {
        this.removeComponents();
        for (var i = 0; i < list.length; i++)
            this.addComponent(new PlantSelector(parent, list[i]));
        this.addEventLink("Annuler", function() { parent.hidePlantSelector(); }, "button CancelPlantSelector u-max-full-width");    
        this.setVisible(true);
    }
}
PlantSelectorList.prototype = new UIComponent();


function PlantSelector(parent, plant)
{
    this.init("PlantSelector", "PlantSelector");
    var text = plant.family;
    if (plant.variety)
        text += " - " + plant.variety;
    if (plant.note)
        text += " - " + plant.note;
    this.addEventLink(text, function() { parent.addObserver(plant.id); }, "button PlantSelector u-max-full-width");    
}
PlantSelector.prototype = new UIComponent();


function NotebookObserverView(notebook, lindex, pindex)
{
    var self = this;
    this.init("NotebookObserverView_" + lindex + "_" + pindex, "NotebookObserverView");
    this.notebook = notebook;
    this.lindex = lindex;
    this.pindex = pindex;

    this.updateView = function() {
        this.removeComponents();
        this.panel = undefined;
        this.progress = undefined;
        var observer = this.notebook.observers[lindex][pindex];
        var text = "";
        if (observer.plantVariety)
            text = observer.plantFamily + " - " + observer.plantVariety;
         else
            text = observer.plantFamily;
        this.addEventLink(text, function () { self.takePicture(); },
                          "button NotebookObserverView u-full-width");

        var observation = this.notebook.observations[lindex][pindex];
        if (observation) 
            this.addImage(_server.root + "/" + observation.thumbnail,
                          "", "NotebookObservation");
//        else 
//            this.addEventImage(_server.root + "/media/white.gif",
//                               "", "NotebookObservation",
//                               function() { self.takePicture(); } );
    }

    this.hideDialog = function() {
        if (this.panel) {
            this.removeComponent(this.panel);
            this.panel = undefined;
        }
    }

    this.setError = function(e) {
        this.addText("Erreur " + JSON.stringify(e));
    }
    
    this.setProgress = function(value) {
        this.hideDialog();
        if (!this.progress) {
            //this.addImage(_server.root + "/media/spinner.gif", "", "Spinner");
            this.progress = new ProgressBar();
            this.addComponent(this.progress);
        }
        this.progress.setValue(value);
    }
    
    this.takePicture = function() {
        if (this.panel) {
            this.hideDialog();
            return;
        }
        var observer = this.notebook.observers[this.lindex][this.pindex];
        var date = new Date();
        var hidden = { "accountId": observer.accountId,
                       "locationId": observer.locationId,
                       "plantId": observer.plantId,
                       "experimentId": observer.experimentId,
                       "date": toDate(date) };
        
        this.panel = new UploadPanel(hidden,
                                     function (data) {
                                         if (data.error)
                                             alert(data.message);
                                         else
                                             notebook.addObservation(data);
                                         self.updateView();
                                     },
                                     function (r) { self.updateView(); },
                                     function (r) { self.updateView(); self.setError(r); },
                                     function(value) {
                                         self.setProgress(value);
                                     });

        this.addComponent(this.panel);
    }

    this.updateView();
}
NotebookObserverView.prototype = new UIComponent();

function startMobileApp(url, id)
{
    _server = new Server(url);
    var notebook = new Notebook();
    
    // First, load all the data and construct the data structure, aka
    // the 'model'.
    _server.getJSON("experiments/" + id + ".json").then(function(e) {
        _experiment = new Experiment(e);
        return _server.getJSON("whoami.json");
    }).then(function(a) {
        _account = a;
        return _server.getJSON("locations.json?account=" + _account.id);
    }).then(function(r) {
        notebook.importLocations(r);
        return _server.getJSON("observers.json?account=" + _account.id + "&experiment=" + id);
    }).then(function(list) {
        notebook.importObservers(list);
        _notebookController = new NotebookController(notebook);
    });
}
