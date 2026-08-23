export type ModuleId = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary'

export type LessonStatus = 'not_started' | 'in_progress' | 'completed'

export interface Lesson {
  id: string
  title: string
  titleEn: string
  minutes: number
  summary: string
  content: string
  quiz?: {
    question: string
    options: string[]
    answerIndex: number
    explanation: string
  }
}

export interface Module {
  id: ModuleId
  name: string
  nameEn: string
  blurb: string
  accent: string
  lessons: Lesson[]
}

export const MODULES: Module[] = [
  {
    id: 'listening',
    name: '听力',
    nameEn: 'Listening',
    blurb: '抓关键词、预测题型、训练注意力分配。',
    accent: '#1F6F7A',
    lessons: [
      {
        id: 'lis-1',
        title: 'Section 1 信息填空',
        titleEn: 'Form completion',
        minutes: 18,
        summary: '听懂姓名、电话、地址与时间表达。',
        content:
          'Section 1 通常是日常对话。先浏览空格前后的语法线索，预测答案词性（数字、专有名词、时间）。录音只播一次，听到拼写提示时立即写下字母。常见陷阱：纠错后的最终信息、同义替换（cheap ≈ inexpensive）。',
        quiz: {
          question: '听力填空中，若听到 "actually it\'s 15, not 50"，应填？',
          options: ['50', '15', '515', '不确定，跳过'],
          answerIndex: 1,
          explanation: '说话人纠正后的最终信息才是答案。',
        },
      },
      {
        id: 'lis-2',
        title: 'Section 2 地图与流程',
        titleEn: 'Map & process',
        minutes: 20,
        summary: '用方位词锁定路线与设施位置。',
        content:
          '地图题先标出起点与罗盘方向。听到 opposite / beyond / next to / across from 时对照图例。流程题关注顺序信号词：first, then, after that, finally。不必听懂每个词，抓住“动作 + 对象”即可。',
        quiz: {
          question: '地图题开始前最该先做什么？',
          options: ['背生词', '标出起点与方向', '闭眼冥想', '先做阅读'],
          answerIndex: 1,
          explanation: '起点与方向是定位所有后续描述的锚点。',
        },
      },
      {
        id: 'lis-3',
        title: 'Section 3 学术讨论',
        titleEn: 'Academic discussion',
        minutes: 22,
        summary: '捕捉观点对比与结论。',
        content:
          '两人讨论作业或研究时，注意态度词：I doubt / I\'m convinced / that makes sense。选择题常考“谁提出什么观点”。同义替换密集，把选项关键词换成同义短语再听。',
      },
      {
        id: 'lis-4',
        title: 'Section 4 讲座笔记',
        titleEn: 'Lecture notes',
        minutes: 25,
        summary: '结构化笔记：主题 → 分点 → 例子。',
        content:
          '讲座通常一人独白，语速更快。用缩写记录：e.g. / vs / →。关注转折 however / in contrast 后的新信息，它们常是答案所在。',
      },
    ],
  },
  {
    id: 'reading',
    name: '阅读',
    nameEn: 'Reading',
    blurb: '定位、同义替换、判断题逻辑。',
    accent: '#2B5A3E',
    lessons: [
      {
        id: 'rea-1',
        title: '快速定位技巧',
        titleEn: 'Scanning',
        minutes: 15,
        summary: '用专有名词与数字锁定段落。',
        content:
          '先读题干，圈出不可替换的锚点（年份、人名、百分数）。回原文扫描，不要逐句精读。找到锚点后再精读前后 1–2 句做判断。',
        quiz: {
          question: '定位阅读时，优先圈哪些词？',
          options: ['冠词 a/the', '专有名词与数字', '所有形容词', '感叹号'],
          answerIndex: 1,
          explanation: '专有名词与数字几乎不会被同义替换，是最稳定位锚。',
        },
      },
      {
        id: 'rea-2',
        title: 'True / False / Not Given',
        titleEn: 'TFNG logic',
        minutes: 20,
        summary: '区分“矛盾”与“未提及”。',
        content:
          'True：题干与原文同义且完整对应。False：直接矛盾。Not Given：原文未提供足够信息，不能推断。常见错误是把“合理猜测”当成 True。',
      },
      {
        id: 'rea-3',
        title: '段落匹配 Heading',
        titleEn: 'Matching headings',
        minutes: 18,
        summary: '抓段落主旨，忽略细节例子。',
        content:
          '先读段落首尾句，概括主题。Heading 是主旨不是细节。若两个 heading 都像，选覆盖整段而非只覆盖一句例子的那个。',
      },
      {
        id: 'rea-4',
        title: '摘要填空',
        titleEn: 'Summary completion',
        minutes: 16,
        summary: '语法先行，再核对同义替换。',
        content:
          '空格前后提示词性与搭配。答案通常按原文顺序出现。注意词数限制（NO MORE THAN TWO WORDS）。',
      },
    ],
  },
  {
    id: 'writing',
    name: '写作',
    nameEn: 'Writing',
    blurb: 'Task 1 描述数据，Task 2 清晰论证。',
    accent: '#8B4518',
    lessons: [
      {
        id: 'wri-1',
        title: 'Task 1 图表概述',
        titleEn: 'Overview first',
        minutes: 20,
        summary: '先写总趋势，再选关键数据。',
        content:
          'Overview 不写具体数字，写整体趋势与极值对比。正文选 2–3 组关键数据分组对比，避免流水账报数。使用上升/下降的同义表达：rise, climb, dip, plummet。',
        quiz: {
          question: 'Task 1 Overview 是否应写具体数字？',
          options: ['必须写满', '一般不写，写总趋势', '只写年份', '随便'],
          answerIndex: 1,
          explanation: 'Overview 概括趋势与对比；细节数字放正文。',
        },
      },
      {
        id: 'wri-2',
        title: 'Task 2 立场与结构',
        titleEn: 'Thesis & structure',
        minutes: 25,
        summary: '四段式：引入、正、反/让步、结论。',
        content:
          '开头改写题目并亮明立场。每段一个中心句 + 解释 + 例子。结尾重申立场，不引入新论点。避免背模板堆砌空洞短语。',
      },
      {
        id: 'wri-3',
        title: '连贯与衔接',
        titleEn: 'Cohesion',
        minutes: 15,
        summary: '用逻辑连接，而非堆砌 firstly secondly。',
        content:
          '优先使用指代（this approach）、同义替换与因果连接（as a result）。过度使用 furthermore / moreover 会显得机械。',
      },
      {
        id: 'wri-4',
        title: '语法与词汇升级',
        titleEn: 'Lexical upgrade',
        minutes: 18,
        summary: '准确优先于花哨。',
        content:
          '宁可写对简单句，也不要错复杂句。准备主题词汇包：教育、环境、科技、健康。检查主谓一致、冠词与可数名词。',
      },
    ],
  },
  {
    id: 'speaking',
    name: '口语',
    nameEn: 'Speaking',
    blurb: '流利度、扩展答案、自然互动。',
    accent: '#5C3D2E',
    lessons: [
      {
        id: 'spe-1',
        title: 'Part 1 自然扩展',
        titleEn: 'Extend Part 1',
        minutes: 12,
        summary: '回答 = 直答 + 理由 + 小例子。',
        content:
          '避免只说 Yes/No。用 “because / for example / these days” 自然延展 2–3 句。语速稳定比语速快更重要。',
        quiz: {
          question: 'Part 1 最稳妥的回答结构是？',
          options: ['单字回答', '直答 + 理由 + 例子', '背一整段无关故事', '沉默思考一分钟'],
          answerIndex: 1,
          explanation: '短而完整的扩展展示流利度与相关性。',
        },
      },
      {
        id: 'spe-2',
        title: 'Part 2 一分钟提纲',
        titleEn: 'Cue card outline',
        minutes: 15,
        summary: '用 bullet 覆盖提示点，留 20 秒收尾。',
        content:
          '提纲写关键词即可。开场用一句定位主题，中间按提示点展开，结尾给个人感受或对比。超时被打断是正常的。',
      },
      {
        id: 'spe-3',
        title: 'Part 3 抽象讨论',
        titleEn: 'Abstract discussion',
        minutes: 18,
        summary: '比较、原因、影响、未来趋势。',
        content:
          '学会框架：In the short term… / In the long run…；On an individual level… / At a societal level…。承认复杂性比绝对断言更自然。',
      },
      {
        id: 'spe-4',
        title: '发音与节奏',
        titleEn: 'Pronunciation rhythm',
        minutes: 14,
        summary: '重读实词，弱读虚词。',
        content:
          '不必消灭口音，关键是可懂度。练习意群停顿，避免每个词同等重读。录音回听自己的填充词（um/like）频率。',
      },
    ],
  },
  {
    id: 'vocabulary',
    name: '词汇',
    nameEn: 'Vocabulary',
    blurb: '主题词块 + 同义替换，服务听说读写。',
    accent: '#3D4F6F',
    lessons: [
      {
        id: 'voc-1',
        title: '教育主题词块',
        titleEn: 'Education chunks',
        minutes: 12,
        summary: 'curriculum, literacy, vocational training…',
        content:
          '词块优于单词：acquire knowledge / foster creativity / standardized testing / lifelong learning。写作口语直接套用搭配更稳。',
        quiz: {
          question: '“培养创造力”更自然的搭配是？',
          options: ['make creativity', 'foster creativity', 'do creativity', 'open creativity'],
          answerIndex: 1,
          explanation: 'foster / cultivate creativity 是常见学术搭配。',
        },
      },
      {
        id: 'voc-2',
        title: '环境与气候',
        titleEn: 'Environment',
        minutes: 12,
        summary: 'emissions, biodiversity, renewable…',
        content:
          '准备因果链表达：carbon emissions → global warming → extreme weather。同义：pollution ≈ contamination；cut down on ≈ reduce。',
      },
      {
        id: 'voc-3',
        title: '科技与生活',
        titleEn: 'Technology',
        minutes: 12,
        summary: 'automation, digital literacy, remote work…',
        content:
          '避免空泛说 technology is good/bad。具体化：streamline workflows / exacerbate inequality / blur work-life boundaries。',
      },
      {
        id: 'voc-4',
        title: '同义替换训练',
        titleEn: 'Paraphrase drill',
        minutes: 15,
        summary: '把题目语言换成你的语言。',
        content:
          '每天选 5 个阅读题干做改写。规则：保留核心意思，更换词汇与句式。这对听力选择题与写作改写都直接提分。',
      },
    ],
  },
]

export function getModule(id: ModuleId): Module | undefined {
  return MODULES.find((m) => m.id === id)
}

export function getLesson(moduleId: ModuleId, lessonId: string): Lesson | undefined {
  return getModule(moduleId)?.lessons.find((l) => l.id === lessonId)
}

export function totalLessons(): number {
  return MODULES.reduce((n, m) => n + m.lessons.length, 0)
}
