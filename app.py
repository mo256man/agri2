from flask import Flask, render_template, request
from myEphem import Ephem
import json
import random
from time import sleep
# from gpiozero import MCP3004

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

# MCP3004でアナログ値を取得する
def analog_read(ch):
#     adc = MCP3004(ch).value
    adc = 0
    return adc


app = Flask(__name__)

@app.route("/")
def index():
    # return render_template("index.html")
    return render_template("screen.html")

@app.route("/getBattSetting", methods = ["POST"])
def getBattSetting():
    if request.method == "POST":
        return json.dumps(battery)             # 辞書をJSONにして返す


@app.route("/getEphem", methods = ["POST"])
def getEphem():
    try:
        ephem = Ephem(nagoya)       # 名古屋のEphemを取得する
        dict = ephem.get_data()     # データを辞書として取得する
    except Exception as e:
        message = str(e)
        dict = {"answer": message}  # エラーメッセージ
    return json.dumps(dict)             # 辞書をJSONにして返す

# バッテリー電圧
@app.route("/getBatt", methods=["POST"])
def getBatt():
    if request.method == "POST":
        is_test = request.form["isTest"]
        print(is_test)
        dict = {}
        if is_test:
            dict["ana3"] = random.randint(0, 100)
            dict["ana0"] = random.randint(0, 100)
            sleep(3)
        else:
            ana3 = analog_read(ch=3)
            ana0 = analog_read(ch=0)
            dict["ana3"] = int(ana3*100)
            dict["ana0"] = int(ana0*100)
        print(dict)
        return json.dumps(dict)


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
