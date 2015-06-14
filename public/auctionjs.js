var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
    var matches, substrRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
        // the typeahead jQuery plugin expects suggestions to a
        // JavaScript object, refer to typeahead docs for more info
        matches.push({ value: str });
      }
    });

    cb(matches);
  };
};


var dirtyButtons = 0;
var oldButtonTimeout = 0;
function checkForButtons() {

  if(oldButtonTimeout) {
    dirtyButtons = 0;
    clearTimeout(oldButtonTimeout);
  }

  if($(".buttontime").length > 0 && !dirtyButtons) {
    dirtyButtons = 1;
    oldButtonTimeout = setTimeout(function() {
      $(".buttontime").prop("disabled", false);
      $(".buttontime").removeClass("buttontime");
      dirtyButtons = 0;
    }, 2000);
  }
}

$("#messageSubmit").submit(function() {
  if ($.trim($("#messagetext").val()) === "") {
    console.log("Not sending message");
    return false;
  }
});

playSounds = function(soundToPlay) {
  console.log(soundToPlay);
  if(soundToPlay !== 'undefined') {
    if($("#enableSounds").is(":checked")) {
      $("#sound_"+soundToPlay)[0].play();
    }
  }
}
var highlightColor = "rgb(255, 245, 0)";
var blueColor = "rgb(134, 198, 230)";
var redColor = "rgb(235, 126, 126)";
var firstLiCheck = 0;

animateTeam = function(name) {
  var team = $("#team_"+name.split(" ").join("_"));
  var grandparent = team.parent().parent();

  grandparent.addClass("shake shake-constant");
  setTimeout(function () {
    grandparent.removeClass("shake shake-constant")
  }, 2500);
  var canVibrate = "vibrate" in navigator || "mozVibrate" in navigator;
  if (canVibrate && !("vibrate" in navigator))
    navigator.vibrate = navigator.mozVibrate;
  if(canVibrate) {
    $("#vibrate").vibrate({
      pattern: [200, 400, 200]
    });
    $("#vibrate").click();
  }
}

checkForAnimation = function() {
  if($(".winningTeam").length == 1) {
    teamname = $(".winningTeam").html().split("|")[1].split("<span")[0].trim();
    animateTeam(teamname);
    $(".winningTeam").remove();
  }
  else {
    $(".winningTeam").remove();
  }
}

showPlayerInfo = function() {
  $("#playerModal").modal("show");
}
hidePlayerInfo = function() {
  $("#playerModal").modal("hide");
}

var highlightColor = "rgb(255, 245, 0)";
var blueColor = "rgb(134, 198, 230)";
var redColor = "rgb(235, 126, 126)";
function showLastBidder() {
  if($(".justBid").length == 1) {
    var teamname = $(".justBid").first().html().split("|")[1].split("<span")[0].trim();
    $(".justBid").remove();
    var team = $("#team_"+teamname.split(" ").join("_"));
    team.css("background-color", highlightColor);
    function resetColor() {
      var original_color = team.closest(".row").find("div .division-header").css("background-color")
      team.css("background-color", original_color);
      $(".justBid").remove();
    }
    setTimeout(resetColor, 3000);
  }
  else {
    $(".justBid").remove();
  }
}

setInterval(function() {
  setTimeout(function() {
    showLastBidder();
    checkForAnimation();
  }, 250);
}, 1000);

var oldA;
startTimer = function() {
  if(oldA) { clearInterval(oldA)}
  a = setInterval(function() {
    time = parseInt($("#elapsedTime").html())
    time = time+1;
    $("#elapsedTime").html(time);
  }, 1000);
  oldA = a;
}