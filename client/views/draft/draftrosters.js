Template.draftrosters.helpers({
    getDivisions : function() {
      var divisions = Divisions.find({},{sort:{order:-1}});
      return divisions;
  },
    inRedDivision : function(division) {
      if(division == "Central" || division == "Pacific") {
        return "rgb(235, 126, 126)";
      }
      else {
        return "rgb(134, 198, 230)";
      }
    },
});

Template.renderteam.helpers({
  teams : function(division) {
    teamNames = TeamNames.find({"division" : division}, {fields:{teamname:1, keepermoney:1, money:1, division:1}, sort:{order:1}});
    console.log("Amount of teams: "+teamNames.count()+" in division: "+division);
    return teamNames;
  },
  teamID: function(teamname) {
    return teamname.split(" ").join("_");
  },
  inRedDivision : function(division) {
    if(division == "Central" || division == "Pacific") {
      return "rgb(235, 126, 126)";
    }
    else {
      return "rgb(134, 198, 230)";
    }
  }
});

Template.renderplayers.helpers({
  players : function(teamname) {
    playerData = TeamData.find({"teamname" : teamname}, {sort : {order : 1}});
    console.log("Found "+playerData.count()+" players in team: "+teamname);
    return playerData;
  }
});
