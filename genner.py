import json
import psycopg2

captains = []
commissioners = []
players = []


conn = psycopg2.connect("dbname='eltp' user='eltp' host='localhost' password='eltp5ftw'")
cur = conn.cursor()
### Get captains
cur.execute("""SELECT p.name, t.name, 'Europe', g.google_id from player as p inner join team as t on t.captain_id=p.player_id inner join user_google g on g.player=p.player_id""")
captains = cur.fetchall();
### Get commissioners
cur.execute("""SELECT p.name as username, g.google_id from player p inner join user_google g on g.player=p.player_id WHERE g.commissioner=true""")
commissioners = cur.fetchall()
### Get signups (excl captains)
cur.execute("""SELECT name as tagpro from player inner join user_google g on g.player=p.player_id WHERE g.captain=false""")
players = cur.fetchall()


starting_money = 100
team_size = 30

kepers = False
nominations = [{"name" : "nextInOrder", "nextorder" : 0}]
team_names = []
keepers = []
teams = []

for index, data in enumerate(captains):
	captain, team_name, division, google_id = data
	nominations.append({"name" : captain, "rosterfull" : False, "order" : -1})
	team_names.append({"teamname":team_name, "division" : division, "money" : starting_money, "keepermoney":0, "captain":captain, "numrosterspots":team_size, "count":1, "order":index})
	teams.append({"name" : captain, "captain":True, "order" : 1, "cost" : 0, "division" : division, "teamname" : team_name })
	for x in range(2, team_size+1):
		teams.append({"name":"", "order" : x, "cost" : 0, "division" : division, "teamname" : team_name })
	keepers.append({"captain" : captain, "keepers":[]})

division_names = set(c[2] for c in captains)
divisions = ["Europe"]
for index, division in enumerate(division_names):
	divisions.append({"division": division, "order":index})

parsedPlayers = [];
for entry in players:
	parsedPlayers.append({"tagpro": entry[0]})

admins = []
for entry in commissioners:
	admins.append({"username": entry[0], "google_id": entry[1]})

with open("./private/nominations.json", "wb") as f:
	f.write(json.dumps(nominations))
with open("./private/teamnames.json", "wb") as f:
	f.write(json.dumps(team_names))
with open("./private/divisions.json", "wb") as f:
	f.write(json.dumps(divisions))
with open("./private/teams.json", "wb") as f:
	f.write(json.dumps(teams))
with open("./private/keepers.json", "wb") as f:
	f.write(json.dumps(keepers))
with open("./private/player_response.json", "wb") as f:
	f.write(json.dumps(parsedPlayers));
with open("./private/admins.json", "wb") as f:
	f.write(json.dumps(admins));