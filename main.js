var config = {attributes: false, childList: true, characterData: false};

var htmlBody = $("body")[0];
var chatLoadedObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
        var chatSelector = $(".chat-lines");
        if (chatSelector.length > 0) {
            // Select the node element.
            var target = chatSelector[0];

            // Pass in the target node, as well as the observer options
            chatObserver.observe(target, config);

            // Unregister chatLoadedObserver. We don't need to check for the chat element anymore.
            observer.disconnect();
        }
    })
});

chatLoadedObserver.observe(htmlBody, config);

// Bard Search
// Attach listener that acts when a new chat message appears.
var chatObserver = new MutationObserver(function (mutations) {
  // For each mutation object, we look for the addedNode object
  mutations.forEach(function (mutation) {
    // A chat message would be an added node
    mutation.addedNodes.forEach(function (addedNode) {
      // At this point it's potentially a chatMessage object.
      var chatMessage = $(addedNode);
      if (!chatMessage.is(".chat-line", ".message-line")) {
        // this isn't a chat message, skip processing.
        return;
      }
      // Grab the actual span element with the message content
      var messageElement = chatMessage.children(); //twitchChatMessageContent

      parseMsgHTML(chatMessage);
    });
  });
});

// Twitch chat message element: rich with media.
var parseMsgHTML = function (msgHTML) {
	console.log(msgHTML[0])
};