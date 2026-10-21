#!/usr/bin/env python3
"""TRACK 05: actual ADB/UIAutomator timer smoke on a disposable Android emulator.

No JS stubbing or storage mutation. A missing WebView accessibility tree is
NOT_TESTED, never PASS. The broader Android TRACK 03 owns full locale/native QA.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'android_e2e_recovery'))
from run_e2e import Device, Suite, NotTested, CheckFailed  # noqa: E402

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--serial',required=True)
    p.add_argument('--json',required=True)
    a=p.parse_args()
    d=Device(a.serial)
    suite=Suite(d,argparse.Namespace(ack_disposable_data=True,run_slow=False,allow_rotation=False))
    suite.test('preflight','read')
    suite.test('timer_start_pause','write')
    # A second real timer round checks the Resume path after the prior pause.
    if suite.records[-1]['status']=='PASS':
        started=time.monotonic()
        try:
            d.nav('Timer','المؤقت')
            d.tap('Start or pause timer')
            t1=d.snapshot()
            time.sleep(2)
            t2=d.snapshot()
            if t1==t2:
                raise CheckFailed('Resumed Android timer failed to advance')
            d.tap('Start or pause timer')
            d.restart()
            d.nav('Timer','المؤقت')
            paused=d.snapshot()
            time.sleep(2)
            if paused != d.snapshot():
                raise CheckFailed('Paused timer changed following Android force-stop/reopen')
            status,detail='PASS','Actual resumed countdown and paused reopen observed on Android'
        except NotTested as e: status,detail='NOT_TESTED',str(e)
        except (CheckFailed,Exception) as e: status,detail='FAIL',str(e)[:250]
    else:
        started=time.monotonic()
        status,detail='NOT_TESTED','Prerequisite Android timer Start/Pause did not PASS'
    suite.records.append({'id':'timer_resume_force_stop','status':status,
                          'detail':detail,'seconds':round(time.monotonic()-started,2)})
    print(status,'timer_resume_force_stop',detail,flush=True)
    output={'source':'Android UIAutomator ADB','device':a.serial,'release_approved':False,
            'cases':suite.records}
    path=Path(a.json);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return 1 if any(x['status']=='FAIL' for x in suite.records) else (2 if any(x['status']!='PASS' for x in suite.records) else 0)

if __name__=='__main__': sys.exit(main())
