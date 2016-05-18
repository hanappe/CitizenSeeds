
var _baseUrl;
var _accountId;

function initProfilePage(baseUrl, id)
{
    _baseUrl = baseUrl;
    _accountId = id;
    jq("#updateCity").click(function(){ updateProfile(id, "city", jq("#city").val()); });
    jq("#updateCountry").click(function(){ updateProfile(id, "country", jq("#country").val()); });
    jq("#updateUrl").click(function(){ updateProfile(id, "url", jq("#url").val()); });
    jq("#updateDescription").click(function(){ updateProfile(id, "description", jq("#description").val()); });
    jq("#filechooser").on("change", function(){ uploadImage(this.files[0]); });

    jq('#description').wysiwyg({initialContent: ""});

    setProgress(null, 0);
}

function updateLocation(id, field, value)
{
    jq.post(_baseUrl + "/locations/" + id,
            { field: field, value: value },
            function(data) { if (data.error) alert(data.message); },
            "json");
}

function updateProfile(id, field, value)
{
    jq.post(_baseUrl + "/people/" + id + "/profile",
            { field: field, value: value },
            function(data) { if (data.error) alert(data.message); },
            "json");
}

function viewProfile()
{
    var win = window.open(_baseUrl + "/people/" + _accountId + ".html");
    if (win) win.focus();
}

function showProgress()
{
    jq('#progressbar').css('width','0%').attr('aria-valuenow', 0);
    jq('#progressbar').show();
}

function hideProgress()
{
    jq('#progressbar').hide();
}

function setProgress(e, value)
{
    if (e && e.lengthComputable)
        value = Math.round(100 * e.loaded / e.total);
    jq('#progressbar').css('width', value+'%').attr('aria-valuenow', value);
}

function uploadImage(file)
{
    showProgress();
    var fd = new FormData();
    fd.append("bits", file);
    jq.ajax({
        url: _baseUrl + "/files",
        xhr: function() {  // Custom XMLHttpRequest
            var myXhr = jq.ajaxSettings.xhr();
            if (myXhr.upload) { // Check if upload property exists
                myXhr.upload.addEventListener('progress', setProgress, false); // For handling the progress of the upload
            }
            return myXhr;
        },
        type: "POST",
        data: fd,
        beforeSend: function(e){ },
        error: function(e){ alert(e); },
        success: function(data){ insertImageLib(data); setProgress(null, 100); hideProgress(); },
        cache: false,
        contentType: false,
        processData: false
    });
}

function deleteImage(file)
{
    if (confirm("Supprimer l'image ?")) {
        jq.ajax({ url: _baseUrl + "/files/" + file.id,
                  type: "DELETE",
                  success: function(result) { jq("#file_" + file.id).remove(); }
                });
    }
}

function insertImageLib(file)
{
    var div = document.createElement("div");
    div.className = "image-lib-img";
    div.id = "file_" + file.id;
    var img = document.createElement("img");
    img.className = "";
    img.src = _baseUrl + "/" + file.thumbnail;
    div.appendChild(img);
    div.appendChild(document.createTextNode(" Insérer : "));
    var button = document.createElement("button");
    button.className = "btn btn-xs btn-default right-margin";
    button.id = "insert_thumbnail_" + file.id;
    button.innerHTML = "vignette";
    div.appendChild(button);
    button = document.createElement("button");
    button.className = "btn btn-xs btn-default right-margin";
    button.id = "insert_small_" + file.id;
    button.innerHTML = "petit taille";
    div.appendChild(button);
    button = document.createElement("button");
    button.className = "btn btn-xs btn-default right-margin";
    button.id = "insert_orig_" + file.id;
    button.innerHTML = "image originale";
    div.appendChild(button);
    button = document.createElement("button");
    button.className = "btn btn-xs btn-default";
    jq(button).click(function () { deleteImage(file); } );
    var span = document.createElement("span");
    span.className = "glyphicon glyphicon-remove";
    button.appendChild(span);
    div.appendChild(button);
    document.getElementById("image-lib").appendChild(div);
    jq("#insert_thumbnail_" + file.id).click(function(){ insertImage(_baseUrl + "/" + file.thumbnail); });
    jq("#insert_small_" + file.id).click(function(){ insertImage(_baseUrl + "/" + file.small); });
    jq("#insert_orig_" + file.id).click(function(){ insertImage(_baseUrl + "/" + file.orig); });
}

function insertImage(src)
{
    jq('#description').wysiwyg('insertImage', src);
}


function testDevice(id)
{
    _server.getJSON("devices/" + id + "?op=test").then(function(e) {
        if (e.error) {
            jq("#testResult_" + id).addClass("glyphicon glyphicon-remove-circle flowerpower-test-failed");
            alert(e.message);
        } else {
            jq("#testResult_" + id).addClass("glyphicon glyphicon-ok-circle flowerpower-test-succes");
        }
    });
}

function removeDevice(id)
{
    _server.deleteJSON("devices/" + id).then(function(e) {
        if (e.error) {
            alert(e.message);
        } else {
            alert("OK");
        }
    });
}

function listFlowerPowers()
{
    var email = jq("#flowerpower_id").val();
    var pw = jq("#flowerpower_pw").val();
    _server.getJSON("devices/flowerpowers.json?email=" + email + "&password=" + pw).then(function(e) {
        if (e.error) {
            alert(e.message);
        } else {
            displayFlowerPowers(e);
        }
    });
}

function deviceWrapper(device)
{
    var self = this;
    this.device = device;

    this.registerDevice = function() {
        alert("Register " + JSON.stringify(device));
        _server.postJSON("devices", device).then(function (r) {
            if (r.error) alert(e.message);
            else {
                alert("OK"); // TODO
            }
        });
    }
}

function displayFlowerPowers(list)
{
    _flowerpowers = list;

    var div = document.getElementById("ListFlowerPowers");
    while (div.hasChildNodes()) {
        div.removeChild(div.firstChild);
    }

    var table = document.createElement("table");
    table.className = "devices-table";
    div.appendChild(table);

    var tr = document.createElement("tr");
    var td = document.createElement("th");
    td.innerHTML = "Liste des FlowerPower disponibles (Nom du FlowerPower - Nom de la plante)";
    tr.appendChild(td);
    table.appendChild(tr);
    td = document.createElement("th");
    tr.appendChild(td);

    if (!list || !list.length) {
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = "<i>Aucun FlowerPower n'a été trouvé...</i>";
        tr.appendChild(td);
        table.appendChild(tr);
        return;
    }

    for (var i = 0; i < list.length; i++) {
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = list[i].name + " - " + list[i].flowerpower.plant_nickname;
        tr.appendChild(td);

        var button = document.createElement("button");
        button.setAttribute("href", "javascript:void(0)");
        button.className = "btn btn-primary";
        button.type = "button";
        button.innerHTML = "Ajouter";
        button.onclick = function() { return false; }
        button.onmousedown = function() { return false; }
        setEventHandler(button, "click", new deviceWrapper(list[i]).registerDevice);

        td = document.createElement("td");
        td.appendChild(button);
        tr.appendChild(td);

        table.appendChild(tr);
    }
    
}
