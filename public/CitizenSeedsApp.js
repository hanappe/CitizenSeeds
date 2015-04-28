/*  
    CitizenSeedsApp 

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



/***************************************************
 * GUI
 ***************************************************/

// Thanks to Scott Andrew LePera
// (http://www.scottandrew.com/weblog/articles/cbs-events) and
// Christian Heilmann
// (http://onlinetools.org/articles/unobtrusivejavascript/chapter4.html)
// for the setEventHandler() and removeEventHandler() functions.
function setEventHandler(obj, evType, fn)
{ 
    if (obj.addEventListener){ 
        obj.addEventListener(evType, fn, false); 
        return true; 

    } else if (obj.attachEvent){ 
        var r = obj.attachEvent("on"+evType, fn); 
        return r; 

    } else { 
        return false; 
    } 
}

function removeEventHandler(obj, evType, fn)
{
    if (obj.removeEventListener){
        obj.removeEventListener(evType, fn, false);
        return true;

    } else if (obj.detachEvent){
        var r = obj.detachEvent("on"+evType, fn);
        return r;

    } else {
        return false;
    }
}

/*
 * UIComponent
 */

function UIComponent()
{        
    this.init = function(id, style, div) {
        this.id = id;
        this.div = (div)? div : document.createElement("DIV");
        this.div.id = id;
        this.div.className = style;
        this.style = style;
        this.visible = true;
        this.parent = undefined;
        this.components = [];
        this.listeners = [];
        return this;
    }

    this.addListener = function(listener) { 
        this.listeners.push(listener);
    }
    
    this.callListeners = function(what) { 
        for (var i = 0; i < this.listeners.length; i++) {
            this.listeners[i].handleEvent(what, this);
        }
    }
    
    this.setStyle = function(s) {
        this.style = s;
        this.updateStyle();
    }

    this.setVisible = function(value) {
        this.visible = value;
        this.updateStyle();
    }

    this.isVisible = function() {
        return this.visible;
    }


    this.toggleVisibility = function() {
        if (this.visible) {
            this.visible = false;
        } else {
            this.visible = true;
        }
        this.updateStyle();
    }

    this.moveTo = function(x, y) {
        this.div.style.left = x + "px";
        this.div.style.top = y + "px";
    }

    this.resize = function(w, h) {
        this.div.style.width = w + "px";
        this.div.style.height = h + "px";
    }

    this.updateStyle = function(value) {
        if (this.visible) {
            this.div.className = this.style + " visible";
        } else {
            this.div.className = this.style + " hidden";
        }
    }

    this.addText = function(text, style) {
        if (!style) {
            this.div.appendChild(document.createTextNode(text));

        } else {
            var span = document.createElement("SPAN");
            span.className = style;
            span.innerHTML = text;
            this.div.appendChild(span);
        }
    }

    this.addBreak = function() {
        this.div.appendChild(document.createElement("BR"));
    }

    this.addLink = function(anchorText, href, className) {
        var a = document.createElement("A");
        a.className = className;
        a.setAttribute("href", href);
        a.appendChild(document.createTextNode(anchorText));
        this.div.appendChild(a);
        return a;
    }

    this.addEventLink = function(anchorText, handler, className) {
        var a = document.createElement("A");
        a.className = className;
        a.setAttribute("href", "javascript:void(0)");
        a.innerHTML = anchorText;
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", handler);
        this.div.appendChild(a);
        return a;
    }

    this.addImage = function(src, alt, className) {
        var img = document.createElement("IMG");
        img.src = src;
        if (alt) {
            img.alt = alt;
            img.title = alt;
        } 
        if (className) {
            img.className = className;
        }
        this.div.appendChild(img);
        return img;
    }

    this.addComponent = function(c) {
        //alert("UIComponent.addComponent: " + this + ": " + c);
        this.components.push(c);
        this.div.appendChild(c.div);
        c.parent = this;
    }

    this.appendChild = function(element) {
        this.div.appendChild(element);
    }

    this.removeComponents = function() {
        this.components = [];
        while (this.div.hasChildNodes()) {
            this.div.removeChild(this.div.firstChild);
        }
    }

    this.removeComponent = function(c) {
        var i = 0;
        while (i < this.components.length) {
            component = this.components[i];
            if (component == c) {
                this.components.splice(i, 1);
                break;
            }
            i++;
        }
        i = 0;
        while (i < this.div.childNodes.length) {	    
            e = this.div.childNodes[i++];
            if (e == c.div) {
                this.div.removeChild(e);
                break;
            }
        }	
        c.parent = undefined;
    }

    this.countComponents = function() {
        return this.components.length;
    }

    this.getComponent = function(id) {
        for (var i = 0; i < this.components.length; i++) {
            component = this.components[i];
            if (id == component.id) {
                return component;
            }
        }
    }

    this.getComponentAt = function(index) { 
        return this.components[index];
    }

    this.addComponentAt = function(id, c) {
        for (var i = 0; i < this.components.length; i++) {
            component = this.components[i];
            if (id == component.id) {
                component.addComponent(c);
                break;
            }
        }
    }
}

/*
 * Button
 */

function Button(id, style, text, action)
{
    var self = this;

    this.text = text;
    this.action = action;
    
    this.clicked = function() { 
        self.callListeners("clicked");
    }

    this.setText = function(s) {
        this.text = text;
        this.link.innerHTML = s; 
    }

    this.init(id, style);
    this.link = this.addEventLink(text, this.clicked, style);
}

Button.prototype = new UIComponent();


/*
 * StaticText
 */

function StaticText(text, style)
{
    this.init("StaticText", style);

    this.getText = function() {
        return this.text;
    }

    this.setText = function(s) {
        this.text = s;
        this.removeComponents();
        this.addText(this.text); 
    }

    this.setText(text);
}

StaticText.prototype = new UIComponent();


/*
 * VSpacer
 */

function VSpacer(width)
{
    this.init("VSpacer", "VSpacer");
    this.div.innerHTML = "&nbsp;";

    this.setWidth = function(width) {
        this.width = width;
        this.style.width = width + "px";
    }
    
    this.setWidth(width);
}

VSpacer.prototype = new UIComponent();


/*
 * TextField
 */

function TextField(value, defaultLength, id, style, editable)
{
    var self = this;

    this.init(id, style);

    this.text = value;
    this.defaultText = "";
    this.defaultLength = defaultLength;
    this.editable = editable;
    this.form = undefined;
    this.input = undefined;

    this.getText = function() {
        return this.text;
    }

    this.setText = function(text) {
        this.text = text;
        if (!this.text || this.text.length == 0) {
            this.text = this.defaultText;
        }
        this.displayFixedText();
    }

    this.editText = function() {
        if (self.editable) {
            self.displayEditableText();
        }
    }

    this.endEdit = function() {
        self.setText(self.input.value); 
        self.callListeners("changed");
        self.displayFixedText();
    }

    this.saveText = function() {
        if (self.text != self.input.value) {
            self.setText(self.input.value); 
            self.callListeners("changed");
        } else {
            self.displayFixedText();
        }
    }

    this.displayFixedText = function() {
        this.removeComponents();
        if (this.editable) {
            this.addEventLink(this.text, this.editText, this.style);
        } else {
            this.addText(this.text); 
        }
    }

    this.displayEditableText = function() {
        this.removeComponents();

        this.form = document.createElement("FORM");
        this.form.onsubmit = function() { return false; }
        setEventHandler(this.form, "submit", this.saveText);

        var len = this.defaultLength;
        if ((this.text != undefined) && (this.text.length > len)) {
            len = this.text.length;
        }

        this.input = document.createElement("INPUT");
        this.input.className = "TextField";
        this.input.setAttribute("type", "text");
        this.input.setAttribute("name", "text");
        this.input.setAttribute("size", "" + len);

        if (this.text != undefined) {
            this.input.value = this.text; 
        } else {
            this.input.value = ""; 
        }

        this.form.appendChild(this.input);
        this.div.appendChild(this.form);

        this.input.select();
        setEventHandler(this.input, "blur", this.endEdit);
    }

    this.displayFixedText();
}

TextField.prototype = new UIComponent();


/*
 * Selector
 */

function Selector(selected, text, options, id, style)
{
    var self = this;

    this.init(id, style);

    this.selectedId = selected;
    this.text = text; 
    this.options = options; 

    this.setText = function(s) {
        this.text = s;
    }

    this.startSelect = function() {
        self.displaySelect();
    }

    this.endSelect = function() {
        var index = self.select.selectedIndex;
        var id = self.select.options[index].value;
        if (id != self.selectedId) {
            self.selectedId = id
            self.callListeners("selected");
        }
        self.displayText();
    }

    this.displayText = function() {
        this.removeComponents();
        this.addEventLink(this.text, this.startSelect, this.style);
    }

    this.displaySelect = function() {
        this.removeComponents();

        this.form = document.createElement("FORM");
        this.form.onsubmit = function() { return false; }
        setEventHandler(this.form, "submit", this.endSelect);

        this.select = document.createElement("SELECT");
        this.select.className = "Selector";

        for (var i = 0; i < this.options.length; i++) {
            var option = document.createElement("OPTION");
            option.value = this.options[i].id;
            option.text = this.options[i].name;
            if (this.options[i].id == this.selectedId) {
                option.selected = true;
                this.selectedValue = this.options[i].name;
            }
            this.select.appendChild(option);
        }
        
        this.form.appendChild(this.select);
        this.div.appendChild(this.form);

        setEventHandler(this.select, "change", this.endSelect);
        setEventHandler(this.select, "blur", this.endSelect);
    }

    this.displayText();
}

Selector.prototype = new UIComponent();

/*
 * Curtain
 */

function Curtain()
{
    var self = this;
    
    this.init("Curtain", "Curtain");
    this.setVisible(false);

    this.show = function(dialog) {
        this.removeComponents();
        this.addComponent(dialog);
        dialog.addListener(this);
        this.setVisible(true);
    }

    this.handleEvent = function(what, target) {
        if (what == "close")  {
            this.removeComponents();
            this.setVisible(false);
        }
    }

    this.handleClick = function(e) {
        self.setVisible(false);
    }

    this.finished = function() {
        this.removeComponents();
        this.setVisible(false);
    }
    
    // setEventHandler(this.div, "click", this.handleClick);
}
Curtain.prototype = new UIComponent();

function closeUploadPanel(err)
{
    _curtain.finished();
}

function UploadPanel(hidden)
{
    var self = this;
    
    this.hidden = hidden;

    this.init("UploadPanel", "UploadPanel");

    this.buildForm = function() {
        this.form = document.createElement("FORM");
        this.form.method = "POST";
        this.form.action = "observations";
        this.form.enctype = "multipart/form-data";
	
        for (var name in hidden) {
            var input = document.createElement("INPUT");
            input.setAttribute("type", "hidden");
            input.setAttribute("name", name);
            input.setAttribute("value", hidden[name]);
            this.form.appendChild(input);
        }

        this.preview = new UIComponent().init("UploadPreview", "UploadPreview");
        var img = this.preview.addImage(_server.root + "/media/white.gif", "Preview",
                                        "UploadPreviewImage");
        img.id = "UploadPreviewImage";
        this.addComponent(this.preview);
        
        this.fileinput = document.createElement("INPUT");
        this.fileinput.setAttribute("type", "file");
        this.fileinput.setAttribute("name", "photo");
        this.fileinput.className = "Filechooser";
        setEventHandler(this.fileinput, "change", this._showIcon);
        this.form.appendChild(this.fileinput);

        this.message = new UIComponent().init("UploadMessage", "UploadMessage");
        this.addComponent(this.message);
        
        this.form.appendChild(document.createTextNode("Commentaire"));

        this.textarea = document.createElement("TEXTAREA");
        this.textarea.className = "UploadComment";
        this.textarea.setAttribute("name", "comment");
        this.form.appendChild(this.textarea);

        this.div.appendChild(this.form);

        var buttonPanel = new UIComponent().init("UploadButtons",
                                                 "UploadButtons clearfix");
        var button = new Button("UploadButton", "UploadButton FloatLeft",
                                "Annuler", "cancel");
        button.addListener(this);
        buttonPanel.addComponent(button);

        button = new Button("UploadButton", "UploadButton FloatLeft",
                            "Envoyer", "send");
        button.addListener(this);
        buttonPanel.addComponent(button);
        
        this.addComponent(buttonPanel);
    }

    this.handleEvent = function(what, target) {
        if (target.action == "cancel")
            this.cancel();
        else if (target.action == "send")
            this.send();
    }

    this.selectFile = function() {
        //this.fileinput.click();
    }

    this.send = function() {
	var fd = new FormData();
        fd.append("photo", this.fileinput.files[0]);
        fd.append("comment", this.textarea.value);
        for (var name in this.hidden) {
            fd.append(name, this.hidden[name]);
        }

        _server.postFileJSON("observations", fd).then(insertObservation,
                                                      closeUploadPanel);
    }

    this.cancel = function() {
        this.callListeners("close");
    }

    this._showIcon = function(e) {
        self.showIcon(e);
    }

    this.showIcon = function(e) {
        var fileInput = e.target;
        var inputId = e.target.id;
        var file = e.target.files[0];
        if (file.type == "image/jpeg") {
            var reader = new FileReader();
            reader.onload = function(e) {
                //alert("onload");
                var img = document.getElementById("UploadPreviewImage");
                img.src = reader.result;
            }
            reader.readAsDataURL(file);
        } else {
            this.message.innerHTML = "Seulement les images au format JPEG sont acceptées (pour l'instant...).";
        }
    }

    this.buildForm();
    this.selectFile();
}
UploadPanel.prototype = new UIComponent();


/***************************************************
 * App
 ***************************************************/

/*
 * Util
 */

function toDate(d)
{
    var m = 1 + d.getMonth();
    if (m < 10) m = "0" + m;
    var day = d.getDate();
    if (day < 10) day = "0" + day;        
    return "" + d.getFullYear() + "-" + m + "-" + day;
}

function toDayAndMonth(d)
{
    var m = 1 + d.getMonth();
    if (m < 10) m = "0" + m;
    var day = d.getDate();
    if (day < 10) day = "0" + day;        
    return "" + day + "/" + m;
}

//--------------------------------------------------
// Views
//--------------------------------------------------

function ExperimentView(experiment)
{
    this.init("ExperimentView", "ExperimentView",
              document.getElementById("ExperimentView"));

    var matrices = experiment.matrices;
    for (var i = 0; i < matrices.length; i++) {
        var view = new ObservationMatrixView(matrices[i],
                                             experiment.viewStart,
                                             experiment.numWeeks);
        this.addComponent(view);
    }

    this.getMatrixView = function(matrix) {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].matrix && (this.components[i].matrix == matrix))
                return this.components[i];
        }
        return undefined;
    }

    this.getObservationView = function (observation) {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].getObservationView) {
                var view = this.components[i].getObservationView(observation);
                if (view) return view;
            }
        }
        return undefined;
    }

    this.clearMatrices = function() {
        this.removeComponents();
    }
}
ExperimentView.prototype = new UIComponent();


function ObservationMatrixView(matrix, viewStart, numWeeks)
{
    this.init("ObservationMatrixView", "ObservationMatrixView");

    this.addObservationRow = function (observer, observations) {
        var row = new ObservationRowView(observer, observations);
        this.matrixView.addComponent(row);
    }

    this.buildView = function() {
        this.header = new ObservationHeaderView();
        if (this.matrix.plant.variety)
            this.header.setText(this.matrix.plant.family + " - " + this.matrix.plant.variety);
        else
            this.header.setText(this.matrix.plant.family);
        this.addComponent(this.header);

        this.matrixView = new ObservationTableView();
        this.addComponent(this.matrixView);

        this.showObservationRows();

        this.button = new Button("createObserver_" + this.matrix.plant.id,
                                 "",
                                 "Rajouter un ligne pour mes photos.",
                                 "createObserver");
        this.button.addListener(_controller);
        this.button.matrix = this.matrix;
        this.addComponent(this.button);
    }
    
    
    this.clear = function() {
        this.matrixView.removeComponents();
    }

    this.showObservationRows = function() {
        this.clear();
        this.matrixView.addComponent(new ObservationWeekView(viewStart, numWeeks));
        for (var i = 0; i < matrix.observers.length; i++) {
            this.addObservationRow(this.matrix.observers[i], this.matrix.observations[i]);
        }
    }
    
    this.getObservationView = function (observation) {
        if (!this.matrix || this.matrix.plant.id != observation.plantId)
            return undefined;
        
        for (var i = 0; i < this.matrixView.components.length; i++) {
            if (this.matrixView.components[i].getObservationView) {
                var view = this.matrixView.components[i].getObservationView(observation);
                if (view) return view;
            }
        }
        return undefined;
    }

    this.matrix = matrix;
    this.viewStart = viewStart;
    this.numWeeks = numWeeks;
    this.buildView();
}
ObservationMatrixView.prototype = new UIComponent();

function ObservationTableView()
{
    this.init("Table", "Table");
}
ObservationTableView.prototype = new UIComponent();

function ObservationHeaderView()
{
    this.init("ObservationHeaderView", "ObservationHeaderView");

    this.setText = function(s) {
        this.removeComponents();
        this.addText(s);
    }
}
ObservationHeaderView.prototype = new UIComponent();


function ObservationWeekView(date, numWeeks)
{
    this.init("ObservationWeekView", "ObservationWeekView Row");

    this.titleView = new UIComponent().init("WeekTitle", "WeekTitle Column");
    this.titleView.addText("La semaine du ");
    this.addComponent(this.titleView);

    for (var i = 0; i < numWeeks; i++) {
        this.titleView = new UIComponent().init("WeekDate", "WeekDate Column");
        this.titleView.addText(date.getDate() + "/" + (1+date.getMonth()));
        this.addComponent(this.titleView);
        date = new Date(date.getFullYear(),
                        date.getMonth(),
                        date.getDate() + 7,
                        0, 0, 0);
    }
}
ObservationWeekView.prototype = new UIComponent();


function ObservationRowView(observer, observations)
{
    this.init("ObservationRowView", "ObservationRowView Row");

    this.observer = observer;
    this.locationView = new ObservationLocationView(observer);
    this.addComponent(this.locationView);
    this.locationView.moveTo(0, 0);
    
    for (var i = 0; i < observations.length; i++) {
        var view = new ObservationView(observations, i, null); // FIXME: add sensor data
//                                       { "temperature": 20,
//                                         "humidity": 70,
//                                         "sunlight": 10000,
//                                         "water": 40 });
        this.addComponent(view);
        view.moveTo(120 + i * 90, 0);
    }

    this.getObservationView = function (observation) {
        if (!this.observer || this.observer.locationId != observation.locationId)
            return undefined;

        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].getObservationView) {
                var view = this.components[i].getObservationView(observation);
                if (view) return view;
            }
        }
        return undefined;
    }
}
ObservationRowView.prototype = new UIComponent();


function ObservationLocationView(observer)
{
    this.init("ObservationLocationView", "ObservationLocationView Column");
    this.addLink(observer.accountId,
                 "https://p2pfoodlab.net/community/people/" + observer.accountId + "/notebook",
                 "ObservationLocationView");
    this.addBreak();
    this.addText(observer.locationName, "ObservationLocationView");
}
ObservationLocationView.prototype = new UIComponent();


function ObservationView(observations, col, data)
{
    this.init("ObservationView", "ObservationView Column");
    this.col = col;
    this.observations = observations;
    this.data = data;

    this.startSpinningWheel = function () {
        this.image.src = "spinner.gif";
    }

    this.stopSpinningWheel = function () {
    }

    this.getObservationView = function (observation) {
        if (!this.observations || this.observations[this.col].id != observation.id)
            return undefined;
        return this;
    }

    this.updateObservation = function () {
        this.removeComponents();
        if (this.data) 
            this.addComponent(new DataView(this.data));
        else 
            this.addComponent(new EmptyDataView());
        
        if (this.observations[col].thumbnail) 
            this.image = this.addImage(_server.root + "/" + this.observations[col].thumbnail,
                                       "" /*obs.date*/, "ObservationView");
        else 
            this.image = this.addImage(_server.root + "/media/white.gif", "",
                                       "EmptyObservationView");
        
        this.ops = new ObservationOps(this.observations[this.col]);
        this.addComponent(this.ops);
    }

    this.updateObservation();
}
ObservationView.prototype = new UIComponent();


function DataView(data)
{
    this.init("DataView", "DataView");

    var icon;
    var level;
    level = Math.floor(data.temperature / 3);
    if (level < 0) level = 0;
    if (level > 11) level = 11;
    icon = new DataIcon("Température", data.temperature, level, "TempValue");
    icon.moveTo(0, 4);
    this.addComponent(icon);

    level = Math.floor(data.humidity / 9);
    if (level < 0) level = 0;
    if (level > 11) level = 11;
    icon = new DataIcon("Humidité", data.humidity, level, "HumidityValue");
    icon.moveTo(22, 4);
    this.addComponent(icon);

    level = Math.floor(2 * Math.log(data.sunlight) / Math.LN10)
    if (level < 0) level = 0;
    if (level > 11) level = 11;
    icon = new DataIcon("Soleil", data.sunlight, level, "SunValue");
    icon.moveTo(44, 4);
    this.addComponent(icon);

    level = Math.floor(data.water / 9);
    if (level < 0) level = 0;
    if (level > 11) level = 11;
    icon = new DataIcon("Humidité du sol", data.water, level, "SoilValue");
    icon.moveTo(66, 4);
    this.addComponent(icon);
}
DataView.prototype = new UIComponent();

function DataIcon(name, value, level, style)
{
    this.init("DataIcon", "DataIcon " + style);
    this.valueView = new UIComponent().init("DataValue", "DataValue");
    this.valueView.moveTo(0, 12 - level);
    this.valueView.resize(10, level);
    this.addComponent(this.valueView);
}
DataIcon.prototype = new UIComponent();


function EmptyDataView()
{
    this.init("DataView", "DataView");
    for (var i = 0; i < 4; i++) 
        this.addComponent(new EmptyDataIcon());
}
EmptyDataView.prototype = new UIComponent();


function EmptyDataIcon(name, value, level, style)
{
    this.init("DataIcon", "DataIcon");
}
EmptyDataIcon.prototype = new UIComponent();


function ObservationOps(observation)
{
    this.init("ObservationOps", "ObservationOps clearfix");

    this.uploadButton = new Button("UploadObs", "ObsOp FloatLeft", "U", "upload");
    this.uploadButton.addListener(_controller);
    this.uploadButton.observation = observation;
    this.addComponent(this.uploadButton);

    //this.commentButton = new Button("CommentObs", "ObsOp FloatLeft", "C", "comment");
    //this.commentButton.addListener(ctrl);
    //this.commentButton.observation = observation;
    //this.addComponent(this.commentButton);
}
ObservationOps.prototype = new UIComponent();



//--------------------------------------------------
// Controller
//--------------------------------------------------

function ExperimentController(experiment)
{
    var self = this;
    this.experiment = experiment;

    this.buildView = function() {
        this.view = new ExperimentView(this.experiment);
    }

    this.handleEvent = function(what, target) {
        if (what == "clicked" && target.action == "upload") {
            var observer = target.observation.observer;
            var date = new Date(this.experiment.viewStart.getFullYear(),
                                this.experiment.viewStart.getMonth(),
                                this.experiment.viewStart.getDate() + target.observation.col * 7,
                                12, 0, 0); // FIXME
            var hidden = { "accountId": observer.accountId,
                           "locationId": observer.locationId,
                           "plantId": observer.plantId,
                           "experimentId": observer.experimentId,
                           "date": toDate(date) };
            if (target.observation.id)
                hidden.id = target.observation.id;
            _curtain.show(new UploadPanel(hidden));
        }
        if (what == "clicked" && target.action == "createObserver") {
            var matrix = target.matrix;
            var observer = {
                "experimentId": this.experiment.id,
                "plantId": matrix.plant.id
            };
            _server.postJSON("observers", observer).then(function (r) {
                if (r.error) alert(r.message);
                else {
                    matrix.addObserver(r);
                    var view = self.view.getMatrixView(matrix);
                    if (view) view.showObservationRows();
                }
            }); 
        }
    }
    
    this.insertObservation = function (observation) {
        observation.date = new Date(observation.date);
        this.experiment.insertObservation(observation);
        var view = this.view.getObservationView(observation);
        if (view) view.updateObservation();
        else alert("view is undefined");
    }
}

function insertObservation(data)
{
    _curtain.finished();
    if (data.error) {
        alert(data.message);
        return;
    }
    _controller.insertObservation(data);
}

function showWeek(s)
{
    /*
    _startDate = new Date(s);
    _endDate = new Date(_startDate.getFullYear(),
                        _startDate.getMonth(),
                        _startDate.getDate() + _numWeeks * 7,
                        0, 0, 0);
    _observations.showMatrices();
*/
}

//--------------------------------------------------
// Model
//--------------------------------------------------

function Observation(observer, col)
{
    this.observer = observer;
    this.col = col;
}

function ObservationMatrix(plant, cols)
{
    this.cols = cols;
    this.plant = plant;
    this.observers = [];
    this.observations = [];
    this.map = {};

    this.addObserver = function(observer) {
        var observations = [];
        var row = this.observers.length;
        for (var col = 0; col < this.cols; col++)
            observations.push(new Observation(observer, col));
        this.observers.push(observer);
        this.observations.push(observations);
        this.map[observer.locationId] = observations;
    }

    this.addObservation = function(obs, col) {
        var observations = this.map[obs.locationId];
        var observation = observations[col];
        observation.id = obs.id;
        observation.date = obs.date;
        observation.orig = obs.orig;
        observation.small = obs.small;
        observation.thumbnail = obs.thumbnail;
    }
}

function Experiment(e, numWeeks)
{
    this.id = e.id;
    this.plants = e.plants;
    this.name = e.name;
    this.prettyname = e.prettyname;
    this.startDate = new Date(e.startDate);
    this.numWeeks = numWeeks;
    this.matrices = [];
    this.map = {};
    
    for (var i = 0; i < this.plants.length; i++) {
        var matrix = new ObservationMatrix(this.plants[i], this.numWeeks);
        this.matrices.push(matrix);
        this.map[this.plants[i].id] = matrix;
    }

    this.setObservers = function(obs) {
        for (var i = 0; i < obs.length; i++) {
            var plantId = obs[i].plantId;
            var matrix = this.map[plantId];
            matrix.addObserver(obs[i]);
        }
    }

    this.insertObservation = function(observation) {
        var col = this.getWeekNum(observation.date);
        for (var i = 0; i < this.matrices.length; i++) {
            if (this.matrices[i].plant.id == observation.plantId) {
                this.matrices[i].addObservation(observation, col);
            }
        }
    }
    
    this.getWeekNum = function(date) {
 	return Math.floor((date.getTime() - this.viewStart.getTime()) / 604800000);            
    }
    
    this.setObservations = function(observations) {
        for (var i = 0; i < observations.length; i++) {
            var plantId = observations[i].plantId;
            var matrix = this.map[plantId];
            observations[i].date = new Date(observations[i].date);
 	    var column = this.getWeekNum(observations[i].date);
            matrix.addObservation(observations[i], column);
        }
    }
}

//--------------------------------------------------

var _numWeeks = 12;
var _server = undefined;
var _experiment = undefined;
var _controller = undefined;
var _curtain = undefined;

function showObservations(url, id)
{
    _curtain = new Curtain();
    document.getElementById("Body").appendChild(_curtain.div);

    _server = new Server(url);
    
    // First, load all the data and construct the data structure, aka
    // the 'model'.
    _server.getJSON("experiments/" + id + ".json").then(function(e) {
        _experiment = new Experiment(e, _numWeeks);

        var today = new Date();
        var daysTillSunday = today.getDay() == 0? 7 : 7 - today.getDay();
        var viewEnd = new Date(today.getFullYear(), today.getMonth(),
                            today.getDate() + daysTillSunday, 0, 0, 0);
        var viewStart = new Date(today.getFullYear(), today.getMonth(),
                                 today.getDate() + daysTillSunday - _numWeeks * 7,
                                 0, 0, 0);

        if (viewStart.getTime() < _experiment.startDate.getTime()) {
            viewStart = _experiment.startDate;
            viewEnd = new Date(viewStart.getFullYear(), viewStart.getMonth(),
                                viewStart.getDate() + 7 * _numWeeks, 23, 59, 59);
        }
        _experiment.viewStart = viewStart;
        _experiment.viewEnd = viewEnd;
        
        return _server.getJSON("observers.json?experiment=" + id);

    }).then(function(obs) {
        _experiment.setObservers(obs);
        return _server.getJSON("observations.json?"
                               + "experiment=" + id
	                       + "&from=" + toDate(_experiment.viewStart)
			       + "&to=" + toDate(_experiment.viewEnd));
    }).then(function(obs) {
        _experiment.setObservations(obs);
        // Now create the controller and build the view.
        _controller = new ExperimentController(_experiment);
        _controller.buildView();

        // List of date selectors
        /*
        var date = new Date(_experiment.startDate);
        var div = document.getElementById("DateSelection");
        for (var i = 0; i < 9; i++) {
            var a = document.createElement("A");
            a.className = "DateSelector";
            a.setAttribute("href", "javascript:void(0)");
            a.innerHTML = toDayAndMonth(date);
            a.onclick = function() { return false; }
            a.onmousedown = function() { return false; }
            setEventHandler(a, "click", alert);  // TODO
            div.appendChild(a);
            date = new Date(date.getFullYear(), date.getMonth(),date.getDate() + 28);
        }
        */
    });
}

