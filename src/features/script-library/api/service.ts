import type { DemoOrder, DemoRecharge, DemoScript, DemoUser } from './types';

export const initialScripts: DemoScript[] = [
  {
    id: 'npc-butler',
    title: 'NPC 管家又被欺负了',
    englishTitle: 'The NPC Butler Gets Bullied Again',
    genre: 'BL 无限流',
    image: '/portal/cover-npc-butler.png',
    logline:
      '失忆的顶级玩家被系统当成 NPC 管家，四名昔日伙伴闯入崩溃副本救他，却被他误解为集体霸凌。',
    synopsis:
      'Blake Young 坚信自己只是必须遵守行为守则的庄园管家。四名不该出现在 B 级副本的 S 级玩家相继闯入，以项圈、试吃、照顾和保护为名不断接近他。随着庄园转入 Otherworld，Blake 被抹除的玩家身份与四人寻找他的真正原因逐渐浮出水面。',
    directorStatement:
      '作品的核心气质是死亡副本里的危险甜宠。真实成立的生存威胁与 Blake 的职场逻辑持续碰撞，形成悬疑、情感和认知错位型喜剧。四名男性都要同时具备可信的高阶危险性，以及只对 Blake 生效的绝对例外。',
    directorSections: [
      {
        id: 'concept',
        title: '创作核心',
        summary:
          '情感核心不是四男争宠，而是 Blake 曾经救赎四人，如今四人跨越副本把他救回。Blake 不是软弱的普通 NPC，他是记忆被抹除的原 S 级玩家。'
      },
      {
        id: 'characters',
        title: '人物关系',
        summary:
          'Peyton 冷静强势，Julian 冷傲敏感，Quinn 温和而善于以退为进，Chase 直白黏人。四人既是联手营救 Blake 的公会同伴，也是互不相让的恋爱竞争者。'
      },
      {
        id: 'world',
        title: '世界观',
        summary:
          '玩家与副本按 D、C、B、A、S 分级。NPC 必须按脚本行动，庄园可在常态与 Otherworld 间切换。Replacement 能抹除玩家记忆并将其置换为 NPC。'
      },
      {
        id: 'visual',
        title: '视觉风格',
        summary:
          '常态庄园使用暖黄、象牙白、深木色与暗红，Otherworld 转为血红、暗蓝、病白和腐败材质。黑色项圈、玫瑰、钥匙与出口光环构成重复视觉意象。'
      }
    ],
    preview: [
      {
        en: 'As an ordinary NPC, I had to play my role in strict accordance with the NPC Code of Conduct. But...',
        zh: '作为一名普通 NPC，我必须严格按照《NPC 行为守则》扮演好自己的角色。可是……'
      },
      {
        en: 'I had no idea why the player assigned the role of manor lord this round had such peculiar tastes. I stared at the maid outfit in the mirror.',
        zh: '我不明白为什么这轮扮演庄园主的玩家品味如此古怪。我盯着镜子里的女仆装。'
      },
      {
        en: 'The hem barely reached the middle of my thighs, and I was at a complete loss for words. It even came with black thigh straps and stockings.',
        zh: '裙摆才勉强到大腿中部，我一时无言以对。衣服甚至还配了黑色腿环和长袜。'
      },
      {
        en: "Even if I was the only man among the manor's NPC servants, that was no reason to dress me like this without warning.",
        zh: '即使我是庄园 NPC 仆从中唯一的男人，也不能不打招呼就把我打扮成这样。'
      },
      {
        en: "The plot was about to start, though, so I had no choice but to hurry to the manor lord's room.",
        zh: '不过剧情马上就要开始了，我只能赶紧前往庄园主的房间。'
      },
      {
        en: 'On the way, I noticed that all the other NPC maids were still wearing their usual long skirts. I was the only one in this bizarre uniform.',
        zh: '路上，我发现其他 NPC 女仆仍穿着平常的长裙，只有我穿着这套古怪的制服。'
      },
      {
        en: "I took a deep breath, forced down my reluctance, and knocked on the manor lord's door.",
        zh: '我深吸一口气，强压下抗拒，敲响了庄园主的房门。'
      },
      {
        en: "Blake Young: Master, it's time for your after-dinner dessert.",
        zh: '布莱克·杨：主人，该吃你的餐后甜点了。'
      },
      {
        en: 'Normally, the player inside should have been frantic by now. Without an NPC like me knocking, there was no way to leave the room. But this player was truly strange.',
        zh: '正常情况下，房里的玩家现在应该已经急坏了。没有我这样的 NPC 敲门，他根本无法离开房间。可这个玩家实在奇怪。'
      },
      {
        en: 'He was not anxious in the slightest. Instead, he pulled me straight inside. As a hand kept rubbing against my waist, I screamed inwardly.',
        zh: '他一点也不着急，反而直接把我拉了进去。一只手不断在我腰间摩挲，我在心里尖叫起来。'
      },
      {
        en: "Yet as the manor's butler, I could only stay in character.",
        zh: '但身为庄园管家，我只能继续按人设行事。'
      },
      {
        en: 'Blake Young: What can I do for you, Master?',
        zh: '布莱克·杨：有什么能为您效劳的吗，主人？'
      },
      {
        en: 'Apparently satisfied with all the touching, he smiled.',
        zh: '他似乎摸够了，满意地笑了。'
      },
      {
        en: 'Peyton Ward: I just remembered that I forgot to give you your collar.',
        zh: '佩顿·沃德：我刚想起来，忘了把你的项圈给你。'
      },
      {
        en: 'What collar?',
        zh: '什么项圈？'
      },
      {
        en: 'I wondered if I had heard him wrong. The next moment, however, the manor lord produced one.',
        zh: '我怀疑自己听错了，可下一秒，庄园主真的拿出了一个项圈。'
      },
      {
        en: 'I was about to refuse when the pressure of an S-rank player rolled off him. Was this not a B-rank instance? How could they put an S-rank player in here?',
        zh: '我正想拒绝，S 级玩家的威压便从他身上席卷而来。这不是 B 级副本吗？怎么会放进来一个 S 级玩家？'
      },
      {
        en: 'Two random items from this man could probably mince me into meat paste.',
        zh: '这个人随便拿两件东西就能把我剁成肉酱。'
      },
      {
        en: 'When I did not resist, he fastened the collar around my neck with a pleasant smile, then hooked a finger beneath it and tested the gap twice.',
        zh: '见我没有反抗，他愉快地笑着把项圈扣到我脖子上，又勾起一根手指探入项圈，试了两次松紧。'
      },
      {
        en: 'Peyton Ward: No one but me is allowed to touch this collar. Understood?',
        zh: '佩顿·沃德：除了我，谁都不许碰这个项圈。明白了吗？'
      },
      {
        en: 'I nodded in a panic. Once he gave me permission to go, I fled toward the kitchen as if my life depended on it.',
        zh: '我慌忙点头。一获准离开，我便像逃命似的冲向厨房。'
      },
      {
        en: 'Before leaving, I still found time to sneak a glance at the nameplate on the left side of his chest, Peyton Ward.',
        zh: '临走前，我还抽空偷瞄了一眼他左胸前的名牌，佩顿·沃德。'
      },
      {
        en: 'Once this instance ended, I was definitely filing a complaint with the Game Master. At the very least, I deserved triple pay as compensation.',
        zh: '等这个副本结束，我一定要向游戏主宰投诉。至少也该赔我三倍工资。'
      },
      {
        en: 'According to the next part of the script, I had to deliver tampered drinks and desserts to Rooms 301 and 302 and make sure the occupants ate them.',
        zh: '按照接下来的剧本，我得把掺过东西的饮料和甜点送到 301 号与 302 号房，并确保房客把它们吃下去。'
      }
    ],
    sourcePairCount: 425,
    previewVisibleCount: 24,
    previewRationale: '覆盖世界设定、主角处境和首次人物冲突，在身份反转与核心救援真相前结束。',
    price: 4800,
    status: 'available',
    episodes: 0,
    format: 'MD / 英文 + 中英对照',
    tags: ['BL', '无限流', '危险甜宠'],
    presentationMode: '演绎',
    packageMode: 'bilingual-package',
    deliverables: {
      script: 'The NPC Butler Gets Bullied Again-US-localized-English.md',
      bilingual: 'The NPC Butler Gets Bullied Again-US-localized-bilingual.md',
      directorStatement: 'The NPC Butler Gets Bullied Again-导演阐述.md'
    }
  },
  {
    id: 'vampire-care-manual',
    title: '吸血鬼饲养手册',
    englishTitle: 'Vampire Care Manual',
    genre: '都市奇幻',
    image: '/portal/cover-vampire-care-manual.png',
    logline:
      '破产留学生收到温莎古堡的百万英镑聘书，却发现自己的新职位，是一位傲慢吸血鬼公爵的“人类宠物”。',
    synopsis:
      '林曼因家庭破产被迫独自在海外打工。高烧病倒、积蓄见底时，一只会说话的蝙蝠送来温莎古堡的聘用信。百万英镑到账后，她踏入会自行复原的古堡，也遇见了把她称作“新宠物”的温莎公爵。金钱契约、跨物种规则与真心在十三集里逐步错位并靠近。',
    directorStatement:
      '用现代留学生的务实生存逻辑碰撞古堡吸血鬼的漫长孤独。喜剧来自林曼对高薪工作的坚定理解，浪漫则建立在公爵从“饲养”到承认平等爱意的变化上。导演阐述继续作为独立文档维护，上传与展示结构不因双制作稿格式改变。',
    directorSections: [
      {
        id: 'concept',
        title: '创作核心',
        summary:
          '以“破产留学生接受百万英镑神秘工作”为快速入口，把跨物种爱情放入清晰的生存目标中。人物不是被动进入奇幻世界，而是主动衡量风险与报酬。'
      },
      {
        id: 'characters',
        title: '人物关系',
        summary:
          '林曼务实、清醒又有韧性；温莎公爵傲慢、孤独，却无法掩饰持续增加的关心。白管家与蝙蝠兄承担古堡规则说明和轻喜剧节奏。'
      },
      {
        id: 'continuity',
        title: '制作连戏',
        summary:
          '中英文制作稿共同维护集号、场号、造型编号、人物状态、场景状态、关键道具和场末状态。试读按完整场景配对，保证制作信息不会被截断。'
      },
      {
        id: 'visual',
        title: '视觉风格',
        summary:
          '现代公寓使用克制冷白光，古堡以象牙白、深绿、烛火金和少量血红建立浪漫危险感。红蜡聘书、绿玛瑙项链与封闭窗帘是贯穿视觉意象。'
      }
    ],
    preview: [
      {
        en: 'EPISODE 1 / SCENE 1-1 · OVERSEAS APARTMENT - LIVING ROOM - DAY - INT.',
        zh: '第一集 / 1-1 海外公寓·客厅 日 内'
      },
      {
        en: "CAST: LIN MAN (international student), FATHER (Lin Man's father)",
        zh: '人物：林曼（留学生）、爸爸（林曼父亲）'
      },
      {
        en: 'CONTINUITY: Story opening. CHARACTER STATE: Lin Man is healthy but chronically tired; Father appears only by phone.',
        zh: '【连戏】故事起点。【人物状态】林曼健康但长期疲惫；爸爸仅通过电话出现。'
      },
      {
        en: 'WARDROBE: LIN MAN (CH001) | WD-LM-001 | Struggling Student Casual | worn light knit, dark jeans, sneakers, canvas bag; loose hair',
        zh: '【造型】林曼（CH001）｜WD-LM-001｜留学生拮据期日常装｜旧款浅色针织衫、深色牛仔裤、运动鞋、帆布包；自然披发'
      },
      {
        en: "SET STATE: Study and work materials cover the table. KEY PROPS: Lin Man's phone. END STATE: Lin Man learns of the bankruptcy and cancels her holiday flight.",
        zh: '【场景状态】桌面堆有学习和兼职资料。【关键道具】林曼手机。【场末状态】林曼得知破产并取消假期航班。'
      },
      {
        en: 'Lin Man sits before an open textbook. Her phone rings, and she answers the video call.',
        zh: '林曼坐在摊开的课本前。手机响起，她接通视频电话。'
      },
      {
        en: "LIN MAN (O.S.): My name is Lin Man. I am a poor, beautiful university student. Actually, I wasn't always this poor.",
        zh: '林曼（OS）：我叫林曼，是个贫穷而美丽的大学生。其实我以前没这么穷。'
      },
      {
        en: 'FATHER (V.O.): Kiddo, I have some good news and some bad news. Which one do you want first?',
        zh: '爸爸（VO）：宝贝，有一个好消息和一个坏消息，你想先听哪个？'
      },
      { en: 'LIN MAN: The good news.', zh: '林曼：好消息。' },
      {
        en: "FATHER (V.O.): We're bankrupt. From now on, you'll have to cover your own tuition and living expenses.",
        zh: '爸爸（VO）：我们破产了。从今往后，你的学费和生活费都得自己解决。'
      },
      {
        en: 'Lin Man stares at the phone as if a question mark has appeared over her head. She takes a deep breath and sits down.',
        zh: '林曼盯着手机，头顶仿佛浮出一个问号。她深吸一口气，扶稳椅背坐下。'
      },
      { en: 'LIN MAN: And the bad news?', zh: '林曼：那坏消息呢？' },
      {
        en: "FATHER (V.O.): Your mom and I are planning to make a run for it. The debt has nothing to do with you, so don't come back for now.",
        zh: '爸爸（VO）：我和你妈准备跑路。债务与你无关，暂时别回国。'
      },
      {
        en: 'LIN MAN (hesitantly): Compared to the first one, what exactly makes this the “bad” news?',
        zh: '林曼（迟疑）：跟前一个相比，这究竟为什么算“坏”消息？'
      },
      {
        en: "FATHER (V.O., heartbroken): You won't be able to contact your favorite mom and dad for a while. Isn't that bad enough?",
        zh: '爸爸（VO，伤心）：你有一阵子联系不上最爱的爸爸妈妈了，这还不够坏吗？'
      },
      {
        en: 'The call ends, leaving the screen on the page where she cancels her holiday flight.',
        zh: '电话挂断，屏幕停在取消假期机票的页面。'
      },
      {
        en: 'MONTAGE: Lin Man carries plates in a cafe and stocks shelves in a convenience store. She studies past midnight, then wakes again at dawn.',
        zh: '蒙太奇：林曼在咖啡店端盘子，在便利店补货；凌晨伏案学习，天刚亮又被闹钟叫醒。'
      },
      {
        en: 'EPISODE 1 / SCENE 1-2 · OVERSEAS APARTMENT - BEDROOM AND ENTRYWAY - DAY - INT.',
        zh: '第一集 / 1-2 海外公寓·卧室与门口 日 内'
      },
      {
        en: 'CAST: LIN MAN, BUTLER BAI, BROTHER BAT (talking bat)',
        zh: '人物：林曼（留学生）、白管家（古堡管家）、蝙蝠兄（会说话的蝙蝠）'
      },
      {
        en: 'CONTINUITY: After a period of work; first day of summer break. CHARACTER STATE: Lin Man has a high fever, is weak, and is nearly out of savings.',
        zh: '【连戏】与1-1相隔一段打工期；暑假第一天。【人物状态】林曼高烧、虚弱、积蓄见底。'
      },
      {
        en: 'WARDROBE: LIN MAN (CH001) | WD-LM-002 | Sick-Day Loungewear | loose long sleeves, cotton trousers, slippers; messy hair',
        zh: '【造型】林曼（CH001）｜WD-LM-002｜病中居家服｜宽松长袖家居服、棉质长裤、拖鞋；凌乱披发'
      },
      {
        en: 'KEY PROPS: Phone, medicine box, red-wax employment letter. END STATE: The employment letter arrives unopened.',
        zh: '【关键道具】手机、药盒、红蜡聘用信。【场末状态】聘用信抵达，尚未打开。'
      },
      {
        en: 'On the first day of summer break, Lin Man curls up in bed with a fever. Every shift on her work schedule is crossed out.',
        zh: '暑假第一天，林曼发烧蜷在床上。兼职排班表全部划掉。'
      },
      {
        en: 'LIN MAN (O.S.): After four days of drinking nothing but hot water, I discovered that my savings were nearly gone. Not to mention next year’s tuition.',
        zh: '林曼（OS）：靠热水撑过四天后，我绝望地发现积蓄几乎见底，更别提下一学年的学费。'
      },
      { en: 'BUTLER BAI (V.O.): Is this Miss Lin Man?', zh: '白管家（VO）：请问是林曼小姐吗？' },
      { en: 'LIN MAN: Yes, it is. May I ask who you are?', zh: '林曼：是我。请问您是哪位？' },
      {
        en: 'BUTLER BAI (V.O., chuckling): My surname is Bai. I am the butler of Windsor Castle.',
        zh: '白管家（VO，轻笑）：鄙姓白，是温莎古堡的管家。'
      },
      {
        en: 'BUTLER BAI (V.O.): Would you be interested in working at Windsor Castle? The compensation will guarantee your tuition and living expenses for years.',
        zh: '白管家（VO）：不知你是否愿意来温莎古堡工作？报酬至少可以保障未来几年的学费和生活费。'
      },
      {
        en: 'Lin Man hangs up without expression. LIN MAN (O.S.): Scammers these days really were not even trying.',
        zh: '林曼面无表情地挂断电话。林曼（OS）：现在的骗子，真是一点都不走心。'
      },
      {
        en: 'Lin Man opens the door. A red-wax-sealed letter smacks her in the face.',
        zh: '林曼打开房门。一封红蜡封口的信迎面拍在她脸上。'
      },
      { en: "BROTHER BAT (panicked): I'm sorry!", zh: '蝙蝠兄（慌张）：对不起！' },
      {
        en: 'Lin Man slowly looks up. A bat hovers outside with a letter in its mouth.',
        zh: '林曼缓缓抬眼。门外悬停着一只叼信的蝙蝠。'
      },
      {
        en: "LIN MAN (O.S.): I really wanted to say it was fine, if the culprit hadn't been a bat.",
        zh: '林曼（OS）：如果肇事者不是一只蝙蝠，我真想说“没关系”。'
      }
    ],
    sourceUnitCount: 28,
    previewUnitCount: 2,
    previewUnitLabel: '场',
    previewSceneBreaks: [17, 32],
    previewRationale:
      '完整开放第一集的 1-1 与 1-2 两场，包含制作标记、人物困境和红蜡聘书钩子，在下一集揭示支票金额前结束。',
    price: 5200,
    status: 'available',
    episodes: 13,
    format: 'MD / 中文制作版 + English Production',
    tags: ['吸血鬼', '轻喜剧', '跨物种爱情'],
    presentationMode: '演绎',
    packageMode: 'parallel-production',
    deliverables: {
      script: 'Vampire Care Manual_English_Production.md',
      chinese: 'Vampire Care Manual_中文版_制作版.md',
      directorStatement: 'Vampire Care Manual_导演阐述.md'
    }
  },
  {
    id: 'mirror-verdict',
    title: '镜中裁决',
    englishTitle: 'The Mirror Verdict',
    genre: '都市悬疑',
    image: '/portal/cover-mirror.jpg',
    logline: '一名替身演员发现，镜子里的自己正在替她完成现实中不敢做的复仇。',
    synopsis:
      '顶流女星离奇坠楼后，她的替身被迫接替未完成的拍摄。随着片场事故不断发生，她发现所有线索都指向一面只在镜头中出现的旧镜子。',
    directorStatement:
      '故事以片场作为封闭空间，将身份、欲望和表演互相折叠。视觉上使用镜面分割与红色服装作为重复意象，让每一次反射都推进人物关系。',
    preview: [
      {
        zh: '内景，摄影棚，夜。空镜头里，镜子先于演员亮起。',
        en: 'INT. SOUNDSTAGE - NIGHT. In the empty frame, the mirror lights up before the actor enters.'
      },
      {
        zh: '林醒站在标记线上。镜中的她却向前走了一步。',
        en: 'LIN XING stands on her mark. Her reflection takes one step forward.'
      },
      {
        zh: '导演没有喊停。所有人都在看监视器，没有人看见她在发抖。',
        en: 'The director does not call cut. Everyone watches the monitor. No one sees her shaking.'
      }
    ],
    price: 3600,
    status: 'available',
    episodes: 24,
    format: 'DOCX / 中英对照',
    tags: ['女性成长', '身份谜局', '强反转'],
    presentationMode: '演绎',
    packageMode: 'bilingual-package',
    deliverables: {
      script: '镜中裁决-English.md',
      bilingual: '镜中裁决-bilingual.md',
      directorStatement: '镜中裁决-导演阐述.md'
    }
  },
  {
    id: 'beyond-clouds',
    title: '云外问剑',
    englishTitle: 'Sword Beyond the Clouds',
    genre: '东方幻想',
    image: '/portal/cover-sword.jpg',
    logline: '被逐出师门的少女发现，天下第一剑其实封印着她被夺走的记忆。',
    synopsis:
      '宗门试剑大会前夕，一名没有灵根的杂役意外拔出了沉睡百年的问天剑。她必须在各方追杀中找回自己的真实身份，并决定是否释放剑中的旧神。',
    directorStatement:
      '以高对比水墨空间承载少女成长。动作场面不追求招式数量，而用风、云和剑痕表现人物每一次选择带来的重量。',
    preview: [
      {
        zh: '外景，断崖，黎明。云海翻涌，剑鸣从崖底传来。',
        en: 'EXT. CLIFF - DAWN. Clouds churn below. A sword hum rises from the abyss.'
      },
      {
        zh: '阿离伸手。掌心没有灵光，只有一道旧伤。',
        en: 'ALI reaches out. No spirit light, only an old scar across her palm.'
      }
    ],
    price: 4200,
    status: 'available',
    episodes: 30,
    format: 'MD / 中英对照',
    tags: ['大女主', '仙侠', '成长'],
    presentationMode: '解说',
    packageMode: 'bilingual-package',
    deliverables: {
      script: '云外问剑-English.md',
      bilingual: '云外问剑-bilingual.md',
      directorStatement: '云外问剑-导演阐述.md'
    }
  },
  {
    id: 'night-testimony',
    title: '夜行证词',
    englishTitle: 'Testimony After Dark',
    genre: '近未来罪案',
    image: '/portal/cover-noir.jpg',
    logline: '唯一的目击者是一段会在每天午夜自动改写的人工记忆。',
    synopsis:
      '记忆审计员受命调查一桩无人认领的谋杀案。他发现受害者的记忆备份每天都会多出十七秒，而那十七秒里始终出现同一个陌生人。',
    directorStatement:
      '用潮湿城市和低照度空间建立不可靠的现实。镜头尽量贴近人物呼吸，让技术设定始终服务于罪责与记忆的主题。',
    preview: [
      {
        zh: '外景，地下通道，雨夜。电子广告只剩一只不断眨动的眼睛。',
        en: 'EXT. UNDERPASS - RAINY NIGHT. A broken billboard shows one blinking eye.'
      },
      {
        zh: '周衡停下录音。波形却继续向前生长。',
        en: 'ZHOU HENG stops the recording. The waveform keeps growing.'
      }
    ],
    price: 3800,
    status: 'available',
    episodes: 20,
    format: 'TXT / 中英对照',
    tags: ['赛博罪案', '记忆谜题', '男性向'],
    presentationMode: '演绎',
    packageMode: 'bilingual-package',
    deliverables: {
      script: '夜行证词-English.txt',
      bilingual: '夜行证词-bilingual.txt',
      directorStatement: '夜行证词-导演阐述.md'
    }
  },
  {
    id: 'letter-through-night',
    title: '长夜来信',
    englishTitle: 'Letters Through the Long Night',
    genre: '年代悬疑',
    image: '/portal/cover-letter.jpg',
    logline: '一封迟到七十年的信，让失踪列车上的秘密重新回到人间。',
    synopsis:
      '旧城拆迁时，档案修复师收到一只来自废弃车站的铁盒。盒中每封信都写给同一个女人，而寄信日期发生在列车消失之后。',
    directorStatement:
      '通过车窗、信纸和月台构成三层时间。情感线克制，悬疑线清晰，让年代质感成为人物无法跨越的距离。',
    preview: [
      {
        zh: '内景，夜行列车，夜。车窗外没有灯，只有不断后退的雾。',
        en: 'INT. NIGHT TRAIN - NIGHT. No lights beyond the window, only fog moving backward.'
      }
    ],
    price: 3200,
    status: 'sold',
    episodes: 18,
    format: 'DOCX / 中英对照',
    tags: ['年代', '爱情悬疑', '女性向'],
    presentationMode: '解说',
    packageMode: 'bilingual-package',
    deliverables: {
      script: '长夜来信-English.docx',
      bilingual: '长夜来信-bilingual.docx',
      directorStatement: '长夜来信-导演阐述.md'
    }
  }
];

export const initialUsers: DemoUser[] = [
  {
    id: 'user-shen',
    name: '沈予安',
    email: 'shen@xinzhi.demo',
    points: 6800,
    discount: 90,
    role: 'member'
  },
  {
    id: 'user-song',
    name: '宋知遥',
    email: 'song@xinzhi.demo',
    points: 2480,
    discount: 85,
    role: 'member'
  },
  {
    id: 'user-liang',
    name: '梁墨',
    email: 'liang@xinzhi.demo',
    points: 9200,
    discount: 100,
    role: 'member'
  },
  {
    id: 'admin-luo',
    name: '罗嘉宁',
    email: 'admin@xinzhi.demo',
    points: 0,
    discount: 100,
    role: 'admin'
  }
];

export const initialOrders: DemoOrder[] = [
  {
    id: 'ORD-260904-018',
    scriptTitle: '长夜来信',
    buyer: '宋知遥',
    amount: 2720,
    status: 'completed',
    createdAt: '2026-09-04 10:26'
  }
];

export const initialRecharges: DemoRecharge[] = [
  {
    id: 'PAY-260904-031',
    user: '沈予安',
    amount: 500,
    points: 5000,
    status: 'paid',
    createdAt: '2026-09-04 09:42'
  },
  {
    id: 'PAY-260904-029',
    user: '梁墨',
    amount: 200,
    points: 2000,
    status: 'pending',
    createdAt: '2026-09-04 08:15'
  }
];
