Template.display_bidding_options.helpers({
  getPlayers : function() {
    console.log(PlayerResponse.find({}, {fields:{tagpro:1}}));
    return PlayerResponse.find({}, {fields:{tagpro:1}});
  },
  isSnakeDraft:function() {
      return AuctionData.findOne({}).State == "Snake";
  },
  isPicking:function() {
    return AuctionData.findOne({"Nominator":Meteor.user().username});
  },
  isCaptain: function() {
    if(!Meteor.user())
      return false;
    if(TeamData.findOne({"name" : Meteor.user().username, "captain" : true}) != undefined) {
        return true;
    }
    return false;
  },
  canStopPicking:function() {
      return (TeamNames.findOne({"captain":Meteor.user().username}).numrosterspots >= 8);
  },
  isNominationTime: function() {
    if(AuctionData.findOne({}) !== undefined)
      return AuctionData.findOne({}).State == "Nominating";
  },
  isTurnToNominate: function()
  {
    if(!Meteor.userId())
      return false;
    players = PlayerResponse.find({}, {fields:{tagpro:1}});
    Session.set("players", players);
    return (AuctionData.findOne({}).Nominator == Meteor.user().username);
  },
  canBid: function() {
    if(Meteor.userId() == undefined) {
      return false;
    }
    else if(AuctionData.findOne({}).lastBidder == Meteor.user().username) {
      return false;
    }
    return true;
  },
  sufficientFunds: function()
  {
    if(Meteor.user() !== undefined) {
      var team = TeamNames.findOne({"captain":Meteor.user().username});
      var balance = parseInt(team.money);
      //console.log(team, keepers, balance);
      //console.log(Meteor.user().username);
      //console.log("Current balance w/o keeper: ", balance);
      //console.log(AuctionData.findOne({}), AuctionData.findOne({}).currentPlayer);
      keepers = Keepers.findOne({'captain':Meteor.user().username}).keepers;
      if(keepers.indexOf(AuctionData.findOne({}).currentPlayer) >= 0 || Meteor.call("isKeeper", team.captain, AuctionData.findOne({}).currentPlayer)) {
        balance += parseInt(team.keepermoney);
      }
      console.log("Current balance w/ keeper: ", balance);
      var minBid = parseInt(AuctionData.findOne({}).currentBid)+1;

      if(balance < minBid) {
        return false;
      }
      else {
        return true;
      }
    }
    return false;
  },
  bids: function()
  {
    if(AuctionData.findOne({}) !== undefined) {
      var bids = [];
      var currentBid = parseInt(AuctionData.findOne({}).currentBid);
      var team = TeamNames.findOne({"captain":Meteor.user().username});
      money = parseInt(team.money) + parseInt(team.keepermoney);
      console.log(Meteor.user().username, " has ", money);
      if(currentBid+1 <= money) {
        bids.push({'bid':currentBid+1});
      }
      if(currentBid+2 <= money) {
        bids.push({'bid':currentBid+2});
      }
      if(currentBid+3 <= money) {
        bids.push({'bid':currentBid+3});
      }
      if(currentBid+5 <= money) {
        bids.push({'bid':currentBid+5});
      }
      if(currentBid+10 <= money) {
        bids.push({'bid':currentBid+10});
      }
      return bids;
    }
  }
});

Template.display_bidding_options.events(
  {
    'submit .bid-on-player' : function(event)
    {
        var bid = parseInt(event.target.amount.value);
        if(bid >= 0) {
          Meteor.call("acceptBid", Meteor.user().username, bid, new Date().getTime());
        }
        Session.set("playSound", "bid")
        return false;
    },
    'submit .nominate-player' : function(event)
    {
        var player = event.target.player.value;
        var bid = parseInt(event.target.amount.value);
        if(!bid || bid < 0) {
          bid = 0;
        }
        Meteor.call("toggleState", player, bid);
        return false;
    },
    'click .bid-button' : function(event) {
        var bid = parseInt(event.currentTarget.getAttribute('amount'));
        if(bid >= 0) {
          Meteor.call("acceptBid", Meteor.user().username, bid, new Date().getTime());
        }
        Session.set("playSound", "bid")
        return false;
    },
    'submit .select-player' : function(event)
    {
        var player = event.target.player.value;
        Meteor.call("toggleState", player, 0);
        return false;
    },
    'submit .stop-selecting' : function(event) {
        Meteor.call("finishPicking",Meteor.user().username);
        return false;
    }
  }
);
