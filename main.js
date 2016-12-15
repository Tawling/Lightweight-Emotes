var config = {attributes: false, childList: true, characterData: false};
var emotes = [];
var foundChat = false;
var htmlBody = $("body")[0];
var channel = ""
var channelDisplay = ""

RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var chatLoadedObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
		console.log(mutation)
        var chatSelector = $(".chat-lines");
        if (chatSelector.length > 0) {
			if (!foundChat){
				var target = chatSelector[0];
				foundChat = true;
				fetchEmotes(function(){
					chatObserver.observe(target, config);
					console.log("EMOTES: ",emotes);
				});
				//observer.disconnect();
			}
        }else {
			foundChat = false;
			emotes = []
			chatObserver.disconnect();
		}
    })
});

var getChannel = function(){
	console.log(window.location.pathname)
	var loc = window.location.pathname.split("/")[1]
	console.log(loc)
	if (loc){
		channel = channelDisplay = loc.toLowerCase();
		$.getJSON("https://api.twitch.tv/kraken/users/"+channel,function(data){
			channelDisplay = data["display_name"]
		}).fail(function(){console.log("error getting stuff")}).always(function(){
			chatLoadedObserver.observe(htmlBody, config);
		});
	}else{
		console.log("Couldn't identify channel...Where are you?")
		console.log(window.location.href)
	}
	
}

getChannel()

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
	var msgElement = msg.find(".message")
	
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
	msgElement.html(s)
};

var processText = function(text,n){
	n = n || 0
	if (n > 20) return text;
	if (text){
		var s = ""
		for (var e in emotes){
			var emote = emotes[e];
			var re = RegExp("(?:^|\\s|&nbsp;|&NBSP;)(" + RegExp.escape(emote.name) + ")(?=$|\\s+)","g");
			var match = re.exec(text);
			if(match){
				s += processText(text.substring(0,re.lastIndex - emote.name.length), n+1) +
					'<span class="balloon-wrapper">' +
					'<img class="emoticon" src="' + emote.url + '" alt="'+emote.name+'">' +
						'<div class="balloon balloon-tooltip balloon--up balloon--center mg-t-1">' + emote.name + '</div>'+
					'</span>';
					//"<b style='color:red;'>" +emote.name + "</b>";
				text = text.substring(re.lastIndex);
			}
		}
		return s + text;
	}
	return text;
}

/*
 <span class="balloon-wrapper">
              <img class="emoticon" src="//static-cdn.jtvnw.net/emoticons/v1/245/1.0" srcset="//static-cdn.jtvnw.net/emoticons/v1/245/2.0 2x" alt="ResidentSleeper">
              <div class="balloon balloon--tooltip balloon--up balloon--center mg-t-1">ResidentSleeper</div>
            </span>
*/


var fetchEmotes = function(callback){
	console.log(emotes)
	emotes = []
	getBTTVEmotes(null,function(){
		getBTTVEmotes(channel,function(){
			getFFZEmotes(null,function(){
				getFFZEmotes(channel,function(){
					if(callback) callback();
				});
			});
		});
	});
}

var getBTTVEmotes = function(chan,callback){
	callback = callback || function(){};
	var url = "//api.betterttv.net/2/emotes/"
	if (chan) url = "//api.betterttv.net/2/channels/" + chan.toLowerCase();
	console.log(url)
	$.getJSON(url, function(data){
		if (data.error) return null;
		for (var i in data["emotes"]){
			var emote = data["emotes"][i];
			emote.image = new Image();
			emote.image.src = data["urlTemplate"].replace("{{id}}",emote.id).replace("{{image}}","1x");
			
			emotes.push({
				name: emote.code,
				owner: emote.channel || "Global BTTV Emote",
				setName: "Channel: " + channelDisplay,
				image: emote.image,
				url: emote.image.src,
				id: emote.id,
				ext: "BTTV"
			});
		}
	}).fail(function(){console.log("ERROR")}).always(callback);
}

var getFFZEmotes = function(chan,callback){
	callback = callback || function(){};
	if (chan) {
		var url = "//api.frankerfacez.com/v1/room/" + chan.toLowerCase()
		$.getJSON(url, function(data){
			for (var i in data["sets"]){
				var set = data["sets"][i];
				for (var j in set["emoticons"]){
					var emote = set["emoticons"][j];
					emote.image = new Image();
					emote.image.src = emote.urls[1]
					
					emotes.push({
						name: emote.name,
						owner: emote.owner.display_name,
						setName: set.title,
						image: emote.image,
						url: emote.image.src,
						id: emote.id,
						ext: "FFZ"
					})
				}
			}
		}).always(callback);
	} else {
		var url = "//api.frankerfacez.com/v1/set/global"
		$.getJSON(url, function(data){
			for (var i in data["sets"]){
				var set = data["sets"][i];
				for (var j in set["emoticons"]){
					var emote = set["emoticons"][j];
					emote.image = new Image();
					emote.image.src = emote.urls[1]
					
					emotes.push({
						name: emote.name,
						owner: emote.owner.display_name,
						setName: set.title,
						image: emote.image,
						url: emote.image.src,
						id: emote.id,
						ext: "FFZ"
					})
				}
			}
		}).always(callback);
	}
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