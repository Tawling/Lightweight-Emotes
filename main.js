var config = {attributes: false, childList: true, characterData: false};

var htmlBody = $("body")[0];
var chatLoadedObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
        var chatSelector = $(".chat-lines");
        if (chatSelector.length > 0) {
            var target = chatSelector[0];
            chatObserver.observe(target, config);
            observer.disconnect();
        }
    })
});

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
	
	var contents = msgElement[0].childNodes
	var s = ""
	for (var i = 0; i < contents.length; i++){
		var e = contents[i];
		if (e instanceof Text){
			//Check text element for unparsed emotes
			if (e.data){
				if(e.data.indexOf("LUL") > -1){
					s += "<b style='color:red;'>LUL</b>"
				}else{
					s += e.data
				}
			}
		}
		else if (e){
			s += e.outerHTML
		}
	}
	msgElement.html(s)
};

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