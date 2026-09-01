import json, re, urllib.request
curve = json.load(open("/Users/amuham/citadel/striker_project/webapp/data/age_curve.json"))["curve"]
ps = json.load(open("/Users/amuham/citadel/striker_project/webapp/data/strikers.json"))["players"]
salah = [p for p in ps if p["player_name"] == "Mohamed Salah"][0]
print("Salah age:", salah["age"], "g+a/90:", salah.get("g_plus_a_per90"))
print("curve keys:", sorted(curve.keys()))
h = urllib.request.urlopen("http://localhost:3000/player?p=Mohamed%20Salah").read().decode()
h2 = re.sub(r"<!--.*?-->", "", h)
i = h2.find("Age-curve")
print("in html:", i >= 0)
if i >= 0:
    print(re.sub(r"<[^>]+>", "|", h2[i:i+300])[:200])
