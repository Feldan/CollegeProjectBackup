// ==UserScript==
// @name        test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  通过对新版正方教务系统的课表页面的解析，实现导出一个适用于大部分ics日历的文件，理论使用于所有使用新版正方教务系统（可对 ``include`` 进行一定的修改以适用不同的学校的链接）
// @author       feldan
// @compatible   chrome
// @compatible   firefox
// @license      MIT
// @include      *://172.16.254.1/*
// @run-at       document-start
// ==/UserScript==



// 根据自己学校教务系统的网址修改，应该对于新版教务系统的地址都是一样的，故只需修改上面 include中的教务系统的地址即可
var ClassScheduleToICSURL = "kbcx/xskbcx_cxXskbcxIndex.html";   // 学生课表查询页面，将该学期的课程信息导出为ics
var ExamScheduleToICSURL = "kwgl/kscx_cxXsksxxIndex.html";      // 考试信息查询页面，将该学期的考试信息导出为ics
var StudentEvalutionURL = "xspjgl/xspj_cxXspjIndex.html";        // 学生评教页面


var setTimeout_ = 4000;                                          // 设置脚本实际运行的开始时间，网络不好建议时间稍长，1000等于1s
(function (){

    'use strict';

    console.log("Script running.....");
    unsafeWindow.addEventListener("load", main);

})();

function main(){
    var windowURL = window.location.href;
    if(windowURL.indexOf(ClassScheduleToICSURL) != -1){
        ClassScheduleToICS();
    }
    else if(windowURL.indexOf(ExamScheduleToICSURL) != -1){
        ExamScheduleToICS();
    }
    else if(windowURL.indexOf(StudentEvalutionURL) != -1){
        // StudentEvalution();
        // unsafeWindow.addEventListener("load", StudentEvalution);
        document.getElementById("btn_yd").onclick = function(){
            window.setTimeout(StudentEvalution, setTimeout_);
        }
    }
}

function ClassScheduleToICS(){
    console.log("ClassScheduleToICS");
    // 在课表上方创建一个点击按钮
    // --------------------------------------------------------------------------
    // unsafeWindow.addEventListener ("load", pageFullyLoaded);
    pageFullyLoaded();
    //加载完成后运行
    function pageFullyLoaded(){
        console.log("Fucking ZhengFang...");
        let div = document.getElementsByClassName("btn-toolbar pull-right")[0];
        let btn = document.createElement("button");
        btn.className = "btn btn-default";
        btn.id = "exportbtn";
        let sp = document.createElement("span");
        sp.innerText = "生成课表";
        sp.className = "bigger-120 glyphicon glyphicon-file";
        btn.append(sp);

        let dwnbtn = document.createElement("button");
        dwnbtn.className = "btn btn-default";
        sp = document.createElement("span");
        sp.innerText = "选择本学期第一个星期一:     ";
        sp.className = "bigger-120 glyphicon glyphicon-time";
        dwnbtn.appendChild(sp);
        let StartDate = document.createElement("input");
        StartDate.type = "date";
        // 这里通过自动获取当前时间来设定日期
        // StartDate.value = "2020-01-01";
        StartDate.value = (new Date()).toLocaleDateString().replaceAll("/", "-");
        div.appendChild(btn);
        dwnbtn.appendChild(StartDate);
        div.appendChild(dwnbtn);


        btn.onclick = function(){
            startDate = StartDate.value;
            generateCalendar(parseCourses(parseTable()));    // 嘿嘿。。
            alert("ics文件已经生成，请导入到您所使用的日历文件；（Google Calendar需要自行设置课程的颜色。。。）\n如果发现获取到的数据有误，请在github上提出issues，\n并尽量使用F12进入开发者模式，附上截屏（含有cousrse的数据以及课程信息页面，注意个人信息），\n我会尽快解决（前提我还能进入学校的教务系统QAQ）");
        }
    }
    // --------------------------------------------------------------------------

    // 本学期设定的开始日期
    var startDate;

    // 全局变量Week的双引射
    // --------------------------------------------------------------------------
    var Week;
    (function (Week) {
        Week[Week["Monday"] = 1] = "Monday";
        Week[Week["TuesDay"] = 2] = "TuesDay";
        Week[Week["Wednesday"] = 3] = "Wednesday";
        Week[Week["ThursDay"] = 4] = "ThursDay";
        Week[Week["Friday"] = 5] = "Friday";
        Week[Week["Saturday"] = 6] = "Saturday";
        Week[Week["Sunday"] = 7] = "Sunday";
    })(Week || (Week = {}));
    // --------------------------------------------------------------------------


    // 从页面中获取课程的 div, 返回对应的星期以及div数组
    // --------------------------------------------------------------------------
    function parseTable(){
        let table = document.getElementById("kbgrid_table_0");
        // console.log(table);
        // let tds = table.getElementsByTagName("td");  // 因为 getElementsByTagName() 方法没有foreach 故使用 queryselectorall()
        let tds = table.querySelectorAll("td");
        // console.log(tds);
        let week = new Array();
        let divs = new Array();
        tds.forEach(element => {
            if(element.hasAttribute("id")){
                if(element.hasChildNodes()){
                    let div = Array.from(element.getElementsByTagName("div"));
                    // let div = element.querySelectorAll("div");
                    divs = divs.concat(div);
                    let wk = Week[element.getAttribute("id")[0]];
                    for(let i = 0; i < div.length; ++i){
                        week.push(wk);
                    }
                }
            }
        });
        return {week: week, divs: divs};
    }
    // --------------------------------------------------------------------------




    // --------------------------------------------------------------------------
    // 全局变量 课程信息类
    class Course{
        constructor(course){
            if(course){
                this.name = course.name;                // 课程名称
                this.week = course.week;                // 该课程具体是星期几
                this.info = course.info;                // 该课程的一个这个时段的信息
                this.startTime = course.startTime;      // 该课程的开始上课时间
                this.endTime = course.endTime;
                this.startWeek = course.startWeek;      // 该课程的持续上课的起始周，为一个数组
                this.endWeek = course.endWeek;
                this.isSingleOrDouble = course.isSingleOrDouble;
                                                        // 改课程是否是间隔上课，间隔为2
                this.location = course.location;        // 该课程的上课地点
                this.teacher = course.teacher;          // 该课程的任课老师
            }
        }
    }
    // --------------------------------------------------------------------------


    // 获取所有的课程信息，存放到一个 courses 数组中
    // --------------------------------------------------------------------------
    function parseCourses(data){
        var courses = new Array();
        for(let i = 0; i < data.divs.length; ++i){
            let course = new Course();
            course.week = data.week[i];
            course.name = data.divs[i].getElementsByTagName("span")[0].getElementsByTagName("font")[0].innerText;
            // 2021.2.25 更新：
            // 原课程名标签由 span 改为 u，可能存在获取不到课程名的情况
            // 某些课程，如【调】会使用u标签加粗，其他的不变
            // 故通过其他方法解决，并尝试增加多种获取方法，以增加正确获取到的可能性
            if(course.name.length == 0){
                course.name = data.divs[i].getElementsByTagName('u')[0].innerText;
            }
            if(course.name.length == 0){
                course.name = data.divs[i].children[0].innerText;
            }
            if(course.name.length == 0){
                course.name = data.divs[i].innerText.split('\n\n')[0];
            }
            if(course.name.length == 0){
                console.log("%c " + '\n\n\n检测到可能未能获取到课程名，猜测是教务系统已经更新页面相关标签，\n建议在github提出issues，我会尝试解决\n\n\n', "color: red")
            }
            // 这里不通过substr去空格了，因为可能有些学校的教务系统，教务员填写课程没有添加末尾空格或者没有添加一个小星星的占位符，会导致课程名减一的bug
            // 同时尝试去除【调】
            // course.name = course.name.substr(0, course.name.length - 1);
            course.name = course.name.replace(/^\s+/, '').replace(/\s+$/, '');      // 去除前后空格
            course.name = course.name.replace("☆", "");                            // 去除小星星
            course.name = course.name.replace("【调】", "");                        // 去除 【调】

            data.divs[i].querySelectorAll("p").forEach(p => {
                if(p.getElementsByTagName("span")[0].getAttribute("title") == "节/周"){
                    // 进行起始周数以及持续时间的解析
                    (function(str = p.getElementsByTagName("font")[1].innerText){
                        course.info = str;
                        // console.log(str);
                        let time = str.substring(str.indexOf("(") + 1, str.indexOf(")") + 1 - 1);
                        let wk = str.substring(str.indexOf(")") + 1, str.length).split(",");
                        // console.log(time);
                        // console.log(wk);

                        course.startTime = parseInt(time.substring(0, time.indexOf("-")));
                        course.endTime = parseInt(time.substring(time.indexOf("-") + 1, time.indexOf("节")));


                        course.isSingleOrDouble = new Array();
                        course.startWeek = new Array();
                        course.endWeek = new Array();
                        wk.forEach(w => {
                            if(w.indexOf("单") != -1 || w.indexOf("双") != -1){
                                course.isSingleOrDouble.push(2);
                            }
                            else{
                                course.isSingleOrDouble.push(1);
                            }

                            let startWeek, endWeek;
                            if(w.indexOf("-") == -1){
                                startWeek = endWeek = parseInt(w.substring(0, w.indexOf("周")));
                            }
                            else{
                                startWeek = parseInt(w.substring(0, w.indexOf("-")));
                                endWeek = parseInt(w.substring(w.indexOf("-") + 1, w.indexOf("周")));
                            }
                            course.startWeek.push(startWeek);
                            course.endWeek.push(endWeek);
                        });
                    })();
                }
                else if(p.getElementsByTagName("span")[0].getAttribute("title") == "上课地点"){
                    course.location = p.getElementsByTagName("font")[1].innerText;
                }
                else if(p.getElementsByTagName("span")[0].getAttribute("title") == "教师"){
                    course.teacher = p.getElementsByTagName("font")[1].innerText;
                }
            });
            // console.log(course);
            courses.push(course);
        }
        return courses;
    }
    // --------------------------------------------------------------------------




    // --------------------------------------------------------------------------
    // // 通过节次确定时间， 默认每天上午8点上课，每节课两小时（无休息时间），下午2点上课
    // function getTime(num, StartOrEnd){
    //     if(num <= 4){
    //         num = 7 + num + StartOrEnd;
    //     }
    //     else{
    //         num = 9 + num + StartOrEnd;
    //     }

    //     return "" + getFixedLen("" + num, 2) + "0000";
    // }
    // function getFixedLen(s, len){
    //     if(s.length < len){
    //         return getFixedLen("0" + s, len);
    //     }
    //     else if(s.length > len){
    //         return s.slice(0, len);
    //     }
    //     else{
    //         return s;
    //     }
    // }
    // 通过节次确定时间，使用数组、json实现？
    var TIME = {
        "1": {
            "name": "第1节",
            "startTime": {
                "hour": '08',
                "minute": '30'
            }
        },
        "2": {
            "name": "第2节",
            "startTime": {
                "hour": '09',
                "minute": '20'
            }
    
        },
        "3": {
            "name": "第3节",
            "startTime": {
                "hour": '10',
                "minute": '25'
            },
    
        },
        "4": {
            "name": "第4节",
            "startTime": {
                "hour": '11',
                "minute": '15'
            },
    
        },
        "5": {
            "name": "第5节",
            "startTime": {
                "hour": '14',
                "minute": '40'
            },
    
        },
        "6": {
            "name": "第6节",
            "startTime": {
                "hour": '15',
                "minute": '30'
            },
    
        },
        "7": {
            "name": "第7节",
            "startTime": {
                "hour": '16',
                "minute": '30'
            },
    
        },
        "8": {
            "name": "第8节",
            "startTime": {
                "hour": '17',
                "minute": '20'
            },
    
        },
        "9": {
            "name": "第9节",
            "startTime": {
                "hour": '19',
                "minute": '30'
            },
    
        },
        "10": {
            "name": "第10节",
            "startTime": {
                "hour": '20',
                "minute": '20'
            },
    
        }
    }
    
    function getFixedLen(s, len){
        if(s.length < len){
            return getFixedLen("0" + s, len);
        }
        else if(s.length > len){
            return s.slice(0, len);
        }
        else{
            return s;
        }
    }
    
    function getTime(num, StartOrEnd) {
        var hour = TIME[num].startTime.hour;
        var minute = parseInt(TIME[num].startTime.minute) + StartOrEnd;
        if (minute >= 60) {
            minute = minute - 60;
            hour = parseInt(hour) + 1;
        }
        var time =  "" + getFixedLen("" + hour,2) + getFixedLen("" + minute,2);
        console.log(time)
        return time;
    }

    // 通过周数获得具体的日期（相对学期开始的那一周）
    function getDate(num, wk){
        let date = new Date(startDate.toString());
        date.setDate(date.getDate() + (num - 1) * 7 + Week[wk] - 1);
        let res = "";
        res += getFixedLen(date.getUTCFullYear().toString(), 4);
        res += getFixedLen((date.getUTCMonth() + 1).toString(), 2);
        res += getFixedLen(date.getUTCDate().toString(), 2);
        res += "T";
        return res;
    }
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // 日历的生成，由处理过的课程信息来得到一个没有处理行长的ics
    function generateCalendar(courses){
        let res = new ICS();

        // 将每一个课程信息转化为事件 VEVENT 并添加一个提醒
        console.log(courses);
        console.log('======================!!!============================')
        console.log('如果出现数据有误等情况，请仔细观察上面获取到的课程信息是否和页面的课程信息一致，\n如果出现某个字段为空（即 xxxx=\'\'）的现象，\n请在GitHub提出issues，我会尽量解决（如果还能够进入教务管理系统的话）谢谢！！')
        courses.forEach(course => {
            for(let i = 0; i < course.isSingleOrDouble.length; ++i){
                let e = new ICSEvent("" + getDate(course.startWeek[i], course.week) + getTime(course.startTime, 0),
                                    "" + getDate(course.startWeek[i], course.week) + getTime(course.endTime, 45), //设定单节上课时间
                                    "" + course.name + " " + course.location + " " + course.teacher + " " + course.info);
                e.setRRULE("WEEKLY", res.Calendar.WKST,
                            "" + (course.endWeek[i] - course.startWeek[i] + course.isSingleOrDouble[i]) / course.isSingleOrDouble[i],
                            "" + course.isSingleOrDouble[i],
                            "" + course.week.substr(0, 2).toUpperCase());
                res.pushEvent(e);
            }
        });

        // 建立一个周数事件，持续20周
        // (function(){
        //     for(let i = 1; i < 20; ++i){
        //         let e = new ICSEvent("" + getDate(i, Week[1]) + getTime(-1, 0),
        //                             "" + getDate(i, Week[1]) + getTime(-1, 1),
        //                             "" + "第" + i + "周");
        //         res.pushEvent(e);
        //     }
        // })();

        res.pushCalendarEnd();
        res.exportIcs();
    }
    // --------------------------------------------------------------------------
}

// ----------------------------------------- 一些基础方法 ----------------------------------------------------//
function SetBtnZero(){
    // 没用，，，
    let btn = document.getElementById("btn_yd");
    btn.className = "btn btn-default btn-primary";
    btn.removeAttribute("disabled");
}

// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//
var CRLF = "\n";
var SPACE = " ";
class ICS{

    Calendar;       // 日历参数
    ics;            // ics格式的日历，
    res;            // 最后格式化的结果

    constructor(){

        // --------------------------------------------------------------------------
        // 日历的一些主要参数，如PRODID、VERSION、CALSCALE、是否提醒以及提醒的时间
        (function(Calendar){
            Calendar.PRODID = "-//31415926535x//ICalendar Exporter v1.0//CN";
            Calendar.VERSION = "2.0";
            Calendar.CALSCALE = "GREGORIAN";        // 历法，默认是公历
            Calendar.TIMEZONE = "Asia/Shanghai"     // 时区，默认是上海
            Calendar.ISVALARM = true;               // 提醒，默认是开启
            Calendar.VALARM = "-P0DT0H0M0S";       // 提醒，默认半小时
            Calendar.WKST = "SU";                   // 一周开始，默认是周日

        })(this.Calendar || (this.Calendar = {}));
        // --------------------------------------------------------------------------


        this.ics = new Array();
        this.ics.push("BEGIN:VCALENDAR");
        this.ics.push("VERSION:" + this.Calendar.VERSION);
        this.ics.push("PRODID:" + this.Calendar.PRODID);
        this.ics.push("CALSCALE:" + this.Calendar.CALSCALE);
    }

    // 添加事件
    pushEvent(e){
        this.ics.push("BEGIN:VEVENT");
        this.ics.push(e.getDTSTART());
        this.ics.push(e.getDTEND());
        if(e.isrrule == true)this.ics.push(e.getRRULE());
        this.ics.push(e.getSUMMARY());
        if(this.Calendar.ISVALARM == true)this.pushAlarm();
        this.ics.push("END:VEVENT");
        this.ics.push(CRLF);
    }

    // 添加提醒
    pushAlarm(){
        this.ics.push("BEGIN:VALARM");
        this.ics.push("ACTION:DISPLAY");
        this.ics.push("DESCRIPTION:This is an event reminder");
        this.ics.push("TRIGGER:" + this.Calendar.VALARM);
        this.ics.push("END:VALARM");
    }

    // 添加日历末
    pushCalendarEnd(){
        this.ics.push("END:VCALENDAR");
    }

    // 对ics进行格式的处理，每行不超过75个字节，换行用CRLF，对于超出的进行换行，下一行行首用空格
    getFixedIcs(){
        this.res = "";
        this.ics.forEach(line => {
            if(line.length > 60){
                let len = line.length;
                let index = 0;
                while(len > 0){
                    for(let i = 0; i < index; ++i){
                        this.res += SPACE;
                    }
                    this.res += line.slice(0, 60) + CRLF;
                    line = line.slice(61);
                    len -= 60;
                    ++index;
                }
                line = line.slice(0, 60);
            }
            this.res += line + CRLF;
        });
        return this.res;
    }
    // --------------------------------------------------------------------------


    // --------------------------------------------------------------------------
    // 导出ics
    exportIcs(){
        this.getFixedIcs();
        // 使用a标签模拟下载，blob实现流文件的下载链接转化
        let link = window.URL.createObjectURL(new Blob([this.res], {
            type: "text/x-vCalendar"
        }));
        let a = document.createElement("a");
        a.setAttribute("href", link);
        a.setAttribute("download", "courses.ics");
        a.click();  // 模拟下载
    }
    // --------------------------------------------------------------------------
    // -------------------------------- ICS ------------------------------------------//


}
// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//
class ICSEvent{
    constructor(DTSTART, DTEND, SUMMARY){
        this.DTSTART = DTSTART;
        this.DTEND = DTEND;
        this.SUMMARY = SUMMARY;
    }
    isrrule = false;
    RRULE;
    setRRULE(FREQ, WKST, COUNT, INTERVAL, BYDAY){
        this.isrrule = true;
        this.RRULE = "RRULE:FREQ=" + FREQ + ";WKST=" + WKST + ";COUNT=" + COUNT + ";INTERVAL=" + INTERVAL + ";BYDAY=" + BYDAY;
    }
    getRRULE(){
        return "" + this.RRULE;
    }
    getDTSTART(){
        return "DTSTART:" + this.DTSTART;
    }
    getDTEND(){
        return "DTEND:" + this.DTEND;
    }
    getSUMMARY(){
        return "SUMMARY:" + this.SUMMARY;
    }
}

// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//
