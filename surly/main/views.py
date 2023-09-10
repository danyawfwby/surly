from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
import string
import random
import json
import time
from django.core import serializers
from datetime import datetime
import urllib.request
import urllib.error
import urllib.parse
from django.utils.html import escape
from datetime import datetime
from .models import short, views


def random_id(symbols = 7):
    res = ''.join(random.choices(string.ascii_uppercase +
                             string.digits, k=symbols))
    return str(res)

def index_post_exceptions(request):
    try:
        resp = urllib.request.urlopen(request.POST["url"])
        if resp.url.split("/")[2] == request.META['HTTP_HOST']:
            raise
    except urllib.error.HTTPError:
        return ""
    except Exception:
        return "Ссылка недействительна или введена неверно."


def while_random_id():
    while True:
        id = random_id()
        if not get_page_by_id(id):
            break
    return id

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def model_to_json(model):
    str = serializers.serialize('json', [ model, ])
    if struct := json.loads(str):
        return struct[0]["fields"]
    
def normal_url(request, obj):
    return f"{request.META['HTTP_HOST']}/{obj.page_id}"

def create_page(old_url, page_id, ip):
    obj = short.objects.create(page_id=page_id,old_url=escape(old_url),ip=ip,date=int(time.time()))
    obj.save()
    return obj

def get_first_el(obj):
    if obj:
        return obj[0]

def get_pages_by(**kwargs):
    return short.objects.filter(**kwargs)

def get_page_by(**kwargs):
    objects = get_pages_by(**kwargs)
    return get_first_el(objects)

def get_page_by_id(page_id):
    return get_page_by(page_id=page_id)

def get_page_by_url(old):
    return get_page_by(old_url=old)
    
def retun_json(**kwargs):
    return HttpResponse(json.dumps(kwargs))

def is_viewed(page_id, ip):
    return views.objects.filter(page_id=page_id, ip=ip)

def add_view(page_id, ip):
    s = get_page_by_id(page_id)
    s.views += 1
    s.save()
    v = views.objects.create(page_id=page_id, ip=ip)
    v.save()
    return v

def delete_model(ip, page_id):
    if s := get_page_by(page_id=page_id,ip=ip):
        s.delete()
        return s



#----------VIEWS----------

def index_get(request, ip):
    domain = request.META['HTTP_HOST']
    return render(request, "template.html", {"objs" : get_pages_by(ip=ip).values(), "domain": domain}) 

def index_post_delete(request, ip):
    if obj := delete_model(ip, request.POST["id"]):
        obj = model_to_json(obj)
        return retun_json(status="Успешно", obj=obj)
    return retun_json(status="Непредвиденная ошибка")

def check_captcha(response, ip):
    secret = "6LfSx3kfAAAAACwz4FS-Qmwv19BSy-lWpxLL0CAY"
    dataDict = {"secret": secret, "response": response, "ip": ip}
    data = urllib.parse.urlencode(dataDict).encode()
    req =  urllib.request.Request("https://www.google.com/recaptcha/api/siteverify", data=data) # this will make the method "POST"
    resp = urllib.request.urlopen(req)
    return json.load(resp)

def index_post_create(request, ip):
    if not (exceptions := index_post_exceptions(request)):
        if not (obj := get_page_by_url(escape(request.POST["url"]))):
            captcha = check_captcha(request.POST["g-recaptcha-response"], ip)
            if captcha["success"] == True:
                id = while_random_id()
                obj = create_page(request.POST["url"], id, ip)
                status = "Успешно"
            else:
                return retun_json(status="Капча устарела")
        else:
            status = f"Такая ссылка уже существует: <a href='//{normal_url(request, obj)}' target='_blank'>{normal_url(request, obj)}</a>"
        obj = model_to_json(obj)
        return retun_json(status=status, obj=obj)
    else:
        return retun_json(status=exceptions)


def index_post(request, ip):
    if "q" in request.POST:
        if request.POST["q"] == "delete":
            return index_post_delete(request, ip)
        elif request.POST["q"] == "create":
            return index_post_create(request, ip)
    return retun_json(status="Непредвиденная ошибка")
        
def index(request):
    ip = get_client_ip(request)
    if request.method == 'POST':
        return index_post(request, ip)
    else:
        return index_get(request, ip)

def redir_page(request, page_id):
    if page := get_page_by_id(page_id):
        ip = get_client_ip(request)
        if not is_viewed(page_id, ip):
            add_view(page_id, ip)
        return redirect(page.old_url)
    else:
        return redirect("/")