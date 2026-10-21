/* Deep Focus Notes — best-effort crash recovery for a single unsaved editor draft.
   The saved notesList is NEVER mutated until the user presses Save. */
const NS_DRAFT_KEY='deep_focus_unsaved_note_draft_v1';
const NS_DRAFT_LIMIT=100000; // bounded to avoid consuming all WebView storage
let nsDraftTimer=null;
let nsDraftDirty=false;
let nsDraftLastState=[null,false];
const NS_DRAFT_LANG={
 en:{saved:'Draft saved on this device',ready:'An unfinished draft is available',restore:'Restore draft',
 discard:'Discard',tooLong:'Draft exceeds autosave limit. Save this note directly.',restored:'Draft restored',
 cleared:'Draft discarded',other:'Another unfinished note is saved. Open or export it before overwriting.',
 conflict:'The saved note changed since this draft was created. Restore is blocked to prevent overwriting newer content; copy or discard the older draft.',
 failed:'Could not save the draft on this device. Keep this editor open and retry.',
 unsaved:'Your edits could not be backed up on this device. Close and risk losing these changes?'},
 ar:{saved:'تم حفظ المسودة على الجهاز',ready:'توجد مسودة غير مكتملة',restore:'استعادة المسودة',
 discard:'حذف المسودة',tooLong:'المسودة كبيرة جدًا للحفظ التلقائي. احفظ الملاحظة مباشرة.',restored:'تمت استعادة المسودة',
 cleared:'تم حذف المسودة',other:'توجد مسودة لملاحظة أخرى. افتحها أو انسخها قبل الاستبدال.',
 conflict:'تغيرت الملاحظة المحفوظة منذ إنشاء المسودة. استعادة المسودة محظورة لحماية النسخة الأحدث؛ انسخ المسودة القديمة أو احذفها.',
 failed:'تعذّر حفظ المسودة على الجهاز. أبقِ المحرر مفتوحًا وحاول مجددًا.',
 unsaved:'تعذّر حفظ هذه التعديلات كمسودة. هل تريد الإغلاق مع احتمال فقدانها؟'},
 es:{"saved":"Borrador guardado en este dispositivo","ready":"Hay un borrador sin terminar","restore":"Restaurar borrador","discard":"Descartar","tooLong":"El borrador supera el límite de guardado automático. Guarda la nota directamente.","restored":"Borrador restaurado","cleared":"Borrador descartado","other":"Ya hay otro borrador guardado. Ábrelo o expórtalo antes de reemplazarlo.","conflict":"La nota guardada cambió desde que se creó este borrador. No se puede restaurar para evitar sobrescribir el contenido nuevo; copia o descarta el borrador antiguo.","failed":"No se pudo guardar el borrador en este dispositivo. Mantén abierto el editor e inténtalo de nuevo.","unsaved":"No se han podido respaldar tus cambios en este dispositivo. ¿Cerrar y arriesgarse a perderlos?"},
 zh:{"saved":"草稿已保存在此设备上","ready":"存在未完成的草稿","restore":"恢复草稿","discard":"丢弃","tooLong":"草稿超过自动保存限制。请直接保存笔记。","restored":"草稿已恢复","cleared":"草稿已丢弃","other":"已保存另一份未完成的草稿。覆盖之前请先打开或导出。","conflict":"创建此草稿后，已保存的笔记发生了变化。为防止覆盖较新的内容，已阻止恢复；请复制或丢弃旧草稿。","failed":"无法在此设备上保存草稿。请保持编辑器打开并重试。","unsaved":"无法在此设备上备份你的修改。仍要关闭并承担丢失修改的风险吗？"},
 hi:{"saved":"ड्राफ़्ट इस डिवाइस पर सहेजा गया","ready":"एक अधूरा ड्राफ़्ट उपलब्ध है","restore":"ड्राफ़्ट पुनर्स्थापित करें","discard":"त्यागें","tooLong":"ड्राफ़्ट ऑटो-सेव सीमा से बड़ा है। नोट को सीधे सहेजें।","restored":"ड्राफ़्ट पुनर्स्थापित हो गया","cleared":"ड्राफ़्ट हटा दिया गया","other":"दूसरे अधूरे नोट का ड्राफ़्ट सहेजा हुआ है। बदलने से पहले उसे खोलें या निर्यात करें।","conflict":"इस ड्राफ़्ट के बनने के बाद सहेजा गया नोट बदल गया है। नए बदलावों को बचाने के लिए पुनर्स्थापना रोकी गई है; पुराने ड्राफ़्ट को कॉपी करें या हटाएँ।","failed":"इस डिवाइस पर ड्राफ़्ट सहेजा नहीं जा सका। संपादक खुला रखें और फिर प्रयास करें।","unsaved":"इस डिवाइस पर आपके बदलावों का बैकअप नहीं बन सका। क्या बदलाव खोने के जोखिम के साथ बंद करना है?"},
 fr:{"saved":"Brouillon enregistré sur cet appareil","ready":"Un brouillon inachevé est disponible","restore":"Restaurer le brouillon","discard":"Ignorer","tooLong":"Le brouillon dépasse la limite de sauvegarde automatique. Enregistrez directement cette note.","restored":"Brouillon restauré","cleared":"Brouillon supprimé","other":"Un autre brouillon est enregistré. Ouvrez-le ou exportez-le avant de le remplacer.","conflict":"La note enregistrée a changé depuis la création de ce brouillon. La restauration est bloquée pour éviter d’écraser les modifications récentes ; copiez ou supprimez l’ancien brouillon.","failed":"Impossible d’enregistrer le brouillon sur cet appareil. Gardez l’éditeur ouvert et réessayez.","unsaved":"Vos modifications n’ont pas pu être sauvegardées sur cet appareil. Fermer au risque de les perdre ?"},
 de:{"saved":"Entwurf auf diesem Gerät gespeichert","ready":"Ein unvollständiger Entwurf ist vorhanden","restore":"Entwurf wiederherstellen","discard":"Verwerfen","tooLong":"Der Entwurf überschreitet das Limit für die automatische Sicherung. Speichere die Notiz direkt.","restored":"Entwurf wiederhergestellt","cleared":"Entwurf verworfen","other":"Ein anderer unvollständiger Entwurf ist gespeichert. Öffne oder exportiere ihn, bevor du ihn ersetzt.","conflict":"Die gespeicherte Notiz wurde seit Erstellung dieses Entwurfs geändert. Die Wiederherstellung wurde gesperrt, damit neuere Inhalte nicht überschrieben werden. Kopiere oder verwerfe den alten Entwurf.","failed":"Der Entwurf konnte auf diesem Gerät nicht gespeichert werden. Lass den Editor geöffnet und versuche es erneut.","unsaved":"Deine Änderungen konnten auf diesem Gerät nicht gesichert werden. Trotzdem schließen und den Verlust riskieren?"},
 ru:{"saved":"Черновик сохранён на устройстве","ready":"Есть незавершённый черновик","restore":"Восстановить черновик","discard":"Отменить","tooLong":"Черновик превышает предел автосохранения. Сохраните заметку вручную.","restored":"Черновик восстановлен","cleared":"Черновик удалён","other":"Уже сохранён другой незавершённый черновик. Откройте или экспортируйте его перед заменой.","conflict":"Сохранённая заметка изменилась после создания черновика. Восстановление заблокировано, чтобы не перезаписать новые данные. Скопируйте или удалите старый черновик.","failed":"Не удалось сохранить черновик на устройстве. Не закрывайте редактор и повторите попытку.","unsaved":"Не удалось создать резервную копию изменений на устройстве. Закрыть с риском потерять их?"},
 pt:{"saved":"Rascunho salvo neste dispositivo","ready":"Há um rascunho inacabado","restore":"Restaurar rascunho","discard":"Descartar","tooLong":"O rascunho ultrapassa o limite de salvamento automático. Salve a nota diretamente.","restored":"Rascunho restaurado","cleared":"Rascunho descartado","other":"Outro rascunho está salvo. Abra-o ou exporte-o antes de substituí-lo.","conflict":"A nota salva mudou desde a criação deste rascunho. A restauração foi bloqueada para evitar sobrescrever alterações mais recentes; copie ou descarte o rascunho antigo.","failed":"Não foi possível salvar o rascunho neste dispositivo. Mantenha o editor aberto e tente novamente.","unsaved":"Não foi possível fazer backup das alterações neste dispositivo. Fechar e correr o risco de perdê-las?"},
 ja:{"saved":"下書きをこの端末に保存しました","ready":"未完了の下書きがあります","restore":"下書きを復元","discard":"破棄","tooLong":"下書きが自動保存の上限を超えています。ノートを直接保存してください。","restored":"下書きを復元しました","cleared":"下書きを破棄しました","other":"別の未完了の下書きが保存されています。上書きする前に開くかエクスポートしてください。","conflict":"この下書きの作成後に保存済みノートが変更されました。新しい内容の上書きを防ぐため復元を停止しました。古い下書きをコピーするか破棄してください。","failed":"この端末に下書きを保存できませんでした。編集画面を開いたまま再試行してください。","unsaved":"この端末に変更内容をバックアップできませんでした。失う可能性を承知で閉じますか？"},
 id:{"saved":"Draf tersimpan di perangkat ini","ready":"Ada draf yang belum selesai","restore":"Pulihkan draf","discard":"Buang","tooLong":"Draf melebihi batas simpan otomatis. Simpan catatan secara langsung.","restored":"Draf dipulihkan","cleared":"Draf dibuang","other":"Draf lain yang belum selesai sudah tersimpan. Buka atau ekspor sebelum menimpanya.","conflict":"Catatan tersimpan telah berubah sejak draf ini dibuat. Pemulihan diblokir agar perubahan baru tidak tertimpa; salin atau buang draf lama.","failed":"Draf tidak dapat disimpan di perangkat ini. Biarkan editor tetap terbuka lalu coba lagi.","unsaved":"Perubahan Anda tidak dapat dicadangkan di perangkat ini. Tutup dengan risiko kehilangan perubahan?"},
 tr:{"saved":"Taslak bu cihaza kaydedildi","ready":"Tamamlanmamış bir taslak var","restore":"Taslağı geri yükle","discard":"At","tooLong":"Taslak otomatik kaydetme sınırını aşıyor. Notu doğrudan kaydedin.","restored":"Taslak geri yüklendi","cleared":"Taslak atıldı","other":"Başka bir tamamlanmamış taslak kayıtlı. Üzerine yazmadan önce açın veya dışa aktarın.","conflict":"Kaydedilen not, bu taslak oluşturulduğundan beri değişmiş. Yeni içeriğin üzerine yazmamak için geri yükleme engellendi; eski taslağı kopyalayın veya atın.","failed":"Taslak bu cihaza kaydedilemedi. Düzenleyiciyi açık tutup yeniden deneyin.","unsaved":"Değişiklikleriniz bu cihazda yedeklenemedi. Kaybetme riskini göze alarak kapatılsın mı?"},
 ko:{"saved":"이 기기에 초안을 저장했습니다","ready":"완성되지 않은 초안이 있습니다","restore":"초안 복원","discard":"버리기","tooLong":"초안이 자동 저장 한도를 초과했습니다. 노트를 직접 저장하세요.","restored":"초안을 복원했습니다","cleared":"초안을 버렸습니다","other":"다른 미완성 초안이 저장되어 있습니다. 덮어쓰기 전에 열거나 내보내세요.","conflict":"초안을 만든 후 저장된 노트가 변경되었습니다. 최신 내용이 덮어써지지 않도록 복원을 차단했습니다. 이전 초안을 복사하거나 버리세요.","failed":"이 기기에 초안을 저장할 수 없습니다. 편집기를 열린 상태로 두고 다시 시도하세요.","unsaved":"이 기기에 변경 사항을 백업하지 못했습니다. 손실될 위험을 감수하고 닫을까요?"},
 vi:{"saved":"Đã lưu bản nháp trên thiết bị này","ready":"Có bản nháp chưa hoàn thành","restore":"Khôi phục bản nháp","discard":"Bỏ bản nháp","tooLong":"Bản nháp vượt giới hạn tự động lưu. Hãy lưu ghi chú trực tiếp.","restored":"Đã khôi phục bản nháp","cleared":"Đã bỏ bản nháp","other":"Đã lưu một bản nháp chưa hoàn thành khác. Hãy mở hoặc xuất trước khi ghi đè.","conflict":"Ghi chú đã lưu đã thay đổi sau khi tạo bản nháp này. Việc khôi phục bị chặn để tránh ghi đè nội dung mới; hãy sao chép hoặc bỏ bản nháp cũ.","failed":"Không thể lưu bản nháp trên thiết bị này. Hãy giữ trình soạn thảo mở và thử lại.","unsaved":"Không thể sao lưu các thay đổi trên thiết bị này. Đóng và chấp nhận nguy cơ mất thay đổi?"},
 it:{"saved":"Bozza salvata su questo dispositivo","ready":"È disponibile una bozza incompleta","restore":"Ripristina bozza","discard":"Scarta","tooLong":"La bozza supera il limite di salvataggio automatico. Salva direttamente la nota.","restored":"Bozza ripristinata","cleared":"Bozza eliminata","other":"È salvata un’altra bozza incompleta. Aprila o esportala prima di sostituirla.","conflict":"La nota salvata è cambiata dopo la creazione di questa bozza. Il ripristino è bloccato per evitare di sovrascrivere le modifiche più recenti; copia o elimina la vecchia bozza.","failed":"Impossibile salvare la bozza su questo dispositivo. Lascia aperto l’editor e riprova.","unsaved":"Impossibile eseguire il backup delle modifiche su questo dispositivo. Chiudere rischiando di perderle?"},
 bn:{"saved":"এই ডিভাইসে খসড়া সংরক্ষিত হয়েছে","ready":"একটি অসমাপ্ত খসড়া রয়েছে","restore":"খসড়া পুনরুদ্ধার করুন","discard":"বাতিল করুন","tooLong":"খসড়াটি স্বয়ংক্রিয় সংরক্ষণের সীমা ছাড়িয়েছে। নোটটি সরাসরি সংরক্ষণ করুন।","restored":"খসড়া পুনরুদ্ধার হয়েছে","cleared":"খসড়া বাতিল হয়েছে","other":"আরেকটি অসমাপ্ত খসড়া সংরক্ষিত আছে। প্রতিস্থাপনের আগে খুলুন বা রপ্তানি করুন।","conflict":"এই খসড়া তৈরির পর সংরক্ষিত নোট পরিবর্তিত হয়েছে। নতুন লেখা মুছে যাওয়া ঠেকাতে পুনরুদ্ধার বন্ধ করা হয়েছে; পুরোনো খসড়াটি অনুলিপি করুন বা বাতিল করুন।","failed":"এই ডিভাইসে খসড়া সংরক্ষণ করা যায়নি। সম্পাদক খোলা রেখে আবার চেষ্টা করুন।","unsaved":"এই ডিভাইসে পরিবর্তনগুলোর ব্যাকআপ রাখা যায়নি। হারানোর ঝুঁকি নিয়ে বন্ধ করবেন?"},
 ur:{"saved":"مسودہ اس آلے پر محفوظ ہو گیا","ready":"ایک نامکمل مسودہ موجود ہے","restore":"مسودہ بحال کریں","discard":"رد کریں","tooLong":"مسودہ خودکار محفوظ کرنے کی حد سے بڑا ہے۔ نوٹ براہ راست محفوظ کریں۔","restored":"مسودہ بحال ہو گیا","cleared":"مسودہ رد کر دیا گیا","other":"ایک اور نامکمل مسودہ محفوظ ہے۔ بدلنے سے پہلے اسے کھولیں یا برآمد کریں۔","conflict":"اس مسودے کے بننے کے بعد محفوظ شدہ نوٹ بدل گیا ہے۔ نئے مواد کو مٹنے سے بچانے کے لیے بحالی روک دی گئی ہے؛ پرانے مسودے کو نقل کریں یا رد کریں۔","failed":"اس آلے پر مسودہ محفوظ نہیں ہو سکا۔ ایڈیٹر کھلا رکھیں اور دوبارہ کوشش کریں۔","unsaved":"اس آلے پر آپ کی تبدیلیوں کا بیک اپ نہیں بن سکا۔ کیا انہیں کھونے کا خطرہ لے کر بند کریں؟"},
 fa:{"saved":"پیش‌نویس روی این دستگاه ذخیره شد","ready":"یک پیش‌نویس ناتمام موجود است","restore":"بازیابی پیش‌نویس","discard":"دور انداختن","tooLong":"پیش‌نویس از محدودیت ذخیرهٔ خودکار بزرگ‌تر است. یادداشت را مستقیماً ذخیره کنید.","restored":"پیش‌نویس بازیابی شد","cleared":"پیش‌نویس دور انداخته شد","other":"پیش‌نویس ناتمام دیگری ذخیره شده است. پیش از جایگزینی آن را باز یا صادر کنید.","conflict":"یادداشت ذخیره‌شده پس از ایجاد این پیش‌نویس تغییر کرده است. برای جلوگیری از بازنویسی محتوای جدید، بازیابی مسدود شد؛ پیش‌نویس قدیمی را کپی یا حذف کنید.","failed":"ذخیرهٔ پیش‌نویس روی این دستگاه ممکن نشد. ویرایشگر را باز نگه دارید و دوباره تلاش کنید.","unsaved":"پشتیبان‌گیری از تغییرات شما روی این دستگاه ممکن نشد. با خطر از دست دادن آن‌ها بسته شود؟"},
 pl:{"saved":"Szkic zapisano na tym urządzeniu","ready":"Dostępny jest niedokończony szkic","restore":"Przywróć szkic","discard":"Odrzuć","tooLong":"Szkic przekracza limit automatycznego zapisu. Zapisz notatkę bezpośrednio.","restored":"Szkic przywrócono","cleared":"Szkic odrzucono","other":"Zapisano inny niedokończony szkic. Otwórz go lub wyeksportuj przed zastąpieniem.","conflict":"Zapisana notatka zmieniła się od utworzenia tego szkicu. Przywracanie zablokowano, aby nie nadpisać nowszych zmian; skopiuj lub odrzuć starszy szkic.","failed":"Nie udało się zapisać szkicu na tym urządzeniu. Nie zamykaj edytora i spróbuj ponownie.","unsaved":"Nie udało się wykonać kopii zmian na tym urządzeniu. Zamknąć, ryzykując ich utratę?"},
 nl:{"saved":"Concept opgeslagen op dit apparaat","ready":"Er is een onafgemaakt concept beschikbaar","restore":"Concept herstellen","discard":"Verwerpen","tooLong":"Het concept overschrijdt de limiet voor automatisch opslaan. Sla de notitie rechtstreeks op.","restored":"Concept hersteld","cleared":"Concept verwijderd","other":"Er is nog een onafgemaakt concept opgeslagen. Open of exporteer het voordat je het vervangt.","conflict":"De opgeslagen notitie is gewijzigd sinds dit concept is gemaakt. Herstellen is geblokkeerd om nieuwe wijzigingen niet te overschrijven; kopieer of verwijder het oude concept.","failed":"Het concept kon niet op dit apparaat worden opgeslagen. Laat de editor open en probeer het opnieuw.","unsaved":"Je wijzigingen konden niet op dit apparaat worden veiliggesteld. Sluiten met het risico ze te verliezen?"}

};
function nsDraftLabel(k){const labels=NS_DRAFT_LANG[cfg.lang] || NS_DRAFT_LANG.en;return labels[k] || NS_DRAFT_LANG.en[k] || '';}
function nsGetStoredDraft(){
 const d=loadFortressData(NS_DRAFT_KEY,null);
 if(!d||typeof d!=='object'||d.v!==1||typeof d.title!=='string'||typeof d.body!=='string')return null;
 if(d.cornell!==undefined&&(!d.cornell||['cues','notes','summary'].some(k=>typeof d.cornell[k]!=='string'||d.cornell[k].length>NS_DRAFT_LIMIT)))return null;
 if(d.tags!==undefined&&(typeof d.tags!=='string'||d.tags.length>12000))return null;
 if(d.notebookId!==undefined&&(typeof d.notebookId!=='string'||d.notebookId.length>120))return null;
 if(d.recallPairs!==undefined&&(!Array.isArray(d.recallPairs)||d.recallPairs.length>200||d.recallPairs.some(p=>!p||typeof p.question!=='string'||typeof p.answer!=='string')))return null;
 if(d.baseFingerprint!==undefined&&d.baseFingerprint!==null&&
    (typeof d.baseFingerprint!=='string'||d.baseFingerprint.length>NS_DRAFT_LIMIT))return null;
 if(d.title.length>250||d.body.length>NS_DRAFT_LIMIT)return null;
 if(!Number.isFinite(d.updated)||d.updated>Date.now()+3600000||Date.now()-d.updated>30*86400000)return null;
 if(d.editId!==null&&(!Number.isSafeInteger(d.editId)||d.editId<0))return null;
 if(typeof d.cat!=='string'||!['cornell','flash','quick'].includes(d.cat))return null;
 if(typeof d.date!=='string'||!(/^\d{4}-\d{2}-\d{2}$/.test(d.date)))return null;
 return d;
}
function nsDraftContextMatches(d){
 return d&&d.editId===nsEditId;
}
function nsDraftVersionMatches(d){
 if(!d||d.baseFingerprint===undefined||d.baseFingerprint===null)return true;
 if(d.baseFingerprint!==window.DeepFocusNotesEditorUI?.openedFingerprint?.())return false;
 // An editor's opening fingerprint can remain unchanged after a second writer
 // durably updates this same note. Validate against live records as well before
 // restoring or acknowledging a draft. Never mutate historical v21 records.
 if(d.editId!==null&&typeof notesList!=='undefined'&&Array.isArray(notesList)){
  const current=notesList.filter(n=>n&&n.id===d.editId);
  if(current.length!==1||JSON.stringify(current[0])!==d.baseFingerprint)return false;
 }
 return true;
}
function nsRefreshDraftLocale(){nsDraftState(...nsDraftLastState);}
function nsDraftState(status,offer){
 nsDraftLastState=[status,offer];
 const msg=document.getElementById('nsDraftStatus'),restore=document.getElementById('nsDraftRestore'),discard=document.getElementById('nsDraftDiscard');
 if(msg)msg.textContent=status?nsDraftLabel(status):'';
 if(restore){restore.hidden=!offer||status==='conflict';restore.textContent=nsDraftLabel('restore');}
 if(discard){discard.hidden=!offer;discard.textContent=nsDraftLabel('discard');}
}
function nsPrepareDraft(){
 nsDraftDirty=false;
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const saved=nsGetStoredDraft();
 const same=saved&&nsDraftContextMatches(saved);
 nsDraftState(saved?(same?(nsDraftVersionMatches(saved)?'ready':'conflict'):'other'):null,!!same);
}
function nsReadEditorDraft(){
 return {
  v:1,editId:nsEditId,title:document.getElementById('inpNoteTitle').value,
  body:document.getElementById('inpNoteBody').value,
  cat:document.getElementById('selNoteCat').value,
  date:document.getElementById('inpNoteCalDate').value||localDateISO(),
  blur:document.getElementById('chkNoteBlur').checked,
  pinned:document.getElementById('nsPinCheck').checked,
  favorite:document.getElementById('nsFavCheck').checked,updated:Date.now(),
  ...(window.DeepFocusNotesEditorUI?.draftFields?.()||{})
 };
}
function nsScheduleDraft(){
 const modal=document.getElementById('noteModal');
 if(!modal||!modal.classList.contains('open'))return;
 nsDraftDirty=true;
 if(nsDraftTimer!==null)clearTimeout(nsDraftTimer);
 nsDraftTimer=setTimeout(nsFlushDraft,550);
}
function nsFlushDraft(){
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const modal=document.getElementById('noteModal');
 if(!modal||!modal.classList.contains('open'))return false;
 const draft=nsReadEditorDraft();
 if(draft.title.length>250||draft.body.length>NS_DRAFT_LIMIT){nsDraftState('tooLong',false);return false;}
 if(!draft.title.trim()&&!draft.body.trim()&&!['cues','notes','summary'].some(k=>draft.cornell?.[k]?.trim()))return false;
 const existing=nsGetStoredDraft();
 if(existing&&!nsDraftContextMatches(existing)){nsDraftState('other',false);return false;}
 if(existing&&!nsDraftVersionMatches(existing)){nsDraftState('conflict',true);return false;}
 try {
  const raw=JSON.stringify(draft);
  if(raw.length>NS_DRAFT_LIMIT+6000){nsDraftState('tooLong',false);return false;}
  if(saveFortressData(NS_DRAFT_KEY,draft)!==true){nsDraftState('failed',false);return false;}
  const checked=nsGetStoredDraft();
  if(!checked||JSON.stringify(checked)!==raw){nsDraftState('failed',false);return false;}
 }catch(e){nsDraftState('failed',false);return false;}
 nsDraftState('saved',false);return true;
}
function nsRestoreDraft(){
 const saved=nsGetStoredDraft();
 if(!nsDraftContextMatches(saved))return false;
 if(!nsDraftVersionMatches(saved)){nsDraftState('conflict',true);return false;}
 document.getElementById('inpNoteTitle').value=saved.title;
 document.getElementById('inpNoteBody').value=saved.body;
 document.getElementById('selNoteCat').value=saved.cat;
 document.getElementById('inpNoteCalDate').value=saved.date;
 document.getElementById('chkNoteBlur').checked=!!saved.blur;
 document.getElementById('nsPinCheck').checked=!!saved.pinned;
 document.getElementById('nsFavCheck').checked=!!saved.favorite;
 if(window.DeepFocusNotesEditorUI?.restoreDraftFields)window.DeepFocusNotesEditorUI.restoreDraftFields(saved);
 nsDraftDirty=true;
 nsUpdateCount();nsDraftState('restored',false);
 return true;
}
function nsDeleteDraftKey(){
 try{
  localStorage.removeItem(NS_DRAFT_KEY);localStorage.removeItem(NS_DRAFT_KEY+'_mirror');
  return nsGetStoredDraft()===null;
 }catch(e){return false;}
}
function nsDiscardDraft(){
 const saved=nsGetStoredDraft();
 if(!nsDraftContextMatches(saved))return false;
 if(!nsDeleteDraftKey()){nsDraftState('failed',true);return false;}
 nsDraftState('cleared',false);return true;
}
function nsClearDraftForSavedNote(){
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const draft=nsGetStoredDraft();
 if(!draft||nsDraftContextMatches(draft))nsDeleteDraftKey();
}
function nsCloseEditor(){
 if(nsDraftDirty&&!nsFlushDraft()){
  if(typeof window.confirm!=='function'||!window.confirm(nsDraftLabel('unsaved')))return false;
 }
 nsDraftDirty=false;closeModal('noteModal');return true;
}
const nsDraftDialog=document.getElementById('noteModal');
if(nsDraftDialog){
 nsDraftDialog.addEventListener('input',()=>{nsDraftDirty=true;nsScheduleDraft();});
 nsDraftDialog.addEventListener('change',()=>{nsDraftDirty=true;nsScheduleDraft();});
}
if(typeof document.addEventListener==='function')
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')nsFlushDraft();});
if(typeof window.addEventListener==='function')
 window.addEventListener('pagehide',nsFlushDraft);
