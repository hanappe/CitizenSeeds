/*  

    Copyright (C) 2013  Sony Computer Science Laboratory Paris
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

/*
 * Registration page
 */

function postRequest(url, obj) 
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

    xmlhttp.open("POST", url, false);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(obj));
    //alert(xmlhttp.responseText);
    var r = JSON.parse(xmlhttp.responseText);
    delete xmlhttp;
    return r;
}


function removeFormErrors() 
{
    var form = document.getElementById("registrationForm");
    for (var i = 0; i < form.elements.length; i++) {
        form.elements[i].className = "";
    }
}

function removeError()
{
    this.className = "";
    this.onchange = null;
}

function writeError(id, message) 
{
    var form = document.getElementById("registrationForm");
    form.elements[id].className = "error";
    form.elements[id].onchange = removeError;
}

function getFlowerPowerValue() 
{
    var button = document.getElementById("flowerpoweryes");
    if (button.checked)
        return "yes";
    var button = document.getElementById("flowerpowerno");
    if (button.checked)
        return "no";
    return "no";
}

function submitRegistration(experiment)
{
    var form = document.getElementById("registrationForm");
    var username = form.username.value;
    var email = form.email.value;
    var firstname = form.firstname.value;
    var lastname = form.lastname.value;
    var address1 = form.address1.value;
    var address2 = form.address2.value;
    var zipcode = form.zipcode.value;
    var town = form.town.value;
    var country = form.country.value;
    var flowerpower = getFlowerPowerValue();
    var captcha = form.captcha.value;
    var valid = true;

    removeFormErrors();

    if (!username) {
        writeError("username", "Veuillez saisir le pseudonyme.");
        valid = false;
    }
    if (username.length < 3) {
        writeError("username", "Le pseudonyme est trop court.");
        valid = false;
    }
    if (username.length > 24) {
        writeError("username", "Le pseudonyme est trop long.");
        valid = false;
    }
    var unicodeWord = XRegExp("^\\p{L}[0-9\\p{L}]{2,23}$");
    if (!unicodeWord.test(username)) {
        writeError("username", "Le pseudonyme contient des caractères non-valides.");
        valid = false;
    }
    
    if (!email) {
        writeError("email", "Veuillez saisir votre adresse email.");
        valid = false;
    }
    if (email.length < 6) {
        writeError("email", "Adresse email non-valide.");
        valid = false;
    }
    if (email.length > 100) {
        writeError("email", "L'adresse email est trop long.");
        valid = false;
    }
    if (email.indexOf('@') == -1) {
        writeError("email", 'Adresse email invalide.');
        valid = false;
    }
    if (email.indexOf('.') == -1) {
        writeError("email", "Adresse email invalide.");
        valid = false;
    }
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!re.test(email)) {
        writeError("email", "Adresse email invalide.");
        valid = false;
    }
    if (lastname == "") {
        writeError("lastname", 'Veuillez saisir votre nom');
        valid = false;
    }
    if (firstname == "") {
        writeError("firstname", 'Veuillez saisir votre prénom');
        valid = false;
    }
    if (address1 == "") {
        writeError("address1", 'Veuillez saisir votre adresse');
        valid = false;
    }
    if (zipcode == "") {
        writeError("zipcode", 'Veuillez saisir code postal');
        valid = false;
    }
    if (town == "") {
        writeError("town", 'Veuillez saisir votre ville');
        valid = false;
    }
    if (country == "") {
        writeError("country", 'Veuillez saisir le pays');
        valid = false;
    }
    if (captcha.length != 6) {
        writeError("captcha", "Veuillez vérifier le captcha.");
        valid = false;
    }

    if (!valid) {
	alert("Veuillez vérifier la saisie. Merci !");
	return;
    }

    var account = { "id": username, "email": email, 
		    "lastname": lastname, "firstname": firstname,
                    "address1": address1, "address2": address2,
                    "zipcode": zipcode, "town": town, 
		    "country": country, 
                    "flowerpower": flowerpower, 
                    "captcha": captcha,
                    "experiment": experiment};

    var r = postRequest("/CitizenSeeds/accounts", account);

    if (r && r.success) {
        var div = document.getElementById("FormHolder");
        while (div.hasChildNodes())
            div.removeChild(div.firstChild);

        var d = document.createElement("DIV");
	d.className = "full-width welcome";
	div.appendChild(d);

        var m = document.createElement("p");
        m.innerHTML = "Merci pour votre enregistrement !<br>Un email a été envoyé avec votre mot de passe.";
        d.appendChild(m);

        var address = r.firstname + " " + r.lastname + "<br>";
        address += r.address1 + "<br>"; 
        if (r.address2) address += r.address2 + "<br>"; 
        address += (r.zipcode + " " + r.town + "<br>"
		    + r.country + "<br>"); 
        m = document.createElement("P");
        m.innerHTML = ("Les graines seront envoyés à votre adresse : <br>"
		       + "<i>" + address + "</i>");
        //m.className = "RegisteredMessage CenterText";
        d.appendChild(m);
        
    } else if (r) {
	alert(r.field + " : " + r.message);
    } else {
	alert("Une erreur est parvenue sur le serveur. Veuillez ressayer plus tard. Merci.");
    }
}
