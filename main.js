var config = {attributes: false, childList: true, characterData: false};
var emotes = [];
var channelEmotes = [];
var globalEmotes = [];
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
};

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
						'<img class="emoticon" src="' + emote.url + '" alt="'+ emote.name +'">' +
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
			var set = data["sets"][i];
			for (var j in set["emoticons"]){
				var emote = set["emoticons"][j];
				emote.image = new Image();
				emote.image.src = emote.urls[1]
				
				emotes.push({
					name: emote.name,
					owner: emote.owner.display_name,
					setName: (set.title == "Global Emoticons" ? "FFZ Global Emoticons" : set.title),
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