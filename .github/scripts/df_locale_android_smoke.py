import subprocess, time, re, json, pathlib, xml.etree.ElementTree as ET
out=pathlib.Path('evidence/android-ui');out.mkdir(parents=True,exist_ok=True)
package='com.deepfocus.study'
receipts=[]
def adb(*args,timeout=20):
 return subprocess.check_output(['adb',*args],text=True,stderr=subprocess.STDOUT,timeout=timeout)
def snapshot(tag):
 adb('shell','uiautomator','dump','--compressed','/sdcard/df-locale.xml',timeout=15)
 xml=adb('shell','cat','/sdcard/df-locale.xml');(out/(tag+'.xml')).write_text(xml)
 return list(ET.fromstring(xml).iter('node'))
def wait_text(value,tag,exact=False):
 error=None
 for attempt in range(8):
  try:
   nodes=snapshot(tag)
   for node in nodes:
    text=node.get('text','') or node.get('content-desc','')
    if (text==value if exact else value in text):return node
  except Exception as e:error=str(e)
  time.sleep(1)
 raise AssertionError(f'Missing visible {value!r}: {tag}; {error}')
def tap(node):
 nums=list(map(int,re.findall(r'\d+',node.get('bounds',''))));assert len(nums)==4,node.attrib
 adb('shell','input','tap',str((nums[0]+nums[2])//2),str((nums[1]+nums[3])//2))
def launch():
 adb('shell','monkey','-p',package,'-c','android.intent.category.LAUNCHER','1');time.sleep(3)
def switch(current,query,native,expected):
 tap(wait_text(current,'before-'+query,True));time.sleep(1)
 nodes=snapshot('picker-'+query)
 editors=[n for n in nodes if n.get('class','').endswith('EditText')]
 assert editors,'Language search field is missing'
 tap(editors[0]);adb('shell','input','text',query);time.sleep(1)
 tap(wait_text(native,'search-'+query));time.sleep(2)
 wait_text(expected,'selected-'+query)
 receipts.append({'locale':query,'visible_label':expected,'status':'PASS','interaction':'Android input tap + text'})
 adb('shell','am','force-stop',package);launch();wait_text(expected,'restarted-'+query)
 receipts.append({'locale':query,'offline_force_stop_restart':'PASS'})
try:
 adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk',timeout=60)
 adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');launch()
 switch('EN','uk','Українська','Швидке тренування')
 switch('UK','de','Deutsch','Schnelltraining')
 switch('DE','ar','العربية','تدريب سريع')
 with open(out/'last-screen.png','wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True)
 print('PASS: actual Android UI locale selection and offline force-stop restart for uk/de/ar')
finally:
 (out/'receipt.json').write_text(json.dumps({'source_sha':pathlib.Path('evidence/SOURCE_SHA').read_text().strip(),'results':receipts,'release_approved':False},ensure_ascii=False,indent=2))
 try:(out/'logcat.txt').write_text(adb('logcat','-d','-t','400'))
 except Exception:pass
