# -*- coding: utf-8 -*-
"""生成「人名_ISST编号」命名副本 + URL 对照清单
匹配逻辑：
  - 中文名照片（如 高旭.jpg）-> 匹配网站卡片 h3 中文名
  - 英文名照片（如 Arnold_Yu_Lok_Wong.jpg）-> 匹配卡片英文名
输出：
  1. renamed/ 目录：{EnglishName}_{ISST_ID}.jpg
  2. photo_to_id.json：照片 -> ISST ID 映射
  3. upload_manifest.csv：照片 | 人名 | ISST ID | OSS URL 对照清单
"""
import io, sys, os, re, json, shutil, csv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\剑桥折刀\Desktop\健衡项目\ISST\site'
SRC_DIR = os.path.join(BASE, 'scraped_therapists', '照片')
OUT_DIR = os.path.join(BASE, 'scraped_therapists', 'renamed')
MANIFEST = os.path.join(BASE, 'scraped_therapists', 'upload_manifest.csv')
ENDPOINT = 'https://isst-website.oss-cn-beijing.aliyuncs.com'
os.makedirs(OUT_DIR, exist_ok=True)

# 1. 提取网站卡片记录（id + 名字）
with open(os.path.join(BASE, 'therapists.html'), encoding='utf-8') as f:
    html = f.read()

records = []
for m in re.finditer(r'<h3>([^<]*)<span class="chk"', html):
    name = m.group(1).strip()
    tail = html[m.end():m.end() + 400]
    m_id = re.search(r'<div class="id">([^<]+)</div>', tail)
    if m_id:
        records.append({'id': m_id.group(1).strip(), 'name': name})

id_info = {r['id']: r['name'] for r in records}

# 2. 索引
by_cn, by_en = {}, {}
for r in records:
    cn = ''.join(re.findall(r'[\u4e00-\u9fff]', r['name']))
    en = re.sub(r'[\u4e00-\u9fff]', '', r['name'])
    en_norm = re.sub(r'[^A-Za-z]+', '', en).lower()
    if cn:
        by_cn.setdefault(cn, []).append(r['id'])
    if en_norm:
        by_en.setdefault(en_norm, []).append(r['id'])

# 3. 匹配照片
photos = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png')))
matched, unmatched = {}, []

for fname in photos:
    stem = os.path.splitext(fname)[0]
    cn = ''.join(re.findall(r'[\u4e00-\u9fff]', stem))
    if cn:
        ids = by_cn.get(cn, [])
        if len(ids) == 1:
            matched[fname] = ids[0]
        else:
            unmatched.append((fname, 'cn', ids))
        continue
    en_norm = re.sub(r'[^A-Za-z]+', '', stem).lower()
    ids = by_en.get(en_norm, [])
    if len(ids) == 1:
        matched[fname] = ids[0]
    else:
        unmatched.append((fname, 'en', ids))

# 4. 生成命名副本 + 清单
manifest = []
renamed_files = []
for fname, iid in matched.items():
    ext = os.path.splitext(fname)[1].lower() or '.jpg'
    full_name = id_info[iid]
    # 英文人名（去掉中文、PT/PhD 等尾缀、逗号）
    en = re.sub(r'[\u4e00-\u9fff]', '', full_name)
    en = re.sub(r'\b(PT|PhD|BSc|DPT|MSc)\b', '', en)
    en = re.sub(r'[,\s]+', '_', en).strip('_')
    if not en:
        en = os.path.splitext(fname)[0]
    new_name = f'{en}_{iid}{ext}'
    shutil.copy2(os.path.join(SRC_DIR, fname), os.path.join(OUT_DIR, new_name))
    renamed_files.append(new_name)
    manifest.append({
        'photo': fname, 'name': full_name, 'id': iid,
        'oss_key': f'therapists/{new_name}',
        'url': f'{ENDPOINT}/therapists/{new_name}'
    })

# 5. 写文件
with open(os.path.join(BASE, 'scraped_therapists', 'photo_to_id.json'), 'w', encoding='utf-8') as f:
    json.dump(matched, f, ensure_ascii=False, indent=1)

with open(MANIFEST, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['photo', 'name', 'id', 'oss_key', 'url'])
    w.writeheader()
    w.writerows(manifest)

print(f'照片总数：{len(photos)}')
print(f'已匹配并生成命名副本：{len(renamed_files)}')
print(f'未匹配：{len(unmatched)}')
for f, typ, ids in unmatched:
    print(f'  [{typ}] {f} -> {ids}')
print(f'清单已保存：upload_manifest.csv')
print()
print('=== 对照清单预览（含中文名照片）===')
for m in manifest:
    if any('\u4e00' <= ch <= '\u9fff' for ch in m['photo']):
        print(f"  {m['id']}  {m['name']}")
        print(f"      <- {m['photo']}")
        print(f"      -> {m['url']}")
