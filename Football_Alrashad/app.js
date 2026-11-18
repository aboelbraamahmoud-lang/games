/* Independent offline educational football controller.
 * No Supabase, no external navigation, no analytics, no CDN.
 * Parent owns the assessment; existing V22.1 stadium in runtime/ remains independent.
 */
(() => {
'use strict';
const $=id=>document.getElementById(id), CFG=window.FOOTBALL_PACKAGE||{}, isTeacher=CFG.role!=='student';
const clone=o=>JSON.parse(JSON.stringify(o));
const key='school-football-offline-v1-'+(CFG.packageId||'source');
function normalize(o){
 let q=Array.isArray(o?.questions)?o.questions:[];
 return {boards:Array.isArray(o?.boards)?o.boards.slice(0,8).map(String):["نتعلم ونلعب بروح رياضية", "كل محاولة فرصة للتعلم", "الاحترام والتعاون طريق النجاح"],welcomeTitle:String(o?.welcomeTitle||"أهلًا بكم في ملعب المعرفة"),welcomeText:String(o?.welcomeText||"اختر طريقة اللعب، وأجب عن الأسئلة لتسجل الأهداف."),instructionText:String(o?.instructionText||"فكر جيدًا واختر الإجابة الصحيحة."),teamColor:String(o?.teamColor||"#8a1538"),accentColor:String(o?.accentColor||"#cfa95a"),role:isTeacher?'teacher':'student',title:String(o?.title||'كرة القدم التعليمية'),school:String(o?.school||'اسم المدرسة'),teacher:String(o?.teacher||''),coordinator:String(o?.coordinator||''),classroom:String(o?.classroom||'الصف'),duration:[0,15,20,30,45,60].includes(Number(o?.duration))?Number(o.duration):30,shuffle:!!o?.shuffle,questions:q.slice(0,100).map(a=>({text:String(a?.text||''),options:Array.from({length:4},(_,i)=>String(a?.options?.[i]||'')),correct:Math.max(0,Math.min(3,Number(a?.correct)||0))}))};
}
let config=normalize(CFG), loadedFromSaved=false;
if(isTeacher){try{const saved=localStorage.getItem(key);if(saved){config=normalize(JSON.parse(saved));loadedFromSaved=true;}}catch(e){console.warn('تعذر استعادة الأسئلة المحفوظة',e);}}
let session=[],results=[],selectedIndex=-1,answered=false,timerId=null,timeLeft=0,gameReady=false,playing=false, token='',player='';
const save=()=>{if(!isTeacher)return;try{localStorage.setItem(key,JSON.stringify(config));}catch(e){$('exportProgress').textContent='تعذر الحفظ التلقائي على الجهاز؛ يمكن حفظ ملف الأسئلة يدويًا.';}};
const emitFile=(blob,name)=>{let a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),15000);};
function show(id){for(let x of ['editor','studentStart','playView'])$(x).hidden=x!==id;$('btnHome').hidden=!isTeacher||id==='editor';}
function updateHeader(){const teacher=(config.teacher||'').trim(),classroom=(config.classroom||'').trim();$('appName').textContent=config.title;$('schoolName').textContent=config.school;$('welcomeGameTitle').textContent=config.title;$('welcomeSchool').textContent=[config.school,config.coordinator?('المنسقة: '+config.coordinator):'',teacher?('المعلمة: '+teacher):'',classroom?('الصف: '+classroom):''].filter(Boolean).join(' · ');$('studentPackageSummary').textContent=config.questions.length+' أسئلة في الحياة الصحية · اختر طريقة اللعب داخل الملعب';$('footerLabel').textContent=['لعبة تعليمية مستقلة',config.school,config.coordinator?('المنسقة: '+config.coordinator):'',teacher?('المعلمة: '+teacher):'',classroom?('الصف: '+classroom):'','WebGL ثلاثي الأبعاد','لا تحتاج اتصالًا بالإنترنت'].filter(Boolean).join(' · ');document.title=config.title+' | مستقل دون إنترنت';}
function renderEditor(){
 const area=$('questionsEditor');area.replaceChildren();
 config.questions.forEach((q,i)=>{
  const card=document.createElement('article');card.className='qcard';card.dataset.index=i;
  const header=document.createElement('div');header.className='qhead';
  const number=document.createElement('strong');number.textContent=`السؤال ${i+1}`;
  const actions=document.createElement('div');actions.className='actions';
  for(const [action,label] of [['up','↑ للأعلى'],['down','↓ للأسفل'],['clone','نسخ'],['delete','حذف']]){const b=document.createElement('button');b.className='ghost';b.type='button';b.textContent=label;b.dataset.action=action;b.disabled=(action==='up'&&i===0)||(action==='down'&&i===config.questions.length-1);actions.append(b);}
  header.append(number,actions);card.append(header);
  const textarea=document.createElement('textarea');textarea.className='qtext';textarea.placeholder='اكتب السؤال هنا…';textarea.value=q.text;textarea.dataset.field='question';textarea.setAttribute('aria-label','نص السؤال '+(i+1));card.append(textarea);
  const options=document.createElement('div');options.className='qoptions';
  q.options.forEach((choice,j)=>{
   const row=document.createElement('label');row.className='qoption';
   const radio=document.createElement('input');radio.type='radio';radio.name='correct-'+i;radio.value=j;radio.checked=j===q.correct;radio.dataset.field='correct';radio.title='تحديد الإجابة الصحيحة';
   const input=document.createElement('input');input.type='text';input.value=choice;input.placeholder='الاختيار '+(j+1);input.dataset.field='choice';input.dataset.choice=j;input.setAttribute('aria-label',`السؤال ${i+1}، الاختيار ${j+1}`);
   row.append(radio,input);options.append(row);
  });card.append(options);area.append(card);
 });
 $('countDisplay').textContent=config.questions.length+' أسئلة';$('totalQuestions').textContent='('+config.questions.length+' من 100)';$('questionSourceInfo').textContent=loadedFromSaved?'مصدر الأسئلة: تعديلات محفوظة في هذا المتصفح. يمكنك تصديرها كما تظهر الآن.':'مصدر الأسئلة: بنك الأسئلة المُضمَّن في حزمة اللعبة.';
 $('addQuestion').disabled=config.questions.length>=100;
}
function createQuestion(){return{text:'',options:['','','',''],correct:0};}
function handleEdit(e){const node=e.target.closest('.qcard');if(!node)return;const i=Number(node.dataset.index),q=config.questions[i];if(!q)return;
 if(e.target.dataset.field==='question')q.text=e.target.value;
 else if(e.target.dataset.field==='choice')q.options[Number(e.target.dataset.choice)]=e.target.value;
 else if(e.target.dataset.field==='correct')q.correct=Number(e.target.value);
 else return;save();
}
function validate(){
 if(!config.questions.length)throw Error('أضيفي سؤالًا واحدًا على الأقل.');
 if(config.questions.length>100)throw Error('الحد الأقصى 100 سؤال.');
 for(let i=0;i<config.questions.length;i++){
  let q=config.questions[i];if(!q.text.trim())throw Error('اكتبي نص السؤال '+(i+1));
  if(q.options.length!==4||q.options.some(x=>!x.trim()))throw Error('أكملي الاختيارات الأربعة للسؤال '+(i+1));
  if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3)throw Error('حددي إجابة صحيحة للسؤال '+(i+1));
 }
}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function newSession(){validate();session=clone(config.questions);if(config.shuffle)shuffle(session);results=[];selectedIndex=-1;answered=false;playing=true;gameReady=false;clearInterval(timerId);token='local-'+Date.now()+'-'+Math.random().toString(36).slice(2);$('questionOverlay').hidden=true;$('resultsOverlay').hidden=true;updateHeader();show('playView');
 const frame=$('gameFrame');frame.src='runtime/games/football/index.html?standalone=1&seed='+Date.now();
}
function brandingPayload(){return{school:config.school,teacher:config.teacher,coordinator:config.coordinator,title:config.title,classroom:config.classroom,boards:config.boards,welcomeTitle:config.welcomeTitle,welcomeText:config.welcomeText,instructionText:config.instructionText,teamColor:config.teamColor,accentColor:config.accentColor};}
function toGame(data){const f=$('gameFrame');if(f.contentWindow)f.contentWindow.postMessage({...data,token},location.protocol==='file:'?'*':location.origin);}
function answer(correct,reply){if(answered||selectedIndex<0)return;answered=true;clearInterval(timerId);$('questionOverlay').hidden=true;
 const q=session[selectedIndex];results[selectedIndex]={correct:!!correct,question:q.text,chosen:reply??-1,right:q.correct,timeout:reply===-1};
 toGame({type:'school-football-result',index:selectedIndex,correct:!!correct,pending:false,feedback:correct?'إجابة صحيحة! أحسنت.':reply===-1?'انتهى الوقت. الإجابة الصحيحة: '+q.options[q.correct]:'الإجابة الصحيحة: '+q.options[q.correct]});
}
function question(index){
 if(index<0||index>=session.length)return;
 if(selectedIndex===index&&answered)return;
 selectedIndex=index;answered=false;const q=session[index];
 $('questionIndex').textContent=index+1;$('questionTotal').textContent=session.length;
 $('questionPrompt').textContent=q.text;$('questionInstruction').textContent=config.instructionText;
 $('answerOptions').replaceChildren();
 q.options.forEach((choice,i)=>{const btn=document.createElement('button');btn.textContent=(i+1)+'.  '+choice;btn.type='button';btn.onclick=()=>answer(i===q.correct,i);$('answerOptions').append(btn);});
 $('questionOverlay').hidden=false;clearInterval(timerId);
 const timer=$('timer');timer.hidden=!config.duration;
 if(config.duration){timeLeft=config.duration;timer.textContent=timeLeft;timer.classList.remove('warning');timerId=setInterval(()=>{if(!playing||answered){clearInterval(timerId);return;}timeLeft--;timer.textContent=timeLeft;timer.classList.toggle('warning',timeLeft<=10);if(timeLeft<=0)answer(false,-1);},1000);}
}
function finish(){playing=false;clearInterval(timerId);$('questionOverlay').hidden=true;
 const correct=results.filter(x=>x?.correct).length,total=session.length,wrong=total-correct;
 $('resultCompetition').textContent=config.title;$('resultSchool').textContent=config.school;
 $('resultStudent').textContent=player?'اللاعب: '+player:'أحسنت على المشاركة!';
 $('resultStats').replaceChildren();
 const lines=[`الأهداف الصحيحة: ${correct} / ${total}`,`الإجابات غير الصحيحة: ${wrong}`,`النتيجة: ${Math.round(correct/total*100)}%`];
 lines.forEach((line,i)=>{const t=document.createElement('div');t.textContent=line;if(i===0){t.style.color='#166947';} $('resultStats').append(t);});
 $('backResult').hidden=!isTeacher;$('resultsOverlay').hidden=false;
}
function handleMessage(e){if((location.protocol!=='file:'&&e.origin!==location.origin)||e.source!==$('gameFrame').contentWindow||!playing)return;const m=e.data;if(!m||typeof m!=='object')return;
 if(m.type==='school-football-ready'&&!gameReady){gameReady=true;toGame({type:'school-football-config',title:config.title,count:session.length,...brandingPayload()});return;}
 if(m.token!==token)return;
 if(m.type==='school-football-question'){if(selectedIndex===m.index&&!answered&&$('questionOverlay').hidden===false)return;question(Number(m.index));}
 if(m.type==='school-football-fullscreen'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});}
 if(m.type==='school-football-next'){
   if(m.index>=session.length-1){finish();return;}
   $('questionOverlay').hidden=true;selectedIndex=-1;answered=false;
   toGame({type:'school-football-advance',index:m.index});
 }
}
function resultText(){const correct=results.filter(x=>x?.correct).length,lines=[config.title,config.school,'المعلمة: '+(config.teacher||'غير محدد'),'المنسقة: '+(config.coordinator||'غير محدد'),'الصف: '+(config.classroom||'غير محدد'),'اللاعب: '+(player||'غير محدد'),'التاريخ: '+new Date().toLocaleString('ar-QA'),'النتيجة: '+correct+' / '+session.length,''];results.forEach((r,i)=>{if(!r)return;lines.push((i+1)+'. '+r.question);lines.push('الإجابة: '+(r.chosen===-1?'انتهى الوقت':session[i].options[r.chosen]));lines.push('الصحيح: '+session[i].options[r.right]);lines.push(r.correct?'صحيحة':'غير صحيحة');lines.push('');});return lines.join('\r\n');}
const nameSafe=s=>s.trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,55)||'football';
// Snapshot actual form values before saving or exporting, including a field still focused.
function syncEditorToConfig(){
 if(!isTeacher)return;
 config.title=$('gameTitle').value;
 config.school=$('schoolTitle').value;
 config.teacher=$('teacherName').value;
 config.coordinator=$('coordinatorName').value;
 config.classroom=$('className').value;
 config.duration=Number($('quizTime').value);
 config.shuffle=$('shuffleQuestions').checked;
 config.boards=$('boards').value.split('\n').filter(x=>x.trim()).slice(0,8);
 config.welcomeTitle=$('welcomeTitle').value;
 config.welcomeText=$('welcomeText').value;
 config.instructionText=$('instructionText').value;
 config.teamColor=$('teamColor').value;
 config.accentColor=$('accentColor').value;
 for(const card of $('questionsEditor').querySelectorAll('.qcard')){
  const idx=Number(card.dataset.index),q=config.questions[idx];if(!q)continue;
  q.text=card.querySelector('.qtext').value;
  card.querySelectorAll('input[data-field="choice"]').forEach(el=>q.options[Number(el.dataset.choice)]=el.value);
  const marked=card.querySelector('input[data-field="correct"]:checked');
  if(marked)q.correct=Number(marked.value);
 }
}
function safeInlineJSON(obj){return JSON.stringify(obj).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function stampIndex(html,packageData,version){
 html=html.replace(/<script id="football-exported-questions">[\s\S]*?<\/script>/g,'').replace(/<meta name="football-package-build"[^>]*>/g,'');
 const re=/(<script\b[^>]*\bsrc=["']config\.js[^"']*["'][^>]*><\/script>)/i;
 if(!re.test(html))throw Error('لم يُعثر على موضع إعدادات الأسئلة داخل صفحة اللعبة. أوقفت التصدير لحماية أسئلتك.');
 const embedded='<script id="football-exported-questions">window.FOOTBALL_PACKAGE='+safeInlineJSON(packageData)+';<\/script>';
 html=html.replace(re,(_,script)=>script+'\n'+embedded);
 // New query strings prevent browser caches on static hosting from serving old app/config.
 html=html.replace(/\?v=22\.4/g,'?v='+version).replace(/\?v=22\.5/g,'?v='+version).replace(/\?v=24\.2/g,'?v='+version);
 html=html.replace('</head>','<meta name="football-package-build" content="'+version+'">\n</head>');
 return html;
}
function packageCheck(data,version){
 return ['التحقق من أسئلة حزمة كرة القدم المستقلة','إصدار التصدير: '+version,'نوع الحزمة: '+(data.role==='student'?'الطلاب':'المعلمة'),'اسم اللعبة: '+data.title,'المدرسة: '+data.school,'المعلمة: '+data.teacher,'المنسقة: '+data.coordinator,'الصف: '+data.classroom,'عدد الأسئلة المضمنة: '+data.questions.length,'',...data.questions.map((q,i)=>(i+1)+') '+q.text),'','هذه الأسئلة مثبتة داخل index.html و config.js في النسخة المصدرة.','فك ضغط الحزمة بالكامل ثم افتح index.html؛ لا تنقل هذا الملف وحده.'].join('\r\n');
}
let exporting=false;
async function exportPack(role){
 if(exporting)return;
 try{syncEditorToConfig();validate();save();}catch(e){alert('راجعي الأسئلة قبل التصدير: '+e.message);return;}
 exporting=true;const b1=$('exportTeacher'),b2=$('exportStudent');b1.disabled=b2.disabled=true;
 const progress=$('exportProgress');
 const version='offline-v23-'+Date.now().toString(36),
       snapshot={...clone(config),role,packageId:'football-export-'+version};
 try{
  const source=window.FOOTBALL_FILES;if(!source)throw Error('ملف الحزمة غير موجود');
  const filePaths=Object.keys(source),files=[];
  for(let i=0;i<filePaths.length;i++){
   const path=filePaths[i];progress.textContent=`جارٍ تضمين ملفات اللعبة: ${i+1} / ${filePaths.length} — ${path}`;
   let bytes=Uint8Array.from(atob(source[path]),c=>c.charCodeAt(0));
   if(path==='config.js')continue;
   if(path==='index.html'){
    const html=new TextDecoder().decode(bytes);
    bytes=new TextEncoder().encode(stampIndex(html,snapshot,version));
   }
   files.push({name:path,data:bytes});
  }
  files.push({name:'package-files.js',data:'window.FOOTBALL_FILES='+JSON.stringify(source)+';'});
  files.push({name:'runtime/games/football/offline-assets.js',data:'window.FOOTBALL_OFFLINE_ASSETS='+JSON.stringify(window.FOOTBALL_OFFLINE_ASSETS)+';'});
  files.push({name:'config.js',data:'window.FOOTBALL_PACKAGE='+JSON.stringify(snapshot,null,2)+';\n'});
  files.push({name:'تأكد_من_الأسئلة_قبل_النشر.txt',data:packageCheck(snapshot,version)});
  progress.textContent='جارٍ إعداد ملفات اللعبة والتحقق من تثبيت الأسئلة…';
  const packed=window.makeOfflineZip(files);
  emitFile(packed,`Football_${role==='teacher'?'Teacher':'Student'}_${nameSafe(config.title)}_${version}.zip`);
  progress.textContent='✓ صُدِّرت '+snapshot.questions.length+' أسئلة في نسخة '+(role==='teacher'?'المعلمة':'الطلاب')+'؛ السؤال الأول: '+snapshot.questions[0].text+' — افتحي ملف «تأكد_من_الأسئلة_قبل_النشر.txt» داخل ZIP قبل توزيعه.';
 }catch(e){console.error(e);progress.textContent='تعذر إنشاء الحزمة: '+e.message;alert(progress.textContent);}
 finally{b1.disabled=b2.disabled=false;exporting=false;}
}

function bind(){
 $('btnFullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(e){alert('لم يتمكن المتصفح من الدخول في وضع ملء الشاشة.');}};
 $('btnHome').onclick=()=>{clearInterval(timerId);playing=false;$('gameFrame').src='about:blank';show('editor');};
 $('beginStudent').onclick=()=>{player=$('playerName').value.trim();try{newSession();}catch(e){alert(e.message);}};
 $('restartGame').onclick=()=>{try{newSession();}catch(e){alert(e.message);}};
 $('backResult').onclick=()=>{$('btnHome').click();};
 $('downloadResult').onclick=()=>emitFile(new Blob([resultText()],{type:'text/plain;charset=utf-8'}),'football_result.txt');
 window.addEventListener('message',handleMessage);
 if(!isTeacher)return;
 $('gameTitle').value=config.title;$('schoolTitle').value=config.school;$('teacherName').value=config.teacher;$('coordinatorName').value=config.coordinator;$('className').value=config.classroom;$('quizTime').value=String(config.duration);$('shuffleQuestions').checked=config.shuffle;
 $('gameTitle').oninput=e=>{config.title=e.target.value;save();updateHeader();};$('schoolTitle').oninput=e=>{config.school=e.target.value;save();updateHeader();if(playing && gameReady)toGame({type:'school-football-branding-update',...brandingPayload()});};$('teacherName').oninput=e=>{config.teacher=e.target.value;save();updateHeader();if(playing && gameReady)toGame({type:'school-football-branding-update',...brandingPayload()});};$('className').oninput=e=>{config.classroom=e.target.value;save();updateHeader();if(playing && gameReady)toGame({type:'school-football-branding-update',...brandingPayload()});};
 $('coordinatorName').oninput=e=>{config.coordinator=e.target.value;save();updateHeader();};
 $('quizTime').onchange=e=>{config.duration=Number(e.target.value);save();};$('shuffleQuestions').onchange=e=>{config.shuffle=e.target.checked;save();};
 $('questionsEditor').addEventListener('input',handleEdit);$('questionsEditor').addEventListener('change',handleEdit);
 $('questionsEditor').addEventListener('click',e=>{
  const action=e.target.dataset.action;if(!action)return;
  const node=e.target.closest('.qcard');if(!node)return;
  let i=Number(node.dataset.index);
  if(action==='delete'){if(!confirm('هل تريد حذف السؤال '+(i+1)+'؟'))return;config.questions.splice(i,1);}
  else if(action==='clone'){if(config.questions.length>=100)return alert('الحد الأقصى 100 سؤال.');config.questions.splice(i+1,0,clone(config.questions[i]));}
  else if(action==='up'&&i>0)[config.questions[i-1],config.questions[i]]=[config.questions[i],config.questions[i-1]];
  else if(action==='down'&&i<config.questions.length-1)[config.questions[i+1],config.questions[i]]=[config.questions[i],config.questions[i+1]];
  save();renderEditor();
 });
 $('addQuestion').onclick=()=>{if(config.questions.length>=100)return;config.questions.push(createQuestion());renderEditor();save();const last=$('questionsEditor').lastElementChild;last?.querySelector('textarea')?.focus();last?.scrollIntoView({block:'center',behavior:'smooth'});};
 $('tryGame').onclick=()=>{syncEditorToConfig();save();player='تجربة المعلمة';try{newSession();}catch(e){alert(e.message);}};
 $('saveQuestions').onclick=()=>{syncEditorToConfig();save();emitFile(new Blob([JSON.stringify({...config,role:'teacher'},null,2)],{type:'application/json;charset=utf-8'}),nameSafe(config.title)+'_questions.json');};
 $('importQuestions').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{
  const obj=JSON.parse(await f.text()),qs=Array.isArray(obj)?obj:obj.questions;if(!Array.isArray(qs)||!qs.length)throw Error('ملف الأسئلة لا يحتوي على أسئلة صالحة.');
  const updated=normalize({...config,...(Array.isArray(obj)?{}:obj),questions:qs});for(let i=0;i<updated.questions.length;i++){const q=updated.questions[i];if(!q.text.trim()||q.options.some(x=>!x.trim()))throw Error('السؤال '+(i+1)+' غير مكتمل.');}
  if(!confirm('استبدال بنك الأسئلة الحالي بالملف المستورد؟'))return;config=updated;save();location.reload();
 }catch(err){alert('تعذر استيراد الأسئلة: '+err.message);}finally{e.target.value='';}};
 $('resetPackageQuestions').onclick=()=>{if(!confirm('سيجري استبدال جميع أسئلة لوحة المعلمة بالأسئلة المرفقة مع هذه الحزمة. هل تريد المتابعة؟'))return;config.questions=clone(CFG.questions||[]);loadedFromSaved=false;save();renderEditor();};
 $('exportTeacher').onclick=()=>exportPack('teacher');$('exportStudent').onclick=()=>exportPack('student');

 $('boards').value=config.boards.join('\n'); $('boards').oninput=()=>{syncEditorToConfig();save();};
 $('welcomeTitle').value=config.welcomeTitle; $('welcomeTitle').oninput=()=>{syncEditorToConfig();save();};
 $('welcomeText').value=config.welcomeText; $('welcomeText').oninput=()=>{syncEditorToConfig();save();};
 $('instructionText').value=config.instructionText; $('instructionText').oninput=()=>{syncEditorToConfig();save();};
 $('teamColor').value=config.teamColor; $('teamColor').oninput=()=>{syncEditorToConfig();save();};
 $('accentColor').value=config.accentColor; $('accentColor').oninput=()=>{syncEditorToConfig();save();};
 renderEditor();
}
updateHeader();show('studentStart');bind();
})();
