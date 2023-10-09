// グローバル変数
let isAuto =true;       // 自動か各個か
let isTry = true;       // トライか本番か
let isLED = false;      // 育成LEDを光らせるか
let isForce = false;    // LEDを強制的にオンオフさせるか光センサーで制御するか
let tab = "main";
let lamps = [0, 0, 0, 0, 1];
const pins = ["26", "19", "13", "6", "5"];
let temp, humi
let vp, volt, capa, BT, Ah, pow, cnt, voltage, BTcnt, charge, maxwh, maxv
let redp, yellowp, totalwh
let sunrise_time, sunset_time
let morning_light_time, evening_light_time
let wh
let humiID      // setInterval()でgetHumiする際のID
let voltID      // setInterval()でgetVoltする際のID
let now, today, time
let logMsg="";
let logTxt="";
let bp;

$(async function() {
    // 読み込み完了後に一度だけ実行する関数
    getNow();
    showTry();
    //tab = getTab();
    clearMsg();
    addMsg(time+"　開始")
    await getEphem();
    await getBattSetting();
    get_or_try_Humi();
    get_or_try_Volt();

    setInterval(showTime, 1000);
    get_or_try_Sunlight();


    // 自動・各個　切り替え
    $("#swAuto").on('click', function(){
        isAuto = !isAuto;
        showState();
        if (isAuto) {
            enpowerLED(isLED);
            showLedLamp(isLED);
        } else {
            showLamps([0,0,0,0,0]);
            enpowerLED(false);
            showLedLamp(false);
        }
    })

    // ランプ全点灯ボタンを押す
    $("#btnAllLight").mousedown(function(){
        if (! isAuto) {
            $("#imgLight").attr("src", "static/images/btn_push.png");
            showLamps([1,1,1,1,1]);
            showLedLamp(true);
        }
    })

    // ランプ全点灯ボタンを離す
    $("#btnAllLight").mouseup(function(){
        if (! isAuto) {
            $("#imgLight").attr("src", "static/images/btn_normal.png");
            showLamps([0,0,0,0,0]);
            showLedLamp(false);
        }
    })

    // 育成LED強制点灯ボタンを押す
    $("#btnLedOn").mousedown(function(){
        if (! isAuto) {
            $("#imgLedOn").attr("src", "static/images/btn_push.png");
            enpowerLED(true);
        }
    })

    // 育成LED強制点灯ボタンを離す
    $("#btnLedOn").mouseup(function(){
        if (! isAuto) {
            $("#imgLedOn").attr("src", "static/images/btn_normal.png");
            enpowerLED(false);
            showLedLamp(false);
        }
    })

    // トライボタン切り替え
    $(".btnTry").on('click', function(){
        isTry = !isTry;
        showTry();
    })

});



//////////////////////////////////////////////////////////////////////
// 表示しているタブを取得する
function getTab() {
    const elm = $('input:radio[name="tab_item"]:checked')
    return elm.val();
}

// 今日の日付を取得する　グローバル変数に格納するだけ
function getNow() {
    now = dayjs();
    today = now.format("YYYY/MM/DD");
    time = now.format("HH:mm:ss");
};

// 時計　兼　アラーム
async function showTime() {
    getNow();
    $("#time").html(today + " " + time);

    const h = now.hour();
    const m = now.minute();
    const s = now.second();

    if (isAuto) {
        // 60分ごとに温湿度を更新する
        if (s==0 && m==0) {
            addMsg(time + "　温湿度更新");
            get_or_try_Humi();
        }
        // 10分ごとバッテリ残容量を更新する
        if (s==10) {
            addMsg(time + "　バッテリ残容量更新");
            bp = await getBatt(isTry);
            console.log("bp=" + bp);
        }
        // 1分ごとに光センサーを更新する　ただし自動制御中のみ
        if (! isForce) {
            if ((m*60+s)%60==0) {
                get_or_try_Sunlight();
            }
        }
        //0時0分になったらあらためて暦を取得する
        if (time=="00:00:00") {
            addMsg(time+"　日付が変わった")
            getEphem();
        }
        // 日の出1.5H前になったら強制点灯する
        if (time == morning_light_time+":00") {
            addMsg(time+"　日の出前強制点灯中")
            isForce = true;
            isLED = true;
            enpowerLED(isLED);
        }
        // 日の出になったら自動点灯にする
        if (time == sunrise_time+":00") {
            addMsg(time+"　日の出になったので自動判定")
            isForce = false;
            get_or_try_Sunlight();
        }
        // 日の入りになったら強制点灯する
        if (time == sunset_time+":00") {
            addMsg(time+"　日の入りになったので点灯")
            isForce = true;
            isLED = true;
            enpowerLED(isLED);
        }
        // 日の入り1.5H後になったら自動点灯にする
        if (time == evening_light_time+":00") {
            addMsg(time+"　日の入り1.5H後になったので自動判定")
            isForce = false;
            get_or_try_Sunlight();
        }
    }

}

// トライの状態を表示する関数
function showTry() {
    const elm = $("#btnTry");
    if (isTry) {
        $("body").css("background-color", "yellow");
        elm.css("background-color", "pink");
        elm.text("トライ");
    } else {
        $("body").css("background-color", "white");
        elm.css("background-color", "yellow");
        elm.text("本番");
    }
    //get_or_try_Humi();
}

//////////////////////////////////////////////////////////////////////
// メッセージを表示する
function addMsg(txt) {
    logMsg = $("#logbox").html();
    logMsg += txt + "<br>";
    logTxt = $("#logbox").text();
    logTxt += txt;
    $("#logbox").html(logMsg);
    console.log(txt);
}

// メッセージを全削除する
function clearMsg() {
    $("#logbox").html("");
}

//////////////////////////////////////////////////////////////////////
// 本番かトライかを判定して温湿度を取得する
async function get_or_try_Humi() {
    if (isTry) {
        await tryHumi().then( result => {
            temp = result[0];
            humi = result[1];
        });
    } else {
        await getHumi().then( result => {
            temp = result[0];
            humi = result[1];
        });
    }
    $("#temp").text(temp + "℃");
    $("#humi").text(humi + "％");
}

// 温湿度（トライ）
async function tryHumi() {
    var temp = 20 + Math.floor(Math.random()*10);
    var humi = 50 + Math.floor(Math.random()*30);
    return [temp, humi]
}

// 温湿度（本番）
async function getHumi() {
    await $.ajax("/getHumi", {
        type: "POST",
    }).done(function(data) {
        var dict = JSON.parse(data);
        if (dict["temp"] != "N/A") {
            temp = dict["temp"];
        }
        if (dict["humi"] != "N/A") {
            humi = dict["humi"];
        }
    }).fail(function() {
        console.log("温湿度取得失敗");
    });
};


//////////////////////////////////////////////////////////////////////
//    日光
//////////////////////////////////////////////////////////////////////
// 本番かトライかを判定して日光を取得する
async function get_or_try_Sunlight() {
    if (isTry) {
        await trySunlight().then( result => {
            lamps = result;
        });
    } else {
        await getSunlight().then( result => {
            lamps = result;
        });
    }
    var lamp_cnt = 0;
    lamps.forEach(elm => {
        lamp_cnt += elm
    });

    // 光センサーが3未満 かつ 朝夕用のバッテリー残量がある場合、点灯
    if (lamp_cnt<3) {
        console.log (wh + " "+ red3h);
        if (wh > red3h) {
            if (isAuto) {addMsg(time + "　育成LED点灯");}
            isLED = true;
        } else {
            if (isAuto) {addMsg(time + "　バッテリ残量少ないので育成LED点灯しない");}
            isLED = false;
        }
    } else {
        isLED = false;
        if (isAuto) {addMsg(time + "　十分明るいので育成LED消灯");}
    }
    showLamps(lamps);
    showLedLamp(isLED);
    enpowerLED(isLED);
}

// 日光（トライ）
async function trySunlight() {
    lamps = [];
    for (i=1; i<=5; i++) {
        let val = Math.trunc(Math.random()*2);
        lamps.push(val);
    }
    return lamps
}

// 日光（本番）
async function getSunlight() {
    await $.ajax("/getSunlight", {
        type: "POST",
    }).done(function(data) {
        var dict = JSON.parse(data);
        if (dict["temp"] != "N/A") {
            temp = dict["temp"];
        }
        if (dict["humi"] != "N/A") {
            humi = dict["humi"];
        }
    }).fail(function() {
        console.log("温湿度取得失敗");
    });
};


// 育成LEDを光らせる
function enpowerLED(flag) {
    if (flag) {
        $("#imgLed").attr("src", "static/images/led_on.png");
        $("#lamp_led").css("color", "red");
    } else {
        $("#imgLed").attr("src", "static/images/led_off.png");
        $("#lamp_led").css("color", "gray");
    }
}


// フラグの状態を表示する関数
function showState() {
    var strAuto = "";
    var imgSw = "";
    if (isAuto) {
        strAuto = "自動";
        imgSw = "sw_l.png";
    } else {
        strAuto = "各個";
        imgSw = "sw_r.png";
    };
    $("#stateAuto").text(strAuto);
    $("#imgAuto").attr("src", "static/images/" + imgSw );
}

// 光センサーの状態を表示する関数
function showLamps(array) {
    $.each(array,function(index,val){
        var color="";
        if (val) {
            color = "red";
        } else {
            color = "gray";
        }
        $("#lamp" + index).css("color",color);
    });
}

// 育成LEDの状態を表示する関数
function showLedLamp(flag) {
    var color="";
    if (flag) {
        color = "red";
    } else {
        color = "gray";
    }
    $("#lamp_led").css("color",color);
}


//////////////////////////////////////////////////////////////////////
//    暦
//////////////////////////////////////////////////////////////////////
async function getEphem() {
    await $.ajax("/getEphem", {
        type: "POST",
    }).done(function(data) {
        const dict = JSON.parse(data);
        sunrise_time = dict["today_sunrise"];               // HH:MM
        sunset_time = dict["today_sunset"];                 // HH:MM
        $("#sunrise").text(sunrise_time);
        $("#sunset").text(sunset_time);
        $("#moon_phase").text(dict["moon_phase"]);
        $("#moon_image").attr("src", dict["moon_image"]);

        // 日の出日の入り時刻から育成LED点灯消灯の時刻を計算する
        morning_light_time = dayjs(today+" "+sunrise_time).add(-1.5, "h").format("HH:mm");
        evening_light_time = dayjs(today+" "+sunset_time).add(1.5, "h").format("HH:mm");
        $("#morning_light_time").text(morning_light_time);
        $("#evening_light_time").text(evening_light_time);
        console.log(dayjs(), "暦取得成功");
    }).fail(function() {
        console.log("暦取得失敗");
    });
};


//////////////////////////////////////////////////////////////////////
// バッテリーの設定を取得する関数
async function getBattSetting() {
    await $.ajax("/getBattSetting", {
        type: "POST",
    }).done(function(data) {
        const dict = JSON.parse(data);
        console.log(dict);
        Ah = Number(dict["Ah"]);
        pow = Number(dict["power"]);
        cnt = Number(dict["cnt"]);
        voltage = Number(dict["voltage"]);
        BTcnt = Number(dict["BTcnt"]);
        charge = Number(dict["charge"]);
        capa = Ah * voltage * BTcnt / 2;
        red3h = pow * cnt * 1.5;
        yellow3h = pow * cnt * 3;
        console.log("バッテリー設定取得成功");
    }).fail(function() {
        console.log("バッテリー設定取得失敗");
    });
};

// 本番かトライかを判定して電圧を取得する
function get_or_try_Volt() {
    if (isTry) {
        vp = tryVolt();
    } else {
        vp = getVolt();
    }
    showBatt();
}

// 電圧（トライ）
function tryVolt() {
    vp = Math.floor(Math.random()*100);
    return vp
}

// 電圧（本番）
async function getVolt() {
    $("#humi_time").text(time);
    $("#temp").text(30 + "℃");
    $("#humi").text(60 + "％");
    await $.ajax("/getHumi", {
        type: "POST",
    }).done(function(data) {
        var dict = JSON.parse(data);
        if (dict["temp"] != "N/A") {
            $("#humi_time").text(time);
            //console.log(dict["temp"]);
            $("#temp").text(dict["temp"] + "℃");
        }
        if (dict["humi"] != "N/A") {
            //console.log(dict["humi"]);
            $("#humi").text(dict["humi"] + "％");
        }
    }).fail(function() {
        console.log("温湿度取得失敗");
    });
};

//
async function getBatt(isTest) {
    let bat = 0;
    await $.ajax("/getBatt", {
        type: "post",
        data: {"isTest": isTest},              // 連想配列をPOSTする
    }).done(function(data) {
        const dict = JSON.parse(data);
        bat = dict["ana3"];
    }).fail(function() {
        console.log("バッテリー電圧取得失敗");
    });
    console.log("bat="+bat);
    return bat
}



// バッテリーの設定を表示する関数
function showBatt() {
    maxwh = Math.trunc(Ah * voltage * BTcnt / 2);
    maxv = voltage;
    wh = Math.trunc(maxwh*vp/100);
    volt = Math.trunc(maxv*vp/100);
    charge = Math.trunc(charge*.3);
    totalwh = Math.trunc(wh+charge);
    need_next = Math.trunc(pow*cnt*1);
    redp = Math.trunc(red3h/maxwh*100);

    $("#vp").text(vp);          // パーセント
    $("#wh").text(wh);
    $("#maxwh").text(maxwh);
    $("#volt").text(volt);
    $("#maxv").text(maxv);
    $("#calc_red3h").html(pow+"W*"+cnt+"本*1.5h="+red3h+"Wh");
    $("#calc_totalwh").html(wh+"Wh+"+charge+"Wh="+totalwh+"Wh");
    $("totalwh").html(totalwh);
    $("#calc_next").html(pow+"W*"+cnt+"*1h="+need_next+"Wh");
    $("#meter-bar").css("width", vp+"%");
    $("#bar_red").css("width", redp+"%")
}



/* 
$(function() {
    // 読み込み完了後に一度だけ実行する関数
    getNow();
    startProcess();
    getBattSetting();
    setInterval(showTime, 1000);
    showState();
    showLamps();
    showLedLamp();
    showTry();

    // 温湿度を取得
    get_or_try_Humi();
    get_or_try_Volt();

    // フラグを反転したのち状態を表示する関数
    $("#swAuto").on('click', function(){
        isAuto = !isAuto;
        showState();
        showLedLamp();
    })

    // ランプ全点灯ボタンを押す
    $("#btnAllLight").mousedown(function(){
        if (! isAuto) {
            $("#imgLight").attr("src", "static/images/btn_push.png");
            for (i=0; i<5; i++){
                $("#lamp" + i).css("color","red");
                $("#lamp_led").css("color","red");
            }
        }
    })

    // ランプ全点灯ボタンを離す
    $("#btnAllLight").mouseup(function(){
        if (! isAuto) {
            $("#imgLight").attr("src", "static/images/btn_normal.png");
            showLamps();
            showLedLamp();
        }
    })

    // LED強制点灯ボタンを押す
    $("#btnLedOn").mousedown(function(){
        if (! isAuto) {
            $("#btnLedOn").attr("src", "static/images/btn_push.png");
            $("#imgLed").attr("src", "static/images/led_on.png");
            $("#lamp_led").css("color", "red");
        }
    })

    // LED強制点灯ボタンを離す
    $("#btnLedOn").mouseup(function(){
        if (! isAuto) {
            $("#btnLedOn").attr("src", "static/images/btn_normal.png");
            $("#imgLed").attr("src", "static/images/led_off.png");
            showLedLamp();
        }
    })

    // トライボタン切り替え
    $(".btnTry").on('click', function(){
        isTry = !isTry;
        showTry();
    })

})




// 起動時and日付が変わったときの処理
async function startProcess() {
    const result = await getEphem();
    clearMsg();
    var txt = time + " 【開始】<br>";
    txt += "　今日は" + now.format("M月D日") + "<br>";
    txt += "　日の出は" + sunrise_time + "<br>";
    txt += "　→育成LEDを" + morning_light_time.format("HH:mm") + "に点灯<br>";
    txt += "　日の入りは" + sunset_time + "<br>";
    txt += "　→育成LEDを" + evening_light_time.format("HH:mm") + "まで点灯<br>";
    addMsg(txt);
}


//////////////////////////////////////////////////////////////////////


}

// トライの状態を表示する関数
function showTry() {
    const elm = $("#btnTry");
    if (isTry) {
        elm.css("background-color", "pink");
        elm.text("トライ");
    } else {
        elm.css("background-color", "yellow");
        elm.text("本番");
    }
    get_or_try_Humi();
}


// フラグの状態を表示する関数
function showState() {
    var strAuto = "";
    var imgSw = "";
    if (isAuto) {
        strAuto = "自動";
        imgSw = "sw_l.png";
    } else {
        strAuto = "各個";
        imgSw = "sw_r.png";
    };
    $("#stateAuto").text(strAuto);
    $("#imgAuto").attr("src", "static/images/" + imgSw );
}

// 光センサーの状態を表示する関数
function showLamps() {
    $.each(lamps,function(index,val){
        var color="";
        if (val) {
            color = "red";
        } else {
            color = "gray";
        }
        $("#lamp" + index).css("color",color);
    });
}

// 育成LEDをの状態を表示する関数
function showLedLamp() {
    var color="";
    if (isLED) {
        color = "red";
    } else {
        color = "gray";
    }
    $("#lamp_led").css("color",color);
}








// 本番かトライかを判定して温湿度を取得する
function get_or_try_Humi() {
    clearInterval(humiID);                      // 既存のインターバルをクリア
    if (isTry) {
        tryHumi();
        //humiID = setInterval(tryHumi, 1000);    // 1秒毎にtryHumiを実行
    } else {
        getHumi();                              // 最初の1回を実行
        //humiID = setInterval(getHumi, 60000);   // 10分ごとにを実行
    }
}

// 温湿度（トライ）
function tryHumi() {
    $("#humi_time").text(time);
    const temp = 20 + Math.floor(Math.random()*10);
    const humi = 50 + Math.floor(Math.random()*30);
    $("#temp").text(temp + "℃");
    $("#humi").text(humi + "％");
}

// 温湿度（本番）
function getHumi() {
    $.ajax("/getHumi", {
        type: "POST",
    }).done(function(data) {
        var dict = JSON.parse(data);
        if (dict["temp"] != "N/A") {
            $("#temp").text(dict["temp"] + "℃");
        }
        if (dict["humi"] != "N/A") {
            $("#humi").text(dict["humi"] + "％");
        }
    }).fail(function() {
        console.log("温湿度取得失敗");
    });
};


// 本番かトライかを判定して電圧を取得する
function get_or_try_Volt() {
    clearInterval(voltID);                      // 既存のインターバルをクリア
    if (isTry) {
        tryVolt();
        //voltID = setInterval(tryVolt, 1000);    // 1秒毎にtryHumiを実行
    } else {
        getHumi();                              // 最初の1回を実行
        //voltID = setInterval(getVolt, 60000);  // 10分ごとにを実行
    }
}

// 電圧（トライ）
function tryVolt() {
    const volt = Math.floor(Math.random()*100);
    $("#volt").text(volt + "%");
    $("#wh").text(Math.trunc(maxwh*volt/100));
    $("#v").text(Math.trunc(voltage*volt/100));
    $("#meter-bar").css("width", volt + "%");
    const totalwh = Math.trunc(wh + charge*0.3);
    $("#totalwh").text(Math.trunc(maxwh*volt/100)+"Wh+"+charge+"Wh*0.3="+totalwh+"Wh");
    showBatt();
}

// 電圧（本番）
function getVolt() {
    $("#humi_time").text(time);
    $("#temp").text(30 + "℃");
    $("#humi").text(60 + "％");
    $.ajax("/getHumi", {
        type: "POST",
    }).done(function(data) {
        var dict = JSON.parse(data);
        if (dict["temp"] != "N/A") {
            $("#humi_time").text(time);
            //console.log(dict["temp"]);
            $("#temp").text(dict["temp"] + "℃");
        }
        if (dict["humi"] != "N/A") {
            //console.log(dict["humi"]);
            $("#humi").text(dict["humi"] + "％");
        }
    }).fail(function() {
        console.log("温湿度取得失敗");
    });
};

*/