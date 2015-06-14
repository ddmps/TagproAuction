// Messages
Template.messages.helpers({
  messages: function() {
    return Messages.find({}, {sort: {createdAt: -1}, limit:50});
  },
  getMessageText: function() {
    return Messages.findOne({}, {sort: {createdAt: -1}}).text;
  },
  canSendMessage: function() {
    if(!Meteor.userId())
      return false;
    return true;
  },
  admin : function() {
    if(Meteor.user() !== undefined) {
      if(Administrators.indexOf(Meteor.user().username) >= 0) {
        return true;
      }
    }
    return false;
  },
  messageColor: function(messageType) {
    // Class to add to the message (for coloring or sending information to the client)
    if(messageType == "winningBid") {
      return "list-group-item-success";
    }
    else if(messageType == "bid") {
      return "list-group-item-warning";
    }
    else if(messageType == "nomination") {
      return "list-group-item-info"
    }
    else if(messageType == "animate") {
      return "hidden winningTeam"
    }
    else {
      return "";
    }
  }
});
Template.messages.events(
  {
    'submit' : function(event)
    {
      //console.log("Got a new message from ", Meteor.user().username);
      //console.log("Message text:", event.target.text.value);
      if(!Meteor.userId()) {
        return false;
      }
      var text = Meteor.user().username + ": " + event.target.text.value;
      Meteor.call("insertMessage", text, new Date(), "textMessage");
      event.target.text.value = "";
      return false;
    },
    'click .delete' : function() {
      Meteor.call("removeMessage", this._id);
    }
  });
Template.getmessages.helpers({
    lastXmessages: function(limit) {
      return Messages.find({}, {sort: {createdAt: -1}, limit:parseInt(limit)});
    },
    admin : function() {
      if(Meteor.user() !== undefined) {
        if(Administrators.indexOf(Meteor.user().username) >= 0) {
          return true;
        }
      }
      return false;
    },
    messageColor: function(messageType) {
      // Class to add to the message (for coloring or sending information to the client)
      if(messageType == "winningBid") {
        return "winningbid";
      }
      else if(messageType == "bid") {
        return "list-group-item-warning";
      }
      else if(messageType == "nomination") {
        return "list-group-item-info";
      }
      else if(messageType == "animate") {
        Session.set("playSound", "playerWon");
        return "hidden winningTeam";
      }
      else if(messageType == "started") {
        return "list-group-item-info";
      }
      else if(messageType == "paused") {
        return "list-group-item-danger";
      }
      else if(messageType == "bidIndication") {
         return "hidden justBid"
      }
      else {
        return "";
      }
    }
  });
