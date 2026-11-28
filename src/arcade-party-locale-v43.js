/* Offline strings for the formation workshop. Simulation identifiers stay language-independent. */
(function(root){
  'use strict';
  const languages=['ko','en','ja','zh-Hans','zh-Hant','es','pt-BR'];
  const terms=`
합일 리부트|Hapil Reboot|合一リブート|合一重启|合一重啟|Hapil Reboot|Hapil Reboot
편대 원정|Wing expedition|編隊遠征|编队远征|編隊遠征|Expedición de escuadrón|Expedição de esquadrão
스토리 모드|Story mode|ストーリーモード|剧情模式|劇情模式|Modo historia|Modo história
편대 준비|Prepare your wing|編隊準備|编队准备|編隊準備|Preparar escuadrón|Preparar esquadrão
정비 마치기|Finish preparations|整備完了|完成整备|完成整備|Terminar los preparativos|Concluir preparativos
선택으로 돌아가기|Back to rewards|報酬選択に戻る|返回奖励选择|返回獎勵選擇|Volver a las recompensas|Voltar às recompensas
편대 출격|Launch wing|編隊出撃|编队出击|編隊出擊|Desplegar escuadrón|Lançar esquadrão
영웅이 출격하면 세 동료가 편성한 자리에서 함께 싸웁니다.|Three allies will fight beside your hero in the positions you choose.|出撃すると、3人の仲間が指定した位置で共に戦います。|出击后，三名同伴会在指定位置与你并肩作战。|出擊後，三名同伴會在指定位置與你並肩作戰。|Tres aliados lucharán junto a tu héroe en los puestos que elijas.|Três aliados vão lutar ao lado do seu herói nas posições escolhidas.
이 편대로 본편 출격|Enter story with this wing|この編隊で本編へ|以此编队进入正篇|以此編隊進入正篇|Jugar la historia con este escuadrón|Iniciar a história com este esquadrão
계약·보급|Contracts & supplies|契約・補給|契约与补给|契約與補給|Contratos y suministros|Contratos e suprimentos
42 훈련에서 배치 시험|Test formation in stage 42|第42面で編成を試す|在第42关测试阵型|在第42關測試陣形|Probar formación en la fase 42|Testar formação na fase 42
본편으로|Back to story|本編に戻る|返回正篇|返回正篇|Volver a la historia|Voltar à história
동료 배치|Formation|仲間の配置|同伴站位|同伴站位|Formación|Formação
탄막 제어|Bullet control|弾幕制御|弹幕控制|彈幕控制|Control de balas|Controle de balas
공격·요격|Fire & intercept|攻撃・迎撃|攻击与拦截|攻擊與攔截|Fuego e intercepción|Ataque e interceptação
방어막·회복|Shield & heal|防壁・回復|护盾与恢复|護盾與恢復|Escudo y curación|Escudo e cura
동료를 누르고 옮길 자리를 선택하세요.|Tap an ally, then a new position.|仲間をタップしてから移動先を選んでください。|点选同伴，再选择要换到的位置。|點選同伴，再選擇要換到的位置。|Toca un aliado y elige su nueva posición.|Toque em um aliado e escolha a nova posição.
다른 자리를 눌러 교대하세요.|Tap another position to swap.|別の位置をタップして交代。|点选另一位置以交换。|點選另一位置以交換。|Toca otro puesto para intercambiar.|Toque em outra posição para trocar.
여기로 교대|swap here|ここに移動|交换到此处|交換至此|intercambiar aquí|trocar aqui
영웅과 작전 설정|Hero & tactics|英雄・作戦設定|英雄与战术|英雄與戰術|Héroe y táctica|Herói e tática
훈련 영웅|Training hero|訓練の英雄|训练英雄|訓練英雄|Héroe de práctica|Herói de treino
훈련 난이도|Training difficulty|訓練難易度|训练难度|訓練難度|Dificultad de práctica|Dificuldade do treino
기억사수|Memory Gunner|記憶の射手|记忆射手|記憶射手|Tirador de la memoria|Atirador da memória
수련생 윤서하|Trainee Yun Seoha|修練生ユン・ソハ|见习尹瑞河|見習尹瑞河|Yun Seoha, aprendiz|Yun Seoha, aprendiz
각성 윤서하|Awakened Yun Seoha|覚醒ユン・ソハ|觉醒尹瑞河|覺醒尹瑞河|Yun Seoha, despierta|Yun Seoha, desperta
이지|Easy|イージー|简单|簡單|Fácil|Fácil
노멀|Normal|ノーマル|普通|普通|Normal|Normal
헬|Hell|ヘル|地狱|地獄|Infierno|Inferno
아르콘 계보|Archon discipline|アルコンの系譜|执政官系谱|執政官系譜|Disciplina del arconte|Disciplina do arconte
시간 제어|Time control|時間制御|时间控制|時間控制|Control temporal|Controle temporal
중력 제어|Gravity control|重力制御|重力控制|重力控制|Control gravitatorio|Controle gravitacional
신경계 제어|Neural control|神経制御|神经控制|神經控制|Control neural|Controle neural
시간 제어는 접근하는 적탄을 늦춥니다.|Slows approaching enemy bullets.|接近する敵弾を減速させます。|减慢接近的敌弹。|減慢接近的敵彈。|Ralentiza las balas enemigas que se acercan.|Desacelera os projéteis que se aproximam.
중력 제어는 적탄의 경로를 휘게 합니다.|Bends the path of enemy bullets.|敵弾の軌道を曲げます。|使敌弹的轨迹弯曲。|使敵彈的軌跡彎曲。|Curva la trayectoria de las balas enemigas.|Desvia a trajetória dos projéteis inimigos.
신경계 제어는 적의 다음 발사 명령을 늦춥니다.|Delays the enemy's next firing order.|敵の次の発射指令を遅らせます。|延迟敌人的下一次开火指令。|延遲敵人的下一次開火指令。|Retrasa la próxima orden de disparo enemiga.|Atrasa a próxima ordem de disparo inimiga.
내 영웅 자동 회피|Auto-dodge for my hero|英雄の自動回避|英雄自动闪避|英雄自動閃避|Esquiva automática del héroe|Esquiva automática do herói
수동으로 탄을 스치거나 조준을 피하면 사격이 3초간 강해집니다.|Manually graze bullets or dodge a marked shot for 3 seconds of stronger fire.|手動で弾をかすめるか狙撃予告をかわすと、3秒間射撃が強化されます。|手动擦弹或避开瞄准射击，可强化火力3秒。|手動擦彈或避開瞄準射擊，可強化火力3秒。|Roza balas o esquiva un disparo marcado a mano para potenciar el fuego durante 3 s.|Desvie por pouco ou escape de um tiro marcado manualmente para ganhar 3 s de fogo reforçado.
고유 지원 재사용 25% 단축|Support cooldown −25%|固有支援の再使用時間 −25%|专属支援冷却 −25%|專屬支援冷卻 −25%|Recarga de apoyo −25%|Recarga do apoio −25%
기본 사격 피해 45% 증가|Basic shot damage +45%|通常射撃の威力 +45%|基础射击伤害 +45%|基礎射擊傷害 +45%|Daño del disparo básico +45%|Dano do tiro básico +45%
권능 충전 20% 가속|Power charges 20% faster|権能の充填速度 +20%|异能充能速度 +20%|異能充能速度 +20%|La habilidad carga un 20% más rápido|A habilidade carrega 20% mais rápido
예고나 접근 중인 탄에 계약 권능 사용|Uses its contracted power against incoming fire or attack warnings|予告や接近する弾に契約権能を発動|在攻击预警或敌弹逼近时发动契约能力|在攻擊預警或敵彈逼近時發動契約能力|Activa su poder ante un aviso o disparos cercanos|Ativa o poder ao detectar avisos ou projéteis próximos
영웅에게 향하는 탄을 요격|Intercepts shots aimed at the hero|英雄に向かう弾を迎撃|拦截飞向英雄的子弹|攔截飛向英雄的子彈|Intercepta balas dirigidas al héroe|Intercepta projéteis que vão atingir o herói
방벽 2회 · 실제 엄호 3회로 잃은 목숨 1 회복|Blocks twice per shield. Three saves restore one lost life|防壁で2発防ぐ。3回救援で失った残機1回復|每道屏障可挡两发，成功掩护三次可恢复一条已损失的生命|每道屏障可擋兩發，成功掩護三次可恢復一條已損失的生命|Bloquea dos impactos por escudo. Tres rescates recuperan una vida perdida|Bloqueia dois impactos por escudo. Três resgates recuperam uma vida perdida
방벽 1회로 영웅 엄호|Protects the hero against one hit per shield|防壁1回で英雄を援護|每道屏障为英雄挡下一击|每道屏障為英雄擋下一擊|Cada escudo protege al héroe de un impacto|Cada escudo protege o herói de um impacto
전방|Front|前衛|前排|前排|Frente|Frente
측면|Flank|側面|侧翼|側翼|Flanco|Flanco
후방|Rear|後衛|后排|後排|Retaguardia|Retaguarda
아르콘|Archon|アルコン|执政官|執政官|Arconte|Arconte
드론|Drone|ドローン|无人机|無人機|Dron|Drone
천사|Angel|天使|天使|天使|Ángel|Anjo
편대로|Formation|編隊へ|返回编队|返回編隊|Formación|Formação
편대 정비|Wing workshop|編隊整備|编队整备|編隊整備|Taller de escuadrón|Oficina do esquadrão
정비 메뉴|Workshop menu|整備メニュー|整备菜单|整備選單|Menú de taller|Menu da oficina
릴 보급|Supply reels|補給リール|补给转轮|補給轉輪|Carretes de suministros|Bobinas de suprimentos
동료 강화|Upgrade allies|仲間強化|强化同伴|強化同伴|Mejorar aliados|Melhorar aliados
계약소|Contracts|契約所|契约所|契約所|Contratos|Contratos
출격 보급|Sortie supplies|出撃補給|出击补给|出擊補給|Suministros de misión|Suprimentos de missão
보급 확률|Supply odds|補給の確率|补给概率|補給機率|Probabilidades|Probabilidades
세 릴에 각 문양이 ⅓ 확률로 나타납니다. 한 칸을 고정하고 다시 돌리면 모두 다름 2/9, 둘 일치 6/9, 셋 일치 1/9입니다.|Each symbol has a ⅓ chance on each reel. Hold one and spin again: no match 2/9, pair 6/9, triple 1/9.|各リールの各紋様は⅓。1枠を固定して回すと、全て異なる確率は2/9、2つ一致は6/9、3つ一致は1/9です。|每个符号在每个转轮上出现的概率均为⅓。锁定一个重转：全异2/9、两同6/9、三同1/9。|每個符號在每個轉輪上出現的機率均為⅓。鎖定一個重轉：全異2/9、兩同6/9、三同1/9。|Cada símbolo tiene ⅓ de probabilidad por carrete. Al fijar uno y repetir: distintos 2/9, pareja 6/9, trío 1/9.|Cada símbolo tem chance de ⅓ por bobina. Ao travar uma e girar de novo: sem par 2/9, par 6/9, trio 1/9.
다음 전투에서 한 동료가 쓸 보급을 정합니다. 세 릴을 무료로 한 번 돌리세요.|Spin the three reels once for free to supply an ally for the next battle.|次の戦闘で仲間1人に補給します。3つのリールを1回無料で回せます。|免费转动三个转轮一次，为一名同伴准备下一场战斗的补给。|免費轉動三個轉輪一次，為一名同伴準備下一場戰鬥的補給。|Gira gratis los tres carretes para abastecer a un aliado en el próximo combate.|Gire as três bobinas de graça para abastecer um aliado na próxima batalha.
확정 +1을 받을 동료를 선택하거나, 문양 한 칸을 고정해 나머지 두 칸을 다시 돌리세요.|Give any ally a guaranteed +1, or hold one symbol and spin the other two.|仲間1人に確定+1を渡すか、紋様1つを固定して残り2つを回してください。|选择一名同伴获得保底+1，或锁定一个符号后重转其余两个。|選擇一名同伴獲得保底+1，或鎖定一個符號後重轉其餘兩個。|Dale +1 garantizado a un aliado o fija un símbolo y vuelve a girar los otros dos.|Dê +1 garantido a um aliado ou trave um símbolo e gire os outros dois.
이번 릴 보급은 0단계입니다.|No supply bonus this spin.|今回の補給は+0です。|本次补给加成为0。|本次補給加成為0。|Esta tirada no da bonificación.|Esta rodada não dá bônus.
다음 전투에 투입합니다.|Ready for the next battle.|次の戦闘に投入します。|将在下一场战斗中使用。|將在下一場戰鬥中使用。|Listo para el próximo combate.|Pronto para o próximo combate.
무료 회전|Free spin|無料で回す|免费转动|免費轉動|Giro gratis|Giro grátis
고정 후 재회전|hold and spin again|を固定して再回転|锁定并重转|鎖定並重轉|fijar y volver a girar|travar e girar de novo
고정|Hold|固定|锁定|鎖定|Fijar|Travar
대기|Ready|待機|待命|待命|Listo|Pronto
확정 승격|Promote|確定昇格|确定升星|確定升星|Ascender|Promover
조기 합성|Early fusion|早期合成|提前合成|提前合成|Fusión anticipada|Fusão antecipada
장비 강화|Upgrade gear|装備強化|强化装备|強化裝備|Mejorar equipo|Melhorar equipamento
선택 증표 받기 · 남은|Claim token · remaining|選択証を受け取る・残り|领取自选凭证 · 剩余|領取自選憑證 · 剩餘|Reclamar ficha · quedan|Resgatar ficha · restam
재탐색|Refresh|再探索|刷新|更新|Renovar|Renovar
계약 증표와 드론 설계도를 모아 별을 올리세요.|Collect contract tokens and drone plans to raise star ranks.|契約証とドローンの設計図を集めて星を上げましょう。|收集契约凭证和无人机图纸，提升星级。|收集契約憑證和無人機圖紙，提升星級。|Reúne fichas de contrato y planos de dron para subir estrellas.|Colete fichas de contrato e projetos de drone para subir o nível de estrelas.
구매 완료|Sold|購入済み|已购买|已購買|Adquirido|Comprado
구매|Buy|購入|购买|購買|Comprar|Comprar
7성 완료|Max rank (7★)|7★達成|已达7★|已達7★|Rango máximo (7★)|Nível máximo (7★)
보유|Owned|所持|持有|持有|Inventario|Inventário
선택 증표|Choice token|選択証|自选凭证|自選憑證|Ficha a elegir|Ficha à escolha
추가 증표|extra tokens|追加証|额外凭证|額外憑證|fichas adicionales|fichas adicionais
공명 인장|resonance seals|共鳴の印|共鸣印记|共鳴印記|sellos de resonancia|selos de ressonância
설계도|plans|設計図|图纸|圖紙|planos|projetos
증표|tokens|契約証|凭证|憑證|fichas|fichas
정비비|Credits|整備費|整备点|整備點|Créditos|Créditos
인장|Seals|印|印记|印記|Sellos|Selos
장비|Gear|装備|装备|裝備|Equipo|Equipamento
보급|Supply|補給|补给|補給|Suministro|Suprimento
출격할 권능을 선택했습니다.|Power selected.|権能を選びました。|已选择出击能力。|已選擇出擊能力。|Poder seleccionado.|Poder selecionado.
새 계약 후보 다섯 개를 찾았습니다.|Five new offers available.|新しい候補が5件並びました。|已找到五个新候选。|已找到五個新候選。|Hay cinco ofertas nuevas.|Cinco novas ofertas disponíveis.
정비비가 부족합니다.|Not enough credits.|整備費が足りません。|整备点不足。|整備點不足。|Faltan créditos.|Créditos insuficientes.
3성부터는 공명 인장으로 승격합니다.|From 3★ onward, promotion costs resonance seals.|3★以降の昇格には共鳴の印が必要です。|自3★起，升星需消耗共鸣印记。|自3★起，升星需消耗共鳴印記。|A partir de 3★ se asciende con sellos de resonancia.|A partir de 3★, a promoção usa selos de ressonância.
조기 합성 실패 · 기존 별과 증표를 보존했습니다.|Fusion failed. Your stars and tokens are safe.|合成失敗。星と契約証は保持されます。|合成失败。星级与凭证已保留。|合成失敗。星級與憑證已保留。|Falló la fusión. Conservas las estrellas y fichas.|A fusão falhou. Suas estrelas e fichas foram mantidas.
확정 +1 보급 또는 한 칸 고정 후 재회전을 고르세요.|Claim +1 or hold a reel and spin again.|確定+1か、1枠固定の再回転を選んでください。|领取保底+1，或锁定一轮后重转。|領取保底+1，或鎖定一輪後重轉。|Cobra +1 o fija un carrete para volver a girar.|Receba +1 ou trave uma bobina e gire de novo.
추가 보급 없음|No supply bonus|追加補給なし|无额外补给|無額外補給|Sin suministro extra|Sem suprimento extra
출격 보급|Sortie supplies|出撃補給|出击补给|出擊補給|Suministros de misión|Suprimentos de missão
성 승격|★ promotion|★に昇格|★升星|★升星|★ de ascenso|★ de promoção
회피 성공 · 사격 강화|Dodge bonus · boosted fire|回避成功・射撃強化|闪避成功 · 火力强化|閃避成功 · 火力強化|Esquiva lograda · fuego potenciado|Esquiva bem-sucedida · fogo reforçado
영웅 자동 회피|Auto-dodge|自動回避|自动闪避|自動閃避|Esquiva automática|Esquiva automática
영웅 직접 조종|Manual control|手動操作|手动操控|手動操控|Control manual|Controle manual
정밀 이동|Focus|精密移動|精确移动|精準移動|Precisión|Precisão
초능력|Power|超能力|异能|異能|Poder|Poder
폭탄|Bomb|ボム|炸弹|炸彈|Bomba|Bomba
목숨|Lives|残機|生命|生命|Vidas|Vidas
생명 조각|Life fragments|命のかけら|生命碎片|生命碎片|Fragmentos de vida|Fragmentos de vida
악몽분대장|Nightmare Captain|悪夢の分隊長|噩梦分队长|夢魘分隊長|Capitán de la Pesadilla|Capitão do Pesadelo
편대 훈련|Wing training|編隊訓練|编队训练|編隊訓練|Entrenamiento de escuadrón|Treino de esquadrão
차단선 훈련|Blockade drill|阻止線訓練|封锁线训练|封鎖線訓練|Práctica de bloqueo|Treino de bloqueio
교차 사격 훈련|Crossfire drill|交差射撃訓練|交叉火力训练|交叉火力訓練|Práctica de fuego cruzado|Treino de fogo cruzado
42 훈련 출격|Launch stage 42 drill|第42面訓練に出撃|开始第42关训练|開始第42關訓練|Entrenar en fase 42|Treinar na fase 42
일시정지|Paused|一時停止|已暂停|已暫停|Pausa|Pausa
전투 계속|Resume battle|戦闘再開|继续战斗|繼續戰鬥|Reanudar combate|Retomar batalha
정비로 복귀|Back to workshop|整備に戻る|返回整备|返回整備|Volver al taller|Voltar à oficina
전투 메뉴|Battle menu|戦闘メニュー|战斗菜单|戰鬥選單|Menú de combate|Menu de batalha
적 체력|Enemy health|敵の体力|敌方生命值|敵方生命值|Vida del enemigo|Vida inimiga
준비|Ready|準備完了|就绪|就緒|Listo|Pronto
재출격 중|Respawning|再出撃中|正在重返战场|正在重返戰場|Reincorporándose|Retornando
남은 탄을 피하세요|Dodge the last bullets|残りの弾をかわそう|避开剩余子弹|避開剩餘子彈|Esquiva las últimas balas|Desvie dos últimos projéteis
피격 · 사격 회복 중|Hit · recovering|被弾・射撃回復中|受击 · 火力恢复中|受擊 · 火力恢復中|Impacto · recuperando|Atingido · recuperando
전투 기록|Battle record|戦闘記録|战斗记录|戰鬥紀錄|Registro de combate|Registro de batalha
동료 활동|Ally actions|仲間の活躍|同伴行动|同伴行動|Acciones aliadas|Ações dos aliados
편대로 돌아가기|Return to formation|編隊に戻る|返回编队|返回編隊|Volver a la formación|Voltar à formação
작전 성공|Mission clear|作戦成功|作战成功|作戰成功|Misión cumplida|Missão cumprida
단독 훈련|Single-stage practice|単独ステージ訓練|单关训练|單關訓練|Práctica de una fase|Treino de uma fase
영웅의 마지막 목숨을 모두 썼습니다.|Your hero lost their last life.|英雄の残機が尽きました。|英雄失去了最后一条命。|英雄失去了最後一條命。|Tu héroe ha perdido su última vida.|Seu herói perdeu a última vida.
영웅 격추|Hero down|英雄撃墜|英雄被击落|英雄被擊落|Héroe derribado|Herói abatido
다음 스테이지에 적용|Apply next stage|次のステージに適用|下一关生效|下一關生效|Aplicar en la fase siguiente|Aplicar na próxima fase
바꾼 배치는 다음 스테이지부터 적용됩니다. 자동 회피 설정은 전투를 재개하면 바로 반영됩니다.|Formation changes take effect next stage. Auto-dodge changes as soon as you resume.|編成変更は次のステージから、自動回避の変更は戦闘再開時から反映されます。|新阵型将在下一关生效。自动闪避设置在恢复战斗时立即生效。|新陣形將在下一關生效。自動閃避設定在恢復戰鬥時立即生效。|La formación cambiará en la próxima fase. La esquiva automática se ajustará al reanudar.|A formação muda na próxima fase. A esquiva automática muda ao retomar a batalha.
보급을 사용했습니다. 새 스테이지 격파 후 다시 회전할 수 있습니다.|Supplies used. Clear a new stage to spin again.|補給を使用しました。新しいステージをクリアすると再び回せます。|补给已使用。首次通关新关卡后可再次转动。|補給已使用。首次通關新關卡後可再次轉動。|Suministro consumido. Supera una fase nueva para volver a girar.|Suprimento consumido. Conclua uma nova fase para girar novamente.
자동 회피 장거리 예측|Auto-dodge: long lookahead|自動回避：長距離予測|自动闪避：远距预测|自動閃避：遠距預測|Esquiva automática: anticipación larga|Esquiva automática: previsão longa
자동 회피 중거리 예측|Auto-dodge: medium lookahead|自動回避：中距離予測|自动闪避：中距预测|自動閃避：中距預測|Esquiva automática: anticipación media|Esquiva automática: previsão média
자동 회피 근거리 예측|Auto-dodge: short lookahead|自動回避：近距離予測|自动闪避：近距预测|自動閃避：近距預測|Esquiva automática: anticipación corta|Esquiva automática: previsão curta
지원 대기 −25%|Support cooldown −25%|支援待機 −25%|支援冷却 −25%|支援冷卻 −25%|Recarga de apoyo −25%|Recarga de apoio −25%
사격 피해 +45%|Shot damage +45%|射撃威力 +45%|射击伤害 +45%|射擊傷害 +45%|Daño de disparo +45%|Dano de tiro +45%
권능 충전 +20%|Power charge +20%|権能充填 +20%|异能充能 +20%|異能充能 +20%|Carga de poder +20%|Carga de poder +20%
자동 회피 중에도 폭탄과 초능력을 직접 쓸 수 있습니다. 회피로 얻는 사격 강화는 수동 조종에서 발동합니다.|You can still trigger bombs and powers during auto-dodge. Manual dodges grant the firepower bonus.|自動回避中もボムと超能力は自分で使えます。回避による射撃強化は手動操作時に発動します。|自动闪避时仍可手动使用炸弹和异能。手动闪避可获得火力强化。|自動閃避時仍可手動使用炸彈和異能。手動閃避可獲得火力強化。|Puedes usar bombas y poderes durante la esquiva automática. Esquivar manualmente potencia el disparo.|Você pode usar bombas e poderes com esquiva automática. Esquivar manualmente reforça os tiros.
화면을 끌거나 방향키로 이동합니다. Shift 정밀 이동 · Space 폭탄 · X 초능력|Drag or use the arrows to move. Shift: focus · Space: bomb · X: power|ドラッグまたは矢印で移動。Shift 精密移動・Space ボム・X 超能力|拖动屏幕或按方向键移动。Shift 精确移动 · 空格 炸弹 · X 异能|拖曳螢幕或按方向鍵移動。Shift 精準移動 · 空白鍵 炸彈 · X 異能|Arrastra o usa las flechas. Mayús: precisión · Espacio: bomba · X: poder|Arraste ou use as setas. Shift: precisão · Espaço: bomba · X: poder
깃창이 가리키는 탄길을 읽고, 동료 셋과 분대장을 돌파하세요.|Read the captain's spear signals and defeat him with your three allies.|旗槍が示す弾道を読み、3人の仲間と分隊長を突破しましょう。|观察旗枪指示的弹道，与三名同伴击败分队长。|觀察旗槍指示的彈道，與三名同伴擊敗分隊長。|Lee las señales de la lanza y derrota al capitán con tus tres aliados.|Leia os sinais da lança e derrote o capitão com seus três aliados.
원정 마지막 전투 다시 도전|Retry the final expedition battle|遠征の最終戦に再挑戦|再次挑战远征终战|再次挑戰遠征終戰|Reintentar la batalla final|Repetir a batalha final
성장 원정 진행|Continue expedition|育成遠征を続ける|继续成长远征|繼續成長遠征|Continuar expedición|Continuar expedição
조준 예고 중에 사용하면 다음 발사를 늦춥니다.|Use during an aim warning to delay the next shot.|照準予告の間に使うと次の発射を遅らせます。|在瞄准预警期间使用，可延迟下一次射击。|在瞄準預警期間使用，可延遲下一次射擊。|Úsalo durante el aviso de apuntado para retrasar el siguiente disparo.|Use durante o aviso de mira para atrasar o próximo disparo.
적의 마지막 탄막까지 편대와 함께 돌파했습니다.|Your wing made it through the final barrage.|編隊と共に最後の弾幕を突破しました。|你与编队一同穿过了最后的弹幕。|你與編隊一同穿過了最後的彈幕。|Tu escuadrón superó la última descarga.|Seu esquadrão atravessou a última barragem.
영웅의 마지막 목숨을 모두 썼습니다. 동료 배치를 바꿔 다시 도전할 수 있습니다.|Your hero lost the last life. Try again with a different formation.|英雄の残機が尽きました。編成を変えて再挑戦できます。|英雄生命已用尽。可调整编队后重试。|英雄生命已用盡。可調整編隊後重試。|Tu héroe perdió la última vida. Prueba otra formación.|Seu herói perdeu a última vida. Tente outra formação.
남은 목숨|Lives left|残り残機|剩余生命|剩餘生命|Vidas restantes|Vidas restantes
직접 회피|Manual dodges|手動回避|手动闪避|手動閃避|Esquivas manuales|Esquivas manuais
방벽|Blocked|防壁で防いだ弾|抵挡|抵擋|Bloqueos|Bloqueios
목숨 회복|Lives restored|残機回復|恢复生命|恢復生命|Vidas recuperadas|Vidas recuperadas
요격|Intercepted|迎撃|拦截|攔截|Intercepciones|Interceptações
보스 피해|Boss damage|ボス与ダメージ|首领伤害|首領傷害|Daño al jefe|Dano ao chefe
감속|Slowed|減速|减速|減速|Ralentizadas|Desacelerados
견인|Redirected|牽引|牵引|牽引|Desviadas|Desviados
발사 지연|Shots delayed|発射遅延|延迟射击|延遲射擊|Disparos retrasados|Disparos atrasados
정비로 복귀했습니다.|Back at the workshop.|整備に戻りました。|已返回整备。|已返回整備。|Has vuelto al taller.|Você voltou à oficina.
편대 전투|Wing combat|編隊戦闘|编队战斗|編隊戰鬥|Combate de escuadrón|Combate de esquadrão
편대 전장. 화면을 끌거나 방향키로 영웅을 이동하세요.|Wing battlefield. Drag or use the arrow keys to move your hero.|編隊戦場。ドラッグまたは矢印キーで英雄を移動します。|编队战场。拖动屏幕或按方向键移动英雄。|編隊戰場。拖曳螢幕或按方向鍵移動英雄。|Campo de combate. Arrastra o mueve al héroe con las flechas.|Campo de batalha. Arraste ou mova o herói com as setas.
다른 화면의 정비 기록을 가져왔습니다. 현재 선택을 다시 확인하세요.|Loaded changes from another tab. Check your selection again.|別画面の整備記録を読み込みました。選択を再確認してください。|已载入其他页面的整备记录，请重新确认选择。|已載入其他頁面的整備紀錄，請重新確認選擇。|Se cargaron cambios de otra pestaña. Revisa tu selección.|Alterações de outra aba carregadas. Confira sua escolha.
이 브라우저에서는 재실행 후 복원이 제한됩니다.|This browser may not retain your progress after closing.|このブラウザでは終了後に記録を復元できない場合があります。|关闭此浏览器后，进度可能无法恢复。|關閉此瀏覽器後，進度可能無法恢復。|Este navegador podría no conservar el progreso al cerrarse.|Este navegador pode não manter seu progresso após fechar.
동료와 자리를 선택하세요.|Choose an ally and a position.|仲間と位置を選んでください。|请选择同伴和位置。|請選擇同伴和位置。|Elige un aliado y un puesto.|Escolha um aliado e uma posição.
이미 이 자리에 있습니다.|Already in this position.|すでにこの位置にいます。|已在此位置。|已在此位置。|Ya ocupa este puesto.|Já ocupa esta posição.
계약 계보를 선택하세요.|Choose a discipline.|契約系譜を選んでください。|请选择契约系谱。|請選擇契約系譜。|Elige una disciplina.|Escolha uma disciplina.
재탐색에 정비비 2가 필요합니다.|A refresh costs 2 credits.|再探索には整備費2が必要です。|刷新需要2整备点。|更新需要2整備點。|Renovar cuesta 2 créditos.|Renovar custa 2 créditos.
이미 처리된 후보입니다.|This offer has already been claimed.|この候補は取引済みです。|已领取此候选。|已領取此候選。|Ya has reclamado esta oferta.|Esta oferta já foi resgatada.
1~2성 동료에게 보급 증표를 사용할 수 있습니다.|Use supply tokens on 1★ or 2★ allies.|補給証は1★または2★の仲間に使えます。|补给凭证可用于1★或2★同伴。|補給憑證可用於1★或2★同伴。|Usa fichas en aliados de 1★ o 2★.|Use fichas em aliados de 1★ ou 2★.
동료 선택|Select ally|仲間を選択|选择同伴|選擇同伴|Elegir aliado|Escolher aliado
동료를 선택하세요.|Choose an ally.|仲間を選んでください。|请选择同伴。|請選擇同伴。|Elige un aliado.|Escolha um aliado.
장비 강화는 +2까지입니다.|Gear is capped at +2.|装備強化は+2が上限です。|装备最多可强化至+2。|裝備最多可強化至+2。|El equipo llega hasta +2.|O equipamento vai até +2.
장비 강화에 정비비 2가 필요합니다.|Gear upgrades cost 2 credits.|装備強化には整備費2が必要です。|强化装备需要2整备点。|強化裝備需要2整備點。|Mejorar equipo cuesta 2 créditos.|Melhorar equipamento custa 2 créditos.
이번 정비의 릴을 이미 돌렸습니다.|You already spun during this preparation.|今回の整備のリールは使用済みです。|本次整备已经转过了。|本次整備已經轉過了。|Ya giraste en esta preparación.|Você já girou nesta preparação.
정산할 릴이 없습니다.|No spin to claim.|精算できるリールがありません。|没有可结算的转轮。|沒有可結算的轉輪。|No hay una tirada pendiente.|Não há uma rodada pendente.
고정할 릴 한 칸을 고르세요.|Choose one reel to hold.|固定するリールを1つ選んでください。|请选择一个要锁定的转轮。|請選擇一個要鎖定的轉輪。|Elige un carrete para fijar.|Escolha uma bobina para travar.
재출격 시 같은 보급을 이어 씁니다.|Retry with the same supplies.|同じ補給で再出撃できます。|再次出击可沿用同一份补给。|再次出擊可沿用同一份補給。|Reintenta con los mismos suministros.|Tente de novo com os mesmos suprimentos.
훈련을 마쳤습니다.|Training complete.|訓練完了。|训练完成。|訓練完成。|Entrenamiento completado.|Treino concluído.
스테이지|Stage|ステージ|关卡|關卡|Fase|Fase
편대 훈련을 마쳤습니다.|Wing training complete.|編隊訓練完了。|编队训练完成。|編隊訓練完成。|Entrenamiento completado.|Treino concluído.
`.trim().split('\n').map(line=>line.split('|'));
  const bySource=new Map(terms.map(row=>[row[0],row]));
  const quote=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const fragments=new RegExp([...bySource.keys()].sort((a,b)=>b.length-a.length).map(quote).join('|'),'g');
  const campaign=new URLSearchParams(location.search).get('campaign')==='1';
  let lang='ko', native=null;
  if(campaign){
    try { native=root.parent.HapilI18n; lang=native?.lang||root.localStorage.getItem('hapil-arcade-lang-v43')||'ko'; }catch(_){}
  }
  const col=Math.max(0,languages.indexOf(lang));
  function text(source){
    if(!col || typeof source!=='string' || !/[가-힣]/.test(source))return source;
    const exact=bySource.get(source.trim());
    if(exact)return source.replace(source.trim(),()=>exact[col]);
    const fromGame=native?.text?.(source);
    if(fromGame && fromGame!==source)return fromGame;
    const qty = source.replace(/(\d+)개를 (?:얻었습니다|받았습니다)\./g, '×$1')
      .replace(/(\d+)성(?! 승격)/g,'★$1').replace(/(\d+)(?:회|발)(?![가-힣])/g,'$1')
      .replace(/(\d+)번째/g,'#$1');
    return qty.replace(fragments,k=>bySource.get(k)[col]);
  }
  function apply(el){
    if(!col || !el)return;
    document.documentElement.lang=languages[col];
    if(document.title.includes('합일')) document.title=text(document.title);
    const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let leaf;
    while((leaf=walk.nextNode())){
      if(['STYLE','SCRIPT'].includes(leaf.parentElement?.tagName))continue;
      const before=leaf.nodeValue,after=text(before);
      if(after!==before)leaf.nodeValue=after;
    }
    for(const node of [el,...el.querySelectorAll('[aria-label],[title]')]){
      if(!node.getAttribute)continue;
      for(const prop of ['aria-label','title']){
        const before=node.getAttribute(prop),after=text(before);
        if(before!==after)node.setAttribute(prop,after);
      }
    }
  }
  root.PartyWorkshopI18n={text,apply,lang:languages[col]};
})(window);
