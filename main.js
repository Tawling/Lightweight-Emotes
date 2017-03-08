var config = {attributes: false, childList: true, characterData: false};
var emotes = [];
var channelEmotes = [];
var globalEmotes = [];
var foundChat = false;
var htmlBody = $("body")[0];
var channel = ""
var channelDisplay = ""

$("body").addClass("darkmode")

RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var chatLoadedObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
		console.log(mutation)
        var chatSelector = $(".chat-lines");
        if (chatSelector.length > 0) {
			if (!foundChat){
				console.log("Found Chat");
				var target = chatSelector[0];
				foundChat = true;
				getChannel(target)
				//observer.disconnect();
			}
        }else {
			if (foundChat) console.log("Lost Chat");
			foundChat = false;
			emotes = []
			channelEmotes = []
			chatObserver.disconnect();
		}
    })
});

var getChannel = function(target){
	console.log(window.location.pathname)
	var loc = window.location.pathname.split("/")[1]
	console.log(loc)
	if (loc){
		channel = channelDisplay = loc.toLowerCase();
		$.getJSON("https://api.twitch.tv/kraken/users/"+channel,function(data){
			channelDisplay = data["display_name"]
		}).fail(function(){console.log("Error retrieving display name")}).always(function(){
			fetchEmotes(function(){
				chatObserver.observe(target, config);
				console.log("EMOTES: ",emotes);
			});
		});
	}else{
		console.log("Couldn't identify channel...Where are you?")
		console.log(window.location.href)
	}

}

chatLoadedObserver.observe(htmlBody, config);

// Attach listener that acts when a new chat message appears.
var chatObserver = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    mutation.addedNodes.forEach(function (addedNode) {
      var chatMessage = $(addedNode);
      if (!chatMessage.is(".chat-line", ".message-line")) {
        // this isn't a chat message, skip processing.
        return;
      }
      parseMsgHTML(chatMessage);
    });
  });
});


var parseMsgHTML = function (msg) {
	injectMessageElements(msg);
	adjustNameColor(msg);
};

var injectMessageElements = function(msg) {
	var msgElement = msg.find(".message")
	if (!msgElement[0]) return;
	var contents = msgElement[0].childNodes
	var s = ""
	for (var i = 0; i < contents.length; i++){
		var e = contents[i];
		if (e instanceof Text){
			//Check text element for unparsed emotes
			s += processText(e.data)
		}
		else if (e){
			s += e.outerHTML
		}
	}
	msgElement.html(s);
}

var adjustNameColor = function(msg){
	var minL = 0.0;
	var maxL = 0.5;
	if (isDarkMode()){
		minL = 0.60;
		maxL = 1.0;
	}

	nameElement = msg.find(".from");
	color = $(nameElement).css("color");
	rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	color =  "#" + componentToHex(+rgb[1]) + componentToHex(+rgb[2]) + componentToHex(+rgb[3]);
	console.log(color)
	$(nameElement).attr("truecolor",color);
	console.log(minL, maxL)
	newRgb = clampLightness(hexToRgb(color),minL, maxL);
	$(nameElement).css("color",rgbToHex(newRgb[0],newRgb[1],newRgb[2]));
}

var isDarkMode = function(){
	return $("body").hasClass("darkmode");
}

var processText = function(text,n){
	n = n || 0;
	if (n > 1000) return text; //No infinite recursion pls.
	if (text && text.trim()){
		var s = ""
		for (var i = 0; i < emotes.length; i++){
			var emote = emotes[i];
			if (text.length >= emote.name.length){
				var re = emote.re;
				re.lastIndex = 0;
				var match = re.exec(text);
				var lastIndex = re.lastIndex
				if(match){
					s += processText(text.substring(0,lastIndex - emote.name.length), n+1) +
						'<span class="balloon-wrapper">' +
						'<img class="emoticon' + (emote.ext == "BTTV" ? ' bttv-emo-' + emote.id : "") + '" src="' + emote.url + '" alt="'+ emote.name +'">' +
							'<div class="balloon balloon--tooltip balloon--up balloon--right mg-t-1">' +
								'<center>Emote: ' + emote.name + "<br />" + emote.setName + '</center>' +
							'</div>'+
						'</span>';
					text = text.substring(lastIndex);
					i--;
				}
			}
		}
		return s + text;
	}
	return text;
}


var fetchEmotes = function(callback){
	console.log(emotes)
	if (globalEmotes.length){
		getFFZEmotes(null,function(){
			getFFZEmotes(channel,function(){
				emotes = globalEmotes.concat(channelEmotes)
				if(callback) callback();
			});
		});
	}else{
		getBTTVEmotes(null,function(){
			getBTTVEmotes(channel,function(){
				getFFZEmotes(null,function(){
					getFFZEmotes(channel,function(){
						emotes = globalEmotes.concat(channelEmotes)
						if(callback) callback();
					});
				});
			});
		});
	}
}

var getBTTVEmotes = function(chan,callback){
	callback = callback || function(){};
	var url = "//api.betterttv.net/2/emotes/"
	if (chan) url = "//api.betterttv.net/2/channels/" + chan.toLowerCase();
	var emotes = globalEmotes;
	if (chan) emotes = channelEmotes;
	console.log(url)
	$.getJSON(url, function(data){
		if (data.error) return null;
		for (var i in data["emotes"]){
			var emote = data["emotes"][i];
			emote.image = new Image();
			emote.image.src = data["urlTemplate"].replace("{{id}}",emote.id).replace("{{image}}","1x");

			emotes.push({
				name: emote.code,
				owner: emote.channel || "[Global]",
				setName: (emote.channel ? "Channel: " + channelDisplay : "BetterTTV Global Emote"),
				image: emote.image,
				url: emote.image.src,
				id: emote.id,
				ext: "BTTV",
				re: RegExp("(?:^|\\s|&nbsp;|&NBSP;)(" + RegExp.escape(emote.code) + ")(?=$|\\s+)","g")
			});
		}
	}).fail(function(){console.log("ERROR")}).always(callback);
}

var getFFZEmotes = function(chan,callback){
	callback = callback || function(){};
	var url = "//api.frankerfacez.com/v1/set/global"
	if (chan) url = "//api.frankerfacez.com/v1/room/" + chan.toLowerCase()
	var emotes = globalEmotes;
	if (chan) emotes = channelEmotes;
	$.getJSON(url, function(data){
		for (var i in data["sets"]){
			//check data["default_sets"] to see if set is contained
			var set = data["sets"][i];
			for (var j in set["emoticons"]){
				var emote = set["emoticons"][j];
				emote.image = new Image();
				emote.image.src = emote.urls[1]

				emotes.push({
					name: emote.name,
					owner: emote.owner.display_name,
					setName: (set.title == "Global Emoticons" ? "FFZ Global Emoticons" : "FFZ " + set.title),
					image: emote.image,
					url: emote.image.src,
					id: emote.id,
					ext: "FFZ",
					re: RegExp("(?:^|\\s|&nbsp;|&NBSP;)(" + RegExp.escape(emote.name) + ")(?=$|\\s+)","g")
				})
			}
		}
	}).always(callback);
}



/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}


/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   {number}  r       The red color value
 * @param   {number}  g       The green color value
 * @param   {number}  b       The blue color value
 * @return  {Array}           The HSL representation
 */
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16)
	] : null;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function clampLightness(rgb, minLightness, maxLightness){
	hsl = rgbToHsl(rgb[0],rgb[1],rgb[2]);
	hsl[2] = Math.max(minLightness, Math.min(maxLightness, hsl[2]));
	return hslToRgb(hsl[0], hsl[1], hsl[2]);
}


/*

Message Format:

<li id="ember4881" class="ember-view message-line chat-line"><div class="indicator"></div>
<!---->  <span class="timestamp float-left">12:30</span>
<!----><!---->  <span class="badges float-left">
<!---->  </span>
  <span class="from" style="color:#NAMECOLOR" data-ember-action="4882">TWITCH_USERNAME</span>
  <span class="colon">:</span>
      <span class="message" style="">
            SOME TEXT
            <span class="balloon-wrapper">
              <img class="emoticon" src="//static-cdn.jtvnw.net/emoticons/v1/245/1.0" srcset="//static-cdn.jtvnw.net/emoticons/v1/245/2.0 2x" alt="ResidentSleeper">
              <div class="balloon balloon--tooltip balloon--up balloon--center mg-t-1">ResidentSleeper</div>
            </span>
      </span>
<!----><!----></li>
*/
