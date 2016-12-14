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


var parseMsgHTML = function (msgHTML) {
	console.log(msgHTML[0])
};