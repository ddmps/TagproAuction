Template.draftrosters.helpers({
    getDivisions : function() {
      var divisions = Divisions.find({},{sort:{order:-1}});
      console.log("Getting divisions: " +JSON.stringify(divisions));
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
    return TeamNames.find({"division" : division}, {fields:{teamname:1, keepermoney:1, money:1, division:1}, sort:{order:1}});
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
    return TeamData.find({"teamname" : teamname}, {sort : {order : 1}});
  }
});
