export default {
  // 通用
  common: {
    app: 'HeyGem',
    tagline: 'AI 数字人创作平台',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    download: '下载',
    upload: '上传',
    retry: '重试',
    back: '返回',
    next: '下一步',
    submit: '提交',
    search: '搜索',
    more: '更多',
    loading: '加载中...',
    optional: '可选',
    bytes: '字节',
  },

  // 侧边栏
  nav: {
    home: '首页',
    works: '我的作品',
    avatars: '数字模特',
    voices: '声音模型',
    settings: '设置',
  },

  // 首页
  home: {
    welcome: '欢迎回来',
    welcomeDesc: '今天想创造什么样的数字人视频?',
    newProject: '新建项目',
    newProjectDesc: '从一段脚本或一段音频开始',
    quickActions: '快捷操作',
    quickActionsDesc: '管理你的数字人素材库',
    createVideo: '创建视频',
    customizeAvatar: '定制模特',
    cloneVoice: '克隆声音',
    recentWorks: '最近作品',
    viewAll: '查看全部',
    noWorks: '暂无作品,快去创建一个吧',
    noWorksDesc: '选择数字人模特,输入脚本,3 分钟生成专业口播视频',

    // 数据卡片
    statWorks: '作品总数',
    statAvatars: '数字模特',
    statVoices: '声音模型',
    statSuccess: '合成成功率',
  },

  // 作品 tab
  works: {
    myWorks: '我的作品',
    myAvatars: '我的数字模特',
    myVoices: '我的声音模型',
    noWorks: '暂无作品,创建第一个作品开始',
    noAvatars: '还没有数字人模特',
    noAvatarsDesc: '上传一段清晰的人脸视频,系统会自动生成数字人',
    noVoices: '还没有声音模型',
    noVoicesDesc: '上传 30 秒以上的音频,克隆你的专属声音',
    status: {
      queued: '排队中',
      processing: '生成中',
      success: '已完成',
      failed: '失败',
      training: '训练中',
      complete: '训练完成',
    },
  },

  // 编辑器
  editor: {
    title: '视频标题',
    titlePlaceholder: '给作品起个名字',
    avatars: '模特列表',
    selectAvatar: '请选择数字人',
    noAvatar: '请先上传一个数字人模特',
    audioTab: '文本合成',
    uploadTab: '音频合成',
    scriptPlaceholder: '在这里输入你的脚本...支持任意内容,AI 会自动生成口播',
    selectVoice: '选择声音',
    noVoice: '请先克隆一个声音模型',
    audition: '试听',
    auditioning: '试听中...',
    auditionText: '你好,这是我的声音,希望你喜欢。',
    generateAudio: '生成音频',
    generating: '生成中...',
    synthesizeVideo: '合成视频',
    synthesizing: '合成中...',
    synthesisHint: '合成中请勿关闭页面,完成后会自动跳转到首页',
    uploadedAudio: '已上传音频',
    changeFile: '更换文件',
    selectFile: '点击或拖拽音频文件到此',
    selectFileHint: '支持 MP3 / WAV / M4A,时长不限',
  },

  // 模态框
  modal: {
    cloneVoice: '克隆新声音',
    voiceName: '声音名称',
    voiceNamePlaceholder: '例如:温柔女声 / 标准男声',
    selectAudio: '点击或拖拽音频文件',
    audioHint: '支持 MP3 / WAV,时长不少于 30 秒,环境越安静效果越好',
    training: '正在训练,首次训练需要 1-3 分钟...',
    startTraining: '开始训练',

    uploadAvatar: '上传数字人模特',
    avatarName: '模特名称',
    avatarNamePlaceholder: '例如:主播小李 / 讲解员',
    selectVideo: '点击或拖拽视频文件',
    videoHint: 'MP4 / MOV 格式,720P 以上,30 秒以上',
    requirements: '拍摄要求',
    reqs: {
      duration: '视频时长 30 秒 - 5 分钟',
      single: '画面中只有一个人,五官清晰可见',
      face: '面部不要被手、头发遮挡',
      light: '光线充足,避免逆光或过暗',
      stable: '尽量保持稳定,避免剧烈晃动',
    },
    uploading: '上传处理中...',
    submit: '提交',

    confirmDelete: '确认删除',
    deleteVideoMsg: '确定要删除这个作品吗?该操作无法撤销。',
    deleteAvatarMsg: '确定要删除这个模特吗?相关视频也会受影响。',
    deleteVoiceMsg: '确定要删除这个声音模型吗?',
    deleteSuccess: '删除成功',
  },

  // 通知
  notify: {
    avatarFirst: '请先上传一个数字人模特',
    voiceAndText: '请选择声音并输入脚本内容',
    voiceIncomplete: '该声音模型数据不完整,请重新克隆',
    audioOk: '音频生成成功',
    audioFail: '音频生成失败',
    audioAvatarRequired: '请先生成音频或选择数字人',
    videoQueued: '视频合成任务已加入队列',
    videoFail: '视频合成失败',
    videoDone: '视频合成完成',
    voiceNameAndFile: '请填写名称并选择音频文件',
    voiceTrainFail: '声音训练失败',
    voiceTrainOk: '声音模型训练成功',
    avatarNameAndFile: '请填写名称并选择视频文件',
    avatarUploadFail: '数字人上传失败',
    avatarUploadOk: '数字人上传成功',
    dataLoadFail: '数据加载失败',
    fileTooBig: '文件过大,最大 200MB',
    fileTypeError: '文件格式不支持',
    retrySuccess: '已重新加入合成队列',
    linkCopied: '链接已复制到剪贴板',
    celebrated: '🎉 数字人视频已完成!',
  },

  // Onboarding
  onboarding: {
    skip: '跳过引导',
    next: '下一步',
    start: '开始体验',
    step1Title: '欢迎来到 HeyGem',
    step1Desc: '3 步生成专业级数字人视频,让我带你快速了解',
    step2Title: '定制你的数字人',
    step2Desc: '上传一段 30 秒以上的人脸视频,系统会生成专属数字分身',
    step3Title: '克隆你的声音',
    step3Desc: '上传 30 秒音频,AI 就能学会你的声音',
    step4Title: '开始创作',
    step4Desc: '选好模特和声音,输入脚本,AI 一键生成口播视频',
  },

  // Wizard 步骤条
  wizard: {
    step1: '选模特',
    step2: '选声音',
    step3: '准备内容',
    step4: '合成',
    step1Hint: '选择数字人形象',
    step2Hint: '选择声音模型',
    step3Hint: '输入脚本或上传音频',
    step4Hint: '生成你的数字人视频',
    templates: '脚本模板',
    useTemplate: '使用此模板',
  },

  // 模板分类
  template: {
    title: '脚本模板',
    desc: '选择一个场景,AI 帮你起个头',
    categories: {
      product: '产品介绍',
      course: '课程讲解',
      marketing: '营销话术',
      knowledge: '知识科普',
      festival: '节日祝福',
      story: '故事叙述',
    },
  },

  // 上传进度
  uploading: {
    preparing: '准备中...',
    extractingAudio: '正在提取音频特征',
    trainingModel: '正在训练声学模型',
    finalizing: '正在保存模型',
    extractingFace: '正在检测人脸特征',
    buildingModel: '正在构建数字人模型',
    generatingThumb: '正在生成预览图',
  },

  // 快捷操作
  quick: {
    makeAgain: '再做一个',
    editScript: '修改脚本',
    useAsTemplate: '基于此作品再创作',
  },

  // 搜索筛选
  filter: {
    searchPlaceholder: '搜索作品/模特/声音...',
    all: '全部',
    statusAll: '全部状态',
    statusQueued: '排队中',
    statusProcessing: '生成中',
    statusSuccess: '已完成',
    statusFailed: '失败',
    noResult: '没有匹配的结果',
    clearFilter: '清除筛选',
  },

  // 失败诊断
  fail: {
    title: '合成失败',
    reason: '可能原因',
    retry: '重新合成',
    contactSupport: '联系支持',
    unknown: '未知错误,请重试',
  },
}
