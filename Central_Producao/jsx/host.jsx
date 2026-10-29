/* Central de Produção CEP 1.1.6 — Photoshop 2019+ */
$.global.ProductionCEP = (function(){
    var api={};
    api.version='1.1.6';
    api.batch=null;

    var WM_GROUP="Marca d'água [MD2]";
    var WM_OLD_GROUP='marca';

    function enc(v){try{return encodeURIComponent(String(v));}catch(e){return String(v).replace(/\|/g,'/');}}
    function packet(type,values){var a=[type];for(var i=0;i<values.length;i++)a.push(enc(values[i]));return a.join('|');}
    function documentId(){
        var ref=new ActionReference();
        ref.putProperty(stringIDToTypeID('property'),stringIDToTypeID('documentID'));
        ref.putEnumerated(charIDToTypeID('Dcmn'),charIDToTypeID('Ordn'),charIDToTypeID('Trgt'));
        var d=executeActionGet(ref),k=stringIDToTypeID('documentID');
        if(!d.hasKey(k))throw Error('O Photoshop não informou o ID do documento atual.');
        return d.getInteger(k);
    }
    function selectDocument(id){
        var ref=new ActionReference();ref.putIdentifier(charIDToTypeID('Dcmn'),id);
        var d=new ActionDescriptor();d.putReference(charIDToTypeID('null'),ref);
        executeAction(charIDToTypeID('slct'),d,DialogModes.NO);
    }
    function documentsSnapshot(){
        var out=[];for(var i=0;i<app.documents.length;i++){app.activeDocument=app.documents[i];out.push({id:documentId(),name:app.activeDocument.name});}return out;
    }
    function restoreOriginal(){
        var restored=0;
        try{if(api.batch&&api.batch.originalId!==null){selectDocument(api.batch.originalId);restored=1;}}catch(e){}
        return restored;
    }
    function fileExists(path){try{return path&&File(path).exists;}catch(e){return false;}}
    function folderExists(path){try{return path&&Folder(path).exists;}catch(e){return false;}}

    api.chooseWatermarkFile=function(){
        try{
            var f=File.openDialog('Escolha a marca d\'água');
            if(!f)return packet('FILE',['CANCEL','Seleção cancelada.']);
            return packet('FILE',['OK',f.fsName,f.name]);
        }catch(e){return packet('FILE',['ERR',e.message||String(e)]);}
    };
    api.defaultOutputFolder=function(){
        try{
            if(!app.documents.length)return packet('FOLDER',['ERR','Abra pelo menos uma página.']);
            var active=app.activeDocument;
            try{
                var current=active.fullName.parent;
                if(current&&current.exists)return packet('FOLDER',['OK',current.fsName]);
            }catch(activeUnsaved){}
            for(var i=0;i<app.documents.length;i++){
                try{
                    var folder=app.documents[i].fullName.parent;
                    if(folder&&folder.exists)return packet('FOLDER',['OK',folder.fsName]);
                }catch(unsaved){}
            }
            return packet('FOLDER',['ERR','As páginas abertas ainda não possuem uma pasta de origem. Escolha a pasta manualmente.']);
        }catch(e){return packet('FOLDER',['ERR',e.message||String(e)]);}
    };
    api.chooseOutputFolder=function(){
        try{
            var f=Folder.selectDialog('Escolha a pasta de destino');
            if(!f)return packet('FOLDER',['CANCEL','Seleção cancelada.']);
            return packet('FOLDER',['OK',f.fsName]);
        }catch(e){return packet('FOLDER',['ERR',e.message||String(e)]);}
    };

    api.chooseCoverFile=function(){
        try{
            var f=File.openDialog('Escolha a capa','Imagens:*.jpg;*.jpeg;*.png;*.tif;*.tiff;*.psd;*.psb;*.bmp');
            if(!f)return packet('FILE',['CANCEL','Seleção cancelada.']);
            return packet('FILE',['OK',f.fsName,f.name]);
        }catch(e){return packet('FILE',['ERR',e.message||String(e)]);}
    };
    api.listDocuments=function(){
        var originalId=null;
        try{
            if(!app.documents.length)return packet('DOCS',['OK',0]);
            originalId=documentId();
            var docs=documentsSnapshot(),values=['OK',docs.length];
            for(var i=0;i<docs.length;i++){values.push(docs[i].id);values.push(docs[i].name);}
            selectDocument(originalId);
            return packet('DOCS',values);
        }catch(e){try{if(originalId!==null)selectDocument(originalId);}catch(ignore){}return packet('DOCS',['ERR',e.message||String(e)]);}
    };

    function wmGroupMatches(name){var n=String(name).toLowerCase();return n===WM_GROUP.toLowerCase()||n===WM_OLD_GROUP.toLowerCase();}
    function wmExisting(doc){var a=[];for(var i=0;i<doc.layerSets.length;i++)if(wmGroupMatches(doc.layerSets[i].name))a.push(doc.layerSets[i]);return a;}
    function wmLocked(group){
        if(group.allLocked)return true;
        for(var i=0;i<group.layers.length;i++){
            var l=group.layers[i];if(l.allLocked)return true;if(l.typename==='LayerSet'&&wmLocked(l))return true;
        }
        return false;
    }
    function layerBounds(layer){var b=layer.bounds;return[b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')];}
    function visibleLayerBounds(doc,layer,useVisible){
        if(!useVisible)return layerBounds(layer);
        // A posição solicitada é relativa à arte, não à tela transparente
        // do objeto inteligente. Falhar explicitamente é mais seguro que
        // usar silenciosamente o retângulo completo e deslocar o logo.
        try{
            doc.activeLayer=layer;
            var sd=new ActionDescriptor(),sr=new ActionReference();
            sr.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));sd.putReference(charIDToTypeID('null'),sr);
            var tr=new ActionReference();tr.putEnumerated(charIDToTypeID('Chnl'),charIDToTypeID('Chnl'),charIDToTypeID('Trsp'));sd.putReference(charIDToTypeID('T   '),tr);
            executeAction(charIDToTypeID('setd'),sd,DialogModes.NO);
            var sb=doc.selection.bounds;
            var out=[sb[0].as('px'),sb[1].as('px'),sb[2].as('px'),sb[3].as('px')];
            if(!isFinite(out[0])||!isFinite(out[1])||!isFinite(out[2])||!isFinite(out[3])||out[2]<=out[0]||out[3]<=out[1])
                throw Error('Os pixels visíveis da marca não puderam ser medidos.');
            return out;
        }catch(e){
            throw Error('Não foi possível medir os pixels visíveis da marca: '+(e.message||String(e))+'. Verifique o arquivo ou desative "Ignorar margens transparentes".');
        }finally{
            try{doc.selection.deselect();}catch(ignore){}
        }
    }
    function wmMoveTo(doc,layer,useVisible,x,y){
        // O Photoshop pode recalcular os bounds de um Smart Object ao ser
        // escalado/movido. Releia a posição real depois de cada movimento.
        var tolerance=1.5,b=null,dx=0,dy=0;
        for(var attempt=0;attempt<4;attempt++){
            b=visibleLayerBounds(doc,layer,useVisible);
            dx=x-b[0];dy=y-b[1];
            if(Math.abs(dx)<=tolerance&&Math.abs(dy)<=tolerance)return b;
            layer.translate(UnitValue(dx,'px'),UnitValue(dy,'px'));
        }
        b=visibleLayerBounds(doc,layer,useVisible);
        dx=x-b[0];dy=y-b[1];
        if(Math.abs(dx)>tolerance||Math.abs(dy)>tolerance)
            throw Error('O Photoshop não confirmou a posição da marca. Esperado: x='+Math.round(x)+', y='+Math.round(y)+
                ' px; obtido: x='+Math.round(b[0])+', y='+Math.round(b[1])+' px. A página será restaurada.');
        return b;
    }
    function validateWm(c){
        if(!c||!fileExists(c.file))throw Error('Escolha um arquivo de marca existente.');
        if(!isFinite(c.size)||c.size<0.1||c.size>100)throw Error('Tamanho: use 0,1 a 100%.');
        if(!isFinite(c.opacity)||c.opacity<0||c.opacity>100)throw Error('Opacidade: use 0 a 100%.');
        if(!isFinite(c.margin)||c.margin<0||c.margin>10000)throw Error('Margem inválida.');
        if(!isFinite(c.vertical)||c.vertical<0||c.vertical>100)throw Error('Posição vertical inválida.');
        var names=['position','scope','policy'],limits=[3,1,2];
        for(var i=0;i<names.length;i++){var value=c[names[i]];if(typeof value!=='number'||!isFinite(value)||Math.floor(value)!==value||value<0||value>limits[i])throw Error('Configuração de marca inválida: '+names[i]);}
    }
    function wmCheckPosition(doc,layer,side,cfg){
        app.activeDocument=doc;doc.activeLayer=layer;
        if(layer.grouped)coverReleaseClipping(doc,layer);
        var width=doc.width.as('px'),height=doc.height.as('px'),m=cfg.margin,tolerance=1.5;
        for(var attempt=0;attempt<4;attempt++){
            var b=visibleLayerBounds(doc,layer,cfg.visibleBounds!==0),w=b[2]-b[0],h=b[3]-b[1];
            if(!isFinite(w)||!isFinite(h)||w<=0||h<=0||w>width-2*m+tolerance||h>height-2*m+tolerance)
                throw Error('Dimensoes finais da marca fora da area disponivel. Confira tamanho e margem.');
            var x=side===0?m:side===1?(width-w)/2:width-m-w;
            var y=m+(height-2*m-h)*cfg.vertical/100;
            if(Math.abs(b[0]-x)<=tolerance&&Math.abs(b[1]-y)<=tolerance)return;
            if(attempt===3)throw Error('Alinhamento '+(side===0?'esquerdo':side===1?'central':'direito')+' nao confirmado: esperado x='+Math.round(x)+', obtido x='+Math.round(b[0])+' px.');
            layer.translate(UnitValue(x-b[0],'px'),UnitValue(y-b[1],'px'));
        }
    }
    function wmPlace(doc,group,side,cfg){
        app.activeDocument=doc;doc.activeLayer=group;
        if(side!==0&&side!==1&&side!==2)throw Error('Alinhamento horizontal invalido.');
        var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),File(cfg.file));d.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));
        executeAction(charIDToTypeID('Plc '),d,DialogModes.NO);
        var layer=doc.activeLayer;
        if(layer.typename!=='ArtLayer'||layer.kind!==LayerKind.SMARTOBJECT)throw Error('O Photoshop não criou o objeto inteligente esperado.');
        layer.move(group,ElementPlacement.INSIDE);if(layer.grouped)coverReleaseClipping(doc,layer);
        // Use pixel bounds like the original logo script, not the Smart Object canvas.
        // Only the newly placed instance is rasterized; the source file is untouched.
        doc.activeLayer=layer;layer.rasterize(RasterizeType.ENTIRELAYER);layer=doc.activeLayer;
        if(layer.kind!==LayerKind.NORMAL)throw Error('Nao foi possivel preparar os pixels da marca.');
        layer.visible=true;layer.blendMode=BlendMode.NORMAL;layer.fillOpacity=100;layer.opacity=100;layer.name='Marca — '+(side===0?'esquerda':side===1?'centro':'direita');
        var vb=visibleLayerBounds(doc,layer,cfg.visibleBounds!==0),vw=vb[2]-vb[0],vh=vb[3]-vb[1];
        if(vw<=0||vh<=0)throw Error('A marca está vazia ou sem pixels visíveis.');
        var width=doc.width.as('px'),height=doc.height.as('px'),m=cfg.margin;
        if(width<=2*m||height<=2*m)throw Error('A margem é grande demais para esta página.');
        var availableWidth=width-2*m;if(cfg.position===3)availableWidth=(availableWidth-Math.min(m,availableWidth*0.1))/2;
        var targetVisibleWidth=availableWidth*cfg.size/100;
        var factor=Math.min(targetVisibleWidth/vw,availableWidth/vw,(height-2*m)/vh);
        if(!isFinite(factor)||factor<=0)throw Error('Não foi possível calcular a escala da marca.');
        layer.resize(factor*100,factor*100,AnchorPosition.MIDDLECENTER);
        vb=visibleLayerBounds(doc,layer,cfg.visibleBounds!==0);vw=vb[2]-vb[0];vh=vb[3]-vb[1];
        var x=side===0?m:side===1?(width-vw)/2:width-m-vw;
        var y=m+Math.max(0,height-2*m-vh)*cfg.vertical/100;
        wmMoveTo(doc,layer,cfg.visibleBounds!==0,x,y);
        wmCheckPosition(doc,layer,side,cfg);return {layer:layer,side:side};
    }
    function wmRemove(doc){
        var history=doc.activeHistoryState,removed=0;
        try{
            for(var i=doc.layerSets.length-1;i>=0;i--)if(wmGroupMatches(doc.layerSets[i].name)){doc.layerSets[i].remove();removed++;}
            return removed;
        }catch(e){
            try{doc.activeHistoryState=history;}catch(ignore){}
            throw e;
        }
    }
    function wmApply(doc,cfg){
        var source=false;try{source=doc.fullName.fsName===File(cfg.file).fsName;}catch(e){}
        if(source)return {state:'SKIP',message:'Arquivo-fonte da marca; página ignorada.'};
        var old=wmExisting(doc);
        if(old.length&&cfg.policy===0)return {state:'SKIP',message:'Já existe grupo de marca.'};
        if(cfg.policy===1)for(var j=0;j<old.length;j++)if(wmLocked(old[j]))throw Error('O grupo de marcas está bloqueado. Desbloqueie-o antes de substituir.');
        var history=doc.activeHistoryState,previous=doc.activeLayer,origin=doc.rulerOrigin;
        var oldRulerUnits=app.preferences.rulerUnits;
        try{
            // O script de marca original fixa pixels explicitamente. Sem isso,
            // a posição pode depender das preferências das réguas do usuário.
            app.preferences.rulerUnits=Units.PIXELS;
            doc.rulerOrigin=[0,0];
            var group=doc.layerSets.add();group.name=WM_GROUP;if(doc.layers[0]!==group)group.move(doc.layers[0],ElementPlacement.PLACEBEFORE);group.visible=true;group.opacity=100;
            var placed=[];
            if(cfg.position===3){placed.push(wmPlace(doc,group,0,cfg));placed.push(wmPlace(doc,group,2,cfg));}else placed.push(wmPlace(doc,group,cfg.position,cfg));
            if(cfg.policy===1)for(j=old.length-1;j>=0;j--)old[j].remove();
            // Recheck both marks after all insertion/replacement operations.
            for(var v=0;v<placed.length;v++){wmCheckPosition(doc,placed[v].layer,placed[v].side,cfg);placed[v].layer.opacity=cfg.opacity;}
            doc.activeLayer=group;return {state:'OK',message:'Marca aplicada; alinhamento conferido.'};
        }catch(e){
            try{doc.activeHistoryState=history;if(previous)doc.activeLayer=previous;}catch(rb){}
            throw e;
        }finally{
            try{doc.rulerOrigin=origin;}catch(ignoreOrigin){}
            try{app.preferences.rulerUnits=oldRulerUnits;}catch(ignoreUnits){}
        }
    }

    api.startWatermark=function(action,cfg){
        var originalId=null;
        try{
            if(!app.documents.length)throw Error('Abra pelo menos uma página.');
            if(action!=='apply'&&action!=='remove')throw Error('Ação de marca desconhecida.');
            if(action==='apply')validateWm(cfg);
            originalId=documentId();
            var docs=documentsSnapshot(),entries=[],i;
            if(Number(cfg.scope)===1){for(i=0;i<docs.length;i++)if(docs[i].id===originalId){entries=[docs[i]];break;}}
            else entries=docs;
            selectDocument(originalId);
            api.batch={mode:'wm',action:action,config:cfg,entries:entries,index:0,originalId:originalId,token:String(new Date().getTime())+'-'+Math.random()};
            return packet('START',['OK',entries.length,api.batch.token]);
        }catch(e){try{if(originalId!==null)selectDocument(originalId);}catch(ignore){}api.batch=null;return packet('START',['ERR',e.message||String(e)]);}
    };
    api.watermarkNext=function(token,expected){
        var b=api.batch;if(!b||b.mode!=='wm')return packet('NEXT',['FATAL','Nenhum lote de marca ativo.']);
        if(token!==b.token||Number(expected)!==b.index)return packet('NEXT',['FATAL','O lote mudou. Reinicie a operação.']);
        if(b.index>=b.entries.length)return packet('NEXT',['DONE']);
        var entry=b.entries[b.index],done=b.index+1;b.index++;
        var state='OK',message='';
        try{
            selectDocument(entry.id);var doc=app.activeDocument;
            if(b.action==='remove'){var r=wmRemove(doc);state=r?'OK':'SKIP';message=r?'Grupos removidos: '+r+'.':'Nenhum grupo de marca encontrado.';}
            else{var result=wmApply(doc,b.config);state=result.state;message=result.message;}
        }catch(e){state='ERROR';message=e.message||String(e);}
        return packet('NEXT',[state,done,b.entries.length,entry.name,message]);
    };

    function coverPx(v){return v.as('px');}
    function validateCoverPage(doc){
        if(doc.mode!==DocumentMode.RGB||(doc.bitsPerChannel!==BitsPerChannelType.EIGHT&&doc.bitsPerChannel!==BitsPerChannelType.SIXTEEN))throw Error('A página "'+doc.name+'" precisa estar em RGB de 8 ou 16 bits.');
    }
    function coverOpen(file,temps){
        if(!file.exists)throw Error('Arquivo da capa não encontrado: '+file.fsName);
        var src=null,owned=false,tmp=null;
        for(var i=0;i<app.documents.length;i++){
            try{if(app.documents[i].fullName.fsName===file.fsName){src=app.documents[i];break;}}catch(ignore){}
        }
        try{
            if(!src){src=app.open(file);owned=true;}
            app.activeDocument=src;tmp=src.duplicate('__Capa_Scan_temporaria__');temps.push(tmp);return tmp;
        }finally{
            if(owned&&src){app.activeDocument=src;src.close(SaveOptions.DONOTSAVECHANGES);}
            if(tmp)app.activeDocument=tmp;
        }
    }
    function coverPrepare(file,target,name,temps){
        app.activeDocument=target;validateCoverPage(target);
        var targetWidth=Math.round(coverPx(target.width)),targetResolution=target.resolution,targetBits=target.bitsPerChannel;
        var targetProfile=target.colorProfileType===ColorProfile.NONE?null:target.colorProfileName;
        var tmp=coverOpen(file,temps);app.activeDocument=tmp;tmp.rulerOrigin=[0,0];tmp.flatten();
        if(tmp.mode!==DocumentMode.RGB)tmp.changeMode(ChangeMode.RGB);
        if(tmp.bitsPerChannel!==targetBits)tmp.bitsPerChannel=targetBits;
        if(tmp.colorProfileType===ColorProfile.NONE)tmp.colorProfileType=ColorProfile.WORKING;
        if(targetProfile&&tmp.colorProfileName!==targetProfile)tmp.convertProfile(targetProfile,Intent.RELATIVECOLORIMETRIC,true,false);
        var width=targetWidth,height=Math.max(1,Math.round(coverPx(tmp.height)*width/coverPx(tmp.width)));
        if(height>300000)throw Error('A capa ajustada ultrapassa o limite de altura do Photoshop.');
        tmp.resizeImage(UnitValue(width,'px'),UnitValue(height,'px'),targetResolution,ResampleMethod.BICUBIC);
        return {doc:tmp,height:height,name:name};
    }
    function coverImageBase(doc){
        function search(container){
            for(var i=container.layers.length-1;i>=0;i--){
                var l=container.layers[i];
                if(!l.visible||l.allLocked)continue;
                if(l.typename==='LayerSet'){var found=search(l);if(found)return found;}
                else if(l.kind===LayerKind.NORMAL&&!l.isBackgroundLayer&&!l.pixelsLocked&&!l.positionLocked&&!l.transparentPixelsLocked&&!l.grouped)return l;
            }
            return null;
        }
        var base=search(doc);
        if(!base)throw Error('Não encontrei a cópia de imagem desbloqueada em "'+doc.name+'". Duplique a imagem original primeiro.');
        return base;
    }
    function coverReleaseClipping(doc,layer){
        app.activeDocument=doc;doc.activeLayer=layer;layer.grouped=false;
        var key=stringIDToTypeID('group');
        function clipped(){
            var ref=new ActionReference();ref.putProperty(stringIDToTypeID('property'),key);ref.putIdentifier(stringIDToTypeID('layer'),layer.id);
            var desc=executeActionGet(ref);return desc.hasKey(key)?desc.getBoolean(key):layer.grouped;
        }
        if(clipped())executeAction(stringIDToTypeID('ungroupEvent'),new ActionDescriptor(),DialogModes.NO);
        if(clipped())throw Error('A capa continuou vinculada como máscara de corte.');
    }
    function coverInsert(job,cover,top,origins){
        if(!cover)return;
        var doc=job.doc;app.activeDocument=doc;doc.activeLayer=job.base;
        var seen=false;
        for(var i=0;i<origins.length;i++)if(origins[i].doc===doc){seen=true;break;}
        if(!seen){origins.push({doc:doc,value:doc.rulerOrigin});doc.rulerOrigin=[0,0];}
        var width=coverPx(doc.width),oldHeight=coverPx(doc.height);
        doc.resizeCanvas(UnitValue(width,'px'),UnitValue(oldHeight+cover.height,'px'),top?AnchorPosition.BOTTOMCENTER:AnchorPosition.TOPCENTER);
        var topLayer=job.base;while(topLayer.parent.typename!=='Document')topLayer=topLayer.parent;
        app.activeDocument=cover.doc;
        var layer=cover.doc.activeLayer.duplicate(doc,ElementPlacement.PLACEATBEGINNING);
        app.activeDocument=doc;doc.activeLayer=layer;layer.allLocked=false;layer.name=cover.name;
        layer.move(topLayer,ElementPlacement.PLACEBEFORE);layer.visible=true;layer.grouped=false;layer.opacity=100;layer.fillOpacity=100;layer.blendMode=BlendMode.NORMAL;
        var bounds=layer.bounds;layer.translate(UnitValue(-coverPx(bounds[0]),'px'),UnitValue((top?0:oldHeight)-coverPx(bounds[1]),'px'));
        bounds=layer.bounds;
        if(Math.abs(coverPx(bounds[0]))>1||Math.abs(coverPx(bounds[1])-(top?0:oldHeight))>1||Math.abs(coverPx(bounds[2])-coverPx(bounds[0])-width)>1||Math.abs(coverPx(bounds[3])-coverPx(bounds[1])-cover.height)>1)throw Error('A capa não ficou com a posição e as dimensões esperadas.');
        coverReleaseClipping(doc,layer);
        if(layer.parent.typename!=='Document'||!layer.visible)throw Error('A capa não ficou visível na raiz da página.');
    }
    api.coverJob=null;
    api.coverWork=function(){
        var j=api.coverJob;
        try{coverInsert(j,j.start,true,j.origins);coverInsert(j,j.end,false,j.origins);}catch(e){j.error=e;}
    };
    api.applyCovers=function(cfg){
        var originalId=null,dialogs=app.displayDialogs,temps=[],changes=[],origins=[];
        function getChange(doc){
            for(var i=0;i<changes.length;i++)if(changes[i].doc===doc)return changes[i];
            app.activeDocument=doc;
            var c={doc:doc,base:coverImageBase(doc),before:doc.activeHistoryState,start:null,end:null,touched:false};changes.push(c);return c;
        }
        try{
            if(!app.documents.length)throw Error('Abra pelo menos uma página.');
            if(!cfg||(!cfg.startFile&&!cfg.endFile))throw Error('Selecione pelo menos uma capa.');
            if(cfg.startFile&&!fileExists(cfg.startFile))throw Error('Arquivo da capa inicial não encontrado.');
            if(cfg.endFile&&!fileExists(cfg.endFile))throw Error('Arquivo da capa final não encontrado.');
            originalId=documentId();app.displayDialogs=DialogModes.NO;
            if(cfg.startFile){selectDocument(Number(cfg.startId));var a=app.activeDocument;getChange(a).start=coverPrepare(File(cfg.startFile),a,'Scan — capa inicial',temps);}
            if(cfg.endFile){selectDocument(Number(cfg.endId));var b=app.activeDocument;getChange(b).end=coverPrepare(File(cfg.endFile),b,'Scan — capa final',temps);}
            for(var i=0;i<changes.length;i++){
                var c=changes[i];app.activeDocument=c.doc;
                var total=coverPx(c.doc.height)+(c.start?c.start.height:0)+(c.end?c.end.height:0);
                if(total>300000)throw Error('A página "'+c.doc.name+'" ultrapassaria 300 mil pixels de altura.');
            }
            for(i=0;i<changes.length;i++){
                api.coverJob=changes[i];api.coverJob.origins=origins;app.activeDocument=api.coverJob.doc;api.coverJob.touched=true;
                // Cross-document duplication must run outside destination suspendHistory (PS 2021).
                api.coverWork();
                if(api.coverJob.error)throw api.coverJob.error;
            }
            return packet('COVERS',['OK',changes.length,'Capas adicionadas em '+changes.length+' página(s). Cada capa ficou em uma camada própria.']);
        }catch(e){
            var failed=[];
            for(var r=changes.length-1;r>=0;r--)if(changes[r].touched){try{app.activeDocument=changes[r].doc;changes[r].doc.activeHistoryState=changes[r].before;}catch(restoreError){failed.push(changes[r].doc.name);}}
            return packet('COVERS',['ERR',(e.message||String(e))+(failed.length?' | Use Desfazer nestas páginas: '+failed.join(', '):'')]);
        }finally{
            api.coverJob=null;
            for(var t=temps.length-1;t>=0;t--)try{app.activeDocument=temps[t];temps[t].close(SaveOptions.DONOTSAVECHANGES);}catch(ignoreClose){}
            for(var o=0;o<origins.length;o++)try{app.activeDocument=origins[o].doc;origins[o].doc.rulerOrigin=origins[o].value;}catch(ignoreOrigin){}
            try{app.displayDialogs=dialogs;}catch(ignoreDialogs){}
            try{if(originalId!==null)selectDocument(originalId);}catch(ignoreOriginal){}
        }
    };

    function imageLayers(container,result){
        result=result||[];
        for(var i=0;i<container.layers.length;i++){
            var l=container.layers[i];
            if(l.typename==='LayerSet')imageLayers(l,result);
            else if(l.typename==='ArtLayer'&&(l.kind===LayerKind.NORMAL||l.kind===LayerKind.SMARTOBJECT)){
                var b=l.bounds;if(Number(b[2])>Number(b[0])&&Number(b[3])>Number(b[1]))result.push(l);
            }
        }
        return result;
    }
    function duplicateImage(doc){
        var layers=imageLayers(doc);
        if(layers.length>=2)return {state:'SKIP',message:'Já possui '+layers.length+' camadas de imagem.'};
        if(!layers.length)return {state:'SKIP',message:'Nenhuma camada de imagem com conteúdo.'};
        var source=layers[0],copy=source.duplicate();copy.allLocked=false;
        if(copy.kind===LayerKind.NORMAL){copy.pixelsLocked=false;copy.positionLocked=false;copy.transparentPixelsLocked=false;}
        copy.name=source.name+' copiar';doc.activeLayer=copy;return {state:'OK',message:'Imagem duplicada uma vez.'};
    }
    function profile(doc,assignWorking){
        var types=typeof ColorProfileType!=='undefined'?ColorProfileType:ColorProfile;
        if(doc.colorProfileType===types.NONE){if(!assignWorking)throw Error('Sem perfil ICC. Atribua um perfil ou ative o perfil de trabalho.');doc.colorProfileType=types.WORKING;}
        if(doc.colorProfileType===types.NONE||!doc.colorProfileName)throw Error('Não foi possível obter um perfil ICC.');
        return doc.colorProfileName;
    }
    function baseName(name){return name.replace(/\.[^.]+$/,'').replace(/[\\\/:*?"<>|]/g,'_').replace(/[. ]+$/,'')||'Sem_titulo';}
    function targetPlans(entries,folder,overwrite,extension){
        var used={},plans=[],existing=0;
        for(var i=0;i<entries.length;i++){
            var base=baseName(entries[i].name),suffix=0,file,key;
            do{file=new File(folder.fsName+'/'+base+(suffix?'_'+suffix:'')+'.'+extension);key='$'+file.fsName.toLowerCase();suffix++;}
            while(used[key]||(!overwrite&&file.exists));
            used[key]=true;if(overwrite&&file.exists)existing++;plans.push(file);
        }
        return {plans:plans,existing:existing};
    }
    function savePSD(doc,file,assignWorking){
        var icc=profile(doc,assignWorking),o=new PhotoshopSaveOptions();o.layers=true;o.embedColorProfile=true;o.alphaChannels=true;o.spotColors=true;
        doc.saveAs(file,o,false,Extension.LOWERCASE);return 'Salvo: '+file.name+' | ICC: '+icc;
    }
    function nativeWebP(){var v=app.version.split('.');return Number(v[0])>23||(Number(v[0])===23&&Number(v[1])>=2);}
    function saveWebP(file,quality){
        var settings=new ActionDescriptor(),save=new ActionDescriptor();
        if(nativeWebP()){
            settings.putEnumerated(stringIDToTypeID('compression'),stringIDToTypeID('WebPCompression'),stringIDToTypeID(quality===100?'compressionLossless':'compressionLossy'));
            settings.putInteger(stringIDToTypeID('quality'),quality);settings.putBoolean(stringIDToTypeID('includeXMPData'),false);settings.putBoolean(stringIDToTypeID('includeEXIFData'),false);settings.putBoolean(stringIDToTypeID('includePsExtras'),false);
            save.putObject(charIDToTypeID('As  '),stringIDToTypeID('WebPFormat'),settings);
        }else{
            settings.putInteger(charIDToTypeID('wrtq'),quality);settings.putInteger(charIDToTypeID('wrtc'),1);settings.putBoolean(charIDToTypeID('wrte'),false);settings.putBoolean(charIDToTypeID('wrtx'),false);settings.putBoolean(charIDToTypeID('wrtp'),true);
            save.putObject(charIDToTypeID('As  '),charIDToTypeID('webP'),settings);
        }
        save.putPath(charIDToTypeID('In  '),file);save.putBoolean(charIDToTypeID('Cpy '),true);save.putBoolean(stringIDToTypeID('embedProfiles'),true);save.putBoolean(charIDToTypeID('LwCs'),true);
        try{executeAction(charIDToTypeID('save'),save,DialogModes.NO);}catch(e){throw Error('WebP: '+e.message+(!nativeWebP()?' No Photoshop 2021/2019, instale o WebPShop e reinicie o Photoshop.':''));}
    }
    function exportImage(doc,file,format,quality,assignWorking,srgb){
        var temp=null;
        try{
            app.activeDocument=doc;var w=doc.width.as('px'),h=doc.height.as('px');
            if(format==='webp'&&(w>16383||h>16383))throw Error('WebP aceita no máximo 16383 px por lado.');
            if(format==='jpg'&&(w>65535||h>65535))throw Error('JPG aceita no máximo 65535 px por lado.');
            temp=doc.duplicate('__Exportar_pagina__');app.activeDocument=temp;temp.flatten();
            if(temp.mode!==DocumentMode.RGB)temp.changeMode(ChangeMode.RGB);if(temp.bitsPerChannel!==BitsPerChannelType.EIGHT)temp.bitsPerChannel=BitsPerChannelType.EIGHT;
            profile(temp,assignWorking);if(srgb&&temp.colorProfileName!=='sRGB IEC61966-2.1')temp.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,false);
            if(format==='jpg'){
                var jpg=new JPEGSaveOptions();jpg.quality=quality;jpg.embedColorProfile=true;jpg.formatOptions=FormatOptions.STANDARDBASELINE;jpg.matte=MatteType.WHITE;temp.saveAs(file,jpg,true,Extension.LOWERCASE);
            }else if(format==='png'){
                var png=new PNGSaveOptions();png.compression=quality;png.interlaced=false;temp.saveAs(file,png,true,Extension.LOWERCASE);
            }else saveWebP(file,quality);
            if(!file.exists||file.length===0)throw Error('O Photoshop não gerou o arquivo esperado.');
            return 'Exportado: '+file.name+' | '+Math.round(file.length/1024)+' KB';
        }finally{
            if(temp)try{app.activeDocument=temp;temp.close(SaveOptions.DONOTSAVECHANGES);}catch(ignore){}
            try{app.activeDocument=doc;}catch(ignore2){}
        }
    }
    function mergeLayerLocked(layer){
        try{if(layer.isBackgroundLayer)return true;}catch(e){}
        try{if(layer.allLocked)return true;}catch(e2){}
        try{if(layer.positionLocked)return true;}catch(e3){}
        try{if(layer.pixelsLocked)return true;}catch(e4){}
        try{if(layer.transparentPixelsLocked)return true;}catch(e5){}
        return false;
    }
    function mergeRootProtected(layer){
        if(mergeLayerLocked(layer))return true;
        if(layer.typename==='LayerSet'){
            for(var i=0;i<layer.layers.length;i++)if(mergeRootProtected(layer.layers[i]))return true;
        }
        return false;
    }
    function selectLayersByIds(ids){
        for(var i=0;i<ids.length;i++){
            var ref=new ActionReference();ref.putIdentifier(charIDToTypeID('Lyr '),ids[i]);
            var desc=new ActionDescriptor();desc.putReference(charIDToTypeID('null'),ref);
            if(i>0)desc.putEnumerated(stringIDToTypeID('selectionModifier'),stringIDToTypeID('selectionModifierType'),stringIDToTypeID('addToSelection'));
            desc.putBoolean(charIDToTypeID('MkVs'),false);executeAction(charIDToTypeID('slct'),desc,DialogModes.NO);
        }
    }
    function mergeToRedraw(doc){
        var history=doc.activeHistoryState,ids=[],singleGroup=false;
        try{
            for(var i=0;i<doc.layers.length;i++)if(!mergeRootProtected(doc.layers[i])){ids.push(doc.layers[i].id);if(ids.length===1)singleGroup=doc.layers[i].typename==='LayerSet';}
            if(!ids.length)return {state:'SKIP',message:'Nenhuma camada desbloqueada para mesclar.'};
            selectLayersByIds(ids);
            if(ids.length>1||singleGroup)executeAction(stringIDToTypeID('mergeLayersNew'),new ActionDescriptor(),DialogModes.NO);
            doc.activeLayer.name='redraw';
            try{doc.activeLayer.allLocked=false;}catch(ignoreLock){}
            return {state:'OK',message:(ids.length>1||singleGroup)?'Camadas desbloqueadas mescladas em redraw.':'Camada desbloqueada renomeada para redraw.'};
        }catch(e){try{doc.activeHistoryState=history;}catch(ignoreRollback){}throw e;}
    }

    function validatePageConfig(action,c){
        if(action!=='duplicate'&&action!=='merge'&&action!=='psd'&&action!=='export')throw Error('Ação de páginas desconhecida.');
        if(action==='duplicate'||action==='merge')return;
        if(!folderExists(c.folder))throw Error('Escolha uma pasta de destino existente.');
        if(action==='export'){
            if(c.format!=='jpg'&&c.format!=='png'&&c.format!=='webp')throw Error('Formato inválido.');
            var max=c.format==='jpg'?12:c.format==='png'?9:100;
            if(!isFinite(c.quality)||c.quality<0||c.quality>max||Math.floor(c.quality)!==c.quality)throw Error('Qualidade/compressão inválida.');
        }
    }

    api.startPages=function(action,cfg){
        var originalId=null;
        try{
            if(!app.documents.length)throw Error('Abra pelo menos uma página.');validatePageConfig(action,cfg);originalId=documentId();
            var entries=documentsSnapshot(),plans=null,existing=0;
            if(action==='psd'||action==='export'){
                var ext=action==='psd'?'psd':cfg.format,res=targetPlans(entries,Folder(cfg.folder),!!cfg.overwrite,ext);plans=res.plans;existing=res.existing;
                for(var i=0;i<entries.length;i++)entries[i].path=plans[i].fsName;
            }
            selectDocument(originalId);
            api.batch={mode:'pages',action:action,config:cfg,entries:entries,index:0,originalId:originalId,token:String(new Date().getTime())+'-'+Math.random()};
            return packet('START',['OK',entries.length,api.batch.token,existing>0&&cfg.overwrite?'CONFIRM_OVERWRITE':'',existing]);
        }catch(e){try{if(originalId!==null)selectDocument(originalId);}catch(ignore){}api.batch=null;return packet('START',['ERR',e.message||String(e)]);}
    };
    api.pagesNext=function(token,expected){
        var b=api.batch;if(!b||b.mode!=='pages')return packet('NEXT',['FATAL','Nenhum lote de páginas ativo.']);
        if(token!==b.token||Number(expected)!==b.index)return packet('NEXT',['FATAL','O lote mudou. Reinicie a operação.']);
        if(b.index>=b.entries.length)return packet('NEXT',['DONE']);
        var entry=b.entries[b.index],done=b.index+1;b.index++;var state='OK',message='';
        var oldDialogs=app.displayDialogs;
        try{
            app.displayDialogs=DialogModes.NO;selectDocument(entry.id);var doc=app.activeDocument;
            if(b.action==='duplicate'){
                var d=duplicateImage(doc);state=d.state;message=d.message;
            }else if(b.action==='merge'){
                var m=mergeToRedraw(doc);state=m.state;message=m.message;
            }else if(b.action==='psd')message=savePSD(doc,File(entry.path),!!b.config.assignWorking);
            else message=exportImage(doc,File(entry.path),b.config.format,Number(b.config.quality),!!b.config.assignWorking,!!b.config.srgb);
        }catch(e){state='ERROR';message=e.message||String(e);}finally{try{app.displayDialogs=oldDialogs;}catch(ignore){}}
        return packet('NEXT',[state,done,b.entries.length,entry.name,message]);
    };

    api.finishBatch=function(token){
        if(api.batch&&token&&token!==api.batch.token)return packet('FINISH',['ERR',0,'O lote ativo mudou.']);
        var restored=restoreOriginal();api.batch=null;return packet('FINISH',['OK',restored]);
    };

    return api;
}());
