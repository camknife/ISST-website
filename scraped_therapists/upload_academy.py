# -*- coding: utf-8 -*-
"""上传学院课堂资料到阿里云 OSS
- 课堂图片 -> academy/classroom/
- 反馈图片 -> academy/feedback/
- 课堂视频 -> academy/videos/
配置：读取 scraped_therapists/.env
用法：python upload_academy.py
"""
import io, sys, os, hashlib, hmac, base64, datetime, urllib.request, urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\剑桥折刀\Desktop\健衡项目\ISST\site'
ENV_PATH = os.path.join(BASE, 'scraped_therapists', '.env')
SRC_DIR = r'C:\Users\剑桥折刀\Desktop\isst资料'


def load_env():
    cfg = {}
    with open(ENV_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip()
    return cfg


env = load_env()
AK = env.get('OSS_ACCESS_KEY_ID', '')
SK = env.get('OSS_ACCESS_KEY_SECRET', '')
ENDPOINT = env.get('OSS_ENDPOINT', '').rstrip('/')
BUCKET = env.get('OSS_BUCKET', '')
if not AK or not SK or not ENDPOINT or not BUCKET:
    print('OSS 配置不完整，请检查 scraped_therapists/.env')
    sys.exit(1)

host = urllib.request.urlparse(ENDPOINT).netloc
BASE_URL = f'{urllib.request.urlparse(ENDPOINT).scheme}://{BUCKET}.{host}'


def sign(method, content_md5, content_type, date, resource):
    s = f'{method}\n{content_md5}\n{content_type}\n{date}\n{resource}'
    h = hmac.new(SK.encode(), s.encode(), hashlib.sha1).digest()
    return 'OSS ' + AK + ':' + base64.b64encode(h).decode()


def put_object(key, filepath, content_type):
    url = f'{BASE_URL}/{key}'
    with open(filepath, 'rb') as f:
        body = f.read()
    date = datetime.datetime.now(datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
    resource = f'/{BUCKET}/{key}'
    auth = sign('PUT', '', content_type, date, resource)
    req = urllib.request.Request(url, data=body, method='PUT')
    req.add_header('Host', urllib.request.urlparse(url).netloc)
    req.add_header('Date', date)
    req.add_header('Content-Type', content_type)
    req.add_header('Authorization', auth)
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.status


def content_type_for(fn):
    ext = os.path.splitext(fn)[1].lower()
    return {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.mp4': 'video/mp4',
    }.get(ext, 'application/octet-stream')


def collect_files():
    """返回 [(本地路径, oss_key, 是否图片)]"""
    jobs = []
    # 课堂图片
    cls_dir = os.path.join(SRC_DIR, '课堂')
    if os.path.isdir(cls_dir):
        for fn in sorted(os.listdir(cls_dir)):
            if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
                jobs.append((os.path.join(cls_dir, fn), 'academy/classroom/' + fn, True))
    # 反馈图片
    fb_dir = os.path.join(SRC_DIR, '反馈')
    if os.path.isdir(fb_dir):
        for fn in sorted(os.listdir(fb_dir)):
            if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
                jobs.append((os.path.join(fb_dir, fn), 'academy/feedback/' + fn, True))
    # 课堂视频
    vd_dir = os.path.join(SRC_DIR, '课堂视频')
    if os.path.isdir(vd_dir):
        for fn in sorted(os.listdir(vd_dir)):
            if fn.lower().endswith(('.mp4', '.mov', '.webm')):
                jobs.append((os.path.join(vd_dir, fn), 'academy/videos/' + fn, False))
    return jobs


def main():
    jobs = collect_files()
    print(f'待上传文件：{len(jobs)} 个')
    print(f'Bucket：{BUCKET}')
    print(f'目标：{BASE_URL}/academy/...\n')

    ok, fail = 0, []
    for path, key, _ in jobs:
        try:
            ct = content_type_for(os.path.basename(path))
            status = put_object(key, path, ct)
            ok += 1
            print(f'  OK {key} ({status})')
        except urllib.error.HTTPError as e:
            fail.append((key, f'HTTP {e.code}: {e.read().decode()[:150]}'))
            print(f'  FAIL {key} — HTTP {e.code}')
        except Exception as e:
            fail.append((key, str(e)))
            print(f'  FAIL {key} — {e}')

    print(f'\n完成：成功 {ok}，失败 {len(fail)}')
    for k, e in fail:
        print(f'  {k}: {e}')


if __name__ == '__main__':
    main()
