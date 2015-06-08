Template.display_time.helpers(
  {
    time : function() {
      if(AuctionData.findOne({}) !== undefined) {
        var curtime = Session.get('time') + Session.get('serverTimeOffset');
        var remainingTime = AuctionData.findOne({}).nextExpiryDate;
        var secsLeft = Math.ceil((remainingTime - curtime)/100)/10;
        if(secsLeft < 0) {
          //Meteor.call("checkForToggle");
        }
        else {
          formattedSeconds = String(secsLeft)
          if(parseInt(secsLeft) == secsLeft) {
            formattedSeconds += ".0";
          }
          if(secsLeft < 10) {
            formattedSeconds = "0"+formattedSeconds;
          }
          return formattedSeconds;
        }
      }
    },
    currentNominatingPlayer : function() {
      if(AuctionData.findOne({}) !== undefined)
        return AuctionData.findOne({}).Nominator;
    },
    personBeingBidOn : function() {
      if(AuctionData.findOne({}) !== undefined) {
        name = AuctionData.findOne({}).currentPlayer;
        currentPlayerInfo = PlayerResponse.findOne({"tagpro":name});
        return name;
      }
    },
    currentPlayerInfo: function() {
      if(AuctionData.findOne({}) !== undefined) {
        return PlayerResponse.findOne({"tagpro":AuctionData.findOne({}).currentPlayer});
      }
    },
    bidAmount :function()
    {
      if(AuctionData.findOne({}) !== undefined)
        return AuctionData.findOne({}).currentBid;
    },
    lastBidder : function()
    {
      if(AuctionData.findOne({}) !== undefined)
        return AuctionData.findOne({}).lastBidder;
    },
    isNominationTime: function()
    {
      if(AuctionData.findOne({}) !== undefined) {
        auction_state = AuctionData.findOne({}).State;
        Session.set("nominationTime",  auction_state == "Nominating");
        return auction_state == "Nominating";
      }
    },
    isTurnToNominate: function()
    {
      if(!Meteor.userId())
        return false;
      if(AuctionData.findOne({}) !== undefined) {
        nominator = AuctionData.findOne({}).Nominator;
        myNomination = Meteor.user().username == nominator;
        if(myNomination) {
          Session.set("playSound", "myNomination");
        }

        return myNomination;
      }
    },
    auctionPaused : function() {
      if(AuctionStatus.findOne({}) !== undefined) {
        status = AuctionStatus.findOne({}).status;
        return (status == "Paused" || status == "Not Started");
      }
    },
    auctionMessage: function()
    {
        if(AuctionStatus.findOne({}) !== undefined) {
            status = AuctionStatus.findOne({}).status;
            if(status == "Paused")
                return "Auction is paused"
            else
                return "Auction has not started"
        }
    },
    getsnarkymessage: function()
    {
      options = ["Hurry it up ", "We don't have all day, ", "Waiting on you ", "Getting old here, ", "Take your time ", "No rush ", "C'mon ", "Need some help "]
      idx = Math.floor(Math.random() * options.length)
      return options[idx];
    },
    nextNominator: function()
    {
      nextorder = Nominators.findOne({"name":"nextInOrder"}).nextorder;
      var nextNominator = Nominators.findOne({"order":nextorder}).name;
      //console.log
      return nextNominator;
    },
    nextSnakeNominator: function() {
        console.log("test");
        var nextPickOrder = SnakeOrder.findOne({"name":"nextInOrder"});
        console.log(nextPickOrder);
        nextordernumber = nextPickOrder.nextorder;
        console.log("test2");
        round = Math.ceil(nextordernumber/20);
        order = nextordernumber - ((round - 1)*20);
        var nextNominator = SnakeOrder.findOne({"order":order,"round":round});
        if(nextordernumber > 140) {
            return "Nobody";
        }
        else {
            while(!nextNominator.picking) {
                nextordernumber += 1;
                if(nextordernumber == 141) {
                    return "Nobody";
                }
                round = Math.ceil(nextordernumber/20);
                order = nextordernumber - ((round - 1)*20);
                nextNominator = SnakeOrder.findOne({"order":order,"round":round});
            }
            return nextNominator.name;
        }
    },
    isPickTime : function() {
      state = AuctionData.findOne({});
      if(state.State == "Snake") {
          return true;
      }
      return false;
    }
  });
