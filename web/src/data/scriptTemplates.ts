// 脚本模板 - 按场景分类,用户可一键使用
// 模板内容按 i18n 拆分,运行时拼接

export type TemplateCategory =
  | 'product'
  | 'course'
  | 'marketing'
  | 'knowledge'
  | 'festival'
  | 'story'

export interface ScriptTemplate {
  id: string
  category: TemplateCategory
  icon: string // emoji
}

export const TEMPLATES_ZH: Record<string, { title: string; content: string }> = {
  // 产品介绍
  t_product_1: {
    title: '新品发布',
    content:
      '大家好,我是 [品牌名] 的数字人主播。今天给大家带来一款重磅新品 —— [产品名]。它不仅外观时尚,更具备多项黑科技功能。第一,采用最新一代 AI 芯片,性能提升 50%。第二,续航时间长达 24 小时。第三,售价仅需 [价格] 元。心动不如行动,点击下方链接立即下单!',
  },
  t_product_2: {
    title: '产品对比',
    content:
      '很多朋友在问,[产品 A] 和 [产品 B] 到底选哪个?今天我用 30 秒给你讲清楚。A 的优势是性能更强,适合专业用户;B 的优势是性价比高,适合日常使用。如果你是 [目标用户],我建议选 A;如果你是 [目标用户],选 B 不会错。',
  },

  // 课程讲解
  t_course_1: {
    title: '知识点讲解',
    content:
      '今天我们来学习 [主题]。这个概念其实并不复杂,我用三句话给大家讲清楚。第一,它的核心定义是 [定义]。第二,它的应用场景包括 [场景 1] 和 [场景 2]。第三,学习它需要注意 [要点]。如果你还有其他疑问,欢迎在评论区留言。',
  },
  t_course_2: {
    title: '概念入门',
    content:
      '什么是 [概念]?简单来说,就是 [通俗解释]。举个例子,就像 [生活类比],这样是不是就清楚了?记住三个关键词:[关键词 1]、[关键词 2]、[关键词 3]。下次再有人问起,你也能讲明白。',
  },

  // 营销话术
  t_marketing_1: {
    title: '限时优惠',
    content:
      '重要通知! [活动名称] 正式开始,活动时间仅限 [时间]。活动期间,全场商品低至 3 折起,更有满 [金额] 减 [金额] 的超值优惠。错过这次,再等一年!赶紧点击链接抢购吧!',
  },
  t_marketing_2: {
    title: '直播间引流',
    content:
      '家人们好,欢迎来到 [直播间名称]!现在直播间的福利已经准备好了,每 [间隔] 钟抽一次奖,奖品包括 [奖品 1]、[奖品 2]、[奖品 3]。关注主播不迷路,点赞评论领福袋!',
  },

  // 知识科普
  t_knowledge_1: {
    title: '生活小知识',
    content:
      '你知道吗?[有趣的问题]。其实答案很简单,因为 [原理]。下次遇到这种情况,你就可以 [应用方法]。是不是很实用?关注我,每天学一个生活小技巧。',
  },
  t_knowledge_2: {
    title: '冷知识分享',
    content:
      '今天给大家分享一个冷知识:[有趣的事实]。这个知识冷到什么程度?大概 90% 的人都不知道。为什么会这样呢?因为 [原因]。知道了这个,你就可以在朋友面前小秀一下了!',
  },

  // 节日祝福
  t_festival_1: {
    title: '春节祝福',
    content:
      '新春佳节,恭祝大家龙年大吉!愿你在新的一年里,事业龙腾虎跃,家庭龙凤呈祥,生活鱼跃龙门。无论身在何处,这份祝福永远陪伴着你。春节快乐,阖家幸福!',
  },
  t_festival_2: {
    title: '生日祝福',
    content:
      '今天是一个特别的日子,我们的 [称呼] 迎来了人生的新一岁。回首过去,你 [成就];展望未来,你将 [期许]。愿你眼里有光,心中有爱,前路有梦想。生日快乐!',
  },

  // 故事叙述
  t_story_1: {
    title: '品牌故事',
    content:
      '在 [年份] 年的春天,[创始人] 在 [地点] 创立了 [品牌名]。当时他/她只有一个简单的信念:让 [愿景]。从最初的几人小团队,到如今的行业领军,我们始终不忘初心。未来,我们将继续 [使命],为每一位用户创造价值。',
  },
  t_story_2: {
    title: '客户案例',
    content:
      '今天给大家分享一个真实案例。[客户名] 在使用 [产品/服务] 之前,一直面临 [痛点]。自从采用了我们的方案,他们不仅 [改善 1],还实现了 [改善 2]。客户反馈说:[客户原话]。',
  },
}

export const TEMPLATES_EN: Record<string, { title: string; content: string }> = {
  t_product_1: {
    title: 'New Product Launch',
    content:
      'Hi everyone! Today I am thrilled to introduce [Product Name] from [Brand]. This is not just another product. It features our latest AI chip, 50% better performance, and 24-hour battery life. All of this at just $[Price]. Click the link below to grab yours!',
  },
  t_product_2: {
    title: 'Product Comparison',
    content:
      'Many of you asked: should I get [Product A] or [Product B]? Let me break it down in 30 seconds. A has stronger performance for pros. B offers better value for daily use. If you are [Target User], go with A. If you are [Target User], B is your pick.',
  },
  t_course_1: {
    title: 'Concept Explained',
    content:
      'Today we are learning about [Topic]. It is actually not that complex. Three key points. First, the definition is [Definition]. Second, use cases include [Use Case 1] and [Use Case 2]. Third, watch out for [Key Takeaway]. Questions? Drop them in the comments.',
  },
  t_course_2: {
    title: 'Beginner Intro',
    content:
      'What is [Concept]? Simply put, it is [Simple Explanation]. Think of it like [Analogy]. Make sense? Remember three keywords: [KW1], [KW2], [KW3]. Now you can explain it to anyone.',
  },
  t_marketing_1: {
    title: 'Flash Sale',
    content:
      'Big news! [Sale Name] is now live. Limited time only: [Duration]. Up to 70% off sitewide. Plus, get $[X] off when you spend $[Y]. Do not miss this. Click the link to shop now!',
  },
  t_marketing_2: {
    title: 'Live Stream Hook',
    content:
      'Welcome to [Stream Name]! We have amazing deals for you. A giveaway every [Interval] minutes, featuring [Prize 1], [Prize 2], [Prize 3]. Follow the host, like the stream, and grab your gift bag!',
  },
  t_knowledge_1: {
    title: 'Life Hack',
    content:
      'Did you know? [Question]. Here is why: [Reason]. Next time you face this, just [Solution]. Pretty useful, right? Follow for one life hack every day.',
  },
  t_knowledge_2: {
    title: 'Fun Fact',
    content:
      'Here is a fun fact for you: [Fact]. It is so niche that 90% of people have never heard of it. Why? Because [Reason]. Now you can show off to your friends!',
  },
  t_festival_1: {
    title: 'New Year Greeting',
    content:
      'Happy New Year! Wishing you a year of joy, prosperity, and good health. May all your dreams come true. Cheers to a brand new chapter!',
  },
  t_festival_2: {
    title: 'Birthday Wishes',
    content:
      'Today is a special day. [Name] is celebrating another year of life. Looking back, you have [Achievement]. Looking forward, you will [Aspiration]. Wishing you a year full of light, love, and dreams. Happy birthday!',
  },
  t_story_1: {
    title: 'Brand Story',
    content:
      'In the spring of [Year], [Founder] started [Brand] in [Location]. The mission was simple: [Vision]. From a small team to an industry leader, we never forgot why we started. The journey continues, and we are glad to have you with us.',
  },
  t_story_2: {
    title: 'Customer Story',
    content:
      'Let me share a real story. [Customer] struggled with [Pain Point] before using our solution. After switching, they [Improvement 1] and [Improvement 2]. Their words: [Customer Quote].',
  },
}

export const TEMPLATE_IDS: ScriptTemplate[] = [
  { id: 't_product_1', category: 'product', icon: '🆕' },
  { id: 't_product_2', category: 'product', icon: '⚖️' },
  { id: 't_course_1', category: 'course', icon: '📚' },
  { id: 't_course_2', category: 'course', icon: '💡' },
  { id: 't_marketing_1', category: 'marketing', icon: '🔥' },
  { id: 't_marketing_2', category: 'marketing', icon: '🎁' },
  { id: 't_knowledge_1', category: 'knowledge', icon: '🧠' },
  { id: 't_knowledge_2', category: 'knowledge', icon: '🤓' },
  { id: 't_festival_1', category: 'festival', icon: '🎊' },
  { id: 't_festival_2', category: 'festival', icon: '🎂' },
  { id: 't_story_1', category: 'story', icon: '📖' },
  { id: 't_story_2', category: 'story', icon: '⭐' },
]

export function getTemplateContent(
  id: string,
  lang: string,
): { title: string; content: string } | null {
  const dict = lang.startsWith('zh') ? TEMPLATES_ZH : TEMPLATES_EN
  return dict[id] ?? null
}
