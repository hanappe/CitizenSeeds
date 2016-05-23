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
        if (this.div.className)
            this.div.className += " " + style
        else this.div.className = style;
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

    this.setWidth = function(w) {
        this.div.style.width = w + "px";
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

    this.addText = function(text, style, parent) {
        var e;
        if (!style) {
            e = document.createTextNode(text);
        } else {
            var e = document.createElement("SPAN");
            e.className = style;
            e.innerHTML = text;
        }
        if (parent) parent.appendChild(e);
        else this.div.appendChild(e);
    }

    this.addGlyphButton = function(glyphname, types, callback) {
        var a = this.addGlyph(glyphname, callback);
        a.className = "btn btn-default " + types;
        return a;
    }

    this.addGlyph = function(glyphname, callback, parent, className) {
        var a = document.createElement("A");
        a.setAttribute("href", "javascript:void(0)");
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        if (callback) setEventHandler(a, "click", callback);
        var span = document.createElement("SPAN");
        span.className = "glyphicon " + glyphname;
        if (className) span.className = "glyphicon " + glyphname + " " + className;
        else span.className = "glyphicon " + glyphname;
        a.appendChild(span);
        if (parent) parent.appendChild(a);
        else this.div.appendChild(a);
        return a;
    }

    this.setGlyph = function(a, glyphname, callback, className) {
        if (className) a.firstChild.className = "glyphicon " + glyphname + " " + className;
        else a.firstChild.className = "glyphicon " + glyphname;
        setEventHandler(a, "click", callback);
    }
    
    this.addBreak = function() {
        this.div.appendChild(document.createElement("BR"));
    }

    this.addButton = function(text, callback, type, parent) {
        var a = document.createElement("A");
        a.setAttribute("href", "javascript:void(0)");
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        a.appendChild(document.createTextNode(text));
        setEventHandler(a, "click", callback);
        if (type) a.className = "btn " + type;
        else a.className = "btn btn-default";
        if (parent) parent.appendChild(a);
        else this.div.appendChild(a);
        return a;
    }

    this.addLink = function(anchorText, href, className) {
        var a = document.createElement("A");
        a.className = className;
        a.setAttribute("href", href);
        a.appendChild(document.createTextNode(anchorText));
        this.div.appendChild(a);
        return a;
    }

    this.addEventLink = function(anchorText, handler, className, parent) {
        var a = document.createElement("A");
        a.className = className;
        a.setAttribute("href", "javascript:void(0)");
        a.innerHTML = anchorText;
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", handler);
        if (parent) parent.appendChild(a);
        else this.div.appendChild(a);
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


    this.addEventImage = function(src, alt, className, handler) {
        var a = document.createElement("A");
        a.className = className;
        a.setAttribute("href", "javascript:void(0)");
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", handler);

        var img = document.createElement("IMG");
        img.src = src;
        if (alt) {
            img.alt = alt;
            img.title = alt;
        } 
        if (className)
            img.className = className;

        a.appendChild(img);
        this.div.appendChild(a);

        return a;
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
        for (var i = 0; i < this.components.length; i++) {
            component = this.components[i];
            if (component == c) {
                this.components.splice(i, 1);
                break;
            }
        }
        for (var i = 0; i < this.div.childNodes.length; i++) {	    
            e = this.div.childNodes[i];
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
        if (typeof self.action === 'function')
            self.action(this);
        else self.callListeners("clicked");
    }

    this.setText = function(s) {
        this.text = text;
        this.link.innerHTML = s; 
    }

    this.init(id, style);
    this.link = this.addEventLink(text, this.clicked, "button " + style);
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
        var body = document.getElementById("Body");
        body.className = "noscroll";
        this.removeComponents();
        this.addComponent(dialog);
        dialog.addListener(this);
        this.setVisible(true);
        setEventHandler(dialog.div, "click", function (e) {
            if (e.stopPropagation) e.stopPropagation();
            if (window.event && window.event.cancelBubble) window.event.cancelBubble = true;
        });
    }

    this.handleEvent = function(what, target) {
        if (what == "close")  {
            this.removeComponents();
            this.setVisible(false);
        }
    }

    this.handleClick = function(e) {
        self.setVisible(false);
        //setEventHandler(self.div, "click", null);
    }

    this.finished = function() {
        var body = document.getElementById("Body");
        body.className = "";
        this.setVisible(false);
    }

    setEventHandler(this.div, "click", this.handleClick);
}
Curtain.prototype = new UIComponent();

function UploadPanel(hidden, doneCallback, cancelCallback, errorCallback, progressCallback)
{
    var self = this;
    
    this.hidden = hidden;
    this.doneCallback = doneCallback;
    this.cancelCallback = cancelCallback;
    this.errorCallback = errorCallback;
    this.progressCallback = progressCallback;
    
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
        this.fileinput.setAttribute("accept", "image/*");
        this.fileinput.setAttribute("capture", "camera");
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
                                "Annuler", this.cancelCallback);
        button.addListener(this);
        buttonPanel.addComponent(button);

        button = new Button("UploadButton", "UploadButton FloatLeft",
                            "Envoyer", this.send);
        button.addListener(this);
        buttonPanel.addComponent(button);
        
        this.addComponent(buttonPanel);
    }

    this.selectFile = function() {
        //this.fileinput.click();
    }

    this.send = function() {
	var fd = new FormData();
        fd.append("photo", self.fileinput.files[0]);
        fd.append("comment", self.textarea.value);
        for (var name in self.hidden) {
            fd.append(name, self.hidden[name]);
        }
        if (_curtain) _curtain.finished(); // FIXME
        _server.postFileJSON("observations", fd, self.progressCallback).then(self.doneCallback,
                                                                             self.errorCallback);
    }

    this.cancel = function() {
        if (self.cancelCallback)
            self.cancelCallback();
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

function toDateWithHMS(d)
{
/*
    var m = 1 + d.getMonth();
    if (m < 10) m = "0" + m;
    var day = d.getDate();
    if (day < 10) day = "0" + day;        
    var H = date.getHours();
    if (H < 10) H = "0" + H;        
    var M = date.getMinutes();
    if (M < 10) M = "0" + M;        
    var S = date.getSeconds();
    if (S < 10) S = "0" + S;        
    S = "" + S + ".000Z";
*/
    return d.toISOString();
}

function toDayAndMonth(d)
{
    var m = 1 + d.getMonth();
    if (m < 10) m = "0" + m;
    var day = d.getDate();
    if (day < 10) day = "0" + day;        
    return "" + day + "/" + m;
}

function pad(num)
{
    var norm = Math.abs(Math.floor(num));
    return (norm < 10 ? "0" : "") + norm;
}

function formatValue(value, digits)
{
    if (digits) n = Math.pow(10, digits);
    else n = 10;
    return Math.round(value * n) / n;
}

function formatDateHour(date)
{
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + " à " + date.getHours() + "h" + pad(date.getMinutes());
}

function formatDate(date)
{
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear();
}

function randomString(length)
{
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var randomstring = '';
    for (var i = 0; i < length; i++) {
	var rnum = Math.floor(Math.random() * chars.length);
	randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
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
        _prof.start("new ObservationMatrixView[" + i + "]");
        var view = new ObservationMatrixView(matrices[i],
                                             experiment.viewStart,
                                             experiment.numWeeks,
                                             i > 0);
        _prof.stop("new ObservationMatrixView[" + i + "]");
        this.addComponent(view);
        _prof.mark("add ObservationMatrixView[" + i + "]");
    }

    this.updateView = function() {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].matrix)
                this.components[i].updateView();
        }
    }

    this.updateSensorData = function() {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].matrix)
                this.components[i].updateSensorData();
        }
    }

    this.getMatrixView = function(matrix) {
        //alert("length=" + this.components.length);
        for (var i = 0; i < this.components.length; i++) {
            //alert("ExperimentView, component " + i + ", found=" + (this.components[i].matrix == matrix) + ", matrix=" + JSON.stringify(matrix) + ", components.matrix=" + JSON.stringify(matrix));
            if (this.components[i].matrix && (this.components[i].matrix == matrix))
                return this.components[i];
        }
        return undefined;
    }

    this.getMatrixViewByPlantId = function(id) {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].matrix 
                && this.components[i].matrix.plant 
                && (this.components[i].matrix.plant.id == id))
                return this.components[i];
        }
        return undefined;
    }

    this.getObservationView = function(plant, location, col) {
        for (var i = 0; i < this.components.length; i++) {
            if (this.components[i].matrix && (this.components[i].matrix.plant.id == plant))
                return this.components[i].getObservationView(location, col);
        }
        return undefined;
    }
    
    this.clearMatrices = function() {
        this.removeComponents();
    }
}
ExperimentView.prototype = new UIComponent();


function ObservationMatrixView(matrix, viewStart, numWeeks, collapsed)
{
    var self = this;
    this.init("ObservationMatrixView", "container-fluid ObservationMatrixView");

    this.rows = [];
    
    this.updateView = function() {
        for (var i = 0; i < this.rows.length; i++)
            this.rows[i].updateView();
    }

    this.updateSensorData = function() {
        for (var i = 0; i < this.rows.length; i++)
            this.rows[i].updateSensorData();
    }

    this.getObservationView = function(location, col) {
        for (var i = 0; i < this.rows.length; i++) {
            if (this.rows[i].observer.locationId == location)
                return this.rows[i].getObservationView(col);
        }
        return undefined;
    }

    this.buildHeader = function(collapsed) {
        this.header = new ObservationHeaderView(this, collapsed);

        var text = this.matrix.plant.family;
        if (this.matrix.plant.variety)
            text += " - " + this.matrix.plant.variety;
        if (this.matrix.plant.note)
            text += "  - " + this.matrix.plant.note;
        this.header.setText(text);            
        this.addComponent(this.header);
    }

    this.addObservationRow = function (observer, observations) {
        var row = new ObservationRowView(observer, observations);
        this.rows.push(row);
        this.matrixView.addComponent(row);
    }

    this.buildObservationRows = function() {
        this.clear();
        this.matrixView.addComponent(new ObservationWeekView(viewStart, numWeeks));
        _prof.mark("new ObservationWeekView");
        for (var i = 0; i < matrix.observers.length; i++) {
            _prof.start("new ObservationRowView[" + i + "]");
            this.addObservationRow(this.matrix.observers[i], this.matrix.observations[i]);
            _prof.stop("new ObservationRowView[" + i + "]");
        }
    }
    
    this.buildMatrixView = function() {
        this.matrixView = new ObservationTableView();
        this.addComponent(this.matrixView);
        this.buildObservationRows();
        // FIXME
        this.button = new Button("createObserver_" + this.matrix.plant.id,
                                 "",
                                 "Rajouter une ligne pour mes photos.",
                                 "createObserver");
        this.button.addListener(_controller);
        this.button.matrix = this.matrix;
        this.addComponent(this.button);
    }

    this.buildPlaceHolder = function() {
        this.placeholder = document.createElement("DIV");
        this.placeholder.className = "matrix-collapsed";
        this.placeholder.innerHTML = "Cliquez sur <span class='glyphicon glyphicon-chevron-down'></span> pour voir les images";
        this.div.appendChild(this.placeholder);
    }

    this.buildView = function() {
        this.removeComponents();
        if (this.collapsed) this.buildViewCollapsed();
        else this.buildViewExpanded();
    }

    this.buildViewCollapsed = function() {
        this.buildHeader(true);
        this.buildPlaceHolder();
        this.placeholder.className = "matrix-collapsed visible";
    }
    
    this.buildViewExpanded = function() {
        this.buildHeader(false);
        this.buildMatrixView();
        this.buildPlaceHolder();
        this.placeholder.className = "matrix-collapsed hidden";
    }
    
    this.clear = function() {
        this.matrixView.removeComponents();
    }
    
    this.collapse = function() {
        if (this.matrixView) {
            this.matrixView.setVisible(false);
            this.button.setVisible(false);
        }
        if (!this.placeholder)
            this.buildPlaceHolder();
        this.placeholder.className = "matrix-collapsed visible";
        this.collapsed = true;
    }
    
    this.expand = function() {
        if (!this.matrixView) {
            this.buildMatrixView();
        }
        this.matrixView.setVisible(true);
        this.button.setVisible(true);
        if (this.placeholder)
            this.placeholder.className = "matrix-collapsed hidden";

        this.collapsed = false;
    }
    
    this.matrix = matrix;
    this.viewStart = viewStart;
    this.numWeeks = numWeeks;
    this.collapsed = collapsed;
    this.buildView();
}
ObservationMatrixView.prototype = new UIComponent();

function ObservationTableView()
{
    this.init("Table", "Table");
}
ObservationTableView.prototype = new UIComponent();


function ObservationHeaderView(parent, collapsed)
{
    var self = this;
    this.init("ObservationHeaderView", "row");
        
    this.collapse = function() {
        parent.collapse();
        this.setGlyph(this.glyph,
                      "glyphicon-chevron-down",
                      function() { self.expand(); },
                      "white");
    }
    
    this.expand = function() {
        parent.expand();
        this.setGlyph(this.glyph,
                      "glyphicon-chevron-up",
                      function() { self.collapse(); },
                      "white");
    }

    this.setText = function(s) {
        this.title.innerHTML = s;
    }

    this.cols = document.createElement("DIV");
    this.cols.className = "col-sm-12";
    this.div.appendChild(this.cols);

    this.content = document.createElement("DIV");
    this.content.className = "matrix-header";
    this.cols.appendChild(this.content);

    if (collapsed)
        this.glyph = this.addGlyph("glyphicon-chevron-down",
                                   function() { self.expand(); },
                                   this.content,
                                   "white");
    else
        this.glyph = this.addGlyph("glyphicon-chevron-up",
                                   function() { self.collapse(); },
                                   this.content,
                                   "white");
    
    this.title = document.createElement("SPAN");
    this.content.appendChild(this.title);
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
                        12, 0, 0);
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
    this.cells = [];
    
    this.buildView = function() {
        for (var i = 0; i < observations.length; i++) {
            this.cells[i] = new ObservationView(this, observer, observations[i], i);
            _prof.mark("new ObservationView[" + i + "]");
            this.addComponent(this.cells[i]);
            this.cells[i].moveTo(120 + i * 90, 0);
        }
    }
    
    this.getObservationView = function(col) {
        return this.cells[col];
    }
    
    this.updateView = function() {
        for (var i = 0; i < this.cells.length; i++)
            this.cells[i].updateView();
    }
    
    this.updateSensorData = function() {
        for (var i = 0; i < this.cells.length; i++)
            this.cells[i].updateSensorData();
    }

    this.updateObservationView = function(col) {
        this.cells[col].updateObservation();
    }

    this.buildView();
}
ObservationRowView.prototype = new UIComponent();


function ObservationLocationView(observer)
{
    this.init("ObservationLocationView", "ObservationLocationView Column");
    this.addLink(observer.accountId,
                 _server.root + "people/" + observer.accountId + ".html",
                 "ObservationLocationView");
    if (observer.blog || observer.vlog) {
        this.addBreak();
        if (observer.blog)
            this.addLink("blog", observer.blog, "observer-blog");
        if (observer.blog && observer.vlog) 
            this.addText(" - ", "");
        if (observer.vlog)
            this.addLink("videos", observer.vlog, "observer-blog");
    }
    this.addBreak();
    var text = observer.locationName;
    if (observer.locationCity)
        text += ", " + observer.locationCity;
    if (observer.locationCountry)
        text += ", " + observer.locationCountry;
    this.addText(text, "ObservationLocationData");
}
ObservationLocationView.prototype = new UIComponent();


function PhotoViewer(observations)
{
    this.init("PhotoViewer", "PhotoViewer");
    for (var i = 0; i < observations.length; i++) { 
        this.addEventImage(_server.root + "/" + observations[i].small,
                           "", "PhotoViewer", function() { _curtain.finished(); });
    }
}
PhotoViewer.prototype = new UIComponent();

function ObservationView(row, observer, observations, col)
{
    this.init("ObservationView", "ObservationView Column");
    this.row = row;
    this.col = col;
    this.observer = observer;
    this.observations = observations;
    this.startDate = new Date(_experiment.startDate.getFullYear(),
                              _experiment.startDate.getMonth(),
                              _experiment.startDate.getDate() + col * 7,
                              12, 0, 0);
    
    var self = this;
    
    this.setProgress = function (value) {
        if (!this.progress) {
            this.image.src = _server.root + "/media/spinner.gif";
            this.image.className = "Spinner";
            this.progress = new ProgressBar();
            this.addComponent(this.progress);
        }
        this.progress.setValue(value);
    }

    this.uploadPhoto = function() {
        // Make sure that the visitor is logged in BEFORE uploading
        // the photo. And that she isn't uploading a photo for someone
        // else's row of observations.
        _server.getJSON("login").then(function(e) {
            if (e.error) alert(e.message);
            else {
                if (!_account || !_account.id) {
                    _account = e;
                    _accountPanel.update();
                }
                if (observer.accountId != e.id)
                    alert("Il semblerait que cette ligne d'observations appartient à quelqu'un d'autre.");
                else self._uploadPhoto();
            }
        });
    }
    
    this._uploadPhoto = function () {
        var date = new Date(_controller.experiment.viewStart.getFullYear(),
                            _controller.experiment.viewStart.getMonth(),
                            _controller.experiment.viewStart.getDate() + col * 7,
                            12, 0, 0); // FIXME
        var hidden = { "accountId": observer.accountId,
                       "locationId": observer.locationId,
                       "plantId": observer.plantId,
                       "experimentId": observer.experimentId,
                       "date": toDateWithHMS(date) };
        //alert("date=" + toDateWithHMS(date));
        _curtain.show(new UploadPanel(hidden,
                                      function(data) {
                                          if (data.error) {
                                              alert(data.message);
                                              self.updateObservation();
                                          } else {
                                              _controller.insertObservation(data);
                                              if (data.col != self.col)
                                                  row.updateObservationView(data.col);
                                              self.updateObservation();
                                          }
                                      },
                                      function() {
                                          _curtain.finished();
                                          self.updateObservation();
                                      },
                                      function() {
                                          _curtain.finished();
                                          self.updateObservation();
                                      },
                                      function(value) {
                                          self.setProgress(value);
                                      }));
    }

    this.updateView = function () {
        this.updateObservation();
    }

    this.updateSensorData = function () {
        if (this.observer.deviceId) {
            var id = "" + this.observer.deviceId + "-" + toDate(this.startDate);
            this.sensordata = _experiment.sensordata[id];
            this.updateObservation();
        }
    }
    
    this.updateObservation = function () {
        this.removeComponents();
        this.progress = undefined;

        if (this.sensordata) 
            this.addComponent(new DataView(this.observer, this.sensordata));
        else 
            this.addComponent(new EmptyDataView());

        var index = -1;
        for (var i = 0; i < this.observations.length; i++) {
            if (this.observations[i].thumbnail) {
                index = i;
                break;
            }
        }
        
        if (index >= 0) {
            var src = _server.root + "/" + this.observations[index].thumbnail;
            this.image = this.addEventImage(src, "", "ObservationView",
                                            function() {
                                                if (self.observations.length == 1)
                                                    _curtain.show(new Slideshow(self.observations));
                                                else
                                                    _curtain.show(new Slideshow(self.observations));

                                            });
        } else {
            this.image = this.addImage(_server.root + "/media/white.gif", "",
                                       "EmptyObservationView");
        }
        if (this.observations.length > 1) {
            var count = document.createElement("DIV");
            count.className = "ObservationCount";
            count.innerHTML = "x" + this.observations.length;
            this.div.appendChild(count);
        }
        
        this.ops = new ObservationOps(this);
        this.addComponent(this.ops);
    }

    this.updateObservation();
}
ObservationView.prototype = new UIComponent();


function ProgressBar()
{
    this.init("ProgressBar", "ProgressBar");
    this.valueView = new UIComponent().init("ProgressValue", "ProgressValue");
    this.valueView.moveTo(0, 0);
    this.addComponent(this.valueView);

    this.setValue = function (value) {
        this.valueView.setWidth(Math.floor(value * 0.8)); // FIXME: assumes max width of 80px
    }
}
ProgressBar.prototype = new UIComponent();


function DataView(observer, data)
{
    this.init("DataView", "DataView");
    this.observer = observer;
    
    var icon;
    var level;
    var self = this;
    
    level = Math.floor(data.temperature.avg / 3);
    if (level < 0) level = 0;
    if (level > 10) level = 10;
    icon = new DataIcon("Température", level, "TempValue");
    this.addComponent(icon);

    this.div.title = ("Température moyenne : " + formatValue(data.temperature.avg) + " deg. C\n"
                      + "Humidité du sol : " + formatValue(data.soilhumidity.avg)  + "%\n"
                      + "Lumière moyenne : " + formatValue(data.sunlight.dli) + " mol/m2/j\n"
                      + "Cliquez pour voir les graphiques détaillées"); 
    
    level = 2 * data.sunlight.dli;
    if (level > 10) level = 10;
    icon = new DataIcon("Soleil", level, "SunValue");
    this.addComponent(icon);

    // From Parrot (https://flowerpowerdev.parrot.com/projects/flower-power-web-service-api/wiki/How_Flower_Power_works)
    //
    // The typical soil moisture range is between 8 (very dry) to 45
    // (saturated). Generally, most plants require watering when the
    // soil moisture is in the range of 12 to 18. If the soil moisture
    // stays > 40 for too long, this may be harmful to some plants.
    level = data.soilhumidity.avg;
    if (level < 8) level = 0;
    else if (level > 45) level = 10;
    else level = 10.0 * (data.soilhumidity.avg - 8.0) / 37.0;
    icon = new DataIcon("Humidité du sol", level, "SoilValue");
    this.addComponent(icon);

    setEventHandler(this.div, "click", function() {
        _curtain.show(new SensorDataViewer(observer, data)); });
}
DataView.prototype = new UIComponent();

function DataIcon(name, level, style)
{
    this.init("DataIcon", "DataIcon " + style);
    this.valueView = new UIComponent().init("DataValue", "DataValue");
    this.valueView.moveTo(0, 10 - level);
    this.valueView.resize(10, level);
    this.addComponent(this.valueView);
}
DataIcon.prototype = new UIComponent();


function EmptyDataView()
{
    this.init("DataView", "DataView");
    for (var i = 0; i < 3; i++) 
        this.addComponent(new EmptyDataIcon());
}
EmptyDataView.prototype = new UIComponent();


function EmptyDataIcon(name, value, level, style)
{
    this.init("DataIcon", "DataIcon");
}
EmptyDataIcon.prototype = new UIComponent();


function ObservationOps(parent)
{
    this.init("ObservationOps", "ObservationOps clearfix");

    this.uploadButton = new Button("UploadObs", "ObsOp FloatLeft", "U",
                                   function() { parent.uploadPhoto(); });
    this.addComponent(this.uploadButton);
}
ObservationOps.prototype = new UIComponent();


function SensorDataViewer(observer, data)
{
    var self = this;
    
    this.init("SensorDataViewer", "SensorDataViewer");
    this.observer = observer;
    this.data = data;
    this.graphs = [ null, null, null ];

    this.dataUrl = function(id) {
        return "datastreams/" + id + "/datapoints.json?from=" + this.data.from + "&to=" + this.data.to;
    }
    
    this.showTemperature = function() {
        _server.getJSON(this.dataUrl(data.temperature.datastreamId)).then(function(e) {
            if (e.error) alert(e.message);
            else {
                var data = [];
                for (var i = 0; i < e.length; i++)
                    data.push([new Date(e[i].date), e[i].value]);
                var graph = new Dygraph(self.temperatureDiv,
                                data, 
                                { labels: [ "Date", self.data.temperature.datastreamDescription + " (" + self.data.temperature.datastreamUnit + ")" ],
                                  includeZero: true });
                self.graphs[0] = graph;
            }
        });
    }

    this.showSoilHumidity = function() {
        _server.getJSON(this.dataUrl(data.soilhumidity.datastreamId)).then(function(e) {
            if (e.error) alert(e.message);
            else {
                var data = [];
                for (var i = 0; i < e.length; i++)
                    data.push([new Date(e[i].date), e[i].value]);
                var graph = new Dygraph(self.soilhumidityDiv,
                                data, 
                                { labels: [ "Date", self.data.soilhumidity.datastreamDescription + " (" + self.data.soilhumidity.datastreamUnit + ")" ],
                                  includeZero: true });
                self.graphs[0] = graph;
            }
        });
    }

    this.showSunlight = function() {
        _server.getJSON(this.dataUrl(data.sunlight.datastreamId)).then(function(e) {
            if (e.error) alert(e.message);
            else {
                var data = [];
                for (var i = 0; i < e.length; i++)
                    data.push([new Date(e[i].date), e[i].value]);
                var graph = new Dygraph(self.sunlightDiv,
                                data, 
                                { labels: [ "Date", self.data.sunlight.datastreamDescription + " (" + self.data.sunlight.datastreamUnit + ")" ],
                                  includeZero: true });
                self.graphs[0] = graph;
            }
        });
    }

    this.showDate = function(date) {
        var id = "" + this.observer.deviceId + "-" + date;
        this.data = _experiment.sensordata[id];
        this.buildView();
    }

    this.formatDate = function(date) {
        return "le " + formatDateHour(new Date(date));
    }

    this.buildView = function() {
        this.removeComponents();

        this.addGlyph("glyphicon-remove", function() { _curtain.finished(); } );
        
        //this.addEventImage(_server.root + "/media/close.png", "Fermer les graphiques", "",
        //                   function() { _curtain.finished(); } );

        var dates = [{ "iso": "2015-05-02", "short": "02/05" }, // FIXME
                     { "iso": "2015-05-09", "short": "09/05" },
                     { "iso": "2015-05-16", "short": "16/05" },
                     { "iso": "2015-05-23", "short": "23/05" },
                     { "iso": "2015-05-30", "short": "30/05" },
                     { "iso": "2015-06-06", "short": "06/06" },
                     { "iso": "2015-06-13", "short": "13/06" },
                     { "iso": "2015-06-20", "short": "20/06" },
                     { "iso": "2015-06-27", "short": "27/06" }
                    ];
        
        var count = 0;
        this.addText(" Semaine : ");
        for (var i = 0; i < dates.length; i++) {
            var id = "" + this.observer.deviceId + "-" + dates[i].iso;
            if (_experiment.sensordata[id]) {
                if (count > 0) this.addText(" - ");
                this.addEventLink(dates[i].short, new function(d) { this.showDate = function() { self.showDate(d); }}(dates[i].iso).showDate);
                count++;
            }
        }
        if (this.data) {
            this.temperatureDiv = document.createElement("DIV");
            this.temperatureDiv.className = "SensorDataGraph";
            this.div.appendChild(this.temperatureDiv);

            var infoDiv = document.createElement("DIV");
            infoDiv.className = "SensorDataInfo";
            infoDiv.innerHTML = ("Température moyenne : " + formatValue(this.data.temperature.avg) + "&deg;C<br>" 
                                 + "Min : " + formatValue(this.data.temperature.min) + "&deg;C " + this.formatDate(this.data.temperature.minTime) + " - " 
                                 + "Max : " + formatValue(this.data.temperature.max) + "&deg;C " + this.formatDate(this.data.temperature.maxTime) + "<br>" 
                                 + "Moyenne en journée : " + formatValue(this.data.temperature.avgDay) + "&deg;C - "
                                 + "la nuit : " + formatValue(this.data.temperature.avgNight) + "&deg;C");
            
            this.div.appendChild(infoDiv);

            this.soilhumidityDiv = document.createElement("DIV");
            this.soilhumidityDiv.className = "SensorDataGraph";
            this.div.appendChild(this.soilhumidityDiv);
            
            this.sunlightDiv = document.createElement("DIV");
            this.sunlightDiv.className = "SensorDataGraph";
            this.div.appendChild(this.sunlightDiv);

            infoDiv = document.createElement("DIV");
            infoDiv.className = "SensorDataInfo";
            infoDiv.innerHTML = ("Moyenne lumière instantannée (<a href='https://p2pfoodlab.net/wiki/index.php/Mesurer_la_lumi%C3%A8re' target='_blank'>PAR</a>) : "
                                 + formatValue(this.data.sunlight.avg)
                                 + " <a href='https://p2pfoodlab.net/wiki/index.php/Mesurer_la_lumi%C3%A8re' target='_blank'>μmol/m2/s</a><br>" 
                                 + "Max : " + formatValue(this.data.sunlight.max) + " μmol/m2/s " + this.formatDate(this.data.sunlight.maxTime) + "<br>" 
                                 + "Moyenne lumière accumulée par jour (<a href='https://p2pfoodlab.net/wiki/index.php/Mesurer_la_lumi%C3%A8re' target='_blank'>DLI</a>) : "
                                 + formatValue(this.data.sunlight.dli, 2) + " mol/m2/j");
            this.div.appendChild(infoDiv);
            
            this.showTemperature();
            this.showSoilHumidity();
            this.showSunlight();

        } else {
            var div = document.createElement("DIV");
            div.className = "SensorDataEmpty";
            div.innerHTML = "Pas (encore) de données pour la semaine sélectionnée.";
            this.div.appendChild(div);
        }
    }

    this.buildView();
}
SensorDataViewer.prototype = new UIComponent();

function LocationSelection(parent, location)
{
    var self = this;
    this.parent = parent;
    this.location = location;
    this.handler = function() {
        parent.createObserver(self.location.id, null);
    }
}

function LocationSelector(ctrl, locations, experimentId, matrix)
{
    var self = this;

    this.init("LocationSelector", "LocationSelector");
    this.ctrl = ctrl;
    this.locations = locations;
    this.experimentId = experimentId;
    this.matrix = matrix;
    
    this.buildView = function() {
        var buttons = document.createElement("DIV");
        buttons.className = "location-selector";
        this.div.appendChild(buttons);

        if (this.locations.length == 0) {
            var p = document.createElement("p");
            p.innerHTML = "Veuillez donner un nom à votre emplacement ('Mon bac', 'La terrasse'...)&nbsp;:";
            buttons.appendChild(p);

        } else {
            var p = document.createElement("p");
            p.innerHTML = "Sélectionnez l'emplacement :";
            buttons.appendChild(p);

            for (var i = 0; i < this.locations.length; i++) {
                var button = document.createElement("BUTTON");
                button.className = "btn btn-primary btn-block location-selector";
                button.id = "location-" + locations[i].id;
                button.appendChild(document.createTextNode(locations[i].name));
                buttons.appendChild(button);
                setEventHandler(button, 'click', new LocationSelection(this, this.locations[i]).handler);
            }
            var hr = document.createElement("HR");
            buttons.appendChild(hr);

            var p = document.createElement("p");
            p.innerHTML = "Ou ajoutez un nouveau emplacement dans la liste&nbsp;:";
            buttons.appendChild(p);
        }

        var span = document.createElement("span");
        span.innerHTML = "Nom&nbsp;:";
        buttons.appendChild(span);

        var form = document.createElement("FORM");
        buttons.appendChild(form);

        this.text = document.createElement("INPUT");
        this.text.setAttribute("type", "text");
        this.text.setAttribute("name", "name");
        this.text.setAttribute("size", "18");
        this.text.setAttribute("maxlength", "40");
        form.appendChild(this.text);

        var button = document.createElement("BUTTON");
        button.className = "btn btn-success btn-block location-selector";
        button.appendChild(document.createTextNode("Créer"));
        buttons.appendChild(button);
        setEventHandler(button, 'click', function() { self.createObserver(null, self.text.value); });

        var hr = document.createElement("HR");
        buttons.appendChild(hr);

        var button = document.createElement("BUTTON");
        button.className = "btn btn-secondary-outline btn-block location-selector";
        button.appendChild(document.createTextNode("Annuler"));
        buttons.appendChild(button);
        setEventHandler(button, 'click', function() { _curtain.finished(); });
    }

    this.createObserver = function(locationId, locationName) {
        _curtain.finished();
        ctrl.createObserver(this.matrix, locationId, locationName);
    }

    this.buildView();
}
LocationSelector.prototype = new UIComponent();

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

    this.updateView = function() {
        this.view.updateView();
    }

    this.updateSensorData = function() {
        this.view.updateSensorData();
    }
    
    this.insertObservation = function(observation) {
        observation.date = new Date(observation.date);
        this.experiment.insertObservation(observation);
    }

    this.deleteObservation = function(observation, callback) {
        _server.getJSON("login").then(function(e) {
            if (e.error) alert(e.message);
            else {
                if (!_account || !_account.id) {
                    _account = e;
                    _accountPanel.update();
                }
                if (observation.accountId != _account.id)
                    alert("Il semblerait que cette image n'est pas a vous !");
                else {
                    _server.deleteJSON("observations/" + observation.id).then(function (r) {
                        if (r.error) alert(r.message);
                        else {
                            r.date = new Date(r.date);
                            var index = self.experiment.removeObservation(r);
                            var view = self.view.getObservationView(index.plant, index.location, index.col);
                            if (view) view.updateObservation();
                            if (callback) callback();
                        }
                    })
                }
            }});
    }

    this.createObserver = function(matrix, locationId, locationName) {
        var observer = {
            "experimentId": this.experiment.id,
            "plantId": matrix.plant.id,
            "locationId": locationId,
            "locationName": locationName
        };
        _server.postJSON("observers", observer).then(function (r) {
            if (r.error) {
                if (r.type && r.type == "select") {
                    //alert(JSON.stringify(r.select));
                    _curtain.show(new LocationSelector(self,
                                                       r.select, 
                                                       self.experiment.id, 
                                                       matrix));
                } else 
                    alert(r.message);
            } else {
                matrix.addObserver(r);
                var view = self.view.getMatrixViewByPlantId(matrix.plant.id);
                //alert(view);
                if (view) view.buildView();
            }
        }); 
    }

    this.handleEvent = function(what, target) {
        if (what == "clicked" && target.action == "createObserver") {
            self.createObserver(target.matrix, null,null);
        }
    }
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
            observations.push([]);
        this.observers.push(observer);
        this.observations.push(observations);
        this.map[observer.locationId] = observations;
    }

    this.removeObservation = function(obs) {
        var row = this.map[obs.locationId];
        var cell = row[obs.col];
        for (var i = 0; i < cell.length; i++) {
            if (cell[i].id == obs.id) {
                cell.splice(i, 1);
                return { "plant": this.plant.id, "location": obs.locationId, "col": obs.col };
            }
        }
    }
    
    this.addObservation = function(obs) {
        var row = this.map[obs.locationId];
        var cell = row[obs.col];
	if (cell) cell.push(obs);
	else /* alert(JSON.stringify(obs)) */;
    }
}

function Experiment(e, numWeeks)
{
    this.id = e.id;
    this.plants = e.plants;
    this.name = e.name;
    this.prettyname = e.prettyname;
    //alert("startdate = " + e.startDate);
    this.startDate = new Date(e.startDate.year, e.startDate.month-1, e.startDate.day);
    //alert("converted startdate = " + this.startDate);
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

    this.removeObservation = function(observation) {
        observation.col = this.getWeekNum(observation.date);
        for (var i = 0; i < this.matrices.length; i++) {
            if (this.matrices[i].plant.id == observation.plantId) {
                return this.matrices[i].removeObservation(observation);
            }
        }
        return null;
    }
    
    this.insertObservation = function(observation) {
        observation.col = this.getWeekNum(observation.date);
	if (observation.col < 0)
	    return;
        for (var i = 0; i < this.matrices.length; i++) {
            if (this.matrices[i].plant.id == observation.plantId) {
                this.matrices[i].addObservation(observation);
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
 	    observations[i].col = this.getWeekNum(observations[i].date);
            matrix.addObservation(observations[i]);
        }
    }
}


function SlideSelector(slideshow, i)
{
        var self = this;
        this.slideshow = slideshow;        
        this.i = i;        

        this.select = function() {
                self.slideshow.selectSlide(self.i);
        }
}

function Slideshow(observations)
{
    var self = this;
    
    this.init("Slideshow", "Slideshow");
    
    this.observations = observations;
    this.self = this;
    this.curSlide = 0;
    this.preLoad = [];
    this.slide = null;
    this.slideSelectors = [];

    this.preloadSlides = function() {
        this.preLoad = [];
        for (i = 0; i < this.observations.length; i++) {
            this.preLoad[i] = new Image();
            if ((typeof this.observations[i]) == "string")
                src = this.observations[i];
            else 
                src = _server.root + "/" + this.observations[i].small;
            this.preLoad[i].src = src;
        }
        setEventHandler(this.preLoad[0], "load", this._doTransition);
    }

    this.nextSlide = function(loop) {
        if (self) self.selectSlide(self.curSlide + 1, loop);
        else this.selectSlide(this.curSlide + 1, loop);
    }

    this.prevSlide = function() {
        if (self) self.selectSlide(self.curSlide - 1);
        else this.selectSlide(this.curSlide - 1);
    }

    this.selectSlide = function(i, loop) {
        this.curSlide = i;
        if (loop) this.curSlide = (this.observations.length + this.curSlide) % this.observations.length;
        if (this.curSlide < 0) 
            this.curSlide = 0;
        if (this.curSlide >= this.observations.length)
            this.curSlide = this.observations.length - 1;
        this.doTransition();
    }

    this._doTransition = function() {
        self.doTransition();
    }

    this.doTransition = function() {
        this.slide.src = this.preLoad[this.curSlide].src;
        this.displayCaption();
        this.updateSlideNumbers();
    }

    this.insertLink = function(p, className, anchor, id, handler) {
        var a = document.createElement("A");
        a.className = className;
        a.id = id;
        a.setAttribute("href", "javascript:void(0)");
        a.appendChild(document.createTextNode(anchor));
        p.appendChild(a);        
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", handler);
        return a;
    }

    this.insertSlideNumbers = function() {
        if (this.observations.length <= 1)
            return;

        this.insertLink(this.ctrl, "Arrow", "<", 
                        "Slideshow_prevSlide", 
                        this.prevSlide);
        
        for (i = 0; i < this.observations.length; i++) {
            var sel = new SlideSelector(this, i);
            var link = this.insertLink(this.ctrl, "Number", "" + (i + 1), 
                                       "Slideshow_selectSlide_" + i, 
                                       sel.select);
            sel.link = link;
            this.slideSelectors[i] = sel;
            if (i == this.curSlide) 
                link.className = "SelectedNumber";
        }
        
        this.insertLink(this.ctrl, "Arrow", ">", 
                        "Slideshow_nextSlide", this.nextSlide);
    }

    this.updateSlideNumbers = function() {
        if (this.observations.length <= 1)
            return;
        for (i = 0; i < this.observations.length; i++)
            this.slideSelectors[i].link.className = "Number";
        this.slideSelectors[this.curSlide].link.className = "SelectedNumber";
    }

    this.displayCaption = function() {
        var observation = this.observations[this.curSlide];
        if (observation) {
            var text = "";
            if (observation.comment) {
                text += "<p class='comment'>" + observation.comment + "</p>";
            }
            text += "<p class='observation'>" + observation.plantFamily + ", ";
            if (observation.plantVariety)
                text += observation.plantVariety + ", ";
            text += observation.locationName + " - " + observation.accountId + ", " + toDate(observation.date) + "</p>";
            this.caption.innerHTML = text;
        }
    }
    
    this._onSlideClicked = function(e) {
        self.handler(self);
    }

    this.update = function() {
        // FIXME FIXEM
        if (self.observations.length == 0) {
            _curtain.finished();
        } else {
            self.removeComponents();
            self.createShow();
            self.selectSlide(self.curSlide, true);
        }
    }
    
    this.deleteObservation = function() {
        if (confirm("Vraiment jeter l'image ?")) {
            _controller.deleteObservation(self.observations[self.curSlide], this.update);
        }
    }
    
    this.createShow = function() {
        this.addGlyph("glyphicon-remove", function() { _curtain.finished(); } );
        this.addGlyphButton("glyphicon-trash", "pull-right", function() { self.deleteObservation() } );

        /*
        this.addEventImage(_server.root + "/media/close.png", "Fermer le slideshow", "SlideshowClose FloatLeft",
                           function() { _curtain.finished(); } );

        this.addEventImage(_server.root + "/media/trash.png", "Jeter à la poubelle", "FloatRight",
                           function() { self.deleteObservation() } );
        */
        
        var slideshow = document.createElement("DIV");
        slideshow.className = "Slideshow_Slideshow";
        slideshow.id = "Slideshow_Slideshow";
        this.div.appendChild(slideshow);
        
        var pic = document.createElement("DIV");
        pic.className = "PictureBox";
        pic.id = "Slideshow_PictureBox";
        slideshow.appendChild(pic);

        var img = document.createElement("IMG");
        img.className = "SlideshowImage";
        this.slide = img;

        var a = document.createElement("A");
        a.setAttribute("href", "javascript:void(0)");
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", function() { self.nextSlide(true); });
        
        a.appendChild(img);
        pic.appendChild(a);
        
        this.caption = document.createElement("DIV");
        this.caption.className = "CaptionBox";
        this.caption.id = "Slideshow_CaptionBox";
        slideshow.appendChild(this.caption);
        this.displayCaption();
        
        if (this.observations.length > 1) {
            this.ctrl = document.createElement("DIV");
            this.ctrl.className = "ControlBox";
            this.ctrl.setAttribute("id", "ControlBox");
            slideshow.appendChild(this.ctrl);
            this.insertSlideNumbers();
        }
        
        return 0;
    }
    
    this.createShow();
    this.preloadSlides();
}
Slideshow.prototype = new UIComponent();


//--------------------------------------------------

function AccountPanel()
{
    var self = this;

    function authenticate() {
    }

    this.update = function() {
        this.removeComponents();
        /*
        if (_account && _account.id) {
            this.addText("Nom : " + _account.id);
            //this.addEventLink("Changer", function() { self.authenticate(); }, "");    
        } else {
            this.addEventLink("Se connecter", function() { self.authenticate(); }, "");    
        }
        */
    }
    
    this.init("AccountPanel", "AccountPanel", document.getElementById("AccountPanel"));
    this.update();
}
AccountPanel.prototype = new UIComponent();


//--------------------------------------------------

function Thread(id, expId)
{
    this.id = id;
    this.experimentId = expId;
    this.messages = [];
    this.questionnaire = null; // FIXME: hack
    
    this.length = function() {
        return this.messages.length;
    }

    this.message = function(i) {
        return this.messages[i];
    }
    
    this.importMessage = function(message) {
        message.date = new Date(message.date);
        if (!this.startDate
            || this.startDate.getTime() > message.date.getTime())
            this.startDate = message.date;
        if (!this.lastUpdate
            || this.lastUpdate.getTime() < message.date.getTime())
            this.lastUpdate = message.date;
        this.messages.push(message);
        if (message.questionnaire)
            this.questionnaire = message.questionnaire;
    }
}

function Forum(expId)
{
    this.threads = [];
    this.experimentId = expId;
    
    this.length = function() {
        return this.threads.length;
    }

    this.thread = function(i) {
        return this.threads[i];
    }

    this.findThread = function(id) {
        for (var i = 0; i < this.threads.length; i++) {
            if (this.threads[i].id == id)
                return this.threads[i];
        }
        return null;
    }

    this.addThread = function(thread) {
        this.threads.push(thread);
    }

    this.removeThread = function(thread) {
        this.threads.pop();
    }
    
    this.importMessage = function(message) {
        var thread = this.findThread(message.thread);
        if (!thread) {
            thread = new Thread(message.thread, expId);
            this.threads.push(thread);
        }
        thread.importMessage(message);
    }
    
    this.importMessages = function(list) {
        for (var i = 0; i < list.length; i++)
            this.importMessage(list[i]);
    }

    this.sortRecentUpdateFirst = function() {
        this.threads.sort(function(a,b) { return b.lastUpdate.getTime() - a.lastUpdate.getTime(); });
    }
}

function MessageViewer(parent, thread, index, collapsed)
{
    var self = this;
    this.init("MessageViewer", "row");
    this.thread = thread;
    this.message = thread.message(index);

    this._createGlyph = function(div, glyphname, callback) {
        var a = document.createElement("A");
        a.className = "forum-collexp";
        a.setAttribute("href", "javascript:void(0)");
        a.onclick = function() { return false; }
        a.onmousedown = function() { return false; }
        setEventHandler(a, "click", callback);
        var span = document.createElement("SPAN");
        span.className = "glyphicon " + glyphname;
        a.appendChild(span);
        div.appendChild(a);
        return a;
    }
    
    this.buildView = function() {
        this.removeComponents();
        var message = this.thread.message(index);

        var lmargin = document.createElement("DIV");
        lmargin.className = "col-sm-1";
        if (index == 0) {
            if (collapsed) 
                this._createGlyph(lmargin, "glyphicon-plus", function() { parent.buildViewExpanded(); });
            else
                this._createGlyph(lmargin, "glyphicon-minus", function() { parent.buildViewCollapsed(); });
        }
        this.div.appendChild(lmargin);

        var cols = document.createElement("DIV");
        if (index == 0 && collapsed) cols.className = "col-sm-6";
        else cols.className =  "col-sm-10";
        this.div.appendChild(cols);

        var text = document.createElement("DIV");
        if (index == 0) text.className = "message-body forum-message";
        else text.className =  "message-body forum-reply";
        cols.appendChild(text);

        if (collapsed) {
            if (message.subject)
                text.appendChild(document.createTextNode(message.subject));
            else 
                text.appendChild(document.createTextNode(message.shorttext));
        } else {
            if (message.subject)
                text.appendChild(document.createTextNode(message.subject + "\n\n" + message.text));
            else
                text.appendChild(document.createTextNode(message.text));
        }
        
        if (index == 0 && collapsed) {
            text = document.createElement("DIV");
            text.className = "col-sm-4";
            this.div.appendChild(text);
        }
        
        p = document.createElement("P");
        text.appendChild(p);
        p.className = "message-meta";
        p.appendChild(document.createTextNode("par ")); 
        var a = document.createElement("A");
        a.setAttribute("href", _server.root + "/people/" + message.account + ".html");
        a.appendChild(document.createTextNode(message.account));
        p.appendChild(a);
        p.appendChild(document.createTextNode(" le " + formatDate(message.date)));

        var rmargin = document.createElement("DIV");
        rmargin.className = "col-sm-1";
        if (index == 0 && thread.length() > 1) {
            var span = document.createElement("SPAN");
            span.className = "label label-primary";
            span.innerHTML = "" + (thread.length() - 1);
            rmargin.appendChild(span);
        }
        this.div.appendChild(rmargin);
    }

    this.buildView();
}
MessageViewer.prototype = new UIComponent();

function RadishHarvest()
{
    var self = this;

    this.init("RadishHarvest", "message-panel");
    build();
   
    function build() {
        var row = document.createElement("DIV");
        row.className = "row";
        self.div.appendChild(row);

        var lmargin = document.createElement("DIV");
        lmargin.className = "col-sm-1";
        row.appendChild(lmargin);

        var cols = document.createElement("DIV");
        cols.className = "col-sm-10 questionnaire-radish-harvest";
        row.appendChild(cols);

        // Harvest
        
        var h4 = document.createElement("H4");
        cols.appendChild(h4);
        var span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary right-margin";
        span.appendChild(document.createTextNode("Avez-vous récolté des radis ?"));

        span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary";
        span.appendChild(document.createTextNode("Did you harvest any radishes?"));
        
        options = [
            { "value": "", "text": "-" }, 
            { "value": "", "text": "Oui, j'ai récolté des radis !" },
            { "value": "", "text": "Non, je ne les ai pas semés..." },
            { "value": "", "text": "Non, les radis ne sont pas sortie de terre, ou ils sont restés tout petit !" },
            { "value": "", "text": "Non, les radis sont montés en graines." },
            { "value": "", "text": "Non, les radis ont été mangés par nos amis les limaces." },
            { "value": "", "text": "Non, les radis sont tombés malades." } ];

        self.harvest = document.createElement("SELECT");
        self.harvest.id = "harvest";
        self.harvest.className = "";
        cols.appendChild(self.harvest);
        
        for (var i = 0; i < options.length; i++) {
            var option = document.createElement("OPTION");
            option.value = options[i].value;
            option.text = options[i].text;
            self.harvest.appendChild(option);
        }
        cols.appendChild(document.createElement("BR"));


        // Quantity

        h4 = document.createElement("H4");
        cols.appendChild(h4);
        span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary right-margin";
        span.appendChild(document.createTextNode("Si oui, combien de radis ?"));

        span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary";
        span.appendChild(document.createTextNode("If yes, how many radishes did you harvest?"));

        self.quantity = document.createElement("SELECT");
        self.quantity.id = "quantity";
        self.quantity.className = "";
        cols.appendChild(self.quantity);

        for (var i = 0; i < 30; i++) {
            var option = document.createElement("OPTION");
            option.value = "" + i;
            option.text = (i==0)? "-" : "" + i;
            self.quantity.appendChild(option);
        }
        cols.appendChild(document.createElement("BR"));
        
        // Weight
        
        h4 = document.createElement("H4");
        cols.appendChild(h4);
        span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary right-margin";
        span.appendChild(document.createTextNode("Quel poids, si connu ?"));

        span = document.createElement("SPAN");
        h4.appendChild(span);
        span.className = "label label-primary";
        span.appendChild(document.createTextNode("The weight of the radishes, if known?"));

        self.weight = document.createElement("INPUT");
        self.weight.className = "TextField";
        self.weight.setAttribute("type", "text");
        self.weight.setAttribute("name", "weight");
        self.weight.setAttribute("size", "4");
        cols.appendChild(self.weight);
        cols.appendChild(document.createTextNode("grammes"));
        cols.appendChild(document.createElement("BR"));
        
        var rmargin = document.createElement("DIV");
        rmargin.className = "col-sm-1";
        row.appendChild(rmargin);
    }

    this.response = function() {
        var text = "";
        var index = this.harvest.selectedIndex;
        text += this.harvest.options[index].text + "\n";
        if (index == 1) {
            index = this.quantity.selectedIndex;
            if (index > 0) text += this.quantity.options[index].text + " radis.\n";
        }
        if (self.weight.value)
            text += "Poids :" + self.weight.value + "g\n";
        return text;
    }
    
}
RadishHarvest.prototype = new UIComponent();

function MessageInputPanel(parent, options)
{
    var self = this;
    this.init("MessageInputPanel", "message-panel");

    this.type = "message";
    
    this.buildView = function() {
        this.removeComponents();

        if (options.subject) {
            var row = document.createElement("DIV");
            row.className = "row";
            this.div.appendChild(row);
            
            var lmargin = document.createElement("DIV");
            lmargin.className = "col-sm-1";
            row.appendChild(lmargin);

            var cols = document.createElement("DIV");
            cols.className = "col-sm-10";
            row.appendChild(cols);

            var formholder = document.createElement("DIV");
            formholder.className = "forum-thread-title";
            cols.appendChild(formholder);

            formholder.appendChild(document.createTextNode("Subject / Topic:"));
            formholder.appendChild(document.createElement("BR"));

            this.subject = document.createElement("INPUT");
            this.subject.setAttribute("type", "text");
            this.subject.setAttribute("name", "title");
            this.subject.setAttribute("size", 72);
            formholder.appendChild(this.subject);

            if (0) {
                formholder.appendChild(document.createElement("BR"));

                var buttons = document.createElement("DIV");
                buttons.className = "btn-group";
                buttons.setAttribute("role", "group");
                formholder.appendChild(buttons);

                this.qbutton = document.createElement("BUTTON");
                this.qbutton.className = "btn btn-default btn-xs active";
                this.addGlyph("glyphicon-question-sign", "", this.qbutton, "");
                this.qbutton.appendChild(document.createTextNode(" Question"));
                buttons.appendChild(this.qbutton);

                this.ibutton = document.createElement("BUTTON");
                this.ibutton.className = "btn btn-default btn-xs";
                this.addGlyph("glyphicon-info-sign", "", button, "");
                this.ibutton.appendChild(document.createTextNode(" Conseil/Tip"));
                buttons.appendChild(this.ibutton);

                this.mbutton = document.createElement("BUTTON");            
                this.mbutton.className = "btn btn-default btn-xs";
                this.addGlyph("glyphicon-comment", "", this.mbutton, "");
                this.mbutton.appendChild(document.createTextNode(" Message"));
                buttons.appendChild(this.mbutton);
            }
            
            var rmargin = document.createElement("DIV");
            rmargin.className = "col-sm-1";
            row.appendChild(rmargin);
        }
        
        var row = document.createElement("DIV");
        row.className = "row";
        this.div.appendChild(row);

        var lmargin = document.createElement("DIV");
        lmargin.className = "col-sm-1";
        row.appendChild(lmargin);

        var cols = document.createElement("DIV");
        cols.className = "col-sm-10";
        row.appendChild(cols);

        var formholder = document.createElement("DIV");
        formholder.className = "forum-reply-input";
        cols.appendChild(formholder);

        if (options.label) {
            formholder.appendChild(document.createTextNode(options.label));
            formholder.appendChild(document.createElement("BR"));
        }
    
        this.textarea = document.createElement("TEXTAREA");
        this.textarea.className = "forum-reply-textarea";
        this.textarea.setAttribute("name", "forum-reply-textarea");
        formholder.appendChild(this.textarea);

        formholder.appendChild(document.createElement("BR"));
        this.addButton("Envoi",
                       function() { parent.sendMessage((self.subject)? self.subject.value : null,
                                                       self.textarea.value); },
                       "btn-default btn-sm",
                       formholder);

        var rmargin = document.createElement("DIV");
        rmargin.className = "col-sm-1";
        row.appendChild(rmargin);

    }

    this.buildView();
}
MessageInputPanel.prototype = new UIComponent();

function ThreadViewer(thread, expanded)
{
    var self = this;
    this.init("ThreadViewer", "panel panel-default forum-panel");
    this.thread = thread;

    this.buildViewExpanded = function() {
        this.removeComponents();
        var panelbody = document.createElement("DIV");
        panelbody.className = "panel-body forum-thread";
        this.div.appendChild(panelbody);

        for (var i = 0; i < thread.length(); i++) {
            var v = new MessageViewer(this, thread, i, false);
            panelbody.appendChild(v.div);
        }

        if (thread.questionnaire) {
            var fun = window[thread.questionnaire];
            this.questionnaire = new fun();
            panelbody.appendChild(this.questionnaire.div);
        }

        var title = this.questionnaire? "Info supplémentaire // Additional info:" : thread.length()? "Répondre" : "Message";
        var subject = thread.length()? false : true;
        panelbody.appendChild(new MessageInputPanel(this, { "label": title, "subject": subject }).div);

    }

    this.buildViewCollapsed = function() {
        this.removeComponents();
        var panelbody = document.createElement("DIV");
        panelbody.className = "panel-body forum-thread";
        this.div.appendChild(panelbody);

        var v = new MessageViewer(this, thread, 0, true);
        panelbody.appendChild(v.div);
    }

    this.sendMessage = function(subject, text) {
        if (this.questionnaire) {
            if (text) text = this.questionnaire.response() + "\nCommentaire :\n" + text;
            else text = this.questionnaire.response();
        } else if (!text) return;
        
        var message = { "subject": subject,
                        "text": text,
                        "thread": this.thread.id,
                        "experiment": this.thread.experimentId };

        _server.postJSON("messages", message).then(function (r) {
            if (r.error) alert(r.message);
            else {
                self.thread.importMessage(r);
                self.buildViewExpanded();
            }
        }); 
    }

    if (expanded) this.buildViewExpanded();
    else this.buildViewCollapsed();
}
ThreadViewer.prototype = new UIComponent();

function ForumViewer(forum)
{
    var self = this;
    this.init("ForumViewer", "", document.getElementById("ForumViewer"));
    this.forum = forum;
    this.curPage = 0;
    this.pageSize = 5;
    this.newThread = null;
    
    this.sendMessage = function(textarea) {
        if (!textarea.value) return;
        
        var message = { "text": textarea.value,
                        "thread": randomString(12),
                        "experiment": this.forum.experimentId };

        _server.postJSON("messages", message).then(function (r) {
            if (r.error) alert(r.message);
            else {
                self.forum.importMessage(r);
                self.buildView();
            }
        }); 
    }

    this.createThread = function() {
        this.newThread = new Thread(randomString(12), this.forum.experimentId);
        this.forum.addThread(this.newThread);
        var v = new ThreadViewer(this.newThread, true);        
        this.div.insertBefore(v.div, this.button);
    }

    this.selectPage = function(i) {
        if (this.newThread && this.newThread.length() == 0) {
            // Remove the empty thread
            this.forum.removeThread(this.newThread);
            this.newThread = null;
        }
        this.curPage = i;
        this.buildView();
    }
    
    this.buildPageSelector = function(nav, i) {
        this.addEventLink("" + (i+1),
                          function() { self.selectPage(i); },
                          "forum-page-selector",
                          nav);
    }
    
    this.buildView = function() {
        this.removeComponents();
        this.forum.sortRecentUpdateFirst();
        var div = document.createElement("DIV");
        div.className = "forum-header";
        div.innerHTML = "Forum";
        this.div.appendChild(div);
        
        for (var i = this.curPage * this.pageSize, j = 0; i < forum.length() && j < this.pageSize; i++, j++) {
            this.addComponent(new ThreadViewer(forum.thread(i)));
        }
        this.button = this.addButton("Commencer une nouvelle discussion",
                                     function() { self.createThread(); },
                                     "btn-default btn-sm");
        var pages = Math.floor((this.forum.length() + 4) / 5);
        if (pages > 1) {
            var nav = document.createElement("NAV");
            nav.className = "forum-pager";
            this.div.appendChild(nav);
            this.addText("Page : ", null, nav);
            for (var i = 0; i < pages; i++) {
                if (i == this.curPage) this.addText(""+(i+1), "forum-page-selector", nav);
                else this.buildPageSelector(nav, i);
            }
        }
    }
    
    this.buildView();
}
ForumViewer.prototype = new UIComponent();

//--------------------------------------------------

function ActivitySlideshow(observations, index)
{
    var self = this;
    this.observations = observations;
    this.index = index;

    this.open = function() {
        var obs = [ self.observations[self.index] ];
        _curtain.show(new Slideshow(obs));
    }
}


function ActivityViewer(id)
{
    var self = this;
    this.init("ActivityViewer", "", document.getElementById("ActivityViewer"));

    this.setObservations = function(obs) {
        this.observations = obs;
        for (var i = 0; i < this.observations.length; i++) {
            this.observations[i].date = new Date(this.observations[i].date);
        }
    }
    
    this.buildView = function() {
        this.removeComponents();
        var div = document.createElement("DIV");
        div.className = "forum-header";
        div.innerHTML = "Photos r&eacute;centes";
        this.div.appendChild(div);        
        
        div = document.createElement("DIV");
        div.className = "recent-photos";
        
        for (var i = this.observations.length-1, j = 0; i >= 0 && j < 32; i--, j++) {
            var imgdiv = document.createElement("DIV");
            imgdiv.className = "recent-photo";

            var a = document.createElement("A");
            a.className = "recent-photo";
            a.setAttribute("href", "javascript:void(0)");
            a.onclick = function() { return false; }
            a.onmousedown = function() { return false; }
            setEventHandler(a, "click", new ActivitySlideshow(this.observations, i).open);
            
            var img = document.createElement("IMG");
            img.src = _server.root + "/" + this.observations[i].thumbnail;
            img.className = "recent-photo";
            imgdiv.appendChild(a);
            a.appendChild(img);

            var br = document.createElement("BR");
            imgdiv.appendChild(br);

            a = document.createElement("A");
            a.className = "recent-photo";
            a.setAttribute("href", _server.root + "people/" + this.observations[i].accountId + ".html");
            a.appendChild(document.createTextNode(this.observations[i].accountId));
            imgdiv.appendChild(a);

            div.appendChild(imgdiv);
        }
        
        this.div.appendChild(div);        
    }
    
    _server.getJSON("observations.json?experiment=" + id 
                    + "&days=21&sort=upload")
        .then(function(obs) {
            self.setObservations(obs);
            self.buildView();
        });
}
ActivityViewer.prototype = new UIComponent();

//--------------------------------------------------

function PerformanceProfile()
{
    this.startDate = new Date();
    this.lastDate = new Date();
    this.list = [];
    this.stack = [ new Date() ];
    
    this.mark = function(label) {
        var now = new Date();
        var lastDate = this.stack.pop();
        this.list.push({ "label": label,
                         "time": (now.getTime() - this.startDate.getTime()) / 1000,
                         "duration": (now.getTime() - lastDate.getTime()) / 1000,
                       });
        this.stack.push(now);
    }

    this.start = function(label) {
        this.stack.push(new Date());
    }

    this.stop = function(label) {
        this.stack.pop();
        this.mark(label);
    }
}

var _prof = new PerformanceProfile();

//--------------------------------------------------

var _numWeeks = 12;
var _server = undefined;
var _experiment = undefined;
var _controller = undefined;
var _curtain = undefined;
var _account = undefined;
var _accountPanel = undefined;
var _forum = undefined;

function showObservations(id, startAt)
{
    _curtain = new Curtain();
    document.getElementById("Body").appendChild(_curtain.div);

    _accountPanel = new AccountPanel();

    // First, load all the data and construct the data structure, aka
    // the 'model'.
    _server.getJSON("experiments/" + id + ".json").then(function(e) {

        _prof.mark("loadExperiment");
            
        _experiment = new Experiment(e, _numWeeks);

	var viewStart;
	var viewEnd;

	if (startAt && startAt == "beginning") {
            viewStart = _experiment.startDate;
            viewEnd = new Date(viewStart.getFullYear(), viewStart.getMonth(),
                                viewStart.getDate() + 7 * _numWeeks, 23, 59, 59);
        } else if (startAt && startAt != "today") {
            viewStart = new Date(startAt);
            viewEnd = new Date(viewStart.getFullYear(), viewStart.getMonth(),
                                viewStart.getDate() + 7 * _numWeeks, 23, 59, 59);

	} else {
            var today = new Date();
            var daysTillSunday = today.getDay() == 0? 7 : 7 - today.getDay();
            var viewEnd = new Date(today.getFullYear(), today.getMonth(),
				   today.getDate() + daysTillSunday, 0, 0, 0);
            var viewStart = new Date(today.getFullYear(), today.getMonth(),
                                     today.getDate() + daysTillSunday - _numWeeks * 7,
                                     0, 0, 0);
	}

        if (viewStart.getTime() < _experiment.startDate.getTime()) {
            viewStart = _experiment.startDate;
            viewEnd = new Date(viewStart.getFullYear(), viewStart.getMonth(),
                                viewStart.getDate() + 7 * _numWeeks, 23, 59, 59);
        }
        _experiment.viewStart = viewStart;
        _experiment.viewEnd = viewEnd;

        _prof.mark("handleExperiment");

        return _server.getJSON("observers.json?experiment=" + id);

    }).then(function(obs) {

        _prof.mark("loadObservers");

        _experiment.setObservers(obs);

        _prof.mark("handleObservers");

        // Now create the controller and build the view.
        _controller = new ExperimentController(_experiment);
        _controller.buildView();

        _prof.mark("buildView");
        

        return _server.getJSON("observations.json?"
                               + "experiment=" + id
	                       + "&from=" + toDate(_experiment.viewStart)
			       + "&to=" + toDate(_experiment.viewEnd));
    }).then(function(obs) {

        _prof.mark("loadObservations");

        _experiment.setObservations(obs);

        _prof.mark("setObservations");

        _controller.updateView();

        _prof.mark("updateView");

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


        return _server.getJSON("sensordata.json");

    }).then(function(data) {
        _prof.mark("getSensorData");

        _experiment.sensordata = {};
        for (var i = 0; i < data.length; i++) {
            _experiment.sensordata[data[i].id] = data[i];
        }

        _prof.mark("handleSensorData");

        _controller.updateSensorData();

        _prof.mark("updateSensorData");

        return _server.getJSON("whoami");
        
    }).then(function(data) {
        _prof.mark("getWhoami");

        if (data.id) {
            _account = data;
            _accountPanel.update();
        }

        if (true) {
            var body = document.getElementById("Body");
            var div = document.createElement("DIV");
            var pre = document.createElement("PRE");
            pre.className = "PerformanceProfile";
            pre.innerHTML = JSON.stringify(_prof.list, null, 4);
            div.appendChild(pre);
            body.appendChild(div);
        }
    });
}

function initForum(id)
{
    _server.getJSON("messages?experiment=" + id).then(function(data) {
        _forum = new Forum(id);
        _forum.importMessages(data);
        _forumView = new ForumViewer(_forum);
    });
}

function showRecentActivity(id)
{
    new ActivityViewer(id);
}


//--------------------------------------------------

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
        _experiment = new Experiment(e, _numWeeks);
        return _server.getJSON("login");
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
