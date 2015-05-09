WarningMessage = new Mongo.Collection("warningmessage");
AuctionData = new Mongo.Collection("auctiondata");
PausedAuction = new Mongo.Collection("pauseddata");
TeamData = new Mongo.Collection('teams');
TeamNames = new Mongo.Collection('teamnames');
Divisions = new Mongo.Collection('divisions');
DraftablePlayers = new Mongo.Collection('players');
Messages = new Mongo.Collection('messages');
BidHistory = new Mongo.Collection('bids');
Nominators = new Mongo.Collection('nominators');
Keepers = new Mongo.Collection('keepers');
NextNominator = new Mongo.Collection('nextnominator');
CurrentPick = new Mongo.Collection('currentpick');
AuctionStatus = new Mongo.Collection("auctionstatus");
AuctionLock = new Mongo.Collection("auctionlock");
PreviousAuctionData = new Mongo.Collection("previousauctiondata");
PlayerResponse = new Mongo.Collection("playerResponse");
BoardHelpers = new Mongo.Collection("boardhelpers");
Administrators = new Mongo.Collection("admins");

Meteor.methods({
    isKeeper: function(bidder, player) {
        keepers = Keepers.findOne({"captain":bidder}).keepers;
        if(keepers.indexOf(player) >= 0) {
            return true;
        }
        return false;
    },
    undoNomination : function(person) {
        var bidTime = 25000;
        ad = AuctionData.findOne({});
        if(ad.Nominator !== undefined) {
            nominator = ad.Nominator;
            AuctionData.remove({});
            AuctionData.insert({State: "Nominating", nextExpiryDate: new Date().getTime()+bidTime, Nominator: nominator, startTime:new Date().getTime()});
            var text = "Last nomination removed by " + person;
            Meteor.call("insertMessage", text, new Date());
        }
    },
    resumeAuction : function (person) {
        var additionTime = 15000;
        if(AuctionData.findOne({State:"Nominating"}) !== undefined) {
            return false;
        }
        pa = PausedAuction.findOne();
        console.log(pa);
        pa.nextExpiryDate = new Date().getTime() + additionTime;
        AuctionStatus.update({}, {"status":"Live"});
        AuctionData.remove({});
        AuctionData.insert(pa);
        Meteor.call("insertMessage", "Auction resumed by "+person, new Date(), "started");
    },
    pauseAuction : function(person) {
        PausedAuction.remove({});
        ad = AuctionData.findOne();
        secondsLeft = ad.nextExpiryDate - new Date().getTime();
        console.log(ad);
        PausedAuction.insert(ad);
        PausedAuction.update({}, {$set: {"secondsLeft": secondsLeft}});
        Meteor.call("insertMessage", "Auction paused by "+person, new Date(), "paused");
        AuctionStatus.update({}, {"status":"Paused"});
        AuctionData.remove({})
    },
    startAuction: function(person) {
        var bidTime = 25000;
        console.log("Starting auction");
        Meteor.call("insertMessage", "Auction started by "+person, new Date(), "started");
        nominator = Meteor.call('pickNominator');
        console.log("nominator is: " + nominator.name);
        AuctionData.remove({});
        AuctionData.insert({State: "Nominating", nextExpiryDate: new Date().getTime()+bidTime, Nominator: nominator.name,  startTime:new Date().getTime()});
        AuctionStatus.update({}, {"status":"Live"});
    },
    removeMessage : function(messageid) {
        Messages.remove(messageid);
    },
    updatePacketValue : function(message, ranking, username) {
        console.log(message);
        PlayerResponse.update({meteorUserId: username}, {$set: {ranking: parseInt(ranking)}});
    },
    insertSignup : function(dataToSend) {
        PlayerResponse.insert(dataToSend);
        console.log("Got signup from: " + dataToSend.meteorUserId);
    },
    editSignup: function(dataToSend) {
        PlayerResponse.remove({"meteorUserId" : dataToSend.meteorUserId});
        PlayerResponse.insert(dataToSend);
        console.log("edited signup from: " + dataToSend.meteorUserId);
    },
    getSignedUp : function(playername) {
        var num = PlayerResponse.find({meteorUserId:playername}).count();
        return num;
    },
    getServerTime: function () {
        var _time = (new Date).getTime();
        return _time;
    },
    pickNominator : function() {
        console.log("pickNominator: started");
        var nextInOrder = Nominators.findOne({"name":"nextInOrder"});
        var nextOrder = nextInOrder.nextorder;
        var captain = Nominators.findOne({"order":nextOrder});
        var newnextorder = (nextOrder+1) % (Nominators.find({}).count()-1);
        console.log("pickNominator: nextOrder: " + nextInOrder.nextorder);
        console.log("pickNominator: captain: " + captain.name + " rosterfull? " + captain.rosterfull);
        console.log("pickNominator: newnextorder: " + newnextorder);
        Nominators.update({"name":"nextInOrder"}, {$set: {"nextorder": newnextorder}});
        // loop through nominators in order until we find one without a full roster
        if(captain.rosterfull) {
            return Meteor.call('pickNominator');
        }

        nextNominator = Nominators.findOne({"order":newnextorder});
        var text = "Waiting for "+captain.name +" to nominate pick "+CurrentPick.findOne({}).pick+" of the draft.";
        Meteor.call("insertMessage", text, new Date());
        var text = nextNominator.name +" is nominating after "+ captain.name;
        Meteor.call("insertMessage", text, new Date());
        return captain;
    },
    insertMessage:function(text, createdAt, messageType) {
        var texttowrite = text;
        Messages.insert({text:texttowrite,createdAt:new Date(),messageType:messageType});
    },
    acceptBid: function(bidder, amount, clienttime) {
        var bidTimeout = 0;
        var additionTime = 10000;
        // Gotta be logged in. Just precautionary.
        if(!Meteor.userId()) {
            console.log("acceptBid: no user");
            return false;
        }
        else
        {
            console.log("acceptBid: bid from " + Meteor.user().username);
        }

        // Check state of auction
        var state = AuctionData.findOne({});
        if(state.State == "Nominating") {
            //console.log("acceptBid: Can't bid right now");
            return false;
        }

        // Alright let's check this thang out.
        console.log("acceptBid: Got State & we're bidding");

        // First, is the bid enough?
        if(parseInt(state.currentBid) < parseInt(amount)) {

            // K cool, does the player have this much money?
            team = TeamNames.findOne({captain:bidder});
            var availablebidamt = parseInt(team.money);
            if(Meteor.call("isKeeper", bidder, state.currentPlayer)) {
                availablebidamt += parseInt(team.keepermoney);
            }

            if(parseInt(amount) <= parseInt(availablebidamt)) {
                // Cool, he does. Is it in time?
                console.log("acceptBid: good amount");
                // I can't bid when the time is still valid, this fixes it
                //if() {
                if(team.count < team.numrosterspots) {
                    if(parseInt(state.nextExpiryDate) > parseInt(new Date().getTime())) {  // Sweet it was. Let's mark it down!
                        console.log("acceptBid: nextExpiryDate good");

                        console.log("acceptBid: Times: "+ state.nextExpiryDate + " vs " + clienttime);

                        secondsLeft = state.nextExpiryDate - new Date().getTime();

                        if(!(state.lastBidder == bidder)) {
                            BidHistory.insert({
                                bidder: bidder,
                                amount: amount,
                                player: state.currentPlayer,
                                createdAt: new Date().getTime(),
                                secondsLeft: secondsLeft
                            });
                            AuctionData.update(
                                {State: "Bidding"},
                                {$set: {currentBid: amount, lastBidder: bidder}}
                            );

                            Meteor.call("insertMessage",
                            bidder + " bids " + amount + " on " + AuctionData.findOne({}).currentPlayer,
                            new Date(), "bid");
                            Meteor.call("insertMessage", team.teamname, new Date(), "bidIndication");
                            console.log("acceptBid: inserted bid");
                            // Do we need to give some time back?
                            timeoutTime = secondsLeft;
                            if(parseInt(secondsLeft) < 15000) {
                                AuctionData.update({State: "Bidding"}, {$set: {nextExpiryDate: new Date().getTime()+additionTime}});
                                timeoutTime = additionTime;
                            }

                            if(bidTimeout) {
                                Meteor.clearTimeout(bidTimeout);
                            }
                            bidTimeout = Meteor.setTimeout(function() {
                                Meteor.call("checkForToggle");
                            }, timeoutTime);

                            return true;
                        } else {
                            console.log("why would you bid 2x in a row?")
                            return false;
                        }
                    } else {
                        console.log("acceptBid: too late: "+ state.nextExpiryDate + " vs " + clienttime);
                    }
                } else {
                    console.log("acceptBid: this captain already has a full roster...");
                }
            }
            else {
                console.log("acceptBid: you outta money homie.");
            }
        } else {
            console.log("acceptBid: bad amount: " + state.currentBid + " vs " + amount + ".");
        }
        return false;
    },
    toggleState: function(playerNominated, bid) {
        var bidTime = 25000;
        var bidTimeout = 0;
        console.log("Checking toggle state");

        var state = AuctionData.findOne();

        if(state !== undefined && state.State == "Nominating") {
            console.log("State is nominating");
            var team = TeamNames.findOne({captain:state.Nominator});
            var money = team.money;

            if(Meteor.call("isKeeper", state.Nominator, playerNominated)) {
                money = team.money + team.keepermoney;
            }
            if(money < parseInt(bid)) {
                console.log("Tried to nominate someone for too much money");
                return false;
            }

            if(PlayerResponse.find({playername : playerNominated}).count() == 0) {
                console.log("Player not signed up!");
                return false;
            }

            if(TeamData.find({name: playerNominated}).count() > 0)
            {
                console.log("Can't nominate someone on a team!");
                return false;
            }

            Meteor.call("insertMessage", state.Nominator + " nominates " + playerNominated + " with an initial bid of " + bid, new Date(), "nomination");
            Meteor.call("insertMessage", team.teamname, new Date().getTime(), "bidIndication");

            BidHistory.insert({bidder: state.Nominator, amount: bid, player: playerNominated, createdAt: new Date().getTime(), secondsLeft:bidTime});

            AuctionData.remove({});

            if(bidTimeout) {
                Meteor.clearTimeout(bidTimeout);
            }
            bidTimeout = Meteor.setTimeout(function() {
                Meteor.call("checkForToggle");
            }, bidTime);

            return AuctionData.insert({State: "Bidding", nextExpiryDate: new Date().getTime()+bidTime, currentBid: bid, currentPlayer: playerNominated, lastBidder: state.Nominator, Nominator:state.Nominator});
        }
        else if (state !== undefined)
        {
            AuctionData.remove({});
            console.log("Not nominating... someone won!");
            var team = TeamNames.findOne({"captain" : state.lastBidder});
            var playerWon = state.currentPlayer;

            // ALL CAPS-specific thing here
            if(state.lastBidder == "BALLDON'TLIE") {
                playerWon = playerWon.toUpperCase();
            }

            // handle keepers
            keepers = Keepers.findOne({"captain":state.lastBidder}).keepers;
            var keepermoney = team.keepermoney;
            var money = team.money;

            if(keepers.indexOf(playerWon) >= 0) {
                console.log(playerWon, " is a keeper!");
                keepermoney = keepermoney - (state.currentBid > 5 ? 5 : state.currentBid);

                if(keepermoney < 0) {
                    money = money - Math.abs(keepermoney);
                    keepermoney = 0;
                }
            }
            else {
                money = money - state.currentBid;
            }

            var playerOrder = parseInt(team.count) + 1;
            // Put him in the roster
            TeamData.update({"teamname": team.teamname, "order" : playerOrder}, {$set: {"name": playerWon, "cost": state.currentBid}});
            TeamNames.update({"teamname": team.teamname}, {$set: {"count":playerOrder, "money":money, "keepermoney":keepermoney}});
            // Prevent players from searching him
            PlayerResponse.update({"tagpro":playerWon}, {$set:{"drafted":true}});
            // Check if he's the last one for his team
            if(playerOrder == team.numrosterspots) {
                Nominators.update({"name": state.lastBidder}, {$set: {"rosterfull": true}});
            }
            // Log message
            var text = state.lastBidder + " wins " + playerWon + " for " + state.currentBid + "!";
            Meteor.call("insertMessage", text, new Date(), "winningBid");
            Meteor.call("insertMessage", team.teamname, new Date(), "animate");

            // Reset state
            nominator = Meteor.call("pickNominator");
            CurrentPick.update({}, {$inc:{'pick':1}});
            var text = "Waiting for "+nominator +" to nominate the "+CurrentPick.findOne({}).pick+" pick of the draft.";
            Nominators.update({name:nominator.name}, {$set:{nominated:true}});
            return AuctionData.insert({State: "Nominating", nextExpiryDate: new Date().getTime()+10000, Nominator: nominator.name,  startTime:new Date().getTime()});
        }
    },
    removeLastBid : function(person) {
        auctionState = AuctionStatus.find({}).state;
        if(auctionState !== "Paused") {
            var currentState = AuctionData.findOne();
            var lastbid = BidHistory.findOne({"player": currentState.currentPlayer},{sort:{"createdAt":-1}});
            BidHistory.remove({"_id" : lastbid._id});
            var lastbid2 = BidHistory.findOne({"player":currentState.currentPlayer},{sort:{"createdAt":-1}});
            AuctionData.update(
                {State: "Bidding"},
                {$set: {currentBid: lastbid2.amount, lastBidder: lastbid2.bidder, nextExpiryDate: new Date().getTime()+15000}}
            );
            var text = "Last bid removed by " + person;
            Meteor.call("insertMessage", text, new Date());
        }
    },
    checkForToggle: function() {
        console.log("Checking for toggle from client");
        var currentState = AuctionData.findOne();
        if(currentState.State == "Bidding") {
            if(currentState.nextExpiryDate < new Date().getTime()) {
                Meteor.call('toggleState');
            }
        }
        return true;
    }
});

Meteor.startup(function () {
    console.log("Loading it up");
    // Clear state
    var bidTime = 25000;
    var additionTime = 15000;
    var lock = 0;
    var renewData = true;

    AuctionData.remove({});
    AuctionStatus.remove({})
    AuctionStatus.insert({"status":"Not Started"});
    AuctionLock.remove({});
    AuctionLock.insert({"locked":0});

    if(renewData) {
        TeamNames.remove({});
        var teamnames = {};
        teamnames = JSON.parse(Assets.getText('teamnames.json'));
        for(i = 0; i < teamnames.length; i++) {
            var obj = teamnames[i];
            TeamNames.insert(obj);
        }

        TeamData.remove({});
        Nominators.remove({});
        Keepers.remove({});
        CurrentPick.remove({});
        PausedAuction.remove({});
        CurrentPick.insert({"pick":1});

        // Load Nominators
        var initialRosterData = {};
        initialRosterData = JSON.parse(Assets.getText('nominations.json'));
        for(i = 0; i < initialRosterData.length; i++) {
            var obj = initialRosterData[i];
            Nominators.insert(obj);
        }

        Administrators.remove({});
        var admins = {};
        admins = JSON.parse(Assets.getText('admins.json'));
        for(i = 0; i < admins.length; i++) {
            var obj = admins[i];
            Administrators.insert(obj);
        }

        // Fischer-Yates shuffle
        var shuffle = function(array) {
            var currentIndex = array.length, temporaryValue, randomIndex ;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {

                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = array[currentIndex];
                array[currentIndex] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }

            return array;
        }

        // Set nomination order
        var captains = Nominators.find({"order":-1}).fetch();
        captains = shuffle(captains);
        for(var i = 0; i < captains.length; i++) {
            Nominators.update({"name":captains[i].name}, {$set: {"order": i}});
        }

        keepers = JSON.parse(Assets.getText('keepers.json'));
        for(i = 0; i < keepers.length; i++) {
            var obj = keepers[i];
            Keepers.insert(obj);
        }

        initialRosterData = JSON.parse(Assets.getText('teams.json'));
        for(i = 0; i < initialRosterData.length; i++) {
            var obj = initialRosterData[i];
            TeamData.insert(obj);
        }

        PlayerResponse.update({}, {$set:{"drafted":false}}, {multi:true});
        drafted = TeamData.find({"name":{$ne:""}}).fetch();
        for(var x=0; x<drafted.length; x++) {
            PlayerResponse.update({tagpro:drafted[x].name}, {$set:{drafted:true}});
        }
    }

    Meteor.publish("divisions", function() {return Divisions.find({})});
    Meteor.publish("teams", function() {return TeamData.find();});
    Meteor.publish("teamnames", function() {return TeamNames.find()});
    Meteor.publish("messages", function() {return Messages.find({}, {sort: {createdAt: -1}, limit:25});});
    Meteor.publish("auctiondata", function() {return AuctionData.find()});
    Meteor.publish("auctionstatus", function() {return AuctionStatus.find()});
    Meteor.publish("nominators", function() {return Nominators.find()});
    Meteor.publish("currentpick", function() {return CurrentPick.find()});
    Meteor.publish("bids", function() { return BidHistory.find()});
    Meteor.publish("previousauctiondata", function() {return PreviousAuctionData.find()});
    Meteor.publish("keepers", function() {return Keepers.find()});
    Meteor.publish("playerResponse", function() {return PlayerResponse.find()});
    Meteor.publish("warningMessage", function() {return WarningMessage.find()});
    Meteor.publish("boardhelpers", function() {return BoardHelpers.find()});
    Meteor.publish("admins", function() {return Administrators.find()});
    return true;
});
