import concurrent.futures, json, sys, urllib.request, urllib.error, re
from html.parser import HTMLParser
from pathlib import Path
class Snapshot(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.result=[]; self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','noscript'): self.skip+=1
  if self.skip: return
  if tag not in ('meta','link','img','source','video','a','h1','h2','h3','button','input','textarea','select','title','form','section','header','footer','main','label','p','span'): return
  picked={k:v for k,v in attrs if k in ('href','src','alt','name','placeholder','content','property','rel','poster','aria-label','role','type')}
  if tag=='link' and picked.get('rel') in ('preload','stylesheet'): return
  if tag=='meta' and picked.get('name') == 'next-size-adjust': return
  self.result.append([tag,picked])
 def handle_endtag(self,tag):
  if self.skip and tag in ('script','style','noscript'): self.skip-=1
 def handle_data(self,data):
  clean=' '.join(data.split())
  if not self.skip and clean: self.result.append(clean)
routes=['/','/360-tour','/about','/booking-policy','/business','/cancellation-policy','/celebrations','/check-your-date','/contact','/experiences','/faq','/gallery','/global-desk','/plan-your-event','/privacy','/spaces','/terms','/venue-visit','/weddings','/book','/my-vijaya']
slugs=re.findall(r'^\s+slug: "([^"]+)",',Path('src/lib/data/spaces.ts').read_text(),re.M)
routes+=['/spaces/'+slug for slug in slugs]
def normalize(sequence):
 metadata, body = [], []
 index = 0
 while index < len(sequence):
  item = sequence[index]
  if isinstance(item, list) and item[0] in ("title", "meta", "link"):
   if item[0] == "title" and index + 1 < len(sequence) and isinstance(sequence[index + 1], str):
    index += 1
    metadata.append(["title", sequence[index]])
   elif item[0] != "title":
    metadata.append(item)
  else:
   body.append(item)
  index += 1
 return sorted(metadata, key=lambda value: json.dumps(value, sort_keys=True)) + body
def render(route):
 try:
  with urllib.request.urlopen(sys.argv[1]+route,timeout=20) as response:
   dom=Snapshot(); dom.feed(response.read().decode()); return route,normalize(dom.result)
 except urllib.error.HTTPError as e:
  return route,[e.code]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: result=dict(pool.map(render,routes))
assert all(rows for rows in result.values())
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=1))
print('Captured',len(result),'public URLs')
