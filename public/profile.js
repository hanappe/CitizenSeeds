
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
    jq("#viewProfile").click(function(){ viewProfile(); });
    jq("#filechooser").on("change", function(){ uploadImage(this.files[0]); });

    jq('#description').wysiwyg({initialContent: ""});
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
    var win = window.open(_baseUrl + "/people/" + _accountId + ".html",
                          "p2pfoodlab_profile_" + _accountId);
    if (win) win.focus();
}

function uploadImage(file)
{
    var fd = new FormData();
    fd.append("bits", file);
    jq.ajax({
        url: _baseUrl + "/files",
        data: fd,
        cache: false,
        contentType: false,
        processData: false,
        type: "POST",
        success: function(data){ insertImageLib(data); }
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
