from flask import Flask, render_template, request
from myEphem import Ephem
import json
import random
from time import sleep
# from gpiozero import MCP3004

light_pins = [26, 19, 13, 6, 5]     # 5個の光センサーの状態を取得するラズパイのGPIOピン

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
    return json.dumps(dict)         # 辞書をJSONにして返す


# バッテリー電圧
@app.route("/getBatt", methods=["POST"])
def getBatt():
    if request.method == "POST":
        is_test = request.form["isTest"]
        dict = {}
        if is_test:
            dict["ana3"] = random.randint(0, 100)
            dict["ana0"] = random.randint(0, 100)
            sleep(3)
            print(f"電圧（トライ）:{dict}")
        else:
            ana3 = analog_read(ch=3)
            ana0 = analog_read(ch=0)
            dict["ana3"] = int(ana3*100)
            dict["ana0"] = int(ana0*100)
            print(f"電圧（本番）:{dict}")
        return json.dumps(dict)


# 温湿度計
@app.route("/getHumi", methods=["POST"])
def getHumi():
    if request.method == "POST":
        is_test = request.form["isTest"]
        dict = {}
        if is_test:
            dict["temp"] = random.randint(10, 40)
            dict["humi"] = random.randint(0, 100)
            sleep(3)
            print(f"温湿度（トライ）:{dict}")
        else:
            #result = sensor.read()
            result = False
            if result.is_valid():
                dict["temp"] = round(result.temperature, 1) # 温度 小数第一位まで
                dict["humi"] = round(result.humidity, 1)    # 湿度 小数第一位まで
            else:
                dict["temp"] = "N/A"
                dict["humi"] = "N/A"
            print(f"温湿度（本番）:{dict}")
        return json.dumps(dict)


# 光センサー
@app.route("/getLight", methods=["POST"])
def getLight():
    if request.method == "POST":
        is_test = request.form["isTest"]
        lights = []
        dict = {}
        if is_test:
            for _ in light_pins:
                lights.append(random.choice([True, False]))
            dict["lights"] = lights
            sleep(3)
            print(f"光センサー（トライ）:{dict}")
        else:
            for pin in light_pins:
                lights.append(GPIO.input(pin))
            dict["lights"] = lights
            sleep(3)
            print(f"光センサー（本番）:{dict}")
        return json.dumps(dict)


if __name__ == "__main__":
    # app.run(host="0,0,0,0", port=5000, debug=True)
    app.run(debug=True)
