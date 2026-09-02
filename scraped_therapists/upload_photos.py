# -*- coding: utf-8 -*-
"""上传治疗师照片到阿里云 OSS（零依赖，纯标准库）
- Bucket 名含连字符时，必须使用三级域名：https://{bucket}.oss-cn-beijing.aliyuncs.com
配置来源（按优先级）：.env 文件 > 系统环境变量
环境变量：OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_ENDPOINT / OSS_BUCKET
用法：python upload_photos.py
"""
import io, sys, os, hashlib, hmac, base64, datetime, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\剑桥折刀\Desktop\健衡项目\ISST\site'
RENAMED = os.path.join(BASE, 'scraped_therapists', 'renamed')
ENV_PATH = os.path.join(BASE, 'scraped_therapists', '.env')
PREFIX = 'therapists/'


def load_env():
    if not os.path.exists(ENV_PATH):
        return {}
    cfg = {}
    with open(ENV_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


env_cfg = load_env()


def cfg(name, default=''):
    v = env_cfg.get(name)
    if v:
        return v
    return os.environ.get(name, default).strip()


AK = cfg('OSS_ACCESS_KEY_ID')
SK = cfg('OSS_ACCESS_KEY_SECRET')
ENDPOINT = cfg('OSS_ENDPOINT', 'https://oss-cn-beijing.aliyuncs.com').rstrip('/')
BUCKET = cfg('OSS_BUCKET', 'isst-website')

# 三级域名：https://{bucket}.{host}
host = urllib.request.urlparse(ENDPOINT).netloc
BASE_URL = f'{urllib.request.urlparse(ENDPOINT).scheme}://{BUCKET}.{host}'


def sign(method, content_md5, content_type, date, resource):
    s = f'{method}\n{content_md5}\n{content_type}\n{date}\n{resource}'
    h = hmac.new(SK.encode(), s.encode(), hashlib.sha1).digest()
    return 'OSS ' + AK + ':' + base64.b64encode(h).decode()


def put_object(key, filepath, content_type='image/jpeg'):
    url = f'{BASE_URL}/{key}'
    with open(filepath, 'rb') as f:
        body = f.read()
    date = datetime.datetime.now(datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
    # CanonicalizedResource 必须含 bucket 名（OSS 规则，与是否用三级域名无关）
    resource = f'/{BUCKET}/{key}'
    auth = sign('PUT', '', content_type, date, resource)
    req = urllib.request.Request(url, data=body, method='PUT')
    req.add_header('Host', urllib.request.urlparse(url).netloc)
    req.add_header('Date', date)
    req.add_header('Content-Type', content_type)
    req.add_header('Authorization', auth)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.status


def main():
    if not AK or not SK:
        print('未检测到 AccessKey，请在 scraped_therapists/.env 中填写。')
        return

    files = sorted(f for f in os.listdir(RENAMED) if os.path.isfile(os.path.join(RENAMED, f)))
    print(f'配置来源：{"scraped_therapists/.env" if env_cfg else "系统环境变量"}')
    print(f'访问域名：{BASE_URL}')
    print(f'待上传：{len(files)} 个文件 → {PREFIX}*\n')

    ok, fail = 0, []
    for fname in files:
        key = PREFIX + fname
        path = os.path.join(RENAMED, fname)
        try:
            status = put_object(key, path)
            ok += 1
            print(f'  ✓ {key} ({status})')
        except urllib.error.HTTPError as e:
            fail.append((fname, f'HTTP {e.code}: {e.read().decode()[:120]}'))
            print(f'  ✗ {key} — HTTP {e.code}')
        except Exception as e:
            fail.append((fname, str(e)))
            print(f'  ✗ {key} — {e}')

    print(f'\n完成：成功 {ok}，失败 {len(fail)}')
    for f, e in fail[:10]:
        print(f'  {f}: {e}')


if __name__ == '__main__':
    main()
