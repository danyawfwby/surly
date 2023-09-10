let copy_url;
let delete_shortly;
let gl_send_main_form;

const dateElPlusZero = function(arg){
    return `${arg}`.length > 1 ? arg : `0${arg}`
}

function sendAfterCaptcha(){
    gl_send_main_form()
}

const unixToDate = function(unix){
    const date= new Date(unix*1000)
    const day = dateElPlusZero(date.getDate())
    const month = dateElPlusZero(date.getMonth()+1)
    const year = dateElPlusZero(parseInt(date.getFullYear()%100))
    const hours = dateElPlusZero(date.getHours())
    const minutes = dateElPlusZero(date.getMinutes())
    return `${day}.${month}.${year} ${hours}:${minutes}`
}

const fillObjsList = function(arg){
    Object.assign(arg).forEach(e => {
        const dateNormal = unixToDate(e.date)
        add_new_shortly(e.page_id, e.old_url, e.views, dateNormal)
    });
}

const get_shortly_html = function(page_id, old_url, views, date){
    return `<div class="shortly-block"><div class="shortly-block__qr"></div><div class="shortly-block__info"><a href="/${page_id}" target="_blank" class="shortly-block__new-url"><div class="shortly-block__url-content">${document.location.host}/${page_id}</div></a><a href="" class="shortly-block__old-url" target="_blank" title="${old_url}">${old_url}</a><div class="shortly-block__metadata"><p class="shortly-block__views"><img class="shortly-block__views-icon icon" src="/static/img/vector/eye.svg" alt="Просмотры:">${views}</p><p class="shortly-block__date-create"><img class="shortly-block__date-icon icon" src="/static/img/vector/clock.svg" alt="Дата:">${date}</p></div></div><div class="shortly-block__buttons"><button class="button-blue-border shortly-block__copy shortly-block__button" onclick="javascript:copy_url(this)"><img class="shortly-block__copy-icon icon" src="/static/img/vector/copy.svg" alt="">Копировать</button><button class="button-red shortly-block__settings shortly-block__button" onclick="javascript:delete_shortly(this)"><img class="shortly-block__settings-icon icon" src="/static/img/vector/trash.svg" alt="">Удалить</button></div></div>`
}

const add_new_shortly = function(page_id, old_url, views, date){
    const SHORTLY_LIST = document.querySelector(".shortly-list")
    const domain = document.location.origin
    const shortly_html = get_shortly_html(page_id, old_url, views, date)
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(shortly_html, 'text/html');
    const shortly_dom = htmlDoc.querySelector(".shortly-block")
    const shortly_qr = shortly_dom.querySelector(".shortly-block__qr")  
    new QRCode(shortly_qr, {
        text: `${domain}/${page_id}`,
        width: 92,
        height: 92,
        colorDark : "#222131",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    shortly_qr.querySelector("img").classList.add("shortly-block__qr-image", "icon")
    SHORTLY_LIST.prepend(shortly_dom)
}

document.addEventListener("DOMContentLoaded", function(){
    gl_send_main_form = send_main_form
    const MAIN_FORM = document.querySelector("#main-form");
    const ALERT_BOX = document.querySelector(".alert-box");
    const INFO_BOX = document.querySelector(".info-box");
    const MAIN_INPUT = document.querySelector(".main-block__input")
    const SUBMIT_BTN = document.querySelector(".main-block__button");
    let timer_to_hide_info = 0;

    copy_url = async function (e){
        let sb = e.closest(".shortly-block");
        navigator.clipboard.writeText(sb.querySelector(".shortly-block__new-url").href)
        show_info("Скопировано")
        
    }

    MAIN_INPUT.addEventListener("input", function(){
        hide_alert();
    })

    // SUBMIT_BTN.addEventListener("click", function(e){
    //     console.log("clicked")
    //     grecaptcha.execute();
    //     //MAIN_FORM.submit();
    // })

    function time_sleep(duration){
        return new Promise((resolve) => {
            setTimeout(function(){
                resolve()
            }, duration)
        })
    }
    
    INFO_BOX.addEventListener("click", function(){
        clearTimeout(timer_to_hide_info);
        info_box_noactive()
    })

    function info_box_active(){
        INFO_BOX.classList.add("is-active");
    }

    function info_box_noactive(){
        INFO_BOX.classList.remove("is-active");
    }

    function info_box_html(arg){
        INFO_BOX.innerHTML = arg;
    }

    function alert_box_active(){
        ALERT_BOX.classList.add("is-active");
    }

    function alert_box_noactive(){
        ALERT_BOX.classList.remove("is-active");
    }

    function alert_box_html(arg){
        ALERT_BOX.innerHTML = arg;
    }

    async function show_alert(arg){
        alert_box_html(arg);
        alert_box_active();
    }

    async function hide_alert(){
        alert_box_html("");
        alert_box_noactive();
    }

    async function show_info(arg){
        info_box_html(arg);
        info_box_active();
        timer_to_hide_info = setTimeout(async function(){
            hide_info()
        }, 2000)
    }

    async function hide_info(){
        info_box_html("");
        info_box_noactive();
    }

    function secureJsonParse(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return str;
        }
    }

    function secureFinderJson(str, json){
        if(typeof json == "object"){
            if(str in json){
                return json[str]
            }
        }
    }

    XMLHttpRequest.prototype.a_send = async function(data){
        const this_ = this;
        return new Promise((resolve) => {
            this_.addEventListener("load", (e) => {
                resolve(this_);
            });
            
            this_.send(data);
        });
    };
    function ObjectFormData(obj){
        const formData = new FormData()
        Object.entries(obj).forEach(([key, value])=>{
            formData.append(key, value)
        })
        return formData
    }

    delete_shortly = async function(e){
        let sb = e.closest(".shortly-block");
        id = sb.querySelector(".shortly-block__new-url").href.split("/").slice(-1)[0]
        
        const data = ObjectFormData({
            "csrfmiddlewaretoken": csrftoken,
            "q": "delete",
            "id": id
        })
        let response = await xhrSimple(data)
        
        let responseText = secureJsonParse(response.response)
        if(response.status == 200){
            if(secureFinderJson("obj", responseText)){
                sb.remove()
            }
        }
        
        let output = secureFinderJson("status", responseText) || response.statusText
        show_info(output)
    }

    // function recapthaToken(){
    //     return new Promise((resolve, reject) => {
    //         setInterval(() => {
    //             const token = grecaptcha.getResponse()
    //             if(token){
    //                 resolve(token)
    //             }else{
    //                 const recaptchaFrame = document.querySelector(`iframe[src^="https://www.google.com/recaptcha/api2/bframe?"]`)
    //                 const frameContainer = recaptchaFrame.parentElement.parentElement
    //                 const isHidden = frameContainer.style.visibility == "hidden"
    //                 if(!isHidden){
    //                     resolve("")
    //                 }
    //             }
    //         }, 1)
    //     })
    // }

    function xhrSimple(data){
        const xhr = new XMLHttpRequest();
        xhr.open("post", "/");
        return xhr.a_send(data);
    }

    async function send_main_form(){
        const data = new FormData(MAIN_FORM);
        data.append("csrfmiddlewaretoken", csrftoken);
        data.append("q", "create")
        let response = await xhrSimple(data)
        
        let responseText = secureJsonParse(response.response)
        let output = secureFinderJson("status", responseText) || response.statusText
        
        if(response.status == 200){
            if(secureFinderJson("obj", responseText) && responseText.status == "Успешно"){
                MAIN_INPUT.value = ""
                grecaptcha.reset()
                obj = secureFinderJson("obj", responseText);
                add_new_shortly(obj['url'], obj['old_url'], obj['views'], unixToDate(obj['date']));
            }
        }

        show_alert(output)
    }

    MAIN_FORM.addEventListener("submit", async function(e){
        hide_alert()
        e.preventDefault();
        grecaptcha.execute()
        const token = grecaptcha.getResponse()
        if(token){
            send_main_form(e)
        }
        
    })

})