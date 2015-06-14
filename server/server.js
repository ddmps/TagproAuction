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
LastWonPlayer = new Mongo.Collection("lastwonplayer");
PendingTrades = new Mongo.Collection("trades");
SnakeOrder = new Mongo.Collection("snakeorder");
var pg = Npm.require("pg");
var Fiber = Npm.require('fibers');

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
        var additionTime = 25000;
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
        AuctionData.remove({});
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
    startSnakeDraft: function(person) {
        var bidTime = 25000;
        console.log("Starting snake draft");
        Meteor.call("insertMessage", "Draft started by "+person, new Date(), "started");
        nominator = Meteor.call('pickSnakePicker');
        console.log("nominator is: " + nominator);
        AuctionData.remove({});
        AuctionData.insert({State: "Snake", Nominator: nominator});
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
    pickSnakePicker : function () {
        console.log("pickSnakePicker: started");
        var nextPickOrder = SnakeOrder.findOne({"name":"nextInOrder"});
        console.log(nextPickOrder);
        var nextOrder = nextPickOrder.nextorder;
        var round = Math.ceil(nextOrder/20);
        var order = nextOrder - (20 * (round - 1));
        console.log("round: " + round + " order: " + order);
        var captain = SnakeOrder.findOne({"order":order,"round":round});
        console.log(captain);
        if(nextOrder == 141) {
            Meteor.call("insertMessage", "Draft over!", new Date(), "winningBid");
            AuctionData.remove({});
            return null;
        }
        SnakeOrder.update({"name":"nextInOrder"}, {$set: {"nextorder":nextOrder + 1}});
        if(captain.picking) {
            console.log("pickSnakePicker: captain is picking");
            console.log(captain.name);
            return captain.name;
        }
        else {
            console.log("pickSnakePicker: " + captain.name + " isn't picking anymore!");
            return Meteor.call("pickSnakePicker");
        }
    },
    finishPicking:function(captain) {
        Meteor.call("insertMessage",captain + " has elected to stop picking", new Date(), "winningBid")
        SnakeOrder.update({"name":captain,"playername":""},{$set:{"picking":false}},{multi:true});
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
        // loop through nominators in order until we find one without a full roster or > moneys than 0
        if(captain.rosterfull) {
            return Meteor.call('pickNominator');
        }
        // Check if has enough moneys
        var team = TeamNames.findOne({captain:captain.name});
        var availablebidamt = parseInt(team.money);
        if (availablebidamt<1) {
            console.log("pickNominator: no more moneys.. Next!");
            return Meteor.call('pickNominator');
        }
        nextNominator = Nominators.findOne({"order":newnextorder});
        var numplayers = TeamData.find({name:{$ne:""}}).count() - 9;
        var text = "Waiting for "+captain.name +" to nominate pick "+numplayers+" of the draft.";
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

                availablebidamt += (parseInt(team.keepermoney) > 5 ? 5 : parseInt(team.keepermoney));
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
        if (parseInt(bid)===0) {
            //Set min bid to 1.
            bid = 1;
        }
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

            //TODO: I think this is causing the weird bugs. We wanna put a temp value into a temp db then copy it over, and do checks on both.
            AuctionData.remove({});

            if(bidTimeout) {
                Meteor.clearTimeout(bidTimeout);
            }
            bidTimeout = Meteor.setTimeout(function() {
                Meteor.call("checkForToggle");
            }, bidTime);

            return AuctionData.insert({State: "Bidding", nextExpiryDate: new Date().getTime()+bidTime, currentBid: bid, currentPlayer: playerNominated, lastBidder: state.Nominator, Nominator:state.Nominator});
        }
        else if(state !== undefined && state.State == "Snake") {
            //handle snake draft toggle
            if(PlayerResponse.find({playername:playerNominated}).count() == 0) {
                console.log("Player not signed up!");
                return false;
            }

            if(TeamData.find({name:playerNominated}).count() > 0) {
                console.log("Can't select someone on a team!");
                return false;
            }
            var nextPickOrder = SnakeOrder.findOne({"name":"nextInOrder"});
            var curPick = nextPickOrder.nextorder - 1;
            var round = Math.ceil(curPick/20);
            var order = curPick - (20 * (round - 1));
            currentCaptain = AuctionData.findOne({});
            console.log(round + " " + order);
            SnakeOrder.update({"round":round,"order":order}, {$set: {"playername":playerNominated}});
            var selectingTeam = TeamNames.findOne({"captain":currentCaptain.Nominator});
            var thisPlayerOrder = selectingTeam.numrosterspots + 1;
            TeamData.insert({"name" : playerNominated, "order" : thisPlayerOrder, "cost": 0, "division": selectingTeam.division, "teamname" : selectingTeam.teamname});
            TeamNames.update({"teamname":selectingTeam.teamname}, {$set: {"numrosterspots":thisPlayerOrder}});
            Meteor.call("insertMessage", currentCaptain.Nominator + " selects " + playerNominated + " with pick " + curPick,new Date() + " of the snake draft", "winningBid");
            nextNominator = Meteor.call("pickSnakePicker");
            if(nextNominator) {
                AuctionData.remove({});
                AuctionData.insert({State: "Snake", Nominator: nextNominator});
            }
        }
        else if (state !== undefined)
        {
            lastNominator = AuctionData.findOne({}).Nominator;
            // TODO: investigate if this is causing the issue w/ auto-awarded players
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
            var oldKeeperMoney = team.keepermoney;
            var keepermoney = team.keepermoney;
            var oldMoney = team.money;
            var money = team.money;
            money = money - state.currentBid;

            if(keepers.indexOf(playerWon) >= 0) {
                console.log(playerWon, " is a keeper!");
                usedKeeperMoney = (state.currentBid > 5 ? 5 : state.currentBid);
                keepermoney -= usedKeeperMoney;

                money = money + usedKeeperMoney;

                if(keepermoney < 0) {
                    money = money - Math.abs(keepermoney);
                    usedKeeperMoney += keepermoney;
                    keepermoney = 0;
                }
            }

            var ActualCost = oldMoney - money;

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

            LastWonPlayer.remove({});
            LastWonPlayer.insert({"teamname":team.teamname,"order":playerOrder,"name":playerWon,"oldMoney":oldMoney,"nominator":lastNominator,"oldKeeperMoney":oldKeeperMoney})
            // Reset state
            if(TeamData.find({"name":{$ne:""}}).count() == 120) {
                Meteor.call("insertMessage", "The auction draft has completed!", new Date(), "started");
                AuctionStatus.update({}, {"status":"Paused"});
                AuctionData.remove({});
            }
            nominator = Meteor.call("pickNominator");
            CurrentPick.update({}, {$inc:{'pick':1}});
            var text = "Waiting for "+nominator +" to nominate the "+CurrentPick.findOne({}).pick+" pick of the draft.";
            Nominators.update({name:nominator.name}, {$set:{nominated:true}});

            var numPlayers = TeamData.find({"name":{$ne:""}}).count();
            console.log(numPlayers);

            return AuctionData.insert({State: "Nominating", nextExpiryDate: new Date().getTime()+10000, Nominator: nominator.name,  startTime:new Date().getTime()});
        }
    },
    undoLastWonPlayer:function(person) {
        lastWonData = LastWonPlayer.findOne({});
        LastWonPlayer.remove({});
        TeamData.update({"teamname":lastWonData.teamname,"order":lastWonData.order},{$set:{"name":"","cost":0}});
        curMoney = TeamNames.findOne({"teamname":lastWonData.teamname}).money;
        TeamNames.update({"teamname":lastWonData.teamname},{$set:{"count":(lastWonData.order-1),"money":lastWonData.oldMoney,"keepermoney":lastWonData.oldKeeperMoney}});
        PlayerResponse.update({"tagpro":lastWonData.name},{$set:{"drafted":false}});
        status = AuctionData.findOne({});
        curNominator = status.Nominator;
        curNominatorOrder = Nominators.findOne({"name":curNominator}).order;
        Nominators.update({"name":"nextInOrder"},{$set:{"nextorder":curNominatorOrder}});
        AuctionData.update({State:"Nominating"},{$set:{Nominator:lastWonData.nominator}});
        Meteor.call("insertMessage", "Last won player undone by " + person, new Date(), "started");
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
    Accounts.onCreateUser(function(options, user) {
        console.log("Created user.. User:"+JSON.stringify(user)+" Options:"+JSON.stringify(options));
        if (user && user.services.google.id) {
            if (user.services.google.id == '102453401920432113619') {
                user.username='orb';
            } else {
                var fiber = Fiber.current;
                pg.connect("postgres://eltp:eltp5ftw@localhost/eltp", function(err, client, done) {
                    var handleError = function(err) {
                        if (!err) return false;
                        console.log("Could not validate login attempty by:"+JSON.stringify(google_id));
                        done(err);
                        return true;
                    };
                    if (handleError(err)) return;
                    client.query("SELECT p.name from player p inner join user_google g on p.player_id=g.player where g.google_id=$1", [user.services.google.id], function (err, result) {
                        var username = null;
                        if (handleError(err)) return;
                        if (result.rows.length === 1) {
                            fiber.run(result.rows[0].name);
                            username = result.rows[0].name;
                            console.log("Validation successful. Setting username to: "+ username);
                        } else {
                            console.log("Validation unsuccessful.. Id="+google_id+" Result:"+JSON.stringify(result));
                        }
                        done();
                    });
                });        
                console.log('Yielding..');
                user.username = Fiber.yield();
            }
        } else {
            console.log("Not a valid user..?");
        }
        console.log("Returning user: "+JSON.stringify(user));
        return user;
    });
    console.log("Loading it up");
    // Clear state
    var bidTime = 25000;
    var additionTime = 10000;
    var lock = 0;
    var renewData = true;
    var renew2 = true;
    var renew3 = true;

    if(renew3) {
        SnakeOrder.remove({});
        var initialSnakeData = {};
        initialSnakeData = JSON.parse(Assets.getText('snakeorder.json'));
        for(i = 0; i < initialSnakeData.length; i++) {
            var obj = initialSnakeData[i];
            SnakeOrder.insert(obj);
        }
    }
    if(renew2) {
        AuctionData.remove({});
        AuctionStatus.remove({})
        AuctionStatus.insert({"status":"Not Started"});
        AuctionLock.remove({});
        AuctionLock.insert({"locked":0});

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

        Nominators.remove({});
        // Load Nominators
        var initialRosterData = {};
        initialRosterData = JSON.parse(Assets.getText('nominations.json'));
        for(i = 0; i < initialRosterData.length; i++) {
            var obj = initialRosterData[i];
            Nominators.insert(obj);
        }

        // Set nomination order
        var captains = Nominators.find({"order":-1}).fetch();
        captains = shuffle(captains);
        for(var i = 0; i < captains.length; i++) {
            Nominators.update({"name":captains[i].name}, {$set: {"order": i}});
        }
        TeamData.remove({});
        TeamNames.remove({});
        var teamnames = JSON.parse(Assets.getText('teamnames.json'));
        initialRosterData = JSON.parse(Assets.getText('teams.json'));
        for(i = 0; i < teamnames.length; i++) {
            var obj = teamnames[i];
            TeamNames.insert(obj);
        }
        for(i = 0; i < initialRosterData.length; i++) {
            var obj = initialRosterData[i];
            TeamData.insert(obj);
        }
        var divisions = JSON.parse(Assets.getText('divisions.json'));
        for(i = 0; i < divisions.length; i++) {
            var obj = divisions[i];
            Divisions.insert(obj);
        }
    }

    if(renewData) {
        Keepers.remove({});
        CurrentPick.remove({});
        PausedAuction.remove({});
        CurrentPick.insert({"pick":1});

        Administrators.remove({});
        var admins = {};
        admins = JSON.parse(Assets.getText('admins.json'));
        for(i = 0; i < admins.length; i++) {
            var obj = admins[i];
            Administrators.insert(obj);
        }

        keepers = JSON.parse(Assets.getText('keepers.json'));
        for(i = 0; i < keepers.length; i++) {
            var obj = keepers[i];
            Keepers.insert(obj);
        }

        players=JSON.parse(Assets.getText('player_response.json'));
        for(i = 0; i < players.length; i++) {
            var obj = players[i];
            PlayerResponse.insert(obj);
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
    Meteor.publish("trades", function() {return PendingTrades.find()});
    Meteor.publish("snakeorder", function() {return SnakeOrder.find()});
    return true;
});
