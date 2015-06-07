
Template.get_funds.helpers(
  {
    getBalance: function () {
      if( Meteor.user() !== undefined && Meteor.userId()) {
        return TeamNames.findOne({"captain":Meteor.user().username}).money;
      }
      return false;
    },
    getKeepermoney: function () {
      if( Meteor.user() !== undefined && Meteor.userId()) {
        return TeamNames.findOne({"captain":Meteor.user().username}).keepermoney;
      }
      return false;
    },
    isCaptain: function() {
        if(Meteor.user() !== undefined && Meteor.userId())
            return (TeamData.findOne({"name":Meteor.user().username, "captain" : true}))
        return false;
    },
    isSnakeDraft:function() {
        return AuctionData.findOne({"status":"Snake"});
    },
    numberRemainingPicks:function() {
        numSpotsLeft = TeamNames.findOne({"captain":Meteor.user().username}).numrosterspots;
        return 13 - numSpotsLeft;
    }
  });
