(function(){
 'use strict';
 var VERSION='1.1.6';
 var busy=false,batch=null,coverDocs=[],outputFolderManual=false;
 function el(id){return document.getElementById(id);}
 function status(text,error){el('status').textContent=text;el('status').className=error?'error':'';}
 function evalHost(code,cb){
  if(!window.__adobe_cep__){cb(null);return;}
  try{window.__adobe_cep__.evalScript(code,function(r){cb(r);});}catch(e){cb(null);}
 }
 function parse(raw){
  if(!raw||raw==='EvalScript error.')return null;
  var p=String(raw).split('|');
  for(var i=1;i<p.length;i++)try{p[i]=decodeURIComponent(p[i]);}catch(e){}
  return p;
 }
 function n(id){return Number(el(id).value);}
 function setBusy(on,batchMode){
  busy=on;
  var nodes=document.querySelectorAll('button,input,select');
  for(var i=0;i<nodes.length;i++){
   if(nodes[i].id==='cancelBatch')nodes[i].disabled=!(on&&batchMode);
   else nodes[i].disabled=on;
  }
  if(!on){refreshPreset();refreshCoverTargetState();}
 }
 function savePrefs(){
  var p={
   wmFile:el('wmFile').value,wmVisibleBounds:el('wmVisibleBounds').checked,wmPreset:n('wmPreset'),wmSize:n('wmSize'),wmLogoSize:n('wmLogoSize'),wmBannerSize:n('wmBannerSize'),
   wmPosition:n('wmPosition'),wmVerticalMode:n('wmVerticalMode'),wmVertical:n('wmVertical'),wmOpacity:n('wmOpacity'),wmMargin:n('wmMargin'),wmScope:n('wmScope'),wmPolicy:n('wmPolicy'),
   coverStartFile:el('coverStartFile').value,coverEndFile:el('coverEndFile').value,
   outFolder:el('outFolder').value,assignWorking:el('assignWorking').checked,overwrite:el('overwrite').checked,exportFormat:el('exportFormat').value,quality:n('quality'),convertSRGB:el('convertSRGB').checked
  };
  try{localStorage.setItem('central.producao.v11',JSON.stringify(p));}catch(e){}
 }
 function restorePrefs(){
  try{
   var raw=localStorage.getItem('central.producao.v11')||localStorage.getItem('central.producao.v1')||'null';
   var p=JSON.parse(raw);if(!p)return;
   for(var k in p)if(p.hasOwnProperty(k)&&el(k)){
    if(k==='outFolder')continue;
    if(el(k).type==='checkbox')el(k).checked=!!p[k];else el(k).value=p[k];
   }
  }catch(e){}
 }
 function showTab(which){
  var wm=which==='wm',covers=which==='covers',pages=which==='pages';
  el('watermarkView').hidden=!wm;el('coversView').hidden=!covers;el('pagesView').hidden=!pages;
  el('tabWatermark').className='tab'+(wm?' active':'');
  el('tabCovers').className='tab'+(covers?' active':'');
  el('tabPages').className='tab'+(pages?' active':'');
  if(covers)refreshCoverDocs();
 }
 function refreshPreset(){
  var p=n('wmPreset');
  if(p===0)el('wmSize').value=el('wmLogoSize').value;
  else if(p===1)el('wmSize').value=el('wmBannerSize').value;
  el('wmSize').disabled=p!==2||busy;
  savePrefs();
 }
 function refreshVertical(){el('wmVerticalCustomWrap').style.display=n('wmVerticalMode')===3?'flex':'none';savePrefs();}
 function refreshFormat(preserve){
  var f=el('exportFormat').value,q=el('quality'),lab=el('qualityLabel');
  if(f==='jpg'){lab.firstChild.nodeValue='Qualidade (0–12)';q.min=0;q.max=12;if(Number(q.value)>12)q.value=10;}
  else if(f==='png'){lab.firstChild.nodeValue='Compressão (0–9)';q.min=0;q.max=9;if(Number(q.value)>9)q.value=6;}
  else{lab.firstChild.nodeValue='Qualidade (0–100)';q.min=0;q.max=100;if(preserve!==true&&Number(q.value)<=12)q.value=85;}
  savePrefs();
 }
 function choose(kind,target){
  if(busy)return;
  var fn=kind==='watermark'?'chooseWatermarkFile':kind==='folder'?'chooseOutputFolder':'chooseCoverFile';
  evalHost('$.global.ProductionCEP.'+fn+'()',function(raw){
   var p=parse(raw);if(!p||p[1]!=='OK'){status(p&&p[2]?p[2]:'Seleção cancelada.',!!(p&&p[1]==='ERR'));return;}
   if(kind==='watermark')el('wmFile').value=p[2];
   else if(kind==='folder'){el('outFolder').value=p[2];outputFolderManual=true;}
   else el(target).value=p[2];
   savePrefs();status('Seleção atualizada.');
  });
 }
 function refreshDefaultOutputFolder(force){
  if(busy||outputFolderManual&&!force)return;
  evalHost('$.global.ProductionCEP.defaultOutputFolder()',function(raw){
   var p=parse(raw);
   if(!p||p[0]!=='FOLDER'||p[1]!=='OK'||!p[2])return;
   if(!outputFolderManual||force){el('outFolder').value=p[2];savePrefs();}
  });
 }
 function watermarkConfig(){
  var vm=n('wmVerticalMode'),v=vm===0?0:vm===1?50:vm===2?100:n('wmVertical');
  return {file:el('wmFile').value,size:n('wmSize'),preset:n('wmPreset'),logoSize:n('wmLogoSize'),bannerSize:n('wmBannerSize'),opacity:n('wmOpacity'),margin:n('wmMargin'),vertical:v,position:n('wmPosition'),scope:n('wmScope'),policy:n('wmPolicy'),visibleBounds:el('wmVisibleBounds').checked?1:0};
 }
 function pageConfig(action){return {folder:el('outFolder').value,overwrite:el('overwrite').checked,assignWorking:el('assignWorking').checked,format:el('exportFormat').value,quality:n('quality'),srgb:el('convertSRGB').checked,action:action};}
 function validWatermark(c){
  return c.file&&isFinite(c.size)&&c.size>=0.1&&c.size<=100&&isFinite(c.logoSize)&&c.logoSize>=0.1&&c.logoSize<=100&&isFinite(c.bannerSize)&&c.bannerSize>=0.1&&c.bannerSize<=100&&isFinite(c.opacity)&&c.opacity>=0&&c.opacity<=100&&isFinite(c.margin)&&c.margin>=0&&c.margin<=10000&&isFinite(c.vertical)&&c.vertical>=0&&c.vertical<=100;
 }
 function validPages(c){
  if(c.action==='duplicate'||c.action==='merge')return true;
  if(!c.folder)return false;
  if(c.action==='psd')return true;
  var max=c.format==='jpg'?12:c.format==='png'?9:100;
  return isFinite(c.quality)&&c.quality>=0&&c.quality<=max&&Math.floor(c.quality)===c.quality;
 }
 function refreshCoverTargetState(){
  var have=coverDocs.length>0;
  el('coverStartTarget').disabled=busy||!have;el('coverEndTarget').disabled=busy||!have;
 }
 function fillCoverSelect(node,selectedId,defaultIndex){
  while(node.options.length)node.remove(0);
  for(var i=0;i<coverDocs.length;i++){
   var o=document.createElement('option');o.value=String(coverDocs[i].id);o.textContent=(i+1)+'. '+coverDocs[i].name;node.appendChild(o);
  }
  var found=false;
  if(selectedId!==null&&selectedId!==undefined){for(i=0;i<node.options.length;i++)if(node.options[i].value===String(selectedId)){node.selectedIndex=i;found=true;break;}}
  if(!found&&node.options.length)node.selectedIndex=Math.max(0,Math.min(defaultIndex,node.options.length-1));
 }
 function refreshCoverDocs(){
  if(busy)return;
  var oldStart=el('coverStartTarget').value||null,oldEnd=el('coverEndTarget').value||null;
  evalHost('$.global.ProductionCEP.listDocuments()',function(raw){
   var p=parse(raw);if(!p||p[0]!=='DOCS'||p[1]!=='OK'){coverDocs=[];fillCoverSelect(el('coverStartTarget'),null,0);fillCoverSelect(el('coverEndTarget'),null,0);refreshCoverTargetState();status(p&&p[2]?p[2]:'Não foi possível listar as páginas.',true);return;}
   coverDocs=[];var count=Number(p[2])||0;
   for(var i=0;i<count;i++)coverDocs.push({id:Number(p[3+i*2]),name:p[4+i*2]||('Página '+(i+1))});
   fillCoverSelect(el('coverStartTarget'),oldStart,0);fillCoverSelect(el('coverEndTarget'),oldEnd,Math.max(0,coverDocs.length-1));refreshCoverTargetState();
   status(coverDocs.length?coverDocs.length+' página(s) aberta(s).':'Abra pelo menos uma página no Photoshop.',!coverDocs.length);
  });
 }
 function coverConfig(){
  return {startFile:el('coverStartFile').value,endFile:el('coverEndFile').value,startId:Number(el('coverStartTarget').value),endId:Number(el('coverEndTarget').value)};
 }
 function applyCovers(){
  if(busy)return;
  var c=coverConfig();
  if(!c.startFile&&!c.endFile){status('Selecione pelo menos uma capa.',true);return;}
  if(!coverDocs.length){status('Atualize a lista de páginas abertas.',true);return;}
  if(c.startFile&&!c.startId||c.endFile&&!c.endId){status('Confira a página de destino das capas.',true);return;}
  savePrefs();setBusy(true,false);status('Adicionando capas…');
  evalHost('$.global.ProductionCEP.applyCovers('+JSON.stringify(c)+')',function(raw){
   var p=parse(raw);setBusy(false,false);
   if(!p||p[0]!=='COVERS'||p[1]!=='OK'){status(p&&p[2]?p[2]:'Não foi possível adicionar as capas.',true);return;}
   el('report').value=p[3]||('Capas adicionadas em '+p[2]+' página(s).');el('reportPanel').hidden=false;status('Capas adicionadas.');refreshCoverDocs();
  });
 }
 function beginBatch(mode,action,config){
  if(busy)return;
  if(mode==='wm'&&action==='apply'&&!validWatermark(config)){status('Confira arquivo, tamanho, opacidade, margem e posição.',true);return;}
  if(mode==='pages'&&!validPages(config)){status('Escolha a pasta e confira as opções de saída.',true);return;}
  savePrefs();setBusy(true,true);el('progressPanel').hidden=false;el('reportPanel').hidden=true;el('progressBar').value=0;el('progressPercent').textContent='0%';el('progressCurrent').textContent='Preparando…';
  batch={mode:mode,action:action,token:null,total:0,done:0,cancel:false,lines:[]};
  var fn=mode==='wm'?'startWatermark':'startPages';
  evalHost('$.global.ProductionCEP.'+fn+'('+JSON.stringify(action)+','+JSON.stringify(config)+')',function(raw){
   var p=parse(raw);if(!p||p[0]!=='START'||p[1]!=='OK'){endBatchError(p&&p[2]?p[2]:'Não foi possível iniciar.');return;}
   batch.total=Number(p[2])||0;batch.token=p[3];
   if(p[4]==='CONFIRM_OVERWRITE'){
    var count=Number(p[5])||0;
    if(!window.confirm('Substituir '+count+' arquivo(s) existente(s) na pasta escolhida?')){finishBatch(true,'Operação cancelada antes do processamento.');return;}
   }
   el('progressTitle').textContent=mode==='wm'?(action==='remove'?'Removendo marcas':'Aplicando marcas'):(action==='duplicate'?'Duplicando imagens':action==='merge'?'Criando redraw':action==='psd'?'Salvando PSDs':'Exportando páginas');
   processNext();
  });
 }
 function processNext(){
  if(!batch)return;
  if(batch.cancel){finishBatch(true,'Cancelado após a última página concluída.');return;}
  var fn=batch.mode==='wm'?'watermarkNext':'pagesNext';
  evalHost('$.global.ProductionCEP.'+fn+'('+JSON.stringify(batch.token)+','+batch.done+')',function(raw){
   var p=parse(raw);if(!p||p[0]!=='NEXT'){endBatchError('Resposta inválida do Photoshop.');return;}
   if(p[1]==='DONE'){finishBatch(false);return;}
   if(p[1]==='FATAL'){endBatchError(p[2]||'Lote interrompido.');return;}
   var state=p[1],done=Number(p[2])||0,total=Number(p[3])||batch.total,name=p[4]||'Documento',msg=p[5]||'';
   batch.done=done;batch.total=total;batch.lines.push(name+': '+(state==='OK'?'OK':state==='SKIP'?'PULADO':'ERRO')+(msg?' — '+msg:''));
   var pct=total?Math.round(done*100/total):100;el('progressBar').value=pct;el('progressPercent').textContent=pct+'%';el('progressCurrent').textContent=done+' / '+total+' — '+name+(msg?' — '+msg:'');
   if(done>=total){finishBatch(false);return;}setTimeout(processNext,20);
  });
 }
 function finishBatch(cancelled,message){
  if(!batch)return;
  var snapshot=batch;
  evalHost('$.global.ProductionCEP.finishBatch('+JSON.stringify(snapshot.token)+')',function(raw){
   var p=parse(raw);var restored=p&&p[0]==='FINISH'&&p[1]==='OK'&&Number(p[2])===1;
   if(message)snapshot.lines.push(message);snapshot.lines.push(restored?'Página original restaurada.':'Não foi possível confirmar a restauração da página original.');
   el('report').value=snapshot.lines.join('\n');el('reportPanel').hidden=false;el('progressPanel').hidden=true;batch=null;setBusy(false,false);
   var failures=snapshot.lines.filter(function(line){return line.indexOf(': ERRO')>=0;}).length;
   status(cancelled?'Operação cancelada.':failures?'Lote concluído com '+failures+' erro(s). Confira o relatório.':'Operação concluída.',!!failures);
  });
 }
 function endBatchError(message){
  var snapshot=batch;
  function done(){
   if(snapshot){snapshot.lines.push('ERRO: '+message);el('report').value=snapshot.lines.join('\n');el('reportPanel').hidden=false;}
   batch=null;setBusy(false,false);el('progressPanel').hidden=true;status(message,true);
  }
  // Keep controls disabled until Photoshop finishes restoring the old job.
  if(snapshot&&snapshot.token)evalHost('$.global.ProductionCEP.finishBatch('+JSON.stringify(snapshot.token)+')',done);
  else done();
 }
 function cancelBatch(){if(batch){batch.cancel=true;el('cancelBatch').disabled=true;el('progressCurrent').textContent='Cancelamento solicitado. A página atual será concluída.';}}

 restorePrefs();showTab('wm');refreshPreset();refreshVertical();refreshFormat(true);refreshCoverTargetState();
 el('tabWatermark').onclick=function(){if(!busy)showTab('wm');};el('tabCovers').onclick=function(){if(!busy)showTab('covers');};el('tabPages').onclick=function(){if(!busy){showTab('pages');refreshDefaultOutputFolder(false);}};
 el('chooseWatermark').onclick=function(){choose('watermark');};el('chooseFolder').onclick=function(){choose('folder');};
 el('chooseCoverStart').onclick=function(){choose('cover','coverStartFile');};el('chooseCoverEnd').onclick=function(){choose('cover','coverEndFile');};
 el('clearCoverStart').onclick=function(){el('coverStartFile').value='';savePrefs();};el('clearCoverEnd').onclick=function(){el('coverEndFile').value='';savePrefs();};el('refreshCoverDocs').onclick=refreshCoverDocs;el('applyCovers').onclick=applyCovers;
 el('wmPreset').onchange=refreshPreset;el('wmLogoSize').onchange=function(){if(n('wmPreset')===0)refreshPreset();else savePrefs();};el('wmBannerSize').onchange=function(){if(n('wmPreset')===1)refreshPreset();else savePrefs();};el('wmVerticalMode').onchange=refreshVertical;el('exportFormat').onchange=refreshFormat;
 var inputs=document.querySelectorAll('input,select');for(var i=0;i<inputs.length;i++)inputs[i].addEventListener('change',savePrefs);

 // Mouse wheel changes the hovered numeric field without moving focus.
 var numericFields=document.querySelectorAll('input[type="number"]');
 for(var wheelIndex=0;wheelIndex<numericFields.length;wheelIndex++)numericFields[wheelIndex].addEventListener('wheel',function(event){
  if(busy||this.disabled||this.readOnly||event.ctrlKey||event.metaKey||!event.deltaY)return;
  event.preventDefault();event.stopPropagation();
  var value=this.value===''?Number(this.defaultValue):Number(this.value);
  if(!isFinite(value))value=0;
  var step=Number(this.getAttribute('step'));if(!isFinite(step)||step<=0)step=1;
  var next=value+(event.deltaY<0?step:-step);
  var min=this.getAttribute('min'),max=this.getAttribute('max');
  if(min!==null&&min!==''&&isFinite(Number(min)))next=Math.max(Number(min),next);
  if(max!==null&&max!==''&&isFinite(Number(max)))next=Math.min(Number(max),next);
  next=Math.round(next*1000000)/1000000;
  if(this.value!==''&&next===value)return;
  this.value=String(next);
  var inputEvent=document.createEvent('Event');inputEvent.initEvent('input',true,false);this.dispatchEvent(inputEvent);
  var changeEvent=document.createEvent('Event');changeEvent.initEvent('change',true,false);this.dispatchEvent(changeEvent);
 },{passive:false});
 el('applyWatermark').onclick=function(){beginBatch('wm','apply',watermarkConfig());};
 el('removeWatermark').onclick=function(){if(window.confirm('Remover os grupos de marca criados por esta ferramenta no escopo selecionado?'))beginBatch('wm','remove',watermarkConfig());};
 el('duplicateImages').onclick=function(){beginBatch('pages','duplicate',pageConfig('duplicate'));};
 el('mergeRedraw').onclick=function(){if(window.confirm('Mesclar as camadas desbloqueadas de todas as páginas abertas em uma camada chamada "redraw"? Camadas bloqueadas serão preservadas separadamente.'))beginBatch('pages','merge',pageConfig('merge'));};
 el('savePSD').onclick=function(){beginBatch('pages','psd',pageConfig('psd'));};
 el('exportPages').onclick=function(){beginBatch('pages','export',pageConfig('export'));};
 el('cancelBatch').onclick=cancelBatch;el('clearReport').onclick=function(){el('report').value='';el('reportPanel').hidden=true;};el('cancelBatch').disabled=true;
 if(window.__adobe_cep__){evalHost('typeof $.global.ProductionCEP!=="undefined" && $.global.ProductionCEP.version==="'+VERSION+'" ? "ready" : "missing"',function(r){status(r==='ready'?'Pronto.':'Reinicie o Photoshop após instalar/atualizar.',r!=='ready');if(r==='ready'){refreshCoverDocs();refreshDefaultOutputFolder(false);}});}else status('Abra pelo menu Extensões do Photoshop.',true);
}());
