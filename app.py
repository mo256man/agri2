from flask import Flask, render_template, request
from myEphem import Ephem
import json

nagoya = {"place": "名古屋",
            "lat": 35.1667,
            "lon": 136.9167,
            "elev": 0}

battery = { "Ah": 100,
            "power": 12,    # LED消費電力（W）
            "cnt": 150,     # LED数
            "voltage": 24,  # 電圧（V）
            "BTcnt": 8,     # バッテリー個数
            "charge": 1500  # ソーラー＋風力での発電（Wh）
            }

app = Flask(__name__)

@app.route("/")
def index():
    # return render_template("index.html")
    return render_template("screen.html")


@app.route("/main")
def main():
    print("main")
    return render_template("main.html")

@app.route("/cpl")
def cpl():
    print("cpl")
    return render_template("cpl.html")

@app.route("/log")
def log():
    print(log)
    return render_template("log.html")

@app.route("/getBattSetting", methods = ["POST"])
def getBattSetting():
    if request.method == "POST":
        return json.dumps(battery)             # 辞書をJSONにして返す


@app.route("/getEphem", methods = ["POST"])
def getEphem():
    if request.method == "POST":
        try:
            ephem = Ephem(nagoya)       # 名古屋のEphemを取得する
            dict = ephem.get_data()     # データを辞書として取得する
        except Exception as e:
            message = str(e)
            dict = {"answer": message}  # エラーメッセージ
    return json.dumps(dict)             # 辞書をJSONにして返す


"""
@app.route("/call_from_ajax", methods = ["POST"])
def callfromajax():
    if request.method == "POST":
        # ここにPythonの処理を書く
        try:
            pass
        except Exception as e:
            message = str(e)
        dict = {"answer": message}      # 辞書
    return json.dumps(dict)             # 辞書をJSONにして返す
"""

if __name__ == "__main__":
    app.run(debug=True)
